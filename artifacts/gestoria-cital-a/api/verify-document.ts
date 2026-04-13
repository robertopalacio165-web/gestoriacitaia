type VerifyDocumentRequest = {
  imageBase64?: string;
  imageUrl?: string;
  expectedDocumentType?: string;
  lang?: "darija" | "es" | "en";
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

function buildSystemPrompt(lang: string, expectedDocumentType?: string) {
  const base = `
Eres un verificador profesional de documentos de extranjería para GestoriaCitaIA.

Tu trabajo es analizar visualmente un documento oficial y devolver SOLO JSON válido.

Objetivo:
- identificar si el documento parece real y legible a nivel visual
- extraer los campos visibles más importantes
- detectar problemas visuales
- indicar si el documento está:
  - "valid"
  - "review"
  - "invalid"

Reglas:
- NO inventes datos que no se vean.
- Si un dato no se ve claro, usa null.
- Si hay duda, usa status = "review".
- Si el documento está demasiado borroso, cortado, oscuro o ilegible, usa status = "invalid".
- No escribas texto fuera del JSON.
- Si no puedes identificar el tipo exacto, usa "unknown".

Campos que debes devolver:
{
  "status": "valid" | "review" | "invalid",
  "document_type": string,
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

Tipos de documento posibles:
- "passport"
- "nie"
- "tie"
- "empadronamiento"
- "criminal_record"
- "work_contract"
- "official_form"
- "unknown"
`;

  const languageBlock =
    lang === "darija"
      ? `
La respuesta JSON debe llevar "summary" y "warnings" en darija marroquí con letras árabes.
`
      : lang === "en"
      ? `
La respuesta JSON debe llevar "summary" y "warnings" in English.
`
      : `
La respuesta JSON debe llevar "summary" y "warnings" en español.
`;

  const expectedBlock = expectedDocumentType
    ? `
El tipo esperado del documento es: ${expectedDocumentType}
Debes comparar visualmente el documento con ese tipo esperado.
`
    : `
No hay tipo esperado obligatorio.
`;

  return `${base}\n${languageBlock}\n${expectedBlock}`;
}

function buildUserPrompt(expectedDocumentType?: string) {
  return `
Analiza este documento.

Debes:
1. detectar qué tipo de documento parece
2. extraer solo lo que realmente se ve
3. revisar si la imagen está bien o mal
4. devolver SOLO JSON válido

Tipo esperado del documento: ${expectedDocumentType || "no especificado"}
`;
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
    const expectedDocumentType = body.expectedDocumentType || null;
    const lang = body.lang || "es";

    const hasBase64 =
      typeof body.imageBase64 === "string" && body.imageBase64.trim().length > 0;

    const hasImageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0;

    if (!hasBase64 && !hasImageUrl) {
      return res.status(400).json({
        error: "Debes enviar imageBase64 o imageUrl",
      });
    }

    const imageUrl = hasBase64
      ? body.imageBase64!.startsWith("data:image/")
        ? body.imageBase64!
        : `data:image/jpeg;base64,${body.imageBase64}`
      : body.imageUrl!;

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
              url: imageUrl,
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
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 900,
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

    if (!raw) {
      return res.status(500).json({
        error: "La IA no devolvió contenido",
      });
    }

    let parsed: any = null;

    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError, raw);
      return res.status(500).json({
        error: "La IA devolvió una respuesta no válida",
        raw,
      });
    }

    return res.status(200).json({
      ok: true,
      result: parsed,
    });
  } catch (error: any) {
    console.error("VERIFY DOCUMENT SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
