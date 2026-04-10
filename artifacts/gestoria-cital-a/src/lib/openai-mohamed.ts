const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MOHAMED_ASSISTANT_ID = "asst_lfID0KAxoIlvWreiFFDNiVxf";

export async function enviarMensajeMohamed(mensaje: string): Promise<string> {
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
    throw new Error(`Error creando thread de Mohamed: ${errorText}`);
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
    throw new Error(`Error enviando mensaje a Mohamed: ${errorText}`);
  }

  // 3) Ejecutar Mohamed
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
    throw new Error(`Error creando run de Mohamed: ${errorText}`);
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
      throw new Error("Tiempo de espera agotado para la respuesta de Mohamed");
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
      throw new Error(`Error consultando run de Mohamed: ${errorText}`);
    }

    const checkData = await checkRes.json();
    status = checkData.status;
    attempts += 1;
  }

  if (status !== "completed") {
    throw new Error(`La ejecución de Mohamed terminó con estado: ${status}`);
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
    throw new Error(`Error obteniendo mensajes de Mohamed: ${errorText}`);
  }

  const messages = await messagesRes.json();

  const respuesta =
    messages?.data?.find((msg: any) => msg.role === "assistant")?.content?.[0]
      ?.text?.value || "Mohamed no devolvió respuesta.";

  return respuesta;
}
