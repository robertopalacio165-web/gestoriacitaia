import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { message, assistant, history, leadForm } = req.body;
    
    // FORZAMOS EL IDIOMA: Ignoramos lo que venga del sitio web.
    // La IA solo responderá en Darija Marroquí con letras árabes.
    const systemPrompt = assistant === "sara" 
      ? `ESTRICTO: Solo DARIJA MARROQUÍ DE CALLE (letras árabes). 
         Responde siempre en Darija aunque el usuario te hable en otro idioma.
         Respuesta instantánea de máximo 15 palabras. Eres experta en citas.`
      : `ESTRICTO: Solo DARIJA MARROQUÍ DE CALLE (letras árabes). 
         Responde siempre en Darija aunque el usuario te hable en otro idioma.
         Respuesta instantánea de máximo 15 palabras. Eres experto en regularización 2026.`;

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
          ...(history || []).slice(-6).map((h: any) => ({ 
            role: h.from === "user" ? "user" : "assistant", 
            content: h.text 
          })),
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "دبا نجاوبك، عاود عافاك؟";

    // Webhook para CRM
    const webhookUrl = assistant === "sara" ? process.env.MAKE_WEBHOOK_SARA : process.env.MAKE_WEBHOOK_MOHAMED;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, reply, assistant, lang: "darija", leadForm, date: new Date().toISOString() })
      }).catch(() => {});
    }

    return res.status(200).json({ reply, meta: { assistant, lang: "darija" } });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Error interno en el chat" });
  }
}
