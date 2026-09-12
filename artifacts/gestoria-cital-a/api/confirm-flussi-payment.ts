import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

const EXPECTED_AMOUNT = 50; // 0,50 €
const EXPECTED_CURRENCY = "eur";
const EXPECTED_PRODUCT = "decreto_flussi";
const EXPECTED_SERVICE = "verificacion_decreto_flussi";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      error: "Stripe no está configurado correctamente en el servidor.",
    });
  }

  try {
    const sessionId =
      typeof req.body?.session_id === "string"
        ? req.body.session_id.trim()
        : "";

    if (!sessionId) {
      return res.status(400).json({
        ok: false,
        paid: false,
        error: "Falta session_id.",
      });
    }

    // Recuperamos la sesión directamente desde Stripe.
    // El frontend NO puede decidir si el pago está confirmado.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer"],
    });

    const metadata = session.metadata || {};

    // Comprobamos que esta sesión pertenece al servicio Decreto Flussi.
    if (
      metadata.product !== EXPECTED_PRODUCT ||
      metadata.service !== EXPECTED_SERVICE
    ) {
      return res.status(403).json({
        ok: false,
        paid: false,
        error: "La sesión de Stripe no pertenece al servicio Decreto Flussi.",
      });
    }

    // Verificación exacta de importe y moneda.
    const amountTotal = session.amount_total ?? null;
    const currency = (session.currency || "").toLowerCase();

    if (
      amountTotal !== EXPECTED_AMOUNT ||
      currency !== EXPECTED_CURRENCY
    ) {
      return res.status(400).json({
        ok: false,
        paid: false,
        error: "El importe o la moneda del pago no coinciden.",
        expected_amount: EXPECTED_AMOUNT,
        received_amount: amountTotal,
        expected_currency: EXPECTED_CURRENCY,
        received_currency: currency || null,
      });
    }

    const paid = session.payment_status === "paid";

    let paymentIntentStatus: string | null = null;

    if (
      session.payment_intent &&
      typeof session.payment_intent !== "string"
    ) {
      paymentIntentStatus = session.payment_intent.status;
    }

    // No desbloquear documentos si Stripe todavía no confirma el pago.
    if (!paid) {
      return res.status(402).json({
        ok: true,
        paid: false,
        payment_status: session.payment_status,
        checkout_status: session.status,
        payment_intent_status: paymentIntentStatus,
        documents_upload_allowed: false,
      });
    }

    const customerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      metadata.email ||
      null;

    const customerName =
      session.customer_details?.name ||
      `${metadata.client_name || ""} ${metadata.client_surname || ""}`.trim() ||
      null;

    console.log("✅ DECRETO FLUSSI PAYMENT CONFIRMED", {
      session_id: session.id,
      reference: metadata.reference || null,
      email: customerEmail,
      amount: amountTotal,
      currency,
      payment_status: session.payment_status,
      payment_intent_status: paymentIntentStatus,
    });

    return res.status(200).json({
      ok: true,
      paid: true,

      amount: amountTotal,
      currency,

      session_id: session.id,
      reference: metadata.reference || null,

      customer_email: customerEmail,
      customer_name: customerName,

      product: metadata.product,
      service: metadata.service,

      searchPersonOnly:
        metadata.search_person_only === "true",

      documents_upload_allowed: true,

      metadata,
    });
  } catch (error: any) {
    console.error("❌ CONFIRM FLUSSI PAYMENT ERROR:", error);

    return res.status(500).json({
      ok: false,
      paid: false,
      error:
        error?.message ||
        "No se pudo verificar el pago de Stripe.",
    });
  }
}
