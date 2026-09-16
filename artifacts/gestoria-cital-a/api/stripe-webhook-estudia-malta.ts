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
// WEBHOOK
// ==========================================

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
      error:
        "Could not read webhook body",
    });
  }

  // ==========================================
  // VERIFICAR EVENTO STRIPE
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
      "❌ Error verificando webhook:",
      error.message
    );

    return res.status(400).json({
      error:
        `Webhook Error: ${error.message}`,
    });
  }

  // ==========================================
  // SOLO CHECKOUT SESSION COMPLETED
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
  // STRIPE SESSION
  // ==========================================

  const session =
    event.data.object as Stripe.Checkout.Session;

  const metadata =
    session.metadata || {};

  console.log(
    "=========================================="
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

  // ==========================================
  // DATOS PRINCIPALES
  // ==========================================

  const fullName =
    metadata.fullName || "";

  const email =
    metadata.email ||
    session.customer_details?.email ||
    "";

  const whatsapp =
    metadata.whatsapp || "";

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
  // TODOS LOS CAMPOS DEL FORMULARIO
  // ==========================================

  const dateOfBirth =
    metadata.dateOfBirth || null;

  const placeOfBirth =
    metadata.placeOfBirth || null;

  const nationality =
    metadata.nationality || null;

  const passportNumber =
    metadata.passportNumber || null;

  const passportExpiry =
    metadata.passportExpiry || null;

  const address =
    metadata.address || null;

  const hasBac = toBoolean(metadata.hasBac);

  const bacYear =
    metadata.bacYear || null;

  const lastDiploma =
    metadata.lastDiploma || null;

  const otherDiplomas =
    metadata.otherDiplomas || null;

  const otherDiplomasDetails =
    metadata.otherDiplomasDetails || null;

  const isWorking = toBoolean(metadata.isWorking);

  const company =
    metadata.company || null;

  const jobTitle =
    metadata.jobTitle || null;

  const isStudent = toBoolean(metadata.isStudent);

  const hasFinancialSponsor = toBoolean(metadata.hasFinancialSponsor);

  const sponsorName =
    metadata.sponsorName || null;

  const sponsorRelation =
    metadata.sponsorRelation || null;

  const sponsorProfession =
    metadata.sponsorProfession || null;

  const sponsorIncome =
    metadata.sponsorIncome || null;

  const sponsorCountry =
    metadata.sponsorCountry || null;

  const previouslyAppliedVisa =
    metadata.previouslyAppliedVisa ||
    null;

  const previousVisaCountry =
    metadata.previousVisaCountry ||
    null;

  const previousVisaType =
    metadata.previousVisaType ||
    null;

  const previousVisaDate =
    metadata.previousVisaDate ||
    null;

  const visaRefused = toBoolean(metadata.visaRefused);

  const refusalCountry =
    metadata.refusalCountry || null;

  const refusalDate =
    metadata.refusalDate || null;

  const refusalReason =
    metadata.refusalReason || null;

  const previouslyObtainedVisa =
    metadata.previouslyObtainedVisa ||
    null;

  const previousObtainedVisaDetails =
    metadata.previousObtainedVisaDetails ||
    null;

  const termsAccepted = toBoolean(metadata.termsAccepted);

  // ==========================================
  // PDF ORIGINAL DEL CLIENTE
  // ==========================================

  const pdfUrl =
    metadata.pdfUrl || "";

  // ==========================================
  // STRIPE CUSTOMER
  // ==========================================

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : null;

  const stripePaymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  // ==========================================
  // DATOS PARA ESCUELA
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
      stripeCustomerId || "",

    stripe_payment_intent:
      stripePaymentIntent || "",

    payment_status:
      session.payment_status,
  };

  console.log(
    "📋 Datos completos preparados para escuela"
  );

  console.log(
    "📊 Número de campos:",
    Object.keys(
      schoolFormData
    ).length
  );

  // ==========================================
  // BUSCAR REGISTRO EXISTENTE
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
      "❌ ERROR BUSCANDO estudiar_malta:"
    );

    console.error(
      JSON.stringify(
        findError,
        null,
        2
      )
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
  // SI EXISTE -> UPDATE
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
        full_name:
          fullName,

        date_of_birth:
          dateOfBirth,

        place_of_birth:
          placeOfBirth,

        nationality:
          nationality,

        passport_number:
          passportNumber,

        passport_expiry:
          passportExpiry,

        address:
          address,

        whatsapp:
          whatsapp,

        email:
          email,

        has_bac:
          hasBac,

        bac_year:
          bacYear,

        last_diploma:
          lastDiploma,

        other_diplomas:
          otherDiplomas,

        other_diplomas_details:
          otherDiplomasDetails,

        is_working:
          isWorking,

        company:
          company,

        job_title:
          jobTitle,

        is_student:
          isStudent,

        has_financial_sponsor:
          hasFinancialSponsor,

        sponsor_name:
          sponsorName,

        sponsor_relation:
          sponsorRelation,

        sponsor_profession:
          sponsorProfession,

        sponsor_income:
          sponsorIncome,

        sponsor_country:
          sponsorCountry,

        previously_applied_visa:
          previouslyAppliedVisa,

        previous_visa_country:
          previousVisaCountry,

        previous_visa_type:
          previousVisaType,

        previous_visa_date:
          previousVisaDate,

        visa_refused:
          visaRefused,

        refusal_country:
          refusalCountry,

        refusal_date:
          refusalDate,

        refusal_reason:
          refusalReason,

        previously_obtained_visa:
          previouslyObtainedVisa,

        previous_obtained_visa_details:
          previousObtainedVisaDetails,

        terms_accepted:
          termsAccepted,

        paid:
          true,

        status:
          "paid",

        stripe_customer_id:
          stripeCustomerId,

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
        "❌ ERROR ACTUALIZANDO estudiar_malta:"
      );

      console.error(
        JSON.stringify(
          updateError,
          null,
          2
        )
      );
    } else {
      applicationId =
        updatedApplication.id;

      supabaseOperation =
        "updated";

      console.log(
        "✅ Registro actualizado:",
        applicationId
      );
    }
  }

  // ==========================================
  // NO EXISTE -> INSERT
  // ==========================================

  else {
    console.log(
      "🆕 No existe registro."
    );

    console.log(
      "📝 Creando estudiar_malta..."
    );

    const insertData = {
      full_name:
        fullName,

      date_of_birth:
        dateOfBirth,

      place_of_birth:
        placeOfBirth,

      nationality:
        nationality,

      passport_number:
        passportNumber,

      passport_expiry:
        passportExpiry,

      address:
        address,

      whatsapp:
        whatsapp,

      email:
        email,

      has_bac:
        hasBac,

      bac_year:
        bacYear,

      last_diploma:
        lastDiploma,

      other_diplomas:
        otherDiplomas,

      other_diplomas_details:
        otherDiplomasDetails,

      is_working:
        isWorking,

      company:
        company,

      job_title:
        jobTitle,

      is_student:
        isStudent,

      has_financial_sponsor:
        hasFinancialSponsor,

      sponsor_name:
        sponsorName,

      sponsor_relation:
        sponsorRelation,

      sponsor_profession:
        sponsorProfession,

      sponsor_income:
        sponsorIncome,

      sponsor_country:
        sponsorCountry,

      previously_applied_visa:
        previouslyAppliedVisa,

      previous_visa_country:
        previousVisaCountry,

      previous_visa_type:
        previousVisaType,

      previous_visa_date:
        previousVisaDate,

      visa_refused:
        visaRefused,

      refusal_country:
        refusalCountry,

      refusal_date:
        refusalDate,

      refusal_reason:
        refusalReason,

      previously_obtained_visa:
        previouslyObtainedVisa,

      previous_obtained_visa_details:
        previousObtainedVisaDetails,

      terms_accepted:
        termsAccepted,

      paid:
        true,

      stripe_session_id:
        session.id,

      stripe_customer_id:
        stripeCustomerId,

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
    } else {
      applicationId =
        newApplication.id;

      supabaseOperation =
        "inserted";

      console.log(
        "======================================"
      );

      console.log(
        "✅ REGISTRO CREADO EN estudiar_malta"
      );

      console.log(
        "🆔 ID:",
        applicationId
      );

      console.log(
        "📧 Email:",
        email
      );

      console.log(
        "======================================"
      );
    }
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
      email:
        email,

      name:
        fullName,

      whatsapp:
        whatsapp,

      dateOfBirth:
        dateOfBirth || "",

      nationality:
        nationality || "",

      passportNumber:
        passportNumber || "",

      pdfUrl:
        pdfUrl,
    });

    clientEmailSent =
      true;

    console.log(
      "✅ EMAIL CLIENTE ENVIADO"
    );

    console.log(
      "📧 Destino:",
      email
    );

    console.log(
      "📄 PDF ORIGINAL:",
      pdfUrl
        ? "ENVIADO"
        : "NO DISPONIBLE"
    );
  } catch (emailError) {
    console.error(
      "❌ ERROR EMAIL CLIENTE:"
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
      "✅ EMAIL ESCUELA ENVIADO"
    );

    console.log(
      "🏫 Destino:",
      schoolResult.schoolEmail
    );

    console.log(
      "📄 PDF:",
      schoolResult.pdfFileName
    );
  } catch (
    schoolEmailError
  ) {
    console.error(
      "❌ ERROR EMAIL ESCUELA:"
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
    "=========================================="
  );

  // ==========================================
  // RESPUESTA A STRIPE
  // ==========================================

  return res.status(200).json({
    received:
      true,

    service:
      "study_malta_2027",

    paid:
      true,

    supabaseOperation,

    supabaseUpdated:
      supabaseOperation ===
        "updated" ||
      supabaseOperation ===
        "inserted",

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
