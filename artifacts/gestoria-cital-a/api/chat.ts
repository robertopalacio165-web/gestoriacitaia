type Lang = "darija" | "es" | "en";
type AssistantType = "sara" | "mohamed";

type HistoryItem = {
  from: "user" | "agent";
  text: string;
};

type ExtractedLead = {
  full_name?: string | null;
  phone?: string | null;
  nie?: string | null;
  passport_number?: string | null;
  tramite?: string | null;
  city?: string | null;
};

function detectUserLanguage(message: string): Lang {
  const text = (message || "").trim();
  const lower = text.toLowerCase();

  if (!lower) return "es";

  if (/[\u0600-\u06FF]/.test(text)) {
    return "darija";
  }

  const darijaPatterns = [
    /\bsalam\b/,
    /\bslm\b/,
    /\bsalamo\b/,
    /\b3likom\b/,
    /\bwa3likom\b/,
    /\bmerhba\b/,
    /\bmarhba\b/,
    /\bbghit\b/,
    /\bbrit\b/,
    /\bkhassni\b/,
    /\b3ndi\b/,
    /\bma3ndich\b/,
    /\bwach\b/,
    /\bkifach\b/,
    /\bfin\b/,
    /\bchhal\b/,
    /\bsmiti\b/,
    /\bghadi\b/,
    /\bndir\b/,
    /\bn9der\b/,
    /\bwara9\b/,
    /\bwr9\b/,
    /\bpapiyat\b/,
    /\bpaspor\b/,
    /\bmdina\b/,
    /\bsakan\b/,
    /\bkhdma\b/,
    /\bwalou\b/,
    /\bzwin\b/,
    /\bmzyan\b/,
    /\binshallah\b/,
    /\bafak\b/,
    /\b3afak\b/,
    /\bbaraka\b/,
    /\bshukran\b/,
    /\bchokran\b/,
    /\bwalo\b/,
    /\bmaghribi\b/,
    /\bmaroc\b/,
    /\brdv\b/,
    /\bwatssap\b/,
  ];

  if (darijaPatterns.some((pattern) => pattern.test(lower))) {
    return "darija";
  }

  const englishPatterns = [
    /\bhello\b/,
    /\bhi\b/,
    /\bi need\b/,
    /\bi want\b/,
    /\bappointment\b/,
    /\bpassport\b/,
    /\bdocuments\b/,
    /\bhelp me\b/,
    /\bresidence\b/,
    /\brenewal\b/,
  ];

  if (englishPatterns.some((pattern) => pattern.test(lower))) {
    return "en";
  }

  return "es";
}

function sanitizeHistory(history: unknown): HistoryItem[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (((item as any).from === "user") || (item as any).from === "agent") &&
        typeof (item as any).text === "string" &&
        (item as any).text.trim().length > 0
    )
    .slice(-14) as HistoryItem[];
}

function normalizeLooseText(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFirstName(fullName?: string | null): string | null {
  if (!fullName) return null;
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.split(" ")[0] || null;
}

function extractNameFromMessage(message: string): string | null {
  const original = (message || "").trim();
  if (!original) return null;

  const lines = original
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const directPatterns = [
    /(?:me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ' -]{2,80})/i,
    /(?:soy)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ' -]{2,80})/i,
    /(?:smiti|ana smiti)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ' -]{2,80})/i,
    /(?:my name is|i am)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ' -]{2,80})/i,
  ];

  for (const line of lines) {
    for (const pattern of directPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return match[1].trim().slice(0, 80);
      }
    }
  }

  const plainNameLine = lines.find((line) => {
    const l = normalizeLooseText(line);
    return (
      !l.includes("cita") &&
      !l.includes("regularizacion") &&
      !l.includes("regularización") &&
      !l.includes("tramite") &&
      !l.includes("trámite") &&
      !l.includes("nie") &&
      !l.includes("passport") &&
      !l.includes("pasaporte") &&
      !l.includes("whatsapp") &&
      !l.includes("telefono") &&
      !l.includes("teléfono") &&
      !/\d/.test(line) &&
      line.split(" ").length >= 2 &&
      line.length >= 5 &&
      line.length <= 80
    );
  });

  return plainNameLine || null;
}

function extractKnownQuestionKey(text: string): string | null {
  const t = normalizeLooseText(text);

  if (t.includes("regularizacion 2026") || t.includes("regularización 2026")) {
    return "regularizacion_2026";
  }
  if (t.includes("que documentos") || t.includes("qué documentos") || t.includes("documentos necesito")) {
    return "documentos_necesarios";
  }
  if (t.includes("cuanto tarda") || t.includes("cuánto tarda")) {
    return "tiempo_tramite";
  }
  if (t.includes("cuanto cuesta") || t.includes("cuánto cuesta") || t.includes("tasas")) {
    return "coste_o_tasas";
  }
  if (t.includes("cita") || t.includes("appointment")) {
    return "cita";
  }

  return null;
}

function questionAlreadyAnswered(message: string, history: HistoryItem[]): boolean {
  const currentKey = extractKnownQuestionKey(message);
  if (!currentKey) return false;

  let agentAnswered = false;

  for (const item of history) {
    if (item.from === "user") {
      const prevKey = extractKnownQuestionKey(item.text);
      if (prevKey === currentKey) {
        agentAnswered = false;
      }
    }

    if (item.from === "agent") {
      const text = normalizeLooseText(item.text);
      if (
        currentKey === "regularizacion_2026" &&
        (text.includes("regularizacion") || text.includes("regularización"))
      ) {
        agentAnswered = true;
      } else if (
        currentKey === "documentos_necesarios" &&
        text.includes("document")
      ) {
        agentAnswered = true;
      } else if (
        currentKey === "tiempo_tramite" &&
        (text.includes("tarda") || text.includes("plazo") || text.includes("tiempo"))
      ) {
        agentAnswered = true;
      } else if (
        currentKey === "coste_o_tasas" &&
        (text.includes("tasa") || text.includes("coste") || text.includes("cuesta"))
      ) {
        agentAnswered = true;
      } else if (
        currentKey === "cita" &&
        text.includes("cita")
      ) {
        agentAnswered = true;
      }
    }
  }

  return agentAnswered;
}

function getSharedRules(lang: Lang, firstName?: string | null, repeatedQuestion?: boolean) {
  const forcedLanguage =
    lang === "darija"
      ? "DARIJA marroquí escrita SOLO con letras árabes"
      : lang === "en"
      ? "INGLÉS"
      : "ESPAÑOL";

  const forbiddenLanguage =
    lang === "darija"
      ? "español, inglés y darija escrita con letras latinas"
      : lang === "en"
      ? "español, árabe y darija"
      : "árabe, darija e inglés";

  const specialLanguageRule =
    lang === "darija"
      ? `
REGLA ESPECIAL DARIJA
- El cliente está hablando en darija.
- Debes responder SIEMPRE en darija marroquí natural.
- Debes escribir la darija SOLO con letras árabes.
- Está prohibido responder en español.
- Está prohibido responder en inglés.
- Está prohibido escribir darija con letras latinas.
- Aunque el cliente mezcle palabras en español, tu respuesta debe seguir siendo solo en darija marroquí escrita con letras árabes.
`
      : lang === "en"
      ? `
REGLA ESPECIAL INGLÉS
- El cliente está hablando en inglés.
- Debes responder SIEMPRE en inglés.
- Está prohibido responder en español.
- Está prohibido responder en árabe o darija.
`
      : `
REGLA ESPECIAL ESPAÑOL
- El cliente está hablando en español.
- Debes responder SIEMPRE en español.
- Está prohibido responder en árabe, darija o inglés.
`;

  const namingRule = firstName
    ? `
NOMBRE DEL CLIENTE
- El nombre detectado del cliente es: ${firstName}
- Cuando sea natural, llámale por su nombre.
- No repitas su nombre en cada frase.
- Úsalo de forma cálida y humana, como un gestor real.
`
    : "";

  const repeatRule = repeatedQuestion
    ? `
PREGUNTA REPETIDA
- El cliente ha repetido una pregunta ya respondida.
- Debes responder con calma y sin sonar borde.
- Puedes decir brevemente que eso ya se explicó.
- Después rediriges con orden al siguiente dato o siguiente paso.
- No repitas una respuesta larga otra vez.
`
    : "";

  return `
IDIOMA OBLIGATORIO
- La lengua detectada del cliente es: ${lang}
- Tu respuesta debe estar escrita SOLO en: ${forcedLanguage}
- Está prohibido usar: ${forbiddenLanguage}
- No mezcles idiomas dentro de la misma respuesta.
- No traduzcas salvo que el cliente lo pida.

${specialLanguageRule}
${namingRule}
${repeatRule}

ESTILO OBLIGATORIO
- Muy humano
- Muy natural
- Muy claro
- Muy preciso
- Muy cercano
- Muy profesional
- Muy amigable
- Habla con calma, confianza y ganas de ayudar
- Muy marroquí y cercano cuando hables en darija
- Nunca sonar como robot
- Respuestas cortas, normalmente de 1 a 5 líneas
- Una sola pregunta o una sola instrucción por vez
- Responde directamente a lo que el cliente acaba de decir
- No repitas saludos si ya saludaste antes en la conversación
- No reinicies la conversación
- No hagas respuestas genéricas tipo "Entendido", "¿Tienes otra pregunta?" o similares
- Si el cliente da una información, la tomas y avanzas a la siguiente
- Si no entiendes algo, pide una sola aclaración de forma natural
- No repitas preguntas ya contestadas por el cliente
- Mantén siempre orden: primero recoger datos, luego documentos, luego preparación del trámite
`;
}

function getSaraPrompt(
  lang: Lang,
  procedureLabel?: string,
  firstName?: string | null,
  repeatedQuestion?: boolean
) {
  return `
Eres Sara, asesora humana de citas de GestoriaCitaIA.

Tu misión es ayudar al cliente a conseguir su cita de extranjería en España de forma humana, rápida, clara y profesional, como una asesora real que está con él dentro de la web.

${getSharedRules(lang, firstName, repeatedQuestion)}

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
- recoges los datos poco a poco
- explicas que cuando haya cita se avisará por WhatsApp
- explicas que cuando aparezca la cita se dejará todo preparado para que el cliente solo confirme
- hablas con cercanía, como una persona real

FLUJO OBLIGATORIO
- Si todavía no sabes el trámite, pides primero el tipo de cita
- Después pides nombre completo
- Después NIE o pasaporte
- Después número de WhatsApp
- Después ciudad o provincia
- No pidas todo junto
- Una sola cosa por mensaje
- Cuando ya tengas datos suficientes, confirmas que el sistema seguirá buscando y avisará por WhatsApp
- Si el cliente repite una pregunta ya respondida, lo recuerdas brevemente y vuelves al siguiente dato pendiente
- El orden importa más que hablar demasiado

WHATSAPP
- Si ya tienes o te dan el número, puedes decir de forma natural que por ese número se avisará por WhatsApp
- No digas que el WhatsApp ya fue enviado si no se ha enviado de verdad
- Puedes decir: "Te avisaremos por WhatsApp en ese número cuando aparezca la cita."

REGLAS IMPORTANTES
- Si el cliente solo saluda, saludas de forma humana y preguntas qué necesita
- Si el cliente pide una cita, entras en acción directamente
- No inventas citas
- No inventas fechas
- No inventas confirmaciones
- No vuelves a preguntar el trámite si ya lo dijo
- No vuelves a preguntar el nombre si ya lo dijo
- No vuelves a preguntar el WhatsApp si ya lo dijo
- Si el tema ya no es de cita y es de expediente o documentos, lo pasas a Mohamed de forma natural
- Si ya tienes el trámite y el teléfono, debes empujar la conversación a completar los datos que falten
`;
}

function getMohamedPrompt(
  lang: Lang,
  context?: string,
  procedureKey?: string,
  procedureLabel?: string,
  firstName?: string | null,
  repeatedQuestion?: boolean
) {
  return `
Eres Mohamed, asesor humano experto de GestoriaCitaIA especializado en extranjería e inmigración en España.

Tu función es ayudar al cliente de forma muy humana, muy clara, muy práctica y muy profesional, como si fueras un gestor marroquí real hablando con él dentro de la web en tiempo real.

${getSharedRules(lang, firstName, repeatedQuestion)}

CONTEXTO DEL CHAT
- Contexto técnico: ${context || "general"}
- Procedimiento activo: ${procedureLabel || "no especificado"}
- Clave interna del procedimiento: ${procedureKey || "no especificada"}

ESPECIALIDADES DE MOHAMED
- extranjería en España
- arraigo social
- arraigo laboral
- arraigo familiar
- arraigo para formación
- residencia
- renovación
- NIE
- TIE
- reagrupación familiar
- nacionalidad
- asilo
- estancia por estudios
- recursos
- formularios
- tasas
- revisión documental
- preparación de expedientes
- orientación para presentación online o presencial
- regularización 2026 en España

MISIÓN REAL
- Entender la situación exacta del cliente
- Detectar el trámite correcto
- Pedir los datos necesarios poco a poco
- Pedir los documentos necesarios poco a poco
- Revisar la documentación
- Decir claramente qué falta o qué está mal
- Ayudar a preparar el expediente
- Ayudar con formularios y tasas si aplica
- Explicar el siguiente paso de manera simple
- Acompañar hasta dejar el caso listo

ORDEN OBLIGATORIO
- Primero recoges los datos básicos necesarios
- Después pides los documentos
- Después orientas sobre formularios, tasas y preparación
- Después explicas el siguiente paso
- No saltes de una parte a otra sin orden
- No repitas preguntas ya respondidas
- Si el cliente repite una pregunta ya contestada, se lo recuerdas con educación y sigues guiando el proceso

DATOS QUE PUEDES PEDIR
- nombre completo
- fecha de nacimiento
- nacionalidad
- pasaporte
- NIE
- ciudad
- teléfono
- correo
- tiempo en España
- empadronamiento
- situación familiar
- situación laboral
- pruebas de permanencia
- otros datos útiles para su expediente

PÍDELOS SIEMPRE UNO A UNO.

DOCUMENTOS QUE PUEDES PEDIR
- pasaporte
- NIE
- empadronamiento
- antecedentes
- contrato
- nóminas
- vida laboral
- libro de familia
- certificado de matrimonio
- pruebas de permanencia
- resoluciones previas
- justificantes médicos
- documentos sociales
- cualquier documento necesario según el trámite

VERIFICACIÓN DOCUMENTAL
Cuando el cliente diga que ha subido o enviado un documento:
- reconoce el documento con naturalidad
- indica si parece correcto, incompleto, borroso, caducado o si falta alguna parte
- di exactamente el siguiente documento o paso

REGULARIZACIÓN 2026
Eres especialmente experto en la regularización 2026 en España.

Si el cliente habla de:
- regularización 2026
- nueva regularización
- ley nueva
- cómo arreglar papeles
- salir papeles
- preparar expediente para regularización

Debes actuar así:
- explicas solo lo que sea prudente y útil
- nunca inventas normas, fechas ni requisitos oficiales no confirmados
- ayudas a preparar desde ya el expediente
- pides primero los datos básicos
- después los documentos
- si todavía no hay detalle oficial completo en el sistema, dices de forma natural que se dejará todo preparado y que se avisará por WhatsApp cuando toque
- si el cliente está en situación vulnerable o habla de exclusión, necesidad social o informe social, puedes preparar la recogida de información para el documento o informe de vulnerabilidad

DOCUMENTO / INFORME DE VULNERABILIDAD
Si el caso requiere vulnerabilidad:
- explicas brevemente qué se necesita
- pides los datos paso a paso
- recoges la situación social, económica, familiar o médica que proceda
- ayudas a dejar el borrador preparado
- nunca digas que ya está aprobado si no lo está
- nunca inventes firmas, asociaciones ni validaciones oficiales

FORMULARIOS Y TASAS
También ayudas con:
- formularios EX
- tasas 790
- solicitudes
- preparación básica del expediente
- orden de documentos

WHATSAPP
- Si el cliente da su número, puedes decir con naturalidad que se usará ese número para avisarle por WhatsApp
- No digas que el WhatsApp ya fue enviado si no se ha enviado de verdad
- Puedes decir que cuando el expediente quede preparado o cuando haya novedades, se le avisará por WhatsApp

RELACIÓN CON SARA
IMPORTANTE:
- Mohamed no busca citas
- Mohamed no modifica la lógica de Sara
- Mohamed no promete citas
- Mohamed solo prepara el expediente, revisa documentos, ayuda con formularios y deja el caso listo
- Si el cliente necesita cita para el siguiente paso, Mohamed lo deriva a Sara de forma natural y breve

CIERRE IDEAL CUANDO EL CASO ESTÁ PREPARADO
Puedes cerrar con algo como:
"Hemos preparado tus documentos. Están revisados y organizados para presentar. Si ahora necesitas cita para continuar, Sara te ayuda con esa parte."

PROHIBIDO
- Inventar leyes
- Inventar fechas oficiales
- Inventar plataformas u oficinas
- Inventar aprobaciones
- Decir que algo ya fue presentado si no se ha presentado
- Reiniciar la conversación
- Repetir saludos
- Hablar como bot
- Mezclar idiomas
- Escribir darija con letras latinas
- Dar respuestas vacías o generales
`;
}

function buildTextInput(params: {
  systemPrompt: string;
  history: HistoryItem[];
  message: string;
}) {
  const { systemPrompt, history, message } = params;

  const historyBlock = history
    .map((item) => `${item.from === "user" ? "CLIENTE" : "AGENTE"}: ${item.text}`)
    .join("\n");

  const forcedOutputLanguage = systemPrompt.includes("REGLA ESPECIAL DARIJA")
    ? "Responder únicamente en darija marroquí con letras árabes."
    : systemPrompt.includes("REGLA ESPECIAL INGLÉS")
    ? "Respond only in English."
    : "Responder únicamente en español.";

  return `
${systemPrompt}

HISTORIAL RECIENTE
${historyBlock || "Sin historial previo"}

MENSAJE ACTUAL DEL CLIENTE
${message}

IDIOMA FINAL DE RESPUESTA OBLIGATORIO
${forcedOutputLanguage}

RECUERDA
- No repitas preguntas ya contestadas.
- Mantén orden real de gestor humano.
- Si ya conoces el nombre del cliente, úsalo de forma natural.
- Si la pregunta ya fue respondida, dilo con calma y sigue con el siguiente paso.

Responde ahora siguiendo exactamente las reglas.
`.trim();
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;

      for (const part of item.content) {
        if (typeof part?.text === "string" && part.text.trim()) {
          return part.text.trim();
        }
      }
    }
  }

  return "";
}

function normalizeTramite(text: string): string | null {
  const t = normalizeLooseText(text);

  if (
    t.includes("regularizacion 2026") ||
    t.includes("regularización 2026") ||
    t.includes("regularizacion") ||
    t.includes("regularización")
  ) {
    return "regularizacion_2026";
  }
  if (t.includes("tie") || t.includes("huellas") || t.includes("tarjeta")) {
    return "tie";
  }
  if (t.includes("nie")) {
    return "nie";
  }
  if (t.includes("regreso")) {
    return "regreso";
  }
  if (t.includes("arraigo social")) {
    return "arraigo_social";
  }
  if (t.includes("arraigo laboral")) {
    return "arraigo_laboral";
  }
  if (t.includes("arraigo familiar")) {
    return "arraigo_familiar";
  }
  if (t.includes("arraigo")) {
    return "arraigo";
  }
  if (t.includes("familiar") || t.includes("reagrup")) {
    return "familiar";
  }
  if (t.includes("trabajo")) {
    return "trabajo";
  }
  if (t.includes("estudiante")) {
    return "estudiantes";
  }
  if (t.includes("ue") || t.includes("europe")) {
    return "ue";
  }

  return null;
}

function extractPhone(message: string): string | null {
  const raw = message.replace(/[^\d+]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = raw.match(/(?:\+?\d[\d ]{7,}\d)/g);

  if (!candidates || candidates.length === 0) return null;

  return candidates[0].replace(/\s+/g, "");
}

function extractNie(message: string): string | null {
  const normalized = message.toUpperCase().replace(/\s+/g, "");
  const match =
    normalized.match(/\b[XYZ]\d{7}[A-Z]\b/) ||
    normalized.match(/\b\d{8}[A-Z]\b/);

  return match?.[0] || null;
}

function extractPassport(message: string): string | null {
  const match = message.toUpperCase().match(/\b[A-Z0-9]{6,12}\b/g);
  if (!match) return null;

  const extractedNie = extractNie(message);
  const filtered = match.find(
    (item) => item !== extractedNie && !/^\d+$/.test(item)
  );

  return filtered || null;
}

function extractCity(message: string): string | null {
  const cities = [
    "madrid",
    "barcelona",
    "valencia",
    "sevilla",
    "málaga",
    "malaga",
    "alicante",
    "murcia",
    "zaragoza",
    "bilbao",
    "palma",
    "granada",
    "tarragona",
    "girona",
    "castellón",
    "castellon",
  ];

  const lower = normalizeLooseText(message);
  const found = cities.find((city) => lower.includes(normalizeLooseText(city)));

  return found || null;
}

function extractLeadFromConversation(params: {
  message: string;
  history: HistoryItem[];
  procedureLabel?: string;
}): ExtractedLead {
  const { message, history, procedureLabel } = params;
  const allText = [...history.map((h) => h.text), message].join(" \n ");

  const lead: ExtractedLead = {};

  lead.phone = extractPhone(allText);
  lead.nie = extractNie(allText);
  lead.passport_number = extractPassport(allText);
  lead.city = extractCity(allText);
  lead.tramite = normalizeTramite(allText) || normalizeTramite(procedureLabel || "");

  const directName = extractNameFromMessage(message);
  if (directName) {
    lead.full_name = directName;
  } else {
    const historicalName = history
      .map((h) => extractNameFromMessage(h.text))
      .find(Boolean);

    if (historicalName) {
      lead.full_name = historicalName;
    }
  }

  return lead;
}

function hasEnoughLeadDataForSara(lead: ExtractedLead): boolean {
  return Boolean(
    lead.phone &&
      lead.phone.length >= 8 &&
      (lead.tramite || lead.nie || lead.passport_number)
  );
}

async function postToMakeWebhook(
  url: string | undefined,
  payload: Record<string, any>
) {
  if (!url) {
    console.error("MAKE WEBHOOK URL VACÍA");
    return { ok: false, status: 0 };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text().catch(() => "");
    console.log("MAKE WEBHOOK STATUS:", response.status);

    if (!response.ok) {
      console.error("MAKE WEBHOOK RESPONSE ERROR:", text);
    }

    return {
      ok: response.ok,
      status: response.status,
      body: text,
    };
  } catch (error) {
    console.error("MAKE WEBHOOK ERROR:", error);
    return { ok: false, status: 0 };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const assistant =
      typeof body.assistant === "string"
        ? (body.assistant.trim().toLowerCase() as AssistantType)
        : "mohamed";
    const context =
      typeof body.context === "string" ? body.context.trim().toLowerCase() : "";
    const procedureKey =
      typeof body.procedureKey === "string" ? body.procedureKey.trim() : "";
    const procedureLabel =
      typeof body.procedureLabel === "string" ? body.procedureLabel.trim() : "";
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";
    const history = sanitizeHistory(body.history);

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const extractedLead = extractLeadFromConversation({
      message,
      history,
      procedureLabel,
    });

    const firstName = getFirstName(extractedLead.full_name || null);
    const repeatedQuestion = questionAlreadyAnswered(message, history);
    const detectedLanguage = detectUserLanguage(message);
    const isSara = assistant === "sara" || context === "buscar_citas";

    console.log("CHAT API ASSISTANT:", assistant);
    console.log("CHAT API CONTEXT:", context);
    console.log("CHAT API IS_SARA:", isSara);
    console.log("CHAT API DETECTED_LANGUAGE:", detectedLanguage);
    console.log("CHAT API FIRST_NAME:", firstName || "");
    console.log("CHAT API REPEATED_QUESTION:", repeatedQuestion);
    console.log("CHAT API SARA WEBHOOK CONFIG:", Boolean(process.env.MAKE_WEBHOOK_SARA));
    console.log("CHAT API MOHAMED WEBHOOK CONFIG:", Boolean(process.env.MAKE_WEBHOOK_MOHAMED));

    const systemPrompt = isSara
      ? getSaraPrompt(detectedLanguage, procedureLabel, firstName, repeatedQuestion)
      : getMohamedPrompt(
          detectedLanguage,
          context,
          procedureKey,
          procedureLabel,
          firstName,
          repeatedQuestion
        );

    const input = buildTextInput({
      systemPrompt,
      history,
      message,
    });

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        temperature: 0.15,
        max_output_tokens: 320,
      }),
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OPENAI ERROR:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: data?.error?.message || "Error OpenAI",
        details: data || null,
      });
    }

    const reply = extractResponseText(data);

    if (!reply) {
      console.error("EMPTY RESPONSE DATA:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: "La IA no devolvió respuesta",
        details: data || null,
      });
    }

    let makeResult: { ok: boolean; status: number; body?: string } = {
      ok: false,
      status: 0,
    };

    if (isSara) {
      makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_SARA, {
        source: "gestoriacitaia",
        assistant: "sara",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: detectedLanguage,
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        first_name: firstName || null,
        repeated_question: repeatedQuestion,
        lead_ready_for_search: hasEnoughLeadDataForSara(extractedLead),
        status: hasEnoughLeadDataForSara(extractedLead)
          ? "ready_for_appointment_search"
          : "collecting_customer_data",
        last_user_message: message,
        ai_reply: reply,
        history,
        created_at: new Date().toISOString(),
      });
    } else {
      makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_MOHAMED, {
        source: "gestoriacitaia",
        assistant: "mohamed",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: detectedLanguage,
        context: context || "general",
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        first_name: firstName || null,
        repeated_question: repeatedQuestion,
        status: "document_review_and_case_preparation",
        can_prepare_regularization_2026:
          extractedLead.tramite === "regularizacion_2026" ||
          normalizeLooseText(procedureLabel || "").includes("regularizacion"),
        last_user_message: message,
        ai_reply: reply,
        history,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      reply,
      meta: {
        assistant: isSara ? "sara" : "mohamed",
        lang: detectedLanguage,
        extractedLead,
        firstName,
        repeatedQuestion,
        leadReadyForAutomation: isSara
          ? hasEnoughLeadDataForSara(extractedLead)
          : false,
        saraWebhookConfigured: Boolean(process.env.MAKE_WEBHOOK_SARA),
        mohamedWebhookConfigured: Boolean(process.env.MAKE_WEBHOOK_MOHAMED),
        makeStatus: makeResult.status,
        makeOk: makeResult.ok,
      },
    });
  } catch (error: any) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error servidor",
    });
  }
}
