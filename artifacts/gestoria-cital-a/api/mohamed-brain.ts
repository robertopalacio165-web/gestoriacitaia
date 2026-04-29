type BrainInput = {
  lang: "es" | "darija";
  userMessage: string;
  documents?: Array<{ nombre: string; estado: "ok" | "warn" | "missing" }>;
};

function clean(txt: string) {
  return (txt || "").trim().toLowerCase();
}

function yes(txt: string) {
  return /^(yes|si|sí|oui|اه|آه|نعم|iya|wakha|ok|ouiya|اييه|ايييه|عندي|كان|كاين)/i.test(
    clean(txt)
  );
}

function no(txt: string) {
  return /^(no|لا|ma|non|ماعنديش|ما عنديش|ماكانش|ما كاينش)/i.test(
    clean(txt)
  );
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
      /pruebas|factura|padron|padrón|empadronamiento|proof|nomina|contrato|hospital|western|moneygram|telefono|bus|tren/i.test(
        d.nombre
      )
  );

  const hasPolice = documents?.some(
    (d) => d.estado === "ok" && /policia|police|expulsion|orden/i.test(d.nombre)
  );

  // ======================
  // DARIJA
  // ======================
  if (lang === "darija") {
    if (
      msg.includes("سلام") ||
      msg.includes("salam") ||
      msg.includes("hola") ||
      msg.includes("hello")
    ) {
      return "السلام عليكم، مرحبا بك فـ خيستوريا سيتا AI. أنا محمد، وغادي نعاونك تجهز الملف ديالك ديال التسوية الجماعية. غنسولك شوية ديال الأسئلة، وجاوبني غير بآه ولا لا. دخلتي لإسبانيا قبل من 1 يناير 2026؟";
    }

    // أسئلة الهجرة العامة
    if (
      msg.includes("فيزا") ||
      msg.includes("visa") ||
      msg.includes("فرنسا") ||
      msg.includes("belgique") ||
      msg.includes("belgica") ||
      msg.includes("italia") ||
      msg.includes("portugal")
    ) {
      return "الفيزا ولا الدخول من دولة أوروبية ماشي رفض مباشر. كل ملف كيتراجع بوحدو على حسب الحالة ديالو.";
    }

    if (
      msg.includes("بوليس") ||
      msg.includes("police") ||
      msg.includes("expulsion")
    ) {
      return "إلى عندك شي ورقة ديال البوليس ولا expulsion، صيفطها ليا وغادي نشرح ليك الوضعية ديالك.";
    }

    if (
      msg.includes("سكنى") ||
      msg.includes("padron") ||
      msg.includes("empadronamiento")
    ) {
      return "شهادة السكنى وثيقة مزيانة، ولكن كلما كانو معاك بروفات خرين كلما الملف كيولي أقوى.";
    }

    if (
      msg.includes("papeles penales") ||
      msg.includes("penales") ||
      msg.includes("سوابق")
    ) {
      return "الوثيقة العدلية مهمة بزاف. خاصها تكون صالحة ومترجمة إلى كانت مطلوبة.";
    }

    // نعم
    if (yes(msg)) {
      if (!hasIdentity) {
        return "ممتاز. عندك الباسبور ولا فوتوكوبي ديال الباسبور؟";
      }

      if (!hasProofs) {
        return "زوين. عندك بروفات ديال 5 شهور فيها التاريخ وسمّيتك؟ بحال الطبيب، السكنى، التحويلات، التليفون، النقل أو الخدمة؟";
      }

      if (hasPolice) {
        return "بان ليا كاين شي ملف قانوني. غادي نراجعو مزيان ونقول ليك شنو الحل.";
      }

      return "ممتاز. الملف ديالك باين قوي. دابا غادي نطلق ليك زر الوثائق، صيفط ليا كلشي واضح وأنا نراجعهم كاملين.";
    }

    // لا
    if (no(msg)) {
      return "ماشي مشكل. قول ليا شنو ناقص عندك وغادي نقول ليك شنو تقدر دير خطوة بخطوة.";
    }

    // ترتيب الأسئلة الرسمي
    if (!hasIdentity) {
      return "عندك الباسبور ولا فوتوكوبي ديال الباسبور؟";
    }

    if (!hasProofs) {
      return "عندك بروفات ديال 5 شهور متتابعين فإسبانيا؟";
    }

    if (hasPolice) {
      return "عندك شي ورقة ديال البوليس ولا قرار قديم؟";
    }

    return "كلشي واجد. منين تكمل المراجعة غادي يبان ليك Confirm ويتصيفط ليك الملف فالواتساب.";
  }

  // ======================
  // ESPAÑOL
  // ======================
  if (msg.includes("hola")) {
    return "Hola, soy Mohamed. ¿Entraste en España antes del 1 de enero de 2026?";
  }

  if (!hasIdentity) {
    return "Primero necesito pasaporte o NIE.";
  }

  if (!hasProofs) {
    return "Ahora necesito pruebas de permanencia de 5 meses.";
  }

  if (hasPolice) {
    return "Veo un documento policial. Debemos revisarlo.";
  }

  return "Tu expediente parece correcto. Cuando terminemos, recibirás todo por WhatsApp.";
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    const result = mohamedBrain(req.body);
    return res.status(200).json({ reply: result });
  }

  return res.status(405).send("Method Not Allowed");
}
