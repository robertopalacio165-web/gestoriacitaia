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
  | "unknown";

type VerifyDocumentRequest = {
  imageBase64?: string;
  imageUrl?: string;
  expectedDocumentType?: string;
  lang?: VerifyDocumentLang;
};

type OpenAIMessageContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
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
  if (v === "official_form" || v === "formulario" || v === "form") {
    return "official_form";
  }
  if (v === "unknown") return "unknown";

  return v;
}

function sanitizeLang(value?: string): VerifyDocumentLang {
  if (value === "darija" || value === "en" || value === "es") return value;
  return "es";
}

function buildSystemPrompt(
  lang: VerifyDocumentLang,
  expectedDocumentType?: string | null
) {
  const base = `
Eres un verificador profesional de documentos para GestoriaCitaIA.

Tu trabajo es analizar visualmente UNA imagen y devolver SOLO JSON válido.
No escribas markdown.
No escribas explicaciones fuera del JSON.
No inventes datos que no se vean claramente.
Si un campo no es visible o no es seguro, usa null.
Si hay duda razonable, usa status = "review".
Si la imagen está demasiado borrosa, cortada, oscura, con reflejos o ilegible, usa status = "invalid".

Objetivo:
- detectar qué tipo de documento parece
- comprobar si coincide con el tipo esperado cuando exista
- extraer solo campos realmente visibles
- detectar problemas de calidad visual
- devolver un resumen claro

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
- "unknown"

Reglas adicionales importantes:
- Si la imagen parece una foto tipo carnet/selfie/documento no oficial, usa "photo" o "unknown" según corresponda.
- Si parece NIE o TIE y no es posible distinguir con seguridad cuál de los dos es, elige el más probable y añade warning.
- Si el tipo esperado es "auto", trátalo como sin tipo obligatorio.
- Si el documento no coincide con el esperado, marca match_expected_type = false.
- No asumas autenticidad forense real. Solo evalúa apariencia visual, legibilidad y coherencia básica.
- Fechas idealmente en formato ISO YYYY-MM-DD cuando se vean claramente. Si no, copia el formato visible o usa null.
- "visible_fields" solo debe incluir nombres de campos realmente visibles.
- "missing_or_unclear_fields" debe incluir campos esperables pero no claros.

Debes devolver exactamente un objeto JSON con esta estructura:
{
  "status": "valid" | "review" | "invalid",
  "document_type": "passport" | "nie" | "tie" | "empadronamiento" | "criminal_record" | "photo" | "official_form" | "unknown",
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
  "summary": string
}
`;

  const languageBlock =
    lang === "darija"
      ? `
El campo "summary" y cada elemento de "warnings" deben estar en darija marroquí escrita con letras árabes.
El resto de claves del JSON deben mantenerse exactamente igual.
`
      : lang === "en"
      ? `
The "summary" field and each "warnings" item must be written in English.
All JSON keys must remain exactly as defined.
`
      : `
El campo "summary" y cada elemento de "warnings" deben estar escritos en español.
El resto de claves del JSON deben mantenerse exactamente igual.
`;

  const expectedBlock =
    expectedDocumentType && expectedDocumentType !== "auto"
      ? `
Tipo esperado del documento: ${expectedDocumentType}
Debes comparar visualmente la imagen contra este tipo esperado.
`
      : `
No hay tipo esperado obligatorio.
`;

  return `${base}\n${languageBlock}\n${expectedBlock}`;
}

function buildUserPrompt(expectedDocumentType?: string | null) {
  return `
Analiza esta imagen.

Haz exactamente esto:
1. detecta qué tipo de documento parece
2. extrae solo los datos realmente visibles
3. evalúa la calidad de la imagen
4. indica si coincide con el tipo esperado
5. devuelve SOLO JSON válido

Tipo esperado del documento: ${
    expectedDocumentType && expectedDocumentType !== "auto"
      ? expectedDocumentType
      : "no especificado"
  }
`;
}

function detectMimeTypeFromUrl(url: string): string {
  const lower = url.toLowerCase();

  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";

  return "image/jpeg";
}

function looksLikeDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

async function downloadImageAsDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const contentType =
    response.headers.get("content-type") ||
    detectMimeTypeFromUrl(imageUrl) ||
    "image/jpeg";

  return `data:${contentType};base64,${base64}`;
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
  };
}

function validateRequest(body: VerifyDocumentRequest) {
  const hasBase64 =
    typeof body.imageBase64 === "string" && body.imageBase64.trim().length > 0;

  const hasImageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0;

  if (!hasBase64 && !hasImageUrl) {
    return "Debes enviar imageBase64 o imageUrl";
  }

  return null;
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

    let finalImageUrl = "";

    if (body.imageBase64 && body.imageBase64.trim()) {
      const trimmed = body.imageBase64.trim();

      finalImageUrl = looksLikeDataUrl(trimmed)
        ? trimmed
        : `data:image/jpeg;base64,${trimmed}`;
    } else if (body.imageUrl && body.imageUrl.trim()) {
      try {
        finalImageUrl = await downloadImageAsDataUrl(body.imageUrl.trim());
      } catch (downloadError: any) {
        return res.status(500).json({
          error: `No se pudo descargar la imagen externa: ${
            downloadError?.message || "error desconocido"
          }`,
        });
      }
    }

    const messages = [
      {
        role: "system",
        content: buildSystemPrompt(lang, expectedDocumentType),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildUserPrompt(expectedDocumentType),
          },
          {
            type: "image_url",
            image_url: {
              url: finalImageUrl,
            },
          },
        ] as OpenAIMessageContent[],
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_VERIFY_DOCUMENT || "gpt-4o-mini",
        temperature: 0.1,
        max_completion_tokens: 1000,
        response_format: {
          type: "json_object",
        },
        messages,
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
