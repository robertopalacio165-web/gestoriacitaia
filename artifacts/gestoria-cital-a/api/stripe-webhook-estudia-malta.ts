import Stripe from "stripe";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

// ============================================================
// EMAIL CLIENTE
// ============================================================

import {
  sendWelcomeEmail,
} from "./gmailSendEstudiaMalta.js";

// ============================================================
// EMAIL ESCUELA
// ============================================================

import {
  sendEstudiaMaltaEscuelaEmail,
} from "./gmailSendEstudiaMaltaEscuela.js";

// ============================================================
// STRIPE
// ============================================================

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string,
  {
    apiVersion: "2025-08-27.basil",
  }
);

// ============================================================
// SUPABASE
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
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
// BOOLEAN
// ============================================================

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "1" ||
      normalized === "si" ||
      normalized === "sí"
    );
  }

  return false;
}

// ============================================================
// STRING
// ============================================================

function valueOrNull(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const valueString = String(value).trim();

  return valueString === "" ? null : valueString;
}

// ============================================================
// WEBHOOK
// ============================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("");
  console.log("==================================================");
  console.log("🇲🇹 STRIPE WEBHOOK — ESTUDIAR MALTA 2027");
  console.log("==================================================");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  // ==========================================================
  // STRIPE SIGNATURE
  // ==========================================================

  const signature =
    req.headers["stripe-signature"] as string | undefined;

  if (!signature) {
    console.error("❌ Falta stripe-signature");

    return res.status(400).json({
      error: "Missing Stripe signature",
    });
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET;

  if (!webhookSecret) {
    console.error(
      "❌ STRIPE_WEBHOOK_ESTUDIA_MALTA_SECRET NO CONFIGURADO"
    );

    return res.status(500).json({
      error: "Study Malta webhook secret not configured",
    });
  }

  // ==========================================================
  // RAW BODY
  // ==========================================================

  let rawBody: string;

  try {
    rawBody = await getRawBody(req);
  } catch (error) {
    console.error("❌ Error leyendo RAW body:", error);

    return res.status(400).json({
      error: "Could not read webhook body",
    });
  }

  if (!rawBody) {
    console.error("❌ RAW BODY VACÍO");

    return res.status(400).json({
      error: "Empty webhook body",
    });
  }

  // ==========================================================
  // VERIFICAR STRIPE
  // ==========================================================

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error: any) {
    console.error(
      "❌ ERROR VERIFICANDO WEBHOOK STRIPE:"
    );

    console.error(error?.message || error);

    return res.status(400).json({
      error: `Webhook Error: ${
        error?.message || "Invalid signature"
      }`,
    });
  }

  console.log("✅ Firma Stripe verificada");
  console.log("Event ID:", event.id);
  console.log("Event type:", event.type);

  // ==========================================================
  // SOLO checkout.session.completed
  // ==========================================================

  if (event.type !== "checkout.session.completed") {
    console.log("⏭️ Evento ignorado:", event.type);

    return res.status(200).json({
      received: true,
      ignored: true,
      eventType: event.type,
    });
  }

  // ==========================================================
  // SESSION
  // ==========================================================

  const session =
    event.data.object as Stripe.Checkout.Session;

  const metadata = session.metadata || {};

  console.log("==================================================");
  console.log("🇲🇹 ESTUDIAR MALTA 2027");
  console.log("Session:", session.id);
  console.log("Payment status:", session.payment_status);
  console.log("Amount:", session.amount_total);
  console.log("Currency:", session.currency);
  console.log("Service:", metadata.service);
  console.log("Cliente:", metadata.fullName);
  console.log(
    "Email:",
    metadata.email ||
      session.customer_details?.email
  );
  console.log("==================================================");

  // ==========================================================
  // SOLO STUDY MALTA
  // ==========================================================

  if (metadata.service !== "study_malta_2027") {
    console.log("⏭️ NO ES STUDY MALTA 2027");
    console.log("⛔ No se procesa.");

    return res.status(200).json({
      received: true,
      ignored: true,
      reason: "NOT_STUDY_MALTA_2027",
    });
  }

  console.log(
    "✅ Service correcto: study_malta_2027"
  );

  // ==========================================================
  // CONFIRMAR PAGO
  // ==========================================================

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    console.log(
      "⏭️ PAGO NO CONFIRMADO:",
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

  console.log("💰 PAGO CONFIRMADO");

  // ==========================================================
  // DATOS PRINCIPALES
  // ==========================================================

  const fullName =
    String(metadata.fullName || "").trim();

  const whatsapp =
    String(metadata.whatsapp || "").trim();

  const email =
    String(
      metadata.email ||
        session.customer_details?.email ||
        ""
    )
      .trim()
      .toLowerCase();

  if (!email) {
    console.error(
      "❌ NO EXISTE EMAIL DEL CLIENTE"
    );

    return res.status(400).json({
      error: "No customer email found",
    });
  }

  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const dateOfBirth =
    valueOrNull(metadata.dateOfBirth);

  const placeOfBirth =
    valueOrNull(metadata.placeOfBirth);

  const nationality =
    valueOrNull(metadata.nationality);

  const passportNumber =
    valueOrNull(metadata.passportNumber);

  const passportExpiry =
    valueOrNull(metadata.passportExpiry);

  const address =
    valueOrNull(metadata.address);

  const hasBac =
    toBoolean(metadata.hasBac);

  const bacYear =
    valueOrNull(metadata.bacYear);

  const lastDiploma =
    valueOrNull(metadata.lastDiploma);

  const otherDiplomas =
    valueOrNull(metadata.otherDiplomas);

  const otherDiplomasDetails =
    valueOrNull(metadata.otherDiplomasDetails);

  const isWorking =
    toBoolean(metadata.isWorking);

  const company =
    valueOrNull(metadata.company);

  const jobTitle =
    valueOrNull(metadata.jobTitle);

  const isStudent =
    toBoolean(metadata.isStudent);

  const hasFinancialSponsor =
    toBoolean(metadata.hasFinancialSponsor);

  const sponsorName =
    valueOrNull(metadata.sponsorName);

  const sponsorRelation =
    valueOrNull(metadata.sponsorRelation);

  const sponsorProfession =
    valueOrNull(metadata.sponsorProfession);

  const sponsorIncome =
    valueOrNull(metadata.sponsorIncome);

  const sponsorCountry =
    valueOrNull(metadata.sponsorCountry);

  const previouslyAppliedVisa =
    valueOrNull(metadata.previouslyAppliedVisa);

  const previousVisaCountry =
    valueOrNull(metadata.previousVisaCountry);

  const previousVisaType =
    valueOrNull(metadata.previousVisaType);

  const previousVisaDate =
    valueOrNull(metadata.previousVisaDate);

  const visaRefused =
    toBoolean(metadata.visaRefused);

  const refusalCountry =
    valueOrNull(metadata.refusalCountry);

  const refusalDate =
    valueOrNull(metadata.refusalDate);

  const refusalReason =
    valueOrNull(metadata.refusalReason);

  const previouslyObtainedVisa =
    valueOrNull(metadata.previouslyObtainedVisa);

  const previousObtainedVisaDetails =
    valueOrNull(
      metadata.previousObtainedVisaDetails
    );

  const termsAccepted =
    toBoolean(metadata.termsAccepted);

  const pdfUrl =
    String(metadata.pdfUrl || "").trim();

  // ==========================================================
  // STRIPE IDS
  // ==========================================================

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : null;

  const stripePaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  // ==========================================================
  // DATOS ESCUELA
  // ==========================================================

  const schoolFormData: Record<string, unknown> = {
    ...metadata,

    fullName,
    email,
    whatsapp,

    stripe_session_id: session.id,

    stripe_customer_id:
      stripeCustomerId || "",

    stripe_payment_intent:
      stripePaymentIntentId || "",

    payment_status:
      session.payment_status,

    amount_total:
      session.amount_total,

    currency:
      session.currency,
  };

  // ==========================================================
  // SUPABASE
  // ==========================================================

  let existingApplication:
    { id: string } | null = null;

  try {
    const result = await supabase
      .from("estudiar_malta")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    existingApplication =
      result.data || null;

    if (result.error) {
      console.error(
        "❌ ERROR BUSCANDO estudiar_malta:"
      );

      console.error(
        JSON.stringify(result.error, null, 2)
      );
    }
  } catch (error) {
    console.error(
      "❌ EXCEPCIÓN BUSCANDO SUPABASE:",
      error
    );
  }

  let applicationId: string | null = null;

  let supabaseOperation:
    | "updated"
    | "inserted"
    | "error" = "error";

  const databaseData = {
    full_name: fullName,
    date_of_birth: dateOfBirth,
    place_of_birth: placeOfBirth,
    nationality,
    passport_number: passportNumber,
    passport_expiry: passportExpiry,
    address,
    whatsapp,
    email,

    has_bac: hasBac,
    bac_year: bacYear,
    last_diploma: lastDiploma,
    other_diplomas: otherDiplomas,
    other_diplomas_details:
      otherDiplomasDetails,

    is_working: isWorking,
    company,
    job_title: jobTitle,
    is_student: isStudent,

    has_financial_sponsor:
      hasFinancialSponsor,

    sponsor_name: sponsorName,
    sponsor_relation: sponsorRelation,
    sponsor_profession: sponsorProfession,
    sponsor_income: sponsorIncome,
    sponsor_country: sponsorCountry,

    previously_applied_visa:
      previouslyAppliedVisa,

    previous_visa_country:
      previousVisaCountry,

    previous_visa_type:
      previousVisaType,

    previous_visa_date:
      previousVisaDate,

    visa_refused: visaRefused,

    refusal_country: refusalCountry,
    refusal_date: refusalDate,
    refusal_reason: refusalReason,

    previously_obtained_visa:
      previouslyObtainedVisa,

    previous_obtained_visa_details:
      previousObtainedVisaDetails,

    terms_accepted: termsAccepted,

    paid: true,

    stripe_session_id:
      session.id,

    stripe_customer_id:
      stripeCustomerId,

    status: "paid",

    updated_at:
      new Date().toISOString(),
  };

  // ==========================================================
  // UPDATE
  // ==========================================================

  if (existingApplication) {
    applicationId =
      existingApplication.id;

    console.log(
      "🔄 REGISTRO EXISTENTE:",
      applicationId
    );

    try {
      const {
        data,
        error,
      } = await supabase
        .from("estudiar_malta")
        .update(databaseData)
        .eq("id", applicationId)
        .select("id")
        .single();

      if (error) {
        console.error(
          "❌ ERROR UPDATE estudiar_malta:"
        );

        console.error(
          JSON.stringify(error, null, 2)
        );
      } else {
        applicationId = data.id;
        supabaseOperation = "updated";

        console.log(
          "✅ SUPABASE UPDATE OK"
        );
      }
    } catch (error) {
      console.error(
        "❌ EXCEPCIÓN UPDATE SUPABASE:",
        error
      );
    }
  }

  // ==========================================================
  // INSERT
  // ==========================================================

  else {
    console.log(
      "🆕 NO EXISTE REGISTRO"
    );

    try {
      const {
        data,
        error,
      } = await supabase
        .from("estudiar_malta")
        .insert({
          ...databaseData,

          created_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          "❌ ERROR INSERT estudiar_malta:"
        );

        console.error(
          JSON.stringify(error, null, 2)
        );
      } else {
        applicationId = data.id;
        supabaseOperation = "inserted";

        console.log(
          "✅ SUPABASE INSERT OK"
        );
      }
    } catch (error) {
      console.error(
        "❌ EXCEPCIÓN INSERT SUPABASE:",
        error
      );
    }
  }

  // ==========================================================
  // EMAIL CLIENTE
  // ==========================================================

  let clientEmailSent = false;

  try {
    console.log(
      "📧 ENVIANDO EMAIL AL CLIENTE..."
    );

    await sendWelcomeEmail({
      email,
      name: fullName,
      whatsapp,
      dateOfBirth:
        dateOfBirth || "",
      nationality:
        nationality || "",
      passportNumber:
        passportNumber || "",
      pdfUrl,
    });

    clientEmailSent = true;

    console.log(
      "✅ EMAIL CLIENTE ENVIADO"
    );

    console.log(
      "📧 Destino:",
      email
    );
  } catch (emailError) {
    console.error(
      "❌ ERROR EMAIL CLIENTE:"
    );

    console.error(emailError);
  }

  // ==========================================================
  // EMAIL ESCUELA
  // ==========================================================

  let schoolEmailSent = false;

  try {
    console.log(
      "🏫 ENVIANDO EMAIL A ESCUELA..."
    );

    const schoolResult =
      await sendEstudiaMaltaEscuelaEmail(
        schoolFormData
      );

    schoolEmailSent = true;

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
  } catch (schoolEmailError) {
    console.error(
      "❌ ERROR EMAIL ESCUELA:"
    );

    console.error(
      schoolEmailError
    );
  }

  // ==========================================================
  // FINAL
  // ==========================================================

  console.log(
    "=================================================="
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
    "=================================================="
  );

  return res.status(200).json({
    received: true,
    service: "study_malta_2027",
    paid: true,
    supabaseOperation,
    applicationId,
    clientEmailSent,
    schoolEmailSent,
    email,
    name: fullName,
    sessionId: session.id,
  });
}

// ============================================================
// RAW BODY
// ============================================================

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
