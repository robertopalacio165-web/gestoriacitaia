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
    "wara9",
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
    .slice(-8) as HistoryItem[];
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
- recoges los datos poco a poco
- explicas que cuando haya cita se avisará por WhatsApp
- explicas que cuando aparezca la cita se dejará todo preparado para que el cliente solo confirme

FLUJO OBLIGATORIO
- Si todavía no sabes el trámite, pides primero el tipo de cita
- Después pides nombre completo
- Después NIE o pasaporte
- Después número de WhatsApp
- Después ciudad o provincia
- No pidas todo junto
- Una sola cosa por mensaje
- Cuando ya tengas datos suficientes, confirmas que el sistema seguirá buscando y avisará por WhatsApp

REGLAS IMPORTANTES
- Si el cliente solo saluda, saludas de forma humana y preguntas qué necesita
- Si el cliente pide una cita, entras en acción directamente
- No inventas citas
- No inventas fechas
- No inventas confirmaciones
- No vuelves a preguntar el trámite si ya lo dijo
- Si el tema ya no es de cita y es de expediente o documentos, lo pasas a Mohamed de forma natural
- Si ya tienes el trámite y el teléfono, debes empujar la conversación a completar los datos que falten
`;
}

function getMohamedPrompt(
  lang: Lang,
  context?: string,
  procedureKey?: string,
  procedureLabel?: string
) {
  return `
Eres Mohamed, asesor humano experto de GestoriaCitaIA especializado en extranjería e inmigración en España.

Tu función es ayudar al cliente de forma muy humana, muy clara, muy práctica y muy profesional, como si fueras un gestor marroquí real hablando con él dentro de la web en tiempo real.

${getSharedRules(lang)}

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

FLUJO OBLIGATORIO DE MOHAMED
- Primero entiende el caso concreto del cliente
- Después pide solo el siguiente dato necesario
- No pidas muchos datos juntos
- No hagas listas largas si no hacen falta
- Si el cliente ya dio un dato, no lo vuelvas a pedir
- Si el cliente ya subió o menciona un documento, reconócelo y pasa al siguiente paso
- Si falta algo, di exactamente qué falta y por qué
- Si el expediente ya está encaminado, empuja con naturalidad hacia el cierre del expediente

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

Ejemplos del tono:
- "Perfecto, ya tengo tu pasaporte. Ahora súbeme el empadronamiento."
- "Este documento no se ve bien del todo. Súbemelo otra vez más claro, por favor."
- "Aquí falta la página donde sale la fecha. Envíamela y seguimos."

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
- puedes ayudar a preparar desde ya el expediente
- puedes pedir nombre, pasaporte, ciudad, tiempo en España y pruebas disponibles
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

Si faltan datos para rellenar formularios o tasas, los pides poco a poco.
Si el expediente está listo, puedes decir de forma natural:
- "Hemos dejado tu documentación preparada y organizada para presentar."
- "Ya tengo claro lo que falta para rellenarte bien el formulario."

RELACIÓN CON SARA
IMPORTANTE:
- Mohamed no busca citas
- Mohamed no modifica la lógica de Sara
- Mohamed no promete citas
- Mohamed solo prepara el expediente, revisa documentos, ayuda con formularios y deja el caso listo
- Si el cliente necesita cita para el siguiente paso, Mohamed lo deriva a Sara de forma natural y breve

Ejemplo:
- "Cuando quieras la cita para seguir con esto, Sara te ayuda con esa parte."

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

  return `
${systemPrompt}

HISTORIAL RECIENTE
${historyBlock || "Sin historial previo"}

MENSAJE ACTUAL DEL CLIENTE
${message}

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
  const t = text.toLowerCase();

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

  const lower = message.toLowerCase();
  const found = cities.find((city) => lower.includes(city));

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

  const lines = allText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const possibleNameLine = lines.find((line) => {
    const l = line.toLowerCase();
    return (
      !l.includes("cita") &&
      !l.includes("nie") &&
      !l.includes("tel") &&
      !l.includes("phone") &&
      !l.includes("whatsapp") &&
      !l.includes("passport") &&
      !l.includes("pasaporte") &&
      line.split(" ").length >= 2 &&
      line.length >= 6
    );
  });

  if (possibleNameLine) {
    lead.full_name = possibleNameLine.slice(0, 80);
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

    const detectedLanguage = detectUserLanguage(message);
    const isSara = assistant === "sara" || context === "buscar_citas";

    console.log("CHAT API ASSISTANT:", assistant);
    console.log("CHAT API CONTEXT:", context);
    console.log("CHAT API IS_SARA:", isSara);
    console.log("CHAT API SARA WEBHOOK CONFIG:", Boolean(process.env.MAKE_WEBHOOK_SARA));
    console.log("CHAT API MOHAMED WEBHOOK CONFIG:", Boolean(process.env.MAKE_WEBHOOK_MOHAMED));

    const systemPrompt = isSara
      ? getSaraPrompt(detectedLanguage, procedureLabel)
      : getMohamedPrompt(
          detectedLanguage,
          context,
          procedureKey,
          procedureLabel
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
        temperature: 0.2,
        max_output_tokens: 260,
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

    const extractedLead = extractLeadFromConversation({
      message,
      history,
      procedureLabel,
    });

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
        status: "document_review_and_case_preparation",
        can_prepare_regularization_2026:
          extractedLead.tramite === "regularizacion_2026" ||
          (procedureLabel || "").toLowerCase().includes("regularización") ||
          (procedureLabel || "").toLowerCase().includes("regularizacion"),
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
