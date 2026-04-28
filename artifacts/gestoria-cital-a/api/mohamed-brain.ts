type BrainInput = {
  lang: "es" | "darija";
  userMessage: string;
  documents?: Array<{ nombre: string; estado: "ok" | "warn" | "missing" }>;
};

function clean(txt: string) {
  return (txt || "").trim().toLowerCase();
}

function yes(txt: string) {
  return /^(yes|si|sí|oui|اه|آه|نعم|iya|wakha|ok|ouiya)/i.test(clean(txt));
}

function no(txt: string) {
  return /^(no|لا|ma|non)/i.test(clean(txt));
}

export function mohamedBrain(input: BrainInput) {
  const { lang, userMessage, documents } = input;
  const msg = clean(userMessage || "");

  const hasIdentity = documents?.some(
    (d) => d.estado === "ok" && /pasaporte|passport|nie|tie/i.test(d.nombre)
  );

  const hasProofs = documents?.some(
    (d) =>
      d.estado === "ok" &&
      /pruebas|factura|padron|padrón|empadronamiento|proof|nomina|contrato/i.test(
        d.nombre
      )
  );

  const hasPolice = documents?.some(
    (d) => d.estado === "ok" && /policia|police|expulsion|orden/i.test(d.nombre)
  );

  // ======================
  // DARIJA ONLY
  // ======================
  if (lang === "darija") {
    // أول دخول
    if (
      msg.includes("سلام") ||
      msg.includes("salam") ||
      msg.includes("hola") ||
      msg.includes("hello")
    ) {
      return "السلام عليكم، مرحبا بك فـ GestoriaCitaIA. أنا محمد. غادي نعاونك فالتسوية الجماعية 2026. جاوبني غير بآه ولا لا. واش نتا دابا فإسبانيا؟";
    }

    // نعم
    if (yes(msg)) {
      if (!hasIdentity) {
        return "مزيان. أول حاجة صيفط ليا الباسبور ولا NIE ديالك.";
      }

      if (!hasProofs) {
        return "زوين. دابا صيفط ليا بروفات ديال 5 شهور فيها التاريخ وسمّيتك.";
      }

      if (hasPolice) {
        return "بان ليا كاينة ورقة ديال البوليس. غادي نراجعها باش نعطيك تقييم صحيح.";
      }

      return "ممتاز. الملف ديالك باين قوي. غادي نوجد ليك PDF ونصيفطو ليك فالواتساب.";
    }

    // لا
    if (no(msg)) {
      return "ماشي مشكل. قول ليا شنو الحالة ديالك وغادي نوجّهك خطوة بخطوة.";
    }

    // أسئلة خاصة
    if (
      msg.includes("visa") ||
      msg.includes("فرنسا") ||
      msg.includes("belgique") ||
      msg.includes("italia")
    ) {
      return "الفيزا القديمة ولا بصمة أوروبية ماشي معناها رفض مباشر. كل ملف كيتشاف بوحدو.";
    }

    if (
      msg.includes("police") ||
      msg.includes("بوليس") ||
      msg.includes("expulsion")
    ) {
      return "صيفط ليا الورقة ديال البوليس باش نشوف النوع والتاريخ.";
    }

    if (msg.includes("padron") || msg.includes("سكنى")) {
      return "شهادة السكنى مزيانة، ولكن الأفضل يكونو معاها بروفات أخرى بالتواريخ.";
    }

    // ترتيب منطقي
    if (!hasIdentity) {
      return "أول خطوة: صيفط ليا الباسبور ولا NIE.";
    }

    if (!hasProofs) {
      return "دابا صيفط ليا بروفات ديال 5 شهور.";
    }

    return "كلشي واجد. منين تأكد الخلاص غادي يوصلك الملف فالواتساب.";
  }

  // ======================
  // ESPAÑOL
  // ======================
  if (msg.includes("hola")) {
    return "Hola, soy Mohamed. ¿Estás ahora mismo en España?";
  }

  if (!hasIdentity) {
    return "Primero envíame pasaporte o NIE.";
  }

  if (!hasProofs) {
    return "Ahora necesito pruebas de permanencia de 5 meses.";
  }

  if (hasPolice) {
    return "He visto un documento policial. Debemos revisarlo.";
  }

  return "Tu expediente parece correcto. Te enviaré el resumen por WhatsApp.";
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    const result = mohamedBrain(req.body);
    return res.status(200).json({ reply: result });
  }

  return res.status(405).send("Method Not Allowed");
}
