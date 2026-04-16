import OpenAI from "openai";

type ChatHistoryItem = {
  from: "agent" | "user";
  text: string;
};

type LeadForm = {
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

type EnviarMensajeMohamedInput = {
  message: string;
  lang?: string;
  context?: string;
  sessionId?: string;
  userId?: string;
  procedureKey?: string;
  procedureLabel?: string;
  history?: ChatHistoryItem[];
  leadForm?: LeadForm;
};

const MOHAMED_ASSISTANT_ID = "asst_lfID0KAxoIlvWreiFFDNiVxf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildLeadFormText(leadForm?: LeadForm) {
  if (!leadForm) return "";

  const lines = [
    `NOMBRE: ${leadForm.nombre || "vacío"}`,
    `TELÉFONO: ${leadForm.telefono || "vacío"}`,
    `EMAIL: ${leadForm.email || "vacío"}`,
    `NIE O PASAPORTE: ${leadForm.niePasaporte || "vacío"}`,
    `CIUDAD: ${leadForm.ciudad || "vacío"}`,
    `NACIONALIDAD: ${leadForm.nacionalidad || "vacío"}`,
    `FECHA LLEGADA A ESPAÑA: ${leadForm.fechaLlegada || "vacío"}`,
    `CUMPLE 5 MESES: ${leadForm.cumple5Meses || "vacío"}`,
    `ASILO: ${leadForm.asilo || "vacío"}`,
    `ANTECEDENTES PENALES: ${leadForm.penales || "vacío"}`,
  ];

  return `DATOS DEL FORMULARIO:\n${lines.join("\n")}`;
}

function buildMohamedMessage(input: EnviarMensajeMohamedInput) {
  const {
    message,
    lang = "es",
    context = "general",
    sessionId = "",
    userId = "",
    procedureKey = "",
    procedureLabel = "",
    history = [],
    leadForm,
  } = input;

  const historyText = Array.isArray(history)
    ? history
        .slice(-10)
        .map(
          (item) =>
            `${item.from === "user" ? "CLIENTE" : "MOHAMED"}: ${item.text}`
        )
        .join("\n")
    : "";

  const leadFormText = buildLeadFormText(leadForm);

  return [
    `MENSAJE DEL CLIENTE: ${message}`,
    `IDIOMA UI: ${lang}`,
    `CONTEXTO: ${context}`,
    `PROCEDURE KEY: ${procedureKey || "vacío"}`,
    `PROCEDURE LABEL: ${procedureLabel || "vacío"}`,
    `SESSION ID: ${sessionId || "vacío"}`,
    `USER ID: ${userId || "vacío"}`,
    leadFormText,
    historyText ? `HISTORIAL RECIENTE:\n${historyText}` : "",
    `INSTRUCCIÓN IMPORTANTE:
- Responde en el idioma del cliente.
- Si el cliente habla darija o árabe, responde en darija marroquí escrita con letras árabes.
- Si habla español, responde en español.
- Si habla inglés, responde en inglés.
- Sé humano, profesional y breve.
- Si ya tienes datos del formulario, no vuelvas a pedirlos todos otra vez.
- Si faltan documentos, pide solo el siguiente paso.
- Si el cliente pregunta por regularización 2026, céntrate en pruebas de 5 meses, pasaporte, documentos, formulario de vulnerabilidad y siguiente paso.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function enviarMensajeMohamed(
  input: EnviarMensajeMohamedInput
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en variables de entorno del servidor");
  }

  const thread = await openai.beta.threads.create();

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: buildMohamedMessage(input),
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: MOHAMED_ASSISTANT_ID,
  });

  let status = run.status;
  let attempts = 0;
  const maxAttempts = 60;

  while (
    status !== "completed" &&
    status !== "failed" &&
    status !== "cancelled" &&
    status !== "expired"
  ) {
    if (attempts >= maxAttempts) {
      throw new Error("Tiempo agotado esperando respuesta de Mohamed");
    }

    await new Promise((resolve) => setTimeout(resolve, 700));

    const runCheck = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    status = runCheck.status;
    attempts += 1;
  }

  if (status !== "completed") {
    throw new Error(`La ejecución de Mohamed terminó con estado: ${status}`);
  }

  const messages = await openai.beta.threads.messages.list(thread.id);

  const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

  const textPart = assistantMessage?.content?.find(
    (part: any) => part.type === "text"
  ) as any;

  const respuesta =
    textPart?.text?.value?.trim() || "Mohamed no devolvió respuesta.";

  return respuesta;
}
