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

  // ==========================================
  // VERIFICAR EVENTO STRIPE
  // ==========================================

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
  // SOLO CHECKOUT COMPLETED
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
    });
  }

  // ==========================================
  // SESSION
  // ==========================================

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
    session.payment_status !==
      "no_payment_required"
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
      reason:
        "PAYMENT_NOT_CONFIRMED",
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

  const dateOfBirth =
    metadata.dateOfBirth || "";

  const nationality =
    metadata.nationality || "";

  const passportNumber =
    metadata.passportNumber || "";

  const pdfUrl =
    metadata.pdfUrl || "";

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
    "👤 Nombre:",
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
  // DATOS COMPLETOS PARA ESCUELA
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

    stripe_payment_intent:
      typeof session.payment_intent ===
      "string"
        ? session.payment_intent
        : "",

    payment_status:
      session.payment_status,
  };

  console.log(
    "📋 Campos enviados al email de la escuela:"
  );

  console.log(
    Object.keys(
      schoolFormData
    ).filter(
      (key) =>
        ![
          "stripe_session_id",
          "stripe_customer_id",
          "stripe_payment_intent",
        ].includes(key)
    )
  );

  // ==========================================
  // SUPABASE
  // ==========================================
  // BUSCAR PRIMERO POR STRIPE SESSION
  // ==========================================

  const {
    data: existingApplication,
    error: findError,
  } = await supabase
    .from("estudiar_malta")
    .select("id")
    .eq(
      "stripe_session_id",
      session.id
    )
    .maybeSingle();

  if (findError) {
    console.error(
      "❌ ERROR BUSCANDO estudiar_malta:",
      findError
    );
  }

  let applicationId:
    | string
    | null = null;

  let supabaseOperation:
    | "updated"
    | "inserted"
    | "error" = "error";

  // ==========================================
  // SI YA EXISTE
  // ==========================================

  if (existingApplication) {
    applicationId =
      existingApplication.id;

    console.log(
      "🔄 Registro existente:",
      applicationId
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
        "id",
        applicationId
      )
      .select("id")
      .single();

    if (updateError) {
      console.error(
        "❌ ERROR ACTUALIZANDO estudiar_malta:",
        updateError
      );
    } else {
      applicationId =
        updatedApplication.id;

      supabaseOperation =
        "updated";

      console.log(
        "✅ estudiar_malta actualizado:",
        applicationId
      );
    }
  }

  // ==========================================
  // SI NO EXISTE -> INSERTAR
  // ==========================================

  else {
    console.log(
      "🆕 No existe registro para esta sesión."
    );

    console.log(
      "📝 Creando registro en estudiar_malta..."
    );

    /*
     * IMPORTANTE:
     *
     * Usamos los campos principales que
     * conocemos que pertenecen al flujo.
     *
     * Los datos completos siguen estando
     * disponibles en metadata y se envían
     * a la escuela.
     */

    const insertData: Record<
      string,
      unknown
    > = {
      full_name:
        fullName,

      email:
        email,

      whatsapp:
        whatsapp,

      date_of_birth:
        dateOfBirth || null,

      nationality:
        nationality || null,

      passport_number:
        passportNumber || null,

      pdf_url:
        pdfUrl || null,

      stripe_session_id:
        session.id,

      stripe_customer_id:
        typeof session.customer ===
        "string"
          ? session.customer
          : null,

      paid:
        true,

      status:
        "paid",

      created_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    };

    const {
      data: newApplication,
      error: insertError,
    } = await supabase
      .from("estudiar_malta")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError) {
      console.error(
        "❌ ERROR INSERTANDO estudiar_malta:"
      );

      console.error(
        JSON.stringify(
          insertError,
          null,
          2
        )
      );

      /*
       * NO detenemos los emails aquí.
       *
       * El pago ya está confirmado.
       * Continuamos para que el cliente
       * y la escuela reciban la información.
       */

    } else {
      applicationId =
        newApplication.id;

      supabaseOperation =
        "inserted";

      console.log(
        "✅ NUEVO registro creado en estudiar_malta:",
        applicationId
      );
    }
  }

  // ==========================================
  // 1️⃣ EMAIL DEL CLIENTE
  // ==========================================

  let clientEmailSent =
    false;

  try {
    await sendEstudiaMaltaEmail({
      email,

      name:
        fullName,

      whatsapp,

      dateOfBirth:
        dateOfBirth,

      nationality:
        nationality,

      passportNumber:
        passportNumber,

      pdfUrl:
        pdfUrl,
    });

    clientEmailSent =
      true;

    console.log(
      "======================================"
    );

    console.log(
      "✅ EMAIL CLIENTE ENVIADO"
    );

    console.log(
      "📧 Destino:",
      email
    );

    console.log(
      "📄 PDF ORIGINAL DEL CLIENTE ENVIADO"
    );

    console.log(
      "======================================"
    );
  } catch (emailError) {
    console.error(
      "❌ ERROR EMAIL CLIENTE/PDF CLIENTE:",
      emailError
    );
  }

  // ==========================================
  // 2️⃣ EMAIL DE LA ESCUELA
  // ==========================================

  let schoolEmailSent =
    false;

  try {
    const schoolResult =
      await sendEstudiaMaltaEscuelaEmail(
        schoolFormData
      );

    schoolEmailSent =
      true;

    console.log(
      "======================================"
    );

    console.log(
      "✅ EMAIL ESCUELA ENVIADO"
    );

    console.log(
      "🏫 Destino escuela:",
      schoolResult.schoolEmail
    );

    console.log(
      "📄 PDF escuela:",
      schoolResult.pdfFileName
    );

    console.log(
      "======================================"
    );
  } catch (
    schoolEmailError
  ) {
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
    "💰 Pago:",
    session.payment_status
  );

  console.log(
    "💾 Supabase:",
    supabaseOperation
  );

  console.log(
    "🆔 Application ID:",
    applicationId
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
    "======================================"
  );

  // ==========================================
  // RESPONDER A STRIPE
  // ==========================================

  return res.status(200).json({
    received: true,

    service:
      "study_malta_2027",

    paid: true,

    supabaseUpdated:
      supabaseOperation ===
        "updated" ||
      supabaseOperation ===
        "inserted",

    supabaseOperation,

    applicationId,

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
