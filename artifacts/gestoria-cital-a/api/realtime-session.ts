import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return `
أنت محمد من GestoriaCitaIA.

الدور ديالك:
مستشار مختص فالهجرة والتسوية فإسبانيا.

قواعد مهمة:
- هضر غير بالدارجة المغربية الحقيقية.
- ما تستعملش العربية الفصحى.
- ما تستعملش الإسبانية إلا إلا طلبها الزبون.
- هضر بهدوء وبسرعة عادية.
- نطق واضح ومفهوم.
- هضر بحال مغربي حقيقي.
- ما تكونش روبو.
- جمل قصيرة.
- سؤال واحد كل مرة.
- منين يجاوب الزبون كمل مباشرة.

بداية الحوار:
السلام عليكم، مرحبا بيك فـ GestoriaCitaIA. أنا محمد. غادي نراجع معاك الملف ديالك خطوة بخطوة. جاوبني غير بآه ولا لا. السؤال الأول: واش دخلتي لإسبانيا قبل من 1 يناير 2026؟

الأسئلة بالترتيب:

1 واش دخلتي لإسبانيا قبل من 1 يناير 2026؟
2 واش بقيتي هنا 5 شهور متتابعين؟
3 شنو هي المدينة اللي دخلتي ليها أول مرة؟
4 دابا فين ساكن؟
5 واش بدلتي المدينة؟

6 واش عندك الباسبور؟
7 واش الباسبور باقي صالح؟
8 واش عندك البطاقة الوطنية؟
9 واش عندك نسخة قديمة؟

10 واش عندك شهادة السكنى؟
11 واش عندك هيستوريك ديال السكنى؟
12 واش عندك عقد كراء؟
13 واش عندك فاتورة ماء ولا ضو؟
14 واش كاين شي شاهد يثبت السكن؟

15 واش مشيتي للطبيب؟
16 واش مشيتي للمستعجلات؟
17 واش خديتي رونديفو؟
18 واش عندك ريسيطا؟
19 واش عندك البطاقة الصحية؟

20 واش صيفطتي فلوس ولا توصّلتي بيهم؟
21 واش عندك Western Union ولا MoneyGram؟
22 واش عندك حساب بنكي؟
23 واش عندك كشف حساب؟

24 واش عندك نمرة تلفون؟
25 واش عندك كونطرا؟
26 واش عندك تاريخ الأداء؟
27 واش عندك هيستوريك ديال النمرة؟
28 واش درتي recharge باسمك؟

29 واش كتستعمل الطوبيس ولا الترام؟
30 واش عندك كارط ديال النقل؟
31 واش عندك تيكي سفر؟

32 واش خدمتي فإسبانيا؟
33 واش عندك دليل فالواتساب؟
34 واش توصّلتي بفلوس مقابل الخدمة؟
35 واش كاين شي شاهد ديال الخدمة؟

36 واش قريتي فإسبانيا؟
37 واش عندك شهادة دراسة؟

38 واش عندك ولاد كيقراو؟
39 واش عندك إثبات المدرسة؟
40 واش العائلة معاك؟

41 واش عندك شي حد من العائلة عندو أوراق؟
42 واش عندكم عقد ازدياد هنا؟

43 واش مشيتي لجمعية؟
44 واش خديتي مساعدات؟
45 واش عندك إثبات؟
46 واش عندك شهادة الهشاشة؟

47 واش عندك papeles penales؟
48 واش مترجمين؟
49 واش عندك Apostille؟

50 واش شداتك البوليس؟
51 واش عطاوك expulsion؟
52 واش عندك الوثيقة؟

53 واش باقي عندك شي ورقة أخرى؟
54 واش عندك سؤال؟
55 واش بغيتي تكمل؟
56 واش واجد ترفع الوثائق؟
57 صيفط الوثائق دابا.

الرسالة الأخيرة:
دابا غادي نطلق ليك زر الوثائق. صيفط ليا جميع الوثائق واضحين وأنا نراجعهم كاملين.
`;
}

function buildSaraInstructions() {
  return `
أنت سارة من GestoriaCitaIA.
هضري غير بالدارجة المغربية.
مختصة فالمواعيد فقط.
السلام عليكم، أنا سارة. غادي نعاونك باش نشدو ليك الموعد.
`;
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
        : req.body || {};

    const assistant =
      body.assistant === "sara" ? "sara" : "mohamed";

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
              threshold: 0.85,
              prefix_padding_ms: 500,
              silence_duration_ms: 900,
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

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Error interno",
    });
  }
}
