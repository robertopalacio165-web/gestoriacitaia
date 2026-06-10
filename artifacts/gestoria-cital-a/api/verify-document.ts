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
  | "unknown"
| "hospital_document"
| "rental_contract"
| "utility_bill"
| "transport_ticket"
| "work_document"
| "tax_document"
| "bank_document"
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
  if (v === "hospital_document" || v.includes("hospital") || v.includes("médico")) {
  return "hospital_document";
}

if (v === "rental_contract" || v.includes("alquiler") || v.includes("contrato")) {
  return "rental_contract";
}

if (v === "utility_bill" || v.includes("electricidad") || v.includes("agua")) {
  return "utility_bill";
}

if (v === "transport_ticket" || v.includes("ticket")) {
  return "transport_ticket";
}

if (v === "work_document" || v.includes("trabajo") || v.includes("nomina")) {
  return "work_document";
}

if (v === "tax_document" || v.includes("agencia tributaria")) {
  return "tax_document";
}

if (v === "bank_document" || v.includes("banco")) {
  return "bank_document";
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
You are Mohamed, the elite AI immigration document analyst for GestoriaCitaIA Spain.

Your mission is to perform REAL immigration-grade analysis for Spanish regularization processes.

You analyze ONE uploaded image or PDF document.

CRITICAL RULES:
- NEVER invent information.
- NEVER hallucinate fields.
- ONLY use visible OCR text and visible document data.
- If uncertain, say uncertain.
- Return ONLY pure valid JSON.
- No markdown.
- No explanations outside JSON.

You are specialized in:
- Spanish immigration
- Regularizacion 2026
- arraigo
- proof of stay in Spain
- identity validation
- fraud detection
- OCR verification
- document consistency

You must detect EXACT document type.

POSSIBLE DOCUMENT TYPES:
- passport
- nie
- tie
- empadronamiento
- criminal_record
- official_form
- stay_proof
- supporting_document
- personal_photo
- photo
- hospital_document
- rental_contract
- utility_bill
- transport_ticket
- work_document
- tax_document
- bank_document
- unknown

VERY IMPORTANT ANALYSIS:

1. Detect if the document is REALISTIC or suspicious.

2. Detect image manipulation:
- edited text
- fake screenshots
- inconsistent fonts
- cropped areas
- AI generated look
- duplicated patterns
- suspicious blur

3. Detect if the document helps prove stay in Spain.

4. Detect if the document can help prove:
- 3 months in Spain
- 5 months in Spain
- long stay
- address linkage
- identity linkage

5. Extract ALL visible dates.

6. Compare dates with current year.

7. Detect if the document is expired.

8. Detect if the document belongs to the same person.

9. Detect if this is useful for Regularizacion 2026.

10. Determine strength:
- strong
- medium
- weak
- useless

11. If it is:
- passport
- NIE
- TIE
- empadronamiento
- hospital paper
- rental paper
- work paper
- invoice
- ticket
- bank transfer
- school paper
- tax paper

You MUST explicitly identify it.

12. For stay proof:
Calculate approximate proof duration if possible.

Examples:
- "document suggests 6+ months presence"
- "document only proves one isolated date"
- "multiple dates detected"
- "insufficient permanence proof"

13. OCR VALIDATION:
Use OCR text heavily.
If OCR text and image conflict -> warning.

14. Fraud score logic:
- low
- medium
- high

15. Verification score:
0 to 100.

16. final_verdict:
- approved
- review
- rejected

17. date_logic_ok:
false if dates impossible.

18. name_match:
true if same visible person identity.
false if inconsistent names.
null if impossible.

19. usable_for_regularizacion_2026:
true only if realistically useful.

20. recommended_bucket:
- identity_document
- stay_proof
- official_form
- supporting_document
- personal_photo
- other

Return EXACT JSON schema:

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
  "fraud_risk": "low" | "medium" | "high",
  "verification_score": number,
  "final_verdict": "approved" | "review" | "rejected",
  "is_expired": boolean,
  "name_match": true | false | null,
  "date_logic_ok": boolean,
  "is_stay_proof": boolean,
  "stay_proof_strength": "strong" | "medium" | "weak" | "none",
  "document_date": "string or null",
  "person_name_visible": boolean,
  "linked_to_client": true | false | null,
  "usable_for_regularizacion_2026": boolean,
  "recommended_bucket": "identity_document" | "stay_proof" | "official_form" | "supporting_document" | "personal_photo" | "other",
  "stay_proof_reason": "string"
}

LANGUAGE RULE:
summary must be written in ${
  lang === "darija"
    ? "Moroccan Darija using Arabic script"
    : lang === "en"
    ? "English"
    : "Spanish"
}.

Expected document type:
${expectedType || "auto"}
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
const isExpired =
  !!asNullableString(raw?.expiry_date) &&
  new Date(asNullableString(raw?.expiry_date) as string).getTime() < Date.now();

let score = 100;
if (warnings.some(w => w.toLowerCase().includes("fake"))) {
  score -= 50;
}

if (warnings.some(w => w.toLowerCase().includes("edited"))) {
  score -= 40;
}

if (warnings.some(w => w.toLowerCase().includes("manipulated"))) {
  score -= 50;
}

if (warnings.some(w => w.toLowerCase().includes("inconsistent"))) {
  score -= 30;
}

if (warnings.some(w => w.toLowerCase().includes("ocr conflict"))) {
  score -= 35;
}
if (status === "review") score -= 20;
if (status === "invalid") score -= 60;
if (imageQuality.blurred) score -= 15;
if (imageQuality.cropped) score -= 15;
if (imageQuality.low_resolution) score -= 15;
if (imageQuality.dark) score -= 10;
if (imageQuality.glare) score -= 10;
if (isExpired) score -= 25;

if (score < 0) score = 0;

const fraudRisk =
  score >= 80 ? "low" : score >= 50 ? "medium" : "high";

const finalVerdict =
  score >= 80 ? "approved" : score >= 50 ? "review" : "rejected";
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
    fraud_risk: fraudRisk,
verification_score: score,
final_verdict: finalVerdict,
is_expired: isExpired,
name_match: null,
date_logic_ok: !isExpired,
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
async function runGoogleVisionOCR(
  fileBase64: string,
  mimeType: string,
  apiKey: string
) {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: fileBase64,
            },
            features: [
              { type: "TEXT_DETECTION" },
              { type: "DOCUMENT_TEXT_DETECTION" },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  const text =
    data?.responses?.[0]?.fullTextAnnotation?.text ||
    data?.responses?.[0]?.textAnnotations?.[0]?.description ||
    "";

  return {
    raw: data,
    text,
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
    let googleOcrText = "";

if (googleVisionKey) {
  try {
    const googleResult = await runGoogleVisionOCR(
      fileBase64,
      mimeType || "image/jpeg",
      googleVisionKey
    );

    googleOcrText = googleResult.text || "";
  } catch (error) {
    console.error("GOOGLE OCR ERROR:", error);
  }
}
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
  text: `Analiza este documento y devuelve solo JSON.\nTexto OCR detectado:\n${googleOcrText || "Sin texto detectado"}.\nNombre del archivo: ${fileName || "documento"}.`,
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
