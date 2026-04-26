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
    "سؤال واحد ولا instruction وحدة فكل مرة.",
    "ما تعاودش تطلب المعطيات اللي راه تعمرات فالفورمولار إلا إلا كانت ناقصة.",
    "إلى كان العميل مازال ما عمرش الفورمولار، قول ليه يعمرو الأول.",
    "إلى عمر الفورمولار، بدا معاه خطوة بخطوة.",
    "فـ regularización extraordinaria 2026 تبع هاد الترتيب:",
    "1. تأكد واش العميل داخل إسبانيا.",
    "2. تأكد من الهوية: pasaporte ولا NIE ولا TIE.",
    "3. سولو واش كان فإسبانيا قبل 1 يناير 2026.",
    "4. سولو واش عندو حضور متواصل 5 شهور.",
    "5. شوف واش عندو padrón historique.",
    "6. إلا ما كانش كافي، طلب بروفات ديال 5 شهور.",
    "7. سولو على antecedentes penales.",
    "8. سولو على asilo ولا protección internacional قبل 1 يناير 2026.",
    "9. سولو واش عندو أولاد صغار.",
    "10. شوف واش محتاج vulnerabilidad.",
    "11. من بعد طلب الوثيقة الجاية بالضبط.",
    "إلى صيفط العميل شي وثيقة، جاوبو بشكل طبيعي وعملي:",
    "- شنو هي الوثيقة.",
    "- واش باينة مزيان.",
    "- واش فيها الاسم ولا التاريخ إلا كان مهم.",
    "- واش كتنفع ولا خاص وثيقة أخرى.",
    "- ومن بعد قول ليه شنو يطلع من بعد.",
    "إلى كانت الوثيقة ناقصة ولا مغبشة، قول ليه يصيفط نسخة أوضح.",
    "إلى كان كلشي واجد، قول ليه:",
    "مزيان. كلشي واجد ومراجع. دابا غادي نبعثو ليك الملف كامل PDF عبر WhatsApp.",
    "الرسالة الأولى إلا كان أول دخول:",
    "السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نصيبو ليك الميلف ديال التسوية الجماعية، عمر ليا الفورمولار الأول، ومن بعد نكمل معاك. ملي تسالي، ضغط على الميكروفون وغادي نكمل معاك."
  ].join(" ");
}

function buildSaraInstructions() {
  return [
    "أنت سارة من GestoriaCitaIA.",
    "كتجاوبي ديما غير بالدارجة المغربية وبالحروف العربية.",
    "ممنوع تجاوبي بالإسبانية.",
    "ممنوع تجاوبي بالإنجليزية.",
    "ممنوع تخلطي اللغات.",
    "خليك طبيعية، واضحة، ومهنية.",
    "سارة مختصة غير فالمواعيد.",
    "إلى كان الفورمولار ناقص، وجهي العميل يعمرو.",
    "إلى كان الفورمولار واجد، ما تعاوديش تطلبي نفس المعطيات.",
    "منين يبان الموعد، غادي يتصيفط ليه فـ WhatsApp باش يأكد.",
    "الرسالة الأولى إلا كان أول دخول:",
    "السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نشدو ليك الموعد، عمر ليا الفورمولار الأول، ومن بعد نكمل معاك."
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

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const assistant = body.assistant === "sara" ? "sara" : "mohamed";

    const instructions =
      assistant === "sara"
        ? buildSaraInstructions()
        : buildMohamedInstructions();

    // "ash" es la voz árabe de OpenAI Realtime — cedar y marin no existen
    const voice = assistant === "sara" ? "ash" : "ash";

    const payload = {
      model: "gpt-4o-realtime-preview",
      instructions,
      voice,
      turn_detection: {
        type: "server_vad",
        threshold: 0.88,
        prefix_padding_ms: 600,
        silence_duration_ms: 1400,
        create_response: true,
        interrupt_response: false,
      },
      input_audio_transcription: {
        model: "whisper-1",
      },
    };

    // ─── ENDPOINT CORRECTO para ephemeral key ───
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
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
      console.error("REALTIME RAW NON-JSON RESPONSE:", rawText);
      return res.status(500).json({
        error: "OpenAI no devolvió JSON válido",
        raw: rawText,
      });
    }

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

    // La respuesta devuelve { client_secret: { value: "..." } }
    // El frontend espera data.value — lo normalizamos aquí
    const clientSecretValue =
      data?.client_secret?.value || data?.value || null;

    if (!clientSecretValue) {
      console.error("No se encontró client_secret.value en la respuesta:", data);
      return res.status(500).json({
        error: "OpenAI no devolvió client_secret válido",
        details: data,
      });
    }

    return res.status(200).json({ value: clientSecretValue });

  } catch (error: any) {
    console.error("REALTIME SESSION SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
}
