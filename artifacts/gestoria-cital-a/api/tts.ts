export default async function handler(req, res) {
  try {
    const { text, voice = "alloy" } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Texto vacío" });
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: voice,
        input: text,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error TTS OpenAI:", error);
      return res.status(response.status).json({ error: "Error generando audio" });
    }

    const audioBuffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error("Error en TTS:", error);
    res.status(500).json({ error: "Error interno" });
  }
}
