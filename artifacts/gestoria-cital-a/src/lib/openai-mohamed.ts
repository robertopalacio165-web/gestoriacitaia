import OpenAI from "openai";

type ChatHistoryItem = {
  from: "agent" | "user";
  text: string;
};

type EnviarMensajeMohamedInput = {
  message: string;
  lang?: string;
  context?: string;
  sessionId?: string;
  userId?: string;
  history?: ChatHistoryItem[];
};

const MOHAMED_ASSISTANT_ID = "asst_lfID0KAxoIlvWreiFFDNiVxf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildMohamedMessage(input: EnviarMensajeMohamedInput) {
  const {
    message,
    lang = "es",
    context = "general",
    sessionId = "",
    userId = "",
    history = [],
  } = input;

  const historyText = Array.isArray(history)
    ? history
        .slice(-10)
        .map((item) => `${item.from === "user" ? "CLIENTE" : "MOHAMED"}: ${item.text}`)
        .join("\n")
    : "";

  return [
    `MENSAJE DEL CLIENTE: ${message}`,
    `IDIOMA UI: ${lang}`,
    `CONTEXTO: ${context}`,
    `SESSION ID: ${sessionId || "vacío"}`,
    `USER ID: ${userId || "vacío"}`,
    historyText ? `HISTORIAL RECIENTE:\n${historyText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function enviarMensajeMohamed(
  input: EnviarMensajeMohamedInput,
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
    (part: any) => part.type === "text",
  ) as any;

  const respuesta =
    textPart?.text?.value?.trim() || "Mohamed no devolvió respuesta.";

  return respuesta;
}
