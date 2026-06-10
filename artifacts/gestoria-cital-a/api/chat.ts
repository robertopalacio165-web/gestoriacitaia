type Lang = "darija" | "es" | "en";
type AssistantType = "sara" | "mohamed";

type HistoryItem = {
  from: "user" | "agent";
  text: string;
};

type ExtractedLead = {
  full_name?: string | null;
  phone?: string | null;
  nie?: string | null;
  passport_number?: string | null;
  tramite?: string | null;
  city?: string | null;
};

type LeadFormPayload = {
  nombre?: string;
  telefono?: string;
  email?: string;
  niePasaporte?: string;
  ciudad?: string;
  provincia?: string;
  nacionalidad?: string;
  fechaLlegada?: string;
  cumple5Meses?: string;
  asilo?: string;
  penales?: string;
};

function detectUserLanguage(_message: string): Lang {
  return "darija";
}

function sanitizeHistory(history: unknown): HistoryItem[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (((item as any).from === "user") || (item as any).from === "agent") &&
        typeof (item as any).text === "string" &&
        (item as any).text.trim().length > 0
    )
    .slice(-10) as HistoryItem[];
}

function sanitizeLeadForm(raw: unknown): LeadFormPayload {
  if (!raw || typeof raw !== "object") return {};

  const obj = raw as Record<string, unknown>;
  const safe = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  return {
    nombre: safe(obj.nombre),
    telefono: safe(obj.telefono),
    email: safe(obj.email),
    niePasaporte: safe(obj.niePasaporte),
    ciudad: safe(obj.ciudad),
    provincia: safe(obj.provincia),
    nacionalidad: safe(obj.nacionalidad),
    fechaLlegada: safe(obj.fechaLlegada),
    cumple5Meses: safe(obj.cumple5Meses),
    asilo: safe(obj.asilo),
    penales: safe(obj.penales),
  };
}

function hasMinimumFormData(leadForm?: LeadFormPayload): boolean {
  return Boolean(
    leadForm?.nombre?.trim() &&
      leadForm?.telefono?.trim() &&
      leadForm?.ciudad?.trim()
  );
}

function getSharedRules(_lang: Lang) {
  return `
IDIOMA OBLIGATORIO
- كتجاوب ديما غير بالدارجة المغربية.
- كتب الدارجة المغربية غير بالحروف العربية.
- ممنوع تجاوب بالإسبانية.
- ممنوع تجاوب بالإنجليزية.
- ممنوع تخلط اللغات.
- تقدر تستعمل غير كلمات تقنية قليلة إلا كانت ضرورية بحال: NIE, TIE, PDF, WhatsApp, cita, padrón, pasaporte, asilo.
- باقي الجواب كامل خاصو يكون دارجة مغربية حقيقية.
- ممنوع تكتب الدارجة باللاتيني.
- ممنوع العربية الفصحى الثقيلة.
- خاص الكلام يكون طبيعي، بسيط، وقريب للهضرة اليومية ديال المغاربة.
- خاص الجواب يكون ساهل على الصوت باش يتقرا مزيان.

الأسلوب الإجباري
- بشري بزاف
- طبيعي بزاف
- واضح
- مهني
- قصير
- من سطر حتى ثلاثة سطور غالباً
- سؤال واحد ولا instruction وحدة فكل مرة
- بلا مقدمات طويلة
- بلا لائحة طويلة إلا إلا كانت ضرورية
- ما تعاودش السلام كل مرة
- ما تجاوبش بحال الروبوت
- إلا عطاك العميل معلومة، خذها وكمل للخطوة اللي من بعدها
- إلا ما فهمتيش حاجة، طلب توضيح واحد ومحدد

طريقة الكلام
- استعمل تعابير دارجة طبيعية بحال:
  "مزيان"
  "دابا"
  "عافاك"
  "صيفط"
  "باقي"
  "خاص"
  "إييه"
  "واخا"
  "هادي"
  "ديالك"
- خليه أسلوب gestor marroquí حقيقي كيهضر مع الزبون بالصوت
`;
}

function getSaraPrompt(
  lang: Lang,
  procedureLabel?: string,
  context?: string,
  leadForm?: LeadFormPayload
) {
  const formReady =
    leadForm?.nombre &&
    leadForm?.telefono &&
    leadForm?.ciudad &&
    leadForm?.provincia;

  return `
أنتِ سارة من "هيستوريا إي آي".

كتجاوبي غير بالدارجة المغربية 100% وبالحروف العربية فقط.

🎤 البداية:

السلام عليكم، مرحبا بك فـ هيستوريا إي آي. أنا سارة، غادي نعاونك باش تلقى موعد فـ أقرب وقت. عافاك عمر ليا الفورمولير ومن بعد كليك على البوطون ديال confirmي.

📋 الحالة:

- الاسم: ${leadForm?.nombre || "ما متسجلش"}
- الهاتف: ${leadForm?.telefono || "ما متسجلش"}
- المدينة: ${leadForm?.ciudad || "ما متسجلش"}
- province: ${leadForm?.provincia || "ما متسجلش"}

🧠 واش الفورمولير كامل: ${formReady ? "نعم" : "لا"}

---

إلا الفورمولير ناقص:
قول:
عافاك عمر الاسم، الهاتف، المدينة و province، ومن بعد كليك على confirmي.

---

إلا الفورمولير كامل:
قول:
مزيان. دابا توصلنا بالمعلومات ديالك. غادي نبدا نقلب ليك على موعد 24 ساعة على 24 ساعة. ومنين نلقاو موعد غادي نصيفطو ليك رسالة فـ WhatsApp.

---

إلا تلقات cita:
قول:
سمع، لقينا ليك موعد بإسمك. دخل دابا بسرعة و confirmي الموعد ديالك باش ما يضيعش.

---

إلا confirmى:
قول:
مبروك. تأكد الموعد ديالك بنجاح. غادي توصلك رسالة فـ WhatsApp فيها PDF ديال الموعد.

`;
}

function buildLeadFormBlock(leadForm: LeadFormPayload): string {
  const lines = [
    `- nombre: ${leadForm.nombre || "ما متسجلش"}`,
    `- telefono: ${leadForm.telefono || "ما متسجلش"}`,
    `- email: ${leadForm.email || "ما متسجلش"}`,
    `- niePasaporte: ${leadForm.niePasaporte || "ما متسجلش"}`,
    `- ciudad: ${leadForm.ciudad || "ما متسجلش"}`,
    `- nacionalidad: ${leadForm.nacionalidad || "ما متسجلش"}`,
    `- fechaLlegada: ${leadForm.fechaLlegada || "ما متسجلش"}`,
    `- cumple5Meses: ${leadForm.cumple5Meses || "ما متسجلش"}`,
    `- asilo: ${leadForm.asilo || "ما متسجلش"}`,
    `- penales: ${leadForm.penales || "ما متسجلش"}`,
  ];

  return lines.join("\n");
}

function getMohamedPrompt(
  lang: Lang,
  context?: string,
  procedureKey?: string,
  procedureLabel?: string,
  leadForm?: LeadFormPayload
) {
  const formReady = hasMinimumFormData(leadForm);
  const isVoiceFlow = (context || "").includes("voice");

  return `
أنت محمد من GestoriaCitaIA.

أنت مساعد بشري خبير فـ extranjería والهجرة فإسبانيا، ومتخصص فالتسوية الجماعية والوثائق ديالها.

كتجاوب بحال gestor marroquí حقيقي، واضح، طبيعي، مهني، وقريب للعميل.

${getSharedRules(lang)}

السياق
- السياق التقني: ${context || "general"}
- الإجراء الحالي: ${procedureLabel || "ما محددش"}
- المفتاح الداخلي للإجراء: ${procedureKey || "ما محددش"}
- واش هادشي بالصوت: ${isVoiceFlow ? "نعم" : "لا"}

المعطيات اللي راه موجودة فالفورمولار
${buildLeadFormBlock(leadForm || {})}

الرسالة الأولى ديال محمد إلا كان العميل داخل أول مرة:
"السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نصيبو ليك الميلف ديال التسوية الجماعية، عمر ليا الفورمولار الأول، ومن بعد نكمل معاك. ملي تسالي، ضغط على الميكروفون وغادي نكمل معاك."

قاعدة الفورمولار
- إلا كانت المعطيات راه موجودة، ما تعاودش تطلبها.
- استعمل أولاً المعطيات اللي عندك.
- واش الفورمولار الأدنى كامل: ${formReady ? "نعم" : "لا"}
- إلا كان ناقص، ذكر هادشي باختصار.
- ما تديرش interrogatorio.
- منين يعمر العميل الفورمولار، بدا تجمع المعلومات الناقصة خطوة بخطوة.

طريقة الخدمة
- العميل كيعمر الفورمولار ومن بعد كيهضر معاك بالصوت.
- خاص الجواب يكون قصير، طبيعي، ساهل على ElevenLabs.
- سؤال واحد ولا instruction وحدة فكل مرة.
- بلا مقدمات طويلة.

المهمة ديال محمد
- يفهم الحالة ديال العميل.
- يحدد الخطوة الجاية.
- يطلب غير الوثيقة ولا المعلومة اللي من بعدها.
- يراجع الوثائق.
- يقول بوضوح شنو ناقص أو شنو ما باينش.
- يعاون فالملف.
- يعاون فالفورمولار ولا الرسوم إلا كانو داخلين فالمسار.
- يشرح الخطوة الجاية ببساطة.

فـ regularización extraordinaria 2026 تبع هاد الترتيب الإجباري
1. تأكد واش العميل كاين داخل إسبانيا دابا.
2. تأكد من الهوية: pasaporte ولا document équivalent.
3. سولو واش كان فإسبانيا قبل 1 يناير 2026.
4. سولو واش عندو حضور متواصل على الأقل 5 شهور حتى لنهار التقديم.
5. شوف واش عندو padrón historique كافي.
6. إلا ما كانش كافي، طلب بروفات ديال 5 شهور.
7. سولو على antecedentes penales.
8. سولو واش عندو asilo، denegación، expediente pendiente، ولا solicitud de protección internacional قبل 1 يناير 2026.
9. سولو واش عندو أولاد صغار.
10. شوف واش محتاج vulnerabilidad.
11. من بعد قل ليه شنو الوثيقة الجاية بالضبط.

المعرفة القانونية اللي خاصك تتبع
- العملية extraordinary 2026 موجهة لناس اللي كانو فإسبانيا قبل 1 يناير 2026.
- وخاصهم يثبتو بقاو على الأقل 5 شهور بشكل متواصل وقت التقديم.
- وخاص ما يكونش عندهم antecedentes penales.
- وكاينة طريق خاصة لناس اللي دارو solicitud de protección internacional قبل 1 يناير 2026.
- ما تقولش أي شرط آخر على أنه رسمي إلا إلا كان ثابت فالمصادر اللي عطاك النظام.
- إذا ما كنتيش متأكد من شي نقطة، قول: "هاد النقطة خاصني نراجعها مزيان فالمصدر".

قواعد مهمة
- إلا كان padrón historique كافي، قولها بوضوح.
- إلا ما كانش كافي، طلب بروفات ديال 5 شهور.
- إلا قال العميل بلي راه صيفط الوثائق، جاوبو طبيعياً وقول ليه شنو الخطوة الجاية.
- ما تقولش approved رسمياً إلا ما كنتيش متأكد.
- استعمل تعابير طبيعية بحال:
  "هادشي مزيان"
  "هاد الوثيقة كتبان خدامة"
  "باقي خاص"
  "صيفطها أوضح"
  "دابا الخطوة الجاية هي"

vulnerabilidad
- إلا كانت داخلة فالحالة، شرحها باختصار.
- طلب غير المعلومة الجاية.
- ما تخترعش توقيعات ولا جمعيات ولا موافقات.

مراجعة الوثائق
- إلا قال العميل بلي صيفط document:
  - اعترف بهاد الشي بشكل طبيعي.
  - قل واش باينة مزيان، ناقصة، مغبشة، ولا خاص نسخة أوضح.
  - قل شنو خاص من بعد مباشرة.
  - بلا أجوبة عامة.

الإغلاق النهائي
إلى كان كلشي واجد، سد الحوار بشكل طبيعي وباختصار هكذا:
"مزيان. كلشي واجد ومراجع. دابا غادي نبعثو ليك الملف كامل PDF عبر WhatsApp. شكراً بزاف على الثقة."

العلاقة مع سارة
- محمد ما كيقلبش على cita.
- محمد كيهتم بالملف والوثائق.
- إلا وصل الدور ديال cita، دوز العميل لسارة بجواب قصير وطبيعي.

ممنوع
- تخترع القوانين.
- تخترع التواريخ الرسمية.
- تخترع الموافقات.
- تقول بلي شي حاجة ترفعات رسمياً إلا ما ترفعاتش.
- تخلط اللغات.
- تكتب darija باللاتيني.
- تجاوب بالفصحى الثقيلة.
- تجاوب بحال bot.
`;
}

function buildTextInput(params: {
  systemPrompt: string;
  history: HistoryItem[];
  message: string;
}) {
  const { systemPrompt, history, message } = params;

  const historyBlock = history
    .map((item) => `${item.from === "user" ? "CLIENTE" : "AGENTE"}: ${item.text}`)
    .join("\n");

  return `
${systemPrompt}

HISTORIAL RECIENTE
${historyBlock || "Sin historial previo"}

MENSAJE ACTUAL DEL CLIENTE
${message}

جاوب دابا بالدارجة المغربية فقط، بالحروف العربية فقط، وبشكل طبيعي وقصير ومهني.
`.trim();
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;

      for (const part of item.content) {
        if (typeof part?.text === "string" && part.text.trim()) {
          return part.text.trim();
        }
        if (typeof part?.output_text === "string" && part.output_text.trim()) {
          return part.output_text.trim();
        }
      }
    }
  }

  return "";
}

function extractFileSearchResults(data: any) {
  if (!Array.isArray(data?.output)) return [];

  const results: Array<{
    file_id?: string;
    filename?: string;
    score?: number;
  }> = [];

  for (const item of data.output) {
    if (item?.type !== "file_search_call") continue;
    if (!Array.isArray(item?.results)) continue;

    for (const result of item.results) {
      results.push({
        file_id: result?.file_id,
        filename: result?.filename,
        score: typeof result?.score === "number" ? result.score : undefined,
      });
    }
  }

  return results;
}

function normalizeTramite(text: string): string | null {
  const t = text.toLowerCase();

  if (
    t.includes("regularizacion 2026") ||
    t.includes("regularización 2026") ||
    t.includes("regularizacion") ||
    t.includes("regularización")
  ) {
    return "regularizacion_2026";
  }
  if (t.includes("tie") || t.includes("huellas") || t.includes("tarjeta")) {
    return "tie";
  }
  if (t.includes("nie")) {
    return "nie";
  }
  if (t.includes("regreso")) {
    return "regreso";
  }
  if (t.includes("arraigo social")) {
    return "arraigo_social";
  }
  if (t.includes("arraigo laboral")) {
    return "arraigo_laboral";
  }
  if (t.includes("arraigo familiar")) {
    return "arraigo_familiar";
  }
  if (t.includes("arraigo")) {
    return "arraigo";
  }
  if (t.includes("familiar") || t.includes("reagrup")) {
    return "familiar";
  }
  if (t.includes("trabajo")) {
    return "trabajo";
  }
  if (t.includes("estudiante")) {
    return "estudiantes";
  }
  if (t.includes("ue") || t.includes("europe")) {
    return "ue";
  }

  return null;
}

function extractPhone(message: string): string | null {
  const raw = message.replace(/[^\d+]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = raw.match(/(?:\+?\d[\d ]{7,}\d)/g);

  if (!candidates || candidates.length === 0) return null;

  return candidates[0].replace(/\s+/g, "");
}

function extractNie(message: string): string | null {
  const normalized = message.toUpperCase().replace(/\s+/g, "");
  const match =
    normalized.match(/\b[XYZ]\d{7}[A-Z]\b/) ||
    normalized.match(/\b\d{8}[A-Z]\b/);

  return match?.[0] || null;
}

function extractPassport(message: string): string | null {
  const match = message.toUpperCase().match(/\b[A-Z0-9]{6,12}\b/g);
  if (!match) return null;

  const extractedNie = extractNie(message);
  const filtered = match.find(
    (item) => item !== extractedNie && !/^\d+$/.test(item)
  );

  return filtered || null;
}

function extractCity(message: string): string | null {
  const cities = [
    "madrid",
    "barcelona",
    "valencia",
    "sevilla",
    "málaga",
    "malaga",
    "alicante",
    "murcia",
    "zaragoza",
    "bilbao",
    "palma",
    "granada",
    "tarragona",
    "girona",
    "castellón",
    "castellon",
    "sabadell",
    "terrassa",
    "hospitalet",
  ];

  const lower = message.toLowerCase();
  const found = cities.find((city) => lower.includes(city));

  return found || null;
}

function extractLeadFromConversation(params: {
  message: string;
  history: HistoryItem[];
  procedureLabel?: string;
  leadForm?: LeadFormPayload;
}): ExtractedLead {
  const { message, history, procedureLabel, leadForm } = params;
  const allText = [...history.map((h) => h.text), message].join(" \n ");

  const lead: ExtractedLead = {};

  lead.phone = leadForm?.telefono || extractPhone(allText);
  lead.nie = extractNie((leadForm?.niePasaporte || "") + " " + allText);
  lead.passport_number =
    extractPassport((leadForm?.niePasaporte || "") + " " + allText) || null;
  lead.city = leadForm?.ciudad || extractCity(allText);
  lead.tramite =
    normalizeTramite(allText) || normalizeTramite(procedureLabel || "");

  if (leadForm?.nombre) {
    lead.full_name = leadForm.nombre;
  }

  return lead;
}

function hasEnoughLeadDataForSara(
  lead: ExtractedLead,
  leadForm?: LeadFormPayload
): boolean {
  return Boolean(
    (leadForm?.nombre || lead.full_name) &&
      (leadForm?.telefono || lead.phone) &&
      (leadForm?.ciudad || lead.city)
  );
}

async function postToMakeWebhook(
  url: string | undefined,
  payload: Record<string, any>
) {
  if (!url) {
    console.error("MAKE WEBHOOK URL VACÍA");
    return { ok: false, status: 0 };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text().catch(() => "");
    console.log("MAKE WEBHOOK STATUS:", response.status);

    if (!response.ok) {
      console.error("MAKE WEBHOOK RESPONSE ERROR:", text);
    }

    return {
      ok: response.ok,
      status: response.status,
      body: text,
    };
  } catch (error) {
    console.error("MAKE WEBHOOK ERROR:", error);
    return { ok: false, status: 0 };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = req.body || {};
    // 🔥 TRIGGER ديال verification
if (body.type === "verification_result") {
  return res.status(200).json({
    reply: body.message || "تحليل الوثائق واجد",
  });
}
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const assistant =
      typeof body.assistant === "string"
        ? (body.assistant.trim().toLowerCase() as AssistantType)
        : "mohamed";
    const context =
      typeof body.context === "string" ? body.context.trim().toLowerCase() : "";
    const procedureKey =
      typeof body.procedureKey === "string" ? body.procedureKey.trim() : "";
    const procedureLabel =
      typeof body.procedureLabel === "string" ? body.procedureLabel.trim() : "";
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";
    const history = sanitizeHistory(body.history);
    const leadForm = sanitizeLeadForm(body.leadForm);

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const detectedLanguage = detectUserLanguage(message);
    const isSara =
      assistant === "sara" ||
      context === "buscar_citas" ||
      context === "voice_buscar_citas" ||
      context === "citas";

    const systemPrompt = isSara
      ? getSaraPrompt(detectedLanguage, procedureLabel, context, leadForm)
      : getMohamedPrompt(
          detectedLanguage,
          context,
          procedureKey,
          procedureLabel,
          leadForm
        );

    const input = buildTextInput({
      systemPrompt,
      history,
      message,
    });

    const modelSara = process.env.OPENAI_MODEL_SARA || "gpt-4.1-mini";
    const modelMohamed = process.env.OPENAI_MODEL_MOHAMED || "gpt-4.1-mini";
    const model = isSara ? modelSara : modelMohamed;

    const mohamedVectorStoreId =
      process.env.MOHAMED_VECTOR_STORE_ID ||
      process.env.OPENAI_VECTOR_STORE_MOHAMED ||
      "";

    const requestBody: Record<string, any> = {
      model,
      input,
      temperature: 0.45,
      max_output_tokens: 220,
    };

    if (!isSara && mohamedVectorStoreId) {
      requestBody.tools = [
        {
          type: "file_search",
          vector_store_ids: [mohamedVectorStoreId],
          max_num_results: 6,
        },
      ];
      requestBody.include = ["file_search_call.results"];
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OPENAI ERROR:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: data?.error?.message || "Error OpenAI",
        details: data || null,
      });
    }

    const reply = extractResponseText(data) || "سمح ليا، عاود عافاك.";

    const extractedLead = extractLeadFromConversation({
      message,
      history,
      procedureLabel,
      leadForm,
    });

    const fileSearchResults = !isSara ? extractFileSearchResults(data) : [];

    let makeResult: { ok: boolean; status: number; body?: string } = {
      ok: false,
      status: 0,
    };

    if (isSara) {
      const readyForSearch = hasEnoughLeadDataForSara(extractedLead, leadForm);

      makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_SARA, {
        source: "gestoriacitaia",
        assistant: "sara",
        flow: "voice_appointment",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: "darija",
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        lead_form: leadForm,
        lead_ready_for_search: readyForSearch,
        status: readyForSearch
          ? "ready_for_appointment_search"
          : "collecting_customer_data",
        last_user_message: message,
        ai_reply: reply,
        history,
        created_at: new Date().toISOString(),
      });
    } else {
      const expedienteReady =
        /expediente listo|manda mi pdf|todo correcto|terminado|acabado|ya esta todo correcto|ya está todo correcto|pdf por whatsapp|pdf via whatsapp|pdf vía whatsapp|ya terminé|ya termine|ya subi todo|ya subí todo/i.test(
          message
        );

      makeResult = await postToMakeWebhook(process.env.MAKE_WEBHOOK_MOHAMED, {
        source: "gestoriacitaia",
        assistant: "mohamed",
        flow: "voice_regularizacion",
        session_id: sessionId || null,
        user_id: userId || null,
        lang: "darija",
        context: context || "general",
        procedure_key: procedureKey || null,
        procedure_label: procedureLabel || extractedLead.tramite || null,
        lead: extractedLead,
        lead_form: leadForm,
        status: expedienteReady
          ? "expediente_ready"
          : "document_review_and_case_preparation",
        used_file_search: Boolean(mohamedVectorStoreId),
        file_search_results: fileSearchResults,
        last_user_message: message,
        ai_reply: reply,
        history,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      reply,
      meta: {
        assistant: isSara ? "sara" : "mohamed",
        lang: "darija",
        extractedLead,
        leadReadyForAutomation: isSara
          ? hasEnoughLeadDataForSara(extractedLead, leadForm)
          : false,
        saraWebhookConfigured: Boolean(process.env.MAKE_WEBHOOK_SARA),
        mohamedWebhookConfigured: Boolean(process.env.MAKE_WEBHOOK_MOHAMED),
        mohamedVectorStoreConfigured: Boolean(mohamedVectorStoreId),
        usedFileSearch: !isSara && Boolean(mohamedVectorStoreId),
        fileSearchHits: fileSearchResults.length,
        fileSearchFiles: fileSearchResults,
        model,
        makeStatus: makeResult.status,
        makeOk: makeResult.ok,
      },
    });
  } catch (error: any) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: error?.message || "Error servidor",
    });
  }
} 
