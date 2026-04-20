import type { VercelRequest, VercelResponse } from "@vercel/node";

type Lang = "darija" | "es" | "en";

function detectUserLanguage(message: string): Lang {
  const text = (message || "").toLowerCase().trim();
  if (/[\u0600-\u06FF]/.test(text)) return "darija";
  const darijaSignals = ["salam", "slm", "bghit", "dyal", "khassni", "ghadi", "nched", "rdv"];
  if (darijaSignals.some((w) => text.includes(w))) return "darija";
  return "es";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { message, assistant, history, leadForm } = req.body;
    const lang = detectUserLanguage(message);
    
    // Regla de Oro: Para voz en Darija usamos Arabizi (letras latinas)
    const systemPrompt = assistant === "sara" 
      ? `Eres Sara, asesora de CITAS en GestoriaCitaIA. Habla de forma muy humana, dulce y breve (máximo 2 líneas). Si el cliente habla en Darija, responde SOLO en Arabizi (letras latinas).`
      : `Eres Mohamed, experto en REGULARIZACIÓN 2026. Tu tono es profesional y cercano. Ayuda con el expediente y los 5 meses de pruebas. Si el cliente habla en Darija, responde SOLO en Arabizi (letras latinas).`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cambiado a mini para evitar Error 504 Gateway Timeout
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-6).map((h: any) => ({ 
            role: h.from === "user" ? "user" : "assistant", 
            content: h.text 
          })),
          { role: "user", content: message }
        ],
        temperature: 0.4,
        max_tokens: 150
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Lo siento, puedes repetir?";

    // Registro en Make (Webhooks)
    const webhookUrl = assistant === "sara" ? process.env.MAKE_WEBHOOK_SARA : process.env.MAKE_WEBHOOK_MOHAMED;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, reply, assistant, lang, leadForm })
      }).catch(() => {});
    }

    return res.status(200).json({ reply, meta: { assistant, lang } });
  } catch (error: any) {
    return res.status(500).json({ error: "Error en el servidor de chat" });
  }
}
