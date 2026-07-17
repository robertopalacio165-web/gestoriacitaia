import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

// ============================================
// TIPOS
// ============================================
interface Company {
  name: string;
  address: string;
  city: string;
  department: string;
}

interface CVContent {
  summary: string;
  profile: string;
  achievements: string[];
  experience: string[];
  tokens?: number;
}

interface LetterContent {
  introduction: string;
  body1: string;
  body2: string;
  body3: string;
  closing: string;
  tokens?: number;
}

// ============================================
// CONFIGURACIÓN
// ============================================
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing");
}

const OPENAI_MODEL = "gpt-4o-mini";
const BUCKET_NAME = "malta-documents";
const OPENAI_TIMEOUT_MS = 120000;

// ============================================
// MAPEO DE SECTORES Y EMPRESAS
// ============================================
const SECTOR_TEMPLATES: Record<string, {
  title: string;
  atsKeywords: string[];
  skills: string[];
  companies: Company[];
}> = {
  kitchen: {
    title: "Kitchen Assistant",
    atsKeywords: ["food preparation", "hygiene", "HACCP", "cleaning", "inventory"],
    skills: ["Food Preparation", "Kitchen Hygiene", "HACCP", "Inventory Management", "Cleaning & Sanitization", "Team Collaboration"],
    companies: [
      { name: "Hilton Malta", address: "Portomaso, St. Julian's, Malta", city: "St. Julian's", department: "Human Resources Department" },
      { name: "Radisson Blu Resort", address: "St. George's Bay, St. Julian's, Malta", city: "St. Julian's", department: "Recruitment Team" },
      { name: "Corinthia Palace", address: "San Anton, Attard, Malta", city: "Attard", department: "Human Resources" },
      { name: "Marriott Malta", address: "Balluta Bay, St. Julian's, Malta", city: "St. Julian's", department: "Talent Acquisition" },
      { name: "The Phoenicia Malta", address: "Floriana, Malta", city: "Floriana", department: "Human Resources Department" },
    ],
  },
  hotel: {
    title: "Housekeeping Attendant",
    atsKeywords: ["cleaning", "organization", "customer service", "attention to detail"],
    skills: ["Cleaning", "Organization", "Customer Service", "Attention to Detail", "Teamwork", "Time Management"],
    companies: [
      { name: "Hilton Malta", address: "Portomaso, St. Julian's, Malta", city: "St. Julian's", department: "Human Resources Department" },
      { name: "Corinthia Palace", address: "San Anton, Attard, Malta", city: "Attard", department: "Human Resources" },
      { name: "Radisson Blu Resort", address: "St. George's Bay, St. Julian's, Malta", city: "St. Julian's", department: "Recruitment Team" },
      { name: "The Phoenicia Malta", address: "Floriana, Malta", city: "Floriana", department: "Human Resources Department" },
    ],
  },
  restaurant: {
    title: "Food & Beverage Assistant",
    atsKeywords: ["customer service", "food safety", "hygiene", "team work"],
    skills: ["Customer Service", "Food Safety", "Hygiene", "Team Collaboration", "Communication", "Attention to Detail"],
    companies: [
      { name: "Hilton Malta", address: "Portomaso, St. Julian's, Malta", city: "St. Julian's", department: "Human Resources Department" },
      { name: "Radisson Blu Resort", address: "St. George's Bay, St. Julian's, Malta", city: "St. Julian's", department: "Recruitment Team" },
      { name: "Corinthia Palace", address: "San Anton, Attard, Malta", city: "Attard", department: "Human Resources" },
      { name: "db Hotels", address: "Sliema, Malta", city: "Sliema", department: "Human Resources" },
    ],
  },
  cleaning: {
    title: "Professional Cleaner",
    atsKeywords: ["cleaning", "hygiene", "organization", "attention to detail"],
    skills: ["Cleaning", "Hygiene", "Organization", "Attention to Detail", "Time Management", "Reliability"],
    companies: [
      { name: "Hilton Malta", address: "Portomaso, St. Julian's, Malta", city: "St. Julian's", department: "Human Resources Department" },
      { name: "Corinthia Palace", address: "San Anton, Attard, Malta", city: "Attard", department: "Human Resources" },
      { name: "Radisson Blu Resort", address: "St. George's Bay, St. Julian's, Malta", city: "St. Julian's", department: "Recruitment Team" },
      { name: "The Phoenicia Malta", address: "Floriana, Malta", city: "Floriana", department: "Human Resources Department" },
    ],
  },
  warehouse: {
    title: "Warehouse Operative",
    atsKeywords: ["inventory", "forklift", "packing", "organization", "safety"],
    skills: ["Inventory Management", "Forklift", "Packing", "Safety", "Organization", "Teamwork"],
    companies: [
      { name: "DB Schenker", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources" },
      { name: "Kuehne + Nagel", address: "Mriehel, Malta", city: "Mriehel", department: "Recruitment Team" },
      { name: "Malta Freeport", address: "Birzebbuga, Malta", city: "Birzebbuga", department: "Human Resources Department" },
      { name: "Express Group", address: "Qormi, Malta", city: "Qormi", department: "Human Resources" },
    ],
  },
  delivery: {
    title: "Delivery Driver",
    atsKeywords: ["driving", "navigation", "time management", "customer service"],
    skills: ["Driving", "Navigation", "Time Management", "Customer Service", "Reliability", "Communication"],
    companies: [
      { name: "Bolt Malta", address: "Sliema, Malta", city: "Sliema", department: "Operations Team" },
      { name: "Wolt Malta", address: "Birkirkara, Malta", city: "Birkirkara", department: "Recruitment Team" },
      { name: "Glovo Malta", address: "Birkirkara, Malta", city: "Birkirkara", department: "Human Resources" },
      { name: "DHL Malta", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources Department" },
    ],
  },
  construction: {
    title: "Construction Worker",
    atsKeywords: ["building", "safety", "tools", "team work", "physical work"],
    skills: ["Construction", "Safety", "Tools", "Team Work", "Physical Work", "Reliability"],
    companies: [
      { name: "Vassallo Builders", address: "Naxxar, Malta", city: "Naxxar", department: "Human Resources" },
      { name: "Hili Company", address: "Mosta, Malta", city: "Mosta", department: "Recruitment Team" },
      { name: "Mason Group", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources Department" },
      { name: "PG Group", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources" },
    ],
  },
  aluminium: {
    title: "Aluminium & Carpentry Worker",
    atsKeywords: ["aluminium", "carpentry", "tools", "measurement", "quality"],
    skills: ["Aluminium Work", "Carpentry", "Tools", "Quality Control", "Measurement", "Precision"],
    companies: [
      { name: "Vassallo Builders", address: "Naxxar, Malta", city: "Naxxar", department: "Human Resources" },
      { name: "Hili Company", address: "Mosta, Malta", city: "Mosta", department: "Recruitment Team" },
      { name: "Mason Group", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources Department" },
      { name: "PG Group", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources" },
    ],
  },
  manufacturing: {
    title: "Manufacturing Operative",
    atsKeywords: ["production", "quality", "machinery", "safety", "team work"],
    skills: ["Production", "Quality Control", "Machinery", "Safety", "Teamwork", "Attention to Detail"],
    companies: [
      { name: "ST Microelectronics", address: "Kirkop, Malta", city: "Kirkop", department: "Human Resources" },
      { name: "Malta Enterprise", address: "Gwardamangia, Malta", city: "Gwardamangia", department: "Recruitment Team" },
      { name: "Venture Global", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources Department" },
      { name: "Mizzi Group", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources" },
    ],
  },
  default: {
    title: "General Worker",
    atsKeywords: ["reliability", "team work", "safety", "quality", "adaptability"],
    skills: ["Reliability", "Team Work", "Safety", "Adaptability", "Communication", "Punctuality"],
    companies: [
      { name: "Various Companies", address: "Malta", city: "Malta", department: "Human Resources Department" },
    ],
  },
};

// ============================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================

function normalizePassport(value: string | null | undefined): string {
  if (!value) return "Not available";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Available";
  }
  return "Not available";
}

function normalizeVideo(value: string | null | undefined): string {
  if (!value) return "Not available";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Available";
  }
  return "Not available";
}

function normalizeWorkPermit(value: string | null | undefined): string {
  if (!value) return "Not available";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Eligible";
  }
  if (normalized === "en tramite" || normalized === "en_trámite" || normalized === "in_process") {
    return "In process";
  }
  return "Not eligible";
}

function normalizeRelocate(value: string | null | undefined): string {
  if (!value) return "Yes";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  return "No";
}

// ============================================
// VALIDACIONES DE DATOS
// ============================================

function validateDate(dateValue: string | null): string | null {
  if (!dateValue) return null;
  
  const cleaned = dateValue.replace(/[^0-9\-]/g, '');
  const parts = cleaned.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  if (year < 1900 || year > 2010) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function validateExperienceYears(value: string | null): string {
  if (!value) return "sin_experiencia";
  
  const validValues = ["sin_experiencia", "menos_1", "1_2", "3_5", "mas_5"];
  if (validValues.includes(value)) return value;
  
  const map: Record<string, string> = {
    "0": "sin_experiencia",
    "1": "menos_1",
    "2": "1_2",
    "3": "3_5",
    "4": "3_5",
    "5": "mas_5",
    "6": "mas_5",
    "7": "mas_5",
    "8": "mas_5",
    "9": "mas_5",
    "10": "mas_5",
  };
  
  if (value in map) return map[value];
  
  return "sin_experiencia";
}

function validateWorkExperience(value: string | null): string {
  if (!value) return "";
  return value.trim();
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getLanguageLevel(level: string): string {
  const map: Record<string, string> = {
    basico: "Basic",
    intermedio: "Intermediate",
    avanzado: "Advanced",
    nativo: "Native",
    basic: "Basic",
    intermediate: "Intermediate",
    advanced: "Advanced",
    native: "Native",
  };
  return map[level] || level;
}

function getAvailabilityLabel(value: string): string {
  const map: Record<string, string> = {
    inmediato: "Immediate",
    "1_semana": "1 Week",
    "2_semanas": "2 Weeks",
    "1_mes": "1 Month",
  };
  return map[value] || value;
}

function getExperienceLabel(value: string): string {
  const map: Record<string, string> = {
    sin_experiencia: "Entry Level",
    menos_1: "Less than 1 Year",
    "1_2": "1-2 Years",
    "3_5": "3-5 Years",
    mas_5: "5+ Years",
  };
  return map[value] || value;
}

function getEducationLabel(value: string): string {
  const map: Record<string, string> = {
    sin_estudios: "No formal education",
    secundaria: "Secondary Education",
    fp: "Vocational Training",
    diploma: "Diploma",
    universidad: "University Degree",
    master: "Master's Degree",
    otro: "Other",
  };
  return map[value] || value;
}

function getDriverLicenseLabel(value: string): string {
  if (!value || value === "No" || value === "no") return "No";
  return `Category ${value}`;
}

// ============================================
// MAPA DE IDIOMAS
// ============================================
const LANGUAGE_COLUMNS: Record<string, string> = {
  arabe: "arabe_nivel",
  árabe: "arabe_nivel",
  arabic: "arabe_nivel",
  español: "espanol_nivel",
  espanol: "espanol_nivel",
  spanish: "espanol_nivel",
  francés: "frances_nivel",
  frances: "frances_nivel",
  french: "frances_nivel",
  italiano: "italiano_nivel",
  italian: "italiano_nivel",
  alemán: "aleman_nivel",
  aleman: "aleman_nivel",
  german: "aleman_nivel",
  inglés: "ingles_nivel",
  ingles: "ingles_nivel",
  english: "ingles_nivel",
  portugues: "portugues_nivel",
  portugués: "portugues_nivel",
  portuguese: "portugues_nivel",
  ruso: "ruso_nivel",
  russian: "ruso_nivel",
  chino: "chino_nivel",
  chinese: "chino_nivel",
  mandarin: "chino_nivel",
};

// ============================================
// IDIOMAS - CON SOPORTE PARA ESPAÑOL E INGLÉS
// ============================================

const LANGUAGE_LEVELS: Record<string, number> = {
  basico: 35,
  intermedio: 65,
  avanzado: 90,
  nativo: 100,
  basic: 35,
  intermediate: 65,
  advanced: 90,
  native: 100,
};

const LANGUAGE_LABELS: Record<string, string> = {
  basico: "Basic (A1–A2)",
  intermedio: "Intermediate (B1–B2)",
  avanzado: "Advanced (C1)",
  nativo: "Native",
  basic: "Basic (A1–A2)",
  intermediate: "Intermediate (B1–B2)",
  advanced: "Advanced (C1)",
  native: "Native",
};

// ============================================
// LEER PLANTILLAS HTML
// ============================================

function readTemplate(templateName: string): string {
  const possiblePaths = [
    path.join(process.cwd(), "templates", templateName),
    path.join(
      process.cwd(),
      "artifacts",
      "gestoria-cital-a",
      "templates",
      templateName
    ),
  ];

  for (const templatePath of possiblePaths) {
    console.log("Checking:", templatePath);
    if (fs.existsSync(templatePath)) {
      console.log("✅ Template found:", templatePath);
      return fs.readFileSync(templatePath, "utf8");
    }
  }

  throw new Error(
    `Template ${templateName} not found.\nSearched:\n${possiblePaths.join("\n")}`
  );
}

// ============================================
// FUNCIÓN PARA LLAMAR A OPENAI
// ============================================

async function generateContent(prompt: string): Promise<{ text: string; tokens?: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              }
            ]
          }
        ]
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ OpenAI API Error:", JSON.stringify(error, null, 2));
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    
    let text = "";
    if (data.output && data.output.length > 0) {
      const output = data.output[0];
      if (output.content) {
        if (Array.isArray(output.content)) {
          text = output.content
            .map((block: any) => {
              if (block.text && typeof block.text === "string") return block.text.trim();
              if (block.content && typeof block.content === "string") return block.content.trim();
              if (typeof block === "string") return block.trim();
              return "";
            })
            .filter(Boolean)
            .join("\n");
        } else if (typeof output.content === "string") {
          text = output.content;
        }
      }
    }
    
    if (!text) {
      throw new Error("No content generated from OpenAI");
    }

    return {
      text,
      tokens: data.usage?.total_tokens || undefined,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`OpenAI request timeout after ${OPENAI_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

// ============================================
// PROMPT PARA CV
// ============================================

function getPremiumCVPrompt(data: any, company: Company): string {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const expYears = validateExperienceYears(data.anos_experiencia);
  const expMap: Record<string, string> = {
    sin_experiencia: "entry level",
    menos_1: "less than 1 year",
    "1_2": "1-2 years",
    "3_5": "3-5 years",
    mas_5: "5+ years",
  };
  const expLabel = expMap[expYears] || expYears;

  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const passport = normalizePassport(data.pasaporte_valido);
  const video = normalizeVideo(data.entrevista_video);
  const workPermit = normalizeWorkPermit(data.permiso_trabajo);
  const userExperience = validateWorkExperience(data.experiencia_laboral);
  const city = data.current_city || data.ciudad_actual || "Morocco";
  const country = data.pais_residencia || "Morocco";
  const education = data.estudios || "No formal education";

  return `
You are a senior recruitment consultant. Write a professional, ATS-optimised CV.

📌 RULES:
1. The candidate is from ${city}, ${country} applying for jobs in MALTA.
2. DO NOT invent companies - use only user-provided experience.
3. Use professional British English.
4. Keep content CONCISE - approximately 500-700 words total.
5. Each experience: 3-4 bullet points max.
6. Achievements: 4-5 bullet points max.

CANDIDATE:
- Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Target Company: ${company.name} (Malta)
- Experience: ${expLabel}
- Education: ${education}
- City: ${city}
- Availability: ${availability}
- Passport: ${passport}
- Work Permit: ${workPermit}

${userExperience ? `User Experience: ${userExperience}` : ''}

ATS Keywords: ${template.atsKeywords.join(", ")}

Generate CV with these sections (concise):
1. SUMMARY (4-5 sentences)
2. PROFILE (3-4 sentences)
3. ACHIEVEMENTS (4-5 bullet points)
4. EXPERIENCE (2 positions max, 3-4 bullets each)

Return JSON:
{
  "summary": "...",
  "profile": "...",
  "achievements": ["...", "...", "..."],
  "experience": ["Position 1: bullets", "Position 2: bullets"]
}
`;
}

async function generatePremiumCV(data: any, company: Company): Promise<CVContent> {
  const prompt = getPremiumCVPrompt(data, company);
  const result = await generateContent(prompt);
  
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "",
        profile: parsed.profile || "",
        achievements: parsed.achievements || [],
        experience: parsed.experience || [],
        tokens: result.tokens,
      };
    }
    return {
      summary: result.text,
      profile: "",
      achievements: [],
      experience: [],
      tokens: result.tokens,
    };
  } catch {
    return {
      summary: result.text,
      profile: "",
      achievements: [],
      experience: [],
      tokens: result.tokens,
    };
  }
}

// ============================================
// PROMPT PARA COVER LETTER
// ============================================

async function generatePremiumCoverLetter(data: any, company: Company): Promise<LetterContent> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const license = getDriverLicenseLabel(data.carnet_conducir || "");
  const passport = normalizePassport(data.pasaporte_valido);
  const video = normalizeVideo(data.entrevista_video);
  const workPermit = normalizeWorkPermit(data.permiso_trabajo);
  const userExperience = validateWorkExperience(data.experiencia_laboral);
  const city = data.current_city || data.ciudad_actual || "Morocco";
  const country = data.pais_residencia || "Morocco";

  const prompt = `
You are a professional cover letter writer. Write a concise, professional cover letter.

📌 RULES:
1. Candidate is from ${city}, ${country} applying to work in MALTA.
2. Write ONLY the body paragraphs.
3. DO NOT include: name, address, date, greeting, signature, phone, email.
4. Keep it CONCISE - 3-4 paragraphs, 3-4 sentences each.
5. Never use generic phrases.

CANDIDATE:
- Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Target Company: ${company.name} (Malta)
- Experience: ${data.anos_experiencia || "Entry level"}
- Education: ${data.estudios || "N/A"}
- City: ${city}
- Availability: ${availability}
- Passport: ${passport}
- Work Permit: ${workPermit}

${userExperience ? `User Experience: ${userExperience}` : ''}

Generate cover letter body (3-4 paragraphs):
1. Opening - enthusiasm for role and company
2. Skills and experience relevance
3. Why this company and Malta
4. Availability and closing

Return JSON:
{
  "introduction": "...",
  "body1": "...",
  "body2": "...",
  "body3": "...",
  "closing": "..."
}
`;

  const result = await generateContent(prompt);
  
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        introduction: parsed.introduction || "",
        body1: parsed.body1 || "",
        body2: parsed.body2 || "",
        body3: parsed.body3 || "",
        closing: parsed.closing || "",
        tokens: result.tokens,
      };
    }
    const paragraphs = result.text.split("\n").filter((p: string) => p.trim());
    return {
      introduction: paragraphs[0] || "",
      body1: paragraphs[1] || "",
      body2: paragraphs[2] || "",
      body3: paragraphs[3] || "",
      closing: paragraphs[4] || "",
      tokens: result.tokens,
    };
  } catch {
    const paragraphs = result.text.split("\n").filter((p: string) => p.trim());
    return {
      introduction: paragraphs[0] || "",
      body1: paragraphs[1] || "",
      body2: paragraphs[2] || "",
      body3: paragraphs[3] || "",
      closing: paragraphs[4] || "",
      tokens: result.tokens,
    };
  }
}

// ============================================
// RENDERIZAR HTML → PDF CON PLAYWRIGHT
// ============================================

async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ============================================
// GENERAR HTML DEL CV
// ============================================

function generateCVHtml(
  data: any,
  content: CVContent,
  company: Company
): string {
  let template = readTemplate("premium-cv.html");
  
  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`;

  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const templateData = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const license = getDriverLicenseLabel(data.carnet_conducir || "");
  const passport = normalizePassport(data.pasaporte_valido);
  const video = normalizeVideo(data.entrevista_video);
  const workPermit = normalizeWorkPermit(data.permiso_trabajo);
  const relocate = normalizeRelocate(data.reubicacion);
  const expLabel = getExperienceLabel(validateExperienceYears(data.anos_experiencia));
  const nationality = data.nacionalidad || data.nationality || "Morocco";

  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${fullName}">` 
    : `<span class="initials">${initials}</span>`;

  // --- LANGUAGES ---
  let languagesHtml = "";
  if (data.idiomas) {
    const idiomas = data.idiomas.split(",").map((i: string) => i.trim());
    for (const idioma of idiomas) {
      const idiomaLower = idioma.toLowerCase();
      const columnName = LANGUAGE_COLUMNS[idiomaLower] || `${idiomaLower}_nivel`;
      const nivel = data[columnName] || "";
      const levelKey = String(nivel || "").trim().toLowerCase();
      const percent = LANGUAGE_LEVELS[levelKey] ?? 35;
      const label = LANGUAGE_LABELS[levelKey] ?? "Basic (A1–A2)";
      
      languagesHtml += `
        <div class="lang-item">
          <strong>${idioma}</strong> <span class="level">${label}</span>
          <div class="lang-bar"><span style="width: ${percent}%;"></span></div>
        </div>
      `;
    }
  }
  if (!languagesHtml) {
    languagesHtml = `
      <div class="lang-item">
        <strong>English</strong> <span class="level">Professional</span>
        <div class="lang-bar"><span style="width: 90%;"></span></div>
      </div>
    `;
  }

  // --- KEY STRENGTHS ---
  const keyStrengths = [
    `Immediate Availability: ${availability}`,
    `Willing to Relocate to Malta: ${relocate}`,
    `Team Player`,
    `Flexible Schedule`,
    `Eligible to Work in Malta: ${workPermit}`,
  ];
  const keyStrengthsHtml = keyStrengths.map(h => `<li>${h}</li>`).join("");

  // --- CORE COMPETENCIES ---
  const competencies = templateData.skills || [];
  const coreCompetenciesHtml = competencies.map((comp: string) => {
    return `<span>${comp}</span>`;
  }).join("");

  // --- EXPERIENCE LIST ---
  let experienceHtml = "";
  if (content.experience && content.experience.length > 0) {
    const expItems = content.experience.map((exp: string) => {
      const parts = exp.split(":");
      const title = parts[0] || templateData.title;
      const bullets = parts.slice(1).join(":").trim() || exp;
      
      return `
        <div class="experience-item">
          <div class="exp-header">
            <span class="exp-title">${title}</span>
            <span class="exp-company">${company.name}</span>
            <span class="exp-date">Present</span>
          </div>
          <div class="exp-description">
            <ul>
              ${bullets.split("\n").filter(b => b.trim()).map(b => `<li>${b.trim()}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }).join("");
    experienceHtml = expItems;
  }

  // --- EDUCATION ---
  const educationLabel = getEducationLabel(data.estudios || "");
  const educationHtml = `
    <div class="education-item">
      <div class="edu-header">
        <span class="edu-degree">${educationLabel}</span>
        <span class="edu-institution">Professional Training</span>
        <span class="edu-date">Present</span>
      </div>
    </div>
  `;

  // --- PROFESSIONAL SKILLS ---
  let professionalSkillsHtml = "";
  const skills = templateData.skills || [];
  const skillPercentages: Record<string, number> = {
    "Food Preparation": 90,
    "Kitchen Hygiene": 85,
    "HACCP": 80,
    "Inventory Management": 75,
    "Cleaning & Sanitization": 85,
    "Team Collaboration": 90,
    "Customer Service": 85,
    "Food Safety": 80,
    "Hygiene": 85,
    "Organization": 80,
    "Attention to Detail": 85,
    "Time Management": 80,
    "Reliability": 90,
    "Cleaning": 85,
    "Teamwork": 90,
    "Communication": 85,
    "Safety": 85,
    "Adaptability": 80,
    "Punctuality": 90,
  };
  
  for (const skill of skills) {
    const percentage = skillPercentages[skill] || Math.floor(Math.random() * 30) + 60;
    professionalSkillsHtml += `
      <div class="skill-bar">
        <span class="skill-label">${skill}</span>
        <span class="skill-track">
          <span class="skill-fill" style="width: ${percentage}%;"></span>
        </span>
      </div>
    `;
  }

  // --- TAGLINE & PERSONAL STATEMENT ---
  const tagline = `${templateData.title} professional from ${city || "Morocco"} seeking opportunities in Malta`;
  const personalStatement = content.profile || content.summary || `${templateData.title} professional with ${expLabel} experience.`;

  // --- REPLACEMENTS ---
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": templateData.title,
    "{{TAGLINE}}": tagline,
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{EMAIL}}": data.email || "",
    "{{NATIONALITY}}": nationality,
    "{{LOCATION}}": data.pais_residencia || "Malta",
    "{{LANGUAGES}}": languagesHtml,
    "{{KEY_STRENGTHS}}": keyStrengthsHtml,
    "{{DRIVER_LICENSE}}": license,
    "{{PASSPORT}}": passport,
    "{{WORK_PERMIT}}": workPermit,
    "{{AVAILABILITY}}": availability,
    "{{RELOCATE}}": relocate,
    "{{VIDEO_INTERVIEW}}": video,
    "{{CORE_COMPETENCIES}}": coreCompetenciesHtml,
    "{{EXPERIENCE_LIST}}": experienceHtml,
    "{{EDUCATION_LIST}}": educationHtml,
    "{{PROFESSIONAL_SKILLS}}": professionalSkillsHtml,
    "{{PERSONAL_STATEMENT}}": personalStatement,
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// GENERAR HTML DE LA COVER LETTER
// ============================================

function generateCoverHtml(
  data: any,
  content: LetterContent,
  company: Company
): string {
  let template = readTemplate("premium-cover-letter.html");

  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const templateData = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`;

  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${fullName}">` 
    : `<span class="initials">${initials}</span>`;

  const location = data.pais_residencia || "Malta";
  const nationality = data.nacionalidad || data.nationality || "Morocco";
  const phone = data.whatsapp || "";
  const email = data.email || "";

  const companySection = company.name ? `
    <div class="company">
      <strong>${company.name}</strong><br />
      <div class="department">${company.department || "Human Resources Department"}</div>
      <div class="address-line">${company.address || ""}</div>
    </div>
  ` : "";

  // --- REPLACEMENTS ---
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": templateData.title,
    "{{DATE}}": dateStr,
    "{{COMPANY_SECTION}}": companySection,
    "{{GREETING}}": "Dear Hiring Manager,",
    "{{INTRODUCTION}}": content.introduction || "",
    "{{BODY_1}}": content.body1 || "",
    "{{BODY_2}}": content.body2 || "",
    "{{BODY_3}}": content.body3 || "",
    "{{CLOSING}}": content.closing || "",
    "{{WHATSAPP}}": phone,
    "{{EMAIL}}": email,
    "{{NATIONALITY}}": nationality,
    "{{LOCATION}}": location,
    "{{PHONE}}": phone,
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// SUBIDA A SUPABASE
// ============================================

async function uploadPDF(pdfBytes: Buffer, fileName: string): Promise<string> {
  const { data: bucket, error: bucketError } = await supabase.storage
    .getBucket(BUCKET_NAME);

  if (bucketError || !bucket) {
    throw new Error(`Bucket "${BUCKET_NAME}" not found`);
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// ============================================
// HANDLER PRINCIPAL - CON NOMBRES CORREGIDOS
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { applicationId } = body;

    if (!applicationId) {
      return res.status(400).json({ error: "applicationId is required" });
    }

    console.log(`📄 Generating premium documents for application: ${applicationId}`);

    const { data: application, error: fetchError } = await supabase
      .from("malta_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      console.error("❌ Error fetching application:", fetchError);
      return res.status(404).json({ error: "Application not found" });
    }

    const validatedData = {
      ...application,
      fecha_nacimiento: validateDate(application.fecha_nacimiento),
      anos_experiencia: validateExperienceYears(application.anos_experiencia),
      experiencia_laboral: validateWorkExperience(application.experiencia_laboral),
    };

    console.log(`✅ Application found: ${validatedData.full_name}`);

    if (!application.email) throw new Error("Application has no email");
    if (!application.full_name) throw new Error("Application has no full name");

    if (application.cv_generated && application.letter_generated) {
      console.log("⚠️ Documents already generated");
      return res.status(200).json({
        success: true,
        applicationId,
        cvUrl: application.cv_generado_url,
        letterUrl: application.cover_letter_url,
        alreadyGenerated: true,
      });
    }

    const startTime = Date.now();

    const sector = application.sectores ? application.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
    const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;
    
    if (!template.companies || template.companies.length === 0) {
      throw new Error(`No companies found for sector: ${sector}`);
    }
    
    const selectedCompany = template.companies[Math.floor(Math.random() * template.companies.length)];
    console.log(`🏢 Selected company: ${selectedCompany.name} (${selectedCompany.city})`);

    console.log("🤖 Generating premium CV content...");
    const cvContent = await generatePremiumCV(validatedData, selectedCompany);
    console.log(`✅ CV content generated`);

    console.log("🤖 Generating premium Cover Letter content...");
    const letterContent = await generatePremiumCoverLetter(validatedData, selectedCompany);
    console.log(`✅ Cover Letter content generated`);

    console.log("📄 Generating CV HTML from template...");
    const cvHtml = generateCVHtml(validatedData, cvContent, selectedCompany);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML from template...");
    const coverHtml = generateCoverHtml(validatedData, letterContent, selectedCompany);
    console.log(`✅ Cover Letter HTML generated (${coverHtml.length} chars)`);

    console.log("🖨️ Converting CV HTML to PDF...");
    const cvPdf = await renderPdfFromHtml(cvHtml);
    console.log(`✅ CV PDF generated (${cvPdf.length} bytes)`);

    console.log("🖨️ Converting Cover Letter HTML to PDF...");
    const coverPdf = await renderPdfFromHtml(coverHtml);
    console.log(`✅ Cover Letter PDF generated (${coverPdf.length} bytes)`);

    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    console.log(`📤 Uploading CV PDF...`);
    const cvUrl = await uploadPDF(cvPdf, cvFileName);

    console.log(`📤 Uploading Cover Letter PDF...`);
    const letterUrl = await uploadPDF(coverPdf, letterFileName);

    console.log("✅ Both PDFs uploaded successfully");

    const totalTime = Date.now() - startTime;

    // ✅ NOMBRES CORREGIDOS PARA COINCIDIR CON LA TABLA
    const updateData: any = {
      cv_generated: true,
      letter_generated: true,
      cv_generado_url: cvUrl,          // ✅ CORREGIDO
      cover_letter_url: letterUrl,     // ✅ CORREGIDO
      cv_text: cvContent.summary,
      letter_text: `${letterContent.introduction}\n${letterContent.body1}\n${letterContent.body2}\n${letterContent.body3}\n${letterContent.closing}`,
      cv_html: cvHtml,
      letter_html: coverHtml,
      cv_prompt: "Premium CV prompt - concise version",
      letter_prompt: "Premium cover letter prompt - concise version",
      cv_tokens: cvContent.tokens || 0,
      letter_tokens: letterContent.tokens || 0,
      total_tokens: (cvContent.tokens || 0) + (letterContent.tokens || 0),
      model_used: OPENAI_MODEL,
      generation_time_ms: totalTime,
      documents_generated_at: new Date().toISOString(),
      worker_ready: true,
      worker_status: "ready",
      company_name: selectedCompany.name,
      company_city: selectedCompany.city,
    };

    if (application.photo_url) {
      updateData.photo_uploaded = true;
      updateData.photo_generated_at = new Date().toISOString();
    }

    console.log("📦 updateData:");
    console.log(JSON.stringify(updateData, null, 2));

    const { error: updateError } = await supabase
      .from("malta_applications")
      .update(updateData)
      .eq("id", applicationId);

    if (updateError) {
      console.error("❌ Supabase UPDATE ERROR:", JSON.stringify(updateError, null, 2));
      return res.status(500).json({
        error: updateError.message,
        details: updateError,
      });
    }

    console.log(`✅ Application updated successfully in ${totalTime}ms`);

    console.log("🚀 Adding to worker queue...");
    try {
      const { error: queueError } = await supabase
        .from("worker_queue")
        .insert({
          application_id: applicationId,
          status: "pending",
          priority: 1,
          created_at: new Date().toISOString(),
        });

      if (queueError) {
        console.error("❌ Error adding to worker queue:", queueError);
      } else {
        console.log("✅ Added to worker queue successfully");
      }
    } catch (queueErr) {
      console.error("❌ Worker queue exception:", queueErr);
    }

    return res.status(200).json({
      success: true,
      applicationId,
      cvUrl: cvUrl,
      letterUrl: letterUrl,
      company: selectedCompany.name,
      companyCity: selectedCompany.city,
      cvTokens: cvContent.tokens || 0,
      letterTokens: letterContent.tokens || 0,
      totalTokens: (cvContent.tokens || 0) + (letterContent.tokens || 0),
      generationTimeMs: totalTime,
      photoUsed: !!application.photo_url,
      workerQueued: true,
      message: "Premium documents generated successfully",
    });

  } catch (error: any) {
    console.error("❌ Error in generate-malta-documents:", error);
    
    return res.status(500).json({
      error: "Failed to generate documents",
      details: error.message || "Unknown error",
    });
  }
}
