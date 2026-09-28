import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import nodemailer from "nodemailer";

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

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP configuration missing");
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function welcomeHtml(p: {
  firstName: string; packageName: string; amountCents: number;
  workType: string; categories: string[]; reference: string;
  sessionId: string; startsAt: string | null; expiresAt: string | null;
}) {
  const amount = `${(p.amountCents / 100).toFixed(2).replace(".", ",")} €`;
  const duration = p.amountCents === 999 ? "Accesso iniziale" : p.amountCents === 1999 ? "15 giorni" : "30 giorni";
  const period = p.startsAt && p.expiresAt
    ? `${new Date(p.startsAt).toLocaleDateString("it-IT")} → ${new Date(p.expiresAt).toLocaleDateString("it-IT")}`
    : "Servizio attivato";
  const type = p.workType === "stagionale" ? "Lavoro stagionale" : "Lavoro non stagionale";
  const cats = p.categories.length ? p.categories.map(escapeHtml).join(", ") : "Categorie selezionate";

  return `<!doctype html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#172033">
<div style="max-width:680px;margin:30px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
<div style="background:#101827;padding:26px 28px;color:#fff"><div style="font-size:24px;font-weight:800">GestoriaCitaIA</div><div style="margin-top:6px;font-size:13px;color:#cbd5e1">Decreto Flussi Lavoro</div></div>
<div style="padding:32px 28px"><div style="display:inline-block;background:#eaf8ef;color:#16803c;border-radius:999px;padding:8px 13px;font-size:13px;font-weight:700">✓ PAGAMENTO CONFERMATO</div>
<h1 style="font-size:27px;margin:22px 0 10px">Ciao ${escapeHtml(p.firstName)},</h1>
<p style="font-size:16px;line-height:1.7">il tuo acquisto per il servizio <strong>Decreto Flussi Lavoro</strong> è stato confermato correttamente.</p>
<div style="background:#f7f8fa;border:1px solid #e6e9ee;border-radius:14px;padding:20px;margin:22px 0">
<div style="font-size:13px;color:#667085">PIANO</div><div style="font-size:20px;font-weight:800;margin-top:5px">${escapeHtml(p.packageName)}</div>
<div style="margin-top:16px;font-size:14px;color:#667085">Importo</div><div style="font-size:19px;font-weight:800">${amount}</div>
<div style="margin-top:16px;font-size:14px;color:#667085">Durata</div><div style="font-size:16px;font-weight:700">${duration}</div>
<div style="margin-top:16px;font-size:14px;color:#667085">Periodo</div><div style="font-size:16px;font-weight:700">${period}</div>
<div style="margin-top:16px;font-size:14px;color:#667085">Tipo di lavoro</div><div style="font-size:16px;font-weight:700">${type}</div>
<div style="margin-top:16px;font-size:14px;color:#667085">Categorie</div><div style="font-size:16px;font-weight:700">${cats}</div></div>
<h2 style="font-size:19px">Cosa succede adesso?</h2><p style="font-size:15px;line-height:1.7;color:#475467">Il tuo ordine è stato registrato. Le offerte di lavoro relative alle categorie selezionate verranno gestite attraverso il servizio Decreto Flussi Lavoro.</p>
<div style="margin-top:25px;background:#f8fafc;border-left:4px solid #16803c;padding:16px 18px;border-radius:8px"><div style="font-weight:800;margin-bottom:8px">شنو غادي يوقع دابا؟</div><div style="font-size:14px;line-height:1.8;color:#475467">الأداء ديالك تأكد بنجاح، والطلب ديالك تسجل. غادي توصلك عروض العمل المرتبطة بالفئات اللي اخترتي حسب العروض المتوفرة.</div></div>
<div style="margin-top:25px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#667085"><strong>Informazione importante:</strong> GestoriaCitaIA non è uno studio legale e non garantisce l'ottenimento di un contratto di lavoro, nulla osta, visto o permesso di soggiorno. Il servizio riguarda la gestione e l'invio di informazioni e offerte disponibili.</div>
<div style="margin-top:20px;font-size:12px;color:#98a2b3">Riferimento: ${escapeHtml(p.reference)}<br>Stripe Session: ${escapeHtml(p.sessionId)}</div></div>
<div style="background:#101827;padding:22px 28px;color:#98a2b3;font-size:12px">GestoriaCitaIA · Decreto Flussi Lavoro</div></div></body></html>`;
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

    const table = amountCents === 999
      ? "flussi_lavoro_9_99"
      : amountCents === 1999
      ? "flussi_lavoro_19_99"
      : amountCents === 2499
      ? "flussi_lavoro_24_99"
      : "";

    if (!table) return res.status(400).json({ error: "Unknown Flussi Lavoro package amount", amountCents });
    if (await existsBySession(table, session.id)) {
      return res.status(200).json({ received: true, processed: true, alreadyExists: true, table, stripeSessionId: session.id });
    }

    if (amountCents === 2499 && categories.length !== 1) {
      return res.status(400).json({ error: "The 24.99 package requires exactly one category", categories });
    }

    const now = new Date();
    const workType = metadata.work_type === "stagionale" ? "stagionale" : "non_stagionale";
    const startsAt = amountCents === 999 ? null : now.toISOString();
    const expiresAt = amountCents === 1999 ? addDays(now, 15) : amountCents === 2499 ? addDays(now, 30) : null;
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

    if (amountCents === 2499) {
      record.category = categories[0];
      record.starts_at = startsAt;
      record.expires_at = expiresAt;
    } else {
      record.categories = categories;
      if (amountCents === 1999) {
        record.starts_at = startsAt;
        record.expires_at = expiresAt;
      }
    }

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

    const reference = clean(metadata.reference) || `FL-${session.id.slice(-10).toUpperCase()}`;
    const packageName = clean(metadata.package_name) || (
      amountCents === 999 ? "Decreto Flussi Lavoro — 9,99 €" :
      amountCents === 1999 ? "Decreto Flussi Lavoro — 19,99 €" :
      "Decreto Flussi Lavoro — 24,99 €"
    );

    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) throw new Error("FROM_EMAIL is missing");

    const transporter = createTransporter();
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `Pagamento confermato — Decreto Flussi Lavoro | ${reference}`,
      html: welcomeHtml({
        firstName,
        packageName,
        amountCents,
        workType,
        categories,
        reference,
        sessionId: session.id,
        startsAt,
        expiresAt,
      }),
    });

    console.log("Flussi Lavoro completed:", { table, amountCents, email, sessionId: session.id, reference });
    return res.status(200).json({ received: true, processed: true, saved: true, emailSent: true, table, amountCents, reference, stripeSessionId: session.id });
  } catch (error) {
    console.error("webhook-flussi-lavoro error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
