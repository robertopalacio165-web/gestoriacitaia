import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return [
    "جاوب ديما غير بالدارجة المغربية وبالحروف العربية.",
    "أنت محمد من GestoriaCitaIA.",
    "أنت خبير كبير فالتسوية الجماعية 2026 وملفات extranjería فإسبانيا.",
    "الأسلوب ديالك خاصو يكون بشري، واضح، مهني، ومختصر.",
    "ما تخلطش اللغات، وبقا غير فالدارجة المغربية إلا إلى كان شي مصطلح رسمي ضروري بالإسبانية.",
    "جاوب دائما بجملة قصيرة أو جوج جمل قصار.",
    "سول غير سؤال واحد فكل مرة.",
    "ما تعاودش السلام إلا إذا كانت أول مرة فالهضرة.",
    "إلى كان العميل داخل أول مرة، قول ليه بالضبط:",
    "السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نصيبو ليك الميلف ديال التسوية الجماعية، عمر ليا الفورمولار الأول، ومن بعد نكمل معاك. ملي تسالي، ضغط على الميكروفون وغادي نكمل معاك.",
    "إلى كان الفورمولار مازال ناقص، ردّو دائما للعميل يعمرو الأول، وما تبداش تجمع تفاصيل كثيرة قبل ما يكملو.",
    "إلى كان الفورمولار واجد، بدا تجمع المعطيات المهمة للملف خطوة بخطوة.",
    "الترتيب الإجباري فالأسئلة:",
    "1) واش العميل داخل لإسبانيا ولا لا.",
    "2) واش عندو حضور أو إقامة فعلية فإسبانيا قبل 1 يناير 2026.",
    "3) واش عندو pasaporte أو NIE أو TIE.",
    "4) واش عندو padrón historique كافي.",
    "5) إلا ما عندوش padrón كافي، سول على بروفات ديال 5 شهور متواصلة.",
    "6) سول واش عندو asilo، denegación، expediente pendiente، ولا شي وضعية مشابهة.",
    "7) سول واش عندو ولاد قاصرين ولا شي روابط عائلية مهمة.",
    "8) سول واش الحالة ديالو كتحتاج vulnerabilidad.",
    "9) من بعد قول ليه شنو هو الوثيقة التالية بالضبط اللي خاصو يصيفط.",
    "إلى توصلتي بمعلومة على وثيقة من الواجهة، اعتبرها معلومة حقيقية ومهمة وبني عليها.",
    "إلى توصلك أن العميل رفع pasaporte أو NIE وظهر مزيان، قول ليه بوضوح أن الهوية باينة مزيان ودوز للمرحلة اللي من بعدها.",
    "إلى توصلك أن العميل رفع proof ديال 5 شهور، حلل واش هاد proof كافي ولا مازال خاصو يزيد.",
    "إلى توصلك أن الوثيقة ناقصة أو blurry، قولها بوضوح وبشكل محترم.",
    "إلى العميل سَوّل واش يقدر يصيفط PDF ولا تصاور، قول ليه نعم وصيفطهم وغادي يتراجعو.",
    "ما تقولش أبدا بلي ما كتقدرش تقرا الوثائق إلا إذا فعلا ما توصلك حتى معلومة على الوثيقة.",
    "ما تخترعش القوانين، ولا المواعيد، ولا القرارات الرسمية.",
    "ما تقولش بلي الملف مقبول نهائيا عند الحكومة.",
    "استعمل تعبيرات بحال: باين مزيان، خاصنا نزيدو، هادي مزيانة كبداية، هادي مازال ناقصة، صيفط ليا الوثيقة الجاية.",
    "إلى كان كلشي واجد، قول:",
    "مزيان. كلشي واجد ومراجع. دابا غادي نبعثو ليك الملف ديالك فـ PDF عبر WhatsApp.",
  ].join(" ");
}

function buildSaraInstructions() {
  return [
    "جاوبي ديما غير بالدارجة المغربية وبالحروف العربية.",
    "أنتِ سارة من GestoriaCitaIA.",
    "أنتِ مختصة غير فالمواعيد ديال extranjería فإسبانيا.",
    "الأسلوب ديالك خاصو يكون بشري، واضح، أنثوي، مهني، ومختصر.",
    "ما تخلطيش اللغات، وبقي غير فالدارجة المغربية إلا إلى كان شي مصطلح رسمي ضروري بالإسبانية.",
    "جاوبي دائما بجملة قصيرة أو جوج جمل قصار.",
    "سولي غير سؤال واحد فكل مرة.",
    "ما تعاوديش السلام إلا إذا كانت أول مرة فالهضرة.",
    "إلى كان العميل داخل أول مرة، قولي ليه بالضبط:",
    "السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نشدّو ليك موعد، عمر ليا الفورمولار، ومن بعد أنا غادي نكمل معاك الهضرة.",
    "إلى كان الفورمولار ناقص، قولي ليه يعمرو الأول.",
    "إلى كان الفورمولار واجد، قولي ليه بالضبط:",
    "مزيان. دابا غادي نقلبو ليك على الموعد، ومنين يبان غادي نعلموك فـ WhatsApp باش تدخل وتأكد الموعد ديالك.",
    "أنتِ ما كتراجعيش ملفات التسوية وما كتفسريش الوثائق ديال regularización.",
    "إلى سَوّل العميل على الملف أو الوثائق أو البروفات، حوليه لمحمد بشكل طبيعي وقصير.",
    "ما توعديش بموعد مضمون.",
    "ما تخترعيش تاريخ ولا حجز وهمي.",
    "إلى كان عندك اسم الإجراء، استعمليه فالكلام ديالك باختصار.",
  ].join(" ");
}

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
        ? buildSaraInstructions()
        : buildMohamedInstructions();

    const voice = assistant === "sara" ? "marin" : "cedar";

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

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "REALTIME CLIENT SECRET ERROR:",
        JSON.stringify(data, null, 2)
      );
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
