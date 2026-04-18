import { mohamedBrain } from "./mohamed-brain";

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

type LeadFormPayload = {
  nombre?: string;
  telefono?: string;
  email?: string;
  niePasaporte?: string;
  ciudad?: string;
  nacionalidad?: string;
  fechaLlegada?: string;
  cumple5Meses?: string;
  asilo?: string;
  penales?: string;
};

type DocumentPayload = {
  nombre?: string;
  estado?: "ok" | "warn" | "missing";
  detectedType?: string;
  note?: string;
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

function sanitizeLeadForm(raw: unknown): LeadFormPayload {
  if (!raw || typeof raw !== "object") return {};

  const obj = raw as Record<string, unknown>;
  const safe = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  return {
    nombre: safe(obj.nombre),
    telefono: safe(obj.telefono),
    email: safe(obj.email),
    niePasaporte: safe(obj.niePasaporte),
    ciudad: safe(obj.ciudad),
    nacionalidad: safe(obj.nacionalidad),
    fechaLlegada: safe(obj.fechaLlegada),
    cumple5Meses: safe(obj.cumple5Meses),
    asilo: safe(obj.asilo),
    penales: safe(obj.penales),
  };
}

function sanitizeDocuments(raw: unknown): DocumentPayload[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const obj = item as Record<string, unknown>;

      return {
        nombre: typeof obj.nombre === "string" ? obj.nombre.trim() : "",
        estado:
          obj.estado === "ok" || obj.estado === "warn" || obj.estado === "missing"
            ? obj.estado
            : "missing",
        detectedType:
          typeof obj.detectedType === "string" ? obj.detectedType.trim() : "",
        note: typeof obj.note === "string" ? obj.note.trim() : "",
      };
    })
    .slice(0, 50);
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

MENSAJE INICIAL OBLIGATORIO
Si es el primer mensaje real de Sara, empieza así en el idioma correcto:
- Español: "Hola, ¿qué tal? Si quieres que te consiga la cita, rellena primero este formulario de abajo. Después seguiré contigo paso a paso."
- Darija: "السلام، لباس عليك. إلا بغيتي باش نشدّ لك الرونديفو، عافاك عمّر هاد الفورمولار لي كاين لتحت، ومن بعد غادي نكمل معاك إن شاء الله باش نشدّ لك السيتا."
- English: "Hello, how are you? If you want me to help you get an appointment, first fill in the form below. Then I will continue with you step by step."

QUÉ HACES
- Ayudas con citas de extranjería en España
- NIE
- TIE
- renovación
- huellas
- regreso
- citas relacionadas con extranjería
- explicas que cuando haya cita se avisará por WhatsApp
- explicas que cuando aparezca la cita se dejará todo preparado para que el cliente solo confirme

FLUJO OBLIGATORIO
- Si todavía falta el formulario, rediriges al formulario
- No pides por chat datos que ya se pueden rellenar en la web
- Si el formulario ya está completo, avanzas al siguiente paso
- Cuando ya haya datos suficientes, confirmas que el sistema seguirá buscando y avisará por WhatsApp

REGLAS IMPORTANTES
- Si el cliente solo saluda, saludas de forma humana y preguntas qué necesita
- Si el cliente pide una cita, entras en acción directamente
- No inventas citas
- No inventas fechas
- No inventas confirmaciones
- Si el tema ya no es de cita y es de expediente o documentos, lo pasas a Mohamed de forma natural
`;
}

function buildLeadFormBlock(leadForm: LeadFormPayload) {
  const lines = [
    `- nombre: ${leadForm.nombre || "no informado"}`,
    `- telefono: ${leadForm.telefono || "no informado"}`,
    `- email: ${leadForm.email || "no informado"}`,
    `- niePasaporte: ${leadForm.niePasaporte || "no informado"}`,
    `- ciudad: ${leadForm.ciudad || "no informado"}`,
    `- nacionalidad: ${leadForm.nacionalidad || "no informado"}`,
    `- fechaLlegada: ${leadForm.fechaLlegada || "no informado"}`,
    `- cumple5Meses: ${leadForm.cumple5Meses || "no informado"}`,
    `- asilo: ${leadForm.asilo || "no informado"}`,
    `- penales: ${leadForm.penales || "no informado"}`,
  ];

  return lines.join("\n");
}

function getMohamedPrompt(
  lang: Lang,
  context?: string,
  procedureKey?: string,
  procedureLabel?: string,
  leadForm?: LeadFormPayload
) {
  return `
Eres Mohamed, asesor humano experto de GestoriaCitaIA especializado en extranjería e inmigración en España.

Tu función es ayudar al cliente de forma muy humana, muy clara, muy práctica y muy profesional, como si fueras un gestor marroquí real hablando con él dentro de la web en tiempo real.

${getSharedRules(lang)}

CONTEXTO DEL CHAT
- Contexto técnico: ${context || "general"}
- Procedimiento activo: ${procedureLabel || "no especificado"}
- Clave interna del procedimiento: ${procedureKey || "no especificada"}

DATOS YA RECOGIDOS EN EL FORMULARIO WEB
${buildLeadFormBlock(leadForm || {})}

REGLA DE FORMULARIO WEB
- Si el sistema ya ha recogido datos del formulario, no los vuelvas a pedir.
- Usa primero esos datos y solo pide lo que falte.
- Si el formulario todavía no está completo, recuérdalo de forma breve.
- No hagas interrogatorio si la web ya tiene el formulario.

MENSAJE INICIAL OBLIGATORIO
Si es el primer mensaje real de Mohamed, empieza así en el idioma correcto:
- Español: "Hola, ¿qué tal? Si quieres que te prepare los papeles de la regularización 2026, relléname primero este formulario y después continúo contigo con el proceso."
- Darija: "السلام، لباس عليك. إلا بغيتي باش نوجدّ لك الوراق ديالك ديال regularización 2026، عافاك عمّر ليا هاد الفورمولار الأول، ومن بعد نكمل معاك البروسيجير."
- English: "Hello, how are you? If you want me to prepare your 2026 regularization documents, please fill in this form first and then I will continue with the process."
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
        if (typeof part?.output_text === "string" && part.output_text.trim()) {
          return part.output_text.trim();
        }
      }
    }
  }

  return "";
}

function extractFileSearchResults(data: any) {
  if (!Array.isArray(data?.output)) return [];

  const results: Array<{
    file_id?: string;
    filename?: string;
    score?: number;
  }> = [];

  for (const item of data.output) {
    if (item?.type !== "file_search_call") continue;
    if (!Array.isArray(item?.results)) continue;

    for (const result of item.results) {
      results.push({
        file_id: result?.file_id,
        filename: result?.filename,
        score: typeof result?.score === "number" ? result.score : undefined,
      });
    }
  }

  return results;
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
  leadForm?: LeadFormPayload;
}): ExtractedLead {
  const { message, history, procedureLabel, leadForm } = params;
  const allText = [...history.map((h) => h.text), message].join(" \n ");

  const lead: ExtractedLead = {};

  lead.phone = leadForm?.telefono || extractPhone(allText);
  lead.nie = extractNie((leadForm?.niePasaporte || "") + " " + allText);
  lead.passport_number =
    extractPassport((leadForm?.niePasaporte || "") + " " + allText) || null;
  lead.city = leadForm?.ciudad || extractCity(allText);
  lead.tramite =
    normalizeTramite(allText) || normalizeTramite(procedureLabel || "");

  if (leadForm?.nombre) {
    lead.full_name = leadForm.nombre;
  } else {
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

function getLeadFormFromBody(body: any): LeadFormPayload {
  const rawLeadForm = sanitizeLeadForm(body.leadForm);

  if (
    rawLeadForm.nombre ||
    rawLeadForm.telefono ||
    rawLeadForm.email ||
    rawLeadForm.niePasaporte ||
    rawLeadForm.ciudad ||
    rawLeadForm.nacionalidad ||
    rawLeadForm.fechaLlegada ||
    rawLeadForm.cumple5Meses ||
    rawLeadForm.asilo ||
    rawLeadForm.penales
  ) {
    return rawLeadForm;
  }

  const user = body?.user && typeof body.user === "object" ? body.user : {};

  return sanitizeLeadForm({
    nombre: user.fullName,
    telefono: user.phone,
    email: user.email,
    niePasaporte: user.nie,
    ciudad: user.city,
  });
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
    const leadForm = getLeadFormFromBody(body);
    const documents = sanitizeDocuments(body.documents);

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const detectedLanguage = detectUserLanguage(message);
    const isSara = assistant === "sara" || context === "buscar_citas";

    if (!isSara && context === "multi_extranjeria_procedure") {
      const brainReply = mohamedBrain({
        lang: detectedLanguage,
        userMessage: message,
        leadForm,
        documents,
      });

      const extractedLead = extractLeadFromConversation({
        message,
        history,
        procedureLabel,
        leadForm,
      });

      const expedienteReady =
        /expediente listo|manda mi pdf|todo correcto|terminado|acabado|ya esta todo correcto|ya está todo correcto|pdf por whatsapp|pdf via whatsapp|pdf vía whatsapp/i.test(
          message
        );

      const makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_MOHAMED, {
        source: "gestoriacitaia",
        assistant: "mohamed",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: detectedLanguage,
        context: context || "general",
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        lead_form: leadForm,
        documents,
        status: expedienteReady
          ? "expediente_ready"
          : "document_review_and_case_preparation",
        can_prepare_regularization_2026:
          extractedLead.tramite === "regularizacion_2026" ||
          (procedureLabel || "").toLowerCase().includes("regularización") ||
          (procedureLabel || "").toLowerCase().includes("regularizacion"),
        used_file_search: false,
        file_search_results: [],
        proofs_summary:
          leadForm?.fechaLlegada
            ? "Cliente con datos básicos guardados en formulario."
            : "Faltan datos básicos del formulario.",
        identity_summary:
          leadForm?.niePasaporte || extractedLead.nie || extractedLead.passport_number
            ? "Documento de identidad informado en el expediente."
            : "Falta documento de identidad claro en el expediente.",
        precontract_summary: "No evaluado en mohamed-brain básico.",
        vulnerability_summary: "No evaluado en mohamed-brain básico.",
        case_summary: expedienteReady
          ? "Expediente indicado como listo por el cliente."
          : "Expediente todavía en revisión.",
        last_user_message: message,
        ai_reply: brainReply,
        history,
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({
        reply: brainReply,
        meta: {
          assistant: "mohamed",
          lang: detectedLanguage,
          extractedLead,
          leadReadyForAutomation: false,
          saraWebhookConfigured: Boolean(process.env.MAKE_WEBHOOK_SARA),
          mohamedWebhookConfigured: Boolean(process.env.MAKE_WEBHOOK_MOHAMED),
          mohamedVectorStoreConfigured: false,
          usedFileSearch: false,
          fileSearchHits: 0,
          fileSearchFiles: [],
          model: "mohamed-brain-local",
          makeStatus: makeResult.status,
          makeOk: makeResult.ok,
        },
      });
    }

    const systemPrompt = isSara
      ? getSaraPrompt(detectedLanguage, procedureLabel)
      : getMohamedPrompt(
          detectedLanguage,
          context,
          procedureKey,
          procedureLabel,
          leadForm
        );

    const input = buildTextInput({
      systemPrompt,
      history,
      message,
    });

    const modelSara = process.env.OPENAI_MODEL_SARA || "gpt-4.1-mini";
    const modelMohamed = process.env.OPENAI_MODEL_MOHAMED || "gpt-4.1-mini";
    const model = isSara ? modelSara : modelMohamed;

    const mohamedVectorStoreId =
      process.env.MOHAMED_VECTOR_STORE_ID ||
      process.env.OPENAI_VECTOR_STORE_MOHAMED ||
      "";

    const requestBody: Record<string, any> = {
      model,
      input,
      temperature: 0.2,
      max_output_tokens: 320,
    };

    if (!isSara && mohamedVectorStoreId) {
      requestBody.tools = [
        {
          type: "file_search",
          vector_store_ids: [mohamedVectorStoreId],
          max_num_results: 6,
        },
      ];
      requestBody.include = ["file_search_call.results"];
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
      leadForm,
    });

    const fileSearchResults = !isSara ? extractFileSearchResults(data) : [];

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
        lead_form: leadForm,
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
        lead_form: leadForm,
        documents,
        status: "document_review_and_case_preparation",
        can_prepare_regularization_2026:
          extractedLead.tramite === "regularizacion_2026" ||
          (procedureLabel || "").toLowerCase().includes("regularización") ||
          (procedureLabel || "").toLowerCase().includes("regularizacion"),
        used_file_search: Boolean(mohamedVectorStoreId),
        file_search_results: fileSearchResults,
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
        mohamedVectorStoreConfigured: Boolean(mohamedVectorStoreId),
        usedFileSearch: !isSara && Boolean(mohamedVectorStoreId),
        fileSearchHits: fileSearchResults.length,
        fileSearchFiles: fileSearchResults,
        model,
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
