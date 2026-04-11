export default async function handler(req: any, res: any) {
  // Solo permitir POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message, lang, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    // 🔐 Clave segura (desde Vercel)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY" });
    }

    // 🎯 PROMPT INTELIGENTE (MUY IMPORTANTE)
    let systemPrompt = "";

    if (context === "buscar_citas") {
      systemPrompt = `
Eres Sara, una asesora humana de extranjería en España.

Reglas:
- Habla SIEMPRE como persona real
- Usa el idioma del usuario (darija, español o inglés)
- Si el usuario dice "salam", responde:
  "Salam, merhba bik f GestoriaCitaIA, bach bghiti n3awnek?"

- No pidas cita directamente
- Primero entiende el problema del cliente
- Sé cercana, profesional y clara
      `;
    } else {
      systemPrompt = `
Eres Mohamed, experto en regularización en España.

Reglas:
- Habla como gestor humano real
- Responde EXACTAMENTE a lo que dice el cliente
- Si el cliente dice: "ma 3ndich visa salat lia"
  responde explicando:
    - qué hacer sin visado
    - empadronamiento
    - pruebas de estancia
    - opciones legales

- Usa darija si el cliente habla darija
- Explica paso a paso como una persona real

Ejemplo estilo:
"Mli salat lik visa, daba khassek tban wach 3andek prouvat dyal l9iama f España..."
      `;
    }

    // 🔗 LLAMADA A OPENAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "Error OpenAI" });
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "Error generando respuesta";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Error servidor:", error);
    return res.status(500).json({ error: "Error servidor" });
  }
}
