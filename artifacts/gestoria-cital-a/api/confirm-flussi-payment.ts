import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "STRIPE_SECRET_KEY no está configurada."
  );
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * ============================================================
   * SOLO POST
   * ============================================================
   */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      paid: false,
      error: "Method not allowed",
    });
  }

  /*
   * ============================================================
   * STRIPE CONFIG
   * ============================================================
   */

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      paid: false,
      error:
        "Stripe no está configurado en el servidor.",
    });
  }

  try {
    /*
     * ============================================================
     * SESSION ID
     * ============================================================
     */

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
     * OBTENER SESIÓN REAL DE STRIPE
     *
     * NO confiamos en:
     *
     * ?success=true
     *
     * ni en ningún dato enviado por el navegador.
     *
     * Stripe es la fuente de verdad.
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

    /*
     * ============================================================
     * COMPROBAR QUE ESTA SESIÓN ES DE NUESTRO PRODUCTO
     * ============================================================
     *
     * Si tu create-checkout-flussi ya guarda metadata,
     * comprobamos que sea una sesión Flussi.
     *
     * Si todavía no la guarda, no bloqueamos el pago.
     * Lo añadiremos en el siguiente paso.
     * ============================================================
     */

    const metadata =
      session.metadata || {};

    const product =
      metadata.product ||
      metadata.service ||
      metadata.type ||
      "";

    const isFlussiProduct =
      !product ||
      product === "flussi" ||
      product === "decreto_flussi" ||
      product === "verificacion_flussi" ||
      product === "italy_flussi";

    if (!isFlussiProduct) {
      return res.status(403).json({
        ok: false,
        paid: false,
        error:
          "La sesión de Stripe no corresponde al servicio Decreto Flussi.",
      });
    }

    /*
     * ============================================================
     * COMPROBAR PRECIO
     * ============================================================
     *
     * Nuestro precio esperado:
     *
     * 21,99 EUR
     * = 2199 céntimos
     *
     * No aceptamos otra cantidad.
     * ============================================================
     */

    const EXPECTED_AMOUNT = 2199;
    const EXPECTED_CURRENCY = "eur";

    const amountTotal =
      session.amount_total ?? null;

    const currency =
      (session.currency || "").toLowerCase();

    if (
      amountTotal !== EXPECTED_AMOUNT ||
      currency !== EXPECTED_CURRENCY
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
          "El importe del pago no coincide con el servicio de 21,99 €.",
      });
    }

    /*
     * ============================================================
     * COMPROBAR ESTADO DEL CHECKOUT
     * ============================================================
     */

    const checkoutPaid =
      session.payment_status === "paid";

    /*
     * ============================================================
     * COMPROBAR PAYMENT INTENT
     * ============================================================
     */

    let paymentIntentStatus: string | null =
      null;

    if (
      session.payment_intent &&
      typeof session.payment_intent !== "string"
    ) {
      paymentIntentStatus =
        session.payment_intent.status;
    }

    /*
     * ============================================================
     * PAGO NO CONFIRMADO
     * ============================================================
     */

    if (!checkoutPaid) {
      return res.status(402).json({
        ok: true,
        paid: false,

        payment_status:
          session.payment_status,

        checkout_status:
          session.status,

        payment_intent_status:
          paymentIntentStatus,

        message:
          "El pago todavía no ha sido confirmado por Stripe.",
      });
    }

    /*
     * ============================================================
     * PAGO CONFIRMADO
     * ============================================================
     *
     * A PARTIR DE AQUÍ podemos permitir:
     *
     * - guardar documentos
     * - crear verificación
     * - iniciar worker
     * - analizar documentos
     *
     * PERO ESTE ENDPOINT TODAVÍA NO SUBE DOCUMENTOS.
     * ============================================================
     */

    const customerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    const customerName =
      session.customer_details?.name ||
      null;

    const result = {
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
       * Esta bandera será utilizada por el
       * frontend para permitir la siguiente fase.
       */
      documents_upload_allowed: true,

      message:
        "Pago confirmado correctamente por Stripe. Ya se puede continuar con la subida de documentos.",
    };

    console.log(
      "✅ FLUSSI PAYMENT CONFIRMED:",
      {
        sessionId: session.id,
        email: customerEmail,
        amount: amountTotal,
        currency,
      }
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(
      "❌ CONFIRM FLUSSI PAYMENT ERROR:",
      error
    );

    /*
     * Stripe puede devolver errores específicos
     * si la sesión no existe o no es accesible.
     */

    if (
      error?.type ===
        "StripeInvalidRequestError"
    ) {
      return res.status(400).json({
        ok: false,
        paid: false,
        error:
          "La sesión de pago de Stripe no es válida o no existe.",
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
