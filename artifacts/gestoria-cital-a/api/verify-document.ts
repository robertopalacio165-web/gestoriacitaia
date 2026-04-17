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

type VerifyDocumentResult = {
  status: "valid" | "review" | "invalid";
  document_type: VerifyDocumentType | string;
  expected_document_type: VerifyDocumentType | string | null;
  match_expected_type: boolean | null;
  country: string | null;
  full_name: string | null;
  document_number: string | null;
  nie: string | null;
  passport_number: string | null;
  birth_date: string | null;
  expiry_date: string | null;
  issue_date: string | null;
  nationality: string | null;
  sex: string | null;
  warnings: string[];
  visible_fields: string[];
  missing_or_unclear_fields: string[];
  image_quality: {
    blurred: boolean;
    cropped: boolean;
    dark: boolean;
    glare: boolean;
    low_resolution: boolean;
    multiple_documents: boolean;
  };
  summary: string;

  is_stay_proof: boolean;
  stay_proof_strength: StayProofStrength;
  document_date: string | null;
  person_name_visible: boolean;
  linked_to_client: boolean | null;
  usable_for_regularizacion_2026: boolean;
  recommended_bucket: RecommendedBucket;
  stay_proof_reason: string;
};

const ALLOWED_DOCUMENT_TYPES: VerifyDocumentType[] = [
  "auto",
  "passport",
  "nie",
  "tie",
  "empadronamiento",
  "criminal_record",
  "photo",
  "official_form",
  "stay_proof",
  "supporting_document",
  "personal_photo",
  "other",
  "unknown",
];

function normalizeDocumentType(
  value?: string | null
): VerifyDocumentType | string | null {
  if (!value || typeof value !== "string") return null;

  const v = value.trim().toLowerCase();

  if (!v) return null;

  if (v === "auto") return "auto";
  if (v === "passport" || v === "pasaporte") return "passport";
  if (v === "nie") return "nie";
  if (v === "tie") return "tie";
  if (v === "empadronamiento" || v === "padron" || v === "padrón") {
    return "empadronamiento";
  }
  if (
    v === "criminal_record" ||
    v === "criminal records" ||
    v === "antecedentes" ||
    v === "antecedentes_penales" ||
    v === "certificado_penales"
  ) {
    return "criminal_record";
  }
  if (v === "photo" || v === "foto" || v === "selfie") return "photo";
  if (
    v === "official_form" ||
    v === "formulario" ||
    v === "form" ||
    v === "modelo ex"
  ) {
    return "official_form";
  }
  if (v === "stay_proof") return "stay_proof";
  if (v === "supporting_document") return "supporting_document";
  if (v === "personal_photo") return "personal_photo";
  if (v === "other") return "other";
  if (v === "unknown") return "unknown";

  return v;
}

function sanitizeLang(value?: string): VerifyDocumentLang {
  if (value === "darija" || value === "en" || value === "es") return value;
  return "es";
}

function safeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeBoolean(value: unknown): boolean {
  return value === true;
}

function safeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function safeStayProofStrength(value: unknown): StayProofStrength {
  if (
    value === "strong" ||
    value === "medium" ||
    value === "weak" ||
    value === "none"
  ) {
    return value;
  }
  return "none";
}

function safeRecommendedBucket(value: unknown): RecommendedBucket {
  if (
    value === "identity_document" ||
    value === "stay_proof" ||
    value === "official_form" ||
    value === "supporting_document" ||
    value === "personal_photo" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
}

function safeNullableBoolean(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function normalizeResult(
  raw: any,
  expectedDocumentType: string | null
): VerifyDocumentResult {
  const normalizedType = normalizeDocumentType(raw?.document_type) || "unknown";
  const normalizedExpected = normalizeDocumentType(expectedDocumentType);

  let matchExpectedType: boolean | null = null;

  if (normalizedExpected && normalizedExpected !== "auto") {
    matchExpectedType =
      typeof raw?.match_expected_type === "boolean"
        ? raw.match_expected_type
        : normalizedType === normalizedExpected;
  }

  return {
    status:
      raw?.status === "valid" ||
      raw?.status === "review" ||
      raw?.status === "invalid"
        ? raw.status
        : "review",
    document_type: normalizedType,
    expected_document_type:
      normalizedExpected && normalizedExpected !== "auto"
        ? normalizedExpected
        : null,
    match_expected_type: matchExpectedType,
    country: safeNullableString(raw?.country),
    full_name: safeNullableString(raw?.full_name),
    document_number: safeNullableString(raw?.document_number),
    nie: safeNullableString(raw?.nie),
    passport_number: safeNullableString(raw?.passport_number),
    birth_date: safeNullableString(raw?.birth_date),
    expiry_date: safeNullableString(raw?.expiry_date),
    issue_date: safeNullableString(raw?.issue_date),
    nationality: safeNullableString(raw?.nationality),
    sex: safeNullableString(raw?.sex),
    warnings: safeArray(raw?.warnings),
    visible_fields: safeArray(raw?.visible_fields),
    missing_or_unclear_fields: safeArray(raw?.missing_or_unclear_fields),
    image_quality: {
      blurred: safeBoolean(raw?.image_quality?.blurred),
      cropped: safeBoolean(raw?.image_quality?.cropped),
      dark: safeBoolean(raw?.image_quality?.dark),
      glare: safeBoolean(raw?.image_quality?.glare),
      low_resolution: safeBoolean(raw?.image_quality?.low_resolution),
      multiple_documents: safeBoolean(raw?.image_quality?.multiple_documents),
    },
    summary: safeNullableString(raw?.summary) || "",

    is_stay_proof: safeBoolean(raw?.is_stay_proof),
    stay_proof_strength: safeStayProofStrength(raw?.stay_proof_strength),
    document_date: safeNullableString(raw?.document_date),
    person_name_visible: safeBoolean(raw?.person_name_visible),
    linked_to_client: safeNullableBoolean(raw?.linked_to_client),
    usable_for_regularizacion_2026: safeBoolean(
      raw?.usable_for_regularizacion_2026
    ),
    recommended_bucket: safeRecommendedBucket(raw?.recommended_bucket),
    stay_proof_reason: safeNullableString(raw?.stay_proof_reason) || "",
  };
}

function validateRequest(body: VerifyDocumentRequest) {
  const hasFileBase64 =
    typeof body.fileBase64 === "string" && body.fileBase64.trim().length > 0;

  if (!hasFileBase64) {
    return "Debes enviar fileBase64";
  }

  return null;
}

function buildSystemPrompt(
  lang: VerifyDocumentLang,
  expectedDocumentType?: string | null
) {
  const base = `
Eres un verificador profesional de documentos para GestoriaCitaIA.

Tu trabajo es analizar visualmente UN archivo del cliente y devolver SOLO JSON válido.
Puede ser:
- foto hecha con móvil
- escaneo
- captura
- imagen de un documento
- PDF convertido a imagen por el frontend

No escribas markdown.
No escribas explicaciones fuera del JSON.
No inventes datos que no se vean claramente.
Si un campo no es visible o no es seguro, usa null.
Si hay duda razonable, usa status = "review".
Si el archivo está ilegible, muy borroso, recortado o no permite leer bien el contenido, usa status = "invalid".

Tu objetivo es:
1. detectar qué tipo de documento parece
2. extraer solo datos claramente visibles
3. decidir si puede servir como prueba de estancia en España
4. evaluar si puede servir para la regularización extraordinaria 2026
5. clasificarlo dentro de un bucket útil del expediente

Estados permitidos:
- "valid"
- "review"
- "invalid"

Tipos de documento permitidos:
- "passport"
- "nie"
- "tie"
- "empadronamiento"
- "criminal_record"
- "photo"
- "official_form"
- "stay_proof"
- "supporting_document"
- "personal_photo"
- "other"
- "unknown"

Reglas importantes:
- Si es pasaporte, NIE, TIE, empadronamiento, antecedentes o formulario, detecta eso.
- Si no es un documento de identidad pero sí puede demostrar presencia o estancia del cliente en España, usa "stay_proof".
- Ejemplos de stay_proof: cita médica, receta, ticket, factura, envío, certificado, resguardo, documento bancario, carta administrativa, justificante, contrato, nómina, documento social, transporte, consumo, etc.
- Si solo es un documento de apoyo general pero no prueba fuerte de estancia, usa "supporting_document".
- Si es una foto personal tipo selfie o retrato del cliente, usa "personal_photo" o "photo" según proceda.
- Si es una foto normal del cliente para trámites, puedes marcar recommended_bucket = "personal_photo".
- Si el tipo esperado es "auto", trátalo como sin tipo obligatorio.
- Si el documento no coincide con el esperado, marca match_expected_type = false.
- No asumas autenticidad forense real. Solo evalúa apariencia visual, legibilidad y coherencia básica.
- Fechas idealmente en formato ISO YYYY-MM-DD cuando se vean claramente. Si no, copia el formato visible o usa null.
- "document_date" debe intentar reflejar la fecha principal visible del documento o prueba.
- "person_name_visible" indica si aparece claramente el nombre de una persona en el documento.
- "linked_to_client" debe ser:
  - true si parece claramente vinculado a la persona titular
  - false si parece claramente no vinculado
  - null si no se puede saber
- "stay_proof_strength":
  - "strong" si parece una prueba útil y clara de estancia/presencia
  - "medium" si parece útil pero con alguna duda
  - "weak" si apenas ayuda
  - "none" si no sirve como prueba de estancia
- "usable_for_regularizacion_2026" debe ser true si el documento parece útil dentro del expediente o como prueba de estancia
- "recommended_bucket" debe ser uno de:
  - "identity_document"
  - "stay_proof"
  - "official_form"
  - "supporting_document"
  - "personal_photo"
  - "other"

Debes devolver exactamente un objeto JSON con esta estructura:
{
  "status": "valid" | "review" | "invalid",
  "document_type": "passport" | "nie" | "tie" | "empadronamiento" | "criminal_record" | "photo" | "official_form" | "stay_proof" | "supporting_document" | "personal_photo" | "other" | "unknown",
  "expected_document_type": string | null,
  "match_expected_type": boolean | null,
  "country": string | null,
  "full_name": string | null,
  "document_number": string | null,
  "nie": string | null,
  "passport_number": string | null,
  "birth_date": string | null,
  "expiry_date": string | null,
  "issue_date": string | null,
  "nationality": string | null,
  "sex": string | null,
  "warnings": string[],
  "visible_fields": string[],
  "missing_or_unclear_fields": string[],
  "image_quality": {
    "blurred": boolean,
    "cropped": boolean,
    "dark": boolean,
    "glare": boolean,
    "low_resolution": boolean,
    "multiple_documents": boolean
  },
  "summary": string,
  "is_stay_proof": boolean,
  "stay_proof_strength": "strong" | "medium" | "weak" | "none",
  "document_date": string | null,
  "person_name_visible": boolean,
  "linked_to_client": boolean | null,
  "usable_for_regularizacion_2026": boolean,
  "recommended_bucket": "identity_document" | "stay_proof" | "official_form" | "supporting_document" | "personal_photo" | "other",
  "stay_proof_reason": string
}
`;

  const languageBlock =
    lang === "darija"
      ? `
El campo "summary", el campo "stay_proof_reason" y cada elemento de "warnings" deben estar en darija marroquí escrita con letras árabes.
El resto de claves del JSON deben mantenerse exactamente igual.
`
      : lang === "en"
      ? `
The "summary" field, the "stay_proof_reason" field, and each "warnings" item must be written in English.
All JSON keys must remain exactly as defined.
`
      : `
El campo "summary", el campo "stay_proof_reason" y cada elemento de "warnings" deben estar escritos en español.
El resto de claves del JSON deben mantenerse exactamente igual.
`;

  const expectedBlock =
    expectedDocumentType && expectedDocumentType !== "auto"
      ? `
Tipo esperado del documento: ${expectedDocumentType}
Debes comparar visualmente el documento contra este tipo esperado.
`
      : `
No hay tipo esperado obligatorio.
`;

  return `${base}\n${languageBlock}\n${expectedBlock}`;
}

function buildDataUrlFromFile(params: {
  fileBase64: string;
  mimeType?: string;
  fileName?: string;
}) {
  const { fileBase64, mimeType, fileName } = params;

  const safeMime =
    mimeType && mimeType.trim()
      ? mimeType.trim()
      : fileName?.toLowerCase().endsWith(".png")
      ? "image/png"
      : fileName?.toLowerCase().endsWith(".webp")
      ? "image/webp"
      : fileName?.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "image/jpeg";

  return `data:${safeMime};base64,${fileBase64}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta OPENAI_API_KEY en Vercel",
      });
    }

    const body: VerifyDocumentRequest = req.body || {};
    const requestError = validateRequest(body);

    if (requestError) {
      return res.status(400).json({ error: requestError });
    }

    const normalizedExpected = normalizeDocumentType(body.expectedDocumentType);
    const expectedDocumentType =
      normalizedExpected &&
      (ALLOWED_DOCUMENT_TYPES.includes(
        normalizedExpected as VerifyDocumentType
      ) ||
        normalizedExpected === "auto")
        ? normalizedExpected
        : null;

    const lang = sanitizeLang(body.lang);

    const dataUrl = buildDataUrlFromFile({
      fileBase64: body.fileBase64!.trim(),
      mimeType: body.mimeType,
      fileName: body.fileName,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_VERIFY_DOCUMENT || "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 1400,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(lang, expectedDocumentType),
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analiza este archivo del cliente. Puede ser foto, escaneo, captura o PDF convertido a imagen. Decide si sirve como prueba de estancia en España y si es útil para el expediente de regularización 2026. Devuelve SOLO JSON válido.`,
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OPENAI VERIFY ERROR:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: data?.error?.message || "Error OpenAI verificando documento",
      });
    }

    const raw = data?.choices?.[0]?.message?.content;

    if (!raw || typeof raw !== "string") {
      return res.status(500).json({
        error: "La IA no devolvió contenido válido",
      });
    }

    let parsed: any;

    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError, raw);
      return res.status(500).json({
        error: "La IA devolvió una respuesta no válida",
        raw,
      });
    }

    const result = normalizeResult(parsed, expectedDocumentType);

    return res.status(200).json({
      ok: true,
      result,
    });
  } catch (error: any) {
    console.error("VERIFY DOCUMENT SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
