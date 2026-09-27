import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI LAVORO
 * STRIPE WEBHOOK
 * ============================================================
 *
 * ARCHIVO:
 *   api/webhook-flussi-lavoro.ts
 *
 * ESTE WEBHOOK ES EXCLUSIVO DEL SERVICIO:
 *   "Decreto Flussi Lavoro"
 *
 * NO procesa:
 *   - Verificación Decreto Flussi
 *   - Malta
 *   - otros productos
 *
 * FLUJO:
 *
 * CLIENTE
 *    ↓
 * create-checkout-flussi-lavoro.ts
 *    ↓
 * Stripe Checkout
 *    ↓
 * checkout.session.completed
 *    ↓
 * ESTE WEBHOOK
 *    ↓
 * comprueba service === "flussi_lavoro"
 *    ↓
 * comprueba payment_status === "paid"
 *    ↓
 * prepara los datos del pedido
 *    ↓
 * llama a:
 *   /api/flussi-lavoro-gmail
 *
 * IMPORTANTE:
 * El pago SOLO se considera confirmado por Stripe.
 * Nunca confiamos en ?payment=success de la web.
 * ============================================================
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

/**
 * Stripe necesita el body RAW para comprobar la firma.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Leer el body RAW.
 */
async function readRawBody(
  req: VercelRequest
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

/**
 * Convierte un valor a string seguro.
 */
function cleanString(
  value: unknown,
  maxLength = 1000
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

/**
 * Intenta convertir las categorías guardadas en metadata
 * a una lista.
 */
function parseCategories(
  value: unknown
): string[] {
  const raw = cleanString(value, 500);

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) =>
      item.trim()
    )
    .filter(Boolean)
    .slice(0, 30);
}

/**
 * Envía el pedido confirmado al archivo exclusivo
 * encargado del Gmail.
 *
 * No se envía ningún email directamente desde este webhook.
 *
 * Así mantenemos:
 *
 * webhook = confirmar pago
 * gmail   = enviar email
 */
async function triggerFlussiLavoroGmail(
  payload: Record<string, unknown>
) {
  const gmailUrl =
    process.env.FLUSSI_LAVORO_GMAIL_URL;

  if (!gmailUrl) {
    console.warn(
      "⚠️ FLUSSI_LAVORO_GMAIL_URL no está configurada."
    );

    return {
      sent: false,
      skipped: true,
      reason:
        "FLUSSI_LAVORO_GMAIL_URL_NOT_CONFIGURED",
    };
  }

  const response = await fetch(
    gmailUrl,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        /**
         * Token opcional para proteger el endpoint
         * de Gmail de llamadas externas.
         */
        ...(process.env.FLUSSI_LAVORO_INTERNAL_SECRET
          ? {
              "x-flussi-lavoro-secret":
                process.env
                  .FLUSSI_LAVORO_INTERNAL_SECRET,
            }
          : {}),
      },

      body: JSON.stringify(payload),
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "❌ FLUSSI LAVORO GMAIL ERROR:",
      response.status,
      responseText.slice(0, 1000)
    );

    throw new Error(
      `El endpoint Gmail respondió ${response.status}.`
    );
  }

  console.log(
    "✅ FLUSSI LAVORO GMAIL TRIGGERED:",
    responseText.slice(0, 500)
  );

  return {
    sent: true,
    skipped: false,
    response: responseText,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /**
   * ----------------------------------------------------------
   * SOLO POST
   * ----------------------------------------------------------
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido.",
    });
  }

  /**
   * ----------------------------------------------------------
   * CONFIGURACIÓN
   * ----------------------------------------------------------
   */
  if (!stripe) {
    console.error(
      "❌ STRIPE_SECRET_KEY no está configurada."
    );

    return res.status(500).json({
      ok: false,
      error:
        "Stripe no está configurado correctamente.",
    });
  }

  if (!webhookSecret) {
    console.error(
      "❌ STRIPE_WEBHOOK_SECRET no está configurado."
    );

    return res.status(500).json({
      ok: false,
      error:
        "Falta STRIPE_WEBHOOK_SECRET.",
    });
  }

  try {
    /**
     * --------------------------------------------------------
     * BODY RAW
     * --------------------------------------------------------
     */
    const rawBody =
      await readRawBody(req);

    const signature =
      req.headers[
        "stripe-signature"
      ];

    if (
      typeof signature !== "string" ||
      !signature
    ) {
      console.error(
        "❌ Falta Stripe-Signature."
      );

      return res.status(400).json({
        ok: false,
        error:
          "Falta la firma de Stripe.",
      });
    }

    /**
     * --------------------------------------------------------
     * VERIFICAR EVENTO STRIPE
     * --------------------------------------------------------
     */
    let event: Stripe.Event;

    try {
      event =
        stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        );
    } catch (signatureError) {
      console.error(
        "❌ FIRMA STRIPE INVÁLIDA:",
        signatureError
      );

      return res.status(400).json({
        ok: false,
        error:
          "Firma de Stripe inválida.",
      });
    }

    console.log(
      "📦 STRIPE EVENT:",
      event.id,
      event.type
    );

    /**
     * --------------------------------------------------------
     * SOLO NOS INTERESA:
     * checkout.session.completed
     * --------------------------------------------------------
     */
    if (
      event.type !==
      "checkout.session.completed"
    ) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        event: event.type,
      });
    }

    const session =
      event.data
        .object as Stripe.Checkout.Session;

    /**
     * --------------------------------------------------------
     * FILTRO CRÍTICO:
     * SOLO FLUSSI LAVORO
     * --------------------------------------------------------
     *
     * Esto evita que este webhook procese pagos
     * del sistema de verificación u otros productos.
     */
    const metadata =
      session.metadata || {};

    const service =
      cleanString(
        metadata.service,
        100
      );

    const product =
      cleanString(
        metadata.product,
        100
      );

    if (
      service !== "flussi_lavoro" ||
      product !==
        "decreto_flussi_lavoro"
    ) {
      console.log(
        "ℹ️ Evento ignorado por este webhook:",
        {
          eventId: event.id,
          service,
          product,
        }
      );

      return res.status(200).json({
        ok: true,
        ignored: true,
        reason:
          "NOT_FLUSSI_LAVORO",
      });
    }

    /**
     * --------------------------------------------------------
     * COMPROBAR PAGO
     * --------------------------------------------------------
     */
    if (
      session.payment_status !==
      "paid"
    ) {
      console.warn(
        "⚠️ FLUSSI LAVORO: checkout completado pero pago no confirmado.",
        {
          sessionId: session.id,
          paymentStatus:
            session.payment_status,
        }
      );

      return res.status(200).json({
        ok: true,
        paid: false,
        reason:
          "PAYMENT_NOT_CONFIRMED",
      });
    }

    /**
     * --------------------------------------------------------
     * DATOS DEL CLIENTE
     * --------------------------------------------------------
     */
    const email =
      cleanString(
        metadata.email ||
          session.customer_details?.email ||
          session.customer_email,
        320
      ).toLowerCase();

    const firstName =
      cleanString(
        metadata.client_name,
        100
      );

    const lastName =
      cleanString(
        metadata.client_surname,
        150
      );

    const phone =
      cleanString(
        metadata.phone,
        40
      );

    const workType =
      cleanString(
        metadata.work_type,
        50
      );

    const categories =
      parseCategories(
        metadata.categories
      );

    const packageCode =
      cleanString(
        metadata.package_code,
        50
      );

    const packageName =
      cleanString(
        metadata.package_name,
        200
      );

    const amountCents =
      Number(
        metadata.package_amount_cents ||
          session.amount_total ||
          0
      );

    const durationDays =
      Number(
        metadata.duration_days ||
          30
      );

    const reference =
      cleanString(
        metadata.reference ||
          session.client_reference_id,
        100
      );

    /**
     * --------------------------------------------------------
     * VALIDACIONES DE SEGURIDAD
     * --------------------------------------------------------
     */
    if (!email) {
      console.error(
        "❌ FLUSSI LAVORO: no hay email.",
        {
          sessionId: session.id,
        }
      );

      return res.status(400).json({
        ok: false,
        error:
          "El pago no contiene email del cliente.",
      });
    }

    if (!packageCode) {
      console.error(
        "❌ FLUSSI LAVORO: no hay packageCode.",
        {
          sessionId: session.id,
        }
      );

      return res.status(400).json({
        ok: false,
        error:
          "El pago no contiene el plan.",
      });
    }

    /**
     * --------------------------------------------------------
     * PAYLOAD PARA GMAIL
     * --------------------------------------------------------
     *
     * Este objeto será utilizado por:
     *
     * api/flussi-lavoro-gmail.ts
     *
     * para crear el email correspondiente al plan.
     */
    const gmailPayload = {
      source:
        "webhook-flussi-lavoro",

      eventId:
        event.id,

      eventType:
        event.type,

      sessionId:
        session.id,

      paymentIntentId:
        typeof session.payment_intent ===
        "string"
          ? session.payment_intent
          : "",

      paid: true,

      paymentStatus:
        session.payment_status,

      paidAt:
        new Date().toISOString(),

      amountCents,

      currency:
        session.currency ||
        "eur",

      reference,

      client: {
        firstName,
        lastName,
        email,
        phone,
      },

      service:
        "flussi_lavoro",

      product:
        "decreto_flussi_lavoro",

      workType,

      categories,

      plan: {
        code:
          packageCode,

        name:
          packageName,

        amountCents,

        durationDays,
      },

      stripe: {
        sessionId:
          session.id,

        paymentIntentId:
          typeof session.payment_intent ===
          "string"
            ? session.payment_intent
            : "",

        customerId:
          typeof session.customer ===
          "string"
            ? session.customer
            : "",
      },
    };

    /**
     * --------------------------------------------------------
     * LLAMAR AL SISTEMA DE GMAIL
     * --------------------------------------------------------
     */
    const gmailResult =
      await triggerFlussiLavoroGmail(
        gmailPayload
      );

    /**
     * --------------------------------------------------------
     * LOG FINAL
     * --------------------------------------------------------
     */
    console.log(
      "✅ FLUSSI LAVORO PAYMENT CONFIRMED",
      {
        eventId: event.id,
        sessionId: session.id,
        email,
        packageCode,
        packageName,
        amountCents,
        categories,
        workType,
        gmailSent:
          gmailResult.sent,
      }
    );

    /**
     * --------------------------------------------------------
     * RESPUESTA
     * --------------------------------------------------------
     */
    return res.status(200).json({
      ok: true,

      paid: true,

      service:
        "flussi_lavoro",

      eventId:
        event.id,

      sessionId:
        session.id,

      reference,

      email,

      packageCode,

      amountCents,

      currency:
        session.currency ||
        "eur",

      gmail:
        gmailResult,
    });
  } catch (error: any) {
    console.error(
      "❌ FLUSSI LAVORO WEBHOOK ERROR:",
      error
    );

    /**
     * 500 hace que Stripe pueda reintentar el webhook
     * cuando realmente ha habido un error del servidor.
     */
    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Error procesando el webhook de Flussi Lavoro.",
    });
  }
}
