import type { VercelRequest, VercelResponse } from "@vercel/node";

type Lang = "darija" | "es";

function detectUserLanguage(message: string): Lang {
  const text = (message || "").toLowerCase().trim();
  // Si hay caracteres árabes, es Darija
  if (/[\u0600-\u06FF]/.test(text)) return "darija";
  // Señales de Darija en letras latinas
  const darijaSignals = ["salam", "slm", "bghit", "dyal", "khassni", "ghadi", "nched", "rdv", "shukran", "labas"];
  if (darijaSignals.some((w) => text.includes(w))) return "darija";
  return "es";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { message, assistant, history, leadForm } = req.body;
    const lang = detectUserLanguage(message);
    
    // PROMPT DINÁMICO: Forzamos Darija en letras árabes para el motor de voz
    const systemPrompt = assistant === "sara" 
      ? `Eres Sara, experta en citas. Responde SIEMPRE en DARIJA MARROQUÍ DE CALLE usando LETRAS ÁRABES. Sé muy corta (máximo 15 palabras) y humana. No uses árabe formal ni inglés.`
      : `Eres Mohamed, experto en la Regularización 2026. Responde SIEMPRE en DARIJA MARROQUÍ DE CALLE usando LETRAS ÁRABES. Sé muy corto (máximo 15 palabras). Ve directo al grano con los documentos y el formulario.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cambiado a mini para velocidad ultra rápida
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-6).map((h: any) => ({ 
            role: h.from === "user" ? "user" : "assistant", 
            content: h.text 
          })),
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 100, // Respuestas cortas para que el audio no tarde nada
        presence_penalty: 0.6
      }),
    });

    const data = await response.json();
    
    // Si la IA falla, responde por defecto en Darija
    const reply = data.choices?.[0]?.message?.content || "دبا نجاوبك، عاود عافاك؟";

    // Webhook para el CRM (Make)
    const webhookUrl = assistant === "sara" ? process.env.MAKE_WEBHOOK_SARA : process.env.MAKE_WEBHOOK_MOHAMED;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message, 
          reply, 
          assistant, 
          lang, 
          leadForm, 
          date: new Date().toISOString() 
        })
      }).catch(() => {});
    }

    // Devolvemos la respuesta para que el chat la pinte y ElevenLabs la lea
    return res.status(200).json({ reply, meta: { assistant, lang } });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Error interno en el chat" });
  }
}
