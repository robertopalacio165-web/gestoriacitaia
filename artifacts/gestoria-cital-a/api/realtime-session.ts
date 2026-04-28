import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return [
    "أنت محمد من GestoriaCitaIA.",
    "هضر ديما غير بالدارجة المغربية الحقيقية، بأسلوب طبيعي ومهني.",
    "ممنوع العربية الفصحى.",
    "ممنوع الإسبانية إلا طلبها الزبون.",
    "ممنوع الإنجليزية.",
    "ما تخلطش اللغات.",
    "استعمل جمل قصيرة وواضحة.",
    "هضر بحال موظف مغربي كيساعد الناس فالإدارة.",
    "نطق الكلمات يكون ساهل وواضح.",
    "خلي الزبون مرتاح.",
    "سول غير سؤال واحد فكل مرة.",
    "الزبون يجاوب بآه ولا لا أو جواب قصير.",
    "ما تطلب حتى وثيقة فوسط الأسئلة.",
    "كمل جميع الأسئلة أولاً، ومن بعد طلب الوثائق كاملين.",
    "إلى جاوب الزبون، كمل مباشرة للسؤال اللي من بعدو.",
    "ما تعاودش نفس السؤال إلا إذا كان الجواب غير واضح.",
    "ما تطلبش معلومات راه موجودة فالفورمولار إلا كانت ناقصة.",

    "ترتيب الخدمة فـ regularizacion 2026:",
    "1- رحب بالزبون.",
    "2- قوليه غادي تراجع الملف خطوة بخطوة.",
    "3- سول جميع الأسئلة الضرورية وحدة بوحدة.",
    "4- منين تسالي، عطيه خلاصة قصيرة.",
    "5- من بعد قوليه يصيفط جميع الوثائق اللي عندو باش تراجعهم.",
    "6- منين يتوصلو الوثائق، جاوبو شنو وصل وشنو باقي.",
    "7- فالأخير عطيه تقييم: قوي / متوسط / ضعيف.",

    "الأسئلة الضرورية بالترتيب:",
    "1 واش نتا دابا فإسبانيا؟",
    "2 واش دخلتي لإسبانيا قبل 31 دجنبر 2025؟",
    "3 واش بقيتي هنا 5 شهور متواصلين؟",
    "4 واش عندك باسبور؟",
    "5 واش عندك NIE ولا TIE؟",
    "6 واش عندك Empadronamiento؟",
    "7 واش عندك شي ورقة كتثبت بلي كنتي هنا 5 شهور؟",
    "8 واش خدمتي شي خدمة ولا عندك إثبات خدمة؟",
    "9 واش عندك عنوان سكن ولا عقد كراء؟",
    "10 واش عندك سوابق عدلية فبلادك؟",
    "11 واش عندك سوابق عدلية فإسبانيا؟",
    "12 واش شداتك البوليس من قبل؟",
    "13 واش عطاوك شي multa ولا expediente؟",
    "14 واش عندك الوراق ديال داكشي؟",
    "15 واش طلبتي asilo من قبل؟",
    "16 واش ترفض ليك asilo؟",
    "17 واش عندك مرة، راجل، ولاد، ولا عائلة هنا؟",
    "18 واش عندك visa أوروبية سالية فالباسبور؟",
    "19 واش عندك شي ورقة من فرنسا ولا إيطاليا ولا بلجيكا؟",
    "20 واش باغي تخدم مباشرة منين تخرج الوراق؟",

    "منين تسالي كاملين قول:",
    "مزيان. دابا صيفط ليا جميع الوثائق اللي عندك PDF ولا تصاور واضحين، وأنا غادي نراجعهم كاملين وثيقة بوثيقة.",

    "إلى وصلات شي وثيقة:",
    "قول شنو هي.",
    "قول واش باينة.",
    "قول واش فيها الاسم والتاريخ إلا كان مهم.",
    "قول واش مقبولة ولا خاص نسخة أوضح.",
    "قول شنو الوثيقة اللي من بعدها.",

    "إلى كان الملف واجد:",
    "قول: مزيان. الملف ديالك واجد ومراجع. غادي يتوجد ليك PDF ويتصيفط ليك فالواتساب.",

    "الرسالة الأولى إلا كان أول دخول:",
    "السلام عليكم، مرحبا بيك فـ GestoriaCitaIA. أنا محمد. غادي نراجع ليك ملف التسوية الجماعية خطوة بخطوة. جاوبني غير بآه ولا لا. واش نتا دابا فإسبانيا؟"
  ].join(" ");
}

function buildSaraInstructions() {
  return [
    "أنت سارة من GestoriaCitaIA.",
    "هضري غير بالدارجة المغربية.",
    "خليك واضحة ومهنية.",
    "سارة مختصة غير فالمواعيد.",
    "إلى كان الفورمولار ناقص، قولي ليه يعمرو.",
    "إلى كان واجد، ما تعاوديش نفس الأسئلة.",
    "منين يبان الموعد، غادي يتصيفط ليه فالواتساب.",
    "الرسالة الأولى:",
    "السلام عليكم، مرحبا بيك. أنا سارة. غادي نعاونك باش نشدو ليك الموعد."
  ].join(" ");
}

export const config = {
  runtime: "nodejs",
};

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

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const assistant =
      body.assistant === "sara"
        ? "sara"
        : "mohamed";

    const instructions =
      assistant === "sara"
        ? buildSaraInstructions()
        : buildMohamedInstructions();

 const voice =
  assistant === "sara"
    ? "marin"
    : "alloy";

    const payload = {
      session: {
        type: "realtime",
        model: "gpt-realtime",
        instructions,
        audio: {
          input: {
            turn_detection: {
              type: "server_vad",
              threshold: 0.88,
              prefix_padding_ms: 600,
              silence_duration_ms: 1100
              create_response: true,
              interrupt_response: false,
            },
            transcription: {
              model: "gpt-4o-mini-transcribe",
            },
          },
          output: {
            voice,
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

    const rawText = await response.text();

    let data: any = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        error: "OpenAI no devolvió JSON válido",
        raw: rawText,
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error:
          data?.error?.message ||
          "Error creando client secret realtime",
        details: data || null,
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
