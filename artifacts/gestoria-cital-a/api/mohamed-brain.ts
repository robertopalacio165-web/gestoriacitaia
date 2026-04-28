type BrainInput = {
  lang: "es" | "darija";
  userMessage: string;
  documents?: Array<{ nombre: string; estado: "ok" | "warn" | "missing" }>;
};

function yes(txt: string) {
  return /^(yes|si|sí|oui|اه|آه|نعم|iya|wakha|ok)/i.test(txt.trim());
}

function no(txt: string) {
  return /^(no|لا|ma|non)/i.test(txt.trim());
}

export function mohamedBrain(input: BrainInput) {
  const { lang, userMessage, documents } = input;

  const msg = (userMessage || "").toLowerCase();

  const hasIdentity = documents?.some(
    (d) => d.estado === "ok" && /pasaporte|passport|nie/i.test(d.nombre)
  );

  const hasProofs = documents?.some(
    (d) => d.estado === "ok" && /pruebas|factura|padron|padrón|empadronamiento|proof/i.test(d.nombre)
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
      msg.includes("hello") ||
      msg.includes("hola")
    ) {
      return "السلام عليكم، مرحبا بك فـ هستوريا سيتا AI. أنا محمد. غادي نعاونك نعرفو واش تقدر تدفع فالتسوية الجماعية ولا لا. جاوبني غير بآه ولا لا. واش نتا دابا فإسبانيا؟";
    }

    if (yes(msg)) {
      if (!hasProofs) {
        return "مزيان. واش عندك شي بروفات فيها التاريخ وسمّيتك كيثبتو بلي كنتي فإسبانيا قبل 1 يناير 2026 وكيغطيو 5 شهور؟";
      }

      if (!hasIdentity) {
        return "زوين. دابا خاصني الباسبور ديالك ولا NIE باش نكمل الملف.";
      }

      if (hasPolice) {
        return "شفت بلي كاينة وثيقة ديال البوليس. غادي تتراجع بالتفصيل باش نشوفو واش كتأثر ولا لا.";
      }

      return "ممتاز. الملف ديالك باين مزيان وعندك حظ كبير. غادي نوجد ليك PDF ونصيفطو ليك فالواتساب.";
    }

    if (no(msg)) {
      return "ماشي مشكل. عطيني أكثر معلومة على الحالة ديالك، وأنا نوجّهك خطوة بخطوة.";
    }

    if (msg.includes("visa") || msg.includes("فرنسا") || msg.includes("belgique") || msg.includes("italia")) {
      return "الفيزا القديمة ولا طابعة ديال دولة أوروبية ماشي معناها رفض مباشر. كل ملف كيتشاف بوحدو.";
    }

    if (msg.includes("police") || msg.includes("بوليس") || msg.includes("expulsion")) {
      return "إلى عندك شي ورقة ديال البوليس ولا expulsion، طلعها ليا باش نعطيك تقييم أولي.";
    }

    if (!hasProofs) {
      return "أول خطوة: طلع ليا جميع البروفات ديالك ديال 5 شهور. أي ورقة فيها التاريخ وسمّيتك.";
    }

    if (!hasIdentity) {
      return "دابا خاصني الباسبور ديالك ولا NIE.";
    }

    return "كلشي واجد. منين تأكد الخلاص غادي يوصلك الملف فالواتساب.";
  }

  // ======================
  // ESPAÑOL
  // ======================
  if (msg.includes("hola")) {
    return "Hola, soy Mohamed. Voy a revisar si puedes presentar la regularización colectiva. ¿Estás ahora mismo en España?";
  }

  if (!hasProofs) {
    return "Lo primero: envíame pruebas de permanencia de 5 meses con fechas claras.";
  }

  if (!hasIdentity) {
    return "Perfecto. Ahora necesito pasaporte o NIE.";
  }

  if (hasPolice) {
    return "He visto un documento policial. Hay que revisarlo para valorar si afecta o no.";
  }

  return "Tu expediente parece correcto. Prepararé tu resumen y te lo enviaré por WhatsApp.";
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    const result = mohamedBrain(req.body);
    return res.status(200).json({ reply: result });
  }

  return res.status(405).send("Method Not Allowed");
}
