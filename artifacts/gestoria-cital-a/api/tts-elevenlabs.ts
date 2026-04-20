import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { text, assistant, lang } = req.body;
    const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();

    // IDs de tus voces Ghizlane (Sara) y Jawad (Mohamed)
    const voiceId = assistant === "sara"
      ? (process.env.ELEVENLABS_VOICE_ID_SARA || "").trim()
      : (process.env.ELEVENLABS_VOICE_ID_MOHAMED || "").trim();

    if (!text || !voiceId || !apiKey) {
      return res.status(400).json({ error: "Faltan parámetros: text, voiceId o API Key" });
    }

    // CONFIGURACIÓN DE VOZ HUMANA
    // Para Darija bajamos la estabilidad a 0.35 para que la voz tenga "movimiento"
    const voiceSettings = lang === "darija" 
      ? {
          stability: 0.35,
          similarity_boost: 0.85,
          style: 0.50, // Más estilo para captar el acento marroquí
          use_speaker_boost: true,
        }
      : {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.35,
          use_speaker_boost: true,
        };

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2", // El mejor para Darija
          voice_settings: voiceSettings,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: "Error ElevenLabs", details: errorData });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audioBuffer);

  } catch (error: any) {
    console.error("TTS SERVER ERROR:", error);
    return res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
}
