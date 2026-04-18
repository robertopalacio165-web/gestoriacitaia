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

function hasEnoughValidDocs(documents?: BrainInput["documents"]) {
  if (!documents || !Array.isArray(documents)) return false;
  const ok = documents.filter((d) => d.estado === "ok").length;
  return ok >= 3;
}

function monthsCovered(documents?: BrainInput["documents"]) {
  if (!documents || !Array.isArray(documents)) return 0;

  const stayDocs = documents.filter((d) => {
    const txt =
      `${d.nombre || ""} ${d.detectedType || ""} ${d.note || ""}`.toLowerCase();

    return (
      txt.includes("empadron") ||
      txt.includes("factura") ||
      txt.includes("banco") ||
      txt.includes("transfer") ||
      txt.includes("ticket") ||
      txt.includes("medico") ||
      txt.includes("hospital") ||
      txt.includes("stay") ||
      txt.includes("estancia") ||
      txt.includes("proof")
    );
  });

  return Math.min(5, Math.max(0, Math.ceil(stayDocs.length / 2)));
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

function hasCriminalRecord(documents?: BrainInput["documents"]) {
  if (!documents || !Array.isArray(documents)) return false;

  return documents.some((d) => {
    const txt =
      `${d.nombre || ""} ${d.detectedType || ""} ${d.note || ""}`.toLowerCase();

    return (
      d.estado === "ok" &&
      (txt.includes("criminal") ||
        txt.includes("antecedentes") ||
        txt.includes("penales") ||
        txt.includes("criminal_record"))
    );
  });
}

function detectIntent(text: string) {
  const t = text.toLowerCase();

  if (
    t.includes("aceptado") ||
    t.includes("apto") ||
    t.includes("sirve") ||
    t.includes("vale") ||
    t.includes("regularizacion") ||
    t.includes("regularización")
  ) {
    return "status";
  }

  if (t.includes("cita") || t.includes("appointment") || t.includes("sara")) {
    return "appointment";
  }

  if (
    t.includes("hola") ||
    t.includes("hello") ||
    t.includes("slam") ||
    t.includes("salam")
  ) {
    return "hello";
  }

  if (
    t.includes("que falta") ||
    t.includes("qué falta") ||
    t.includes("falta algo") ||
    t.includes("what is missing")
  ) {
    return "missing";
  }

  return "general";
}

function replyES(input: BrainInput) {
  const meses = monthsCovered(input.documents);
  const valid = hasEnoughValidDocs(input.documents);
  const identidad = hasIdentityDoc(input.documents);
  const penales = hasCriminalRecord(input.documents);
  const intent = detectIntent(input.userMessage || "");

  if (intent === "hello") {
    return "Hola. Soy Mohamed, especialista en extranjería. Ya puedes subir tus documentos y te diré claramente si son aptos o no aptos para la regularización 2026.";
  }

  if (intent === "appointment") {
    return "Cuando tu expediente esté listo, Sara podrá ayudarte con la cita. Ahora primero terminamos la revisión documental.";
  }

  if (intent === "missing") {
    const faltan: string[] = [];

    if (!identidad) faltan.push("pasaporte o NIE");
    if (!penales) faltan.push("antecedentes penales");
    if (meses < 5) faltan.push("más pruebas para completar los 5 meses");

    if (faltan.length === 0) {
      return "Todo lo importante aparece ya cargado. Tu expediente va bien encaminado para la regularización 2026.";
    }

    return `Todavía faltan estos puntos para la regularización 2026: ${faltan.join(
      ", "
    )}. Súbelos y sigo revisando.`;
  }

  if (intent === "status") {
    if (meses >= 5 && valid && identidad) {
      return "✅ Expediente APTO para la regularización 2026. Ya tienes base suficiente y documentación válida. Sigue subiendo lo que falte para cerrar el expediente final.";
    }

    if (meses >= 3 && identidad) {
      return "🟡 Parte del expediente es APTA, pero todavía NO ESTÁ COMPLETO para la regularización 2026. Faltan más pruebas para llegar a los 5 meses o completar documentos importantes.";
    }

    return "❌ De momento NO APTO para la regularización 2026. Faltan pruebas claras o documentos válidos. Sube otro documento más claro y sigo revisando.";
  }

  if (meses >= 5 && identidad) {
    return "Vas bien. Ya tienes una base documental importante para la regularización 2026. Ahora sube lo que te falte y sigo revisando si es apto o no apto.";
  }

  return "Envíame tus documentos y te diré claramente si cada uno es APTO o NO APTO para la regularización 2026.";
}

function replyEN(input: BrainInput) {
  const meses = monthsCovered(input.documents);
  const valid = hasEnoughValidDocs(input.documents);
  const identidad = hasIdentityDoc(input.documents);

  if (meses >= 5 && valid && identidad) {
    return "✅ File ACCEPTED for the 2026 regularization. You already have enough valid evidence.";
  }

  return "❌ Not accepted yet for the 2026 regularization. Upload clearer or additional documents.";
}

function replyDAR(input: BrainInput) {
  const meses = monthsCovered(input.documents);
  const valid = hasEnoughValidDocs(input.documents);
  const identidad = hasIdentityDoc(input.documents);
  const intent = detectIntent(input.userMessage || "");

  if (intent === "hello") {
    return "السلام. أنا محمد، مختص فالهجرة. صيفط ليا الوثائق ديالك وغادي نقول ليك بوضوح واش كل وثيقة مقبولة ولا لا فالتسوية 2026.";
  }

  if (intent === "appointment") {
    return "منين يوجَد الملف ديالك مزيان، سارة تقدر تعاونك فالموعد. دابا الأول نكملو مراجعة الوثائق.";
  }

  if (intent === "missing") {
    const faltan: string[] = [];

    if (!identidad) faltan.push("الباسبور أو NIE");
    if (!hasCriminalRecord(input.documents)) faltan.push("شهادة السوابق العدلية");
    if (meses < 5) faltan.push("بروفات أخرى باش تكمل 5 شهور");

    if (faltan.length === 0) {
      return "كلشي باين مزيان دابا. الملف ديالك غادي مزيان فالتسوية 2026.";
    }

    return `مازال خاصك هاد الحوايج فالتسوية 2026: ${faltan.join(
      "، "
    )}. صيفطهم ليا ونكمل المراجعة.`;
  }

  if (intent === "status") {
    if (meses >= 5 && valid && identidad) {
      return "✅ الملف ديالك مقبول للتسوية 2026. عندك بروفات كافية ووثائق صالحة. كمل صيفط اللي بقا باش نسدو الملف النهائي.";
    }

    if (meses >= 3 && identidad) {
      return "🟡 جزء من الملف مقبول، ولكن مازال ما كملش باش يكون مقبول كامل فالتسوية 2026. خاصك تزيد بروفات أو وثائق مهمة.";
    }

    return "❌ دابا الملف مازال غير مقبول للتسوية 2026. خاص بروفات واضحة أكثر أو وثائق صالحة. صيفط وثيقة أخرى وأنا نراجعها.";
  }

  if (meses >= 5 && identidad) {
    return "راك غادي مزيان. عندك قاعدة مزيانة ديال الوثائق للتسوية 2026. دابا صيفط اللي بقا وأنا نراجع واش مقبول ولا لا.";
  }

  return "صيفط ليا الوثائق ديالك وغادي نقول ليك بوضوح واش كل وحدة مقبولة ولا غير مقبولة فالتسوية 2026.";
}

export function mohamedBrain(input: BrainInput) {
  if (input.lang === "darija") return replyDAR(input);
  if (input.lang === "en") return replyEN(input);
  return replyES(input);
}
