import type { VercelRequest, VercelResponse } from "@vercel/node";

// --- TIPOS Y CONFIGURACIÓN ---
type VerifyDocumentLang = "darija" | "es" | "en";
type VerifyDocumentType = "auto" | "passport" | "nie" | "tie" | "empadronamiento" | "criminal_record" | "photo" | "official_form" | "stay_proof" | "supporting_document" | "personal_photo" | "other" | "unknown";
type StayProofStrength = "strong" | "medium" | "weak" | "none";
type RecommendedBucket = "identity_document" | "stay_proof" | "official_form" | "supporting_document" | "personal_photo" | "other";

type VerifyDocumentRequest = {
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
  expectedDocumentType?: string;
  lang?: VerifyDocumentLang;
};

const ALLOWED_DOCUMENT_TYPES: VerifyDocumentType[] = ["auto", "passport", "nie", "tie", "empadronamiento", "criminal_record", "photo", "official_form", "stay_proof", "supporting_document", "personal_photo", "other", "unknown"];

// --- FUNCIONES DE APOYO (NORMALIZACIÓN) ---
function normalizeDocumentType(value?: string | null): VerifyDocumentType | string | null {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "passport" || v === "pasaporte" || v === "passeport") return "passport";
  if (v === "nie" || v.includes("identidad de extranjero")) return "nie";
  if (v === "tie" || v === "tarjeta de residencia") return "tie";
  if (v === "empadronamiento" || v === "padron" || v === "padrón") return "empadronamiento";
  if (v === "stay_proof" || v.includes("permanencia") || v.includes("presencia")) return "stay_proof";
  return v as VerifyDocumentType;
}

function normalizeResult(raw: any, expectedDocumentType: string | null, fileName?: string): any {
  const normalizedType = normalizeDocumentType(raw?.document_type) || "unknown";
  return {
    status: raw?.status || "review",
    document_type: normalizedType,
    full_name: raw?.full_name || null,
    document_number: raw?.document_number || raw?.nie || raw?.passport_number || null,
    is_stay_proof: raw?.is_stay_proof || normalizedType === "stay_proof" || normalizedType === "empadronamiento",
    usable_for_regularizacion_2026: true, // Forzamos true para lógica de negocio 2026
    recommended_bucket: raw?.recommended_bucket || "other",
    summary: raw?.summary || ""
  };
}

// --- PROMPT DEL SISTEMA ---
function buildSystemPrompt(lang: VerifyDocumentLang, expectedType?: string | null) {
  return `Eres un verificador de documentos para GestoriaCitaIA. Analiza la imagen/PDF y extrae los datos. 
  IMPORTANT: Return ONLY a valid JSON object.
  Si el documento demuestra que la persona estuvo en España (factura, ticket, cita médica, padrón), clasifícalo como "stay_proof".
  Campos requeridos en el JSON: status, document_type, full_name, document_number, is_stay_proof, stay_proof_strength, summary.
  Idioma de respuesta para el summary: ${lang === 'darija' ? 'Darija (letras árabes)' : lang}.`;
}

// --- HANDLER PRINCIPAL ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { fileBase64, fileName, mimeType, lang, expectedDocumentType } = req.body as VerifyDocumentRequest;

    if (!fileBase64) return res.status(400).json({ error: "Falta fileBase64" });

    const apiKey = process.env.OPENAI_API_KEY;
    const systemPrompt = buildSystemPrompt(lang || "es", expectedDocumentType);

    // Formatear la imagen para OpenAI (Vision API)
    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${fileBase64}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o", // Usamos el modelo con Vision
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analiza este documento y extrae la información en JSON." },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error?.message || "Error OpenAI Vision");

    const rawResult = JSON.parse(data.choices[0].message.content);
    const finalResult = normalizeResult(rawResult, expectedDocumentType || null, fileName);

    return res.status(200).json({
      ok: true,
      result: finalResult
    });

  } catch (error: any) {
    console.error("VERIFY ERROR:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
