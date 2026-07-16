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

const OPENAI_MODEL = "gpt-4o";
const BUCKET_NAME = "malta-documents";
const OPENAI_TIMEOUT_MS = 120000;

// ============================================
// EMPRESAS REALES DE MARRUECOS - SIN DUPLICADOS
// ============================================
const MOROCCAN_COMPANIES: Record<string, any[]> = {
  kitchen: [
    { name: "Restaurant La Sqala", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Al Fassia", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Riad", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant La Mamounia", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant Dar Yacout", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant Le Bistrot", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Villa Blanca", city: "Rabat", type: "Restaurant" },
    { name: "Restaurant Le Dhow", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant La Table du Palais", city: "Fes", type: "Restaurant" },
    { name: "Restaurant Nur", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Jardin", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant La Maison Arabe", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant Café du Port", city: "Tangier", type: "Restaurant" },
    { name: "Restaurant Le Mirage", city: "Agadir", type: "Restaurant" },
    { name: "Restaurant Le Palais", city: "Fes", type: "Restaurant" },
    { name: "Restaurant La Tour Hassan", city: "Rabat", type: "Restaurant" },
    { name: "Restaurant Le Soleil", city: "Agadir", type: "Restaurant" },
    { name: "Restaurant La Plage", city: "Tangier", type: "Restaurant" },
    { name: "Restaurant Le Médina", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant La Perle", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Marocain", city: "Rabat", type: "Restaurant" },
    { name: "Restaurant La Gazelle", city: "Agadir", type: "Restaurant" },
    { name: "Restaurant Le Palmier", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant La Rose", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Jardin Secret", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant La Sultana", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Cèdre", city: "Fes", type: "Restaurant" },
    { name: "Restaurant La Terrasse", city: "Tangier", type: "Restaurant" },
    { name: "Restaurant Le Patio", city: "Rabat", type: "Restaurant" },
    { name: "Restaurant La Fontaine", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant Le Château", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant La Palmeraie", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant Le Mazagan", city: "El Jadida", type: "Restaurant" },
    { name: "Restaurant La Corniche", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Mogador", city: "Essaouira", type: "Restaurant" },
    { name: "Restaurant La Falaise", city: "Tangier", type: "Restaurant" },
    { name: "Restaurant Le Riadh", city: "Fes", type: "Restaurant" },
    { name: "Restaurant Le Tadelakt", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant La Méditerranée", city: "Tangier", type: "Restaurant" },
    { name: "Restaurant Le Panorama", city: "Agadir", type: "Restaurant" },
    { name: "Restaurant La Belle Vue", city: "Casablanca", type: "Restaurant" },
    { name: "Restaurant Le Mas", city: "Rabat", type: "Restaurant" },
    { name: "Restaurant La Campagne", city: "Marrakech", type: "Restaurant" },
    { name: "Restaurant Le Village", city: "Fes", type: "Restaurant" },
  ],
  hotel: [
    { name: "Hotel Kenzi Tower", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Sofitel Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Movenpick Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Hyatt Regency Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel La Mamounia", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Sofitel Marrakech", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Royal Mansour", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Hilton Tangier", city: "Tangier", type: "Hotel" },
    { name: "Hotel Movenpick Tangier", city: "Tangier", type: "Hotel" },
    { name: "Hotel Sofitel Rabat", city: "Rabat", type: "Hotel" },
    { name: "Hotel Hilton Rabat", city: "Rabat", type: "Hotel" },
    { name: "Hotel La Tour Hassan", city: "Rabat", type: "Hotel" },
    { name: "Hotel Palais Medina", city: "Fes", type: "Hotel" },
    { name: "Hotel Sofitel Agadir", city: "Agadir", type: "Hotel" },
    { name: "Hotel Hilton Agadir", city: "Agadir", type: "Hotel" },
    { name: "Hotel Barceló Tanger", city: "Tangier", type: "Hotel" },
    { name: "Hotel Farah Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Atlas Medina", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Ibis Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Marriott Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Sheraton Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Radisson Blu Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Four Seasons Casablanca", city: "Casablanca", type: "Hotel" },
    { name: "Hotel Riad Fes", city: "Fes", type: "Hotel" },
    { name: "Hotel Dar El Kebira", city: "Fes", type: "Hotel" },
    { name: "Hotel Riad Laaroussa", city: "Fes", type: "Hotel" },
    { name: "Hotel Le Jardin des Douars", city: "Essaouira", type: "Hotel" },
    { name: "Hotel Heure Bleue Palais", city: "Essaouira", type: "Hotel" },
    { name: "Hotel Sofitel Essaouira", city: "Essaouira", type: "Hotel" },
    { name: "Hotel Kenzi Club Agadir", city: "Agadir", type: "Hotel" },
    { name: "Hotel Riu Tikida Agadir", city: "Agadir", type: "Hotel" },
    { name: "Hotel Iberostar Founty Beach", city: "Agadir", type: "Hotel" },
    { name: "Hotel Kenzi Menara", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Riu Palace Tikida", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Iberostar Club Palmeraie", city: "Marrakech", type: "Hotel" },
    { name: "Hotel Hilton Taghazout", city: "Agadir", type: "Hotel" },
    { name: "Hotel Hyatt Tangier", city: "Tangier", type: "Hotel" },
    { name: "Hotel Fairmont Tangier", city: "Tangier", type: "Hotel" },
    { name: "Hotel Four Seasons Rabat", city: "Rabat", type: "Hotel" },
    { name: "Hotel Sofitel Rabat Jardin", city: "Rabat", type: "Hotel" },
  ],
  construction: [
    { name: "TGCC Group", city: "Casablanca", type: "Construction" },
    { name: "RMA Groupe", city: "Casablanca", type: "Construction" },
    { name: "OCP Group", city: "Casablanca", type: "Construction" },
    { name: "Groupe Addoha", city: "Casablanca", type: "Construction" },
    { name: "Groupe Alliances", city: "Casablanca", type: "Construction" },
    { name: "Groupe Bouygues Maroc", city: "Casablanca", type: "Construction" },
    { name: "Groupe Vinci Maroc", city: "Casablanca", type: "Construction" },
    { name: "Groupe GTM Maroc", city: "Casablanca", type: "Construction" },
    { name: "Groupe SGTM", city: "Casablanca", type: "Construction" },
    { name: "Groupe SOMAGEC", city: "Casablanca", type: "Construction" },
  ],
  warehouse: [
    { name: "DB Schenker Morocco", city: "Casablanca", type: "Warehouse" },
    { name: "Kuehne + Nagel Morocco", city: "Casablanca", type: "Warehouse" },
    { name: "DHL Global Forwarding", city: "Casablanca", type: "Warehouse" },
    { name: "CEVA Logistics", city: "Casablanca", type: "Warehouse" },
    { name: "Maersk Morocco", city: "Casablanca", type: "Warehouse" },
    { name: "CMA CGM Morocco", city: "Casablanca", type: "Warehouse" },
    { name: "Panalpina Morocco", city: "Casablanca", type: "Warehouse" },
    { name: "SDV Morocco", city: "Casablanca", type: "Warehouse" },
    { name: "Tanger Med", city: "Tangier", type: "Warehouse" },
  ],
  delivery: [
    { name: "DHL Express Morocco", city: "Casablanca", type: "Delivery" },
    { name: "UPS Morocco", city: "Casablanca", type: "Delivery" },
    { name: "FedEx Morocco", city: "Casablanca", type: "Delivery" },
    { name: "Glovo Morocco", city: "Casablanca", type: "Delivery" },
    { name: "Jumia Food Morocco", city: "Casablanca", type: "Delivery" },
    { name: "Delivery Logistics", city: "Rabat", type: "Delivery" },
  ],
  cleaning: [
    { name: "Cleanco Services", city: "Casablanca", type: "Cleaning" },
    { name: "Diamond Cleaning", city: "Casablanca", type: "Cleaning" },
    { name: "Royal Cleaning Services", city: "Rabat", type: "Cleaning" },
    { name: "Green Clean Morocco", city: "Marrakech", type: "Cleaning" },
    { name: "Eco Cleaning Services", city: "Agadir", type: "Cleaning" },
    { name: "ProClean Services", city: "Tangier", type: "Cleaning" },
    { name: "Atlantic Cleaning", city: "Casablanca", type: "Cleaning" },
  ],
  factory: [
    { name: "ST Microelectronics", city: "Casablanca", type: "Factory" },
    { name: "Renault Maroc", city: "Tangier", type: "Factory" },
    { name: "PSA Maroc", city: "Kenitra", type: "Factory" },
    { name: "Holcim Maroc", city: "Casablanca", type: "Factory" },
    { name: "LafargeHolcim Maroc", city: "Casablanca", type: "Factory" },
    { name: "Managem Group", city: "Casablanca", type: "Factory" },
    { name: "Nestlé Maroc", city: "Casablanca", type: "Factory" },
    { name: "Danone Maroc", city: "Casablanca", type: "Factory" },
    { name: "Peugeot Citroën", city: "Kenitra", type: "Factory" },
    { name: "Siemens Morocco", city: "Casablanca", type: "Factory" },
    { name: "ABB Morocco", city: "Casablanca", type: "Factory" },
    { name: "Schneider Electric", city: "Casablanca", type: "Factory" },
    { name: "Procter & Gamble", city: "Casablanca", type: "Factory" },
    { name: "Unilever Morocco", city: "Casablanca", type: "Factory" },
    { name: "Coca-Cola Morocco", city: "Casablanca", type: "Factory" },
    { name: "PepsiCo Morocco", city: "Casablanca", type: "Factory" },
    { name: "Heineken Morocco", city: "Casablanca", type: "Factory" },
    { name: "Castel Morocco", city: "Casablanca", type: "Factory" },
  ],
};

// ============================================
// CERTIFICADOS POR SECTOR
// ============================================
const CERTIFICATES_BY_SECTOR: Record<string, string[]> = {
  kitchen: [
    "Food Safety Level 2",
    "HACCP Awareness",
    "Manual Handling",
    "Health & Safety",
    "Kitchen Hygiene",
    "Allergen Awareness"
  ],
  hotel: [
    "Housekeeping Standards",
    "Customer Service",
    "Health & Safety",
    "Manual Handling",
    "Hygiene & Sanitation"
  ],
  construction: [
    "CSCS Card",
    "Manual Handling",
    "Health & Safety",
    "Working at Height",
    "First Aid"
  ],
  warehouse: [
    "Forklift Awareness",
    "Manual Handling",
    "Health & Safety",
    "Warehouse Safety",
    "First Aid"
  ],
  delivery: [
    "Defensive Driving",
    "Manual Handling",
    "Health & Safety",
    "Customer Service",
    "Fleet Safety"
  ],
  cleaning: [
    "Health & Safety",
    "Manual Handling",
    "Cleaning Standards",
    "Hygiene & Sanitation",
    "COSHH Awareness"
  ],
  factory: [
    "Health & Safety",
    "Manual Handling",
    "Machine Safety",
    "Quality Control",
    "First Aid"
  ],
  default: [
    "Health & Safety",
    "Manual Handling",
    "First Aid",
    "Teamwork Skills"
  ]
};

// ============================================
// TÍTULOS DE PUESTO POR SECTOR
// ============================================
const JOB_TITLES: Record<string, string[]> = {
  kitchen: [
    "Kitchen Assistant", "Kitchen Porter", "Food Preparation Assistant",
    "Commis Chef", "Kitchen Helper", "Kitchen Steward",
    "Line Cook", "Prep Cook", "Culinary Assistant"
  ],
  hotel: [
    "Housekeeping Attendant", "Room Attendant", "Housekeeping Assistant",
    "Hotel Cleaner", "Guest Room Attendant", "Housekeeping Porter"
  ],
  construction: [
    "Construction Worker", "Building Labourer", "Site Assistant",
    "Construction Labourer", "General Worker", "Building Operative"
  ],
  warehouse: [
    "Warehouse Operative", "Warehouse Assistant", "Logistics Assistant",
    "Stock Controller", "Warehouse Worker", "Distribution Assistant"
  ],
  delivery: [
    "Delivery Driver", "Courier", "Logistics Driver",
    "Delivery Assistant", "Transport Assistant", "Courier Driver"
  ],
  cleaning: [
    "Cleaner", "Housekeeper", "Cleaning Assistant",
    "Sanitation Worker", "Janitor", "Cleaning Operative"
  ],
  factory: [
    "Factory Operative", "Production Assistant", "Assembly Worker",
    "Machine Operator", "Production Worker", "Factory Worker"
  ],
};

// ============================================
// CIUDADES DE MARRUECOS
// ============================================
const MOROCCAN_CITIES = [
  "Casablanca", "Rabat", "Marrakech", "Agadir", "Tangier",
  "Fes", "Meknes", "Oujda", "Nador", "Tetouan",
  "Kenitra", "Safi", "El Jadida", "Beni Mellal", "Taza",
  "Settat", "Khouribga", "Khemisset", "Temara", "Mohammedia",
  "Chefchaouen", "Essaouira", "Taroudant", "Ouarzazate", "Tiznit"
];

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Fechas según experiencia
function getDateRangeByExperience(experience: string): { start: string; end: string } {
  const months = ["January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"];
  
  const endMonth = getRandomItem(months);
  const endYear = "2025";
  
  let startYear: number;
  const expLower = experience.toLowerCase();
  
  if (expLower.includes("no experience") || expLower.includes("0") || expLower.includes("entry")) {
    startYear = 2024;
  } else if (expLower.includes("1") || expLower.includes("less than")) {
    startYear = 2023;
  } else if (expLower.includes("2") || expLower.includes("1-2")) {
    startYear = 2023;
  } else if (expLower.includes("3") || expLower.includes("3-5")) {
    startYear = 2021;
  } else if (expLower.includes("5") || expLower.includes("5+")) {
    startYear = 2018;
  } else {
    startYear = 2022;
  }
  
  const variation = Math.random() > 0.7 ? 1 : 0;
  startYear = startYear - variation;
  
  const startMonth = getRandomItem(months);
  
  return {
    start: `${startMonth} ${startYear}`,
    end: `${endMonth} ${endYear}`
  };
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Niveles de idioma CEFR
function getLanguageLevel(level: string): string {
  const map: Record<string, string> = {
    native: "Native",
    fluent: "C2",
    advanced: "C1",
    intermediate: "B2",
    basic: "A2",
    beginner: "A1",
    nativo: "Native",
    fluido: "C2",
    avanzado: "C1",
    intermedio: "B2",
    básico: "A2",
    principiante: "A1"
  };
  return map[level.toLowerCase()] || "B1";
}

// ============================================
// GENERAR CV CON IA
// ============================================

async function generatePremiumCV(data: any, hasUserCV: boolean): Promise<{
  summary: string;
  coreCompetencies: string[];
  experience: any[];
  skills: string[];
  softSkills: string[];
  technicalSkills: string[];
  education: string;
  certificates: string[];
  personalStatement: string;
  jobTitle: string;
  company: any;
  city: string;
  tokens?: number;
}> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const companies = MOROCCAN_COMPANIES[sector] || MOROCCAN_COMPANIES.kitchen;
  
  const selectedCompanies = getRandomItems(companies, Math.min(3, companies.length));
  const selectedCompany = getRandomItem(selectedCompanies);
  
  const selectedCity = data.current_city || getRandomItem(MOROCCAN_CITIES);
  
  const titles = JOB_TITLES[sector] || JOB_TITLES.kitchen;
  const jobTitle = getRandomItem(titles);
  
  const añosExperiencia = data.anos_experiencia || "3-5 years";
  const expLabel = añosExperiencia.replace(/_/g, " ");

  // Certificados predefinidos por sector
  const availableCertificates = CERTIFICATES_BY_SECTOR[sector] || CERTIFICATES_BY_SECTOR.default;
  const selectedCertificates = getRandomItems(availableCertificates, Math.min(3, availableCertificates.length));

  const prompt = `
You are one of the world's best ATS CV writers for jobs in Malta.

Your mission is to create an EXTREMELY PROFESSIONAL European CV.

IMPORTANT RULES:

- Every CV MUST be UNIQUE.
- Never repeat the same text.
- Never use generic AI phrases.
- Never use "Volunteer Experience".
- Never use "Community Kitchen".
- Never invent impossible experience.
- Never write fake awards.
- Never repeat the same company.
- Never create more than TWO jobs.
- Maximum one A4 page.
- Write natural British English.
- ATS Optimized.

- The CV must look like it was written by an experienced HR recruiter.
- Every section must be concise.
- Never write long paragraphs.
- Use professional business English.
- The design template already exists.
- You ONLY generate the content.
- Do NOT mention that you are an AI.
- Avoid generic phrases.
- Everything must fit perfectly into ONE page.

- Never use the same company twice.
- Every generated CV must use different companies.
- Avoid repeating companies already used in previous jobs.

- Never repeat sentences.
- Every bullet point must be unique.
- Every CV must look handwritten by a different recruiter.

- Write exactly like a senior HR recruiter.
- Avoid robotic wording.
- Use natural British English.
- The reader must believe this CV was written by a professional recruitment agency.
- Every CV must feel personal.
- Never generate identical summaries.
- Never generate identical personal statements.
- Never repeat competencies between different candidates.

- Never remove important information.
- Preserve employment dates.
- Preserve company names.
- Only improve formatting, wording and ATS optimisation.
- Keep the candidate's original career history.

- Never create experience longer than 24 months unless the uploaded CV already contains it.
- Keep employment history realistic.
- Avoid employment gaps unless they already exist.
- Make the career progression believable.

- Every responsibility, skill and achievement must match the selected profession exactly. Never include duties from another industry.

=====================
CANDIDATE
=====================

Name:
${data.full_name}

Nationality:
${data.nationality}

Current city:
${selectedCity}

Target Position:
${jobTitle}

Sector:
${sector}

Education Level:
${data.education_level}

Languages:
${data.idiomas}

Experience Level:
${expLabel}

Driver Licence:
${data.carnet_conducir}

Has uploaded CV:
${hasUserCV}

=====================
IF USER HAS A CV
=====================

If the user uploaded a CV:

- Keep their REAL experience.
- Improve grammar.
- Improve wording.
- Improve ATS score.
- Never invent companies.
- Never invent dates.
- Never invent positions.
- Never remove important information.
- Preserve employment dates.
- Preserve company names.
- Only improve formatting, wording and ATS optimisation.
- Keep the candidate's original career history.

=====================
IF USER HAS NO CV
=====================

Create realistic professional work history.

Generate EXACTLY 2 jobs.

Each job must contain:

- Real Moroccan company
- Real Moroccan city
- Job title
- Employment dates
- Exactly 4 bullet points

Every bullet must be less than 18 words.

Use action verbs.

Never repeat verbs.

Do not create management positions for inexperienced workers.

The experience must match the selected profession.

- Never create experience longer than 24 months unless the uploaded CV already contains it.
- Keep employment history realistic.
- Avoid employment gaps unless they already exist.
- Make the career progression believable.

=====================
SUMMARY
=====================

Write ONE professional summary.

Maximum 4 lines.

=====================
CORE COMPETENCIES
=====================

Generate EXACTLY 6 competencies.

=====================
PROFESSIONAL SKILLS
=====================

Generate EXACTLY 6 technical skills.

=====================
SOFT SKILLS
=====================

Generate EXACTLY 5 soft skills.

=====================
CERTIFICATES
=====================

Generate ONLY these certificates (choose from the list provided):

${selectedCertificates.join(", ")}

Do not add any other certificates.

=====================
EDUCATION
=====================

Return ONLY the education title.

Examples:

Primary Education
Secondary Education
High School Diploma
Vocational Diploma
Bachelor Degree

Never explain the education.

=====================
PERSONAL STATEMENT
=====================

Maximum 3 lines.

Professional.

Positive.

Ready to relocate to Malta.

=====================
OUTPUT
=====================

Return ONLY JSON.

{
  "summary":"",
  "coreCompetencies":[],
  "experience":[
    {
      "company":"",
      "city":"",
      "jobTitle":"",
      "period":"",
      "bullets":[]
    }
  ],
  "skills":[],
  "softSkills":[],
  "technicalSkills":[],
  "education":"",
  "certificates":[],
  "personalStatement":""
}

Never overflow the HTML template.

Keep every section short enough to fit perfectly inside the CV design.

If needed, shorten sentences automatically.`;

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
      throw new Error("OpenAI API error");
    }

    const result = await response.json();
    
    let text = "";
    if (result.output && result.output.length > 0) {
      const output = result.output[0];
      if (output.content) {
        if (Array.isArray(output.content)) {
          text = output.content
            .map((block: any) => block.text || "")
            .filter(Boolean)
            .join("\n");
        } else if (typeof output.content === "string") {
          text = output.content;
        }
      }
    }
    
    if (!text) {
      throw new Error("No content generated");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      const dateRange = getDateRangeByExperience(expLabel);
      
      let experienceData = parsed.experience || [];
      if (!Array.isArray(experienceData)) {
        experienceData = [];
      }
      
      // ✅ CAMBIO 3: Fechas forzadas - la IA no puede inventar
      experienceData = experienceData.map((exp: any) => ({
        company: exp.company || selectedCompany.name,
        city: exp.city || selectedCity,
        jobTitle: exp.jobTitle || jobTitle,
        period: `${dateRange.start} - ${dateRange.end}`,
        bullets: Array.isArray(exp.bullets) ? exp.bullets.slice(0, 4) : ["Prepared ingredients and assisted chefs", "Maintained high standards of cleanliness"]
      }));
      
      if (experienceData.length > 2) {
        experienceData = experienceData.slice(0, 2);
      }
      
      const educationTitle = parsed.education || data.education_level || "Secondary Education";
      const cleanEducation = educationTitle.split(".")[0].split(",")[0].trim();
      
      // ✅ CAMBIO 2: Forzar certificados seleccionados
      return {
        summary: parsed.summary || "",
        coreCompetencies: parsed.coreCompetencies || [],
        experience: experienceData,
        skills: parsed.skills || [],
        softSkills: parsed.softSkills || [],
        technicalSkills: parsed.technicalSkills || [],
        education: cleanEducation,
        certificates: selectedCertificates,
        personalStatement: parsed.personalStatement || "",
        jobTitle: jobTitle,
        company: selectedCompany,
        city: selectedCity,
        tokens: result.usage?.total_tokens || 0,
      };
    }

    return {
      summary: text,
      coreCompetencies: [],
      experience: [],
      skills: [],
      softSkills: [],
      technicalSkills: [],
      education: data.education_level || "Secondary Education",
      certificates: selectedCertificates,
      personalStatement: "",
      jobTitle: jobTitle,
      company: selectedCompany,
      city: selectedCity,
      tokens: result.usage?.total_tokens || 0,
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
// GENERAR CARTA CON IA
// ============================================

async function generatePremiumCoverLetter(data: any, company: any, jobTitle: string): Promise<{
  introduction: string;
  body1: string;
  body2: string;
  body3: string;
  closing: string;
  tokens?: number;
}> {
  const prompt = `
You are a professional cover letter writer for the European job market.

RULES:

- Maximum 300 words.
- British English.
- Sound like a human.
- Mention the company name.
- Mention Malta.
- Mention relocation.
- Mention teamwork.
- Mention motivation.
- Never sound generated by AI.
- Never repeat sentences.
- End with a professional call to action.

CANDIDATE INFORMATION:
- Name: ${data.full_name || "Candidate"}
- Position: ${jobTitle}
- Target Company: ${company.name} (${company.city}, Morocco)
- Experience: ${data.anos_experiencia || "3-5 years"}
- Nationality: ${data.nationality || "Moroccan"}
- Current City: ${data.current_city || "Casablanca"}
- Education: ${data.education_level || "Secondary Education"}
- Languages: ${data.idiomas || "English, Arabic, French"}

Generate a professional cover letter body (ONLY the body, NO greetings, NO signature, NO addresses) as JSON:

{
  "introduction": "Opening paragraph - hook the reader, mention the position and company",
  "body1": "First body - relevant experience and skills specific to ${company.name}",
  "body2": "Second body - why you want to work at ${company.name} and why Malta",
  "body3": "Third body - availability to relocate to Malta immediately and next steps",
  "closing": "Final paragraph - call to action, appreciation"
}

Each paragraph should be 2-4 sentences. Professional British English tone.
Be specific about the company and position. Sound human, not AI-generated.
Make it unique for this candidate.
`;

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
      throw new Error("OpenAI API error");
    }

    const result = await response.json();
    
    let text = "";
    if (result.output && result.output.length > 0) {
      const output = result.output[0];
      if (output.content) {
        if (Array.isArray(output.content)) {
          text = output.content
            .map((block: any) => block.text || "")
            .filter(Boolean)
            .join("\n");
        } else if (typeof output.content === "string") {
          text = output.content;
        }
      }
    }
    
    if (!text) {
      throw new Error("No content generated");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        introduction: parsed.introduction || "",
        body1: parsed.body1 || "",
        body2: parsed.body2 || "",
        body3: parsed.body3 || "",
        closing: parsed.closing || "",
        tokens: result.usage?.total_tokens || 0,
      };
    }

    return {
      introduction: text,
      body1: "",
      body2: "",
      body3: "",
      closing: "",
      tokens: result.usage?.total_tokens || 0,
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
// GENERAR HTML DEL CV
// ============================================

function generateCVHtml(data: any, content: any, company: any, city: string): string {
  let template = readTemplate("premium-cv.html");
  
  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`;

  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${fullName}">` 
    : `<span class="initials">${initials}</span>`;

  // Idiomas con niveles CEFR
  let languagesHtml = "";
  const idiomas = data.idiomas ? data.idiomas.split(",").map((i: string) => i.trim()) : ["English"];
  const levels: Record<string, string> = {
    english: "C2",
    arabic: "Native",
    french: "C1",
    spanish: "B2",
    italian: "B1",
    german: "A2",
    portuguese: "B1"
  };
  
  const order = { Native: 6, C2: 5, C1: 4, B2: 3, B1: 2, A2: 1, A1: 0 };
  const sortedIdiomas = idiomas.sort((a, b) => {
    const levelA = levels[a.toLowerCase()] || "B1";
    const levelB = levels[b.toLowerCase()] || "B1";
    return (order[levelA as keyof typeof order] || 0) - (order[levelB as keyof typeof order] || 0);
  }).reverse();

  for (const idioma of sortedIdiomas) {
    const level = levels[idioma.toLowerCase()] || "B1";
    languagesHtml += `
      <div class="lang-item">
        <span class="lang-name">${idioma}</span>
        <span class="lang-dots">................</span>
        <span class="lang-level">${level}</span>
      </div>
    `;
  }

  let experienceHtml = "";
  const experiences = content.experience || [];
  
  for (let i = 0; i < Math.min(experiences.length, 2); i++) {
    const exp = experiences[i];
    const bullets = exp.bullets || [];
    const bulletsHtml = bullets.map((b: string) => `<li>${b}</li>`).join("");
    
    experienceHtml += `
      <div class="experience-item">
        <div class="exp-title">${exp.jobTitle || content.jobTitle || "Professional"}</div>
        <div class="exp-company">${exp.company || company.name}</div>
        <div class="exp-description">
          <ul>
            ${bulletsHtml}
          </ul>
        </div>
      </div>
    `;
  }

  const educationHtml = `
    <div class="education-item">
      <div class="edu-degree">${content.education || data.education_level || "Secondary Education"}</div>
    </div>
  `;

  const competencies = content.coreCompetencies || [];
  const competenciesHtml = competencies.map((comp: string) => 
    `<span>${comp}</span>`
  ).join("");

  const keyStrengths = [
    "Strong work ethic",
    "Team player",
    "Fast learner",
    "Attention to detail",
    "Reliable and punctual",
    "Able to work under pressure"
  ];
  const keyStrengthsHtml = keyStrengths.map(s => `<li>${s}</li>`).join("");

  const skills = content.skills || [];
  const skillPercentages: Record<string, number> = {
    "Food Preparation": 90,
    "Kitchen Hygiene": 85,
    "HACCP Standards": 80,
    "Inventory Management": 75,
    "Cleaning & Sanitization": 85,
    "Teamwork": 90,
    "Knife Skills": 80,
    "Stock Management": 75,
    "Safety Protocols": 85,
    "Customer Service": 80,
    "Communication": 85,
    "Problem Solving": 80,
    "Time Management": 85,
    "Organization": 80,
    "Reliability": 90
  };
  
  const skillsToShow = skills.slice(0, 6);
  let professionalSkillsHtml = "";
  
  const midPoint = Math.ceil(skillsToShow.length / 2);
  const leftSkills = skillsToShow.slice(0, midPoint);
  const rightSkills = skillsToShow.slice(midPoint);
  
  const renderSkillBar = (skill: string) => {
    const percentage = skillPercentages[skill] || Math.floor(Math.random() * 30) + 60;
    return `
      <div class="skill-bar">
        <span class="skill-label">${skill}</span>
        <span class="skill-track">
          <span class="skill-fill" style="width: ${percentage}%;"></span>
        </span>
      </div>
    `;
  };
  
  const allSkillsHtml = [...leftSkills, ...rightSkills].map(renderSkillBar).join("");

  const personalStatement = content.personalStatement || `I am enthusiastic about joining a professional team where I can contribute positively, learn continuously, and grow within the industry. I am available to start immediately and ready to relocate.`;

  const passport = data.pasaporte_valido ? "Available" : "Not available";
  const availability = "Immediate";
  const workPermit = data.permiso_trabajo ? "Eligible" : "Not available";
  const relocate = "Yes";

  const tagline = `Dedicated and motivated ${content.jobTitle || "professional"} with a strong passion for the hospitality industry. Eager to contribute to a dynamic team.`;

  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": content.jobTitle || "Professional",
    "{{TAGLINE}}": tagline,
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{EMAIL}}": data.email || "",
    "{{NATIONALITY}}": data.nationality || "Moroccan",
    "{{DRIVER_LICENSE}}": data.carnet_conducir || "Category B",
    "{{LANGUAGES}}": languagesHtml,
    "{{KEY_STRENGTHS}}": keyStrengthsHtml,
    "{{PASSPORT}}": passport,
    "{{AVAILABILITY}}": availability,
    "{{WORK_PERMIT}}": workPermit,
    "{{RELOCATE}}": relocate,
    "{{CORE_COMPETENCIES}}": competenciesHtml,
    "{{EXPERIENCE_LIST}}": experienceHtml,
    "{{EDUCATION_LIST}}": educationHtml,
    "{{PROFESSIONAL_SKILLS}}": allSkillsHtml,
    "{{PERSONAL_STATEMENT}}": personalStatement,
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// GENERAR HTML DE LA CARTA
// ============================================

function generateCoverHtml(data: any, content: any, company: any, city: string, jobTitle: string): string {
  let template = readTemplate("premium-cover-letter.html");

  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${fullName}">` 
    : `<span class="initials">${initials}</span>`;

  const companySection = `
    <div class="company">
      <div class="department">Human Resources Department</div>
      <div class="address-line">${company.name}</div>
      <div class="address-line">${company.city}, Morocco</div>
    </div>
  `;

  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": jobTitle,
    "{{EMAIL}}": data.email || "",
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{NATIONALITY}}": data.nationality || "Moroccan",
    "{{DATE}}": dateStr,
    "{{COMPANY_SECTION}}": companySection,
    "{{GREETING}}": "Dear Hiring Manager,",
    "{{INTRODUCTION}}": content.introduction || "",
    "{{BODY_1}}": content.body1 || "",
    "{{BODY_2}}": content.body2 || "",
    "{{BODY_3}}": content.body3 || "",
    "{{CLOSING}}": content.closing || "",
    "{{SIGNATURE_IMAGE}}": "",
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// LEER PLANTILLA HTML
// ============================================

function readTemplate(templateName: string): string {
  const possiblePaths = [
    path.join(process.cwd(), "templates", templateName),
    path.join(process.cwd(), "artifacts", "gestoria-cital-a", "templates", templateName),
  ];

  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath)) {
      console.log("✅ Template found:", templatePath);
      return fs.readFileSync(templatePath, "utf8");
    }
  }

  throw new Error(`Template ${templateName} not found`);
}

// ============================================
// RENDERIZAR PDF
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
// SUBIR PDF A SUPABASE
// ============================================

async function uploadPDF(pdfBytes: Buffer, fileName: string): Promise<string> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    console.log(`✅ Application found: ${application.full_name}`);
    console.log(`📸 photo_url: ${application.photo_url || "No photo"}`);

    const hasUserCV = !!application.cv_url && application.cv_url.trim() !== "";
    console.log(`📋 Has user CV: ${hasUserCV}`);

    console.log("🤖 Generating premium CV...");
    const cvContent = await generatePremiumCV(application, hasUserCV);
    console.log(`✅ CV generated with ${cvContent.tokens || 0} tokens`);
    console.log(`   Job Title: ${cvContent.jobTitle}`);
    console.log(`   Company: ${cvContent.company.name} (${cvContent.company.city})`);

    console.log("🤖 Generating premium cover letter...");
    const letterContent = await generatePremiumCoverLetter(application, cvContent.company, cvContent.jobTitle);
    console.log(`✅ Cover letter generated with ${letterContent.tokens || 0} tokens`);

    console.log("📄 Generating CV HTML...");
    const cvHtml = generateCVHtml(application, cvContent, cvContent.company, cvContent.city);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML...");
    const coverHtml = generateCoverHtml(application, letterContent, cvContent.company, cvContent.city, cvContent.jobTitle);
    console.log(`✅ Cover Letter HTML generated (${coverHtml.length} chars)`);

    console.log("🖨️ Converting CV to PDF...");
    const cvPdf = await renderPdfFromHtml(cvHtml);
    console.log(`✅ CV PDF generated (${cvPdf.length} bytes)`);

    console.log("🖨️ Converting Cover Letter to PDF...");
    const coverPdf = await renderPdfFromHtml(coverHtml);
    console.log(`✅ Cover Letter PDF generated (${coverPdf.length} bytes)`);

    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    console.log("📤 Uploading CV PDF...");
    const cvUrl = await uploadPDF(cvPdf, cvFileName);

    console.log("📤 Uploading Cover Letter PDF...");
    const letterUrl = await uploadPDF(coverPdf, letterFileName);

    console.log("✅ Both PDFs uploaded successfully");

    const fullLetterText = `${letterContent.introduction}\n\n${letterContent.body1}\n\n${letterContent.body2}\n\n${letterContent.body3}\n\n${letterContent.closing}`;
    const totalTokens = (cvContent.tokens || 0) + (letterContent.tokens || 0);
    
    const updateData: any = {
      cv_generated: true,
      letter_generated: true,
      cv_url: cvUrl,
      letter_url: letterUrl,
      cv_text: cvContent.summary,
      letter_text: fullLetterText,
      cv_html: cvHtml,
      letter_html: coverHtml,
      cv_tokens: cvContent.tokens || 0,
      letter_tokens: letterContent.tokens || 0,
      total_tokens: totalTokens,
      model_used: OPENAI_MODEL,
      generation_time_ms: Date.now(),
      documents_generated_at: new Date().toISOString(),
      worker_ready: true,
      worker_status: "ready",
      company_name: cvContent.company.name,
      company_city: cvContent.company.city,
      
      ai_summary: cvContent.summary,
      ai_experience: cvContent.experience || [],
      ai_skills: cvContent.skills || [],
      ai_languages: application.idiomas ? application.idiomas.split(",").map((i: string) => i.trim()) : [],
      ai_cover_letter: fullLetterText,
      ai_job_title: cvContent.jobTitle,
      ai_core_competencies: cvContent.coreCompetencies || [],
      ai_soft_skills: cvContent.softSkills || [],
      ai_technical_skills: cvContent.technicalSkills || [],
      ai_certificates: cvContent.certificates || [],
      ai_education: cvContent.education || application.education_level || "",
      ai_personal_statement: cvContent.personalStatement || "",
      
      original_cv_url: application.cv_url || "",
      has_user_cv: hasUserCV,
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
      return res.status(500).json({ error: "Failed to update application" });
    }

    console.log(`✅ Application updated successfully`);

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
      company: cvContent.company.name,
      companyCity: cvContent.company.city,
      jobTitle: cvContent.jobTitle,
      hasUserCV: hasUserCV,
      photoUsed: !!application.photo_url,
      cvTokens: cvContent.tokens || 0,
      letterTokens: letterContent.tokens || 0,
      totalTokens: totalTokens,
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
