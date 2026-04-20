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

// AJUSTE CRÍTICO: Configuración de voz específica para realismo
function buildVoiceSettings(lang: "es" | "darija" | "en") {
  if (lang === "darija") {
    return {
      stability: 0.35,       // Bajamos la estabilidad para que tenga más "alma" y ritmo marroquí
      similarity_boost: 0.85, // Subimos el parecido para mantener la esencia de Sara/Mohamed
      style: 0.45,           // Subimos el estilo para capturar la exageración natural del Darija
      use_speaker_boost: true,
    };
  }
  return {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  };
}

function pickModelId(lang: "es" | "darija" | "en") {
  // El modelo Turbo v2.5 es mucho más rápido y fluido para Darija si está disponible, 
  // pero Multilingual v2 es el estándar de oro para calidad.
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
      return res.status(500).json({ error: "Falta ELEVENLABS_API_KEY" });
    }

    const text = safeText(req.body?.text);
    const assistant = pickAssistant(req.body?.assistant);
    const lang = safeLang(req.body?.lang);
    const voiceId = pickVoiceId(assistant);

    if (!text) {
      return res.status(400).json({ error: "Falta text" });
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
          // Pasamos el idioma para aplicar los ajustes dinámicos
          voice_settings: buildVoiceSettings(lang),
        }),
      }
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text().catch(() => "");
      return res.status(elevenResponse.status).json({
        error: "Error con ElevenLabs",
        details: errorText,
      });
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(audioBuffer);
    
  } catch (error: any) {
    return res.status(500).json({ error: error?.message });
  }
}
