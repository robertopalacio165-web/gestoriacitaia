import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { message, assistant, history } = req.body;
    
    // Forzamos a la IA a escribir fonéticamente para que ElevenLabs lo lea mejor
    const systemPrompt = assistant === "sara" 
      ? `Eres Sara. Habla 100% DARIJA MARROQUÍ DE CALLE. Usa letras árabes. 
         IMPORTANTE: Escribe de forma sencilla, como se pronuncia en la calle, para que la voz suene natural. 
         Máximo 15 palabras.`
      : `Eres Mohamed. Habla 100% DARIJA MARROQUÍ DE CALLE. Usa letras árabes. 
         IMPORTANTE: Escribe como se habla en Marruecos, usa expresiones reales de la calle. 
         Máximo 15 palabras.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-4).map((h: any) => ({ 
            role: h.from === "user" ? "user" : "assistant", 
            content: h.text 
          })),
          { role: "user", content: message }
        ],
        temperature: 0.5, // Un poco más alto hace que la voz sea menos robótica
        max_tokens: 80,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "سمح ليا، عاود عافاك؟";

    // DEVOLVEMOS LA RESPUESTA
    // "meta: lang: 'ar'" es el truco para que ElevenLabs use el motor árabe-marroquí
    return res.status(200).json({ 
      reply, 
      meta: { assistant, lang: "ar" } 
    });

  } catch (error: any) {
    return res.status(500).json({ error: "Error" });
  }
}
