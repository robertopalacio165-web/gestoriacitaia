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

// ============================================================
// STRIPE
// ============================================================

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY no configurado");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
});

// ============================================================
// SUPABASE
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL no configurado"
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no configurado"
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

// ============================================================
// VERCEL
// ============================================================

export const config = {
  api: {
    bodyParser: false,
  },
};

// ============================================================
// HELPERS
// ============================================================

function stringValue(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const result = String(value).trim();

  return result === "" ? null : result;
}

function booleanValue(
  value: unknown
): boolean | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "si" ||
    normalized === "sí"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no"
  ) {
    return false;
  }

  return null;
}

// ============================================================
// WEBHOOK
// ============================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log(
    "=========================================="
  );

  console.log(
    "🇲🇹 STRIPE WEBHOOK — ESTUDIOS MALTA 2027"
  );

  console.log(
    "=========================================="
  );

  // ==========================================================
  // SOLO POST
  // ==========================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  // ==========================================================
  // WEBHOOK SECRET
  // ==========================================================

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

  // ==========================================================
  // STRIPE SIGNATURE
  // ==========================================================

  const signature =
    req.headers["stripe-signature"];

  if (!signature || Array.isArray(signature)) {
    console.error(
      "❌ Falta stripe-signature"
    );

    return res.status(400).json({
      error:
        "Missing Stripe signature",
    });
  }

  // ==========================================================
  // RAW BODY
  // ==========================================================

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

  // ==========================================================
  // CONSTRUIR EVENTO STRIPE
  // ==========================================================

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
      error?.message || error
    );

    return res.status(400).json({
      error:
        `Webhook Error: ${
          error?.message || "Invalid signature"
        }`,
    });
  }

  console.log(
    "✅ Firma Stripe válida"
  );

  console.log(
    "Evento:",
    event.type
  );

  console.log(
    "Event ID:",
    event.id
  );

  // ==========================================================
  // SOLO CHECKOUT.SESSION.COMPLETED
  // ==========================================================

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
      eventType: event.type,
    });
  }

  // ==========================================================
  // STRIPE SESSION
  // ==========================================================

  const session =
    event.data.object as Stripe.Checkout.Session;

  const metadata =
    session.metadata || {};

  console.log(
    "=========================================="
  );

  console.log(
    "SESSION:",
    session.id
  );

  console.log(
    "SERVICE:",
    metadata.service
  );

  console.log(
    "PAYMENT STATUS:",
    session.payment_status
  );

  console.log(
    "CUSTOMER EMAIL:",
    session.customer_details?.email
  );

  console.log(
    "AMOUNT:",
    session.amount_total
  );

  console.log(
    "=========================================="
  );

  // ==========================================================
  // SOLO STUDY MALTA
  // ==========================================================

  if (
    metadata.service !==
    "study_malta_2027"
  ) {
    console.log(
      "⏭️ NO es Study Malta 2027."
    );

    return res.status(200).json({
      received: true,
      ignored: true,
      reason:
        "NOT_STUDY_MALTA_2027",
    });
  }

  console.log(
    "✅ Study Malta 2027 confirmado"
  );

  // ==========================================================
  // CONFIRMAR PAGO
  // ==========================================================

  if (
    session.payment_status !== "paid" &&
    session.payment_status !==
      "no_payment_required"
  ) {
    console.log(
      "⏭️ Pago no confirmado:",
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

  // ==========================================================
  // DATOS PRINCIPALES
  // ==========================================================

  const fullName =
    stringValue(
      metadata.fullName
    ) || "";

  const email =
    stringValue(
      metadata.email
    ) ||
    stringValue(
      session.customer_details?.email
    ) ||
    "";

  const whatsapp =
    stringValue(
      metadata.whatsapp
    ) || "";

  if (!email) {
    console.error(
      "❌ No existe email del cliente"
    );

    return res.status(400).json({
      error:
        "No customer email found",
    });
  }

  // ==========================================================
  // DATOS DEL FORMULARIO
  // ==========================================================

  const dateOfBirth =
    stringValue(
      metadata.dateOfBirth
    );

  const placeOfBirth =
    stringValue(
      metadata.placeOfBirth
    );

  const nationality =
    stringValue(
      metadata.nationality
    );

  const passportNumber =
    stringValue(
      metadata.passportNumber
    );

  const passportExpiry =
    stringValue(
      metadata.passportExpiry
    );

  const address =
    stringValue(
      metadata.address
    );

  const hasBac =
    booleanValue(
      metadata.hasBac
    );

  const bacYear =
    stringValue(
      metadata.bacYear
    );

  const lastDiploma =
    stringValue(
      metadata.lastDiploma
    );

  const otherDiplomas =
    stringValue(
      metadata.otherDiplomas
    );

  const otherDiplomasDetails =
    stringValue(
      metadata.otherDiplomasDetails
    );

  const isWorking =
    booleanValue(
      metadata.isWorking
    );

  const company =
    stringValue(
      metadata.company
    );

  const jobTitle =
    stringValue(
      metadata.jobTitle
    );

  const isStudent =
    booleanValue(
      metadata.isStudent
    );

  const hasFinancialSponsor =
    booleanValue(
      metadata.hasFinancialSponsor
    );

  const sponsorName =
    stringValue(
      metadata.sponsorName
    );

  const sponsorRelation =
    stringValue(
      metadata.sponsorRelation
    );

  const sponsorProfession =
    stringValue(
      metadata.sponsorProfession
    );

  const sponsorIncome =
    stringValue(
      metadata.sponsorIncome
    );

  const sponsorCountry =
    stringValue(
      metadata.sponsorCountry
    );

  const previouslyAppliedVisa =
    booleanValue(
      metadata.previouslyAppliedVisa
    );

  const previousVisaCountry =
    stringValue(
      metadata.previousVisaCountry
    );

  const previousVisaType =
    stringValue(
      metadata.previousVisaType
    );

  const previousVisaDate =
    stringValue(
      metadata.previousVisaDate
    );

  const visaRefused =
    booleanValue(
      metadata.visaRefused
    );

  const refusalCountry =
    stringValue(
      metadata.refusalCountry
    );

  const refusalDate =
    stringValue(
      metadata.refusalDate
    );

  const refusalReason =
    stringValue(
      metadata.refusalReason
    );

  const previouslyObtainedVisa =
    booleanValue(
      metadata.previouslyObtainedVisa
    );

  const previousObtainedVisaDetails =
    stringValue(
      metadata.previousObtainedVisaDetails
    );

  const termsAccepted =
    booleanValue(
      metadata.termsAccepted
    );

  // ==========================================================
  // PDF ORIGINAL / URL
  // ==========================================================

  const pdfUrl =
    stringValue(
      metadata.pdfUrl
    ) || "";

  // ==========================================================
  // STRIPE CUSTOMER
  // ==========================================================

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : null;

  const stripePaymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  // ==========================================================
  // DATOS PARA LA ESCUELA
  // ==========================================================

  const schoolFormData: Record<
    string,
    unknown
  > = {
    ...metadata,

    fullName,
    email,
    whatsapp,

    dateOfBirth,
    placeOfBirth,
    nationality,
    passportNumber,
    passportExpiry,
    address,

    hasBac,
    bacYear,
    lastDiploma,
    otherDiplomas,
    otherDiplomasDetails,

    isWorking,
    company,
    jobTitle,
    isStudent,

    hasFinancialSponsor,
    sponsorName,
    sponsorRelation,
    sponsorProfession,
    sponsorIncome,
    sponsorCountry,

    previouslyAppliedVisa,
    previousVisaCountry,
    previousVisaType,
    previousVisaDate,

    visaRefused,
    refusalCountry,
    refusalDate,
    refusalReason,

    previouslyObtainedVisa,
    previousObtainedVisaDetails,

    termsAccepted,

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
    "📋 Datos preparados para escuela:",
    Object.keys(schoolFormData).length
  );

  // ==========================================================
  // DATOS PARA SUPABASE
  // ==========================================================

  const applicationData = {
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

    updated_at:
      new Date().toISOString(),
  };

  // ==========================================================
  // BUSCAR REGISTRO EXISTENTE
  // ==========================================================

  let applicationId:
    | string
    | null = null;

  let supabaseOperation:
    | "updated"
    | "inserted"
    | "error" = "error";

  try {
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

      throw findError;
    }

    // ========================================================
    // UPDATE
    // ========================================================

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
        .update(
          applicationData
        )
        .eq(
          "id",
          applicationId
        )
        .select("id")
        .single();

      if (updateError) {
        console.error(
          "❌ ERROR UPDATE estudiar_malta:",
          updateError
        );

        throw updateError;
      }

      applicationId =
        updatedApplication.id;

      supabaseOperation =
        "updated";

      console.log(
        "✅ estudiar_malta ACTUALIZADO"
      );
    }

    // ========================================================
    // INSERT
    // ========================================================

    else {
      console.log(
        "🆕 No existe registro."
      );

      const insertData = {
        ...applicationData,

        created_at:
          new Date().toISOString(),
      };

      const {
        data: newApplication,
        error: insertError,
      } = await supabase
        .from("estudiar_malta")
        .insert(
          insertData
        )
        .select("id")
        .single();

      if (insertError) {
        console.error(
          "❌ ERROR INSERT estudiar_malta:",
          insertError
        );

        throw insertError;
      }

      applicationId =
        newApplication.id;

      supabaseOperation =
        "inserted";

      console.log(
        "✅ estudiar_malta CREADO"
      );

      console.log(
        "🆔 ID:",
        applicationId
      );
    }
  } catch (supabaseError) {
    console.error(
      "❌ ERROR SUPABASE FINAL:",
      supabaseError
    );

    return res.status(500).json({
      received: true,
      service:
        "study_malta_2027",
      paid: true,
      supabaseOperation:
        "error",
      error:
        "Supabase operation failed",
    });
  }

  // ==========================================================
  // EMAIL CLIENTE
  // ==========================================================

  let clientEmailSent =
    false;

  try {
    console.log(
      "📧 Enviando email al cliente..."
    );

    await sendEstudiaMaltaEmail({
      email,
      name:
        fullName,

      whatsapp,

      dateOfBirth:
        dateOfBirth || "",

      nationality:
        nationality || "",

      passportNumber:
        passportNumber || "",

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
  } catch (error) {
    console.error(
      "❌ ERROR EMAIL CLIENTE:",
      error
    );
  }

  // ==========================================================
  // EMAIL ESCUELA
  // ==========================================================

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
  } catch (error) {
    console.error(
      "❌ ERROR EMAIL ESCUELA:",
      error
    );
  }

  // ==========================================================
  // FINAL
  // ==========================================================

  console.log(
    "=========================================="
  );

  console.log(
    "🇲🇹 ESTUDIOS MALTA 2027 FINALIZADO"
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

  // ==========================================================
  // RESPUESTA 200 A STRIPE
  // ==========================================================

  return res.status(200).json({
    received: true,

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

// ============================================================
// RAW BODY
// ============================================================

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
