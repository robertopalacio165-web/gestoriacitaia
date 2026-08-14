import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

const EXPECTED_AMOUNT = 2199;
const EXPECTED_CURRENCY = "eur";
const EXPECTED_PRODUCT = "decreto_flussi";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      paid: false,
      error: "Method not allowed",
    });
  }

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      paid: false,
      error:
        "Stripe no está configurado en el servidor.",
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
        error:
          "Falta session_id de Stripe.",
      });
    }

    /*
     * ============================================================
     * OBTENER SESIÓN REAL DESDE STRIPE
     * ============================================================
     */

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: [
            "payment_intent",
            "customer",
          ],
        }
      );

    const metadata =
      session.metadata || {};

    /*
     * ============================================================
     * COMPROBAR PRODUCTO
     *
     * NO aceptamos una sesión sin producto.
     * Tiene que ser exactamente Decreto Flussi.
     * ============================================================
     */

    if (
      metadata.product !==
      EXPECTED_PRODUCT
    ) {
      console.error(
        "FLUSSI PRODUCT MISMATCH:",
        {
          sessionId,
          product:
            metadata.product || null,
        }
      );

      return res.status(403).json({
        ok: false,
        paid: false,
        error:
          "Esta sesión de Stripe no corresponde al servicio Decreto Flussi.",
      });
    }

    /*
     * ============================================================
     * COMPROBAR IMPORTE
     * ============================================================
     */

    const amountTotal =
      session.amount_total ?? null;

    const currency =
      (
        session.currency || ""
      ).toLowerCase();

    if (
      amountTotal !==
        EXPECTED_AMOUNT ||
      currency !==
        EXPECTED_CURRENCY
    ) {
      console.error(
        "FLUSSI PAYMENT AMOUNT MISMATCH:",
        {
          sessionId,
          amountTotal,
          currency,
        }
      );

      return res.status(400).json({
        ok: false,
        paid: false,
        error:
          "El importe del pago no coincide con 21,99 €.",
      });
    }

    /*
     * ============================================================
     * COMPROBAR ESTADO REAL DEL PAGO
     * ============================================================
     */

    const paid =
      session.payment_status ===
      "paid";

    let paymentIntentStatus:
      | string
      | null = null;

    if (
      session.payment_intent &&
      typeof session.payment_intent !==
        "string"
    ) {
      paymentIntentStatus =
        session.payment_intent.status;
    }

    /*
     * ============================================================
     * PAGO TODAVÍA NO CONFIRMADO
     * ============================================================
     */

    if (!paid) {
      return res.status(402).json({
        ok: true,
        paid: false,

        payment_status:
          session.payment_status,

        checkout_status:
          session.status,

        payment_intent_status:
          paymentIntentStatus,

        documents_upload_allowed:
          false,

        message:
          "El pago todavía no ha sido confirmado por Stripe.",
      });
    }

    /*
     * ============================================================
     * DATOS DEL CLIENTE
     * ============================================================
     */

    const customerEmail =
      session.customer_details
        ?.email ||
      session.customer_email ||
      metadata.email ||
      null;

    const customerName =
      session.customer_details
        ?.name ||
      metadata.fullName ||
      null;

    /*
     * ============================================================
     * PAGO CONFIRMADO
     * ============================================================
     *
     * IMPORTANTE:
     *
     * Aquí todavía NO subimos documentos.
     *
     * Solamente autorizamos la siguiente fase.
     * ============================================================
     */

    console.log(
      "✅ FLUSSI PAYMENT CONFIRMED",
      {
        sessionId:
          session.id,

        email:
          customerEmail,

        amount:
          amountTotal,

        currency,

        product:
          metadata.product,
      }
    );

    return res.status(200).json({
      ok: true,

      paid: true,

      payment_status:
        session.payment_status,

      checkout_status:
        session.status,

      amount_total:
        amountTotal,

      currency,

      payment_intent_status:
        paymentIntentStatus,

      session_id:
        session.id,

      customer_email:
        customerEmail,

      customer_name:
        customerName,

      metadata,

      /*
       * El frontend puede continuar,
       * pero cualquier endpoint posterior
       * volverá a comprobar Stripe.
       */

      documents_upload_allowed:
        true,

      message:
        "Pago de 21,99 € confirmado correctamente. Puedes continuar con la subida de documentos.",
    });
  } catch (error: any) {
    console.error(
      "❌ CONFIRM FLUSSI PAYMENT ERROR:",
      error
    );

    if (
      error?.type ===
      "StripeInvalidRequestError"
    ) {
      return res.status(400).json({
        ok: false,
        paid: false,
        error:
          "La sesión de Stripe no es válida o no existe.",
      });
    }

    return res.status(500).json({
      ok: false,
      paid: false,
      error:
        error?.message ||
        "No se pudo comprobar el pago con Stripe.",
    });
  }
}
