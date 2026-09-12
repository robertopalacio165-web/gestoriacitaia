import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import nodemailer from "nodemailer";

/**
 * ============================================================
 * GESTORIACITAIA
 * STRIPE WEBHOOK - DECRETO FLUSSI
 * ============================================================
 *
 * ARCHIVO NUEVO:
 *   api/stripe-webhook-flussi.ts
 *
 * ESTE WEBHOOK ES EXCLUSIVO DE DECRETO FLUSSI.
 *
 * NO procesa:
 *   - Malta
 *   - Study Malta
 *   - otros productos
 *
 * Flujo:
 *
 * Stripe
 *   ↓
 * checkout.session.completed
 *   ↓
 * service === "verificacion_decreto_flussi"
 *   ↓
 * pago confirmado
 *   ↓
 * opcionalmente llama a FLUSSI_REPORT_URL
 *   ↓
 * email de confirmación si SMTP está configurado
 *
 * IMPORTANTE:
 * El checkout de Flussi guarda los datos principales en Stripe
 * mediante metadata. Los documentos no se guardan dentro de Stripe.
 *
 * Para generar el PDF real usando sendFlussiReport.ts:
 *
 * Vercel Environment Variable:
 *   FLUSSI_REPORT_URL=https://gestoriacitaia.com/api/sendFlussiReport
 *
 * Si FLUSSI_REPORT_URL no está configurada, el webhook NO falla:
 * solamente registra el pago y envía un email de confirmación.
 * ============================================================
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("⚠️ STRIPE_SECRET_KEY no está configurada.");
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
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
 * Leer body RAW.
 */
async function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

/**
 * Limpieza sencilla para evitar HTML no deseado en el email.
 */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Enviar email de confirmación del pago.
 *
 * Este email es independiente del PDF.
 */
async function sendPaymentEmail(params: {
  email: string;
  name: string;
  reference: string;
  sessionId: string;
}) {
  const {
    SMTP_HOST,
    SMTP_USER,
    SMTP_PASS,
    FROM_EMAIL,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    console.warn(
      "⚠️ SMTP no configurado. Se omite email de confirmación."
    );
    return {
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"GestoriaCitaIA" <${FROM_EMAIL}>`,
    to: params.email,
    subject: `🇮🇹 Pago recibido - Decreto Flussi - ${params.reference}`,
    text:
      `Hola ${params.name || "cliente"},\n\n` +
      `Hemos recibido correctamente tu pago para el servicio de verificación Decreto Flussi.\n\n` +
      `Referencia: ${params.reference}\n` +
      `ID de pago: ${params.sessionId}\n\n` +
      `GestoriaCitaIA`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>🇮🇹 GestoriaCitaIA — Decreto Flussi</h2>

        <p>Hola <b>${escapeHtml(params.name || "cliente")}</b>,</p>

        <p>
          Hemos recibido correctamente tu pago para el servicio
          de verificación Decreto Flussi.
        </p>

        <p>
          <b>Referencia:</b> ${escapeHtml(params.reference)}<br>
          <b>ID de pago:</b> ${escapeHtml(params.sessionId)}
        </p>

        <p>
          Tu solicitud ha sido registrada correctamente.
        </p>

        <p style="color:#777;font-size:13px">
          GestoriaCitaIA no es un despacho de abogados.
          El análisis documental no sustituye la verificación oficial
          de las autoridades italianas.
        </p>
      </div>
    `,
  });

  console.log(
    `📧 CONFIRMACIÓN DE PAGO ENVIADA: ${params.email}`
  );

  return {
    sent: true,
  };
}

/**
 * Enviar los datos al endpoint que genera el informe PDF.
 *
 * Se hace solamente si FLUSSI_REPORT_URL existe.
 *
 * El endpoint sendFlussiReport.ts acepta:
 *   client
 *   document
 *   worker
 *   employer
 *   contract
 *   analysis
 *   reference
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
  const reportUrl = process.env.FLUSSI_REPORT_URL;

  if (!reportUrl) {
    console.warn(
      "ℹ️ FLUSSI_REPORT_URL no configurada. No se llama al generador PDF."
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
        params.metadata.document_type ||
        "Documento Decreto Flussi",
    },

    employer: {
      name: params.metadata.employer_name || "",
      city: params.metadata.employer_city || "",
      birthDate:
        params.metadata.employer_birth_date || "",
    },

    /**
     * El checkout actual solamente tiene metadata de pago.
     * El análisis real/documentos deben ser añadidos por el
     * flujo que los procesa.
     */
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
    console.error(
      "❌ FLUSSI REPORT ERROR:",
      response.status,
      responseText
    );

    throw new Error(
      `El generador Flussi respondió ${response.status}: ${responseText.slice(
        0,
        500
      )}`
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

/**
 * ============================================================
 * HANDLER
 * ============================================================
 */
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
      error:
        "STRIPE_SECRET_KEY no está configurada en Vercel.",
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
    const signature = req.headers[
      "stripe-signature"
    ] as string | undefined;

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature) {
      console.error(
        "❌ Falta el header stripe-signature."
      );

      return res.status(400).json({
        ok: false,
        error: "Missing Stripe signature.",
      });
    }

    if (!webhookSecret) {
      console.error(
        "❌ STRIPE_WEBHOOK_SECRET no está configurado."
      );

      return res.status(500).json({
        ok: false,
        error:
          "STRIPE_WEBHOOK_SECRET no está configurado en Vercel.",
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
      "📥 FLUSSI WEBHOOK EVENT:",
      event.type,
      event.id
    );

    /**
     * 3. Solo nos interesa checkout.session.completed
     */
    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({
        ok: true,
        ignored: true,
        event: event.type,
      });
    }

    const session =
      event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};

    console.log(
      "🇮🇹 FLUSSI SESSION:",
      session.id
    );

    console.log(
      "🇮🇹 FLUSSI METADATA:",
      metadata
    );

    /**
     * 4. SEGURIDAD:
     * SOLO Decreto Flussi.
     *
     * Esto evita tocar Malta.
     */
    if (
      metadata.service !==
      "verificacion_decreto_flussi"
    ) {
      console.log(
        "↩️ Evento ignorado. No es Decreto Flussi:",
        metadata.service
      );

      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "NOT_FLUSSI",
        service: metadata.service || null,
      });
    }

    /**
     * 5. Confirmar que realmente está pagado.
     */
    if (
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      console.warn(
        "⚠️ Checkout completado pero payment_status no es paid:",
        session.payment_status
      );

      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "PAYMENT_NOT_CONFIRMED",
        payment_status: session.payment_status,
      });
    }

    /**
     * 6. Recuperar datos.
     *
     * El checkout actual utiliza estos nombres de metadata.
     */
    const email = String(
      metadata.email ||
        session.customer_details?.email ||
        session.customer_email ||
        ""
    )
      .trim()
      .toLowerCase();

    const name =
      `${metadata.client_name || ""} ${
        metadata.client_surname || ""
      }`.trim() ||
      String(
        session.customer_details?.name || ""
      ).trim();

    const country =
      String(metadata.country || "").trim();

    const whatsapp =
      String(metadata.whatsapp || "").trim();

    const reference =
      String(
        metadata.reference ||
          session.client_reference_id ||
          ""
      ).trim() ||
      `FLUSSI-${session.id}`;

    if (!email) {
      console.error(
        "❌ Pago Flussi sin email:",
        session.id
      );

      return res.status(400).json({
        ok: false,
        error:
          "El pago fue recibido pero no se encontró el email del cliente.",
      });
    }

    /**
     * 7. Logs claros.
     */
    console.log(
      "================================================"
    );
    console.log(
      "🇮🇹 DECRETO FLUSSI — PAGO CONFIRMADO"
    );
    console.log(
      "================================================"
    );
    console.log("Session:", session.id);
    console.log("Email:", email);
    console.log("Nombre:", name);
    console.log("Referencia:", reference);
    console.log("Amount:", session.amount_total);
    console.log("Currency:", session.currency);
    console.log("Payment:", session.payment_status);
    console.log(
      "================================================"
    );

    /**
     * 8. Email de confirmación.
     */
    let confirmationEmail = {
      sent: false,
      reason: "NOT_EXECUTED",
    } as any;

    try {
      confirmationEmail =
        await sendPaymentEmail({
          email,
          name,
          reference,
          sessionId: session.id,
        });
    } catch (emailError: any) {
      /**
       * No hacemos fallar todo el webhook por un problema
       * puntual de SMTP.
       */
      console.error(
        "❌ ERROR EMAIL CONFIRMACIÓN:",
        emailError?.message || emailError
      );
    }

    /**
     * 9. Lanzar generación del informe si está configurada.
     *
     * No es obligatorio para confirmar el pago.
     */
    let reportResult: any = {
      triggered: false,
      reason: "NOT_EXECUTED",
    };

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
      /**
       * El pago ya está confirmado.
       * Registramos el error para poder arreglarlo sin
       * perder la confirmación del pago.
       */
      console.error(
        "❌ ERROR GENERANDO REPORTE FLUSSI:",
        reportError?.message || reportError
      );

      reportResult = {
        triggered: false,
        error:
          reportError?.message ||
          "Error llamando al generador del informe.",
      };
    }

    /**
     * 10. RESPUESTA A STRIPE
     */
    return res.status(200).json({
      ok: true,
      received: true,
      processed: true,
      service: "verificacion_decreto_flussi",

      payment: {
        paid: true,
        session_id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      },

      client: {
        name,
        email,
        country,
        whatsapp,
      },

      reference,

      confirmation_email: confirmationEmail,

      report: reportResult,
    });
  } catch (error: any) {
    console.error(
      "❌ FLUSSI WEBHOOK FATAL ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Internal server error.",
    });
  }
}
