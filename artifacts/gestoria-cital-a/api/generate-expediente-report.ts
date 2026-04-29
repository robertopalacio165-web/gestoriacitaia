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
        ? JSON.parse(req.body)
        : req.body || {};

    const {
      nombre,
      telefono,
      ciudad,
      nacionalidad,
      fecha_llegada,
      cumple_5_meses,
      nie_pasaporte,
      documents = [],
    } = body;

    const report = `
📁 GestoriaCitaIA - Reporte Final

👤 الاسم: ${nombre || "-"}
📞 الهاتف: ${telefono || "-"}
📍 المدينة: ${ciudad || "-"}
🌍 الجنسية: ${nacionalidad || "-"}
📅 تاريخ الدخول: ${fecha_llegada || "-"}

🪪 هوية: ${nie_pasaporte ? "✅ متوفرة" : "❌ ناقصة"}
📌 5 شهور: ${cumple_5_meses === "yes" ? "✅" : "❌"}

📎 عدد الوثائق: ${documents.length}

📝 الملف توصل للمراجعة النهائية.

شكراً على الثقة ديالك فـ GestoriaCitaIA
`.trim();

    return res.status(200).send(report);
  } catch (error: any) {
    return res.status(500).send(error?.message || "Server Error");
  }
}
