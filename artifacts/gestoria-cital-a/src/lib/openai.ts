const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const SARA_ASSISTANT_ID = "asst_3G5bN4wX6BmtWjk9uiA6eVUa";
const OPENAI_BETA_HEADER = "assistants=v2";
const SARA_THREAD_KEY = "sara_thread_id";

type OpenAIThreadResponse = {
  id: string;
};

type OpenAIRunResponse = {
  id: string;
  status: string;
};

type OpenAIMessagesResponse = {
  data?: Array<{
    role?: string;
    content?: Array<{
      type?: string;
      text?: {
        value?: string;
      };
    }>;
  }>;
};

function getSaraThreadId(): string | null {
  try {
    return localStorage.getItem(SARA_THREAD_KEY);
  } catch {
    return null;
  }
}

function saveSaraThreadId(threadId: string) {
  try {
    localStorage.setItem(SARA_THREAD_KEY, threadId);
  } catch {
    // ignore
  }
}

export function resetSaraThread() {
  try {
    localStorage.removeItem(SARA_THREAD_KEY);
  } catch {
    // ignore
  }
}

async function createSaraThread(): Promise<string> {
  const threadRes = await fetch("https://api.openai.com/v1/threads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": OPENAI_BETA_HEADER,
    },
    body: JSON.stringify({}),
  });

  if (!threadRes.ok) {
    const errorText = await threadRes.text();
    throw new Error(`Error creando thread: ${errorText}`);
  }

  const thread = (await threadRes.json()) as OpenAIThreadResponse;

  if (!thread?.id) {
    throw new Error("No se pudo obtener el id del thread");
  }

  saveSaraThreadId(thread.id);
  return thread.id;
}

async function getOrCreateSaraThread(): Promise<string> {
  const savedThreadId = getSaraThreadId();

  if (savedThreadId) {
    return savedThreadId;
  }

  return createSaraThread();
}

async function addUserMessage(threadId: string, mensaje: string): Promise<void> {
  const messageRes = await fetch(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": OPENAI_BETA_HEADER,
      },
      body: JSON.stringify({
        role: "user",
        content: mensaje,
      }),
    }
  );

  if (!messageRes.ok) {
    const errorText = await messageRes.text();
    throw new Error(`Error enviando mensaje: ${errorText}`);
  }
}

async function createRun(threadId: string): Promise<OpenAIRunResponse> {
  const runRes = await fetch(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": OPENAI_BETA_HEADER,
      },
      body: JSON.stringify({
        assistant_id: SARA_ASSISTANT_ID,
      }),
    }
  );

  if (!runRes.ok) {
    const errorText = await runRes.text();
    throw new Error(`Error creando run: ${errorText}`);
  }

  return (await runRes.json()) as OpenAIRunResponse;
}

async function waitForRunCompletion(
  threadId: string,
  runId: string
): Promise<void> {
  let status = "queued";
  let attempts = 0;
  const maxAttempts = 120;

  while (
    status !== "completed" &&
    status !== "failed" &&
    status !== "cancelled" &&
    status !== "expired"
  ) {
    if (attempts >= maxAttempts) {
      throw new Error("Tiempo de espera agotado para la respuesta de Sara");
    }

    await new Promise((resolve) => setTimeout(resolve, 700));

    const checkRes = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": OPENAI_BETA_HEADER,
        },
      }
    );

    if (!checkRes.ok) {
      const errorText = await checkRes.text();
      throw new Error(`Error consultando run: ${errorText}`);
    }

    const checkData = (await checkRes.json()) as OpenAIRunResponse;
    status = checkData.status;
    attempts += 1;
  }

  if (status !== "completed") {
    throw new Error(`La ejecución terminó con estado: ${status}`);
  }
}

async function getLastAssistantMessage(threadId: string): Promise<string> {
  const messagesRes = await fetch(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": OPENAI_BETA_HEADER,
      },
    }
  );

  if (!messagesRes.ok) {
    const errorText = await messagesRes.text();
    throw new Error(`Error obteniendo mensajes: ${errorText}`);
  }

  const messages = (await messagesRes.json()) as OpenAIMessagesResponse;

  const assistantMessage = messages?.data?.find(
    (msg) => msg.role === "assistant"
  );

  const textValue = assistantMessage?.content?.find(
    (item) => item.type === "text"
  )?.text?.value;

  return textValue?.trim() || "Sara no devolvió respuesta.";
}

export async function enviarMensajeSara(mensaje: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("Falta VITE_OPENAI_API_KEY en las variables de entorno");
  }

  if (!mensaje.trim()) {
    throw new Error("El mensaje está vacío");
  }

  let threadId = await getOrCreateSaraThread();

  try {
    await addUserMessage(threadId, mensaje);
  } catch (error) {
    // Si el thread guardado se rompió o caducó, crea uno nuevo y reintenta una vez
    resetSaraThread();
    threadId = await createSaraThread();
    await addUserMessage(threadId, mensaje);
  }

  const run = await createRun(threadId);
  await waitForRunCompletion(threadId, run.id);
  return await getLastAssistantMessage(threadId);
}
