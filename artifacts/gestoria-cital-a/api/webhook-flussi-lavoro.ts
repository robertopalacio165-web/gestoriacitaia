import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const clean = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
const supabaseUrl = clean(process.env.SUPABASE_URL);
const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function supabaseRequest(path: string, options: RequestInit = {}) {
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase configuration missing");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {}),
    },
  });
}

async function existsBySession(table: string, sessionId: string) {
  const r = await supabaseRequest(
    `${table}?select=id&stripe_session_id=eq.${encodeURIComponent(sessionId)}&limit=1`
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase lookup failed: ${r.status} ${text}`);
  const rows = JSON.parse(text);
  return Array.isArray(rows) && rows.length > 0;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function escapeHtml(v: string) {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}



export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_FLUSSI_LAVORO;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return res.status(500).json({ error: "Stripe Flussi Lavoro configuration missing" });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) return res.status(400).json({ error: "Missing Stripe signature" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error("Flussi Lavoro Stripe signature verification failed:", error);
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }

    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({ received: true, ignored: true, event: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    if (metadata.service !== "flussi_lavoro" || metadata.product !== "decreto_flussi_lavoro") {
      return res.status(200).json({ received: true, ignored: true, reason: "not_flussi_lavoro" });
    }

    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true, ignored: true, reason: "payment_not_paid" });
    }

    const fullName = clean(metadata.client_name || metadata.full_name || session.customer_details?.name);
    const firstName = clean(metadata.first_name || metadata.client_first_name || fullName.split(" ")[0]);
    const lastName = clean(metadata.last_name || metadata.client_surname || metadata.client_last_name || fullName.split(" ").slice(1).join(" "));
    const email = clean(metadata.email || metadata.client_email || session.customer_details?.email);
    const phone = clean(metadata.phone || metadata.client_phone || session.customer_details?.phone);

    if (!firstName || !lastName || !email) return res.status(400).json({ error: "Missing client data" });

    const categories = clean(metadata.categories).split(",").map((x) => x.trim()).filter(Boolean);
    const amountCents = Number(metadata.package_amount_cents) || Number(session.amount_total) || 0;

    const packageCode = clean(metadata.package_code);

    // TEMPORARY TEST: all plans cost €0.50.
    // The database table is selected by packageCode, not by price.
    const table =
      packageCode === "monthly"
        ? "flussi_lavoro_9_99"
        : packageCode === "biweekly"
        ? "flussi_lavoro_19_99"
        : packageCode === "single_category"
        ? "flussi_lavoro_24_99"
        : "";

    if (!table) {
      return res.status(400).json({
        error: "Unknown Flussi Lavoro package",
        packageCode,
        amountCents,
      });
    }

    if (amountCents !== 50) {
      return res.status(400).json({
        error: "Temporary test accepts only €0.50",
        amountCents,
        packageCode,
      });
    }
    // IMPORTANT: Stripe can resend the same event. If the customer is already
    // saved in Supabase, DO NOT exit here because the welcome email may not
    // have been sent yet. We skip the duplicate INSERT but continue to email.
    const alreadyExists = await existsBySession(table, session.id);

    if (alreadyExists) {
      console.log("ℹ️ FLUSSI LAVORO: customer already exists; continuing to welcome email", {
        table,
        stripeSessionId: session.id,
        email,
      });
    }

    if (packageCode === "single_category" && categories.length !== 1) {
      return res.status(400).json({ error: "The 24.99 package requires exactly one category", categories });
    }

    const now = new Date();
    const workType = metadata.work_type === "stagionale" ? "stagionale" : "non_stagionale";
    const startsAt = packageCode === "monthly" ? null : now.toISOString();
    const expiresAt = packageCode === "biweekly" ? addDays(now, 15) : packageCode === "single_category" ? addDays(now, 30) : null;
    const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : null;

    const record: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      work_type: workType,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      payment_status: "paid",
      purchased_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    if (packageCode === "single_category") {
      record.category = categories[0];
      record.starts_at = startsAt;
      record.expires_at = expiresAt;
    } else {
      record.categories = categories;
      if (packageCode === "biweekly") {
        record.starts_at = startsAt;
        record.expires_at = expiresAt;
      }
    }

    if (!alreadyExists) {
      const insert = await supabaseRequest(table, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(record),
      });
      const insertText = await insert.text();
      if (!insert.ok) {
        console.error("Supabase Flussi Lavoro insert failed:", table, insert.status, insertText);
        return res.status(500).json({ error: "Could not save Flussi Lavoro customer" });
      }
      console.log("✅ FLUSSI LAVORO: customer saved in Supabase", { table, email });
    }

    const reference = clean(metadata.reference) || `FL-${session.id.slice(-10).toUpperCase()}`;
    const packageName = clean(metadata.package_name) || (
      packageCode === "monthly"
        ? "Offerte del mese"
        : packageCode === "biweekly"
        ? "Aggiornamenti ogni 15 giorni"
        : "Una sola categoria"
    );

    // IMPORTANT:
    // DO NOT create another welcome-email template here.
    // Use the existing:
    //   api/flussi-lavoro-gmail-DARIJA-ITALIANO.ts
    //
    // It owns the approved Gmail HTML and Brevo SMTP delivery.
    // www is used to avoid the 307 redirect seen by Stripe.
    const gmailUrl =
      process.env.FLUSSI_LAVORO_GMAIL_URL ||
      "https://www.gestoriacitaia.com/api/flussi-lavoro-gmail";

    const gmailPayload = {
      service: "flussi_lavoro",
      product: "decreto_flussi_lavoro",
      paid: true,
      reference,
      stripeSessionId: session.id,
      client: {
        firstName,
        lastName,
        email,
        phone,
      },
      workType,
      categories,
      packageCode,
      packageName,
      // TEMPORARY TEST: payment is €0.50.
      packageAmountCents: 50,
      durationDays:
        packageCode === "biweekly"
          ? 15
          : 30,
    };

    const gmailHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.FLUSSI_LAVORO_INTERNAL_SECRET) {
      gmailHeaders["x-flussi-lavoro-secret"] =
        process.env.FLUSSI_LAVORO_INTERNAL_SECRET;
    }

    console.log("📧 Calling EXISTING welcome Gmail file:", {
      gmailUrl,
      email,
      packageCode,
      amountCents: 50,
    });

    const gmailResponse = await fetch(gmailUrl, {
      method: "POST",
      headers: gmailHeaders,
      body: JSON.stringify(gmailPayload),
    });

    const gmailResponseText = await gmailResponse.text();

    if (!gmailResponse.ok) {
      console.error("❌ Existing welcome Gmail endpoint failed:", {
        status: gmailResponse.status,
        response: gmailResponseText.slice(0, 1000),
      });

      return res.status(500).json({
        error: "Welcome email endpoint failed",
        status: gmailResponse.status,
      });
    }

    console.log("✅ EXISTING WELCOME EMAIL SENT:", {
      email,
      packageCode,
      table,
      amountCents: 50,
      response: gmailResponseText.slice(0, 500),
    });

    console.log("Flussi Lavoro completed:", { table, amountCents, email, sessionId: session.id, reference });
    return res.status(200).json({ received: true, processed: true, saved: true, emailSent: true, table, amountCents, reference, stripeSessionId: session.id });
  } catch (error) {
    console.error("webhook-flussi-lavoro error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
