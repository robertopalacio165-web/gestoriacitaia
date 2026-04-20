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

  if (
    v === "passport" ||
    v === "pasaporte" ||
    v === "passport document" ||
    v === "travel document" ||
    v === "documento de viaje" ||
    v === "passeport"
  ) {
    return "passport";
  }

  if (
    v === "nie" ||
    v === "número de identidad de extranjero" ||
    v === "numero de identidad de extranjero"
  ) {
    return "nie";
  }

  if (
    v === "tie" ||
    v === "tarjeta tie" ||
    v === "tarjeta de identidad de extranjero" ||
    v === "tarjeta de residencia" ||
    v === "residence card"
  ) {
    return "tie";
  }

  if (
    v === "empadronamiento" ||
    v === "padron" ||
    v === "padrón" ||
    v === "certificado de empadronamiento" ||
    v === "volante de empadronamiento" ||
    v === "certificado padronal" ||
    v === "volante padronal"
  ) {
    return "empadronamiento";
  }

  if (
    v === "criminal_record" ||
    v === "criminal records" ||
    v === "antecedentes" ||
    v === "antecedentes_penales" ||
    v === "antecedentes penales" ||
    v === "certificado_penales" ||
    v === "certificado de antecedentes penales" ||
    v === "criminal record"
  ) {
    return "criminal_record";
  }

  if (
    v === "official_form" ||
    v === "formulario" ||
    v === "form" ||
    v === "modelo ex" ||
    v === "solicitud" ||
    v === "impreso oficial"
  ) {
    return "official_form";
  }

  if (
    v === "stay_proof" ||
    v === "prueba de permanencia" ||
    v === "prueba permanencia" ||
    v === "proof of stay" ||
    v === "proof of presence" ||
    v === "stay proof" ||
    v === "justificante" ||
    v === "resguardo"
  ) {
    return "stay_proof";
  }

  if (
    v === "supporting_document" ||
    v === "documento de apoyo" ||
    v === "supporting doc"
  ) {
    return "supporting_document";
  }

  if (v === "photo" || v === "foto") return "photo";
  if (v === "personal_photo" || v === "selfie" || v === "foto personal") {
    return "personal_photo";
  }

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

function normalizeDateLike(value: unknown): string | null {
  const s = safeNullableString(value);
  if (!s) return null;
  return s;
}

function inferTypeFromText(text: string): VerifyDocumentType | null {
  const t = (text || "").toLowerCase();

  if (
    t.includes("pasaporte") ||
    t.includes("passport") ||
    t.includes("passeport") ||
    t.includes("mrz") ||
    t.includes("documento de viaje")
  ) {
    return "passport";
  }

  if (
    t.includes("tarjeta de identidad de extranjero") ||
    t.includes("tarjeta de residencia") ||
    t.includes("residence card")
  ) {
    return "tie";
  }

  if (
    t.includes(" nie ") ||
    t.startsWith("nie ") ||
    t.endsWith(" nie") ||
    t.includes("número de identidad de extranjero") ||
    t.includes("numero de identidad de extranjero")
  ) {
    return "nie";
  }

  if (
    t.includes("empadronamiento") ||
    t.includes("certificado de empadronamiento") ||
    t.includes("volante de empadronamiento") ||
    t.includes("padrón") ||
    t.includes("padron")
  ) {
    return "empadronamiento";
  }

  if (
    t.includes("antecedentes penales") ||
    t.includes("criminal record") ||
    t.includes("certificado de antecedentes")
  ) {
    return "criminal_record";
  }

  if (
    t.includes("modelo ex") ||
    t.includes("formulario") ||
    t.includes("solicitud oficial") ||
    t.includes("impreso oficial")
  ) {
    return "official_form";
  }

  if (
    t.includes("justificante") ||
    t.includes("resguardo") ||
    t.includes("ticket") ||
    t.includes("factura") ||
    t.includes("receta") ||
    t.includes("cita médica") ||
    t.includes("cita medica") ||
    t.includes("certificado") ||
    t.includes("documento bancario") ||
    t.includes("transferencia") ||
    t.includes("envío") ||
    t.includes("envio") ||
    t.includes("transporte") ||
    t.includes("consumo") ||
    t.includes("nómina") ||
    t.includes("nomina") ||
    t.includes("contrato de alquiler") ||
    t.includes("empadronamiento histórico") ||
    t.includes("prueba de permanencia") ||
    t.includes("proof of stay") ||
    t.includes("stay proof")
  ) {
    return "stay_proof";
  }

  return null;
}

function normalizeResult(
  raw: any,
  expectedDocumentType: string | null,
  fileName?: string
): VerifyDocumentResult {
  const textForInference = [
    safeNullableString(raw?.document_type) || "",
    safeNullableString(raw?.summary) || "",
    ...(safeArray(raw?.visible_fields) || []),
    ...(safeArray(raw?.warnings) || []),
    safeNullableString(raw?.stay_proof_reason) || "",
    (fileName || "").toLowerCase(),
  ]
    .join(" ")
    .toLowerCase();

  const inferredType = inferTypeFromText(textForInference);
  const normalizedType =
    normalizeDocumentType(raw?.document_type) ||
    inferredType ||
    "unknown";

  const normalizedExpected = normalizeDocumentType(expectedDocumentType);

  let matchExpectedType: boolean | null = null;

  if (normalizedExpected && normalizedExpected !== "auto") {
    matchExpectedType =
      typeof raw?.match_expected_type === "boolean"
        ? raw.match_expected_type
        : normalizedType === normalizedExpected;
  }

  const explicitStayProof =
    safeBoolean(raw?.is_stay_proof) ||
    normalizedType === "stay_proof" ||
    normalizedType === "empadronamiento" ||
    inferredType === "stay_proof" ||
    inferredType === "empadronamiento";

  const recommendedBucket =
    normalizedType === "passport" ||
    normalizedType === "nie" ||
    normalizedType === "tie"
      ? "identity_document"
      : normalizedType === "empadronamiento" || normalizedType === "stay_proof"
      ? "stay_proof"
      : normalizedType === "official_form"
      ? "official_form"
      : safeRecommendedBucket(raw?.recommended_bucket);

  const status =
    raw?.status === "valid" ||
    raw?.status === "review" ||
    raw?.status === "invalid"
      ? raw.status
      : "review";

  return {
    status,
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
    birth_date: normalizeDateLike(raw?.birth_date),
    expiry_date: normalizeDateLike(raw?.expiry_date),
    issue_date: normalizeDateLike(raw?.issue_date),
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
    is_stay_proof: explicitStayProof,
    stay_proof_strength:
      normalizedType === "empadronamiento"
        ? "strong"
        : safeStayProofStrength(raw?.stay_proof_strength),
    document_date: normalizeDateLike(raw?.document_date),
    person_name_visible: safeBoolean(raw?.person_name_visible),
    linked_to_client: safeNullableBoolean(raw?.linked_to_client),
    usable_for_regularizacion_2026:
      normalizedType === "passport" ||
      normalizedType === "nie" ||
      normalizedType === "tie" ||
      normalizedType === "empadronamiento" ||
      normalizedType === "stay_proof" ||
      safeBoolean(raw?.usable_for_regularizacion_2026),
    recommended_bucket: recommendedBucket,
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

Analizas UN archivo del cliente y devuelves SOLO JSON válido.

El archivo puede ser:
- foto hecha con móvil
- escaneo
- captura
- imagen de documento
- PDF real

Reglas:
- No escribas markdown.
- No escribas explicaciones fuera del JSON.
- No inventes datos que no se vean claramente.
- Si un campo no es visible o no es seguro, usa null.
- Si hay duda razonable, usa status = "review".
- Si el archivo está ilegible, muy borroso, recortado o no permite leer bien el contenido, usa status = "invalid".

Tu objetivo es:
1. detectar el tipo de documento
2. extraer datos visibles
3. decidir si sirve como prueba de estancia en España
4. decidir si sirve para regularización 2026
5. clasificarlo en el bucket correcto

Tipos permitidos:
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

Reglas MUY IMPORTANTES para este proyecto:
- Prioriza detectar correctamente "passport", "nie", "tie", "empadronamiento" y "stay_proof".
- "empadronamiento" NO debe salir como "other".
- Si el documento demuestra presencia o permanencia en España, usa "stay_proof".
- Ejemplos de "stay_proof": ticket, factura, receta, resguardo, justificante, carta administrativa, documento bancario, envío, transporte, consumo, cita médica, certificado, nómina, contrato de alquiler.
- Si es pasaporte, intenta extraer número, nombre, nacionalidad, fechas y MRZ si es visible.
- Si es NIE o TIE, intenta extraer NIE, nombre y fechas visibles.
- Si expected_document_type es "auto", no obligues coincidencia.
- Si no coincide con el esperado, match_expected_type = false.
- No asumas autenticidad forense real. Solo legibilidad y coherencia visual.
- linked_to_client:
  - true si parece claramente vinculado a la persona
  - false si claramente no lo está
  - null si no se puede saber

Devuelve exactamente un objeto JSON con esta estructura:
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

  return `${base}\n${languageBlock}\n${expectedBlock}`.trim();
}

function buildDataUrl(params: {
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

function isPdf(mimeType?: string, fileName?: string) {
  return (
    (mimeType || "").toLowerCase().includes("pdf") ||
    (fileName || "").toLowerCase().endsWith(".pdf")
  );
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;

      for (const part of item.content) {
        if (typeof part?.text === "string" && part.text.trim()) {
          return part.text.trim();
        }
      }
    }
  }

  return "";
}

function extractJsonObject(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
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
    const dataUrl = buildDataUrl({
      fileBase64: body.fileBase64!.trim(),
      mimeType: body.mimeType,
      fileName: body.fileName,
    });

    const contentParts: any[] = [
      {
        type: "input_text",
        text: `Analiza este archivo del cliente. Puede ser foto, escaneo, captura o PDF. Prioriza detectar correctamente si es pasaporte, NIE, TIE, empadronamiento o prueba de permanencia de 5 meses. Devuelve SOLO JSON válido.`,
      },
    ];

    if (isPdf(body.mimeType, body.fileName)) {
      contentParts.push({
        type: "input_file",
        filename: body.fileName || "documento.pdf",
        file_data: dataUrl,
      });
    } else {
      contentParts.push({
        type: "input_image",
        image_url: dataUrl,
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_VERIFY_DOCUMENT || "gpt-4.1-mini",
        max_output_tokens: 1800,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: buildSystemPrompt(lang, expectedDocumentType),
              },
            ],
          },
          {
            role: "user",
            content: contentParts,
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

    const raw = extractResponseText(data);

    if (!raw || typeof raw !== "string") {
      console.error("EMPTY VERIFY RESPONSE:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: "La IA no devolvió contenido válido",
      });
    }

    let parsed: any;

    try {
      parsed = JSON.parse(extractJsonObject(raw));
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError, raw);
      return res.status(500).json({
        error: "La IA devolvió una respuesta no válida",
        raw,
      });
    }

    const result = normalizeResult(parsed, expectedDocumentType, body.fileName);

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
