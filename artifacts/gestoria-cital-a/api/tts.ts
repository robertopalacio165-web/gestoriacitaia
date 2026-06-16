import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voice = "alloy" } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: voice, // alloy, echo, fable, onyx, nova, shimmer
        input: text,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error TTS OpenAI:", error);
      return NextResponse.json({ error: "Error generando audio" }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error en TTS:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
