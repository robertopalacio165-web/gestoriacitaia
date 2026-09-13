import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * STRIPE WEBHOOK — DECRETO FLUSSI
 * ============================================================
 *
 * URL:
 * https://www.gestoriacitaia.com/api/stripe-webhook-flussi
 *
 * SOLO procesa:
 * metadata.service === "verificacion_decreto_flussi"
 *
 * NO TOCA MALTA.
 *
 * IMPORTANTE:
 * Stripe se encarga del recibo del pago mediante
 * payment_intent_data.receipt_email en Checkout.
 *
 * Este webhook NO envía email de "pago recibido".
 * ============================================================
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

/**
 * ============================================================
 * RAW BODY
 * ============================================================
 */

async function readRawBody(
  req: VercelRequest
): Promise<Buffer> {

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

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
 * ============================================================
 * HELPERS
 * ============================================================
 */

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * ============================================================
 * TRIGGER DEL INFORME
 * ============================================================
 *
 * IMPORTANTE:
 *
 * El webhook de Stripe NO tiene los archivos originales.
 *
 * Por eso aquí enviamos los datos del pago y del cliente
 * al endpoint que tengas configurado en:
 *
 * FLUSSI_REPORT_URL
 *
 * Ese endpoint debe encargarse del análisis real,
 * generación del PDF y email.
 *
 * ============================================================
 */

async function triggerFlussiReport(params: {
  email: string;
  name: string;
  country: string;
  whatsapp: string;
  reference: string;
  session: Stripe.Checkout.Session;
  metadata: Stripe.Metadata;
}) {

  const reportUrl =
    clean(process.env.FLUSSI_REPORT_URL);

  if (!reportUrl) {

    console.error(
      "❌ FLUSSI_REPORT_URL NO CONFIGURADA"
    );

    throw new Error(
      "FLUSSI_REPORT_URL no está configurada en Vercel."
    );
  }

  const metadata =
    params.metadata;

  const payload = {

    source:
      "stripe-webhook-flussi",

    reference:
      params.reference,

    /**
     * ========================================================
     * PAGO
     * ========================================================
     */

    payment: {

      paid: true,

      sessionId:
        params.session.id,

      paymentStatus:
        params.session.payment_status,

      amountTotal:
        params.session.amount_total,

      currency:
        params.session.currency,
    },

    /**
     * ========================================================
     * CLIENTE
     * ========================================================
     */

    client: {

      name:
        params.name,

      email:
        params.email,

      country:
        params.country,

      whatsapp:
        params.whatsapp,
    },

    /**
     * ========================================================
     * EMPLEADOR
     * ========================================================
     */

    employer: {

      name:
        clean(
          metadata.employer_name
        ),

      city:
        clean(
          metadata.employer_city
        ),

      birthDate:
        clean(
          metadata.employer_birth_date
        ),
    },

    /**
     * ========================================================
     * DOCUMENTO
     * ========================================================
     */

    document: {

      type:
        clean(
          metadata.document_type
        ) ||
        "Documento Decreto Flussi",

      count:
        Number(
          metadata.document_count || "0"
        ),
    },

    /**
     * ========================================================
     * MODO DE BÚSQUEDA
     * ========================================================
     */

    searchPersonOnly:
      clean(
        metadata.search_person_only
      ) === "true",

    /**
     * ========================================================
     * METADATA ORIGINAL
     * ========================================================
     */

    flussiMetadata: {

      product:
        clean(metadata.product),

      service:
        clean(metadata.service),

      reference:
        clean(metadata.reference),

      client_name:
        clean(metadata.client_name),

      client_surname:
        clean(metadata.client_surname),

      email:
        clean(metadata.email),

      whatsapp:
        clean(metadata.whatsapp),

      country:
        clean(metadata.country),

      employer_name:
        clean(metadata.employer_name),

      employer_city:
        clean(metadata.employer_city),

      employer_birth_date:
        clean(metadata.employer_birth_date),

      search_person_only:
        clean(metadata.search_person_only),

      document_type:
        clean(metadata.document_type),

      document_count:
        clean(metadata.document_count),
    },

  };

  console.log(
    "📄 ENVIANDO SOLICITUD AL GENERADOR FLUSSI..."
  );

  console.log({
    reportUrl,
    reference:
      params.reference,
    email:
      params.email,
    documentCount:
      metadata.document_count,
  });

  const response =
    await fetch(
      reportUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(payload),
      }
    );

  const responseText =
    await response.text();

  if (!response.ok) {

    throw new Error(
      `FLUSSI_REPORT_URL respondió ${response.status}: ${responseText.slice(
        0,
        1000
      )}`
    );
  }

  console.log(
    "✅ FLUSSI REPORT TRIGGERED"
  );

  console.log(
    responseText.slice(
      0,
      1000
    )
  );

  return {
    triggered: true,

    response:
      responseText,
  };
}

/**
 * ============================================================
 * WEBHOOK
 * ============================================================
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  /**
   * ==========================================================
   * METHOD
   * ==========================================================
   */

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error:
        "Method not allowed",
    });
  }

  /**
   * ==========================================================
   * STRIPE
   * ==========================================================
   */

  if (!stripe) {

    return res.status(500).json({
      ok: false,
      error:
        "STRIPE_SECRET_KEY no está configurada en Vercel.",
    });
  }

  /**
   * ==========================================================
   * WEBHOOK SECRET
   * ==========================================================
   */

  const webhookSecret =
    clean(
      process.env
        .FLUSSI_STRIPE_WEBHOOK_SECRET
    );

  if (!webhookSecret) {

    return res.status(500).json({
      ok: false,
      error:
        "FLUSSI_STRIPE_WEBHOOK_SECRET no está configurada en Vercel.",
    });
  }

  try {

    /**
     * ========================================================
     * 1. RAW BODY
     * ========================================================
     */

    const rawBody =
      await readRawBody(req);

    /**
     * ========================================================
     * 2. STRIPE SIGNATURE
     * ========================================================
     */

    const signature =
      req.headers[
        "stripe-signature"
      ];

    if (
      !signature ||
      Array.isArray(signature)
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Missing Stripe signature.",
      });
    }

    /**
     * ========================================================
     * 3. CONSTRUIR EVENTO
     * ========================================================
     */

    let event: Stripe.Event;

    try {

      event =
        stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        );

    } catch (error: any) {

      console.error(
        "❌ FIRMA STRIPE INVÁLIDA:",
        error?.message
      );

      return res.status(400).json({
        ok: false,
        error:
          `Webhook Error: ${
            error?.message ||
            "Invalid signature"
          }`,
      });
    }

    console.log(
      "📥 FLUSSI WEBHOOK:",
      event.type,
      event.id
    );

    /**
     * ========================================================
     * 4. SOLO checkout.session.completed
     * ========================================================
     */

    if (
      event.type !==
      "checkout.session.completed"
    ) {

      return res.status(200).json({

        ok: true,

        received: true,

        ignored: true,

        event:
          event.type,
      });
    }

    /**
     * ========================================================
     * 5. SESSION
     * ========================================================
     */

    const session =
      event.data.object as
        Stripe.Checkout.Session;

    const metadata =
      session.metadata || {};

    /**
     * ========================================================
     * 6. SEGURIDAD — SOLO FLUSSI
     * ========================================================
     */

    if (
      metadata.service !==
      "verificacion_decreto_flussi"
    ) {

      console.log(
        "↩️ IGNORADO: NO ES DECRETO FLUSSI",
        metadata.service
      );

      return res.status(200).json({

        ok: true,

        received: true,

        ignored: true,

        reason:
          "NOT_FLUSSI",

        service:
          metadata.service ||
          null,
      });
    }

    /**
     * ========================================================
     * 7. PRODUCTO
     * ========================================================
     */

    const product =
      clean(
        metadata.product
      );

    if (
      product &&
      product !==
        "decreto_flussi"
    ) {

      console.log(
        "↩️ IGNORADO: PRODUCTO NO ES FLUSSI",
        product
      );

      return res.status(200).json({

        ok: true,

        received: true,

        ignored: true,

        reason:
          "NOT_FLUSSI_PRODUCT",

        product,
      });
    }

    /**
     * ========================================================
     * 8. PAGO CONFIRMADO
     * ========================================================
     */

    if (
      session.payment_status !==
      "paid"
    ) {

      console.warn(
        "⚠️ FLUSSI RECIBIDO PERO PAYMENT_STATUS NO ES PAID:",
        session.payment_status
      );

      return res.status(200).json({

        ok: true,

        received: true,

        ignored: true,

        reason:
          "PAYMENT_NOT_CONFIRMED",

        payment_status:
          session.payment_status,
      });
    }

    /**
     * ========================================================
     * 9. PRECIO
     * ========================================================
     *
     * Durante la prueba:
     *
     * 0,50 €
     *
     * 50 céntimos.
     *
     * ========================================================
     */

    if (
      typeof session.amount_total ===
        "number" &&
      session.amount_total !==
        50
    ) {

      console.error(
        "❌ IMPORTE FLUSSI INESPERADO:",
        session.amount_total
      );

      return res.status(400).json({

        ok: false,

        error:
          "Importe de pago Flussi inesperado.",

        amount_total:
          session.amount_total,
      });
    }

    /**
     * ========================================================
     * 10. MONEDA
     * ========================================================
     */

    if (
      session.currency &&
      session.currency.toLowerCase() !==
        "eur"
    ) {

      return res.status(400).json({

        ok: false,

        error:
          "Moneda de pago Flussi inesperada.",

        currency:
          session.currency,
      });
    }

    /**
     * ========================================================
     * 11. DATOS CLIENTE
     * ========================================================
     */

    const email = (
      clean(
        metadata.email
      ) ||

      clean(
        session.customer_details
          ?.email
      ) ||

      clean(
        session.customer_email
      )
    ).toLowerCase();

    const metadataName =
      clean(
        metadata.client_name
      );

    const metadataSurname =
      clean(
        metadata.client_surname
      );

    const name =
      `${metadataName} ${metadataSurname}`
        .trim() ||

      clean(
        session.customer_details
          ?.name
      );

    const country =
      clean(
        metadata.country
      );

    const whatsapp =
      clean(
        metadata.whatsapp
      );

    const reference =
      clean(
        metadata.reference
      ) ||

      clean(
        session.client_reference_id
      ) ||

      `FLUSSI-${session.id}`;

    /**
     * ========================================================
     * 12. EMAIL OBLIGATORIO
     * ========================================================
     */

    if (!email) {

      console.error(
        "❌ PAGO FLUSSI SIN EMAIL:",
        session.id
      );

      return res.status(400).json({

        ok: false,

        error:
          "Pago recibido pero no se encontró el email del cliente.",
      });
    }

    /**
     * ========================================================
     * 13. LOG
     * ========================================================
     */

    console.log(
      "================================================"
    );

    console.log(
      "🇮🇹 DECRETO FLUSSI — PAGO CONFIRMADO"
    );

    console.log(
      "Session:",
      session.id
    );

    console.log(
      "Event:",
      event.id
    );

    console.log(
      "Email:",
      email
    );

    console.log(
      "Nombre:",
      name
    );

    console.log(
      "Referencia:",
      reference
    );

    console.log(
      "Amount:",
      session.amount_total
    );

    console.log(
      "Currency:",
      session.currency
    );

    console.log(
      "Payment:",
      session.payment_status
    );

    console.log(
      "🇮🇹 STRIPE RECIBO:",
      "gestionado por Stripe"
    );

    console.log(
      "📧 BREVO PAYMENT EMAIL:",
      "DESACTIVADO"
    );

    console.log(
      "================================================"
    );

    /**
     * ========================================================
     * 14. GENERAR INFORME
     * ========================================================
     */

    let reportResult: unknown;

    try {

      reportResult =
        await triggerFlussiReport({

          email,

          name,

          country,

          whatsapp,

          reference,

          session,

          metadata,

        });

    } catch (reportError: any) {

      console.error(
        "❌ ERROR GENERANDO INFORME FLUSSI:",
        reportError?.message ||
          reportError
      );

      /**
       * IMPORTANTE:
       *
       * Si el informe falla, devolvemos 500.
       *
       * Así Stripe puede volver a intentar
       * entregar el webhook.
       */

      return res.status(500).json({

        ok: false,

        error:
          reportError?.message ||
          "Error generando informe Flussi.",

        payment_received:
          true,

        payment_status:
          session.payment_status,

        reference,
      });
    }

    /**
     * ========================================================
     * 15. TODO OK
     * ========================================================
     */

    return res.status(200).json({

      ok: true,

      received: true,

      processed: true,

      product:
        "decreto_flussi",

      service:
        "verificacion_decreto_flussi",

      event_id:
        event.id,

      session_id:
        session.id,

      payment_status:
        session.payment_status,

      amount_total:
        session.amount_total,

      currency:
        session.currency,

      reference,

      email,

      stripe_receipt:
        "Stripe",

      payment_email_brevo:
        false,

      report:
        reportResult,
    });

  } catch (error: any) {

    console.error(
      "❌ FLUSSI WEBHOOK ERROR:",
      error?.message ||
        error
    );

    return res.status(500).json({

      ok: false,

      error:
        error?.message ||
        "Internal webhook error",
    });
  }
}
