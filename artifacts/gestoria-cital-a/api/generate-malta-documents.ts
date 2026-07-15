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
    skills: ["Food Preparation", "Kitchen Hygiene", "HACCP", "Inventory Management"],
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
    skills: ["Cleaning", "Organization", "Customer Service", "Attention to Detail"],
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
    skills: ["Customer Service", "Food Safety", "Hygiene", "Team Collaboration"],
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
    skills: ["Cleaning", "Hygiene", "Organization", "Attention to Detail"],
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
    skills: ["Inventory Management", "Forklift", "Packing", "Safety"],
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
    skills: ["Driving", "Navigation", "Time Management", "Customer Service"],
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
    skills: ["Construction", "Safety", "Tools", "Team Work"],
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
    skills: ["Aluminium Work", "Carpentry", "Tools", "Quality Control"],
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
    skills: ["Production", "Quality Control", "Machinery", "Safety"],
    companies: [
      { name: "ST Microelectronics", address: "Kirkop, Malta", city: "Kirkop", department: "Human Resources" },
      { name: "Malta Enterprise", address: "Gwardamangia, Malta", city: "Gwardamangia", department: "Recruitment Team" },
      { name: "Venture Global", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources Department" },
      { name: "Mizzi Group", address: "Mriehel, Malta", city: "Mriehel", department: "Human Resources" },
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
// VALIDACIONES DE DATOS - CORREGIDO
// ============================================

function validateDate(dateValue: string | null): string | null {
  if (!dateValue) return null;
  
  // Limpiar caracteres extraños
  const cleaned = dateValue.replace(/[^0-9\-]/g, '');
  
  // Intentar parsear
  const parts = cleaned.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  // Validar rango razonable (1900-2010 para fechas de nacimiento)
  if (year < 1900 || year > 2010) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  // Validar fecha real
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
  
  // Intentar mapear valores comunes
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
// FUNCIONES DE UTILIDAD - DATOS DE SUPABASE
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

function normalizePassport(value: string): string {
  if (!value) return "Not available";
  const normalized = value.toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Available";
  }
  return "Not available";
}

function normalizeVideo(value: string): string {
  if (!value) return "Not available";
  const normalized = value.toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Available";
  }
  return "Not available";
}

function normalizeWorkPermit(value: string): string {
  if (!value) return "Not available";
  const normalized = value.toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Eligible";
  }
  if (normalized === "en tramite" || normalized === "en_trámite" || normalized === "in_process") {
    return "In process";
  }
  return "Not eligible";
}

function normalizeRelocate(value: string): string {
  if (!value) return "Yes";
  const normalized = value.toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  return "No";
}

// ============================================
// CONSTRUIR DATOS PARA LA PLANTILLA DESDE SUPABASE
// ============================================

function buildCVDataFromSupabase(data: any, company: Company): {
  // Datos personales
  name: string;
  title: string;
  whatsapp: string;
  email: string;
  nationality: string;
  driverLicense: string;
  passport: string;
  availability: string;
  video: string;
  workPermit: string;
  relocate: string;
  photoHtml: string;
  
  // Idiomas - DETECCIÓN AUTOMÁTICA
  languagesHtml: string;
  
  // Profile Highlights
  profileHighlightsHtml: string;
  
  // Certificates
  certificatesHtml: string;
  
  // Información adicional para la grid
  infoGridHtml: string;
  
  // Competencias desde el sector
  competenciesHtml: string;
  
  // Tagline / Summary
  tagline: string;
} {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const initials = getInitials(data.full_name);
  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const license = getDriverLicenseLabel(data.carnet_conducir || "");
  const passport = normalizePassport(data.pasaporte_valido);
  const video = normalizeVideo(data.entrevista_video);
  const workPermit = normalizeWorkPermit(data.permiso_trabajo);
  const relocate = normalizeRelocate(data.reubicacion);

  // --- IDIOMAS - DETECCIÓN AUTOMÁTICA ---
  // No necesitamos un mapa fijo. Detectamos automáticamente las columnas.
  let languagesHtml = "";
  if (data.idiomas) {
    const idiomas = data.idiomas.split(",").map((i: string) => i.trim());
    for (const idioma of idiomas) {
      // Intentar con el nombre exacto (normalizado)
      const cleanIdioma = idioma.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
        .replace(/[^a-z]/g, ''); // Solo letras
      
      // Buscar en el objeto data cualquier columna que termine en "_nivel" y contenga el idioma
      let nivel = "";
      for (const [key, value] of Object.entries(data)) {
        if (key.endsWith('_nivel')) {
          const keyClean = key.replace('_nivel', '').toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          if (keyClean === cleanIdioma) {
            nivel = value as string || "";
            break;
          }
        }
      }
      
      const levelLabel = getLanguageLevel(nivel);
      languagesHtml += `
        <div class="lang-item">
          <strong>${idioma}</strong> <span class="level">${levelLabel}</span>
        </div>
      `;
    }
  }

  // Si no hay idiomas, usar un valor por defecto
  if (!languagesHtml) {
    languagesHtml = `
      <div class="lang-item">
        <strong>English</strong> <span class="level">Professional</span>
      </div>
    `;
  }

  // --- PROFILE HIGHLIGHTS ---
  const highlights = [
    `✔ Immediate Availability: ${availability}`,
    `✔ Willing to Relocate: ${relocate}`,
    `✔ Team Player`,
    `✔ Flexible Schedule`,
    `✔ Eligible to Work in Malta: ${workPermit}`,
  ];
  const profileHighlightsHtml = highlights.map(h => `<li>${h}</li>`).join("");

  // --- CERTIFICATES ---
  const certificates = [
    `<li><strong>Passport</strong> ${passport}</li>`,
    `<li><strong>Driving Licence</strong> ${license}</li>`,
    `<li><strong>Work Permit</strong> ${workPermit}</li>`,
    `<li><strong>Interview Video</strong> ${video}</li>`,
  ];
  const certificatesHtml = certificates.join("");

  // --- INFO GRID ---
  const infoGridHtml = `
    <div class="info-item"><strong>Passport</strong> ${passport}</div>
    <div class="info-item"><strong>Driving Licence</strong> ${license}</div>
    <div class="info-item"><strong>Availability</strong> <span class="status-available">${availability}</span></div>
    <div class="info-item"><strong>Interview Video</strong> ${video}</div>
    <div class="info-item"><strong>Work Permit</strong> ${workPermit}</div>
    <div class="info-item"><strong>Willing to Relocate</strong> ${relocate}</div>
  `;

  // --- COMPETENCIAS ---
  let competenciesHtml = "";
  for (const skill of template.skills) {
    competenciesHtml += `<span>${skill}</span>`;
  }

  // --- FOTO ---
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="Photo">` 
    : `<span class="initials">${initials}</span>`;

  // --- TAGLINE ---
  const expLabel = getExperienceLabel(validateExperienceYears(data.anos_experiencia));
  const tagline = `${template.title} professional with ${expLabel}`;

  return {
    name: data.full_name || "Candidate",
    title: template.title,
    whatsapp: data.whatsapp || "N/A",
    email: data.email || "N/A",
    nationality: data.nacionalidad || "N/A",
    driverLicense: license,
    passport: passport,
    availability: availability,
    video: video,
    workPermit: workPermit,
    relocate: relocate,
    photoHtml: photoHtml,
    languagesHtml: languagesHtml,
    profileHighlightsHtml: profileHighlightsHtml,
    certificatesHtml: certificatesHtml,
    infoGridHtml: infoGridHtml,
    competenciesHtml: competenciesHtml,
    tagline: tagline,
  };
}

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
  
  // Experiencia laboral real del usuario (si existe)
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
// GENERAR HTML DEL CV - PLANTILLA PREMIUM
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
  
  // Construir datos desde Supabase
  const cvData = buildCVDataFromSupabase(data, company);
  
  // Construir Achievements
  let achievementsHtml = "";
  for (const ach of content.achievements) {
    achievementsHtml += `<li>${ach}</li>`;
  }
  
  // Construir Experience - GPT solo provee los bullets, HTML controla la estructura
  let experienceHtml = "";
  if (content.experience && content.experience.length > 0) {
    const expBullets = content.experience.map(exp => `<li>${exp}</li>`).join("");
    experienceHtml = `
      <div class="experience-item">
        <div class="exp-header">
          <span class="exp-title">${cvData.title}</span>
          <span class="exp-company">${company.name}</span>
        </div>
        <div class="exp-description">
          <ul>
            ${expBullets}
          </ul>
        </div>
      </div>
    `;
  }
  
  // Construir Education
  const educationLabel = getEducationLabel(data.estudios || "");
  const educationHtml = `
    <div class="education-item">
      <div class="edu-header">
        <span class="edu-degree">${educationLabel}</span>
        <span class="edu-institution">${content.profile || "Professional Training"}</span>
      </div>
    </div>
  `;

  // Reemplazar variables en la plantilla
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": cvData.photoHtml,
    "{{NAME}}": cvData.name,
    "{{TITLE}}": cvData.title,
    "{{WHATSAPP}}": cvData.whatsapp,
    "{{EMAIL}}": cvData.email,
    "{{NATIONALITY}}": cvData.nationality,
    "{{DRIVER_LICENSE}}": cvData.driverLicense,
    "{{PROFILE_HIGHLIGHTS}}": cvData.profileHighlightsHtml,
    "{{CERTIFICATES}}": cvData.certificatesHtml,
    "{{LANGUAGES}}": cvData.languagesHtml,
    "{{COMPETENCIES}}": cvData.competenciesHtml,
    "{{EXPERIENCE_LIST}}": experienceHtml,
    "{{EDUCATION_LIST}}": educationHtml,
    "{{PASSPORT}}": cvData.passport,
    "{{AVAILABILITY}}": cvData.availability,
    "{{INTERVIEW_VIDEO}}": cvData.video,
    "{{WORK_PERMIT}}": cvData.workPermit,
    "{{RELOCATE}}": cvData.relocate,
    "{{TAGLINE}}": cvData.tagline,
    "{{COMPANY}}": company.name,
    "{{COMPANY_CITY}}": company.city,
    "{{DEPARTMENT}}": company.department,
    "{{COMPANY_ADDRESS}}": company.address,
    "{{PROFILE}}": content.profile || "",
    "{{ACHIEVEMENTS}}": achievementsHtml,
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// GENERAR HTML DE LA COVER LETTER - PLANTILLA PREMIUM
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

  // Fecha actual formateada
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Saludo FIJO - más profesional y consistente
  const greeting = "Dear Hiring Manager,";

  // Datos desde Supabase
  const cvData = buildCVDataFromSupabase(data, company);

  // Reemplazar variables en la plantilla
  const replacements: Record<string, string> = {
    "{{NAME}}": cvData.name,
    "{{TITLE}}": templateData.title,
    "{{EMAIL}}": cvData.email,
    "{{WHATSAPP}}": cvData.whatsapp,
    "{{NATIONALITY}}": cvData.nationality,
    "{{DRIVER_LICENSE}}": cvData.driverLicense,
    "{{DATE}}": dateStr,
    "{{COMPANY}}": company.name,
    "{{COMPANY_ADDRESS}}": company.address,
    "{{COMPANY_CITY}}": company.city,
    "{{DEPARTMENT}}": company.department,
    "{{GREETING}}": greeting,
    "{{INTRODUCTION}}": content.introduction || "",
    "{{BODY_1}}": content.body1 || "",
    "{{BODY_2}}": content.body2 || "",
    "{{BODY_3}}": content.body3 || "",
    "{{CLOSING}}": content.closing || "",
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

    // Si la fecha de nacimiento es inválida, la ponemos a NULL
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
