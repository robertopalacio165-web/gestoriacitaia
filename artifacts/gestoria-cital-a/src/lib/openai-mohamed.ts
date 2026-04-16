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

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";

const MOHAMED_ASSISTANT_ID = "asst_lfID0KAxoIlvWreiFFDNiVxf";

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
  if (!OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY o VITE_OPENAI_API_KEY");
  }

  const threadRes = await fetch("https://api.openai.com/v1/threads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({}),
  });

  if (!threadRes.ok) {
    const errorText = await threadRes.text();
    throw new Error(`Error creando thread Mohamed: ${errorText}`);
  }

  const thread = await threadRes.json();

  const messageRes = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        role: "user",
        content: buildMohamedMessage(input),
      }),
    }
  );

  if (!messageRes.ok) {
    const errorText = await messageRes.text();
    throw new Error(`Error enviando mensaje Mohamed: ${errorText}`);
  }

  const runRes = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/runs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: MOHAMED_ASSISTANT_ID,
      }),
    }
  );

  if (!runRes.ok) {
    const errorText = await runRes.text();
    throw new Error(`Error creando run Mohamed: ${errorText}`);
  }

  const run = await runRes.json();

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

    const checkRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    if (!checkRes.ok) {
      const errorText = await checkRes.text();
      throw new Error(`Error consultando run Mohamed: ${errorText}`);
    }

    const checkData = await checkRes.json();
    status = checkData.status;
    attempts += 1;
  }

  if (status !== "completed") {
    throw new Error(`La ejecución de Mohamed terminó con estado: ${status}`);
  }

  const messagesRes = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
    }
  );

  if (!messagesRes.ok) {
    const errorText = await messagesRes.text();
    throw new Error(`Error obteniendo mensajes Mohamed: ${errorText}`);
  }

  const messages = await messagesRes.json();

  const assistantMessage = messages?.data?.find((msg: any) => msg.role === "assistant");

  const respuesta =
    assistantMessage?.content?.find((part: any) => part.type === "text")?.text?.value?.trim() ||
    "Mohamed no devolvió respuesta.";

  return respuesta;
}
