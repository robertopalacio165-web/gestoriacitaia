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

    const docsOk = documents.filter((d: any) => d.estado === "ok");
    const docsBad = documents.filter((d: any) => d.estado !== "ok");

    const accepted = docsOk.length
      ? docsOk.map((d: any, i: number) => `${i + 1}. ${d.nombre} ✅`).join("\n")
      : "ما كايناش";

    const rejected = docsBad.length
      ? docsBad.map((d: any, i: number) => `${i + 1}. ${d.nombre} ⚠️`).join("\n")
      : "ما كايناش";

    const verdict =
      cumple_5_meses === "yes" && docsOk.length >= 3
        ? "الملف ديالك قوي 💪"
        : "الملف ديالك خاصو تقوية ⚠️";

    const report = `
👋 سلام ${nombre || ""}

📁 هذا التقييم ديال الملف ديالك:

📊 الحالة:
${verdict}

📆 5 شهور:
${cumple_5_meses === "yes" ? "✅ مكمل" : "❌ خاصك تكمل"}

📎 الوثائق المقبولة:
${accepted}

⚠️ الوثائق اللي خاصها تصحيح:
${rejected}

📄 هادي الوثيقة (Lettre de motivación) اللي غادي تقوي الملف ديالك بزاف:
👇
https://gestoriacitaia.com/api/generate-expediente-pdf?nombre=${encodeURIComponent(
      nombre || ""
    )}

📌 ضروري تضيفها فالملف ديالك حيث كتعاون بزاف فالتسوية الجماعية.

🙏 توكل على الله، وشكراً على الثقة ديالك فـ GestoriaCitaIA

🎁 عرض خاص:
إلى دخلتي 3 ديال الناس بهاد الكود:

👉 CITA2026

وغادي تربح شهر فابور 🔥
`.trim();

    return res.status(200).json({
      report,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
