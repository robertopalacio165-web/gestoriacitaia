import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { text, assistant, lang } = req.body;
    
    // Selección de voz basada en las variables de entorno que tienes en Vercel
    const voiceId = assistant === "sara" 
      ? process.env.ELEVENLABS_VOICE_ID_SARA 
      : process.env.ELEVENLABS_VOICE_ID_MOHAMED;

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!voiceId || !apiKey) {
      return res.status(400).json({ error: "Faltan IDs de voz o API Key en Vercel" });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { 
          stability: 0.40, 
          similarity_boost: 0.80, 
          style: 0.50,
          use_speaker_boost: true 
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "ElevenLabs Error", details: errorText });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audioBuffer);

  } catch (error: any) {
    console.error("TTS Error:", error);
    return res.status(500).json({ error: error.message || "Error generando audio" });
  }
}
