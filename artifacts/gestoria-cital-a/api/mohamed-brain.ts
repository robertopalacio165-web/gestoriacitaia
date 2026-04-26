type BrainInput = {
  lang: "es" | "darija";
  userMessage: string;
  documents?: Array<{ nombre: string; estado: "ok" | "warn" | "missing" }>;
};

export function mohamedBrain(input: BrainInput) {
  const { lang, documents } = input;
  
  const hasIdentity = documents?.some(d => d.estado === "ok" && /pasaporte|nie|tie/i.test(d.nombre));
  const hasProofs = documents?.some(d => d.estado === "ok" && /pruebas|factura|padron/i.test(d.nombre));

  if (lang === "darija") {
    if (!hasProofs) {
      return "Salam! Ana Mohamed. Khassni nchouf wraq dial 5 chhor homa l-lowlin bach n-ebdaw l-khidma d l-regularización.";
    }
    if (!hasIdentity) {
      return "Dakchi houwa hadak. Daba khassni l-passeport dialek bach n-kemlo l-milaf o n-sifto l-extranjería.";
    }
    return "Safì, kolchi houwa hadak! Salina l-khidma. Ghadi nsift lik l-expediente dialek PDF f WhatsApp daba nite.";
  }

  if (!hasProofs) {
    return "Hola, soy Mohamed. Para tramitar tu regularización 2026, lo primero que necesito son tus pruebas de permanencia de los últimos 5 meses.";
  }
  if (!hasIdentity) {
    return "Muy bien, las pruebas son correctas. Ahora envíame una foto clara de tu pasaporte para finalizar el expediente.";
  }
  
  return "¡Excelente! Ya tenemos toda la documentación necesaria. Te envío ahora mismo el borrador de tu solicitud por WhatsApp.";
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    const result = mohamedBrain(req.body);
    return res.status(200).json({ reply: result });
  }
  return res.status(405).send("Method Not Allowed");
}
