import Stripe from "stripe";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

import {
  sendEstudiaMaltaEmail,
} from "./gmailSendEstudiaMalta";

import {
  sendEstudiaMaltaEscuelaEmail,
} from "./gmailSendEstudiaMaltaEscuela";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const signature =
    req.headers["stripe-signature"] as string;

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET;

  if (!webhookSecret) {
    console.error(
      "❌ STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET no configurado"
    );

    return res.status(500).json({
      error:
        "Study Malta webhook secret not configured",
    });
  }

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

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error: any) {
    console.error(
      "❌ Error verificando webhook:",
      error.message
    );

    return res.status(400).json({
      error:
        `Webhook Error: ${error.message}`,
    });
  }

  // ==========================================
  // SOLO CHECKOUT COMPLETADO
  // ==========================================

  if (
    event.type !==
    "checkout.session.completed"
  ) {
    return res.status(200).json({
      received: true,
    });
  }

  const session =
    event.data.object as Stripe.Checkout.Session;

  const metadata =
    session.metadata || {};

  console.log(
    "======================================"
  );
  console.log(
    "🇲🇹 ESTUDIAR MALTA 2027"
  );
  console.log(
    "Evento:",
    event.type
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
    "======================================"
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
    });
  }

  // ==========================================
  // CONFIRMAR PAGO REAL
  // ==========================================

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    console.log(
      "⏭️ Pago todavía no confirmado:",
      session.payment_status
    );

    return res.status(200).json({
      received: true,
      service: "study_malta_2027",
      paid: false,
      ignored: true,
      reason: "PAYMENT_NOT_CONFIRMED",
    });
  }

  // ==========================================
  // DATOS DEL CLIENTE
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

  // ==========================================
  // DATOS COMPLETOS PARA LA ESCUELA
  //
  // IMPORTANTE:
  // NO seleccionamos solo 6 campos.
  // Pasamos TODA la metadata de Stripe.
  // ==========================================

  const schoolFormData: Record<string, unknown> = {
    ...metadata,

    // Aseguramos estos datos aunque Stripe
    // los haya devuelto de otra forma.
    fullName,
    email,
    whatsapp,

    stripe_session_id:
      session.id,

    stripe_customer_id:
      typeof session.customer === "string"
        ? session.customer
        : "",

    payment_status:
      session.payment_status,
  };

  console.log(
    "📋 Campos enviados al email de la escuela:",
    Object.keys(schoolFormData)
      .filter(
        (key) =>
          ![
            "stripe_session_id",
            "stripe_customer_id",
          ].includes(key)
      )
  );

  // ==========================================
  // ACTUALIZAR SUPABASE
  // ==========================================

  const {
    data: updatedApplication,
    error: updateError,
  } = await supabase
    .from("estudiar_malta")
    .update({
      paid: true,
      status: "paid",

      stripe_customer_id:
        typeof session.customer === "string"
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
      "❌ ERROR ACTUALIZANDO estudiar_malta:",
      updateError
    );
  } else {
    console.log(
      "✅ Solicitud actualizada en Supabase:",
      updatedApplication?.id
    );
  }

  // ==========================================
  // 1️⃣ EMAIL DEL CLIENTE
  //
  // NO CAMBIAMOS SU FUNCIÓN.
  // Sigue recibiendo exactamente los mismos
  // 6 campos y su PDF original.
  // ==========================================

  let clientEmailSent = false;

  try {
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

    clientEmailSent = true;

    console.log(
      "✅ EMAIL CLIENTE + PDF CLIENTE ENVIADOS"
    );

  } catch (emailError) {
    console.error(
      "❌ ERROR EMAIL CLIENTE/PDF CLIENTE:",
      emailError
    );
  }

  // ==========================================
  // 2️⃣ EMAIL DE LA ESCUELA
  //
  // ARCHIVO SEPARADO:
  // gmailSendEstudiaMaltaEscuela.ts
  //
  // Recibe TODOS los datos.
  // Genera SU PROPIO PDF.
  // ==========================================

  let schoolEmailSent = false;

  try {
    const schoolResult =
      await sendEstudiaMaltaEscuelaEmail(
        schoolFormData
      );

    schoolEmailSent = true;

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

  } catch (schoolEmailError) {
    console.error(
      "❌ ERROR EMAIL ESCUELA/PDF ESCUELA:",
      schoolEmailError
    );
  }

  // ==========================================
  // RESULTADO FINAL
  // ==========================================

  console.log(
    "======================================"
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
    updateError ? "ERROR" : "OK"
  );
  console.log(
    "📧 Cliente:",
    clientEmailSent ? "ENVIADO" : "ERROR"
  );
  console.log(
    "🏫 Escuela:",
    schoolEmailSent ? "ENVIADO" : "ERROR"
  );
  console.log(
    "======================================"
  );

  // Stripe necesita 2xx para considerar
  // recibido el evento.
  //
  // Aunque un email falle, no devolvemos 500:
  // el pago ya está confirmado y no queremos
  // provocar reintentos que puedan duplicar emails.
  return res.status(200).json({
    received: true,
    service: "study_malta_2027",
    paid: true,

    supabaseUpdated:
      !updateError,

    clientEmailSent,
    schoolEmailSent,

    email,
    name: fullName,
    sessionId: session.id,
  });
}

// ==========================================
// RAW BODY PARA STRIPE
// ==========================================

async function getRawBody(
  req: VercelRequest
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      let body = "";

      req.on(
        "data",
        (chunk: Buffer) => {
          body += chunk.toString();
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
        (error) => {
          reject(error);
        }
      );
    }
  );
}
