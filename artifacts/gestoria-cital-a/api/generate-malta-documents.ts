import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

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

interface Company {
  name: string;
  address: string;
  city: string;
  department: string;
}

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
// COMPETENCIAS - ICONOS DINÁMICOS
// ============================================

const COMPETENCY_ICONS: Record<string, string> = {
  "food preparation": "🍽️",
  "kitchen hygiene": "🧼",
  "haccp": "🛡️",
  "haccp standards": "🛡️",
  "inventory management": "📦",
  "cleaning": "🧹",
  "cleaning & sanitization": "🧹",
  "sanitization": "🧴",
  "team collaboration": "👥",
  "teamwork": "👥",
  "customer service": "💬",
  "time management": "⏱️",
  "organization": "📋",
  "safety": "🦺",
  "quality control": "✅",
  "forklift": "🏗️",
  "packing": "📦",
  "driving": "🚗",
  "navigation": "🧭",
  "construction": "🔨",
  "tools": "🔧",
  "aluminium": "🏗️",
  "carpentry": "🪚",
  "production": "🏭",
  "machinery": "⚙️",
  "kitchen equipment": "🍳",
  "food safety": "🥩",
  "attention to detail": "🔍",
  "communication": "💬",
  "reliability": "🤝",
  "precision": "🎯",
  "physical work": "💪",
  "measurement": "📐",
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
// PROMPT PARA CV - SOLO NARRATIVA
// ============================================

function getPremiumCVPrompt(data: any, company: Company): string {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const expYears = validateExperienceYears(data.anos_experiencia);
  const expMap: Record<string, string> = {
    sin_experiencia: "0 years (entry level - highly motivated)",
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

  return `
You are a senior recruitment specialist with 20 years of experience in the Maltese job market.

IMPORTANT: You are writing ONLY the NARRATIVE sections of a CV.
DO NOT write languages, passport, driving licence, availability, work permit, or video interview.
These are already provided by the template from the database.

CANDIDATE PROFILE:
- Full Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Target Company: ${company.name}
- Experience Level: ${expLabel}
- Education: ${data.estudios || "N/A"}
- Languages: (will be added by template, DO NOT write these)
- Driver's License: (will be added by template, DO NOT write these)
- Availability: ${availability} (will be added by template)
- Passport: ${passport} (will be added by template)
- Video Interview: ${video} (will be added by template)
- Work Permit: ${workPermit} (will be added by template)

${userExperience ? `REAL WORK EXPERIENCE PROVIDED BY CANDIDATE:\n${userExperience}\n\nUse this as the foundation for the Professional Experience section.` : ''}

ATS KEYWORDS TO INCLUDE:
${template.atsKeywords.map(k => `- ${k}`).join("\n")}

Generate ONLY these narrative sections:

1. EXECUTIVE SUMMARY (4-5 sentences):
   - Powerful, confident opening
   - Unique value proposition
   - Key strengths and what they offer

2. PROFESSIONAL PROFILE (3-4 sentences):
   - Professional identity
   - Core competencies and expertise

3. KEY ACHIEVEMENTS (3-5 bullet points):
   - Specific, measurable achievements

4. PROFESSIONAL EXPERIENCE (3-4 bullet points):
   ${userExperience ? '- Use the user\'s real experience as the foundation' : '- Write realistic, compelling experience bullets for a junior/entry-level position'}
   - Each bullet is one sentence or phrase

Return as JSON:
{
  "summary": "...",
  "profile": "...",
  "achievements": ["...", "...", "..."],
  "experience": ["...", "...", "..."]
}
`;
}

async function generatePremiumCV(data: any, company: Company): Promise<{
  summary: string;
  profile: string;
  achievements: string[];
  experience: string[];
  tokens?: number;
}> {
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
// PROMPT PARA COVER LETTER - SOLO EL CUERPO
// ============================================

async function generatePremiumCoverLetter(data: any, company: Company): Promise<{
  introduction: string;
  body1: string;
  body2: string;
  body3: string;
  closing: string;
  tokens?: number;
}> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const license = getDriverLicenseLabel(data.carnet_conducir || "");
  const passport = normalizePassport(data.pasaporte_valido);
  const video = normalizeVideo(data.entrevista_video);
  const workPermit = normalizeWorkPermit(data.permiso_trabajo);
  const userExperience = validateWorkExperience(data.experiencia_laboral);

  const prompt = `
You are a professional cover letter writer for the Maltese job market.

IMPORTANT: You are writing ONLY the BODY of a professional cover letter.
DO NOT write applicant name, company name, address, greeting, date, subject, closing signature, phone, email, or placeholders.
DO NOT write languages, passport, driving licence, availability, work permit, or video interview.
These are already provided by the template.

CANDIDATE PROFILE (for context only - DO NOT include these in the letter):
- Target Role: ${template.title}
- Target Company: ${company.name}
- Experience: ${data.anos_experiencia || "Entry level"}
- Education: ${data.estudios || "N/A"}
- Availability: ${availability}
- Passport: ${passport}
- Video Interview: ${video}
- Work Permit: ${workPermit}
- Driver's License: ${license}

${userExperience ? `REAL WORK EXPERIENCE PROVIDED BY CANDIDATE:\n${userExperience}\n\nUse this as the foundation for the body paragraphs.` : ''}

Return ONLY valid JSON in this exact format:
{
  "introduction": "Opening paragraph - hook, mention the position and company",
  "body1": "First body paragraph - relevant experience and skills",
  "body2": "Second body paragraph - why this company and why Malta",
  "body3": "Third body paragraph - availability and next steps",
  "closing": "Final paragraph - call to action and appreciation"
}

Each paragraph must be 2-4 sentences, professional tone, tailored to hospitality in Malta.
Never mention a hotel or company different from ${company.name}.
Never mention the applicant's name, phone, or email.
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
// GENERAR HTML DEL CV - REESCRITO PARA premium-cv.html
// ============================================

function generateCVHtml(
  data: any,
  content: {
    summary: string;
    profile: string;
    achievements: string[];
    experience: string[];
  },
  company: Company
): string {
  let template = readTemplate("premium-cv.html");
  
  // --- Dividir nombre ---
  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";

  // --- Sector ---
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const templateData = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  // --- Normalizar datos ---
  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const license = getDriverLicenseLabel(data.carnet_conducir || "");
  const passport = normalizePassport(data.pasaporte_valido);
  const video = normalizeVideo(data.entrevista_video);
  const workPermit = normalizeWorkPermit(data.permiso_trabajo);
  const relocate = normalizeRelocate(data.reubicacion);
  const expLabel = getExperienceLabel(validateExperienceYears(data.anos_experiencia));

  // --- PHOTO HTML ---
  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${firstName} ${lastName}">` 
    : `<span class="initials">${initials}</span>`;

  // --- LANGUAGES (con barras) ---
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
          <div class="lang-header">
            <span>${idioma}</span>
            <span class="level">${label}</span>
          </div>
          <div class="lang-bar">
            <span style="width: ${percent}%;"></span>
          </div>
        </div>
      `;
    }
  }
  if (!languagesHtml) {
    languagesHtml = `
      <div class="lang-item">
        <div class="lang-header">
          <span>English</span>
          <span class="level">Professional</span>
        </div>
        <div class="lang-bar">
          <span style="width: 90%;"></span>
        </div>
      </div>
    `;
  }

  // --- PROFESSIONAL SKILLS (barras) ---
  const skills = templateData.skills || [];
  const skillsHtml = skills.map((skill: string) => {
    const percent = Math.floor(Math.random() * 20) + 75;
    return `
      <div class="skill-item">
        <div class="skill-name">${skill}</div>
        <div class="skill-bar">
          <span style="width: ${percent}%;"></span>
        </div>
      </div>
    `;
  }).join("");

  // --- PROFILE HIGHLIGHTS (como <li>) ---
  const highlights = [
    `✔ Immediate Availability: ${availability}`,
    `✔ Willing to Relocate: ${relocate}`,
    `✔ Team Player`,
    `✔ Flexible Schedule`,
    `✔ Eligible to Work in Malta: ${workPermit}`,
  ];
  const highlightsHtml = highlights.map(h => `<li>${h}</li>`).join("");

  // --- CERTIFICATES (como <li>) ---
  const certificatesHtml = `
    <li><strong>Passport</strong> ${passport}</li>
    <li><strong>Driving Licence</strong> ${license}</li>
    <li><strong>Work Permit</strong> ${workPermit}</li>
    <li><strong>Interview Video</strong> ${video}</li>
  `;

  // --- COMPETENCIES (como <span>) ---
  const competencies = templateData.skills || [];
  const competenciesHtml = competencies.map((comp: string) => {
    return `<span>${comp}</span>`;
  }).join("");

  // --- EXPERIENCE LIST ---
  let experienceHtml = "";
  if (content.experience && content.experience.length > 0) {
    const expBullets = content.experience.map((exp: string) => `<li>${exp}</li>`).join("");
    experienceHtml = `
      <div class="experience-item">
        <div class="exp-header">
          <span class="exp-title">${templateData.title}</span>
          <span class="exp-company">${company.name}</span>
          <span class="exp-date">Present</span>
        </div>
        <div class="exp-description">
          <ul>${expBullets}</ul>
        </div>
      </div>
    `;
  }

  // --- EDUCATION LIST ---
  const educationLabel = getEducationLabel(data.estudios || "");
  const educationHtml = `
    <div class="education-item">
      <div class="edu-header">
        <span class="edu-degree">${educationLabel}</span>
        <span class="edu-institution">${company.name}</span>
        <span class="edu-date">Present</span>
      </div>
    </div>
  `;

  // --- TAGLINE ---
  const tagline = `${templateData.title} professional with ${expLabel}`;

  // ============================================
  // REEMPLAZAR SOLO LAS VARIABLES QUE EXISTEN EN premium-cv.html
  // ============================================
  const replacements: Record<string, string> = {
    "{{NAME}}": `${firstName} ${lastName}`,
    "{{TITLE}}": templateData.title,
    "{{TAGLINE}}": tagline,
    "{{PHOTO_HTML}}": photoHtml,
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{EMAIL}}": data.email || "",
    "{{NATIONALITY}}": data.nacionalidad || "",
    "{{DRIVER_LICENSE}}": license,
    "{{PROFILE_HIGHLIGHTS}}": highlightsHtml,
    "{{CERTIFICATES}}": certificatesHtml,
    "{{LANGUAGES}}": languagesHtml,
    "{{COMPETENCIES}}": competenciesHtml,
    "{{EXPERIENCE_LIST}}": experienceHtml,
    "{{EDUCATION_LIST}}": educationHtml,
    "{{PASSPORT}}": passport,
    "{{AVAILABILITY}}": availability,
    "{{INTERVIEW_VIDEO}}": video,
    "{{WORK_PERMIT}}": workPermit,
    "{{RELOCATE}}": relocate,
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// GENERAR HTML DE LA COVER LETTER - PLANTILLA PREMIUM V2
// ============================================

function generateCoverHtml(
  data: any,
  content: {
    introduction: string;
    body1: string;
    body2: string;
    body3: string;
    closing: string;
  },
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

  // --- Dividir nombre en First y Last ---
  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";

  // --- PHOTO HTML ---
  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${firstName} ${lastName}">` 
    : `<span class="initials">${initials}</span>`;

  // --- DRIVER LICENSE ---
  const license = getDriverLicenseLabel(data.carnet_conducir || "");

  // --- COMPANY SECTION (opcional) ---
  const companySection = company.name ? `
    <div class="company">
      <strong>${company.name}</strong><br />
      <div class="department">${company.department || "Human Resources Department"}</div>
      <div class="address-line">${company.address || ""}</div>
    </div>
  ` : "";

  // --- SIGNATURE IMAGE (opcional) ---
  const signatureImage = data.signature_image ? `
    <div class="signature-image">
      <img src="${data.signature_image}" alt="Signature">
    </div>
  ` : "";

  // ============================================
  // REEMPLAZAR TODAS LAS VARIABLES
  // ============================================
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FIRST_NAME}}": firstName,
    "{{LAST_NAME}}": lastName,
    "{{TITLE}}": templateData.title,
    "{{EMAIL}}": data.email || "N/A",
    "{{WHATSAPP}}": data.whatsapp || "N/A",
    "{{NATIONALITY}}": data.nacionalidad || "N/A",
    "{{DRIVER_LICENSE}}": license,
    "{{LOCATION}}": data.pais_residencia || "Malta",
    "{{DATE}}": dateStr,
    "{{COMPANY_SECTION}}": companySection,
    "{{GREETING}}": "Dear Hiring Manager,",
    "{{INTRODUCTION}}": content.introduction || "",
    "{{BODY_1}}": content.body1 || "",
    "{{BODY_2}}": content.body2 || "",
    "{{BODY_3}}": content.body3 || "",
    "{{CLOSING}}": content.closing || "",
    "{{SIGNATURE_IMAGE}}": signatureImage,
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
// HANDLER PRINCIPAL
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

    // ✅ VALIDAR Y CORREGIR DATOS DE ENTRADA
    const validatedData = {
      ...application,
      fecha_nacimiento: validateDate(application.fecha_nacimiento),
      anos_experiencia: validateExperienceYears(application.anos_experiencia),
      experiencia_laboral: validateWorkExperience(application.experiencia_laboral),
    };

    if (validatedData.fecha_nacimiento === null && application.fecha_nacimiento) {
      console.warn(`⚠️ Invalid birthdate corrected: ${application.fecha_nacimiento} -> NULL`);
    }

    console.log(`✅ Application found: ${validatedData.full_name}`);
    console.log(`📅 Validated birthdate: ${validatedData.fecha_nacimiento || 'NULL'}`);
    console.log(`📊 Validated experience: ${validatedData.anos_experiencia}`);
    console.log(`💼 Work experience: ${validatedData.experiencia_laboral ? 'Present' : 'Empty'}`);

    if (!application.email) throw new Error("Application has no email");
    if (!application.full_name) throw new Error("Application has no full name");

    if (application.cv_generated && application.letter_generated) {
      console.log("⚠️ Documents already generated");
      return res.status(200).json({
        success: true,
        applicationId,
        cvUrl: application.cv_url,
        letterUrl: application.letter_url,
        alreadyGenerated: true,
      });
    }

    const startTime = Date.now();

    // 1. Seleccionar empresa UNA SOLA VEZ
    const sector = application.sectores ? application.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
    const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;
    
    if (!template.companies || template.companies.length === 0) {
      throw new Error(`No companies found for sector: ${sector}`);
    }
    
    const selectedCompany = template.companies[Math.floor(Math.random() * template.companies.length)];
    console.log(`🏢 Selected company: ${selectedCompany.name} (${selectedCompany.city})`);

    // 2. Generar contenido CV (solo narrativa)
    console.log("🤖 Generating premium CV content...");
    const cvContent = await generatePremiumCV(validatedData, selectedCompany);
    console.log(`✅ CV content generated`);

    // 3. Generar contenido Cover Letter (solo cuerpo)
    console.log("🤖 Generating premium Cover Letter content...");
    const letterContent = await generatePremiumCoverLetter(validatedData, selectedCompany);
    console.log(`✅ Cover Letter content generated`);

    // 4. Generar HTML desde plantillas
    console.log("📄 Generating CV HTML from template...");
    const cvHtml = generateCVHtml(validatedData, cvContent, selectedCompany);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML from template...");
    const coverHtml = generateCoverHtml(validatedData, letterContent, selectedCompany);
    console.log(`✅ Cover Letter HTML generated (${coverHtml.length} chars)`);

    // 5. Convertir HTML → PDF con Playwright
    console.log("🖨️ Converting CV HTML to PDF...");
    const cvPdf = await renderPdfFromHtml(cvHtml);
    console.log(`✅ CV PDF generated (${cvPdf.length} bytes)`);

    console.log("🖨️ Converting Cover Letter HTML to PDF...");
    const coverPdf = await renderPdfFromHtml(coverHtml);
    console.log(`✅ Cover Letter PDF generated (${coverPdf.length} bytes)`);

    // 6. Subir a Supabase
    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    console.log(`📤 Uploading CV PDF...`);
    const cvUrl = await uploadPDF(cvPdf, cvFileName);

    console.log(`📤 Uploading Cover Letter PDF...`);
    const letterUrl = await uploadPDF(coverPdf, letterFileName);

    console.log("✅ Both PDFs uploaded successfully");

    const totalTime = Date.now() - startTime;

    // 7. Actualizar Supabase
    const updateData: any = {
      cv_generated: true,
      letter_generated: true,
      cv_url: cvUrl,
      letter_url: letterUrl,
      cv_text: cvContent.summary,
      letter_text: `${letterContent.introduction}\n${letterContent.body1}\n${letterContent.body2}\n${letterContent.body3}\n${letterContent.closing}`,
      cv_html: cvHtml,
      letter_html: coverHtml,
      cv_prompt: "Premium CV prompt - narrative only",
      letter_prompt: "Premium cover letter prompt - JSON body only",
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

    const { error: updateError } = await supabase
      .from("malta_applications")
      .update(updateData)
      .eq("id", applicationId);

    if (updateError) {
      console.error("❌ Error updating application:", updateError);
      return res.status(500).json({ 
        error: "Failed to update application",
        details: updateError.message 
      });
    }

    console.log(`✅ Application updated successfully in ${totalTime}ms`);

    // 8. Añadir a la cola del worker
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
      cvUrl,
      letterUrl,
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
