import type { VercelRequest, VercelResponse } from "@vercel/node";

type Lang = "darija" | "es" | "en";

function detectUserLanguage(message: string): Lang {
  const text = (message || "").toLowerCase().trim();
  // Detecta caracteres árabes
  if (/[\u0600-\u06FF]/.test(text)) return "darija";
  // Detecta palabras clave de Darija en letras latinas
  const darijaSignals = ["salam", "slm", "bghit", "dyal", "khassni", "ghadi", "nched", "rdv", "shukran", "labas"];
  if (darijaSignals.some((w) => text.includes(w))) return "darija";
  return "es";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { message, assistant, history, leadForm } = req.body;
    const lang = detectUserLanguage(message);
    
    // Configuración de los prompts de sistema
    const systemPrompt = assistant === "sara" 
      ? `Eres Sara, asesora experta en CITAS de extranjería en GestoriaCitaIA. Tu tono es dulce, servicial y muy rápido. Responde en máximo 2 líneas. Si el cliente habla en Darija, responde exclusivamente en Arabizi (letras latinas).`
      : `Eres Mohamed, asesor experto en REGULARIZACIÓN 2026 en GestoriaCitaIA. Tu tono es profesional y directo. Te enfocas en ayudar con el expediente y las pruebas de 5 meses. Si el cliente habla en Darija, responde exclusivamente en Arabizi (letras latinas).`;

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
        temperature: 0.4,
        max_tokens: 150
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Daba n-jawbek, 3awed afak?";

    // Webhook opcional para Make (CRM)
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
