type BrainInput = {
  lang?: "es" | "darija" | "en";
  userMessage: string;
  leadForm?: {
    nombre?: string;
    telefono?: string;
    ciudad?: string;
    nacionalidad?: string;
    fechaLlegada?: string;
    cumple5Meses?: string;
    asilo?: string;
    penales?: string;
    niePasaporte?: string;
  };
  documents?: Array<{
    nombre?: string;
    estado?: "ok" | "warn" | "missing";
    detectedType?: string;
    note?: string;
  }>;
};

function normalizeText(value?: string) {
  return (value || "").toLowerCase().trim();
}

function hasLeadFormMinimum(leadForm?: BrainInput["leadForm"]) {
  if (!leadForm) return false;

  return Boolean(
    normalizeText(leadForm.nombre) &&
      normalizeText(leadForm.telefono) &&
      normalizeText(leadForm.ciudad)
  );
}

function getStayProofDocs(documents?: BrainInput["documents"]) {
  if (!documents || !Array.isArray(documents)) return [];

  return documents.filter((d) => {
    const txt =
      `${d.nombre || ""} ${d.detectedType || ""} ${d.note || ""}`.toLowerCase();

    return (
      d.estado === "ok" &&
      (txt.includes("empadron") ||
        txt.includes("stay_proof") ||
        txt.includes("stay proof") ||
        txt.includes("prueba de permanencia") ||
        txt.includes("factura") ||
        txt.includes("banco") ||
        txt.includes("transfer") ||
        txt.includes("ticket") ||
        txt.includes("medico") ||
        txt.includes("médico") ||
        txt.includes("hospital") ||
        txt.includes("estancia") ||
        txt.includes("proof") ||
        txt.includes("justificante") ||
        txt.includes("resguardo") ||
        txt.includes("receta") ||
        txt.includes("consumo") ||
        txt.includes("transporte"))
    );
  });
}

function hasIdentityDoc(documents?: BrainInput["documents"]) {
  if (!documents || !Array.isArray(documents)) return false;

  return documents.some((d) => {
    const txt =
      `${d.nombre || ""} ${d.detectedType || ""} ${d.note || ""}`.toLowerCase();

    return (
      d.estado === "ok" &&
      (txt.includes("passport") ||
        txt.includes("pasaporte") ||
        txt.includes("nie") ||
        txt.includes("tie") ||
        txt.includes("identity"))
    );
  });
}

function hasWarnDocuments(documents?: BrainInput["documents"]) {
  if (!documents || !Array.isArray(documents)) return false;
  return documents.some((d) => d.estado === "warn");
}

function estimateStayProofProgress(documents?: BrainInput["documents"]) {
  const stayDocs = getStayProofDocs(documents);
  const count = stayDocs.length;

  if (count >= 5) return 5;
  return count;
}

function detectIntent(text: string) {
  const t = (text || "").toLowerCase();

  if (
    t.includes("hola") ||
    t.includes("hello") ||
    t.includes("slam") ||
    t.includes("salam") ||
    t.includes("salam alaikum") ||
    t.includes("السلام")
  ) {
    return "hello";
  }

  if (
    t.includes("qué falta") ||
    t.includes("que falta") ||
    t.includes("falta algo") ||
    t.includes("what is missing") ||
    t.includes("chno ناقص") ||
    t.includes("شنو ناقص")
  ) {
    return "missing";
  }

  if (
    t.includes("he subido") ||
    t.includes("ya subi") ||
    t.includes("ya subí") ||
    t.includes("subi documento") ||
    t.includes("subí documento") ||
    t.includes("he enviado") ||
    t.includes("ya mande") ||
    t.includes("ya mandé")
  ) {
    return "uploaded";
  }

  if (
    t.includes("pasaporte") ||
    t.includes("passport") ||
    t.includes("nie") ||
    t.includes("tie")
  ) {
    return "identity";
  }

  if (
    t.includes("5 meses") ||
    t.includes("cinco meses") ||
    t.includes("pruebas") ||
    t.includes("empadronamiento") ||
    t.includes("padron") ||
    t.includes("padrón") ||
    t.includes("proof")
  ) {
    return "stay_proof";
  }

  if (
    t.includes("pdf") ||
    t.includes("whatsapp") ||
    t.includes("expediente final") ||
    t.includes("hemos acabado")
  ) {
    return "final";
  }

  return "general";
}

function replyES(input: BrainInput) {
  const intent = detectIntent(input.userMessage || "");
  const formReady = hasLeadFormMinimum(input.leadForm);
  const identityReady = hasIdentityDoc(input.documents);
  const stayProofCount = estimateStayProofProgress(input.documents);
  const stayProofReady = stayProofCount >= 1;
  const hasWarn = hasWarnDocuments(input.documents);

  if (intent === "hello") {
    if (!formReady) {
      return "Hola. Soy Mohamed. Primero rellena el formulario con tus datos básicos y después seguimos por voz.";
    }

    if (!stayProofReady) {
      return "Perfecto. Ya tengo tus datos. Ahora sube primero tus pruebas de 5 meses.";
    }

    if (!identityReady) {
      return "Perfecto. Ya he recibido pruebas de permanencia. Ahora sube tu pasaporte o tu NIE.";
    }

    if (hasWarn) {
      return "He recibido parte de tu documentación, pero algunas cosas necesitan revisión. Súbelas más claras y seguimos.";
    }

    return "Perfecto. Ya está todo lo principal. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
  }

  if (intent === "missing") {
    if (!formReady) {
      return "Primero falta rellenar el formulario con nombre, teléfono y ciudad.";
    }

    if (!stayProofReady) {
      return "Ahora faltan tus pruebas de 5 meses. Súbelas primero y después seguimos.";
    }

    if (!identityReady) {
      return "Ahora falta tu pasaporte o tu NIE. Súbelo y sigo con tu expediente.";
    }

    if (hasWarn) {
      return "Hay documentos subidos, pero alguno necesita revisión porque no se ve claro. Súbelo otra vez más claro.";
    }

    return "No falta nada importante. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
  }

  if (intent === "uploaded") {
    if (!formReady) {
      return "Antes de seguir, rellena primero el formulario con tus datos básicos.";
    }

    if (!stayProofReady) {
      return "Perfecto. Ya puedes empezar subiendo tus pruebas de 5 meses.";
    }

    if (!identityReady) {
      return "Perfecto. Ya he recibido tus pruebas de permanencia. Ahora sube tu pasaporte o tu NIE.";
    }

    if (hasWarn) {
      return "He recibido tu documento, pero necesito una versión más clara para continuar.";
    }

    return "Perfecto. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
  }

  if (intent === "identity") {
    if (!formReady) {
      return "Primero rellena el formulario. Después subes las pruebas de 5 meses y luego el pasaporte o NIE.";
    }

    if (!stayProofReady) {
      return "Antes del pasaporte o NIE, sube primero tus pruebas de 5 meses.";
    }

    if (!identityReady) {
      return "Ahora sí, sube tu pasaporte o tu NIE bien claro.";
    }

    if (hasWarn) {
      return "He recibido un documento de identidad, pero necesito una imagen más clara para verificarlo bien.";
    }

    return "Tu pasaporte o NIE ya está correcto. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
  }

  if (intent === "stay_proof") {
    if (!formReady) {
      return "Primero rellena el formulario con tus datos básicos.";
    }

    if (!stayProofReady) {
      return "Ahora sube tus pruebas de 5 meses. Puedes subir empadronamiento, justificantes, tickets, facturas o documentos que demuestren permanencia.";
    }

    if (!identityReady) {
      return "Perfecto. Ya he recibido pruebas de permanencia. Ahora sube tu pasaporte o tu NIE.";
    }

    if (hasWarn) {
      return "Parte de las pruebas se han recibido, pero alguna necesita revisión porque no se ve clara.";
    }

    return "Las pruebas de permanencia ya están bien. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
  }

  if (intent === "final") {
    if (formReady && stayProofReady && identityReady && !hasWarn) {
      return "Sí. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
    }

    return "Todavía estamos terminando tu expediente. Primero formulario, después pruebas de 5 meses y después pasaporte o NIE.";
  }

  if (!formReady) {
    return "Primero rellena el formulario con tus datos básicos y después seguimos.";
  }

  if (!stayProofReady) {
    return "Ahora sube primero tus pruebas de 5 meses.";
  }

  if (!identityReady) {
    return "Perfecto. Ya tengo tus pruebas de permanencia. Ahora sube tu pasaporte o tu NIE.";
  }

  if (hasWarn) {
    return "Hay un documento que no se ve bien. Súbelo otra vez más claro para terminar.";
  }

  return "Perfecto. Hemos acabado, enhorabuena. Te mandamos tu expediente en archivo PDF por WhatsApp.";
}

function replyEN(input: BrainInput) {
  const formReady = hasLeadFormMinimum(input.leadForm);
  const identityReady = hasIdentityDoc(input.documents);
  const stayProofReady = estimateStayProofProgress(input.documents) >= 1;
  const hasWarn = hasWarnDocuments(input.documents);

  if (!formReady) {
    return "First complete the basic form. Then we continue by voice.";
  }

  if (!stayProofReady) {
    return "Now upload your 5-month proof documents first.";
  }

  if (!identityReady) {
    return "Perfect. Now upload your passport or NIE.";
  }

  if (hasWarn) {
    return "One document still needs a clearer version.";
  }

  return "Perfect. We have finished. Congratulations. We will send your PDF file by WhatsApp.";
}

function replyDAR(input: BrainInput) {
  const intent = detectIntent(input.userMessage || "");
  const formReady = hasLeadFormMinimum(input.leadForm);
  const identityReady = hasIdentityDoc(input.documents);
  const stayProofCount = estimateStayProofProgress(input.documents);
  const stayProofReady = stayProofCount >= 1;
  const hasWarn = hasWarnDocuments(input.documents);

  if (intent === "hello") {
    if (!formReady) {
      return "السلام. أنا محمد. أول حاجة عمر الفورمولار بالمعطيات الأساسية ديالك ومن بعد نكملو بالصوت.";
    }

    if (!stayProofReady) {
      return "مزيان. خديت المعطيات ديالك. دابا صيفط ليا أولاً بروفات 5 شهور.";
    }

    if (!identityReady) {
      return "مزيان. توصلت ببروفات ديال الإقامة. دابا صيفط ليا الباسبور ولا NIE.";
    }

    if (hasWarn) {
      return "توصلت بشي وثائق، ولكن كاين شي حاجة خاصها مراجعة. صيفطها أوضح ونكملو.";
    }

    return "مزيان. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
  }

  if (intent === "missing") {
    if (!formReady) {
      return "أول حاجة خاصك تعمر الفورمولار بالاسم والتليفون والمدينة.";
    }

    if (!stayProofReady) {
      return "دابا خاصك تصيفط بروفات 5 شهور. صيفطهم أولاً ومن بعد نكملو.";
    }

    if (!identityReady) {
      return "دابا خاص الباسبور ولا NIE. صيفطو ونكمل الملف ديالك.";
    }

    if (hasWarn) {
      return "كاينين وثائق طلعتيهم ولكن شي وحدة ما بايناش مزيان. صيفطها مرة أخرى واضحة.";
    }

    return "ما ناقص والو مهم. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
  }

  if (intent === "uploaded") {
    if (!formReady) {
      return "قبل ما نكملو، عمر أولاً الفورمولار بالمعطيات الأساسية.";
    }

    if (!stayProofReady) {
      return "مزيان. دابا بدا صيفط بروفات 5 شهور.";
    }

    if (!identityReady) {
      return "مزيان. توصلت ببروفات ديال الإقامة. دابا صيفط الباسبور ولا NIE.";
    }

    if (hasWarn) {
      return "توصلت بالوثيقة ولكن خاصني نسخة أوضح باش نكمل.";
    }

    return "مزيان. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
  }

  if (intent === "identity") {
    if (!formReady) {
      return "أولاً عمر الفورمولار. من بعد صيفط بروفات 5 شهور، ومن بعد الباسبور ولا NIE.";
    }

    if (!stayProofReady) {
      return "قبل الباسبور ولا NIE، صيفط أولاً بروفات 5 شهور.";
    }

    if (!identityReady) {
      return "دابا صيفط الباسبور ولا NIE واضح مزيان.";
    }

    if (hasWarn) {
      return "توصلت بوثيقة ديال الهوية، ولكن خاصني صورة أوضح باش نتحقق منها مزيان.";
    }

    return "الباسبور ولا NIE ديالك مزيان. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
  }

  if (intent === "stay_proof") {
    if (!formReady) {
      return "أولاً عمر الفورمولار بالمعطيات الأساسية.";
    }

    if (!stayProofReady) {
      return "دابا صيفط بروفات 5 شهور. تقدر تصيفط إمبادروناميينتو، تيكيطات، فواتير، ولا أي وثائق كيبينو الإقامة.";
    }

    if (!identityReady) {
      return "مزيان. توصلت ببروفات الإقامة. دابا صيفط الباسبور ولا NIE.";
    }

    if (hasWarn) {
      return "شي بروفات توصلت بيهم ولكن كاين شي وحدة خاصها مراجعة حيت ما بايناش مزيان.";
    }

    return "بروفات الإقامة مزيانين. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
  }

  if (intent === "final") {
    if (formReady && stayProofReady && identityReady && !hasWarn) {
      return "إيوا نعم. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
    }

    return "مازال كنوجدو الملف ديالك. أولاً الفورمولار، من بعد بروفات 5 شهور، ومن بعد الباسبور ولا NIE.";
  }

  if (!formReady) {
    return "أولاً عمر الفورمولار بالمعطيات الأساسية ديالك ومن بعد نكملو.";
  }

  if (!stayProofReady) {
    return "دابا صيفط ليا أولاً بروفات 5 شهور.";
  }

  if (!identityReady) {
    return "مزيان. عندي دابا بروفات الإقامة. دابا صيفط الباسبور ولا NIE.";
  }

  if (hasWarn) {
    return "كاينة وثيقة ما بايناش مزيان. صيفطها مرة أخرى واضحة باش نكملو.";
  }

  return "مزيان. سالينا، هنيئاً. غادي نصيفطو ليك الملف ديالك PDF فالواتساب.";
}

export function mohamedBrain(input: BrainInput) {
  if (input.lang === "darija") return replyDAR(input);
  if (input.lang === "en") return replyEN(input);
  return replyES(input);
}
