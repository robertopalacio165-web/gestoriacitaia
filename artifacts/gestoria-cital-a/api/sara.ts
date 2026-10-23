import type { VercelRequest, VercelResponse } from "@vercel/node";

const ASSISTANT_ID = "asst_3G5bN4wX6BmtWjk9uiA6eVUa";
const API_BASE = "https://api.openai.com/v1";

async function openai(path: string, init: RequestInit = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Falta la variable privada OPENAI_API_KEY en el servidor.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error?.message === "string" ? body.error.message : "Error al consultar OpenAI.");
  }
  return body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const mensaje = req.body?.mensaje;
  if (typeof mensaje !== "string" || !mensaje.trim() || mensaje.length > 12000) {
    return res.status(400).json({ error: "El mensaje es obligatorio y debe tener como máximo 12000 caracteres." });
  }

  try {
    const thread = await openai("/threads", { method: "POST", body: "{}" });
    await openai(`/threads/${thread.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ role: "user", content: mensaje }),
    });
    const run = await openai(`/threads/${thread.id}/runs`, {
      method: "POST",
      body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
    });

    let status = run.status;
    let attempts = 0;
    while (status !== "completed" && !["failed", "cancelled", "expired", "incomplete", "requires_action"].includes(status)) {
      if (attempts++ >= 45) throw new Error("Tiempo de espera agotado para la respuesta de Sara.");
      await new Promise(resolve => setTimeout(resolve, 500));
      const check = await openai(`/threads/${thread.id}/runs/${run.id}`, { method: "GET" });
      status = check.status;
    }
    if (status !== "completed") throw new Error(`La ejecución de Sara terminó con estado: ${status}`);

    const messages = await openai(`/threads/${thread.id}/messages?limit=20`, { method: "GET" });
    const latest = messages?.data?.find((item: any) => item.role === "assistant");
    const respuesta = latest?.content?.find((item: any) => item.type === "text")?.text?.value;
    return res.status(200).json({ respuesta: respuesta || "Sara no devolvió respuesta." });
  } catch (error) {
    console.error("Error en API de Sara:", error instanceof Error ? error.message : "Error desconocido");
    return res.status(500).json({ error: "No se pudo completar la respuesta de Sara. Inténtalo de nuevo." });
  }
}
