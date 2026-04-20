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

function buildVoiceSettings() {
  return {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  };
}

function pickModelId(lang: "es" | "darija" | "en") {
  if (lang === "darija") return "eleven_multilingual_v2";
  if (lang === "en") return "eleven_flash_v2_5";
  return "eleven_multilingual_v2";
}

function pickVoiceId(assistant: AssistantType) {
  if (assistant === "sara") {
    return process.env.ELEVENLABS_VOICE_ID_SARA || "";
  }
  return process.env.ELEVENLABS_VOICE_ID_MOHAMED || "";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Falta ELEVENLABS_API_KEY en Vercel",
      });
    }

    const text = safeText(req.body?.text);
    const assistant = pickAssistant(req.body?.assistant);
    const lang = safeLang(req.body?.lang);
    const voiceId = pickVoiceId(assistant);

    if (!text) {
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
          voice_settings: buildVoiceSettings(),
        }),
      }
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text().catch(() => "");
      console.error("ELEVENLABS TTS ERROR:", errorText);

      return res.status(500).json({
        error: "Error generando audio con ElevenLabs",
        details: errorText || null,
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
