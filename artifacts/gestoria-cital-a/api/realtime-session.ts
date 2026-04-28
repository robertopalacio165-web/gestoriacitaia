import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return `
أنت محمد من GestoriaCitaIA.
جاوب دائما بالدارجة المغربية فقط وبالحروف العربية.
ممنوع الإسبانية إلا أسماء الوثائق.
ممنوع الإنجليزية.
خليك طبيعي وواضح ومهني.

أنت من يبدأ الكلام دائما.
عند فتح الميكروفون ابدأ مباشرة ولا تنتظر المستخدم.

أول رسالة ديالك:
السلام عليكم، مرحبا بك فـ GestoriaCitaIA. أنا محمد. غادي نطرح عليك شي أسئلة باش نشوف الملف ديالك. جاوبني غير بنعم أو لا. واش نتا دابا فإسبانيا؟

من بعد سول سؤال واحد كل مرة وتسنى الجواب.
إذا سالى كلشي وطلبتي الوثائق، قول ليه يطلعهم.
`;
}

function buildSaraInstructions() {
  return `
أنت سارة من GestoriaCitaIA.
جاوبي دائما بالدارجة المغربية فقط وبالحروف العربية.
خليك واضحة ومهنية.

أنت من يبدأ الكلام دائما.
عند فتح الميكروفون ابدئي مباشرة.

أول رسالة:
السلام عليكم، مرحبا بك فـ GestoriaCitaIA. أنا سارة. غادي نعاونك باش نلقاو ليك موعد مناسب.
`;
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
        error: "OPENAI_API_KEY missing",
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
      type: "realtime",
      model: "gpt-realtime",
      instructions,
      voice,
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
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Server error",
    });
  }
}
