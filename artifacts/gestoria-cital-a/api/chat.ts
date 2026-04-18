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
    "darija",
    "sakan",
    "padron",
    "padrón",
    "bortabl",
    "basbor",
    "passeport",
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
    "padron",
    "padrón",
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
    .slice(-10) as HistoryItem[];
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

function hasMinimumFormData(leadForm?: LeadFormPayload): boolean {
  return Boolean(
    leadForm?.nombre?.trim() &&
      leadForm?.telefono?.trim() &&
      leadForm?.ciudad?.trim() &&
      leadForm?.nacionalidad?.trim()
  );
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
- Muy cercano
- Muy profesional
- Nunca sonar como robot
- Respuestas cortas, normalmente de 1 a 4 líneas
- Una sola pregunta o una sola instrucción por vez
- No hagas listas largas salvo que sea imprescindible
- No reinicies la conversación
- No repitas saludos si ya saludaste antes
- No hagas respuestas vacías tipo "Entendido" o "¿En qué más te ayudo?"
- Si el cliente da una información, la tomas y avanzas al siguiente paso útil
- Si no entiendes algo, pides una sola aclaración concreta
`;
}

function getSaraPrompt(
  lang: Lang,
  procedureLabel?: string,
  context?: string,
  leadForm?: LeadFormPayload
) {
  const formReady = hasMinimumFormData(leadForm);

  return `
Eres Sara, asesora humana de citas de GestoriaCitaIA.

Tu misión es ayudar al cliente a conseguir su cita de extranjería en España de forma humana, rápida, clara y profesional, como una asesora real dentro de la web.

${getSharedRules(lang)}

CONTEXTO ACTUAL
- Procedimiento activo: ${procedureLabel || "no especificado"}
- Contexto técnico: ${context || "general"}

DATOS YA RECOGIDOS EN EL FORMULARIO WEB
- nombre: ${leadForm?.nombre || "no informado"}
- telefono: ${leadForm?.telefono || "no informado"}
- niePasaporte: ${leadForm?.niePasaporte || "no informado"}
- ciudad: ${leadForm?.ciudad || "no informado"}

FLUJO OBLIGATORIO DE SARA
- Esta web ya no funciona con chat escrito clásico; el flujo es de voz y formulario.
- Si el formulario todavía no está completo, redirige al formulario de forma muy breve.
- Si el formulario ya está completo, no vuelvas a pedir los mismos datos.
- Si el cliente pide cita, avanzas directamente al siguiente paso natural.
- Explicas que el sistema seguirá buscando la cita y que se avisará por WhatsApp.
- Cuando aparezca la cita, se mandará aviso por WhatsApp para que el cliente entre y confirme.
- Después se le enviará el PDF final de la cita por WhatsApp.
- No prometes citas concretas.
- No inventas fechas.
- No inventas confirmaciones.
- No inventas que la cita ya existe si no existe.

REGLA DE FORMULARIO
- Formulario completo: ${formReady ? "sí" : "no"}
- Si no está completo, tu respuesta debe empujar al formulario y no pedir datos sueltos por conversación.
- Si está completo, continúas con normalidad y confirmas que ya se puede seguir con la búsqueda.

CUANDO EL CLIENTE YA HA COMPLETADO EL FORMULARIO
Usa un estilo como este, adaptado al idioma:
- "Perfecto. Ya tengo tus datos. Ahora nosotros seguimos buscando tu cita y cuando salga te avisaremos por WhatsApp para que la confirmes."
- No añadas explicaciones largas.

RELACIÓN CON MOHAMED
- Sara no prepara expedientes
- Sara no revisa documentos de regularización
- Si el cliente habla de expediente, pruebas, padrón, vulnerabilidad o documentos de regularización, lo pasas a Mohamed de forma natural y breve
`;
}

function buildLeadFormBlock(leadForm: LeadFormPayload): string {
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
  const formReady = hasMinimumFormData(leadForm);
  const isVoiceFlow = (context || "").includes("voice");

  return `
Eres Mohamed, asesor humano experto de GestoriaCitaIA especializado en extranjería e inmigración en España.

Tu función es ayudar al cliente como un gestor marroquí real, de forma muy humana, muy clara, muy práctica y muy profesional.

${getSharedRules(lang)}

CONTEXTO DEL CHAT
- Contexto técnico: ${context || "general"}
- Procedimiento activo: ${procedureLabel || "no especificado"}
- Clave interna del procedimiento: ${procedureKey || "no especificada"}
- Flujo por voz: ${isVoiceFlow ? "sí" : "no"}

DATOS YA RECOGIDOS EN EL FORMULARIO WEB
${buildLeadFormBlock(leadForm || {})}

REGLA DE FORMULARIO WEB
- Si el sistema ya ha recogido datos del formulario, no los vuelvas a pedir.
- Usa primero esos datos y solo pide lo que falte.
- Formulario mínimo completo: ${formReady ? "sí" : "no"}
- Si el formulario todavía no está completo, recuérdalo de forma breve.
- No hagas interrogatorio si la web ya tiene el formulario.

IMPORTANTE SOBRE EL NUEVO FLUJO
- Esta web ya no funciona con chat escrito clásico.
- El cliente rellena el formulario y luego habla por voz contigo.
- Tus respuestas deben sonar perfectas para ser leídas en voz alta.
- Muy natural, breve y directa.
- Una sola pregunta por vez.
- Nada de párrafos largos.

MISIÓN REAL DE MOHAMED
- Entender la situación exacta del cliente
- Detectar el trámite correcto
- Pedir solo el siguiente dato necesario
- Revisar la documentación
- Decir claramente qué falta o qué está mal
- Ayudar a preparar el expediente
- Ayudar con formularios y tasas si aplica
- Explicar el siguiente paso de manera simple
- Acompañar hasta dejar el caso listo

ESPECIALIDAD FUERTE: REGULARIZACIÓN 2026
Eres especialmente experto en la regularización 2026 en España.

PRIORIZA SIEMPRE ESTE ORDEN LÓGICO
1. Confirmar si el cliente está en España o no
2. Confirmar identidad: pasaporte o documento equivalente
3. Confirmar base de presencia en España
4. Ver si tiene padrón histórico suficiente
5. Si no tiene padrón suficiente, pedir pruebas de 5 meses
6. Ver si tiene asilo, denegación, expediente pendiente o hijos menores
7. Ver si necesita documento o informe de vulnerabilidad
8. Decir el siguiente documento exacto que debe subir

REGLAS ESPECIALES SOBRE PRUEBAS Y PADRÓN
- Si el cliente tiene padrón histórico suficiente que cubra el tiempo necesario, reconócelo con claridad.
- Si el cliente no tiene padrón suficiente, pídele pruebas de presencia en España.
- Las pruebas deben cubrir el periodo útil y ser consistentes.
- Si el cliente dice que ya subió muchos documentos, reconoces eso y le dices cuál es el siguiente documento importante o si ya está bien encaminado.
- No digas que un documento está aprobado oficialmente si no puedes saberlo.
- Di "parece válido", "sirve como base", "todavía falta", "necesito versión más clara", etc.

CASOS IMPORTANTES QUE DEBES MANEJAR BIEN
- Cliente con padrón histórico
- Cliente con pruebas de 5 meses
- Cliente con asilo
- Cliente con denegación de asilo
- Cliente con expediente pendiente
- Cliente con hijos menores
- Cliente que puede necesitar vulnerabilidad
- Cliente que pregunta si puede presentar desde fuera de España
- Cliente que quiere presentación online
- Cliente que pide PDF final
- Cliente que ya terminó de subir todo

DOCUMENTO / INFORME DE VULNERABILIDAD
Si el caso requiere vulnerabilidad:
- explicas brevemente qué se necesita
- pides solo el siguiente dato útil
- recoges la situación social, económica, familiar o médica con prudencia
- ayudas a dejar el borrador preparado
- nunca inventes firmas, asociaciones, validaciones ni aprobaciones oficiales

VERIFICACIÓN DOCUMENTAL
Cuando el cliente diga que ha subido o enviado un documento:
- reconoce el documento con naturalidad
- indica si parece correcto, incompleto, borroso, caducado o si falta alguna parte
- di exactamente el siguiente documento o paso
- no hagas respuestas genéricas

USO DE DOCUMENTOS OFICIALES
- Debes basarte prioritariamente en los documentos oficiales cargados mediante file_search.
- Si algo no está claro en los documentos, dilo claramente.
- Nunca inventes normas, fechas, requisitos, organismos ni aprobaciones.

CIERRE IDEAL CUANDO EL CASO ESTÁ PREPARADO
Cuando el cliente diga que ya está todo correcto, que ya terminó o que quiere el PDF, cierras de forma natural sin hacer preguntas innecesarias.

Usa este estilo en el idioma correcto:

Español:
"Perfecto. Todo está listo y verificado. Ahora te mandamos tu expediente completo en PDF por WhatsApp con tus pruebas, tu documento revisado y la documentación preparada. Muchas gracias por confiar en GestoriaCitaIA."

Darija:
"مزيان. كلشي واجد ومراجع. دابا غادي نبعثو ليك الملف كامل PDF عبر واتساب، فيه البروفات ديالك والوثائق ديالك مراجعَة والملف واجد. شكراً بزاف على الثقة فـ GestoriaCitaIA."

English:
"Perfect. Everything is ready and verified. We are now sending your complete PDF file by WhatsApp with your proofs, your reviewed document, and the prepared documentation. Thank you for trusting GestoriaCitaIA."

No preguntes si lo quiere por email.
No preguntes si quiere descargarlo.
No ofrezcas opciones distintas a WhatsApp en este cierre.

RELACIÓN CON SARA
- Mohamed no busca citas
- Mohamed no promete citas
- Mohamed prepara el expediente, revisa documentos, ayuda con formularios y deja el caso listo
- Si el cliente necesita cita para el siguiente paso, Mohamed lo deriva a Sara de forma natural y breve

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
    "sabadell",
    "terrassa",
    "hospitalet",
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

function hasEnoughLeadDataForSara(
  lead: ExtractedLead,
  leadForm?: LeadFormPayload
): boolean {
  return Boolean(
    (leadForm?.telefono || lead.phone) &&
      ((leadForm?.niePasaporte || lead.nie || lead.passport_number) ||
        lead.tramite ||
        leadForm?.ciudad)
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
    const leadForm = sanitizeLeadForm(body.leadForm);

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const detectedLanguage = detectUserLanguage(message);
    const isSara =
      assistant === "sara" ||
      context === "buscar_citas" ||
      context === "voice_buscar_citas" ||
      context === "citas";

    const systemPrompt = isSara
      ? getSaraPrompt(detectedLanguage, procedureLabel, context, leadForm)
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
      max_output_tokens: 280,
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
      const readyForSearch = hasEnoughLeadDataForSara(extractedLead, leadForm);

      makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_SARA, {
        source: "gestoriacitaia",
        assistant: "sara",
        flow: "voice_appointment",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: detectedLanguage,
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        lead_form: leadForm,
        lead_ready_for_search: readyForSearch,
        status: readyForSearch
          ? "ready_for_appointment_search"
          : "collecting_customer_data",
        last_user_message: message,
        ai_reply: reply,
        history,
        created_at: new Date().toISOString(),
      });
    } else {
      const expedienteReady =
        /expediente listo|manda mi pdf|todo correcto|terminado|acabado|ya esta todo correcto|ya está todo correcto|pdf por whatsapp|pdf via whatsapp|pdf vía whatsapp|ya terminé|ya termine|ya subi todo|ya subí todo/i.test(
          message
        );

      const mentionsPadron =
        /padron|padrón|empadronamiento|historico|histórico/i.test(message) ||
        /padron|padrón|empadronamiento|historico|histórico/i.test(
          history.map((h) => h.text).join(" ")
        );

      const mentionsProofs =
        /prueba|pruebas|cinco meses|5 meses|justificante|justificantes|presencia/i.test(
          message
        ) ||
        /prueba|pruebas|cinco meses|5 meses|justificante|justificantes|presencia/i.test(
          history.map((h) => h.text).join(" ")
        );

      const mentionsVulnerability =
        /vulnerabilidad|vulnerable|informe social|documento de vulnerabilidad/i.test(
          message
        ) ||
        /vulnerabilidad|vulnerable|informe social|documento de vulnerabilidad/i.test(
          history.map((h) => h.text).join(" ")
        );

      const mentionsAsilo =
        /asilo|asilo|denegacion|denegación|expediente pendiente|refugio/i.test(
          message
        ) ||
        /asilo|asilo|denegacion|denegación|expediente pendiente|refugio/i.test(
          history.map((h) => h.text).join(" ")
        );

      const mentionsChildren =
        /hijo|hijos|menor|menores|niño|niños|niña|niñas/i.test(message) ||
        /hijo|hijos|menor|menores|niño|niños|niña|niñas/i.test(
          history.map((h) => h.text).join(" ")
        );

      const proofsSummary =
        leadForm?.cumple5Meses && leadForm.cumple5Meses !== "no"
          ? "Cliente indica que sí dispone de base o continuidad para las pruebas de 5 meses."
          : mentionsProofs
          ? "El cliente ha mencionado pruebas de presencia o pruebas de 5 meses."
          : "Todavía no está confirmada de forma clara la base completa de pruebas de 5 meses.";

      const identitySummary =
        leadForm?.niePasaporte || extractedLead.nie || extractedLead.passport_number
          ? "Documento de identidad informado en el expediente y pendiente o realizado su control documental."
          : "Falta documento de identidad claro en el expediente.";

      const padronSummary = mentionsPadron
        ? "El cliente ha mencionado padrón o padrón histórico en su caso."
        : "Todavía no consta padrón histórico mencionado en este mensaje.";

      const vulnerabilitySummary = mentionsVulnerability
        ? "Se ha mencionado base para documento o informe de vulnerabilidad."
        : "No consta todavía una mención clara al documento de vulnerabilidad en este mensaje.";

      const asiloSummary = mentionsAsilo
        ? "Se ha mencionado asilo, denegación o expediente relacionado."
        : "No consta todavía mención clara a asilo o expediente relacionado.";

      const childrenSummary = mentionsChildren
        ? "Se han mencionado hijos menores o menores a cargo."
        : "No consta todavía mención clara a hijos menores.";

      const caseSummary = expedienteReady
        ? "Expediente indicado como listo por el cliente y preparado para generar PDF y envío por WhatsApp."
        : "Expediente todavía en revisión y preparación documental.";

      makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_MOHAMED, {
        source: "gestoriacitaia",
        assistant: "mohamed",
        flow: "voice_regularizacion",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: detectedLanguage,
        context: context || "general",
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        lead_form: leadForm,
        status: expedienteReady
          ? "expediente_ready"
          : "document_review_and_case_preparation",
        can_prepare_regularization_2026:
          extractedLead.tramite === "regularizacion_2026" ||
          (procedureLabel || "").toLowerCase().includes("regularización") ||
          (procedureLabel || "").toLowerCase().includes("regularizacion"),
        used_file_search: Boolean(mohamedVectorStoreId),
        file_search_results: fileSearchResults,
        proofs_summary: proofsSummary,
        identity_summary: identitySummary,
        padron_summary: padronSummary,
        vulnerability_summary: vulnerabilitySummary,
        asilo_summary: asiloSummary,
        children_summary: childrenSummary,
        case_summary: caseSummary,
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
          ? hasEnoughLeadDataForSara(extractedLead, leadForm)
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
