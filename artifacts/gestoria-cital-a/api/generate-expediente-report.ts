import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const {
      nombre,
      telefono,
      ciudad,
      nacionalidad,
      fecha_llegada,
      cumple_5_meses,
      documents = [],
    } = body;

    const report = `
📁 GestoriaCitaIA - Reporte Final

👤 الاسم: ${nombre || "-"}
📞 الهاتف: ${telefono || "-"}
📍 المدينة: ${ciudad || "-"}
🌍 الجنسية: ${nacionalidad || "-"}
📅 تاريخ الدخول: ${fecha_llegada || "-"}

📌 5 شهور:
${cumple_5_meses === "yes" ? "✅ نعم" : "❌ لا"}

📎 عدد الوثائق:
${documents.length}

شكراً على الثقة ديالك فـ GestoriaCitaIA
`.trim();

    const token = "EAAX4uaZASSO0BRQsskoERLKcofZAIDtX9WZAQCiC5TdLNWPfeZBPqnLH4P9ZBzlhaV3kBZBa8u88aujoVfMVV5BrSC5FeZCVYR1kbg31A7qLZBPEZC9FU4YXomxjAZARXjUV9EJngZCcEovMoswU7ZBqZB4OxqDj8ZAYRj7fA6nV1NhtgukOEXFCr7Aey6ZAjFE516Clp0Ez3yTQQiZCSZB9k07gwDEpC4neL4tQxyFZC9ZCb3aa3yqzx226FWZClKqa0Rl2rgtFSAZANgQZAZAZAfIXInAtasY82Xg7NjtKAwZDZD";

    const response = await fetch(
      "https://graph.facebook.com/v20.0/1121390731046153/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "34644403748",
          type: "text",
          text: {
            body: report,
          },
        }),
      }
    );

    const data = await response.json();

    return res.status(200).json({
      ok: true,
      whatsapp: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
