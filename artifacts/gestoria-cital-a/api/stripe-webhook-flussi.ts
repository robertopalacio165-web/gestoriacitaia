import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * STRIPE WEBHOOK — VERIFICACIÓN DECRETO FLUSSI
 * ============================================================
 *
 * ARCHIVO:
 *
 * api/stripe-webhook-flussi.ts
 *
 * URL:
 *
 * https://www.gestoriacitaia.com/api/stripe-webhook-flussi
 *
 * ============================================================
 *
 * OBJETIVO DEL FLUJO
 *
 * DOCUMENTOS
 *     ↓
 * REFERENCIA FLUSSI
 *     ↓
 * STRIPE CHECKOUT
 *     ↓
 * PAGO CONFIRMADO
 *     ↓
 * WEBHOOK
 *     ↓
 * RECUPERAR DOCUMENTOS TEMPORALES
 *     ↓
 * ANÁLISIS DOCUMENTAL
 *     ↓
 * PDF
 *     ↓
 * EMAIL CLIENTE
 *
 * ============================================================
 *
 * IMPORTANTE
 *
 * Stripe NO guarda los documentos originales.
 *
 * Por eso este webhook trabaja siempre con una referencia:
 *
 * FLUSSI-XXXXXXXX
 *
 * El tercer archivo del flujo se encargará de garantizar que
 * los documentos estén disponibles en almacenamiento temporal
 * usando esa referencia.
 *
 * ============================================================
 *
 * ESTE ARCHIVO:
 *
 * - SOLO procesa Decreto Flussi
 * - NO procesa Malta
 * - NO busca personas por nombre
 * - NO utiliza "searchPersonOnly"
 * - EXIGE al menos un documento
 * - comprueba que el pago esté realmente pagado
 * - comprueba importe y moneda
 * - genera la solicitud de análisis
 * - manda la referencia documental al generador
 *
 * ============================================================
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * ============================================================
 * STRIPE
 * ============================================================
 */

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
 *
 * Stripe necesita el body original para verificar
 * correctamente la firma del webhook.
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

  return new Promise(
    (resolve, reject) => {
      const chunks: Buffer[] = [];

      req.on(
        "data",
        (chunk) => {
          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk)
          );
        }
      );

      req.on(
        "end",
        () => {
          resolve(
            Buffer.concat(chunks)
          );
        }
      );

      req.on(
        "error",
        reject
      );
    }
  );
}

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function clean(
  value: unknown
): string {
  return String(
    value ?? ""
  ).trim();
}

function cleanEmail(
  value: unknown
): string {
  return clean(value)
    .toLowerCase();
}

function safeNumber(
  value: unknown
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/**
 * ============================================================
 * GENERAR REFERENCIA
 * ============================================================
 */

function createFallbackReference(
  session: Stripe.Checkout.Session
): string {
  return (
    clean(
      session.client_reference_id
    ) ||
    `FLUSSI-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`
  );
}

/**
 * ============================================================
 * TRIGGER DEL INFORME
 * ============================================================
 *
 * Después de confirmar el pago:
 *
 * Stripe
 *   ↓
 * webhook
 *   ↓
 * sendFlussiReport
 *
 * La referencia es MUY IMPORTANTE porque permitirá al
 * siguiente paso recuperar los documentos temporales.
 * ============================================================
 */

async function triggerFlussiReport(
  params: {
    email: string;
    name: string;
    country: string;
    whatsapp: string;
    reference: string;
    session: Stripe.Checkout.Session;
    metadata: Stripe.Metadata;
  }
) {
  const reportUrl =
    clean(
      process.env.FLUSSI_REPORT_URL
    );

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

  /**
   * ==========================================================
   * DATOS DEL DOCUMENTO
   * ==========================================================
   */

  const documentType =
    clean(
      metadata.document_type
    ) ||
    "Documento Decreto Flussi";

  const documentCount =
    safeNumber(
      metadata.document_count
    );

  /**
   * ==========================================================
   * REFERENCIA DOCUMENTAL
   * ==========================================================
   *
   * Esta referencia será utilizada para encontrar los
   * documentos temporales asociados al pago.
   *
   * EJEMPLO:
   *
   * FLUSSI-1770000000000-ABC123
   *
   * ==========================================================
   */

  const documentReference =
    params.reference;

  /**
   * ==========================================================
   * PAYLOAD
   * ==========================================================
   */

  const payload = {
    /**
     * --------------------------------------------------------
     * ORIGEN
     * --------------------------------------------------------
     */

    source:
      "stripe-webhook-flussi",

    service:
      "verificacion_decreto_flussi",

    /**
     * --------------------------------------------------------
     * REFERENCIA PRINCIPAL
     * --------------------------------------------------------
     */

    reference:
      params.reference,

    /**
     * --------------------------------------------------------
     * PAGO
     * --------------------------------------------------------
     */

    payment: {
      paid:
        true,

      sessionId:
        params.session.id,

      paymentStatus:
        params.session.payment_status,

      amountTotal:
        params.session.amount_total,

      currency:
        params.session.currency,

      paymentConfirmedAt:
        new Date().toISOString(),
    },

    /**
     * --------------------------------------------------------
     * CLIENTE
     * --------------------------------------------------------
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
     * --------------------------------------------------------
     * DOCUMENTOS
     * --------------------------------------------------------
     *
     * NO utilizamos búsqueda por nombre.
     *
     * Todo el servicio es documental.
     * --------------------------------------------------------
     */

    documents: {
      reference:
        documentReference,

      type:
        documentType,

      count:
        documentCount,

      status:
        "paid_ready_for_analysis",

      storageBucket:
        "documentos-flussi-privado",

      temporaryFolder:
        `flussi-temp/${documentReference}`,

      finalFolder:
        `flussi/${documentReference}`,
    },

    /**
     * --------------------------------------------------------
     * EMPLEADOR
     * --------------------------------------------------------
     *
     * Estos datos pueden venir del formulario antiguo.
     * Si están vacíos, NO pasa nada.
     *
     * En el nuevo sistema la IA deberá extraerlos del
     * documento cuando sea posible.
     * --------------------------------------------------------
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
     * --------------------------------------------------------
     * METADATA FLUSSI
     * --------------------------------------------------------
     *
     * Conservamos solamente la información útil.
     *
     * NO enviamos search_person_only.
     * --------------------------------------------------------
     */

    flussiMetadata: {
      product:
        clean(
          metadata.product
        ),

      service:
        clean(
          metadata.service
        ),

      reference:
        clean(
          metadata.reference
        ) ||
        params.reference,

      client_name:
        clean(
          metadata.client_name
        ),

      client_surname:
        clean(
          metadata.client_surname
        ),

      email:
        clean(
          metadata.email
        ) ||
        params.email,

      whatsapp:
        clean(
          metadata.whatsapp
        ),

      country:
        clean(
          metadata.country
        ),

      employer_name:
        clean(
          metadata.employer_name
        ),

      employer_city:
        clean(
          metadata.employer_city
        ),

      employer_birth_date:
        clean(
          metadata.employer_birth_date
        ),

      document_type:
        documentType,

      document_count:
        String(
          documentCount
        ),

      document_reference:
        documentReference,
    },

    /**
     * --------------------------------------------------------
     * INSTRUCCIÓN AL GENERADOR
     * --------------------------------------------------------
     */

    analysisRequest: {
      mode:
        "document_only",

      analyzeDocuments:
        true,

      compareDocuments:
        true,

      extractVisibleInformation:
        true,

      detectInconsistencies:
        true,

      detectSuspiciousElements:
        true,

      detectPossibleFraudIndicators:
        true,

      neverClaimOfficialAuthenticity:
        true,

      requireOfficialVerificationWhenNecessary:
        true,

      generateProfessionalReport:
        true,

      generatePdf:
        true,

      sendEmail:
        true,
    },
  };

  /**
   * ==========================================================
   * LOG
   * ==========================================================
   */

  console.log(
    "================================================"
  );

  console.log(
    "🇮🇹 FLUSSI — ENVIANDO INFORME"
  );

  console.log(
    "Referencia:",
    params.reference
  );

  console.log(
    "Email:",
    params.email
  );

  console.log(
    "Documentos:",
    documentCount
  );

  console.log(
    "Tipo:",
    documentType
  );

  console.log(
    "Carpeta temporal:",
    `flussi-temp/${documentReference}`
  );

  console.log(
    "================================================"
  );

  /**
   * ==========================================================
   * REQUEST
   * ==========================================================
   */

  const response =
    await fetch(
      reportUrl,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          /**
           * Clave opcional para impedir que otro servicio
           * pueda llamar libremente al generador.
           */

          ...(process.env.FLUSSI_REPORT_SECRET
            ? {
                "x-flussi-report-secret":
                  process.env.FLUSSI_REPORT_SECRET,
              }
            : {}),
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  const responseText =
    await response.text();

  /**
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (!response.ok) {
    throw new Error(
      `FLUSSI_REPORT_URL respondió ${response.status}: ${responseText.slice(
        0,
        1500
      )}`
    );
  }

  /**
   * ==========================================================
   * OK
   * ==========================================================
   */

  console.log(
    "✅ FLUSSI REPORT TRIGGERED"
  );

  console.log(
    responseText.slice(
      0,
      1500
    )
  );

  return {
    triggered:
      true,

    reference:
      params.reference,

    documentCount,

    response:
      responseText,
  };
}

/**
 * ============================================================
 * WEBHOOK PRINCIPAL
 * ============================================================
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /**
   * ==========================================================
   * 1. MÉTODO
   * ==========================================================
   */

  if (
    req.method !==
    "POST"
  ) {
    return res.status(405).json({
      ok:
        false,

      error:
        "Method not allowed",
    });
  }

  /**
   * ==========================================================
   * 2. STRIPE
   * ==========================================================
   */

  if (!stripe) {
    return res.status(500).json({
      ok:
        false,

      error:
        "STRIPE_SECRET_KEY no está configurada en Vercel.",
    });
  }

  /**
   * ==========================================================
   * 3. WEBHOOK SECRET
   * ==========================================================
   */

  const webhookSecret =
    clean(
      process.env
        .FLUSSI_STRIPE_WEBHOOK_SECRET
    );

  if (!webhookSecret) {
    return res.status(500).json({
      ok:
        false,

      error:
        "FLUSSI_STRIPE_WEBHOOK_SECRET no está configurada en Vercel.",
    });
  }

  try {
    /**
     * ========================================================
     * 4. RAW BODY
     * ========================================================
     */

    const rawBody =
      await readRawBody(
        req
      );

    /**
     * ========================================================
     * 5. STRIPE SIGNATURE
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
        ok:
          false,

        error:
          "Missing Stripe signature.",
      });
    }

    /**
     * ========================================================
     * 6. CONSTRUIR EVENTO
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
    } catch (
      error: any
    ) {
      console.error(
        "❌ FIRMA STRIPE INVÁLIDA:",
        error?.message
      );

      return res.status(400).json({
        ok:
          false,

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
     * 7. SOLO CHECKOUT COMPLETADO
     * ========================================================
     */

    if (
      event.type !==
      "checkout.session.completed"
    ) {
      return res.status(200).json({
        ok:
          true,

        received:
          true,

        ignored:
          true,

        event:
          event.type,
      });
    }

    /**
     * ========================================================
     * 8. SESSION
     * ========================================================
     */

    const session =
      event.data.object as
        Stripe.Checkout.Session;

    const metadata =
      session.metadata ||
      {};

    /**
     * ========================================================
     * 9. SEGURIDAD — SOLO DECRETO FLUSSI
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
        ok:
          true,

        received:
          true,

        ignored:
          true,

        reason:
          "NOT_FLUSSI",

        service:
          metadata.service ||
          null,
      });
    }

    /**
     * ========================================================
     * 10. PRODUCTO
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
        ok:
          true,

        received:
          true,

        ignored:
          true,

        reason:
          "NOT_FLUSSI_PRODUCT",

        product,
      });
    }

    /**
     * ========================================================
     * 11. PAGO REALMENTE CONFIRMADO
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
        ok:
          true,

        received:
          true,

        ignored:
          true,

        reason:
          "PAYMENT_NOT_CONFIRMED",

        payment_status:
          session.payment_status,
      });
    }

    /**
     * ========================================================
     * 12. PRECIO DE PRUEBA
     * ========================================================
     *
     * 0,50 €
     *
     * Cuando terminemos las pruebas puedes cambiarlo.
     * ========================================================
     */

    const expectedAmount =
      Number(
        process.env.FLUSSI_EXPECTED_AMOUNT_CENTS ||
        "50"
      );

    if (
      typeof session.amount_total ===
        "number" &&
      session.amount_total !==
        expectedAmount
    ) {
      console.error(
        "❌ IMPORTE FLUSSI INESPERADO:",
        {
          recibido:
            session.amount_total,

          esperado:
            expectedAmount,
        }
      );

      return res.status(400).json({
        ok:
          false,

        error:
          "Importe de pago Flussi inesperado.",

        amount_total:
          session.amount_total,

        expected_amount:
          expectedAmount,
      });
    }

    /**
     * ========================================================
     * 13. MONEDA
     * ========================================================
     */

    if (
      session.currency &&
      session.currency.toLowerCase() !==
        "eur"
    ) {
      return res.status(400).json({
        ok:
          false,

        error:
          "Moneda de pago Flussi inesperada.",

        currency:
          session.currency,
      });
    }

    /**
     * ========================================================
     * 14. DATOS CLIENTE
     * ========================================================
     */

    const email =
      (
        cleanEmail(
          metadata.email
        ) ||
        cleanEmail(
          session.customer_details
            ?.email
        ) ||
        cleanEmail(
          session.customer_email
        )
      );

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

    /**
     * ========================================================
     * 15. REFERENCIA
     * ========================================================
     */

    const reference =
      clean(
        metadata.reference
      ) ||
      createFallbackReference(
        session
      );

    /**
     * ========================================================
     * 16. NÚMERO DE DOCUMENTOS
     * ========================================================
     */

    const documentCount =
      safeNumber(
        metadata.document_count
      );

    /**
     * ========================================================
     * 17. DOCUMENTOS OBLIGATORIOS
     * ========================================================
     *
     * Este servicio YA NO acepta:
     *
     * ❌ búsqueda solamente por nombre
     * ❌ búsqueda solamente por persona
     * ❌ análisis sin documentos
     *
     * El cliente debe haber seleccionado como mínimo
     * un documento.
     * ========================================================
     */

    if (
      documentCount <
      1
    ) {
      console.error(
        "❌ PAGO FLUSSI SIN DOCUMENTOS:",
        {
          reference,
          email,
          documentCount,
        }
      );

      return res.status(400).json({
        ok:
          false,

        error:
          "El pago se recibió pero no existe ningún documento asociado a la referencia.",

        payment_received:
          true,

        reference,

        document_count:
          documentCount,
      });
    }

    /**
     * ========================================================
     * 18. LÍMITE DOCUMENTOS
     * ========================================================
     */

    if (
      documentCount >
      5
    ) {
      console.error(
        "❌ DEMASIADOS DOCUMENTOS FLUSSI:",
        documentCount
      );

      return res.status(400).json({
        ok:
          false,

        error:
          "Se ha superado el máximo de 5 documentos.",

        reference,

        document_count:
          documentCount,
      });
    }

    /**
     * ========================================================
     * 19. EMAIL OBLIGATORIO
     * ========================================================
     */

    if (!email) {
      console.error(
        "❌ PAGO FLUSSI SIN EMAIL:",
        session.id
      );

      return res.status(400).json({
        ok:
          false,

        error:
          "Pago recibido pero no se encontró el email del cliente.",
      });
    }

    /**
     * ========================================================
     * 20. LOG PAGO CONFIRMADO
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
      "Documentos:",
      documentCount
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
      "📄 MODO:",
      "DOCUMENT ONLY"
    );

    console.log(
      "🔎 BÚSQUEDA POR NOMBRE:",
      "DESACTIVADA"
    );

    console.log(
      "📧 STRIPE RECIBO:",
      "gestionado por Stripe"
    );

    console.log(
      "================================================"
    );

    /**
     * ========================================================
     * 21. GENERAR INFORME
     * ========================================================
     */

    let reportResult:
      unknown;

    try {
      reportResult =
        await triggerFlussiReport(
          {
            email,

            name,

            country,

            whatsapp,

            reference,

            session,

            metadata,
          }
        );
    } catch (
      reportError: any
    ) {
      console.error(
        "❌ ERROR GENERANDO INFORME FLUSSI:",
        reportError?.message ||
          reportError
      );

      /**
       * IMPORTANTE:
       *
       * Si falla el informe, devolvemos 500.
       *
       * Stripe podrá volver a intentar el webhook.
       */

      return res.status(500).json({
        ok:
          false,

        error:
          reportError?.message ||
          "Error generando informe Flussi.",

        payment_received:
          true,

        payment_status:
          session.payment_status,

        reference,

        document_count:
          documentCount,
      });
    }

    /**
     * ========================================================
     * 22. TODO CORRECTO
     * ========================================================
     */

    return res.status(200).json({
      ok:
        true,

      received:
        true,

      processed:
        true,

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

      document_count:
        documentCount,

      document_mode:
        "document_only",

      stripe_receipt:
        "Stripe",

      report:
        reportResult,
    });
  } catch (
    error: any
  ) {
    /**
     * ========================================================
     * ERROR GENERAL
     * ========================================================
     */

    console.error(
      "❌ FLUSSI WEBHOOK ERROR:",
      error?.message ||
        error
    );

    return res.status(500).json({
      ok:
        false,

      error:
        error?.message ||
        "Internal webhook error",
    });
  }
}
