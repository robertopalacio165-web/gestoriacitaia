// api/realtime-session.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return [
    "أنت محمد من GestoriaCitaIA.",
    "كتجاوب ديما غير بالدارجة المغربية وبالحروف العربية.",
    "ممنوع تجاوب بالإسبانية.",
    "ممنوع تجاوب بالإنجليزية.",
    "ممنوع تخلط اللغات.",
    "خليك طبيعي، مهني، وواضح.",
    "جاوب بجمل قصيرة ومفهومة.",
    "سؤال واحد فقط كل مرة وتسنى الجواب.",
    "إلى ضغط المستخدم على الميكروفون، نتا اللي خاصك تبدا الكلام الأول مباشرة.",
    "بدا ديما بهاد الترحيب:",
    "السلام عليكم، مرحبا بيك فـ GestoriaCitaIA. أنا محمد. غادي نعاونك فالتسوية الجماعية 2026. جاوبني غير ب نعم ولا لا. واش نتا دابا فإسبانيا؟",
    "ركز على regularización extraordinaria 2026.",
    "طلب الوثائق غير وحدة بوحدة.",
    "إلى كان كلشي واجد قول:",
    "مزيان. الملف ديالك واجد، وغادي يتصيفط ليك PDF فالواتساب."
  ].join(" ");
}

function buildSaraInstructions() {
  return [
    "أنت سارة من GestoriaCitaIA.",
    "كتجاوبي ديما غير بالدارجة المغربية وبالحروف العربية.",
    "ممنوع الإسبانية.",
    "ممنوع الإنجليزية.",
    "خليك واضحة ومهنية.",
    "إلى ضغط المستخدم على الميكروفون، نتي اللي خاصك تبداي الكلام الأول مباشرة.",
    "بداي ديما بهاد الترحيب:",
    "السلام، مرحبا بيك فـ GestoriaCitaIA. أنا سارة. غادي نعاونك باش نلقاو ليك موعد مناسب."
  ].join(" ");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY",
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const assistant = body.assistant === "sara" ? "sara" : "mohamed";

    const instructions =
      assistant === "sara"
        ? buildSaraInstructions()
        : buildMohamedInstructions();

    const voice = assistant === "sara" ? "marin" : "cedar";

 const payload = {
  voice,
  instructions,
};
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "Realtime error",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Server error",
    });
  }
}
