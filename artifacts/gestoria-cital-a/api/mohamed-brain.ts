// api/mohamed-brain.ts

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
      txt.includes("ticket") ||
      txt.includes("medico") ||
      txt.includes("hospital") ||
      txt.includes("stay") ||
      txt.includes("estancia")
    );
  });

  return Math.min(5, Math.max(0, Math.ceil(stayDocs.length / 2)));
}

function detectIntent(text: string) {
  const t = text.toLowerCase();

  if (
    t.includes("aceptado") ||
    t.includes("apto") ||
    t.includes("sirve") ||
    t.includes("vale") ||
    t.includes("regularizacion")
  ) {
    return "status";
  }

  if (
    t.includes("cita") ||
    t.includes("appointment") ||
    t.includes("sara")
  ) {
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

  return "general";
}

function replyES(input: BrainInput) {
  const msg = input.userMessage.toLowerCase();
  const meses = monthsCovered(input.documents);
  const valid = hasEnoughValidDocs(input.documents);

  const intent = detectIntent(msg);

  if (intent === "hello") {
    return "Hola. Soy Mohamed, especialista en extranjería. Envíame tus documentos y te diré si son aptos para la regularización.";
  }

  if (intent === "appointment") {
    return "Cuando tu expediente esté listo, Sara podrá ayudarte con la cita automáticamente.";
  }

  if (intent === "status") {
    if (meses >= 5 && valid) {
      return "✅ Expediente apto para regularización. Tienes pruebas suficientes y documentos válidos.";
    }

    if (meses >= 3) {
      return "🟡 Vas bien, pero todavía faltan pruebas para llegar a los 5 meses. Sube más documentos.";
    }

    return "❌ Aún no apto para regularización. Faltan pruebas claras o documentos válidos. Sube otro documento más claro.";
  }

  return "Envíame tu documentación y revisaré si es aceptada para la regularización.";
}

function replyEN(input: BrainInput) {
  const meses = monthsCovered(input.documents);
  const valid = hasEnoughValidDocs(input.documents);

  if (meses >= 5 && valid) {
    return "✅ File accepted for regularization. You have enough valid evidence.";
  }

  return "❌ Not accepted yet. Upload clearer or additional documents.";
}

function replyDAR(input: BrainInput) {
  const meses = monthsCovered(input.documents);
  const valid = hasEnoughValidDocs(input.documents);

  if (meses >= 5 && valid) {
    return "✅ الملف مقبول للتسوية. عندك بروفات كافية ووثائق صالحة.";
  }

  return "❌ مازال ما تقبلش. صيفط وثائق أخرى واضحة ومناسبة.";
}

export function mohamedBrain(input: BrainInput) {
  if (input.lang === "darija") return replyDAR(input);
  if (input.lang === "en") return replyEN(input);
  return replyES(input);
}
