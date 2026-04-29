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
      nie_pasaporte,
      documents = [],
    } = body;

    const docsOk = Array.isArray(documents)
      ? documents.filter((d: any) => d?.estado === "ok")
      : [];

    const docsWarn = Array.isArray(documents)
      ? documents.filter((d: any) => d?.estado !== "ok")
      : [];

    let score = 0;

    if (cumple_5_meses === "yes") score += 40;
    if (nie_pasaporte) score += 20;
    if (docsOk.length >= 3) score += 25;
    if (ciudad) score += 5;
    if (fecha_llegada) score += 10;

    let nivel = "ضعيف ❌";
    if (score >= 75) nivel = "قوي ✅";
    else if (score >= 50) nivel = "متوسط ⚠️";

    const acceptedText =
      docsOk.length > 0
        ? docsOk.map((d: any, i: number) => `${i + 1}. ${d.nombre} ✅`).join("\n")
        : "ما كايناش وثائق مقبولة حالياً";

    const rejectedText =
      docsWarn.length > 0
        ? docsWarn.map((d: any, i: number) => `${i + 1}. ${d.nombre} ⚠️`).join("\n")
        : "ما كايناش";

    const report = `
📁 GestoriaCitaIA - Reporte Final

👤 الاسم: ${nombre || "-"}
📞 الهاتف: ${telefono || "-"}
📍 المدينة: ${ciudad || "-"}
🌍 الجنسية: ${nacionalidad || "-"}
📅 تاريخ الدخول: ${fecha_llegada || "-"}

📊 تقييم الملف: ${nivel}
📈 النقطة: ${score}/100

🪪 هوية:
${nie_pasaporte ? "✅ متوفرة" : "❌ ناقصة"}

📌 5 شهور:
${cumple_5_meses === "yes" ? "✅ متوفرة" : "❌ غير مؤكدة"}

📎 الوثائق المقبولة:
${acceptedText}

⚠️ وثائق تحتاج مراجعة:
${rejectedText}

📝 الخلاصة:
${
  score >= 75
    ? "الملف باين قوي وعندو حظوظ مزيانة."
    : score >= 50
    ? "الملف متوسط، خاصنا نقويوه بوثائق أكثر."
    : "الملف ضعيف حالياً، خاص نزيدو بروفات ووثائق."
}

شكراً على الثقة ديالك فـ GestoriaCitaIA
`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(report.trim());
  } catch (error: any) {
    return res.status(500).send(
      error?.message || "Server Error"
    );
  }
}
