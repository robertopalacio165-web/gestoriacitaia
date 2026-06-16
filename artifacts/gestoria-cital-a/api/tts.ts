// api/tts.ts - Para proyectos sin Next.js (Vite, React, etc.)

export default async function handler(req: Request) {
  try {
    const { text, voice = "alloy" } = await req.json();

    if (!text || text.trim() === "") {
      return new Response(JSON.stringify({ error: "Texto vacío" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
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
      return new Response(JSON.stringify({ error: "Error generando audio" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error en TTS:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
