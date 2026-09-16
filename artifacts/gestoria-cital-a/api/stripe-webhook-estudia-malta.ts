import Stripe from "stripe";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

import {
  sendWelcomeEmail,
} from "./gmailSendEstudiaMalta.js";

import {
  sendEstudiaMaltaEscuelaEmail,
} from "./gmailSendEstudiaMaltaEscuela.js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      error: `Webhook Error: ${error.message}`,
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
      reason: "NOT_STUDY_MALTA",
      service: metadata.service || null,
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
      error: "No customer email found",
    });
  }

  const cleanEmail =
    email.trim().toLowerCase();

  // ==========================================
  // DATOS COMPLETOS PARA LA ESCUELA
  // ==========================================

  const schoolFormData: Record<
    string,
    unknown
  > = {
    ...metadata,

    fullName,
    email: cleanEmail,
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
    Object.keys(schoolFormData).filter(
      (key) =>
        ![
          "stripe_session_id",
          "stripe_customer_id",
        ].includes(key)
    )
  );

  // ==========================================
  // GUARDAR EN SUPABASE
  //
  // SI EXISTE → UPDATE
  // SI NO EXISTE → INSERT
  // ==========================================

  const applicationData = {
    full_name:
      metadata.fullName || "",

    date_of_birth:
      metadata.dateOfBirth || "",

    place_of_birth:
      metadata.placeOfBirth || "",

    nationality:
      metadata.nationality || "",

    passport_number:
      metadata.passportNumber || "",

    passport_expiry:
      metadata.passportExpiry || "",

    address:
      metadata.address || "",

    whatsapp:
      metadata.whatsapp || "",

    email:
      cleanEmail,

    has_bac:
      metadata.hasBac || "",

    bac_year:
      metadata.bacYear || "",

    last_diploma:
      metadata.lastDiploma || "",

    other_diplomas:
      metadata.otherDiplomas || "",

    other_diplomas_details:
      metadata.otherDiplomasDetails || "",

    is_working:
      metadata.isWorking || "",

    company:
      metadata.company || "",

    job_title:
      metadata.jobTitle || "",

    is_student:
      metadata.isStudent || "",

    has_financial_sponsor:
      metadata.hasFinancialSponsor || "",

    sponsor_name:
      metadata.sponsorName || "",

    sponsor_relation:
      metadata.sponsorRelation || "",

    sponsor_profession:
      metadata.sponsorProfession || "",

    sponsor_income:
      metadata.sponsorIncome || "",

    sponsor_country:
      metadata.sponsorCountry || "",

    previously_applied_visa:
      metadata.previouslyAppliedVisa || "",

    previous_visa_country:
      metadata.previousVisaCountry || "",

    previous_visa_type:
      metadata.previousVisaType || "",

    previous_visa_date:
      metadata.previousVisaDate || "",

    visa_refused:
      metadata.visaRefused || "",

    refusal_country:
      metadata.refusalCountry || "",

    refusal_date:
      metadata.refusalDate || "",

    refusal_reason:
      metadata.refusalReason || "",

    previously_obtained_visa:
      metadata.previouslyObtainedVisa || "",

    previous_obtained_visa_details:
      metadata.previousObtainedVisaDetails || "",

    terms_accepted:
      true,

    paid:
      true,

    stripe_session_id:
      session.id,

    stripe_customer_id:
      typeof session.customer === "string"
        ? session.customer
        : null,

    status:
      "paid",

    updated_at:
      new Date().toISOString(),
  };

  let savedApplication: any = null;
  let saveError: any = null;

  // ==========================================
  // BUSCAR SI YA EXISTE
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

    saveError = findError;
  }

  // ==========================================
  // SI EXISTE → UPDATE
  // ==========================================

  if (
    !saveError &&
    existingApplication
  ) {
    console.log(
      "🔄 Solicitud ya existe. Actualizando..."
    );

    const result =
      await supabase
        .from("estudiar_malta")
        .update(applicationData)
        .eq(
          "id",
          existingApplication.id
        )
        .select("id")
        .single();

    savedApplication =
      result.data;

    saveError =
      result.error;

    if (saveError) {
      console.error(
        "❌ ERROR ACTUALIZANDO estudiar_malta:",
        saveError
      );
    } else {
      console.log(
        "✅ Solicitud ACTUALIZADA en Supabase:",
        savedApplication?.id
      );
    }
  }

  // ==========================================
  // SI NO EXISTE → INSERT
  // ==========================================

  if (
    !saveError &&
    !existingApplication
  ) {
    console.log(
      "🆕 Solicitud no existe. Creando en Supabase..."
    );

    const result =
      await supabase
        .from("estudiar_malta")
        .insert(
          applicationData
        )
        .select("id")
        .single();

    savedApplication =
      result.data;

    saveError =
      result.error;

    if (saveError) {
      console.error(
        "❌ ERROR CREANDO estudiar_malta:",
        saveError
      );
    } else {
      console.log(
        "✅ Solicitud CREADA en Supabase:",
        savedApplication?.id
      );
    }
  }

  // ==========================================
  // 1️⃣ EMAIL DEL CLIENTE
  // ==========================================

  let clientEmailSent =
    false;

  try {
    await sendWelcomeEmail({
      email: cleanEmail,

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
    saveError ? "ERROR" : "OK"
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
  // RESPUESTA A STRIPE
  // ==========================================

  return res.status(200).json({
    received: true,

    service:
      "study_malta_2027",

    paid: true,

    supabaseUpdated:
      !saveError,

    supabaseId:
      savedApplication?.id ||
      null,

    clientEmailSent,

    schoolEmailSent,

    email:
      cleanEmail,

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
    (resolve, reject) => {
      let body = "";

      req.on(
        "data",
        (chunk: Buffer) => {
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
        (error) => {
          reject(error);
        }
      );
    }
  );
}
