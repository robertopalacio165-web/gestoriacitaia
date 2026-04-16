import type { VercelRequest, VercelResponse } from "@vercel/node";
import { enviarMensajeSara } from "../src/lib/openai-sara";
import { enviarMensajeMohamed } from "../src/lib/openai-mohamed";

type ChatHistoryItem = {
  from: "agent" | "user";
  text: string;
};

function sendMethodNotAllowed(res: VercelResponse) {
  return res.status(405).json({
    error: "Method not allowed",
  });
}

function sendBadRequest(res: VercelResponse, message: string) {
  return res.status(400).json({
    error: message,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return sendMethodNotAllowed(res);
  }

  try {
    const {
      assistant = "sara",
      context = "general",
      message = "",
      lang = "es",
      procedureKey = "",
      procedureLabel = "",
      sessionId = "",
      userId = "",
      history = [],
    } = req.body || {};

    const cleanMessage =
      typeof message === "string" ? message.trim() : "";

    if (!cleanMessage) {
      return sendBadRequest(res, "Message is required");
    }

    const cleanHistory: ChatHistoryItem[] = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.from === "user" || item.from === "agent") &&
              typeof item.text === "string" &&
              item.text.trim().length > 0,
          )
          .map((item) => ({
            from: item.from,
            text: item.text.trim(),
          }))
      : [];

    let reply = "";

    if (assistant === "mohamed") {
      reply = await enviarMensajeMohamed({
        message: cleanMessage,
        lang,
        context,
        sessionId,
        userId,
        history: cleanHistory,
      });
    } else {
      reply = await enviarMensajeSara({
        message: cleanMessage,
        lang,
        context,
        procedureKey,
        procedureLabel,
        sessionId,
        userId,
        history: cleanHistory,
      });
    }

    return res.status(200).json({
      ok: true,
      reply,
    });
  } catch (error: any) {
    console.error("api/chat error:", error);

    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
