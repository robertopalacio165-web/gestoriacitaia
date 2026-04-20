import type { VercelRequest, VercelResponse } from "@vercel/node";

type Lang = "darija" | "es" | "en";

function detectUserLanguage(message: string): Lang {
  const text = (message || "").toLowerCase().trim();
  if (/[\u0600-\u06FF]/.test(text)) return "darija";
  const darijaSignals = ["salam", "slm", "bghit", "dyal", "khassni", "ghadi", "nched", "rdv", "shukran", "labas"];
  if (darijaSignals.some((w) => text.includes(w))) return "darija";
  return "es";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { message, assistant, history, leadForm } = req.body;
    const lang = detectUserLanguage(message);
    
    // IMPORTANTE: Ahora el código respeta los prompts de voz y letras árabes
    const systemPrompt = assistant === "sara" 
      ? `Eres Sara. Responde SIEMPRE en DARIJA MARROQUÍ DE CALLE usando LETRAS ÁRABES. Máximo 15 palabras. Estilo humano y rápido.`
      : `Eres Mohamed. Responde SIEMPRE en DARIJA MARROQUÍ DE CALLE usando LETRAS ÁRABES. Máximo 15 palabras. Estilo experto en extranjería.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Mantenemos el mini para que el audio vuele
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-6).map((h: any) => ({ 
            role: h.from === "user" ? "user" : "assistant", 
            content: h.text 
          })),
          { role: "user", content: message }
        ],
        temperature: 0.3, // Bajamos la temperatura para que sea más preciso
        max_tokens: 150
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "دبا نجاوبك، عاود عافاك؟";

    // Webhook para Make (CRM) - Se mantiene igual
    const webhookUrl = assistant === "sara" ? process.env.MAKE_WEBHOOK_SARA : process.env.MAKE_WEBHOOK_MOHAMED;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, reply, assistant, lang, leadForm, date: new Date().toISOString() })
      }).catch(() => {});
    }

    return res.status(200).json({ reply, meta: { assistant, lang } });
  } catch (error: any) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Error interno en el chat" });
  }
}
