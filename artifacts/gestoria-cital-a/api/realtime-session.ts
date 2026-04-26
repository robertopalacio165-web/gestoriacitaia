import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return [
    "أنت محمد من GestoriaCitaIA. كتجاوب ديما غير بالدارجة المغربية وبالحروف العربية.",
    "إلى العميل عمر الفورمولار أو صيفط وثيقة، خاصك تأكد ليه بلي وصلاتك وتفرح معاه.",
    "ترتيب الخدمة: 1. الفورمولار، 2. بروفات 5 شهور، 3. الباسبور.",
    "إلى صيفط العميل شي وثيقة، قول ليه شنو هي واش باينة مزيان وشنو خاصو يصيفط من بعد.",
    "الرسالة الأولى: السلام، مرحبا بيك فـ GestoriaCitaIA. عمر ليا الفورمولار الأول باش نبداو مراجعة الملف ديالك."
  ].join(" ");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        instructions: buildMohamedInstructions(),
        voice: "ash",
      }),
    });

    const data = await response.json();
    return res.status(200).json({ value: data.client_secret.value });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
