type BrainInput = {
  lang?: "es" | "darija" | "en";
  userMessage: string;
  leadForm?: {
    nombre?: string;
    telefono?: string;
    ciudad?: string;
    nacionalidad?: string;
  };
  documents?: Array<{
    nombre?: string;
    estado?: "ok" | "warn" | "missing";
  }>;
};

function hasLeadFormMinimum(leadForm?: BrainInput["leadForm"]) {
  return Boolean(leadForm?.nombre && leadForm?.telefono && leadForm?.ciudad);
}

function getDocStatus(documents?: BrainInput["documents"]) {
  const hasIdentity = documents?.some(d => d.estado === "ok" && /pasaporte|nie|dni/i.test(d.nombre || ""));
  const hasProofs = documents?.some(d => d.estado === "ok" && /pruebas|factura|padron/i.test(d.nombre || ""));
  const hasWarn = documents?.some(d => d.estado === "warn");
  return { hasIdentity, hasProofs, hasWarn };
}

function detectIntent(text: string) {
  const t = text.toLowerCase();
  if (t.includes("hola") || t.includes("salam") || t.includes("slm")) return "hello";
  if (t.includes("subido") || t.includes("mandado") || t.includes("sift")) return "uploaded";
  if (t.includes("falta") || t.includes("naqes") || t.includes("na9es")) return "missing";
  if (t.includes("pdf") || t.includes("final") || t.includes("salina")) return "final";
  return "general";
}

// RESPUESTAS EN DARIJA (ARABIZI) PARA VOZ HUMANA
function replyDAR(input: BrainInput) {
  const intent = detectIntent(input.userMessage);
  const formReady = hasLeadFormMinimum(input.leadForm);
  const { hasIdentity, hasProofs, hasWarn } = getDocStatus(input.documents);

  if (!formReady) {
    return "Salam! Ana Mohamed. Awel haja, 3emer dak l-formulaire hwa l-wel b l-ma3loumat dialek, o nkemlo gher b l-hedra.";
  }

  if (intent === "hello") {
    if (!hasProofs) return "Ahlan! Kolchi mezyan. Daba khassak t-sift l-wraq dial 5 chhor homa l-lowlin Allah y-khalik.";
    if (!hasIdentity) return "Mezyan, wslo l-wraq. Daba khassni ghir l-passeport awla l-NIE dialek bach n-kemlo.";
    return "Salam! Kolchi 3endi wa3er. Salina l-khidma, ghir sber chwia nsift lik l-PDF f WhatsApp.";
  }

  if (intent === "uploaded" || intent === "general") {
    if (hasWarn) return "Wslo l-wraq walakin wahed l-wartiqa ma baynach mezyan. Siftha lia t-koun clara chwia.";
    if (!hasProofs) return "Mezyan! Daba k-mely l-khidma o sift l-wraq dial 5 chhor bach n-verify-hom.";
    if (!hasIdentity) return "Dakchi houwa hadak. Sift l-passeport dialek daba o n-khrej lik l-milaf.";
  }

  if (intent === "final" || (hasIdentity && hasProofs)) {
    return "Safì, kolchi houwa hadak! Hania lik, salina. Ghadi nsift lik l-expediente dialek PDF f WhatsApp daba nite.";
  }

  return "Ana m3ak. Sift l-wraq li baqin o n-kemlo l-expediente dialek dghia.";
}

// RESPUESTAS EN ESPAÑOL HUMANO
function replyES(input: BrainInput) {
  const intent = detectIntent(input.userMessage);
  const formReady = hasLeadFormMinimum(input.leadForm);
  const { hasIdentity, hasProofs, hasWarn } = getDocStatus(input.documents);

  if (!formReady) return "Hola, soy Mohamed. Primero completa el formulario con tus datos y seguimos preparando tu expediente.";
  
  if (hasWarn) return "He recibido los documentos, pero alguno no se ve claro. Súbelo de nuevo bien enfocado, por favor.";

  if (!hasProofs) return "Perfecto, ya tengo tus datos. Ahora sube tus pruebas de permanencia de los últimos 5 meses.";

  if (!hasIdentity) return "Muy bien, ya veo las pruebas. Ahora solo falta que subas tu pasaporte o NIE para terminar.";

  return "¡Enhorabuena! Ya está todo listo. Te mando ahora mismo tu expediente completo en PDF por WhatsApp.";
}

export function mohamedBrain(input: BrainInput) {
  if (input.lang === "darija") return replyDAR(input);
  return replyES(input);
}
