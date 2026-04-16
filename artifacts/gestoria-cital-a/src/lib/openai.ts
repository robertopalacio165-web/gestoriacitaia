type ChatHistoryItem = {
  from: "agent" | "user";
  text: string;
};

type EnviarMensajeSaraInput = {
  message: string;
  lang?: string;
  procedureKey?: string;
  procedureLabel?: string;
  sessionId?: string;
  userId?: string;
  history?: ChatHistoryItem[];
  context?: string;
};

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";

const SARA_KNOWLEDGE = {
  citas: {
    tie: {
      es: "Renovación o expedición de Tarjeta de Identidad de Extranjero (TIE).",
      ar: "تجديد أو استخراج بطاقة هوية الأجنبي (TIE).",
      en: "Renewal or issuance of the Foreigner Identity Card (TIE).",
    },
    regreso: {
      es: "Autorización de regreso para volver a España.",
      ar: "رخصة الرجوع للعودة إلى إسبانيا.",
      en: "Return authorization to come back to Spain.",
    },
    nie: {
      es: "Asignación o certificado de NIE.",
      ar: "تعيين أو شهادة NIE.",
      en: "NIE assignment or certificate.",
    },
    ue: {
      es: "Certificados y trámites para ciudadanos de la Unión Europea.",
      ar: "شواهد وإجراءات مواطني الاتحاد الأوروبي.",
      en: "Certificates and procedures for EU citizens.",
    },
    estudiantes: {
      es: "Trámites de estancia o autorización para estudiantes.",
      ar: "إجراءات الإقامة أو الترخيص للطلبة.",
      en: "Stay or authorization procedures for students.",
    },
    trabajo: {
      es: "Autorización relacionada con trabajo o residencia y trabajo.",
      ar: "ترخيص متعلق بالعمل أو الإقامة والعمل.",
      en: "Authorization related to work or residence and work.",
    },
    arraigo: {
      es: "Trámite de arraigo social, sociolaboral o familiar, según el caso.",
      ar: "إجراء الأرايغو الاجتماعي أو المهني أو العائلي حسب الحالة.",
      en: "Rootedness procedure: social, work-related or family, depending on the case.",
    },
    familiar: {
      es: "Reagrupación o trámite vinculado a familiar.",
      ar: "التجمع العائلي أو إجراء مرتبط بالعائلة.",
      en: "Family reunification or family-related procedure.",
    },
  },
};

function buildKnowledgeSnippet(
  procedureKey?: string,
  lang: string = "es",
): string {
  const key = (procedureKey || "").trim() as keyof typeof SARA_KNOWLEDGE.citas;
  const cita = key && SARA_KNOWLEDGE.citas[key];

  if (!cita) return "";

  if (lang === "darija") return cita.ar;
  if (lang === "en") return cita.en;
  return cita.es;
}

function buildSaraSystemPrompt(params: {
  lang?: string;
  procedureKey?: string;
  procedureLabel?: string;
  context?: string;
}) {
  const { lang = "es", procedureKey = "", procedureLabel = "", context = "" } =
    params;

  const knowledge = buildKnowledgeSnippet(procedureKey, lang);

  return `
Eres SARA, asesora experta en citas de extranjería en España dentro de GestoriaCitaIA.

Tu estilo:
- humana
- rápida
- profesional
- tranquila
- cero robótica
- frases cortas
- una sola instrucción o una sola pregunta útil por respuesta

REGLAS:
- Si el cliente ya tiene un formulario visible, NO le pidas primero nombre o teléfono por chat
- Si escribe en darija, responde en darija marroquí con letras árabes
- Si escribe en español, responde en español
- Si escribe en inglés, responde en inglés
- Si escribe "salam", "slm" o "سلام", responde: "وعليكم السلام، مرحبا بيك. باش بغيتي نعاونك؟"
- No inventes citas
- No inventes requisitos legales
- No prometas aprobación
- Si habla de expediente o documentos complejos, puedes derivar a Mohamed
- Si ya dejó sus datos, recuérdale que se le avisará por WhatsApp cuando aparezca una cita

CONTEXTO ACTUAL:
- idioma UI: ${lang}
- procedureKey: ${procedureKey || "vacío"}
- procedureLabel: ${procedureLabel || "vacío"}
- context: ${context || "vacío"}

TRÁMITE SELECCIONADO:
${knowledge || "No especificado"}

Responde como persona real.
No respondas largo.
Termina con un siguiente paso claro o una pregunta simple.
`;
}

function normalizeHistory(history?: ChatHistoryItem[]) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item?.text?.trim())
    .slice(-10)
    .map((item) => ({
      role: item.from === "user" ? "user" : "assistant",
      content: item.text.trim(),
    }));
}

export async function enviarMensajeSara({
  message,
  lang = "es",
  procedureKey = "",
  procedureLabel = "",
  sessionId = "",
  userId = "",
  history = [],
  context = "buscar_citas",
}: EnviarMensajeSaraInput): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY o VITE_OPENAI_API_KEY");
  }

  const systemPrompt = buildSaraSystemPrompt({
    lang,
    procedureKey,
    procedureLabel,
    context,
  });

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...normalizeHistory(history),
    {
      role: "user",
      content: [
        `MENSAJE DEL CLIENTE: ${message}`,
        `IDIOMA UI: ${lang}`,
        `SESSION ID: ${sessionId || "vacío"}`,
        `USER ID: ${userId || "vacío"}`,
        `PROCEDURE KEY: ${procedureKey || "vacío"}`,
        `PROCEDURE LABEL: ${procedureLabel || "vacío"}`,
      ].join("\n"),
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      messages,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error OpenAI Sara: ${errorText}`);
  }

  const data = await res.json();

  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    if (lang === "darija") {
      return "سمح ليا، وقع مشكل بسيط. كتب ليا سؤالك بطريقة قصيرة ونكملو.";
    }
    if (lang === "en") {
      return "Sorry, there was a small issue. Write your question briefly and we continue.";
    }
    return "Lo siento, hubo un pequeño problema. Escríbeme tu duda de forma breve y continuamos.";
  }

  return reply;
}
