const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const SARA_ASSISTANT_ID = "asst_3G5bN4wX6BmtWjk9uiA6eVUa";

export async function enviarMensajeSara(mensaje: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("Falta VITE_OPENAI_API_KEY en las variables de entorno");
  }

  // 1) Crear thread
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
    throw new Error(`Error creando thread: ${errorText}`);
  }

  const thread = await threadRes.json();

  // 2) Enviar mensaje del usuario
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
        content: mensaje,
      }),
    }
  );

  if (!messageRes.ok) {
    const errorText = await messageRes.text();
    throw new Error(`Error enviando mensaje: ${errorText}`);
  }

  // 3) Ejecutar Sara
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
        assistant_id: SARA_ASSISTANT_ID,
      }),
    }
  );

  if (!runRes.ok) {
    const errorText = await runRes.text();
    throw new Error(`Error creando run: ${errorText}`);
  }

  const run = await runRes.json();

  // 4) Esperar respuesta
  let status = run.status;
  let attempts = 0;
  const maxAttempts = 45;

  while (
    status !== "completed" &&
    status !== "failed" &&
    status !== "cancelled" &&
    status !== "expired"
  ) {
    if (attempts >= maxAttempts) {
      throw new Error("Tiempo de espera agotado para la respuesta de Sara");
    }

   await new Promise((r) => setTimeout(r, 350));

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
      throw new Error(`Error consultando run: ${errorText}`);
    }

    const checkData = await checkRes.json();
    status = checkData.status;
    attempts += 1;
  }

  if (status !== "completed") {
    throw new Error(`La ejecución terminó con estado: ${status}`);
  }

  // 5) Obtener respuesta final
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
    throw new Error(`Error obteniendo mensajes: ${errorText}`);
  }

  const messages = await messagesRes.json();

  const respuesta =
    messages?.data?.find((msg: any) => msg.role === "assistant")?.content?.[0]
      ?.text?.value || "Sara no devolvió respuesta.";

  return respuesta;
}
