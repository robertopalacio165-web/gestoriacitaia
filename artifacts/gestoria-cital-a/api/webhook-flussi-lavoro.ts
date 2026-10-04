import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ============================================================
 * GESTORIACITAIA
 * STRIPE WEBHOOK — DECRETO FLUSSI 2027
 * ============================================================
 *
 * URL:
 * https://gestoriacitaia.com/api/stripe-webhook-flussi
 *
 * FLUJO:
 *
 * Stripe
 *   ↓
 * checkout.session.completed
 *   ↓
 * verificar firma Stripe
 *   ↓
 * verificar pago
 *   ↓
 * verificar producto Flussi
 *   ↓
 * llamar al archivo:
 * /api/flussi-lavoro-gmail
 *   ↓
 * email de bienvenida
 *
 * IMPORTANTE:
 * NO genera HTML aquí.
 * NO modifica la plantilla Gmail.
 * NO toca flussi-lavoro-gmail.ts
 *
 * ============================================================
 */

/**
 * ============================================================
 * VERCEL — DESACTIVAR BODY PARSER
 * ============================================================
 *
 * Stripe necesita exactamente el body original.
 */
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

/**
 * ============================================================
 * STRIPE
 * ============================================================
 */

const stripeSecretKey = String(
  process.env.STRIPE_SECRET_KEY || ""
).trim();

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

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
 * RAW BODY
 * ============================================================
 *
 * MUY IMPORTANTE PARA STRIPE.
 *
 * No hacemos JSON.stringify(req.body).
 * No reconstruimos el JSON.
 * Leemos exactamente los bytes recibidos.
 */
async function readRawBody(
  req: VercelRequest
): Promise<Buffer> {

  /**
   * Si algún runtime ya nos entrega Buffer,
   * utilizamos directamente ese Buffer.
   */
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  /**
   * Si por algún motivo ya tenemos string,
   * utilizamos el string tal cual.
   */
  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

  /**
   * Leer directamente el stream HTTP.
   */
  return new Promise<Buffer>((resolve, reject) => {

    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {

      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(Buffer.from(String(chunk)));
      }

    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", (error) => {
      reject(error);
    });

  });
}

/**
 * ============================================================
 * STRIPE WEBHOOK SECRETS
 * ============================================================
 *
 * Permitimos varios nombres de variable para evitar romper
 * una configuración anterior que ya funcionaba.
 *
 * PRIORIDAD:
 *
 * 1. FLUSSI_STRIPE_WEBHOOK_SECRET
 * 2. STRIPE_WEBHOOK_SECRET
 * 3. STRIPE_WEBHOOK_ENDPOINT_SECRET
 */
function getWebhookSecrets(): {
  name: string;
  value: string;
}[] {

  const candidates = [
    {
      name: "FLUSSI_STRIPE_WEBHOOK_SECRET",
      value: clean(
        process.env.FLUSSI_STRIPE_WEBHOOK_SECRET
      ),
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      value: clean(
        process.env.STRIPE_WEBHOOK_SECRET
      ),
    },
    {
      name: "STRIPE_WEBHOOK_ENDPOINT_SECRET",
      value: clean(
        process.env.STRIPE_WEBHOOK_ENDPOINT_SECRET
      ),
    },
  ];

  const unique: {
    name: string;
    value: string;
  }[] = [];

  const seen = new Set<string>();

  for (const item of candidates) {

    if (!item.value) {
      continue;
    }

    if (seen.has(item.value)) {
      continue;
    }

    seen.add(item.value);
    unique.push(item);
  }

  return unique;
}

/**
 * ============================================================
 * VERIFICAR FIRMA STRIPE
 * ============================================================
 */
function verifyStripeSignature(
  rawBody: Buffer,
  signature: string,
  secrets: {
    name: string;
    value: string;
  }[]
): {
  event: Stripe.Event;
  secretName: string;
} {

  let lastError: unknown = null;

  for (const secret of secrets) {

    try {

      const event =
        stripe!.webhooks.constructEvent(
          rawBody,
          signature,
          secret.value
        );

      return {
        event,
        secretName: secret.name,
      };

    } catch (error) {

      lastError = error;

    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Stripe signature verification failed.";

  throw new Error(message);
}

/**
 * ============================================================
 * ENVIAR EMAIL DE BIENVENIDA
 * ============================================================
 *
 * IMPORTANTE:
 *
 * ESTE WEBHOOK NO MODIFICA EL ARCHIVO GMAIL.
 *
 * Llama directamente al endpoint existente:
 *
 * /api/flussi-lavoro-gmail
 *
 * ============================================================
 */

async function sendFlussiWelcomeEmail(params: {
  session: Stripe.Checkout.Session;
  metadata: Stripe.Metadata;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  packageCode: string;
  packageName: string;
  packageAmountCents: number;
  durationDays: number;
}) {

  /**
   * Endpoint existente del archivo Gmail.
   */
  const gmailUrl =
    clean(
      process.env.FLUSSI_LAVORO_GMAIL_URL
    ) ||
    "https://gestoriacitaia.com/api/flussi-lavoro-gmail";

  /**
   * Secret interno opcional.
   */
  const internalSecret =
    clean(
      process.env.FLUSSI_LAVORO_INTERNAL_SECRET
    );

  /**
   * ========================================================
   * COMPATIBILIDAD CON TU ARCHIVO GMAIL ACTUAL
   * ========================================================
   *
   * El archivo Gmail actual acepta:
   *
   * service:
   * flussi_lavoro
   *
   * product:
   * decreto_flussi_lavoro
   *
   * workType:
   * non_stagionale | stagionale
   *
   * categories:
   * string[]
   *
   * packageCode:
   * monthly | biweekly | single_category
   *
   * Tu nuevo checkout utiliza:
   *
   * all_offers
   * new_10_days
   *
   * Por eso hacemos el mapeo AQUÍ.
   *
   * NO TOCAMOS EL ARCHIVO GMAIL.
   */

  let gmailPackageCode:
    | "monthly"
    | "biweekly"
    | "single_category";

  if (
    params.packageCode ===
    "new_10_days"
  ) {

    gmailPackageCode = "monthly";

  } else {

    gmailPackageCode = "monthly";

  }

  /**
   * Para este servicio no estamos pidiendo categorías
   * ni tipo de trabajo en el nuevo checkout.
   *
   * El archivo Gmail actual admite array vacío.
   */
  const workType =
    "non_stagionale";

  const categories: string[] = [];

  /**
   * Nombre del paquete que ya viene del checkout.
   */
  const packageName =
    params.packageName ||
    params.metadata.package_name ||
    params.packageCode;

  /**
   * Payload EXACTAMENTE compatible con
   * flussi-lavoro-gmail.ts actual.
   */
  const payload = {

    service:
      "flussi_lavoro",

    product:
      "decreto_flussi_lavoro",

    paid:
      true,

    reference:
      clean(
        params.metadata.reference
      ) ||
      clean(
        params.session.client_reference_id
      ) ||
      `FLUSSI-${params.session.id}`,

    stripeSessionId:
      params.session.id,

    client: {

      firstName:
        params.firstName,

      lastName:
        params.lastName,

      email:
        params.email,

      phone:
        params.phone,
    },

    workType,

    categories,

    packageCode:
      gmailPackageCode,

    packageName,

    packageAmountCents:
      params.packageAmountCents,

    durationDays:
      params.durationDays,
  };

  console.log(
    "📧 ENVIANDO EMAIL DE BIENVENIDA..."
  );

  console.log({
    gmailUrl,
    email:
      params.email,
    packageCode:
      params.packageCode,
    gmailPackageCode,
    amount:
      params.packageAmountCents,
    duration:
      params.durationDays,
  });

  const headers: Record<string, string> = {
    "Content-Type":
      "application/json",
  };

  if (internalSecret) {

    headers[
      "x-flussi-lavoro-secret"
    ] =
      internalSecret;
  }

  const response =
    await fetch(
      gmailUrl,
      {
        method: "POST",

        headers,

        body:
          JSON.stringify(payload),
      }
    );

  const responseText =
    await response.text();

  if (!response.ok) {

    throw new Error(
      `Gmail endpoint respondió ${response.status}: ${responseText.slice(
        0,
        1000
      )}`
    );
  }

  console.log(
    "✅ EMAIL DE BIENVENIDA ENVIADO"
  );

  console.log(
    responseText.slice(
      0,
      1000
    )
  );

  return {
    ok: true,
    response: responseText,
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

  if (req.method !== "POST") {

    res.setHeader(
      "Allow",
      "POST"
    );

    return res.status(405).json({
      ok: false,
      error:
        "Method not allowed",
    });
  }

  /**
   * ==========================================================
   * 2. STRIPE CONFIG
   * ==========================================================
   */

  if (!stripe) {

    console.error(
      "❌ STRIPE_SECRET_KEY NO CONFIGURADA"
    );

    return res.status(500).json({

      ok: false,

      error:
        "STRIPE_SECRET_KEY no está configurada en Vercel.",
    });
  }

  /**
   * ==========================================================
   * 3. WEBHOOK SECRETS
   * ==========================================================
   */

  const webhookSecrets =
    getWebhookSecrets();

  if (
    webhookSecrets.length === 0
  ) {

    console.error(
      "❌ NO HAY STRIPE WEBHOOK SECRET CONFIGURADO"
    );

    return res.status(500).json({

      ok: false,

      error:
        "No hay Stripe webhook secret configurado.",
    });
  }

  /**
   * ==========================================================
   * 4. STRIPE SIGNATURE
   * ==========================================================
   */

  const signatureHeader =
    req.headers[
      "stripe-signature"
    ];

  if (
    !signatureHeader ||
    Array.isArray(signatureHeader)
  ) {

    console.error(
      "❌ FALTA stripe-signature"
    );

    return res.status(400).json({

      ok: false,

      error:
        "Missing Stripe signature.",
    });
  }

  /**
   * ==========================================================
   * 5. RAW BODY
   * ==========================================================
   */

  let rawBody: Buffer;

  try {

    rawBody =
      await readRawBody(req);

  } catch (error: any) {

    console.error(
      "❌ ERROR LEYENDO RAW BODY:",
      error?.message ||
        error
    );

    return res.status(400).json({

      ok: false,

      error:
        "Could not read raw Stripe body.",
    });
  }

  if (
    !rawBody ||
    rawBody.length === 0
  ) {

    console.error(
      "❌ RAW BODY VACÍO"
    );

    return res.status(400).json({

      ok: false,

      error:
        "Empty Stripe request body.",
    });
  }

  console.log(
    "📦 Stripe raw body:",
    rawBody.length,
    "bytes"
  );

  /**
   * ==========================================================
   * 6. VERIFICAR FIRMA
   * ==========================================================
   */

  let event: Stripe.Event;
  let matchedSecretName = "";

  try {

    const verified =
      verifyStripeSignature(
        rawBody,
        signatureHeader,
        webhookSecrets
      );

    event =
      verified.event;

    matchedSecretName =
      verified.secretName;

    console.log(
      "✅ STRIPE FIRMA VERIFICADA CON:",
      matchedSecretName
    );

  } catch (error: any) {

    console.error(
      "❌ Stripe signature error:",
      error?.message ||
        error
    );

    console.error(
      "Secrets configurados:",
      webhookSecrets.map(
        (x) => x.name
      )
    );

    /**
     * NO mostramos los secrets.
     * Solo sus nombres.
     */

    return res.status(400).json({

      ok: false,

      error:
        `Webhook Error: ${
          error?.message ||
          "Invalid Stripe signature"
        }`,
    });
  }

  /**
   * ==========================================================
   * 7. EVENTO RECIBIDO
   * ==========================================================
   */

  console.log(
    "📥 FLUSSI WEBHOOK:",
    event.type,
    event.id
  );

  /**
   * ==========================================================
   * 8. SOLO checkout.session.completed
   * ==========================================================
   */

  if (
    event.type !==
    "checkout.session.completed"
  ) {

    console.log(
      "↩️ EVENTO IGNORADO:",
      event.type
    );

    return res.status(200).json({

      ok: true,

      received: true,

      ignored: true,

      event:
        event.type,
    });
  }

  /**
   * ==========================================================
   * 9. SESSION
   * ==========================================================
   */

  const session =
    event.data.object as
      Stripe.Checkout.Session;

  const metadata =
    session.metadata || {};

  /**
   * ==========================================================
   * 10. PRODUCTO / SERVICE
   * ==========================================================
   *
   * Aceptamos:
   *
   * NUEVO:
   * flussi_lavoro
   * decreto_flussi_lavoro
   *
   * ANTIGUO:
   * verificacion_decreto_flussi
   * decreto_flussi
   *
   * Así no rompemos eventos antiguos.
   */

  const service =
    clean(
      metadata.service
    );

  const product =
    clean(
      metadata.product
    );

  const isNewFlussi =
    service ===
      "flussi_lavoro" &&
    product ===
      "decreto_flussi_lavoro";

  const isOldFlussi =
    service ===
      "verificacion_decreto_flussi" &&
    (
      !product ||
      product ===
        "decreto_flussi"
    );

  if (
    !isNewFlussi &&
    !isOldFlussi
  ) {

    console.log(
      "↩️ IGNORADO: NO ES FLUSSI",
      {
        service,
        product,
      }
    );

    return res.status(200).json({

      ok: true,

      received: true,

      ignored: true,

      reason:
        "NOT_FLUSSI",

      service:
        service || null,

      product:
        product || null,
    });
  }

  /**
   * ==========================================================
   * 11. PAGO CONFIRMADO
   * ==========================================================
   */

  if (
    session.payment_status !==
    "paid"
  ) {

    console.warn(
      "⚠️ PAGO NO CONFIRMADO:",
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
   * ==========================================================
   * 12. MONEDA
   * ==========================================================
   */

  if (
    session.currency &&
    session.currency.toLowerCase() !==
      "eur"
  ) {

    console.error(
      "❌ MONEDA INCORRECTA:",
      session.currency
    );

    return res.status(400).json({

      ok: false,

      error:
        "Moneda de pago Flussi inesperada.",

      currency:
        session.currency,
    });
  }

  /**
   * ==========================================================
   * 13. PRECIO
   * ==========================================================
   *
   * Actualmente:
   *
   * all_offers = 0,50 €
   * new_10_days = 24,99 €
   *
   * Aceptamos ambos.
   *
   * También usamos package_amount_cents como referencia.
   */

  const amountTotal =
    session.amount_total;

  const allowedAmounts = [
    50,
    2499,
  ];

  if (
    typeof amountTotal ===
      "number" &&
    !allowedAmounts.includes(
      amountTotal
    )
  ) {

    console.error(
      "❌ IMPORTE FLUSSI INESPERADO:",
      amountTotal
    );

    return res.status(400).json({

      ok: false,

      error:
        "Importe de pago Flussi inesperado.",

      amount_total:
        amountTotal,

      allowed:
        allowedAmounts,
    });
  }

  /**
   * ==========================================================
   * 14. DATOS DEL CLIENTE
   * ==========================================================
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

  const firstName =
    clean(
      metadata.client_first_name
    ) ||
    clean(
      session.customer_details
        ?.name
    ).split(" ")[0];

  const lastName =
    clean(
      metadata.client_last_name
    ) ||
    clean(
      session.customer_details
        ?.name
    )
      .split(" ")
      .slice(1)
      .join(" ");

  const phone =
    clean(
      metadata.phone
    ) ||
    clean(
      session.customer_details
        ?.phone
    );

  const gender =
    clean(
      metadata.gender
    );

  const reference =
    clean(
      metadata.reference
    ) ||

    clean(
      session.client_reference_id
    ) ||

    `FLUSSI-${session.id}`;

  const packageCode =
    clean(
      metadata.package_code
    ) ||
    "all_offers";

  const packageName =
    clean(
      metadata.package_name
    ) ||

    clean(
      metadata.package_name_it
    ) ||

    packageCode;

  const packageAmountCents =
    Number(
      clean(
        metadata.package_amount_cents
      )
    ) ||
    amountTotal ||
    0;

  const durationDays =
    Number(
      clean(
        metadata.duration_days
      )
    ) ||
    (
      packageCode ===
        "new_10_days"
        ? 90
        : 30
    );

  /**
   * ==========================================================
   * 15. EMAIL OBLIGATORIO
   * ==========================================================
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

      session_id:
        session.id,
    });
  }

  /**
   * ==========================================================
   * 16. LOG COMPLETO
   * ==========================================================
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
    "Secret:",
    matchedSecretName
  );

  console.log(
    "Email:",
    email
  );

  console.log(
    "First name:",
    firstName
  );

  console.log(
    "Last name:",
    lastName
  );

  console.log(
    "Phone:",
    phone
  );

  console.log(
    "Gender:",
    gender
  );

  console.log(
    "Package:",
    packageCode
  );

  console.log(
    "Package name:",
    packageName
  );

  console.log(
    "Amount:",
    amountTotal
  );

  console.log(
    "Duration:",
    durationDays
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
    "Service:",
    service
  );

  console.log(
    "Product:",
    product
  );

  console.log(
    "Reference:",
    reference
  );

  console.log(
    "================================================"
  );

  /**
   * ==========================================================
   * 17. NUEVO FLUSSI → EMAIL GMAIL
   * ==========================================================
   */

  if (isNewFlussi) {

    try {

      const emailResult =
        await sendFlussiWelcomeEmail({

          session,

          metadata,

          firstName,

          lastName,

          email,

          phone,

          packageCode,

          packageName,

          packageAmountCents,

          durationDays,

        });

      /**
       * ======================================================
       * TODO OK
       * ======================================================
       */

      return res.status(200).json({

        ok: true,

        received: true,

        processed: true,

        product:
          "decreto_flussi_lavoro",

        service:
          "flussi_lavoro",

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

        package_code:
          packageCode,

        package_name:
          packageName,

        duration_days:
          durationDays,

        welcome_email:
          true,

        email_result:
          emailResult,

      });

    } catch (emailError: any) {

      console.error(
        "❌ ERROR ENVIANDO EMAIL GMAIL:",
        emailError?.message ||
          emailError
      );

      /**
       * MUY IMPORTANTE:
       *
       * Devolvemos 500.
       *
       * Stripe volverá a intentar el webhook.
       */
      return res.status(500).json({

        ok: false,

        error:
          emailError?.message ||
          "Error enviando email de bienvenida.",

        payment_received:
          true,

        payment_status:
          session.payment_status,

        session_id:
          session.id,

        reference,

        email,
      });
    }
  }

  /**
   * ==========================================================
   * 18. EVENTO ANTIGUO
   * ==========================================================
   *
   * No rompemos eventos antiguos.
   *
   * Si el pago pertenece al antiguo sistema,
   * intentamos usar FLUSSI_REPORT_URL.
   */

  if (isOldFlussi) {

    const reportUrl =
      clean(
        process.env.FLUSSI_REPORT_URL
      );

    if (!reportUrl) {

      console.warn(
        "⚠️ Evento antiguo Flussi recibido pero FLUSSI_REPORT_URL no está configurada."
      );

      return res.status(200).json({

        ok: true,

        received: true,

        processed: false,

        ignored: true,

        reason:
          "OLD_FLUSSI_NO_REPORT_URL",

        event_id:
          event.id,

        session_id:
          session.id,

      });
    }

    const oldPayload = {

      source:
        "stripe-webhook-flussi",

      reference,

      payment: {

        paid: true,

        sessionId:
          session.id,

        paymentStatus:
          session.payment_status,

        amountTotal:
          session.amount_total,

        currency:
          session.currency,

      },

      client: {

        name:
          `${firstName} ${lastName}`.trim(),

        email,

        country:
          clean(
            metadata.country
          ),

        whatsapp:
          clean(
            metadata.whatsapp
          ),

      },

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

      document: {

        type:
          clean(
            metadata.document_type
          ) ||
          "Documento Decreto Flussi",

        count:
          Number(
            metadata.document_count ||
              "0"
          ),

      },

      searchPersonOnly:
        clean(
          metadata.search_person_only
        ) === "true",

      flussiMetadata: {
        ...metadata,
      },

    };

    try {

      const reportResponse =
        await fetch(
          reportUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                oldPayload
              ),
          }
        );

      const reportText =
        await reportResponse.text();

      if (!reportResponse.ok) {

        throw new Error(
          `FLUSSI_REPORT_URL respondió ${reportResponse.status}: ${reportText.slice(
            0,
            1000
          )}`
        );
      }

      console.log(
        "✅ OLD FLUSSI REPORT TRIGGERED"
      );

      return res.status(200).json({

        ok: true,

        received: true,

        processed: true,

        legacy: true,

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

        report:
          reportText.slice(
            0,
            1000
          ),

      });

    } catch (reportError: any) {

      console.error(
        "❌ ERROR FLUSSI REPORT:",
        reportError?.message ||
          reportError
      );

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
  }

  /**
   * ==========================================================
   * FALLBACK
   * ==========================================================
   */

  return res.status(200).json({

    ok: true,

    received: true,

    processed: false,

    event_id:
      event.id,

  });
}
