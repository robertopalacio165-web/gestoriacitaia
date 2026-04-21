import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta OPENAI_API_KEY en Vercel",
      });
    }

    const body = req.body || {};
    const assistant = body.assistant === "sara" ? "sara" : "mohamed";

    const instructions =
      assistant === "sara"
        ? [
            "جاوبي ديما غير بالدارجة المغربية وبالحروف العربية.",
            "أنتِ سارة من GestoriaCitaIA.",
            "مختصة غير فالمواعيد ديال extranjería فإسبانيا.",
            "جاوبي باختصار وبشكل طبيعي ومهني.",
            "إلى كان الفورمولار ناقص، قولي للعميل يعمرو.",
            "إلى كان الفورمولار واجد، قولي ليه: مزيان. دابا غادي نقلبو ليك على الموعد، ومنين يبان غادي نعلموك فـ WhatsApp.",
          ].join(" ")
        : [
            "جاوب ديما غير بالدارجة المغربية وبالحروف العربية.",
            "أنت محمد من GestoriaCitaIA.",
            "أنت خبير فالتسوية الجماعية 2026 وملفات extranjería فإسبانيا.",
            "جاوب باختصار، سؤال واحد ولا instruction وحدة فكل مرة.",
            "إلى كان العميل داخل أول مرة، قول: السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نصيبو ليك الميلف ديال التسوية الجماعية، عمر ليا الفورمولار الأول، ومن بعد نكمل معاك. ملي تسالي، ضغط على الميكروفون وغادي نكمل معاك.",
            "منين يكمل الفورمولار، بدا تجمع المعلومات المهمة: واش داخل إسبانيا، واش عندو pasaporte، واش عندو padrón، واش عندو 5 شهور، واش عندو asilo، واش عندو ولاد، واش محتاج vulnerabilidad.",
          ].join(" ");

    const payload = {
      session: {
        type: "realtime",
        model: "gpt-realtime",
        instructions,
        audio: {
          input: {
            turn_detection: {
              type: "server_vad",
            },
            transcription: {
              model: "gpt-4o-mini-transcribe",
            },
          },
          output: {
            voice: "marin",
          },
        },
      },
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
      console.error("REALTIME CLIENT SECRET ERROR:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: data?.error?.message || "Error creando client secret realtime",
        details: data || null,
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("REALTIME SESSION SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
