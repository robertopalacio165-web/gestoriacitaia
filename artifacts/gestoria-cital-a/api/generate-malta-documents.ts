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
    skills: ["Food Preparation", "Kitchen Hygiene", "HACCP", "Inventory Management", "Cleaning & Sanitization", "Team Collaboration", "Time Management", "Quality Control"],
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
    skills: ["Cleaning", "Organization", "Customer Service", "Attention to Detail", "Teamwork", "Time Management", "Reliability", "Communication"],
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
    skills: ["Customer Service", "Food Safety", "Hygiene", "Team Collaboration", "Communication", "Attention to Detail", "Time Management", "Problem Solving"],
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
    skills: ["Cleaning", "Hygiene", "Organization", "Attention to Detail", "Time Management", "Reliability", "Communication", "Safety Awareness"],
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
    skills: ["Inventory Management", "Forklift", "Packing", "Safety", "Organization", "Teamwork", "Time Management", "Attention to Detail"],
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
    skills: ["Driving", "Navigation", "Time Management", "Customer Service", "Reliability", "Communication", "Problem Solving", "Safety"],
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
    skills: ["Construction", "Safety", "Tools", "Team Work", "Physical Work", "Reliability", "Communication", "Problem Solving"],
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
    skills: ["Aluminium Work", "Carpentry", "Tools", "Quality Control", "Measurement", "Precision", "Safety", "Problem Solving"],
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
    skills: ["Production", "Quality Control", "Machinery", "Safety", "Teamwork", "Attention to Detail", "Problem Solving", "Time Management"],
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
    skills: ["Reliability", "Team Work", "Safety", "Adaptability", "Communication", "Punctuality", "Problem Solving", "Time Management"],
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
    sin_estudios: "Foundational Education",
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
// CONTEXTO DE CIUDADES - VERSIÓN EXTENDIDA (50+ CIUDADES)
// ============================================

function getCityDescription(city: string): string {
  const cityContexts: Record<string, string> = {
    "Casablanca": "Casablanca, Morocco's economic capital with a vibrant hospitality and restaurant scene",
    "Rabat": "Rabat, the political and administrative capital with a growing tourism sector",
    "Tangier": "Tangier, the historic port city with strong Mediterranean tourism and hospitality",
    "Agadir": "Agadir, the coastal tourist destination with a well-established hotel industry",
    "Marrakech": "Marrakech, the world-famous tourist hub with luxury hotels and international cuisine",
    "Fes": "Fes, the cultural and spiritual heart with traditional Moroccan hospitality",
    "Meknes": "Meknes, the imperial city with rich historical tourism",
    "Oujda": "Oujda, the eastern gateway with a developing hospitality sector",
    "Kenitra": "Kenitra, the northwestern city with commercial and industrial activity",
    "Tetouan": "Tetouan, the northern city with Andalusian heritage and Mediterranean tourism",
    "Safi": "Safi, the coastal city known for its port and pottery tradition",
    "El Jadida": "El Jadida, the coastal city with Portuguese heritage and seaside tourism",
    "Settat": "Settat, the central city with agricultural and commercial activities",
    "Khouribga": "Khouribga, the mining city with a developing service sector",
    "Beni Mellal": "Beni Mellal, the central city surrounded by agricultural and natural attractions",
    "Nador": "Nador, the northeastern coastal city with growing tourism potential",
    "Taza": "Taza, the mountain city with natural heritage and local commerce",
    "Larache": "Larache, the coastal town with fishing and tourism activities",
    "Ksar El Kebir": "Ksar El Kebir, the northern city with agricultural and commercial traditions",
    "Sidi Kacem": "Sidi Kacem, the northern agricultural city with growing services",
    "Khemisset": "Khemisset, the central city with artisan and commercial activities",
    "Mohammedia": "Mohammedia, the coastal industrial city with a developing hospitality sector",
    "Essaouira": "Essaouira, the coastal city with traditional fishing and growing tourism",
    "Ouarzazate": "Ouarzazate, the gateway to the desert with film and tourism industries",
    "Dakhla": "Dakhla, the southern coastal city with windsurfing and eco-tourism",
    "Laayoune": "Laayoune, the southern administrative centre with developing services",
    "Al Hoceima": "Al Hoceima, the northern coastal city with Mediterranean tourism",
    "Chefchaouen": "Chefchaouen, the famous blue city with international tourism",
    "Ifrane": "Ifrane, the alpine city with mountain tourism and green landscapes",
    "Azrou": "Azrou, the central mountain city with forest and artisan tourism",
    "Errachidia": "Errachidia, the eastern city with oasis and desert tourism",
    "Guelmim": "Guelmim, the southern city with desert and camel tourism",
    "Tiznit": "Tiznit, the southern city with silver craftsmanship and tourism",
    "Taroudant": "Taroudant, the southern city with traditional souks and tourism",
    "Oued Zem": "Oued Zem, the central mining city with developing services",
    "Sefrou": "Sefrou, the central city with cherry festival and tourism",
    "Berkane": "Berkane, the eastern agricultural city with citrus production",
    "M'Diq": "M'Diq, the northern coastal city with Mediterranean tourism",
    "Fnideq": "Fnideq, the northern border city with commercial activity",
    "Martil": "Martil, the northern coastal town with summer tourism",
    "Sidi Slimane": "Sidi Slimane, the northwestern agricultural city",
  };

  return cityContexts[city] || `${city}, a city in Morocco with a developing hospitality and service sector`;
}

// ============================================
// FUNCIÓN PARA GENERAR FECHAS DE EXPERIENCIA
// ============================================

function generateExperienceDates(expYears: string, numPositions: number): string[] {
  const currentYear = new Date().getFullYear();
  
  const dateRanges: Record<string, string[]> = {
    "sin_experiencia": [`${currentYear} - Present`],
    "menos_1": [`${currentYear - 1} - Present`],
    "1_2": [`${currentYear - 1} - Present`],
    "3_5": [`${currentYear - 2} - Present`],
    "mas_5": [`${currentYear - 3} - Present`],
  };
  
  const ranges = dateRanges[expYears] || [`${currentYear} - Present`];
  
  const dates: string[] = [];
  for (let i = 0; i < numPositions; i++) {
    if (i === 0) {
      dates.push(ranges[0]);
    } else if (i === 1) {
      const year = currentYear - (3 + i);
      dates.push(`${year} - ${year + 2}`);
    } else {
      const year = currentYear - (6 + i);
      dates.push(`${year} - ${year + 2}`);
    }
  }
  
  return dates;
}

// ============================================
// FUNCIÓN PARA GENERAR AÑO DE EDUCACIÓN
// ============================================

function generateEducationYear(expYears: string, fechaNacimiento: string | null): string {
  const currentYear = new Date().getFullYear();
  
  if (fechaNacimiento) {
    try {
      const birthYear = parseInt(fechaNacimiento.split('-')[0]);
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear < 2010) {
        const age = currentYear - birthYear;
        if (age >= 30) return String(currentYear - 10);
        if (age >= 25) return String(currentYear - 5);
        if (age >= 22) return String(currentYear - 3);
        return String(currentYear - 2);
      }
    } catch {
      // Si falla, usar años de experiencia
    }
  }
  
  const expMap: Record<string, number> = {
    "sin_experiencia": 2,
    "menos_1": 3,
    "1_2": 4,
    "3_5": 6,
    "mas_5": 8,
  };
  
  const yearsAgo = expMap[expYears] || 3;
  return String(currentYear - yearsAgo);
}

// ============================================
// FUNCIÓN PARA OBTENER EL SECTOR CORRECTO
// ============================================

function getSectorLabel(sectorId: string): string {
  const sectorMap: Record<string, string> = {
    "kitchen": "Hospitality",
    "hotel": "Hospitality",
    "restaurant": "Hospitality",
    "cleaning": "Cleaning Services",
    "warehouse": "Warehouse & Logistics",
    "delivery": "Delivery & Transport",
    "construction": "Construction",
    "aluminium": "Manufacturing & Carpentry",
    "manufacturing": "Manufacturing",
    "default": "General Services",
  };
  
  return sectorMap[sectorId] || "General Services";
}

// ============================================
// FUNCIÓN PARA OBTENER LA INDUSTRIA CORRECTA
// ============================================

function getIndustryLabel(sectorId: string): string {
  const industryMap: Record<string, string> = {
    "kitchen": "Hospitality",
    "hotel": "Hospitality",
    "restaurant": "Hospitality",
    "cleaning": "Cleaning Services",
    "warehouse": "Logistics & Warehousing",
    "delivery": "Transport & Logistics",
    "construction": "Construction",
    "aluminium": "Manufacturing",
    "manufacturing": "Manufacturing",
    "default": "Hospitality",
  };
  
  return industryMap[sectorId] || "Hospitality";
}

// ============================================
// PROMPT PARA CV - RECRUITER AI (MEJORADO)
// ============================================

function getPremiumCVPrompt(data: any): string {
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
  const userExperience = validateWorkExperience(data.experiencia_laboral);
  const city = data.current_city || data.ciudad_actual || "Morocco";
  const country = data.pais_residencia || "Morocco";
  const education = data.estudios || "Foundational Education";

  const cityDescription = getCityDescription(city);

  return `
You are not an AI assistant.

You are a Senior International Recruitment Consultant with over 25 years of experience recruiting international candidates for hospitality, logistics, retail, manufacturing and construction jobs across Malta and Europe.

You have personally reviewed more than 100,000 CVs and written thousands of successful CVs and Cover Letters.

Your documents consistently achieve high interview rates because they sound completely natural, credible and written by a human recruiter.

Your writing style is impossible to distinguish from a document written manually by an experienced recruitment consultant.

Never sound like ChatGPT.

Never sound like artificial intelligence.

Every sentence must have a clear professional purpose.

📌 RULE 1: NEVER INVENT FACTS.

You may professionally infer ordinary day-to-day responsibilities that naturally belong to the candidate's real role.

Every inferred responsibility must be realistic, common and directly supported by the candidate's description.

Never fabricate employers, dates, certifications, achievements or qualifications.

📌 RULE 2: WRITE IN NATURAL BRITISH ENGLISH.

Avoid American corporate language.

Avoid motivational clichés.

Avoid exaggerated adjectives.

Avoid buzzwords.

Use the language normally seen in successful European CVs.

📌 RULE 3: VARY SENTENCE OPENINGS.

Never reuse the same opening twice.

Avoid repeatedly starting sentences with:
- "I have..."
- "My experience..."
- "I am..."
- "My background..."

Vary sentence openings naturally.

📌 RULE 4: REALISTIC EXPERIENCE DESCRIPTIONS.

For every professional position:

Generate 3–5 realistic responsibilities.

Each responsibility must describe an actual task performed during daily work.

Mix:
- operational duties
- teamwork
- quality standards
- organisation
- communication
- health & safety
- customer interaction (if applicable)

Do not repeat the same responsibility across positions.

Use different verbs.

Every bullet must sound like it was written by a recruiter.

📌 THE RECRUITER MUST BELIEVE:

"I am reading a real CV."

Never:
- generic wording
- repetitive wording
- template wording
- robotic wording
- keyword stuffing
- AI style

Every CV must feel handwritten.

📌 CITY PERSONALISATION:

Use the candidate's city naturally.

Never repeat the city more than two times. Never force it.

Examples:
- "Coming from ${city}, Morocco's economic capital..."
- "Based in ${city}, I have developed strong customer service skills..."
- "My experience in ${city} has prepared me to adapt quickly..."

📌 SIZE:

Generate the amount of text required to perfectly fill the HTML template without overflowing or leaving excessive white space.

The final document must always fit on a single A4 page.

---

ABOUT THE CANDIDATE'S CITY:
The candidate is from ${city}, ${cityDescription}.

CANDIDATE PROFILE:
- Full Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Experience Level: ${expLabel}
- Education: ${education}
- City of Origin: ${city}
- Country of Residence: ${country}
- Availability: ${availability}

${userExperience ? `REAL WORK EXPERIENCE PROVIDED BY CANDIDATE:\n${userExperience}\n\n⚠️ CRITICAL: This is the most important section. Transform this real experience into professional, recruiter-quality experience. Professionalise the wording. Structure the responsibilities. Make it interview-worthy. Never invent facts. You may infer ordinary responsibilities that naturally belong to the role. Never copy literally. Improve naturally.` : ''}

ATS KEYWORDS FOR THIS ROLE (use naturally, never force):
${template.atsKeywords.map(k => `- ${k}`).join("\n")}

---

Generate a COMPLETE, PROFESSIONAL CV with these sections:

1. PROFESSIONAL SUMMARY:
Write a compelling executive summary that reads naturally.
Mention the candidate's profession, experience level, key strengths and motivation.
Mention the city once naturally.
ATS-friendly without keyword stuffing.

2. PROFESSIONAL PROFILE:
Detailed description of the candidate's professional identity.
Core competencies and areas of expertise.
Career trajectory and ambitions in Malta.
Mention the city once naturally.

3. KEY ACHIEVEMENTS:
6 bullet points that highlight real achievements.
Each bullet must be a complete, impactful statement.
4-8 words per bullet.
Natural and professional.

4. PROFESSIONAL EXPERIENCE:
Create up to 3 professional positions based ONLY on the candidate's real experience.

If the candidate only has one job, split it into different career stages or responsibility groups.

If the candidate has no experience, describe transferable skills and motivation.

Never invent employers.

Each position must include realistic responsibilities that naturally derive from the user's experience.

Each position should have 3-5 bullet points describing real responsibilities.

Write naturally. Each bullet should be a complete sentence or phrase.

---

IMPORTANT RULES:
- Never mention any specific company in Malta.
- Never mention Hilton, Marriott, Radisson, Corinthia or any other hotel.
- The CV must be universal.
- The final CV must fit perfectly on one A4 page.

Return ONLY valid JSON:
{
  "summary": "...",
  "profile": "...",
  "achievements": ["...", "...", "...", "...", "...", "..."],
  "experience": ["Position 1: 3-5 bullets", "Position 2: 3-5 bullets", "Position 3: 3-5 bullets"]
}
`;
}

async function generatePremiumCV(data: any): Promise<CVContent> {
  const prompt = getPremiumCVPrompt(data);
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
// PROMPT PARA COVER LETTER - RECRUITER AI (MEJORADO)
// ============================================

function getPremiumCoverLetterPrompt(data: any): string {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const userExperience = validateWorkExperience(data.experiencia_laboral);
  const city = data.current_city || data.ciudad_actual || "Morocco";
  const country = data.pais_residencia || "Morocco";

  const cityDescription = getCityDescription(city);

  return `
You are not an AI assistant.

You are a Senior International Recruitment Consultant with over 25 years of experience recruiting international candidates for hospitality, logistics, retail, manufacturing and construction jobs across Malta and Europe.

You have personally reviewed more than 100,000 CVs and written thousands of successful CVs and Cover Letters.

Your documents consistently achieve high interview rates because they sound completely natural, credible and written by a human recruiter.

Your writing style is impossible to distinguish from a document written manually by an experienced recruitment consultant.

Never sound like ChatGPT.

Never sound like artificial intelligence.

Every sentence must have a clear professional purpose.

📌 RULE 1: NEVER INVENT FACTS.

You may professionally infer ordinary day-to-day responsibilities that naturally belong to the candidate's real role.

Every inferred responsibility must be realistic, common and directly supported by the candidate's description.

Never fabricate employers, dates, certifications, achievements or qualifications.

📌 RULE 2: WRITE IN NATURAL BRITISH ENGLISH.

Avoid American corporate language.

Avoid motivational clichés.

Avoid exaggerated adjectives.

Avoid buzzwords.

Use the language normally seen in successful European CVs.

📌 RULE 3: VARY SENTENCE OPENINGS.

Never reuse the same opening twice.

Avoid repeatedly starting sentences with:
- "I have..."
- "My experience..."
- "I am..."
- "My background..."

Vary sentence openings naturally.

📌 THE RECRUITER MUST BELIEVE:

"I am reading a real Cover Letter."

Never:
- generic wording
- repetitive wording
- template wording
- robotic wording
- keyword stuffing
- AI style

Every Cover Letter must feel individually written.

📌 COVER LETTER RULES:

The Cover Letter is universal. It is NOT addressed to a specific employer.

Therefore:
- Never mention company names.
- Never mention hotel names.
- Never mention restaurant names.
- Never mention addresses.
- Never mention Maltese cities.
- Never mention departments.
- Never mention HR teams.

Always begin with: "Dear Hiring Manager,"

The letter must be suitable for any employer in Malta.

📌 CITY PERSONALISATION:

Use the candidate's city naturally.

Examples:
- "Coming from ${city}, Morocco's economic capital..."
- "Based in ${city}, I have developed strong customer service skills..."
- "My experience in ${city} has prepared me to adapt quickly..."

Never repeat the city more than two times. Never force it.

📌 UNIQUENESS:

Every candidate receives a unique Cover Letter.

Even if two candidates have identical jobs.

Use different sentence structures.

Different vocabulary.

Different paragraph openings.

Different rhythm.

The recruiter must never suspect two letters were generated by the same system.

📌 SIZE:

Generate the amount of text required to perfectly fill the HTML template without overflowing or leaving excessive white space.

The final document must always fit on a single A4 page.

---

ABOUT THE CANDIDATE'S BACKGROUND:
- From ${cityDescription}
- Familiar with the hospitality, café and restaurant culture in ${city}
- Motivated to bring their skills to the Maltese market
- Ready to relocate to Malta
- Seeking long-term professional growth in Malta's hospitality industry

CANDIDATE PROFILE:
- Full Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Experience Level: ${data.anos_experiencia || "Entry level"}
- Education: ${data.estudios || "N/A"}
- City of Origin: ${city}, ${country}
- Availability: ${availability}

${userExperience ? `REAL WORK EXPERIENCE PROVIDED BY CANDIDATE:\n${userExperience}\n\nUse this as the foundation for the body paragraphs. Professionalise the language naturally.` : ''}

---

Generate a PROFESSIONAL, NATURAL Cover Letter with these sections:

1. INTRODUCTION:
Natural opening about the candidate's motivation to work in Malta.
Show genuine enthusiasm.
Establish why the candidate is interested in building a career in Malta.
Mention the city once naturally.

2. BODY 1:
Highlight relevant skills and experience developed in ${city}.
Connect background from ${city} directly to the needs of the role.
Show understanding of the hospitality industry.
Be specific and natural.

3. BODY 2:
Explain why the candidate wants to build a career in Malta.
Connect personal values to the opportunity.
Demonstrate genuine interest in working in Malta long-term.
Write naturally, not like a template.

4. BODY 3:
Address availability and relocation from ${city} to Malta.
Mention willingness to relocate immediately.
Express readiness to contribute.
Show flexibility and commitment.

5. CLOSING:
Professional and confident conclusion.
Strong call to action for interview.
Express appreciation.
Reiterate enthusiasm for the opportunity in Malta.

---

IMPORTANT RULES:
- Never mention any specific company in Malta.
- Never mention "Dear Hiring Manager" in the JSON (it's added by the template).
- The letter must be universal.
- The final letter must fit perfectly on one A4 page.

Return ONLY valid JSON:
{
  "introduction": "...",
  "body1": "...",
  "body2": "...",
  "body3": "...",
  "closing": "..."
}
`;
}

async function generatePremiumCoverLetter(data: any): Promise<LetterContent> {
  const prompt = getPremiumCoverLetterPrompt(data);
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
// GENERAR HTML DEL CV - SIN PASSPORT, WORK PERMIT, VIDEO INTERVIEW
// ============================================

function generateCVHtml(data: any, content: CVContent): string {
  let template = readTemplate("premium-cv.html");
  
  const nameParts = (data.full_name || "Candidate").trim().split(" ");
  const firstName = nameParts[0] || "Candidate";
  const lastName = nameParts.slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`;

  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const templateData = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const license = getDriverLicenseLabel(data.carnet_conducir || "");
  const relocate = normalizeRelocate(data.reubicacion);
  const expLabel = getExperienceLabel(validateExperienceYears(data.anos_experiencia));
  const nationality = data.nacionalidad || data.nationality || "Morocco";
  const city = data.current_city || data.ciudad_actual || "Morocco";
  const country = data.pais_residencia || data.countryResidence || "Morocco";
  const education = data.estudios || "Foundational Education";

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

  // --- KEY STRENGTHS (exactamente 6) ---
  const keyStrengths = [
    `Immediate Availability: ${availability}`,
    `Willing to Relocate to Malta: ${relocate}`,
    `Team Player`,
    `Flexible Schedule`,
    `Driving License: ${license}`,
    `Adaptable to New Environments`,
  ];
  const keyStrengthsHtml = keyStrengths.map(h => `<li>${h}</li>`).join("");

  // --- CORE COMPETENCIES ---
  const competencies = templateData.skills || [];
  while (competencies.length < 8) {
    const extraSkills = ["Time Management", "Problem Solving", "Communication", "Safety Awareness"];
    if (!competencies.includes(extraSkills[competencies.length - 4])) {
      competencies.push(extraSkills[competencies.length - 4]);
    }
  }
  const coreCompetenciesHtml = competencies.map((comp: string) => {
    return `<span>${comp}</span>`;
  }).join("");

  // --- GENERAR FECHAS REALISTAS PARA EXPERIENCIA ---
  const expYears = validateExperienceYears(data.anos_experiencia);
  const numPositions = content.experience ? content.experience.length : 1;
  const dateRanges = generateExperienceDates(expYears, numPositions);

  // --- EXPERIENCE LIST ---
  let experienceHtml = "";
  if (content.experience && content.experience.length > 0) {
    const sectorLabel = getSectorLabel(sector);
    const expItems = content.experience.map((exp: string, index: number) => {
      const parts = exp.split(":");
      const title = parts[0] || templateData.title;
      const bullets = parts.slice(1).join(":").trim() || exp;
      
      const expLocation = `${city} · ${sectorLabel}`;
      const dateRange = dateRanges[index % dateRanges.length] || `${new Date().getFullYear() - 1} - Present`;
      
      return `
        <div class="experience-item">
          <div class="exp-header">
            <span class="exp-title">${title}</span>
            <span class="exp-company">${expLocation}</span>
            <span class="exp-date">${dateRange}</span>
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
  const educationLabel = getEducationLabel(education);
  const educationYear = generateEducationYear(expYears, data.fechaNacimiento || null);
  // ✅ CORREGIDO: Ya no duplicamos educationLabel
  const educationHtml = `
    <div class="education-item">
      <div class="edu-header">
        <span class="edu-degree">${educationLabel}</span>
        <span class="edu-institution">${country || "Morocco"}</span>
        <span class="edu-date">${educationYear}</span>
      </div>
    </div>
  `;

  // --- PROFESSIONAL SKILLS ---
  let professionalSkillsHtml = "";
  const skills = templateData.skills || [];
  while (skills.length < 8) {
    const extraSkills = ["Time Management", "Problem Solving", "Communication", "Safety Awareness"];
    if (!skills.includes(extraSkills[skills.length - 4])) {
      skills.push(extraSkills[skills.length - 4]);
    }
  }
  
  const expLevel = validateExperienceYears(data.anos_experiencia);
  const basePercentage = expLevel === "sin_experiencia" ? 50 :
                         expLevel === "menos_1" ? 60 :
                         expLevel === "1_2" ? 70 :
                         expLevel === "3_5" ? 80 : 90;

  const skillPercentages: Record<string, number> = {
    "Food Preparation": basePercentage + 10,
    "Kitchen Hygiene": basePercentage + 5,
    "HACCP": basePercentage,
    "Inventory Management": basePercentage - 5,
    "Cleaning & Sanitization": basePercentage + 5,
    "Team Collaboration": basePercentage + 10,
    "Customer Service": basePercentage + 5,
    "Food Safety": basePercentage,
    "Hygiene": basePercentage + 5,
    "Organization": basePercentage,
    "Attention to Detail": basePercentage + 5,
    "Time Management": basePercentage,
    "Reliability": basePercentage + 10,
    "Cleaning": basePercentage + 5,
    "Teamwork": basePercentage + 10,
    "Communication": basePercentage + 5,
    "Safety": basePercentage,
    "Adaptability": basePercentage + 5,
    "Punctuality": basePercentage + 10,
    "Problem Solving": basePercentage - 5,
    "Safety Awareness": basePercentage,
  };
  
  for (const skill of skills) {
    const percentage = skillPercentages[skill] || basePercentage;
    professionalSkillsHtml += `
      <div class="skill-bar">
        <span class="skill-label">${skill}</span>
        <span class="skill-track">
          <span class="skill-fill" style="width: ${percentage}%;"></span>
        </span>
      </div>
    `;
  }

  // --- TAGLINE (eliminado) ---
  const tagline = "";
  const personalStatement = content.profile || `${templateData.title} professional with practical experience, strong motivation to relocate to Malta, excellent teamwork skills and a commitment to delivering high-quality results in a professional environment.`;

  // --- REPLACEMENTS ---
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": templateData.title,
    "{{TAGLINE}}": tagline,
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{EMAIL}}": data.email || "",
    "{{NATIONALITY}}": nationality,
    "{{LOCATION}}": city ? `${city}, ${nationality}` : nationality,
    "{{LANGUAGES}}": languagesHtml,
    "{{KEY_STRENGTHS}}": keyStrengthsHtml,
    "{{DRIVER_LICENSE}}": license,
    "{{AVAILABILITY}}": availability,
    "{{RELOCATE}}": relocate,
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

function generateCoverHtml(data: any, content: LetterContent): string {
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

  const relocate = normalizeRelocate(data.reubicacion);

  const roleShort = "ROLE";
  const roleValue = templateData.title;

  // ✅ INDUSTRY dinámico según el sector
  const industry = "INDUSTRY";
  const industryValue = getIndustryLabel(sector);

  const relocating = "RELOCATION";
  const relocatingValue =
    relocate === "Yes"
      ? "Ready for Malta"
      : "Not Available";

  // --- REPLACEMENTS ---
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{JOB_TITLE}}": templateData.title,
    "{{DATE}}": dateStr,
    "{{COMPANY_SECTION}}": "",
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
    "{{INITIALS}}": initials,
    "{{ROLE_SHORT}}": roleShort,
    "{{ROLE_VALUE}}": roleValue,
    "{{INDUSTRY}}": industry,
    "{{INDUSTRY_VALUE}}": industryValue,
    "{{RELOCATING}}": relocating,
    "{{RELOCATING_VALUE}}": relocatingValue,
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
  console.log(`📤 Uploading: ${fileName} (${pdfBytes.length} bytes)`);
  
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

  console.log(`✅ Uploaded: ${publicUrlData.publicUrl}`);
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

    console.log(`✅ Application found: ${application.full_name}`);
    console.log(`📚 Education: ${application.estudios || 'Not set'}`);
    console.log(`🌍 City: ${application.current_city || application.ciudad_actual || 'Not set'}`);

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
    console.log(`🏢 Selected company (for tracking only): ${selectedCompany.name} (${selectedCompany.city})`);

    const cvPromptFull = getPremiumCVPrompt(application);
    const coverPromptFull = getPremiumCoverLetterPrompt(application);

    console.log("🤖 Generating premium CV content...");
    const cvContent = await generatePremiumCV(application);
    console.log(`✅ CV content generated`);

    console.log("🤖 Generating premium Cover Letter content...");
    const letterContent = await generatePremiumCoverLetter(application);
    console.log(`✅ Cover Letter content generated`);

    console.log("📄 Generating CV HTML from template...");
    const cvHtml = generateCVHtml(application, cvContent);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML from template...");
    const coverHtml = generateCoverHtml(application, letterContent);
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

    const updateData: any = {
      cv_generated: true,
      letter_generated: true,
      cv_generado_url: cvUrl,
      cover_letter_url: letterUrl,
      cv_text: cvContent.summary || '',
      letter_text: `${letterContent.introduction || ''}\n${letterContent.body1 || ''}\n${letterContent.body2 || ''}\n${letterContent.body3 || ''}\n${letterContent.closing || ''}`,
      cv_html: cvHtml,
      letter_html: coverHtml,
      cv_prompt: cvPromptFull,
      letter_prompt: coverPromptFull,
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
