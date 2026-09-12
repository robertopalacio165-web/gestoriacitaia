import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import nodemailer from "nodemailer";

/**
 * GESTORIACITAIA
 * STRIPE WEBHOOK - DECRETO FLUSSI
 *
 * URL:
 *   https://www.gestoriacitaia.com/api/stripe-webhook-flussi
 *
 * SOLO procesa:
 *   metadata.service === "verificacion_decreto_flussi"
 *
 * NO toca Malta ni Study Malta.
 *
 * EMAIL:
 *   Brevo SMTP
 *   Host: smtp-relay.brevo.com
 *   Port: 587
 *   TLS: STARTTLS
 *
 * Vercel ENV:
 *   STRIPE_SECRET_KEY
 *   FLUSSI_STRIPE_WEBHOOK_SECRET
 *
 * Brevo:
 *   BREVO_SMTP_USER   = Login SMTP de Brevo
 *   BREVO_SMTP_KEY    = SMTP key de Brevo (NO API key)
 *   BREVO_FROM_EMAIL  = remitente verificado en Brevo
 *   BREVO_FROM_NAME   = GestoriaCitaIA
 *   BREVO_REPLY_TO    = opcional
 *
 * Compatibilidad:
 *   También acepta SMTP_USER / SMTP_PASS / FROM_EMAIL
 *   si ya existen en Vercel.
 *
 * Opcional:
 *   FLUSSI_REPORT_URL
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

/**
 * Stripe necesita el body RAW para verificar la firma.
 */
async function readRawBody(req: VercelRequest): Promise<Buffer> {
  // Algunas configuraciones de Vercel pueden entregar req.body directamente.
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
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      );
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Configuración Brevo SMTP.
 *
 * Brevo recomienda:
 *   smtp-relay.brevo.com
 *   port 587
 *   secure false (STARTTLS)
 *
 * La contraseña debe ser una SMTP key, no una API key.
 */
function getBrevoTransporter() {
  const user =
    process.env.BREVO_SMTP_USER ||
    process.env.SMTP_USER ||
    "";

  const pass =
    process.env.BREVO_SMTP_KEY ||
    process.env.SMTP_PASS ||
    "";

  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "";

  const fromName =
    process.env.BREVO_FROM_NAME ||
    "GestoriaCitaIA";

  const replyTo =
    process.env.BREVO_REPLY_TO ||
    "";

  if (!user || !pass || !fromEmail) {
    return {
      configured: false as const,
      missing: {
        BREVO_SMTP_USER: !user,
        BREVO_SMTP_KEY: !pass,
        BREVO_FROM_EMAIL: !fromEmail,
      },
    };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  return {
    configured: true as const,
    transporter,
    fromEmail,
    fromName,
    replyTo,
  };
}

/**
 * Envía el email al cliente después de confirmar el pago.
 */
async function sendPaymentEmail(params: {
  email: string;
  name: string;
  reference: string;
  sessionId: string;
  amountTotal: number | null;
  currency: string | null;
}) {
  const brevo = getBrevoTransporter();

  if (!brevo.configured) {
    console.error(
      "❌ BREVO SMTP NO CONFIGURADO:",
      brevo.missing
    );

    throw new Error(
      "Brevo SMTP no está configurado. Faltan BREVO_SMTP_USER, BREVO_SMTP_KEY o BREVO_FROM_EMAIL."
    );
  }

  const amount =
    typeof params.amountTotal === "number"
      ? `${(params.amountTotal / 100).toFixed(2)} ${(params.currency || "eur").toUpperCase()}`
      : "0.50 EUR";

  const safeName = params.name || "cliente";

  const mail = {
    from: `"${brevo.fromName}" <${brevo.fromEmail}>`,
    to: params.email,
    ...(brevo.replyTo
      ? {
          replyTo: `"${brevo.fromName}" <${brevo.replyTo}>`,
        }
      : {}),
    subject: `Pago recibido — Decreto Flussi — ${params.reference}`,
    text:
      `Hola ${safeName},\n\n` +
      `Hemos recibido correctamente tu pago para el servicio de verificación Decreto Flussi.\n\n` +
      `Importe: ${amount}\n` +
      `Referencia: ${params.reference}\n` +
      `ID de pago: ${params.sessionId}\n\n` +
      `Tu solicitud ha sido registrada correctamente.\n\n` +
      `GestoriaCitaIA\n`,
    html: `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111;">
          <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:14px;padding:30px;box-sizing:border-box;">
            <h2 style="margin-top:0;">GestoriaCitaIA — Decreto Flussi</h2>

            <p>Hola <strong>${escapeHtml(safeName)}</strong>,</p>

            <p>
              Hemos recibido correctamente tu pago para el servicio
              de verificación <strong>Decreto Flussi</strong>.
            </p>

            <div style="background:#f6f6f6;border-radius:10px;padding:18px;margin:20px 0;">
              <p style="margin:0 0 8px;"><strong>Importe:</strong> ${escapeHtml(amount)}</p>
              <p style="margin:0 0 8px;"><strong>Referencia:</strong> ${escapeHtml(params.reference)}</p>
              <p style="margin:0;"><strong>ID de pago:</strong> ${escapeHtml(params.sessionId)}</p>
            </div>

            <p>
              Tu solicitud ha sido registrada correctamente.
            </p>

            <p style="color:#777;font-size:12px;line-height:1.5;margin-top:28px;">
              GestoriaCitaIA no es un despacho de abogados.
              El servicio de verificación no sustituye la comprobación
              oficial ante las autoridades italianas.
            </p>
          </div>
        </body>
      </html>
    `,
  };

  const info = await brevo.transporter.sendMail(mail);

  console.log("📧 BREVO EMAIL ENVIADO:", {
    to: params.email,
    messageId: info.messageId,
    response: info.response,
  });

  return {
    sent: true,
    messageId: info.messageId,
  };
}

/**
 * Opcional: llama al generador de informe Flussi.
 *
 * IMPORTANTE:
 * El checkout actual guarda los datos principales en Stripe metadata.
 * Los documentos reales no están dentro de este webhook.
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
  const reportUrl = clean(process.env.FLUSSI_REPORT_URL);

  if (!reportUrl) {
    console.log(
      "ℹ️ FLUSSI_REPORT_URL no configurada. Se continúa sin PDF."
    );

    return {
      triggered: false,
      reason: "FLUSSI_REPORT_URL_NOT_CONFIGURED",
    };
  }

  const payload = {
    source: "stripe-webhook-flussi",
    reference: params.reference,

    payment: {
      paid: true,
      sessionId: params.session.id,
      paymentStatus: params.session.payment_status,
      amountTotal: params.session.amount_total,
      currency: params.session.currency,
    },

    client: {
      name: params.name,
      email: params.email,
      country: params.country,
      whatsapp: params.whatsapp,
    },

    document: {
      type:
        clean(params.metadata.document_type) ||
        "Documento Decreto Flussi",
    },

    employer: {
      name: clean(params.metadata.employer_name),
      city: clean(params.metadata.employer_city),
      birthDate: clean(params.metadata.employer_birth_date),
    },

    analysis: {
      status: "PAGO CONFIRMADO - REQUIERE ANÁLISIS",
      risk: "NO DETERMINADO",
      summary:
        "El pago del servicio Decreto Flussi ha sido confirmado. " +
        "El análisis documental debe realizarse con los documentos " +
        "recibidos por el flujo de verificación.",
      recommendation:
        "No tomar una decisión definitiva sin verificación oficial.",
      source: "Stripe Webhook",
    },
  };

  const response = await fetch(reportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `FLUSSI_REPORT_URL respondió ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  console.log(
    "✅ FLUSSI REPORT TRIGGERED:",
    responseText.slice(0, 500)
  );

  return {
    triggered: true,
    response: responseText,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      error: "STRIPE_SECRET_KEY no está configurada en Vercel.",
    });
  }

  const webhookSecret = clean(
    process.env.FLUSSI_STRIPE_WEBHOOK_SECRET
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
     * 1. BODY RAW
     */
    const rawBody = await readRawBody(req);

    /**
     * 2. FIRMA STRIPE
     */
    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({
        ok: false,
        error: "Missing Stripe signature.",
      });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
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
        error: `Webhook Error: ${error?.message || "Invalid signature"}`,
      });
    }

    console.log(
      "📥 FLUSSI WEBHOOK:",
      event.type,
      event.id
    );

    /**
     * 3. SOLO checkout.session.completed
     */
    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        event: event.type,
      });
    }

    const session =
      event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};

    /**
     * 4. SEGURIDAD:
     * SOLO Decreto Flussi.
     *
     * Malta queda fuera.
     */
    if (
      metadata.service !==
      "verificacion_decreto_flussi"
    ) {
      console.log(
        "↩️ Ignorado: no es Decreto Flussi.",
        metadata.service
      );

      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        reason: "NOT_FLUSSI",
        service: metadata.service || null,
      });
    }

    /**
     * 5. Confirmar pago real.
     */
    if (session.payment_status !== "paid") {
      console.warn(
        "⚠️ Flussi recibido pero payment_status no es paid:",
        session.payment_status
      );

      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        reason: "PAYMENT_NOT_CONFIRMED",
        payment_status: session.payment_status,
      });
    }

    /**
     * 6. Validación adicional del producto/precio.
     */
    const product = clean(metadata.product);

    if (
      product &&
      product !== "decreto_flussi"
    ) {
      console.log(
        "↩️ Ignorado: metadata.product no es decreto_flussi:",
        product
      );

      return res.status(200).json({
        ok: true,
        received: true,
        ignored: true,
        reason: "NOT_FLUSSI_PRODUCT",
        product,
      });
    }

    if (
      typeof session.amount_total === "number" &&
      session.amount_total !== 50
    ) {
      console.error(
        "❌ Importe Flussi inesperado:",
        session.amount_total
      );

      return res.status(400).json({
        ok: false,
        error: "Importe de pago Flussi inesperado.",
        amount_total: session.amount_total,
      });
    }

    if (
      session.currency &&
      session.currency.toLowerCase() !== "eur"
    ) {
      return res.status(400).json({
        ok: false,
        error: "Moneda de pago Flussi inesperada.",
        currency: session.currency,
      });
    }

    /**
     * 7. Datos del cliente.
     */
    const email = (
      clean(metadata.email) ||
      clean(session.customer_details?.email) ||
      clean(session.customer_email)
    ).toLowerCase();

    const name =
      `${clean(metadata.client_name)} ${clean(
        metadata.client_surname
      )}`.trim() ||
      clean(session.customer_details?.name);

    const country = clean(metadata.country);
    const whatsapp = clean(metadata.whatsapp);

    const reference =
      clean(metadata.reference) ||
      clean(session.client_reference_id) ||
      `FLUSSI-${session.id}`;

    if (!email) {
      console.error(
        "❌ Pago Flussi sin email:",
        session.id
      );

      return res.status(400).json({
        ok: false,
        error:
          "Pago recibido pero no se encontró el email del cliente.",
      });
    }

    console.log("==============================================");
    console.log("🇮🇹 DECRETO FLUSSI — PAGO CONFIRMADO");
    console.log("Session:", session.id);
    console.log("Event:", event.id);
    console.log("Email:", email);
    console.log("Nombre:", name);
    console.log("Referencia:", reference);
    console.log("Amount:", session.amount_total);
    console.log("Currency:", session.currency);
    console.log("Payment:", session.payment_status);
    console.log("==============================================");

    /**
     * 8. Email Brevo.
     *
     * Si Brevo falla, devolvemos 500 para que Stripe pueda
     * volver a intentar la entrega del webhook.
     */
    const emailResult = await sendPaymentEmail({
      email,
      name,
      reference,
      sessionId: session.id,
      amountTotal: session.amount_total,
      currency: session.currency,
    });

    /**
     * 9. Informe opcional.
     *
     * Si el generador falla, no bloqueamos el pago ni el email.
     */
    let reportResult: unknown = {
      triggered: false,
      reason: "NOT_REQUESTED",
    };

    try {
      reportResult = await triggerFlussiReport({
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
        "⚠️ ERROR GENERANDO INFORME FLUSSI:",
        reportError?.message || reportError
      );

      reportResult = {
        triggered: false,
        error:
          reportError?.message ||
          "Error desconocido generando informe",
      };
    }

    return res.status(200).json({
      ok: true,
      received: true,
      processed: true,
      product: "decreto_flussi",
      service: "verificacion_decreto_flussi",
      event_id: event.id,
      session_id: session.id,
      payment_status: session.payment_status,
      reference,
      email: emailResult,
      report: reportResult,
    });
  } catch (error: any) {
    console.error(
      "❌ FLUSSI WEBHOOK ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Internal webhook error",
    });
  }
}
