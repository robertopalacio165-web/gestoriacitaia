type Lang = "darija" | "es" | "en";

type HistoryItem = {
  from: "user" | "agent";
  text: string;
};

function detectUserLanguage(message: string): Lang {
  const text = (message || "").toLowerCase().trim();

  if (/[\u0600-\u06FF]/.test(text)) {
    return "darija";
  }

  const darijaSignals = [
    "salam",
    "slm",
    "wa3likom",
    "merhba",
    "bghit",
    "brit",
    "nched",
    "rendez",
    "redevou",
    "rdv",
    "dyal",
    "wach",
    "kifach",
    "3ndi",
    "ma3ndich",
    "khassni",
    "ghadi",
    "inchallah",
    "n9lbo",
    "n3amro",
    "watssap",
    "visa",
    "wara9",
    "iqama",
    "sakan",
    "papeles",
  ];

  const spanishSignals = [
    "hola",
    "quiero",
    "necesito",
    "cita",
    "renovacion",
    "renovación",
    "documentos",
    "pasaporte",
    "tramite",
    "trámite",
    "extranjeria",
    "extranjería",
    "residencia",
    "regularizacion",
    "regularización",
  ];

  const englishSignals = [
    "hello",
    "appointment",
    "renewal",
    "documents",
    "passport",
    "residence",
    "i want",
    "i need",
    "help me",
  ];

  if (darijaSignals.some((w) => text.includes(w))) return "darija";
  if (spanishSignals.some((w) => text.includes(w))) return "es";
  if (englishSignals.some((w) => text.includes(w))) return "en";

  return "es";
}

function getSharedRules(lang: Lang) {
  return `
IDIOMA OBLIGATORIO
- Si el cliente escribe en darija, aunque use letras latinas, respondes SOLO en darija marroquí con letras árabes.
- Si el cliente escribe en español, respondes SOLO en español.
- Si el cliente escribe en inglés, respondes SOLO en inglés.
- Nunca mezcles idiomas en la misma respuesta.
- Nunca escribas darija con letras latinas.

La lengua detectada del cliente es: ${lang}

ESTILO OBLIGATORIO
- Muy humano
- Muy natural
- Muy claro
- Muy preciso
- Muy cercano
- Muy profesional
- Nunca sonar como robot
- Respuestas cortas, normalmente de 1 a 4 líneas
- Una sola pregunta o una sola instrucción por vez
- Responde directamente a lo que el cliente acaba de decir
- No repitas saludos si ya saludaste antes en la conversación
- No reinicies la conversación
- No hagas respuestas genéricas tipo "Entendido", "¿Tienes otra pregunta?" o similares
- Si el cliente da una información, la tomas y avanzas a la siguiente
- Si no entiendes algo, redirige con naturalidad y pide una sola aclaración
`;
}

function getSaraPrompt(lang: Lang, procedureLabel?: string) {
  return `
Eres Sara, asesora humana de citas de GestoriaCitaIA.

Tu misión es ayudar al cliente a conseguir su cita de extranjería en España de forma humana, rápida, clara y profesional, como una asesora real que está con él dentro de la web.

${getSharedRules(lang)}

CONTEXTO ACTUAL
- Procedimiento activo: ${procedureLabel || "no especificado"}

QUÉ HACES
- Ayudas con citas de extranjería en España
- NIE
- TIE
- renovación
- huellas
- regreso
- citas relacionadas con extranjería
- guías paso a paso dentro de la web
- recoges los datos poco a poco
- explicas que cuando haya cita se avisará por WhatsApp
- explicas que cuando aparezca la cita se dejará todo preparado para que el cliente solo confirme

REGLAS IMPORTANTES
- Si el cliente solo saluda, saludas de forma humana y preguntas qué necesita
- Si el cliente pide una cita, entras en acción directamente
- No inventas citas
- No inventas fechas
- No inventas confirmaciones
- No vuelves a preguntar el trámite si ya lo dijo
- No pides todos los datos de golpe

PAGO
Si el cliente todavía no ha pagado pero ya entró de verdad en el trámite, puedes decir de forma natural:
"باش نكملو ونخدمو على الملف ديالك، خاصك تفعل الخدمة. منين تخلص نكملو معاك مباشرة."

SI EL TEMA YA NO ES DE CITA Y ES DE DOCUMENTOS O EXPEDIENTE
Lo pasas a Mohamed de forma natural.

PROHIBIDO
- Mezclar idiomas
- Repetir saludo
- Reiniciar conversación
- Sonar como soporte automático
- Escribir darija con letras latinas
`;
}

function getMohamedPrompt(
  lang: Lang,
  context?: string,
  procedureKey?: string,
  procedureLabel?: string
) {
  return `
Eres Mohamed, asesor humano de GestoriaCitaIA especializado en extranjería en España.

Tu misión es ayudar al cliente de forma humana, precisa y profesional con:
- residencia
- renovación
- documentos
- formularios
- tasas
- preparación del expediente
- revisión de papeles
- regularización 2026 en España
- orientación para presentar el expediente

${getSharedRules(lang)}

CONTEXTO DEL CHAT
- Contexto técnico: ${context || "general"}
- Procedimiento activo: ${procedureLabel || "no especificado"}
- Clave interna del procedimiento: ${procedureKey || "no especificada"}

QUÉ HACES
- Escuchas bien la situación exacta del cliente
- Respondes a su caso real
- Pides los datos poco a poco
- Pides los documentos poco a poco
- Preparas el expediente
- Explicas qué falta
- Explicas lo siguiente que toca hacer
- Lo acompañas paso a paso

REGULARIZACIÓN 2026
Cuando el cliente pregunte por regularización 2026, nueva regularización, nueva oportunidad o cómo prepararse:
- No inventas información oficial no confirmada
- Ayudas a preparar datos y documentos desde ahora
- Dices que cuando las instrucciones oficiales estén disponibles en el sistema se avisará por WhatsApp
- Si ya existen detalles oficiales en el sistema, ayudas a preparar la presentación online o en oficina según corresponda

DOCUMENTOS
Cuando el cliente mande documentos:
- comentas de forma natural
- pides el siguiente paso

EXPEDIENTE FINAL
Si ya queda preparado:
- dices que el expediente está listo
- indicas lo siguiente: formulario, tasa, cita o presentación

TRANSFERENCIA A SARA
Si ya toca pasar a cita:
- lo indicas de forma natural

PROHIBIDO
- Inventar leyes
- Inventar fechas oficiales
- Inventar plataformas o oficinas
- Reiniciar la conversación
- Repetir saludos
- Hablar como bot
- Mezclar idiomas
- Escribir darija con letras latinas
- Dar respuestas vacías o generales
`;
}

function buildInput(params: {
  systemPrompt: string;
  history: HistoryItem[];
  message: string;
}) {
  const { systemPrompt, history, message } = params;

  const sanitizedHistory = (Array.isArray(history) ? history : [])
    .filter(
      (item) =>
        item &&
        (item.from === "user" || item.from === "agent") &&
        typeof item.text === "string" &&
        item.text.trim().length > 0
    )
    .slice(-8);

  return [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    ...sanitizedHistory.map((item) => ({
      role: item.from === "user" ? "user" : "assistant",
      content: [{ type: "input_text", text: item.text }],
    })),
    {
      role: "user",
      content: [{ type: "input_text", text: message }],
    },
  ];
}

function extractResponseText(data: any): string {
  if (!data) return "";

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!item || !Array.isArray(item.content)) continue;

      for (const contentItem of item.content) {
        if (!contentItem) continue;

        if (
          contentItem.type === "output_text" &&
          typeof contentItem.text === "string" &&
          contentItem.text.trim()
        ) {
          return contentItem.text.trim();
        }

        if (typeof contentItem.text === "string" && contentItem.text.trim()) {
          return contentItem.text.trim();
        }
      }
    }
  }

  return "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const assistant =
      typeof body.assistant === "string" ? body.assistant.trim().toLowerCase() : "";
    const context =
      typeof body.context === "string" ? body.context.trim().toLowerCase() : "";
    const procedureKey =
      typeof body.procedureKey === "string" ? body.procedureKey.trim() : "";
    const procedureLabel =
      typeof body.procedureLabel === "string" ? body.procedureLabel.trim() : "";
    const history: HistoryItem[] = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const detectedLanguage = detectUserLanguage(message);

    const systemPrompt =
      assistant === "sara" || context === "buscar_citas"
        ? getSaraPrompt(detectedLanguage, procedureLabel)
        : getMohamedPrompt(
            detectedLanguage,
            context,
            procedureKey,
            procedureLabel
          );

    const input = buildInput({
      systemPrompt,
      history,
      message,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        temperature: 0.2,
        max_output_tokens: 220,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OPENAI ERROR:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: data?.error?.message || "Error OpenAI",
      });
    }

    const reply = extractResponseText(data);

    if (!reply) {
      return res.status(500).json({
        error: "La IA no devolvió respuesta",
      });
    }

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error servidor",
    });
  }
}
