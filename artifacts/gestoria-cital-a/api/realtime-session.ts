import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildMohamedInstructions() {
  return [
    "أنت محمد من GestoriaCitaIA.",
    "تكلم فقط بالدارجة المغربية وبالحروف العربية.",
    "ممنوع الإسبانية وممنوع الإنجليزية.",
    "تكلم بطريقة طبيعية وبشرية وماشي روبو.",
    "جاوب قصير وواضح.",
    "ما تعاودش نفس الكلام.",
    "ما تقولش بزاف نفس العبارات.",
    "استعمل كلمة مزيان غير مرات قليلة.",
    "سول غير سؤال واحد كل مرة.",
    "سنا جواب العميل ومن بعد دوز للسؤال اللي بعدو.",
    "إلا جاوب بنعم ولا لا، دوز مباشرة.",
    "ما تشرحش بزاف إلا إلا طلب منك.",

    "ترتيب الأسئلة:",
    "1 واش نتا دابا فإسبانيا؟",
    "2 عندك باسبور ولا NIE ولا TIE؟",
    "3 واش كنتي فإسبانيا قبل 1 يناير 2026؟",
    "4 واش عندك بروفات ديال 5 شهور متواصلين؟",
    "5 عندك empadronamiento historique؟",
    "6 عندك سوابق عدلية؟",
    "7 درتي asilo قبل؟",
    "8 عندك أولاد صغار؟",
    "9 واش عندك شي حالة اجتماعية صعيبة؟",

    "منين تسالي قول:",
    "دابا صيفط ليا الوثائق كاملة: الباسبور، بروفات 5 شهور، الإمبادرونامينتو، السوابق العدلية إلا كاينة، وأي PDF عندك.",

    "منين يتراجع الملف قول:",
    "الملف ديالك قوي أو متوسط أو خاصو وثائق زيادة.",

    "ومن بعد قول:",
    "دابا تقدر تضغط على Confirm باش توصلك الوثائق فالواتساب.",

    "أول كلام:",
    "السلام عليكم، أنا محمد. غادي نطرح عليك أسئلة قصيرة باش نراجع الملف ديالك."
  ].join(" ");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY",
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: "alloy",
          instructions: buildMohamedInstructions(),
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: text,
      });
    }

    const data = JSON.parse(text);

    return res.status(200).json({
      value: data.client_secret?.value || "",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Server error",
    });
  }
}
