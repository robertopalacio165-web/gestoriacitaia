const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function enviarMensajeSara(mensaje: string) {
  // 1. Crear thread
  const threadRes = await fetch("https://api.openai.com/v1/threads", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  const thread = await threadRes.json();

  // 2. Enviar mensaje del usuario
  await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      role: "user",
      content: mensaje
    })
  });

  // 3. Ejecutar Sara
  const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assistant_id: "asst_3G5bN4wX6BmtWjk9uiA6eVUa"
    })
  });

  const run = await runRes.json();

  // 4. Esperar respuesta
  let status = run.status;

  while (status !== "completed") {
    await new Promise((r) => setTimeout(r, 1000));

    const check = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const data = await check.json();
    status = data.status;
  }

  // 5. Obtener respuesta final
  const messagesRes = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      }
    }
  );

  const messages = await messagesRes.json();

  return messages.data[0].content[0].text.value;
}
