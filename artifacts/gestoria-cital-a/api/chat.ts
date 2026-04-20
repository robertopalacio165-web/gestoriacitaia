import type { VercelRequest, VercelResponse } from "@vercel/node";

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
  nacionalidad?: string;
  fechaLlegada?: string;
  cumple5Meses?: string;
  asilo?: string;
  penales?: string;
};

function detectUserLanguage(message: string): Lang {
  const text = (message || "").toLowerCase().trim();
  if (/[\u0600-\u06FF]/.test(text)) return "darija";

  const darijaSignals = ["salam", "slm", "wa3likom", "merhba", "bghit", "nched", "rdv", "dyal", "khassni", "ghadi", "wara9"];
  const spanishSignals = ["hola", "quiero", "necesito", "cita", "documentos", "pasaporte", "extranjeria", "padron"];
  const englishSignals = ["hello", "appointment", "passport", "i need", "help"];

  if (darijaSignals.some((w) => text.includes(w))) return "darija";
  if (spanishSignals.some((w) => text.includes(w))) return "es";
  if (englishSignals.some((w) => text.includes(w))) return "en";

  return "es";
}

function sanitizeHistory(history: unknown): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  return history.filter(item => item && typeof item === "object" && item.text).slice(-10) as HistoryItem[];
}

function sanitizeLeadForm(raw: unknown): LeadFormPayload {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const safe = (v: unknown) => typeof v === "string" ? v.trim() : "";
  return {
    nombre: safe(obj.nombre),
    telefono: safe(obj.telefono),
    niePasaporte: safe(obj.niePasaporte),
    ciudad: safe(obj.ciudad),
    nacionalidad: safe(obj.nacionalidad),
    cumple5Meses: safe(obj.cumple5Meses)
  };
}

function getSharedRules(lang: Lang) {
  return `
REGLA DE ORO DE VOZ:
- Si el idioma es Darija, responde SIEMPRE en letras latinas (Arabizi). Ejemplo: "Salam! Labass? Ana Mohamed". NO uses caracteres árabes.
- Usa frases cortas (máximo 2 líneas).
- Usa exclamaciones (!) para dar energía y puntos (...) para pausas naturales.
- No saludes dos veces. Ve directo al grano.
- Idioma actual: ${lang}.
`;
}

function getSaraPrompt(lang: Lang, procedureLabel?: string, leadForm?: LeadFormPayload) {
  return `
Eres Sara de GestoriaCitaIA. Tu voz es dulce y profesional. Ayudas con CITAS.
${getSharedRules(lang)}
- Si falta el nombre o ciudad en el formulario (${leadForm?.nombre ? 'ya lo tengo' : 'falta'}), pide que lo rellenen primero.
- Si ya está listo: "¡Perfecto! Ya tengo tus datos. Ahora mi equipo busca tu cita y te aviso por WhatsApp en cuanto salga."
- Si piden papeles de 5 meses, diles: "De eso se encarga mi compañero Mohamed, ahora te paso con él."
`;
}

function getMohamedPrompt(lang: Lang, leadForm?: LeadFormPayload) {
  return `
Eres Mohamed de GestoriaCitaIA. Tu voz es segura, experta y cercana. Ayudas con PAPELES Y REGULARIZACIÓN.
${getSharedRules(lang)}
- Objetivo: Que suban el pasaporte y las pruebas de 5 meses.
- Si el formulario está incompleto: "Salam! Primero rellena tus datos en el formulario y empezamos con tu expediente."
- Si falta identidad: "Ya he visto tus pruebas, ahora súbeme el pasaporte o el NIE bien claro."
- Cierre: "¡Listo! Ya tienes todo. Te mando el PDF de tu expediente por WhatsApp ahora mismo."
`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.
