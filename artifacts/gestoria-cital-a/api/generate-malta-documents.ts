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
  city: string;
  type: string;
}

interface Experience {
  company: string;
  city: string;
  jobTitle: string;
  period: string;
  bullets: string[];
}

interface CVContent {
  summary: string;
  coreCompetencies: string[];
  experience: Experience[];
  skills: string[];
  softSkills: string[];
  technicalSkills: string[];
  education: string;
  certificates: string[];
  personalStatement: string;
  jobTitle: string;
  company: Company;
  city: string;
  tokens: number;
}

interface LetterContent {
  introduction: string;
  body1: string;
  body2: string;
  body3: string;
  closing: string;
  tokens: number;
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

const OPENAI_MODEL = "gpt-4o";
const BUCKET_NAME = "malta-documents";
const OPENAI_TIMEOUT_MS = 60000;
const MAX_PAGE_HEIGHT_PX = 1120;

// ============================================
// EMPRESAS REALES DE MARRUECOS
// ============================================
const MOROCCAN_COMPANIES: Record<string, Company[]> = {
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
// FUNCIÓN DE REINTENTO CON RETROCESO EXPONENCIAL
// ============================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = "operation"
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`⚠️ ${context} attempt ${attempt + 1} failed: ${lastError.message}`);
        console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`${context} failed after ${maxRetries + 1} attempts`);
}

// ============================================
// FUNCIÓN DE PARSE CON REINTENTO - LLAMADA REAL A OPENAI
// ============================================

async function callOpenAIWithRetry(
  prompt: string,
  maxRetries: number = 2,
  context: string = "OpenAI"
): Promise<{ text: string; tokens: number }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
      
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
        throw new Error(`OpenAI API Error: ${JSON.stringify(error)}`);
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
        throw new Error("No content generated from OpenAI");
      }
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in OpenAI response");
      }
      
      return {
        text: text,
        tokens: result.usage?.total_tokens || 0,
      };
      
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = 1500 * Math.pow(2, attempt);
        console.warn(`⚠️ ${context} attempt ${attempt + 1} failed: ${error.message}`);
        console.log(`🔄 Retrying OpenAI in ${delay}ms... (attempt ${attempt + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`${context} failed after ${maxRetries + 1} attempts`);
}

// ============================================
// ✅ GENERAR CV CON IA - CON FILTRO POR CIUDAD
// ============================================

async function generatePremiumCV(data: any, hasUserCV: boolean): Promise<CVContent> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const companies = MOROCCAN_COMPANIES[sector] || MOROCCAN_COMPANIES.kitchen;
  
  // ✅ FILTRAR EMPRESAS POR CIUDAD DEL CLIENTE
  const userCity = data.current_city && data.current_city.trim() !== "" 
    ? data.current_city 
    : getRandomItem(MOROCCAN_CITIES);
  
  // Filtrar empresas que coinciden con la ciudad del cliente
  let filteredCompanies = companies.filter(c => c.city === userCity);
  
  // Si no hay empresas en esa ciudad, usar todas las empresas del sector
  if (filteredCompanies.length === 0) {
    console.log(`⚠️ No hay empresas en ${userCity}, usando todas las empresas del sector`);
    filteredCompanies = companies;
  }
  
  const selectedCompanies = getRandomItems(filteredCompanies, Math.min(3, filteredCompanies.length));
  const selectedCompany = getRandomItem(selectedCompanies);
  
  const titles = JOB_TITLES[sector] || JOB_TITLES.kitchen;
  
  const jobTitle = data.preferred_position && data.preferred_position.trim() !== ""
    ? data.preferred_position
    : getRandomItem(titles);
  
  const añosExperiencia = data.anos_experiencia || "3-5 years";
  const expLabel = añosExperiencia.replace(/_/g, " ");

  const availableCertificates = CERTIFICATES_BY_SECTOR[sector] || CERTIFICATES_BY_SECTOR.default;
  const selectedCertificates = getRandomItems(availableCertificates, Math.min(4, availableCertificates.length));

  // ✅ PROMPT MEJORADO - CON CIUDAD REAL
  const prompt = `
You are a professional CV writer for the European job market, specialized in Malta.

Generate a COMPLETE, DETAILED European CV that fills the ENTIRE A4 page.

CRITICAL REQUIREMENTS:
- The CV must look FULL and PROFESSIONAL, not empty
- Every section must have enough content to fill the page
- The sidebar must be FULL (languages, key strengths, additional info)

IMPORTANT - REALISM:
- The candidate is from ${userCity}, Morocco
- ALL companies in the experience section MUST be from ${userCity}
- Use REAL Moroccan restaurant names in ${userCity}
- Example if ${userCity} is Casablanca: "Restaurant La Sqala", "Restaurant Al Fassia", "Le Bistrot", etc.

RULES:
- Exactly 2 jobs
- Exactly 6 bullet points per job
- Every bullet must be 12-18 words, specific and detailed
- 6 core competencies
- 8 professional skills with proper names
- 8 key strengths (soft skills)
- 4 certificates
- Education must be realistic and well described
- Passport is always Available
- NEVER mention Work Permit
- Availability is Immediate
- Relocation: "Available to relocate to Malta"

Candidate:
Name: ${data.full_name}
Nationality: ${data.nationality}
Current city: ${userCity}
Target Position: ${jobTitle}
Sector: ${sector}
Education Level: ${data.education_level}
Languages: ${data.idiomas}
Experience Level: ${expLabel}
Driver Licence: ${data.carnet_conducir}
Has uploaded CV: ${hasUserCV}

${hasUserCV ? "KEEP THEIR REAL EXPERIENCE. IMPROVE grammar and wording. ADD MORE DETAIL to their existing experience. NEVER invent companies or dates." : `CREATE realistic professional work history. Generate EXACTLY 2 jobs with Real Moroccan companies located in ${userCity}, City: ${userCity}, Job title, Employment dates, EXACTLY 6 bullet points per job.`}

Output ONLY JSON:
{
  "summary": "A professional summary of 4-5 sentences",
  "coreCompetencies": ["Comp1", "Comp2", "Comp3", "Comp4", "Comp5", "Comp6"],
  "experience": [
    {
      "company": "Real company name from ${userCity}",
      "city": "${userCity}",
      "jobTitle": "Job title",
      "period": "Month Year - Month Year",
      "bullets": [
        "Detailed bullet 1 (12-18 words)",
        "Detailed bullet 2 (12-18 words)",
        "Detailed bullet 3 (12-18 words)",
        "Detailed bullet 4 (12-18 words)",
        "Detailed bullet 5 (12-18 words)",
        "Detailed bullet 6 (12-18 words)"
      ]
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5", "Skill6", "Skill7", "Skill8"],
  "softSkills": ["Strength1", "Strength2", "Strength3", "Strength4", "Strength5", "Strength6", "Strength7", "Strength8"],
  "technicalSkills": ["Tech1", "Tech2", "Tech3", "Tech4", "Tech5", "Tech6"],
  "education": "Education title only",
  "certificates": ["Cert1", "Cert2", "Cert3", "Cert4"],
  "personalStatement": "A personal statement of 3-4 sentences"
}
`;

  try {
    const result = await callOpenAIWithRetry(prompt, 2, "OpenAI CV generation");
    
    const parsed = JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    
    const dateRange = getDateRangeByExperience(expLabel);
    
    let experienceData: Experience[] = [];
    const rawExperience = parsed.experience || [];
    if (Array.isArray(rawExperience)) {
      experienceData = rawExperience.map((exp: any) => {
        if (hasUserCV) {
          return {
            company: exp.company || "",
            city: exp.city || userCity,
            jobTitle: exp.jobTitle || jobTitle,
            period: exp.period || "",
            bullets: Array.isArray(exp.bullets) ? exp.bullets.slice(0, 6) : []
          };
        }
        
        return {
          company: exp.company || selectedCompany.name,
          city: exp.city || userCity,
          jobTitle: exp.jobTitle || jobTitle,
          period: exp.period || `${dateRange.start} - ${dateRange.end}`,
          bullets: Array.isArray(exp.bullets) ? exp.bullets.slice(0, 6) : [
            `Prepared ingredients and assisted chefs in daily kitchen operations at ${selectedCompany.name}`,
            `Maintained high standards of cleanliness and hygiene at all workstations in ${userCity}`,
            "Collaborated with team members to ensure timely food service during peak hours",
            "Managed inventory and ensured proper storage of all food items and supplies",
            "Followed all HACCP and food safety protocols to maintain quality standards",
            "Supported senior chefs with food preparation and plating for special events"
          ]
        };
      });
    }
    
    if (experienceData.length > 2) {
      experienceData = experienceData.slice(0, 2);
    }
    
    let educationTitle = parsed.education || data.education_level || "Secondary Education";
    if (educationTitle.toLowerCase().includes("no formal") || educationTitle.toLowerCase().includes("no education")) {
      educationTitle = "Secondary Education";
    }
    const cleanEducation = educationTitle.split(".")[0].split(",")[0].trim();
    
    // Asegurar 6 bullet points por trabajo
    experienceData = experienceData.map((exp: Experience) => {
      const bullets = exp.bullets || [];
      while (bullets.length < 6) {
        bullets.push(`Performed additional kitchen duties as assigned by the head chef at ${exp.company}`);
      }
      return {
        ...exp,
        bullets: bullets.slice(0, 6)
      };
    });
    
    // Asegurar 8 softSkills
    let softSkills = Array.isArray(parsed.softSkills) ? parsed.softSkills : [];
    const defaultSoftSkills = [
      "Strong Work Ethic", "Team Collaboration", "Fast Learning Ability",
      "Attention to Detail", "Reliability and Punctuality", "Stress Management",
      "Effective Communication", "Adaptability and Flexibility"
    ];
    while (softSkills.length < 8) {
      softSkills.push(defaultSoftSkills[softSkills.length % defaultSoftSkills.length]);
    }
    softSkills = softSkills.slice(0, 8);
    
    // Asegurar 8 skills
    let skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    const defaultSkills = [
      "Food Preparation", "Kitchen Hygiene", "Inventory Management",
      "Cleaning and Sanitization", "Knife Skills", "Food Safety",
      "Teamwork", "Time Management"
    ];
    while (skills.length < 8) {
      skills.push(defaultSkills[skills.length % defaultSkills.length]);
    }
    skills = skills.slice(0, 8);
    
    // Asegurar 4 certificates
    let certificates = Array.isArray(parsed.certificates) ? parsed.certificates : selectedCertificates;
    while (certificates.length < 4) {
      certificates.push("Health and Safety Awareness");
    }
    certificates = certificates.slice(0, 4);
    
    let summary = parsed.summary || "";
    if (summary.length < 50) {
      summary = `Dedicated and motivated ${jobTitle} with ${expLabel} of experience in the hospitality industry in ${userCity}. Proven ability to maintain high standards of cleanliness and food safety. Strong team player with excellent communication skills and a commitment to delivering quality results.`;
    }
    
    let personalStatement = parsed.personalStatement || "";
    if (personalStatement.length < 30) {
      personalStatement = `I am enthusiastic about joining a professional culinary team where I can contribute positively and grow within the industry. I am available to start immediately and ready to relocate to Malta.`;
    }
    
    const coreCompetencies = Array.isArray(parsed.coreCompetencies) ? parsed.coreCompetencies : [];
    const technicalSkills = Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills : [];
    
    return {
      summary,
      coreCompetencies,
      experience: experienceData,
      skills,
      softSkills,
      technicalSkills,
      education: cleanEducation,
      certificates,
      personalStatement,
      jobTitle,
      company: selectedCompany,
      city: userCity,
      tokens: result.tokens || 0,
    };

  } catch (error: any) {
    console.error("❌ Error generating CV after retries:", error);
    throw error;
  }
}

// ============================================
// ✅ GENERAR CARTA CON IA - MEJORADA Y PROFESIONAL
// ============================================

async function generatePremiumCoverLetter(data: any, company: Company, jobTitle: string): Promise<LetterContent> {
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

CANDIDATE:
Name: ${data.full_name || "Candidate"}
Position: ${jobTitle}
Company: ${company.name || "Hilton Malta"} (${company.city || "Malta"})
Experience: ${data.anos_experiencia || "3-5 years"}
Nationality: ${data.nationality || "Moroccan"}
Current City: ${data.current_city || "Casablanca"}
Education: ${data.education_level || "Secondary Education"}
Languages: ${data.idiomas || "English, Arabic, French"}

Generate a professional cover letter body as JSON:
{
  "introduction": "Opening paragraph - hook the reader, mention the position and company",
  "body1": "First body - relevant experience and skills specific to the company",
  "body2": "Second body - why you want to work at this company and why Malta",
  "body3": "Third body - availability to relocate to Malta immediately and next steps",
  "closing": "Final paragraph - call to action, appreciation"
}

Each paragraph should be 2-4 sentences. Professional British English tone.
Be specific about the company and position. Sound human, not AI-generated.
Make it unique for this candidate.
`;

  try {
    const result = await callOpenAIWithRetry(prompt, 2, "OpenAI Cover Letter generation");
    
    const parsed = JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    
    return {
      introduction: parsed.introduction || "",
      body1: parsed.body1 || "",
      body2: parsed.body2 || "",
      body3: parsed.body3 || "",
      closing: parsed.closing || "",
      tokens: result.tokens || 0,
    };

  } catch (error: any) {
    console.error("❌ Error generating cover letter after retries:", error);
    throw error;
  }
}

// ============================================
// GENERAR HTML DEL CV - SIN CAMBIOS
// ============================================

function generateCVHtml(data: any, content: CVContent): string {
  let template = readTemplate("premium-cv.html");
  
  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`;

  // ✅ FOTO
  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${fullName}">` 
    : `<span class="initials">${initials}</span>`;

  const location = data.current_city
    ? `${data.current_city}, ${data.nationality || "Morocco"}`
    : data.nationality || "Morocco";

  // LANGUAGES
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
  const sortedIdiomas = [...idiomas].sort((a, b) => {
    const levelA = levels[a.toLowerCase()] || "B1";
    const levelB = levels[b.toLowerCase()] || "B1";
    return (order[levelA as keyof typeof order] || 0) - (order[levelB as keyof typeof order] || 0);
  }).reverse();

  for (const idioma of sortedIdiomas) {
    const level = levels[idioma.toLowerCase()] || "B1";
    languagesHtml += `
      <div class="lang-item">
        <strong>${idioma}</strong> - <span class="level">${level}</span>
      </div>
    `;
  }

  // EXPERIENCE
  let experienceHtml = "";
  const experiences = content.experience || [];
  
  for (let i = 0; i < Math.min(experiences.length, 2); i++) {
    const exp = experiences[i];
    const bullets = exp.bullets || [];
    const bulletsHtml = bullets.map((b: string) => `<li>${b}</li>`).join("");
    
    experienceHtml += `
      <div class="experience-item">
        <div class="exp-title">${exp.jobTitle || content.jobTitle || "Professional"}</div>
        <div class="exp-company">${exp.company || ""}</div>
        <div class="exp-description">
          <ul>
            ${bulletsHtml}
          </ul>
        </div>
      </div>
    `;
  }

  // EDUCATION
  const educationHtml = `
    <div class="education-item">
      <div class="edu-degree">${content.education || data.education_level || "Secondary Education"}</div>
    </div>
  `;

  // CORE COMPETENCIES
  const competencies = content.coreCompetencies || [];
  const competenciesHtml = competencies.map((comp: string) => 
    `<span>${comp}</span>`
  ).join("");

  // KEY STRENGTHS
  const keyStrengths = content.softSkills && content.softSkills.length > 0
    ? content.softSkills
    : [
        "Strong work ethic",
        "Team player",
        "Fast learner",
        "Attention to detail",
        "Reliable and punctual",
        "Able to work under pressure"
      ];
  const keyStrengthsHtml = keyStrengths.map((s: string) => `<li>${s}</li>`).join("");

  // PROFESSIONAL SKILLS
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

  // PERSONAL STATEMENT
  const personalStatement = content.personalStatement || "I am enthusiastic about joining a professional team where I can contribute positively, learn continuously, and grow within the industry. I am available to start immediately and ready to relocate.";

  const tagline = `Dedicated and motivated ${content.jobTitle || "professional"} with a strong passion for the hospitality industry. Eager to contribute to a dynamic team.`;

  const hasDrivingLicense = data.carnet_conducir && data.carnet_conducir !== "No" && data.carnet_conducir !== "None";
  const driverLicense = hasDrivingLicense ? data.carnet_conducir : "";

  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": content.jobTitle || "Professional",
    "{{TAGLINE}}": tagline,
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{EMAIL}}": data.email || "",
    "{{LOCATION}}": location,
    "{{DRIVER_LICENSE}}": driverLicense,
    "{{LANGUAGES}}": languagesHtml,
    "{{KEY_STRENGTHS}}": keyStrengthsHtml,
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
// ✅ GENERAR HTML DE LA CARTA - ACTUALIZADO
// ============================================

function generateCoverHtml(data: any, content: LetterContent, company: Company, jobTitle: string): string {
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

  const location = data.current_city
    ? `${data.current_city}, ${data.nationality || "Morocco"}`
    : data.nationality || "Morocco";

  const hasDrivingLicense = data.carnet_conducir && data.carnet_conducir !== "No" && data.carnet_conducir !== "None";
  const driverLicense = hasDrivingLicense ? data.carnet_conducir : "Not available";

  // ✅ COMPANY SECTION
  const companySection = company && company.name ? `
    <div class="company">
      <strong>${company.name}</strong>
      <div class="department">Human Resources Department</div>
      <div class="address-line">${company.city || "Malta"}</div>
    </div>
  ` : '<div class="company-empty"></div>';

  // ✅ SIGNATURE IMAGE
  const signatureImageHtml = data.signature_image ? `
    <div class="signature-image">
      <img src="${data.signature_image}" alt="Signature">
    </div>
  ` : '';

  // ✅ REPLACEMENTS
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FIRST_NAME}}": firstName,
    "{{LAST_NAME}}": lastName,
    "{{FULL_NAME}}": fullName,
    "{{TITLE}}": jobTitle || "Professional",
    "{{EMAIL}}": data.email || "",
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{NATIONALITY}}": data.nationality || "Moroccan",
    "{{DRIVER_LICENSE}}": driverLicense,
    "{{LOCATION}}": location,
    "{{DATE}}": dateStr,
    "{{COMPANY_SECTION}}": companySection,
    "{{GREETING}}": "Dear Hiring Manager,",
    "{{INTRODUCTION}}": content.introduction || "",
    "{{BODY_1}}": content.body1 || "",
    "{{BODY_2}}": content.body2 || "",
    "{{BODY_3}}": content.body3 || "",
    "{{CLOSING}}": content.closing || "",
    "{{SIGNATURE_IMAGE_HTML}}": signatureImageHtml,
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
// RENDERIZAR PDF CON COMPROBACIÓN DE ALTURA
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
    await page.emulateMedia({ media: "print" });
    
    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });
    
    console.log(`📏 Content height: ${contentHeight}px (limit: ${MAX_PAGE_HEIGHT_PX}px)`);
    
    let finalHtml = html;
    if (contentHeight > MAX_PAGE_HEIGHT_PX) {
      console.log(`⚠️ Content overflows A4 page (${contentHeight}px > ${MAX_PAGE_HEIGHT_PX}px)`);
      console.log("🔄 Reducing font size to fit on one page...");
      
      finalHtml = html.replace(/font-size:(\s*)(\d+)/g, (match, space, size) => {
        const newSize = Math.max(10, parseInt(size) - 1);
        return `font-size:${space}${newSize}`;
      });
      
      finalHtml = finalHtml.replace(/padding:(\s*)(\d+)/g, (match, space, size) => {
        const newSize = Math.max(4, parseInt(size) - 2);
        return `padding:${space}${newSize}`;
      });
      
      finalHtml = finalHtml.replace(/margin:(\s*)(\d+)/g, (match, space, size) => {
        const newSize = Math.max(2, parseInt(size) - 2);
        return `margin:${space}${newSize}`;
      });
      
      await page.setContent(finalHtml, { waitUntil: 'networkidle' });
      await page.emulateMedia({ media: "print" });
      
      const newHeight = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
      });
      
      console.log(`📏 New content height: ${newHeight}px`);
    }
    
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
// SUBIR PDF A SUPABASE CON REINTENTO
// ============================================

async function uploadPDFWithRetry(pdfBytes: Buffer, fileName: string): Promise<string> {
  return await retryWithBackoff(
    async () => {
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
    },
    3,
    2000,
    "Supabase upload"
  );
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

    const startTime = Date.now();
    let openaiTime = 0;
    let pdfTime = 0;
    let uploadTime = 0;

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

    const openaiStart = Date.now();
    console.log("🤖 Generating premium CV...");
    const cvContent = await generatePremiumCV(application, hasUserCV);
    console.log(`✅ CV generated with ${cvContent.tokens || 0} tokens`);
    console.log(`   Job Title: ${cvContent.jobTitle}`);
    console.log(`   Company: ${cvContent.company.name || "N/A"} (${cvContent.company.city || "N/A"})`);

    console.log("🤖 Generating premium cover letter...");
    const letterContent = await generatePremiumCoverLetter(application, cvContent.company, cvContent.jobTitle);
    console.log(`✅ Cover letter generated with ${letterContent.tokens || 0} tokens`);
    openaiTime = Date.now() - openaiStart;
    console.log(`⏱️ OpenAI generation: ${openaiTime}ms`);

    console.log("📄 Generating CV HTML...");
    const cvHtml = generateCVHtml(application, cvContent);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML...");
    const coverHtml = generateCoverHtml(application, letterContent, cvContent.company, cvContent.jobTitle);
    console.log(`✅ Cover Letter HTML generated (${coverHtml.length} chars)`);

    const pdfStart = Date.now();
    console.log("🖨️ Converting CV to PDF with height check...");
    const cvPdf = await renderPdfFromHtml(cvHtml);
    console.log(`✅ CV PDF generated (${cvPdf.length} bytes)`);

    console.log("🖨️ Converting Cover Letter to PDF with height check...");
    const coverPdf = await renderPdfFromHtml(coverHtml);
    console.log(`✅ Cover Letter PDF generated (${coverPdf.length} bytes)`);
    pdfTime = Date.now() - pdfStart;
    console.log(`⏱️ PDF generation: ${pdfTime}ms`);

    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    const uploadStart = Date.now();
    console.log("📤 Uploading CV PDF...");
    const cvUrl = await uploadPDFWithRetry(cvPdf, cvFileName);

    console.log("📤 Uploading Cover Letter PDF...");
    const letterUrl = await uploadPDFWithRetry(coverPdf, letterFileName);
    uploadTime = Date.now() - uploadStart;
    console.log(`⏱️ Upload to Supabase: ${uploadTime}ms`);

    console.log("✅ Both PDFs uploaded successfully");

    const fullLetterText = `${letterContent.introduction}\n\n${letterContent.body1}\n\n${letterContent.body2}\n\n${letterContent.body3}\n\n${letterContent.closing}`;
    const totalTokens = (cvContent.tokens || 0) + (letterContent.tokens || 0);
    const generationTime = Date.now() - startTime;
    
    console.log(`⏱️ Total generation time: ${generationTime}ms`);
    console.log(`   ├─ OpenAI: ${openaiTime}ms (${Math.round(openaiTime/generationTime*100)}%)`);
    console.log(`   ├─ PDF: ${pdfTime}ms (${Math.round(pdfTime/generationTime*100)}%)`);
    console.log(`   └─ Upload: ${uploadTime}ms (${Math.round(uploadTime/generationTime*100)}%)`);
    
    await retryWithBackoff(
      async () => {
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
          generation_time_ms: generationTime,
          documents_generated_at: new Date().toISOString(),
          worker_ready: true,
          worker_status: "ready",
          company_name: cvContent.company.name || "",
          company_city: cvContent.company.city || "",
          
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
          throw new Error(`Supabase update failed: ${updateError.message}`);
        }
        
        return true;
      },
      3,
      1500,
      "Supabase update"
    );

    console.log(`✅ Application updated successfully`);

    try {
      await retryWithBackoff(
        async () => {
          const { error: queueError } = await supabase
            .from("worker_queue")
            .insert({
              application_id: applicationId,
              status: "pending",
              priority: 1,
              created_at: new Date().toISOString(),
            });

          if (queueError) {
            throw new Error(`Worker queue insert failed: ${queueError.message}`);
          }
          return true;
        },
        2,
        1000,
        "Worker queue insert"
      );
      console.log("✅ Added to worker queue successfully");
    } catch (queueErr) {
      console.error("❌ Worker queue exception (non-critical):", queueErr);
    }

    return res.status(200).json({
      success: true,
      applicationId,
      cvUrl,
      letterUrl,
      company: cvContent.company.name || "",
      companyCity: cvContent.company.city || "",
      jobTitle: cvContent.jobTitle,
      hasUserCV: hasUserCV,
      photoUsed: !!application.photo_url,
      cvTokens: cvContent.tokens || 0,
      letterTokens: letterContent.tokens || 0,
      totalTokens: totalTokens,
      generationTimeMs: generationTime,
      openaiTimeMs: openaiTime,
      pdfTimeMs: pdfTime,
      uploadTimeMs: uploadTime,
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
