import Stripe from "stripe";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

import {
  sendEstudiaMaltaEmail,
} from "./gmailSendEstudiaMalta.js";

import {
  sendEstudiaMaltaEscuelaEmail,
} from "./gmailSendEstudiaMaltaEscuela.js";

// ==========================================
// STRIPE
// ==========================================

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

// ==========================================
// SUPABASE
// ==========================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// ==========================================
// VERCEL
// ==========================================

export const config = {
  api: {
    bodyParser: false,
  },
};

// ==========================================
// WEBHOOK HANDLER
// ==========================================

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "🇲🇹 STRIPE WEBHOOK — ESTUDIAR MALTA 2027"
  );
  console.log(
    "=========================================="
  );

  // ==========================================
  // SOLO POST
  // ==========================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  // ==========================================
  // STRIPE SIGNATURE
  // ==========================================

  const signature =
    req.headers["stripe-signature"] as
      | string
      | undefined;

  if (!signature) {
    console.error(
      "❌ Falta stripe-signature"
    );

    return res.status(400).json({
      error: "Missing Stripe signature",
    });
  }

  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET;

  if (!webhookSecret) {
    console.error(
      "❌ STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET NO CONFIGURADO"
    );

    return res.status(500).json({
      error:
        "Study Malta webhook secret not configured",
    });
  }

  // ==========================================
  // RAW BODY
  // ==========================================

  let rawBody: string;

  try {
    rawBody = await getRawBody(req);
  } catch (error) {
    console.error(
      "❌ Error leyendo RAW body:",
      error
    );

    return res.status(400).json({
      error: "Could not read webhook body",
    });
  }

  if (!rawBody) {
    console.error(
      "❌ RAW BODY VACÍO"
    );

    return res.status(400).json({
      error: "Empty webhook body",
    });
  }

  // ==========================================
  // VERIFICAR WEBHOOK STRIPE
  // ==========================================

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
      "❌ ERROR VERIFICANDO WEBHOOK STRIPE:"
    );

    console.error(
      error?.message || error
    );

    return res.status(400).json({
      error:
        `Webhook Error: ${
          error?.message ||
          "Invalid signature"
        }`,
    });
  }

  console.log(
    "✅ Firma Stripe verificada"
  );

  console.log(
    "Event ID:",
    event.id
  );

  console.log(
    "Event type:",
    event.type
  );

  // ==========================================
  // SOLO checkout.session.completed
  // ==========================================

  if (
    event.type !==
    "checkout.session.completed"
  ) {
    console.log(
      "⏭️ Evento ignorado:",
      event.type
    );

    return res.status(200).json({
      received: true,
      ignored: true,
      reason: "NOT_CHECKOUT_COMPLETED",
    });
  }

  // ==========================================
  // STRIPE SESSION
  // ==========================================

  const session =
    event.data.object as
      Stripe.Checkout.Session;

  const metadata =
    session.metadata || {};

  console.log(
    "=========================================="
  );

  console.log(
    "🇲🇹 ESTUDIAR MALTA 2027"
  );

  console.log(
    "Session:",
    session.id
  );

  console.log(
    "Service:",
    metadata.service
  );

  console.log(
    "Payment status:",
    session.payment_status
  );

  console.log(
    "Amount total:",
    session.amount_total
  );

  console.log(
    "Currency:",
    session.currency
  );

  console.log(
    "=========================================="
  );

  // ==========================================
  // SOLO STUDY MALTA 2027
  // ==========================================

  if (
    metadata.service !==
    "study_malta_2027"
  ) {
    console.log(
      "⏭️ Evento ignorado: no es Study Malta 2027"
    );

    return res.status(200).json({
      received: true,
      ignored: true,
      reason:
        "NOT_STUDY_MALTA_2027",
    });
  }

  console.log(
    "✅ Servicio correcto: study_malta_2027"
  );

  // ==========================================
  // CONFIRMAR PAGO
  // ==========================================

  if (
    session.payment_status !== "paid" &&
    session.payment_status !==
      "no_payment_required"
  ) {
    console.log(
      "⏭️ Pago todavía no confirmado:",
      session.payment_status
    );

    return res.status(200).json({
      received: true,
      service:
        "study_malta_2027",
      paid: false,
      ignored: true,
      reason:
        "PAYMENT_NOT_CONFIRMED",
    });
  }

  console.log(
    "💰 PAGO CONFIRMADO"
  );

  // ==========================================
  // DATOS PRINCIPALES
  // ==========================================

  const fullName =
    metadata.fullName || "";

  const whatsapp =
    metadata.whatsapp || "";

  const email =
    metadata.email ||
    session.customer_details?.email ||
    "";

  if (!email) {
    console.error(
      "❌ No existe email del cliente"
    );

    return res.status(400).json({
      error:
        "No customer email found",
    });
  }

  console.log(
    "👤 Cliente:",
    fullName
  );

  console.log(
    "📧 Email:",
    email
  );

  console.log(
    "📱 WhatsApp:",
    whatsapp
  );

  // ==========================================
  // DATOS COMPLETOS PARA LA ESCUELA
  // ==========================================
  //
  // Pasamos TODA la metadata de Stripe.
  //
  // ==========================================

  const schoolFormData:
    Record<string, unknown> = {
    ...metadata,

    fullName,
    email,
    whatsapp,

    stripe_session_id:
      session.id,

    stripe_customer_id:
      typeof session.customer ===
      "string"
        ? session.customer
        : "",

    payment_status:
      session.payment_status,

    amount_total:
      session.amount_total,

    currency:
      session.currency,
  };

  console.log(
    "📋 Campos enviados al email de la escuela:"
  );

  console.log(
    Object.keys(schoolFormData)
  );

  // ==========================================
  // ACTUALIZAR SUPABASE
  // ==========================================

  console.log(
    "💾 Actualizando estudiar_malta..."
  );

  const {
    data: updatedApplication,
    error: updateError,
  } = await supabase
    .from("estudiar_malta")
    .update({
      paid: true,
      status: "paid",

      stripe_customer_id:
        typeof session.customer ===
        "string"
          ? session.customer
          : null,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "stripe_session_id",
      session.id
    )
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error(
      "❌ ERROR ACTUALIZANDO estudiar_malta:"
    );

    console.error(
      updateError
    );
  } else {
    console.log(
      "✅ Solicitud actualizada en Supabase:",
      updatedApplication?.id
    );
  }

  // ==========================================
  // 1️⃣ EMAIL CLIENTE
  // ==========================================

  let clientEmailSent =
    false;

  try {
    console.log(
      "📧 Enviando email al cliente..."
    );

    await sendEstudiaMaltaEmail({
      email,
      name: fullName,
      whatsapp,

      dateOfBirth:
        metadata.dateOfBirth || "",

      nationality:
        metadata.nationality || "",

      passportNumber:
        metadata.passportNumber || "",

      pdfUrl:
        metadata.pdfUrl || "",
    });

    clientEmailSent =
      true;

    console.log(
      "✅ EMAIL CLIENTE + PDF CLIENTE ENVIADOS"
    );

  } catch (emailError) {
    console.error(
      "❌ ERROR EMAIL CLIENTE/PDF CLIENTE:"
    );

    console.error(
      emailError
    );
  }

  // ==========================================
  // 2️⃣ EMAIL ESCUELA
  // ==========================================

  let schoolEmailSent =
    false;

  try {
    console.log(
      "🏫 Enviando email a escuela..."
    );

    const schoolResult =
      await sendEstudiaMaltaEscuelaEmail(
        schoolFormData
      );

    schoolEmailSent =
      true;

    console.log(
      "✅ EMAIL ESCUELA + PDF ESCUELA ENVIADOS"
    );

    console.log(
      "🏫 Destino escuela:",
      schoolResult.schoolEmail
    );

    console.log(
      "📄 PDF escuela:",
      schoolResult.pdfFileName
    );

  } catch (
    schoolEmailError
  ) {
    console.error(
      "❌ ERROR EMAIL ESCUELA/PDF ESCUELA:"
    );

    console.error(
      schoolEmailError
    );
  }

  // ==========================================
  // RESULTADO FINAL
  // ==========================================

  console.log(
    "=========================================="
  );

  console.log(
    "🇲🇹 ESTUDIAR MALTA 2027 FINALIZADO"
  );

  console.log(
    "💰 Pago confirmado:",
    session.payment_status
  );

  console.log(
    "💾 Supabase:",
    updateError
      ? "ERROR"
      : "OK"
  );

  console.log(
    "📧 Cliente:",
    clientEmailSent
      ? "ENVIADO"
      : "ERROR"
  );

  console.log(
    "🏫 Escuela:",
    schoolEmailSent
      ? "ENVIADO"
      : "ERROR"
  );

  console.log(
    "=========================================="
  );

  // ==========================================
  // RESPUESTA A STRIPE
  // ==========================================
  //
  // IMPORTANTE:
  // Aunque un email falle, devolvemos 200.
  // El pago ya está confirmado.
  //
  // ==========================================

  return res.status(200).json({
    received: true,

    service:
      "study_malta_2027",

    paid: true,

    supabaseUpdated:
      !updateError,

    applicationId:
      updatedApplication?.id ||
      null,

    clientEmailSent,

    schoolEmailSent,

    email,

    name:
      fullName,

    sessionId:
      session.id,
  });
}

// ==========================================
// RAW BODY PARA STRIPE
// ==========================================

async function getRawBody(
  req: VercelRequest
): Promise<string> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      let body = "";

      req.on(
        "data",
        (
          chunk: Buffer
        ) => {
          body +=
            chunk.toString();
        }
      );

      req.on(
        "end",
        () => {
          resolve(body);
        }
      );

      req.on(
        "error",
        (
          error
        ) => {
          reject(error);
        }
      );
    }
  );
}

// ==========================================
// EXPORT VERCEL
// ==========================================
//
// IMPORTANTE:
// NO usar:
// export default async function handler()
//
// Usamos:
// export default handler;
//
// ==========================================

export default handler;
