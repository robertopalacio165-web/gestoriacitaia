import type { VercelRequest, VercelResponse } from "@vercel/node";
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

const clean = (v: unknown, max = 2000) =>
  String(v ?? "").trim().slice(0, max);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const gmailUrl =
    process.env.FLUSSI_LAVORO_GMAIL_URL ||
    "https://gestoriacitaia.com/api/flussi-lavoro-gmail";
  const internalSecret = process.env.FLUSSI_LAVORO_INTERNAL_SECRET;

  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return res.status(500).json({ error: "Stripe configuration missing" });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ error: "Missing Stripe signature" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error("Stripe signature verification failed:", error);
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }

    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({
        received: true,
        ignored: true,
        event: event.type,
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // SOLO Decreto Flussi Lavoro.
    // No procesa el antiguo servicio Decreto Flussi Verificación.
    if (
      metadata.service !== "flussi_lavoro" ||
      metadata.product !== "decreto_flussi_lavoro"
    ) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "not_flussi_lavoro",
      });
    }

    // El email de bienvenida solo se envía cuando Stripe confirma el pago.
    if (session.payment_status !== "paid") {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: "payment_not_paid",
      });
    }

    const email = clean(
      metadata.client_email || session.customer_details?.email
    );

    const fullName = clean(
      metadata.client_name || session.customer_details?.name
    );

    const firstName = clean(
      metadata.first_name || fullName.split(" ")[0]
    );

    const lastName = clean(
      metadata.last_name || fullName.split(" ").slice(1).join(" ")
    );

    if (!email || !firstName || !lastName) {
      console.error("Missing client data", {
        email,
        firstName,
        lastName,
        sessionId: session.id,
      });

      return res.status(400).json({
        error: "Missing client data",
      });
    }

    const categories = clean(metadata.categories)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const packageCode =
      metadata.package_code === "biweekly"
        ? "biweekly"
        : metadata.package_code === "single_category"
        ? "single_category"
        : "monthly";

    const payload = {
      service: "flussi_lavoro",
      product: "decreto_flussi_lavoro",
      paid: true,

      reference:
        clean(metadata.reference) ||
        `FL-${session.id.slice(-10).toUpperCase()}`,

      stripeSessionId: session.id,

      client: {
        firstName,
        lastName,
        email,
        phone: clean(metadata.client_phone),
      },

      workType:
        metadata.work_type === "stagionale"
          ? "stagionale"
          : "non_stagionale",

      categories,

      packageCode,

      packageName: clean(metadata.package_name),

      packageAmountCents:
        Number(metadata.package_amount_cents) ||
        session.amount_total ||
        0,

      durationDays:
        Number(metadata.duration_days) || 30,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (internalSecret) {
      headers["x-flussi-lavoro-secret"] = internalSecret;
    }

    const gmailResponse = await fetch(gmailUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const gmailResponseText = await gmailResponse.text();

    if (!gmailResponse.ok) {
      console.error("Gmail endpoint failed:", {
        status: gmailResponse.status,
        response: gmailResponseText,
        sessionId: session.id,
      });

      // Stripe volverá a intentar el webhook.
      return res.status(500).json({
        error: "Welcome email endpoint failed",
      });
    }

    console.log("Flussi Lavoro welcome email sent:", {
      sessionId: session.id,
      email,
      reference: payload.reference,
    });

    return res.status(200).json({
      received: true,
      processed: true,
      emailSent: true,
      reference: payload.reference,
    });
  } catch (error) {
    console.error("webhook-flussi-lavoro error:", error);

    return res.status(500).json({
      error: "Webhook processing failed",
    });
  }
}
