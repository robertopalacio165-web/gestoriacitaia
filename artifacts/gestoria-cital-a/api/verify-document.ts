import type { VercelRequest, VercelResponse } from "@vercel/node";

type VerifyDocumentLang = "darija" | "es" | "en";
type VerifyDocumentType =
  | "auto"
  | "passport"
  | "nie"
  | "tie"
  | "empadronamiento"
  | "criminal_record"
  | "photo"
  | "official_form"
  | "stay_proof"
  | "supporting_document"
  | "personal_photo"
  | "other"
  | "unknown";

type StayProofStrength = "strong" | "medium" | "weak" | "none";
type RecommendedBucket =
  | "identity_document"
  | "stay_proof"
  | "official_form"
  | "supporting_document"
  | "personal_photo"
  | "other";

type VerifyDocumentRequest = {
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
  expectedDocumentType?: string;
  lang?: VerifyDocumentLang;
};

type RawModelResult = {
  status?: "valid" | "review" | "invalid";
  document_type?: string;
  expected_document_type?: string | null;
  match_expected_type?: boolean | null;
  country?: string | null;
  full_name?: string | null;
  document_number?: string | null;
  nie?: string | null;
  passport_number?: string | null;
  birth_date?: string | null;
  expiry_date?: string | null;
  issue_date?: string | null;
  nationality?: string | null;
  sex?: string | null;
  warnings?: string[];
  visible_fields?: string[];
  missing_or_unclear_fields?: string[];
  image_quality?: {
    blurred?: boolean;
    cropped?: boolean;
    dark?: boolean;
    glare?: boolean;
    low_resolution?: boolean;
    multiple_documents?: boolean;
  };
  fraud_risk?: "low" | "medium" | "high";
verification_score?: number;
final_verdict?: "approved" | "review" | "rejected";
is_expired?: boolean;
name_match?: boolean | null;
date_logic_ok?: boolean;

  summary?: string;
  is_stay_proof?: boolean;
  stay_proof_strength?: StayProofStrength;
  document_date?: string | null;
  person_name_visible?: boolean;
  linked_to_client?: boolean | null;
  usable_for_regularizacion_2026?: boolean;
  recommended_bucket?: RecommendedBucket;
  stay_proof_reason?: string;
};

function asArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean)
    : [];
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDocumentType(value?: string | null): VerifyDocumentType {
  if (!value || typeof value !== "string") return "unknown";

  const v = value.trim().toLowerCase();

  if (v === "passport" || v === "pasaporte" || v === "passeport") return "passport";
  if (v === "nie" || v.includes("identidad de extranjero")) return "nie";
  if (v === "tie" || v === "tarjeta de residencia" || v.includes("tarjeta de identidad")) return "tie";
  if (v === "empadronamiento" || v === "padron" || v === "padrón") return "empadronamiento";
  if (v === "criminal_record" || v.includes("antecedentes")) return "criminal_record";
  if (v === "official_form" || v.includes("formulario") || v.includes("modelo ex")) return "official_form";
  if (
    v === "stay_proof" ||
    v.includes("permanencia") ||
    v.includes("presencia") ||
    v.includes("ticket") ||
    v.includes("factura") ||
    v.includes("cita médica")
  ) {
    return "stay_proof";
  }
  if (v === "photo") return "photo";
  if (v === "personal_photo") return "personal_photo";
  if (v === "supporting_document") return "supporting_document";
  if (v === "other") return "other";

  return "unknown";
}

function inferRecommendedBucket(docType: VerifyDocumentType): RecommendedBucket {
  if (docType === "passport" || docType === "nie" || docType === "tie") {
    return "identity_document";
  }
  if (docType === "empadronamiento" || docType === "stay_proof") {
    return "stay_proof";
  }
  if (docType === "official_form") {
    return "official_form";
  }
  if (docType === "personal_photo" || docType === "photo") {
    return "personal_photo";
  }
  if (docType === "supporting_document" || docType === "criminal_record") {
    return "supporting_document";
  }
  return "other";
}

function inferStayProofByContent(
  docType: VerifyDocumentType,
  fileName?: string,
  summary?: string,
  visibleFields?: string[]
) {
  const combined = [
    fileName || "",
    summary || "",
    ...(visibleFields || []),
  ]
    .join(" ")
    .toLowerCase();

  const looksLikeStayProof =
    docType === "empadronamiento" ||
    docType === "stay_proof" ||
    combined.includes("empadron") ||
    combined.includes("padron") ||
    combined.includes("padrón") ||
    combined.includes("ticket") ||
    combined.includes("factura") ||
    combined.includes("cita médica") ||
    combined.includes("receta") ||
    combined.includes("justificante") ||
    combined.includes("nómina") ||
    combined.includes("nomina") ||
    combined.includes("resguardo");

  return looksLikeStayProof;
}

function inferStayProofStrength(
  docType: VerifyDocumentType,
  visibleFields: string[],
  summary: string,
  imageQuality: {
    blurred: boolean;
    cropped: boolean;
    dark: boolean;
    glare: boolean;
    low_resolution: boolean;
    multiple_documents: boolean;
  }
): StayProofStrength {
  const combined = [...visibleFields, summary].join(" ").toLowerCase();

  if (docType !== "empadronamiento" && docType !== "stay_proof") {
    return "none";
  }

  if (docType === "empadronamiento") {
    if (
      !imageQuality.blurred &&
      !imageQuality.cropped &&
      !imageQuality.low_resolution
    ) {
      return "strong";
    }
    return "medium";
  }

  if (
    combined.includes("nombre") ||
    combined.includes("fecha") ||
    combined.includes("name") ||
    combined.includes("date")
  ) {
    if (
      !imageQuality.blurred &&
      !imageQuality.cropped &&
      !imageQuality.low_resolution
    ) {
      return "medium";
    }
    return "weak";
  }

  return "weak";
}

function inferUsableForRegularizacion(
  docType: VerifyDocumentType,
  status: "valid" | "review" | "invalid",
  imageQuality: {
    blurred: boolean;
    cropped: boolean;
    dark: boolean;
    glare: boolean;
    low_resolution: boolean;
    multiple_documents: boolean;
  }
): boolean {
  if (status === "invalid") return false;

  if (
    imageQuality.blurred ||
    imageQuality.cropped ||
    imageQuality.low_resolution
  ) {
    return false;
  }

  if (
    docType === "passport" ||
    docType === "nie" ||
    docType === "tie" ||
    docType === "empadronamiento" ||
    docType === "stay_proof" ||
    docType === "criminal_record" ||
    docType === "official_form" ||
    docType === "supporting_document"
  ) {
    return true;
  }

  return false;
}

function buildSystemPrompt(lang: VerifyDocumentLang, expectedType?: string | null) {
  return `
You are a strict document verification assistant for GestoriaCitaIA.

Your job:
- Analyze ONE uploaded image or PDF.
- Classify the document.
- Extract visible fields only.
- Do not invent missing data.
- Return ONLY valid JSON.
- No markdown.
- No explanation outside the JSON.

Allowed document_type values:
passport, nie, tie, empadronamiento, criminal_record, official_form, stay_proof, supporting_document, personal_photo, photo, other, unknown

Rules:
- If it is a passport, classify as passport.
- If it is NIE, classify as nie.
- If it is TIE/residence card, classify as tie.
- If it is padrón / empadronamiento / certificado histórico de empadronamiento, classify as empadronamiento.
- If it is proof of stay in Spain such as invoice, ticket, cita médica, receta, payroll, justificante, classify as stay_proof.
- If it is antecedentes penales, classify as criminal_record.
- If it is an EX form / official immigration form, classify as official_form.
- If it is just a personal portrait, classify as personal_photo.
- If unclear, classify as unknown.

You must return this JSON schema:
{
  "status": "valid" | "review" | "invalid",
  "document_type": "string",
  "expected_document_type": "string or null",
  "match_expected_type": true | false | null,
  "country": "string or null",
  "full_name": "string or null",
  "document_number": "string or null",
  "nie": "string or null",
  "passport_number": "string or null",
  "birth_date": "string or null",
  "expiry_date": "string or null",
  "issue_date": "string or null",
  "nationality": "string or null",
  "sex": "string or null",
  "warnings": ["string"],
  "visible_fields": ["string"],
  "missing_or_unclear_fields": ["string"],
  "image_quality": {
    "blurred": boolean,
    "cropped": boolean,
    "dark": boolean,
    "glare": boolean,
    "low_resolution": boolean,
    "multiple_documents": boolean
  },
  "summary": "string",
  "is_stay_proof": boolean,
  "stay_proof_strength": "strong" | "medium" | "weak" | "none",
  "document_date": "string or null",
  "person_name_visible": boolean,
  "linked_to_client": true | false | null,
  "usable_for_regularizacion_2026": true | false,
  "recommended_bucket": "identity_document" | "stay_proof" | "official_form" | "supporting_document" | "personal_photo" | "other",
  "stay_proof_reason": "string"
}

Important:
- expected_document_type is: ${expectedType || "auto"}
- summary must be in ${
    lang === "darija" ? "Moroccan Darija written in Arabic script" : lang === "en" ? "English" : "Spanish"
  }.
- If image quality is poor, mark status as review or invalid.
- If major details are unreadable, do not invent them.
`.trim();
}

function normalizeResult(
  raw: RawModelResult,
  expectedDocumentType: string | null,
  fileName?: string
) {
  const documentType = normalizeDocumentType(raw?.document_type);
  const expectedTypeNormalized =
    expectedDocumentType && expectedDocumentType !== "auto"
      ? normalizeDocumentType(expectedDocumentType)
      : null;

  const visibleFields = asArray(raw?.visible_fields);
  const warnings = asArray(raw?.warnings);
  const missingOrUnclearFields = asArray(raw?.missing_or_unclear_fields);

  const imageQuality = {
    blurred: asBool(raw?.image_quality?.blurred),
    cropped: asBool(raw?.image_quality?.cropped),
    dark: asBool(raw?.image_quality?.dark),
    glare: asBool(raw?.image_quality?.glare),
    low_resolution: asBool(raw?.image_quality?.low_resolution),
    multiple_documents: asBool(raw?.image_quality?.multiple_documents),
  };

  const summary = asNullableString(raw?.summary) || "";

  const inferredStayProof = inferStayProofByContent(
    documentType,
    fileName,
    summary,
    visibleFields
  );

  const isStayProof =
    typeof raw?.is_stay_proof === "boolean"
      ? raw.is_stay_proof
      : inferredStayProof;

  const stayProofStrength =
    raw?.stay_proof_strength && ["strong", "medium", "weak", "none"].includes(raw.stay_proof_strength)
      ? raw.stay_proof_strength
      : inferStayProofStrength(documentType, visibleFields, summary, imageQuality);

  const status: "valid" | "review" | "invalid" =
    raw?.status === "valid" || raw?.status === "invalid" || raw?.status === "review"
      ? raw.status
      : "review";

  const recommendedBucket =
    raw?.recommended_bucket && ["identity_document", "stay_proof", "official_form", "supporting_document", "personal_photo", "other"].includes(raw.recommended_bucket)
      ? raw.recommended_bucket
      : inferRecommendedBucket(documentType);

  const matchExpectedType =
    expectedTypeNormalized === null
      ? null
      : expectedTypeNormalized === documentType ||
        (expectedTypeNormalized === "stay_proof" &&
          (documentType === "empadronamiento" || documentType === "stay_proof"));

  const usableForRegularizacion =
    typeof raw?.usable_for_regularizacion_2026 === "boolean"
      ? raw.usable_for_regularizacion_2026
      : inferUsableForRegularizacion(documentType, status, imageQuality);

  const documentDate =
    asNullableString(raw?.document_date) ||
    asNullableString(raw?.issue_date) ||
    asNullableString(raw?.expiry_date);

  const personNameVisible =
    typeof raw?.person_name_visible === "boolean"
      ? raw.person_name_visible
      : !!asNullableString(raw?.full_name);

  return {
    status,
    document_type: documentType,
    expected_document_type: expectedTypeNormalized,
    match_expected_type: matchExpectedType,
    country: asNullableString(raw?.country),
    full_name: asNullableString(raw?.full_name),
    document_number:
      asNullableString(raw?.document_number) ||
      asNullableString(raw?.nie) ||
      asNullableString(raw?.passport_number),
    nie: asNullableString(raw?.nie),
    passport_number: asNullableString(raw?.passport_number),
    birth_date: asNullableString(raw?.birth_date),
    expiry_date: asNullableString(raw?.expiry_date),
    issue_date: asNullableString(raw?.issue_date),
    nationality: asNullableString(raw?.nationality),
    sex: asNullableString(raw?.sex),
    warnings,
    visible_fields: visibleFields,
    missing_or_unclear_fields: missingOrUnclearFields,
    image_quality: imageQuality,
    summary,
    is_stay_proof: isStayProof,
    stay_proof_strength: stayProofStrength,
    document_date: documentDate,
    person_name_visible: personNameVisible,
    linked_to_client:
      typeof raw?.linked_to_client === "boolean" ? raw.linked_to_client : null,
    usable_for_regularizacion_2026: usableForRegularizacion,
    recommended_bucket: recommendedBucket,
    stay_proof_reason:
      asNullableString(raw?.stay_proof_reason) ||
      (isStayProof
        ? "El documento parece útil como prueba de presencia o permanencia en España."
        : ""),
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileBase64, fileName, mimeType, lang, expectedDocumentType } =
      req.body as VerifyDocumentRequest;

    if (!fileBase64) {
      return res.status(400).json({ error: "Falta fileBase64" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const googleVisionKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY" });
    }

    const systemPrompt = buildSystemPrompt(lang || "es", expectedDocumentType || "auto");
    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${fileBase64}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analiza este documento y devuelve solo JSON. Nombre del archivo: ${fileName || "documento"}.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1400,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Error OpenAI Vision");
    }

    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Respuesta vacía del modelo");
    }

    const rawResult = JSON.parse(rawContent) as RawModelResult;
    const finalResult = normalizeResult(
      rawResult,
      expectedDocumentType || null,
      fileName
    );

    return res.status(200).json({
      ok: true,
      result: finalResult,
    });
  } catch (error: any) {
    console.error("VERIFY ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Internal Server Error",
    });
  }
}
