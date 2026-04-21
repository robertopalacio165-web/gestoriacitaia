import type { VercelRequest, VercelResponse } from "@vercel/node";

type AssistantType = "mohamed" | "sara";

function pickAssistant(value: unknown): AssistantType {
  return value === "sara" ? "sara" : "mohamed";
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLang(value: unknown): "es" | "darija" | "en" {
  if (value === "darija" || value === "en" || value === "es") return value;
  return "es";
}

function normalizeForSpeech(text: string, lang: "es" | "darija" | "en") {
  let t = (text || "").trim();

  t = t.replace(/\s+/g, " ").trim();

  t = t.replace(/\bPDF\b/g, "P D F");
  t = t.replace(/\bNIE\b/g, "N I E");
  t = t.replace(/\bTIE\b/g, "T I E");
  t = t.replace(/\bWhatsApp\b/gi, "WhatsApp");

  t = t.replace(/:\s*/g, ". ");
  t = t.replace(/\s*,\s*/g, ", ");
  t = t.replace(/\s*\.\s*/g, ". ");
  t = t.replace(/\s*\?\s*/g, "? ");
  t = t.replace(/\s*!\s*/g, "! ");

  if (lang === "es") {
    t = t
      .replace(/^hola[, ]*/i, "Hola, ")
      .replace(/^perfecto[, ]*/i, "Perfecto, ")
      .replace(/^mira[, ]*/i, "Mira, ");
  }

  if (lang === "darija") {
    t = t
      .replace(/^السلام[, ]*/i, "السلام، ")
      .replace(/^مزيان[, ]*/i, "مزيان، ");
  }

  return t.trim();
}

function buildVoiceSettings(assistant: AssistantType) {
  if (assistant === "sara") {
    return {
      stability: 0.36,
      similarity_boost: 0.88,
      style: 0.22,
      use_speaker_boost: true,
    };
  }

  return {
    stability: 0.42,
    similarity_boost: 0.9,
    style: 0.18,
    use_speaker_boost: true,
  };
}

function pickModelId(lang: "es" | "darija" | "en") {
  if (lang === "darija") return "eleven_multilingual_v2";
  if (lang === "en") return "eleven_multilingual_v2";
  return "eleven_multilingual_v2";
}

function pickVoiceId(assistant: AssistantType) {
  if (assistant === "sara") {
    return (process.env.ELEVENLABS_VOICE_ID_SARA || "").trim();
  }
  return (process.env.ELEVENLABS_VOICE_ID_MOHAMED || "").trim();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({
        error: "Falta ELEVENLABS_API_KEY en Vercel",
      });
    }

    const rawText = safeText(req.body?.text);
    const assistant = pickAssistant(req.body?.assistant);
    const lang = safeLang(req.body?.lang);
    const voiceId = pickVoiceId(assistant);

    if (!rawText) {
      return res.status(400).json({
        error: "Falta text",
      });
    }

    if (!voiceId) {
      return res.status(500).json({
        error:
          assistant === "sara"
            ? "Falta ELEVENLABS_VOICE_ID_SARA en Vercel"
            : "Falta ELEVENLABS_VOICE_ID_MOHAMED en Vercel",
      });
    }

    const text = normalizeForSpeech(rawText, lang);

    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: pickModelId(lang),
          voice_settings: buildVoiceSettings(assistant),
        }),
      }
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text().catch(() => "");
      console.error("ELEVENLABS TTS ERROR RAW:", errorText);

      return res.status(elevenResponse.status).json({
        error: "Error generando audio con ElevenLabs",
        assistant,
        lang,
        voiceId,
        details: errorText || "Sin detalles",
      });
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", audioBuffer.length.toString());

    return res.status(200).send(audioBuffer);
  } catch (error: any) {
    console.error("TTS ELEVENLABS SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
