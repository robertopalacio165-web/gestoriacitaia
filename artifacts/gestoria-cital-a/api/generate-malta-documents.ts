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
// CONTEXTO DE CIUDADES - VERSIÓN EXTENDIDA (50+ CIUDADES)
// ============================================

function getCityDescription(city: string): string {
  const cityContexts: Record<string, string> = {
    // Grandes ciudades
    "Casablanca": "Casablanca, Morocco's economic capital with a vibrant hospitality and restaurant scene",
    "Rabat": "Rabat, the political and administrative capital with a growing tourism sector",
    "Tangier": "Tangier, the historic port city with strong Mediterranean tourism and hospitality",
    "Agadir": "Agadir, the coastal tourist destination with a well-established hotel industry",
    "Marrakech": "Marrakech, the world-famous tourist hub with luxury hotels and international cuisine",
    "Fes": "Fes, the cultural and spiritual heart with traditional Moroccan hospitality",
    "Meknes": "Meknes, the imperial city with rich historical tourism",
    
    // Ciudades medianas
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
    
    // Ciudades pequeñas y turísticas
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

function getCitySectors(city: string): string {
  const sectorMap: Record<string, string> = {
    "Casablanca": "hospitality, restaurants, cafés, commerce, tourism, corporate services, and international business",
    "Rabat": "government services, tourism, hospitality, restaurants, and cultural institutions",
    "Tangier": "tourism, hospitality, shipping, commerce, and international trade",
    "Agadir": "tourism, hotels, restaurants, beach resorts, and coastal hospitality",
    "Marrakech": "luxury hospitality, tourism, restaurants, riads, and international cuisine",
    "Fes": "cultural tourism, traditional hospitality, artisan crafts, and historical tourism",
    "Meknes": "historical tourism, agriculture, and traditional commerce",
    "Oujda": "commerce, agriculture, and developing hospitality",
    "Kenitra": "industry, commerce, and hospitality services",
    "Tetouan": "tourism, crafts, and Mediterranean hospitality",
    "Safi": "fishing industry, pottery, and coastal tourism",
    "El Jadida": "coastal tourism, fishing, and Portuguese heritage tourism",
    "Settat": "agriculture, commerce, and services",
    "Khouribga": "mining industry and developing services",
    "Beni Mellal": "agriculture, mountain tourism, and local commerce",
    "Nador": "fishing, coastal tourism, and cross-border commerce",
    "Taza": "mountain tourism, agriculture, and local commerce",
    "Larache": "fishing, coastal tourism, and agriculture",
    "Essaouira": "cultural tourism, fishing, and windsurfing",
    "Ouarzazate": "film tourism, desert tourism, and cultural heritage",
    "Dakhla": "water sports, eco-tourism, and fishing",
    "Chefchaouen": "international tourism, crafts, and mountain hospitality",
    "Ifrane": "mountain tourism, eco-tourism, and winter sports",
  };

  return sectorMap[city] || "hospitality, local commerce, services, and community-oriented businesses";
}

// ============================================
// PROMPT PARA CV - VERSIÓN CORREGIDA CON NUEVOS LÍMITES
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

  const cityDescription = getCityDescription(city);
  const citySectors = getCitySectors(city);

  return `
You are a senior recruitment consultant with 20+ years of experience in the Maltese hospitality and labour market. You write professional, ATS-optimised CVs that sound human, unique, and tailored to each candidate.

📌 CRITICAL RULES:
1. The candidate is from ${city}, ${country}. Use this to add authentic regional context to their profile.
2. The candidate is applying for jobs in MALTA. Always mention Malta as the target destination.
3. IMPORTANT: Never invent employers, restaurant names, cafés, hotels, addresses or companies. Describe the local labour market and the candidate's familiarity with sectors such as hospitality, cafés, restaurants, retail or tourism based on the city of origin, but never claim employment at a specific business unless the candidate explicitly provided it.
4. If the user has NO work experience, write a compelling entry-level profile using realistic responsibilities.
5. Use professional, natural British English.
6. AVOID generic phrases like "hard-working" or "dedicated" without context.
7. Every CV must be unique. Never generate the same professional summary twice. Rewrite the structure, wording and examples for every candidate.
8. Explain how the candidate developed transferable skills in Morocco before seeking professional growth in Malta.

ABOUT THE CANDIDATE'S CITY:
The candidate is from ${city}, ${cityDescription}. This background provides valuable experience and transferable skills for the Maltese market, including:
- Familiarity with the local hospitality, café and restaurant culture in ${city}
- Understanding of customer service in a busy urban environment
- Experience with diverse clientele and multicultural interactions
- Knowledge of food safety and hygiene practices common in ${city}
- The local economy in ${city} includes sectors such as ${citySectors}

---

CANDIDATE PROFILE:
- Full Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Target Company: ${company.name} (${company.city}, MALTA)
- Experience Level: ${expLabel}
- Education: ${education}
- City of Origin: ${city}
- Country of Residence: ${country}
- Availability: ${availability}
- Passport: ${passport}
- Work Permit: ${workPermit}
- Video Interview: ${video}

${userExperience ? `REAL WORK EXPERIENCE PROVIDED BY CANDIDATE:\n${userExperience}\n\n⚠️ IMPORTANT: Use this as the foundation for the Professional Experience section. If the candidate mentions a specific company, you CAN use that company name. Otherwise, describe the experience generically.` : ''}

ATS KEYWORDS FOR THIS ROLE:
${template.atsKeywords.map(k => `- ${k}`).join("\n")}

---

Generate a COMPLETE, PROFESSIONAL CV with these sections:

1. PROFESSIONAL SUMMARY (75-85 words):
- EXACTLY 75-85 words.
- Exactly 5 sentences.
- Each sentence must contain 15-17 words.
- Write naturally.
- ATS-friendly.
- Fill the available layout space without unnecessary repetition.

2. PROFESSIONAL PROFILE
- EXACTLY 80-95 words.
- Exactly 6 lines when rendered in the CV.
- 6-7 sentences.
- Fill the Personal Statement section naturally.
- Do not repeat ideas.
- End with the candidate's motivation to relocate to Malta.

3. KEY ACHIEVEMENTS:
- Exactly 6 bullet points.
- 4-7 words per bullet.
- Maximum 40 characters.
- One line only.

4. PROFESSIONAL EXPERIENCE
- Exactly 3 positions.
- Exactly 4 bullet points per position.
- Every bullet must contain 14-18 words.
- Maximum 100 characters per bullet.
- Never leave positions empty.
- Keep every bullet on one line.

IMPORTANT LAYOUT RULES:

- The CV MUST fit on a single A4 page.
- Keep every section concise.
- Never exceed the requested limits.
- Never generate unnecessary text.
- Prioritize short, professional sentences.
- Generate enough text to naturally fill one A4 page.
- Never generate extremely short sections.
- Never generate empty sections.
- Keep every section balanced.
- The final CV should contain approximately 380-450 words.

Return ONLY valid JSON:
{
  "summary": "...",
  "profile": "...",
  "achievements": ["...", "...", "...", "...", "...", "..."],
  "experience": ["Position 1: 4 bullets", "Position 2: 4 bullets", "Position 3: 4 bullets"]
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
// PROMPT PARA COVER LETTER - SOLO CONSTRUYE EL PROMPT
// ============================================

function getPremiumCoverLetterPrompt(data: any, company: Company): string {
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

  const cityDescription = getCityDescription(city);
  const citySectors = getCitySectors(city);

  return `
You are a professional cover letter writer specialising in the Maltese job market. You write natural, human-sounding letters that are unique to each candidate and company.

📌 CRITICAL RULES:
1. The candidate is from ${city}, ${country} and wants to work in MALTA. This is essential - mention the move from ${city} to Malta.
2. Write a compelling career story: how the candidate's experience in ${city} prepared them for the Maltese market.
3. Write ONLY the BODY paragraphs of the cover letter (350-500 words total).
4. DO NOT include: name, address, date, subject line, greeting, signature, phone, email.
5. DO NOT mention languages, passport, driving licence, or work permit - these are in the CV.
6. Make each letter DIFFERENT for each candidate and company. Never use identical text for different candidates.
7. Use natural, professional British English.
8. Never use generic phrases like "I am writing to apply for".
9. Never invent employers, restaurant names, cafés, hotels, addresses or companies.
10. Mention why the candidate wants to build a long-term career in Malta rather than simply finding a temporary job.

ABOUT THE CANDIDATE'S BACKGROUND:
- From ${cityDescription}
- Familiar with the hospitality, café and restaurant culture in ${city}
- The local economy in ${city} includes sectors such as ${citySectors}
- Motivated to bring their skills to the Maltese market
- Ready to relocate and contribute to ${company.name}
- Seeking long-term professional growth in Malta's hospitality industry

---

CANDIDATE PROFILE:
- Full Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Target Company: ${company.name} (${company.city}, MALTA)
- Experience Level: ${data.anos_experiencia || "Entry level"}
- Education: ${data.estudios || "N/A"}
- City of Origin: ${city}, ${country}
- Availability: ${availability}
- Passport: ${passport}
- Video Interview: ${video}
- Work Permit: ${workPermit}
- Driver's License: ${license}

${userExperience ? `REAL WORK EXPERIENCE PROVIDED BY CANDIDATE:\n${userExperience}\n\nUse this as the foundation for the body paragraphs.` : ''}

---

Generate a PROFESSIONAL, DETAILED cover letter body as 5 paragraphs (350-500 words total). Each paragraph must be 4-6 sentences.

1. INTRODUCTION:
   - Compelling opening about moving from ${city} to Malta to pursue career goals
   - Mention the specific company (${company.name}) and position (${template.title})
   - Show genuine enthusiasm and research about the company
   - Establish why the candidate is interested in this role in Malta

2. BODY 1:
   - Highlight relevant skills and experience developed in ${city}
   - Connect background from ${city} directly to the needs of the role in Malta
   - Show understanding of the Maltese hospitality industry
   - Be specific and demonstrate knowledge of the role

3. BODY 2:
   - Explain WHY this company (${company.name}) in Malta
   - Show thorough research into the company's values or reputation
   - Connect personal values to the company's mission
   - Demonstrate genuine interest in working in Malta long-term

4. BODY 3:
   - Address availability and relocation from ${city} to Malta
   - Mention willingness to relocate immediately (${availability})
   - Express readiness to contribute in the Maltese market
   - Show flexibility and commitment

5. CLOSING:
   - Professional and confident conclusion
   - Strong call to action for interview
   - Express appreciation
   - Reiterate enthusiasm for the opportunity in Malta
   - Mention long-term career aspirations in Malta

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

// ============================================
// GENERAR COVER LETTER - LLAMA A OPENAI CON EL PROMPT
// ============================================

async function generatePremiumCoverLetter(data: any, company: Company): Promise<LetterContent> {
  const prompt = getPremiumCoverLetterPrompt(data, company);
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
// GENERAR HTML DEL CV - CORREGIDO
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
  const city = data.current_city || data.ciudad_actual || "Morocco";
  const education = data.estudios || "No formal education";

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
    `Adaptable to New Environments`,
    `Strong Work Ethic`,
    `Quick Learner`,
    `Attention to Detail`,
    `Reliable and Punctual`,
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

  // --- EXPERIENCE LIST - CORREGIDO (muestra ciudad, no empresa de Malta) ---
  let experienceHtml = "";
  if (content.experience && content.experience.length > 0) {
    const expItems = content.experience.map((exp: string) => {
      const parts = exp.split(":");
      const title = parts[0] || templateData.title;
      const bullets = parts.slice(1).join(":").trim() || exp;
      
      // ✅ CORREGIDO: Mostrar la ciudad de origen y sector, NO la empresa de Malta
      const expLocation = `${city} Hospitality Sector`;
      
      return `
        <div class="experience-item">
          <div class="exp-header">
            <span class="exp-title">${title}</span>
            <span class="exp-company">${expLocation}</span>
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
  const educationLabel = getEducationLabel(education);
  const educationHtml = `
    <div class="education-item">
      <div class="edu-header">
        <span class="edu-degree">${educationLabel}</span>
        <span class="edu-institution">${education}</span>
        <span class="edu-date">Present</span>
      </div>
    </div>
  `;

  // --- PROFESSIONAL SKILLS - DETERMINISTAS ---
  let professionalSkillsHtml = "";
  const skills = templateData.skills || [];
  while (skills.length < 8) {
    const extraSkills = ["Time Management", "Problem Solving", "Communication", "Safety Awareness"];
    if (!skills.includes(extraSkills[skills.length - 4])) {
      skills.push(extraSkills[skills.length - 4]);
    }
  }
  
  // ✅ CORREGIDO: Porcentajes deterministas basados en experiencia
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

  // --- TAGLINE & PERSONAL STATEMENT - CORREGIDO ---
  const tagline = `${templateData.title} professional from ${city} seeking opportunities in Malta`;
  const personalStatement = content.profile || content.summary || `${templateData.title} professional with practical experience, strong motivation to relocate to Malta, excellent teamwork skills and a commitment to delivering high-quality results in a professional environment.`;

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
// HANDLER PRINCIPAL - CORREGIDO
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
    console.log(`🏢 Selected company: ${selectedCompany.name} (${selectedCompany.city})`);

    // ✅ CORREGIDO: Solo construir el prompt, NO llamar a OpenAI
    const cvPromptFull = getPremiumCVPrompt(application, selectedCompany);
    const coverPromptFull = getPremiumCoverLetterPrompt(application, selectedCompany);

    console.log("🤖 Generating premium CV content...");
    const cvContent = await generatePremiumCV(application, selectedCompany);
    console.log(`✅ CV content generated`);

    console.log("🤖 Generating premium Cover Letter content...");
    const letterContent = await generatePremiumCoverLetter(application, selectedCompany);
    console.log(`✅ Cover Letter content generated`);

    console.log("📄 Generating CV HTML from template...");
    const cvHtml = generateCVHtml(application, cvContent, selectedCompany);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML from template...");
    const coverHtml = generateCoverHtml(application, letterContent, selectedCompany);
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

    // ✅ CORREGIDO: Guardar el prompt completo (sin límite si es TEXT en Supabase)
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
