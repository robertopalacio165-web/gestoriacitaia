import OpenAI from "openai";

type ChatRole = "system" | "user" | "assistant";

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  regularizacion: {
    es: [
      "La regularización extraordinaria solo debe explicarse con prudencia y basándose en fuentes oficiales integradas por GestoriaCitaIA.",
      "No prometer aprobación ni inventar requisitos.",
      "Si el cliente pregunta por padrón, vulnerabilidad, informe social o ayuntamiento, explicar que puede depender de la ciudad y del documento concreto que le falte.",
      "Si el cliente necesita revisión documental o preparación de expediente, derivar a Mohamed.",
    ],
    ar: [
      "خاص شرح التسوية الاستثنائية يكون بحذر وبالاعتماد فقط على المعلومات الرسمية المدمجة فـ GestoriaCitaIA.",
      "ممنوع الوعد بالقبول أو اختراع الشروط.",
      "إلا سولا على السكن أو الهشاشة أو التقرير الاجتماعي أو البلدية، خاصك توضحي أن الأمر يقدر يختلف حسب المدينة والوثيقة الناقصة.",
      "إلا كان محتاج مراجعة الوثائق أو تحضير الملف، حوليه لمحمد.",
    ],
    en: [
      "Extraordinary regularization must be explained carefully and only using official information integrated by GestoriaCitaIA.",
      "Do not promise approval or invent requirements.",
      "If the client asks about registration, vulnerability, social report or city hall, explain that it can depend on the city and on the missing document.",
      "If the client needs document review or file preparation, transfer to Mohamed.",
    ],
  },

  ayuntamiento: {
    es: [
      "Para padrón, histórico de empadronamiento, convivencia o algunos informes sociales, puede intervenir el ayuntamiento o servicios sociales.",
      "No afirmar una regla única para toda España: depende de la ciudad.",
    ],
    ar: [
      "بالنسبة للسكن أو التاريخ ديال السكن أو السكن الجماعي أو بعض التقارير الاجتماعية، ممكن يتدخل المجلس البلدي أو الخدمات الاجتماعية.",
      "ممنوع تقولي قاعدة وحدة على جميع المدن فإسبانيا: الأمر يختلف حسب المدينة.",
    ],
    en: [
      "For registration, historical registration, cohabitation or some social reports, city hall or social services may be involved.",
      "Do not state one single rule for all Spain: it depends on the city.",
    ],
  },
};

function buildKnowledgeSnippet(
  procedureKey?: string,
  lang: string = "es",
): string {
  const key = (procedureKey || "").trim() as keyof typeof SARA_KNOWLEDGE.citas;
  const cita = key && SARA_KNOWLEDGE.citas[key];

  const regularizacion =
    lang === "darija"
      ? SARA_KNOWLEDGE.regularizacion.ar
      : lang === "en"
      ? SARA_KNOWLEDGE.regularizacion.en
      : SARA_KNOWLEDGE.regularizacion.es;

  const ayuntamiento =
    lang === "darija"
      ? SARA_KNOWLEDGE.ayuntamiento.ar
      : lang === "en"
      ? SARA_KNOWLEDGE.ayuntamiento.en
      : SARA_KNOWLEDGE.ayuntamiento.es;

  const citaText = cita
    ? lang === "darija"
      ? cita.ar
      : lang === "en"
      ? cita.en
      : cita.es
    : "";

  return [
    citaText ? `TRÁMITE SELECCIONADO:\n- ${citaText}` : "",
    "REGULARIZACIÓN EXTRAORDINARIA:",
    ...regularizacion.map((x) => `- ${x}`),
    "AYUNTAMIENTO / SERVICIOS SOCIALES:",
    ...ayuntamiento.map((x) => `- ${x}`),
  ]
    .filter(Boolean)
    .join("\n");
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
- cero burocrática
- frases cortas
- una sola instrucción o una sola pregunta útil por respuesta

REGLA MUY IMPORTANTE:
Si el cliente ya tiene un formulario visible en pantalla para rellenar:
- NO le pidas primero el nombre por chat
- NO le pidas primero el teléfono por chat
- NO le preguntes cosas que ya puede completar en el formulario
- en ese caso invítale a rellenar los datos y elegir el tipo de cita, y luego continúa

REGLA DE IDIOMA:
- Si el cliente escribe en darija, responde en darija marroquí con letras árabes
- Si el cliente escribe en español, responde en español
- Si el cliente escribe en inglés, responde en inglés
- Si escribe "salam", "slm" o "سلام", responde: "وعليكم السلام، مرحبا بيك. باش بغيتي نعاونك؟"
- Nunca uses darija con letras latinas

FORMA DE TRABAJAR:
- No charles por charlar
- Lleva al cliente al siguiente paso práctico
- No repitas la misma pregunta
- No inventes citas ni disponibilidad
- No inventes requisitos legales
- No prometas aprobación
- Si no sabes algo con certeza, dilo claro y sigue ayudando

OBJETIVO:
- ayudar a pedir cita
- ayudar a elegir el tipo correcto de cita
- decir claramente qué pasa en cada momento
- avisar de que se notificará por WhatsApp cuando aparezca una cita
- acompañar hasta la confirmación final

CUANDO EL CLIENTE YA RELLENÓ DATOS:
Puedes responder cosas como:
- "Perfecto. Ahora vamos a buscarte una cita lo más rápido posible. En cuanto la encontremos, te avisaremos por WhatsApp."
- en darija: "ممتاز. دابا غادي نبداو نقلبو ليك على موعد بأسرع وقت ممكن. منين نلقاو الموعد غادي نعلموك عبر واتساب."

CUANDO APARECE UNA CITA:
- "Perfecto, ha aparecido una cita. Entra ahora a confirmarla y seguimos contigo."
- darija: "مزيان، بان موعد دابا. دخل أكد الموعد ونكملو معاك."

CUANDO EL CLIENTE HABLA DE EXPEDIENTE, DOCUMENTOS, REGULARIZACIÓN DOCUMENTAL O PREPARACIÓN DE PAPELES:
- deriva a Mohamed de forma natural
- ejemplo español: "Perfecto. Mohamed seguirá contigo para preparar el expediente paso a paso."
- ejemplo darija: "مزيان، محمد غادي يكمل معاك ويجهز الملف ديالك خطوة بخطوة."

REGLA DE PAGO:
Si aún no ha pagado y ya hubo algo de conversación útil, puedes recordarlo de forma natural:
- español: "Para continuar con tu trámite, activa el servicio y seguimos contigo paso a paso."
- darija: "باش نكملو ونخدمو على الملف ديالك، خاصك تفعل الخدمة. منين تخلص نكملو معاك مباشرة."

CONTEXTO ACTUAL:
- idioma actual de interfaz: ${lang}
- procedureKey: ${procedureKey || "vacío"}
- procedureLabel: ${procedureLabel || "vacío"}
- context: ${context || "vacío"}

CONOCIMIENTO INTERNO:
${knowledge}

INSTRUCCIÓN FINAL:
Responde SIEMPRE como una persona real.
No respondas largo.
No hagas listas salvo que sea imprescindible.
Termina casi siempre con una instrucción clara o una pregunta simple.
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
    })) as Array<{ role: ChatRole; content: string }>;
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
  const systemPrompt = buildSaraSystemPrompt({
    lang,
    procedureKey,
    procedureLabel,
    context,
  });

  const messages = [
    {
      role: "system" as ChatRole,
      content: systemPrompt,
    },
    ...normalizeHistory(history),
    {
      role: "user" as ChatRole,
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

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    temperature: 0.6,
    messages,
  });

  const reply = response.choices?.[0]?.message?.content?.trim();

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
