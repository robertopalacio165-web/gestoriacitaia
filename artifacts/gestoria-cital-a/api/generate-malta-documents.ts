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
// EMPRESAS REALES DE MARRUECOS (ampliado)
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
    { name: "Restaurant La Kasbah", city: "Ouarzazate", type: "Restaurant" },
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
  ],
  delivery: [
    { name: "DHL Express Morocco", city: "Casablanca", type: "Delivery" },
    { name: "UPS Morocco", city: "Casablanca", type: "Delivery" },
    { name: "FedEx Morocco", city: "Casablanca", type: "Delivery" },
    { name: "Glovo Morocco", city: "Casablanca", type: "Delivery" },
    { name: "Jumia Food Morocco", city: "Casablanca", type: "Delivery" },
    { name: "Delivery Logistics", city: "Rabat", type: "Delivery" },
    { name: "Tanger Logistics", city: "Tangier", type: "Delivery" },
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
  ],
  default: [
    { name: "Global Services", city: "Casablanca", type: "Services" },
    { name: "International Group", city: "Rabat", type: "Services" },
    { name: "Modern Solutions", city: "Marrakech", type: "Services" },
    { name: "Premium Services", city: "Agadir", type: "Services" },
  ],
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
  default: [
    "General Worker", "Operative", "Assistant",
    "Team Member", "Support Worker"
  ]
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
// LISTA COMPLETA DE HABILIDADES (40+)
// ============================================
const ALL_SKILLS = [
  // Hard Skills
  "Food Preparation", "Knife Skills", "HACCP Compliance",
  "Stock Management", "Cleaning Procedures", "Cooking Techniques",
  "Inventory Control", "Food Safety", "Quality Control",
  "Bricklaying", "Concrete Work", "Power Tools Operation",
  "Blueprint Reading", "Safety Protocols", "Heavy Machinery",
  "Forklift Operation", "Loading & Unloading", "Order Picking",
  "Route Planning", "Vehicle Maintenance", "Driving",
  "Deep Cleaning", "Sanitization", "Production",
  "Assembly", "Packaging", "Maintenance",
  "Machinery Operation", "Quality Assurance", "Industrial Safety",
  
  // Soft Skills
  "Teamwork", "Time Management", "Communication",
  "Problem Solving", "Adaptability", "Reliability",
  "Punctuality", "Multicultural Communication", "Customer Service",
  "Organization", "Attention to Detail", "Fast Learning",
  "Flexible Schedule", "Physical Stamina", "Stress Management",
  "Decision Making", "Leadership", "Conflict Resolution"
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

function getRandomDateRange(): { start: string; end: string } {
  const yearRanges = [
    { start: 2019, end: 2021 },
    { start: 2020, end: 2022 },
    { start: 2021, end: 2023 },
    { start: 2022, end: 2024 },
    { start: 2018, end: 2020 },
    { start: 2020, end: 2023 },
    { start: 2019, end: 2022 },
  ];
  
  const range = getRandomItem(yearRanges);
  const months = ["January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"];
  
  const startMonth = getRandomItem(months);
  const endMonth = getRandomItem(months);
  
  return {
    start: `${startMonth} ${range.start}`,
    end: `${endMonth} ${range.end}`
  };
}

function getRandomAchievement(): string {
  const achievements = [
    "Improved food preparation speed by 20%",
    "Maintained 100% HACCP compliance standards",
    "Prepared meals for up to 150 guests daily",
    "Supported Head Chef in high-volume service",
    "Reduced kitchen waste through improved stock rotation",
    "Maintained clean and organized workstations",
    "Assisted with buffet preparation for large events",
    "Prepared breakfast service for hotel guests",
    "Received 'Employee of the Month' recognition",
    "Contributed to 4.5-star hotel rating",
    "Successfully handled peak season operations",
    "Trained new staff members on safety procedures",
    "Maintained zero safety incidents for 2 years",
    "Improved inventory accuracy by 15%",
    "Consistently met performance targets",
    "Recognized for exceptional customer service"
  ];
  return getRandomItem(achievements);
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function normalizeYesNo(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = String(value).toLowerCase().trim();
  return normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true";
}

// ============================================
// GENERAR CV CON IA - VERSIÓN PREMIUM
// ============================================

async function generatePremiumCV(data: any, hasUserCV: boolean): Promise<{
  summary: string;
  coreCompetencies: string[];
  experience: string[];
  achievements: string[];
  skills: string[];
  softSkills: string[];
  technicalSkills: string[];
  education: string;
  certificates: string[];
  jobTitle: string;
  company: any;
  city: string;
  tokens?: number;
}> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const companies = MOROCCAN_COMPANIES[sector] || MOROCCAN_COMPANIES.default;
  
  // Seleccionar 3 empresas y elegir una aleatoriamente
  const selectedCompanies = getRandomItems(companies, Math.min(3, companies.length));
  const selectedCompany = getRandomItem(selectedCompanies);
  
  const selectedCity = data.current_city || getRandomItem(MOROCCAN_CITIES);
  const dateRange = getRandomDateRange();
  
  // Títulos de puesto
  const titles = JOB_TITLES[sector] || JOB_TITLES.default;
  const jobTitle = getRandomItem(titles);
  
  // Habilidades: seleccionar 10-12 aleatorias
  const allSkills = ALL_SKILLS;
  const selectedSkills = getRandomItems(allSkills, 12);
  const softSkills = getRandomItems(allSkills.filter(s => 
    ["Teamwork", "Time Management", "Communication", "Problem Solving", 
     "Adaptability", "Reliability", "Punctuality", "Multicultural Communication",
     "Customer Service", "Organization", "Attention to Detail", "Fast Learning",
     "Flexible Schedule", "Physical Stamina", "Stress Management"].includes(s)
  ), 5);
  
  const technicalSkills = selectedSkills.filter(s => !softSkills.includes(s));
  
  const añosExperiencia = data.anos_experiencia || "3-5 years";
  const expLabel = añosExperiencia.replace(/_/g, " ");

  // Si el usuario tiene CV, la IA lo mejora en lugar de inventar
  const cvInstruction = hasUserCV 
    ? `IMPORTANT: The user has uploaded their own CV. IMPROVE their existing experience. Keep their REAL company names, dates, and roles. Make it more professional and ATS-friendly.`
    : `IMPORTANT: The user does NOT have a CV. CREATE realistic professional experience for them.`;

  const prompt = `
You are a professional CV writer for the European job market. Generate ONLY the narrative sections of a CV.

CANDIDATE INFORMATION:
- Name: ${data.full_name || "Candidate"}
- Position: ${jobTitle}
- Target Company: ${selectedCompany.name} (${selectedCompany.city}, Morocco)
- Experience Level: ${expLabel}
- Nationality: ${data.nationality || "Moroccan"}
- Current City: ${selectedCity}
- Education: ${data.education_level || "Secondary Education"}

${cvInstruction}

INSTRUCTIONS:
1. Generate a UNIQUE CV for this candidate
2. Use REAL Moroccan companies, hotels, and restaurants
3. NEVER repeat the same company twice
4. NEVER use "Present" - always use specific dates
5. Create HUMAN-SOUNDING, ATS-FRIENDLY content
6. Write in PERFECT British English
7. Make each CV completely DIFFERENT

${hasUserCV ? '8. PRESERVE the user\'s real experience from their CV' : '8. CREATE realistic experience for the user'}

Generate ONLY these sections as JSON:
{
  "summary": "4-5 sentence professional summary",
  "coreCompetencies": ["5-7 core competencies"],
  "experience": ["5-7 bullet points describing responsibilities"],
  "achievements": ["3-5 specific achievements with numbers"],
  "skills": ["10-12 skills"],
  "softSkills": ["4-5 soft skills"],
  "technicalSkills": ["4-5 technical skills"],
  "education": "Education description",
  "certificates": ["2-3 certificates"]
}

Return ONLY valid JSON.`;

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
        summary: parsed.summary || "",
        coreCompetencies: parsed.coreCompetencies || [],
        experience: parsed.experience || [],
        achievements: parsed.achievements || [],
        skills: parsed.skills || selectedSkills,
        softSkills: parsed.softSkills || softSkills,
        technicalSkills: parsed.technicalSkills || technicalSkills,
        education: parsed.education || "",
        certificates: parsed.certificates || [],
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
      achievements: [],
      skills: selectedSkills,
      softSkills: softSkills,
      technicalSkills: technicalSkills,
      education: "",
      certificates: [],
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
// GENERAR CARTA CON IA - VERSIÓN PREMIUM
// ============================================

async function generatePremiumCoverLetter(data: any, company: any, jobTitle: string): Promise<{
  introduction: string;
  body1: string;
  body2: string;
  body3: string;
  closing: string;
  tokens?: number;
}> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";

  const prompt = `
You are a professional cover letter writer for the European job market.

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

  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";

  // PHOTO
  const initials = getInitials(data.full_name);
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="${fullName}" class="profile-photo">` 
    : `<div class="initials">${initials}</div>`;

  // LANGUAGES
  let languagesHtml = "";
  const idiomas = data.idiomas ? data.idiomas.split(",").map((i: string) => i.trim()) : ["English"];
  const levels: Record<string, string> = {
    english: "Fluent",
    arabic: "Native",
    french: "Advanced",
    spanish: "Intermediate",
    italian: "Beginner",
    german: "Beginner"
  };
  
  for (const idioma of idiomas) {
    const level = levels[idioma.toLowerCase()] || "Fluent";
    languagesHtml += `
      <div class="lang-item">
        <span class="lang-name">${idioma}</span>
        <span class="lang-level">${level}</span>
      </div>
    `;
  }

  // EXPERIENCE
  const experienceBullets = content.experience || [];
  const experienceHtml = experienceBullets.map((exp: string) => 
    `<li class="exp-bullet">${exp}</li>`
  ).join("");

  // ACHIEVEMENTS
  const achievements = content.achievements || [];
  const achievementsHtml = achievements.map((ach: string) => 
    `<li class="achievement-bullet">${ach}</li>`
  ).join("");

  // COMPETENCIES
  const competencies = content.coreCompetencies || [];
  const competenciesHtml = competencies.map((comp: string) => 
    `<span class="competency-tag">${comp}</span>`
  ).join("");

  // SKILLS
  const skills = content.skills || [];
  const skillsHtml = skills.map((skill: string) => 
    `<span class="skill-tag">${skill}</span>`
  ).join("");

  // SOFT SKILLS
  const softSkills = content.softSkills || [];
  const softSkillsHtml = softSkills.map((skill: string) => 
    `<span class="soft-skill-tag">${skill}</span>`
  ).join("");

  // TECHNICAL SKILLS
  const technicalSkills = content.technicalSkills || [];
  const technicalSkillsHtml = technicalSkills.map((skill: string) => 
    `<span class="tech-skill-tag">${skill}</span>`
  ).join("");

  // CERTIFICATES
  const certificates = content.certificates || [];
  const certificatesHtml = certificates.map((cert: string) => 
    `<li class="cert-bullet">${cert}</li>`
  ).join("");

  // REPLACEMENTS
  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{FIRST_NAME}}": firstName,
    "{{LAST_NAME}}": lastName,
    "{{JOB_TITLE}}": content.jobTitle || "",
    "{{CITY}}": city,
    "{{COMPANY_NAME}}": company.name,
    "{{COMPANY_CITY}}": company.city,
    "{{COMPANY_TYPE}}": company.type || "",
    "{{NATIONALITY}}": data.nationality || "Moroccan",
    "{{EMAIL}}": data.email || "",
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{DRIVER_LICENSE}}": data.carnet_conducir || "No",
    "{{EDUCATION}}": content.education || data.education_level || "Secondary Education",
    "{{EXPERIENCE_YEARS}}": data.anos_experiencia || "3-5 years",
    "{{SUMMARY}}": content.summary || "",
    "{{CORE_COMPETENCIES}}": competenciesHtml,
    "{{EXPERIENCE_LIST}}": experienceHtml,
    "{{ACHIEVEMENTS_LIST}}": achievementsHtml,
    "{{LANGUAGES}}": languagesHtml,
    "{{SKILLS}}": skillsHtml,
    "{{SOFT_SKILLS}}": softSkillsHtml,
    "{{TECHNICAL_SKILLS}}": technicalSkillsHtml,
    "{{CERTIFICATES}}": certificatesHtml,
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
    ? `<img src="${data.photo_url}" alt="${fullName}" class="profile-photo">` 
    : `<div class="initials">${initials}</div>`;

  const replacements: Record<string, string> = {
    "{{PHOTO_HTML}}": photoHtml,
    "{{FULL_NAME}}": fullName,
    "{{FIRST_NAME}}": firstName,
    "{{LAST_NAME}}": lastName,
    "{{JOB_TITLE}}": jobTitle,
    "{{CITY}}": city,
    "{{COMPANY_NAME}}": company.name,
    "{{COMPANY_CITY}}": company.city,
    "{{COMPANY_TYPE}}": company.type || "",
    "{{EMAIL}}": data.email || "",
    "{{WHATSAPP}}": data.whatsapp || "",
    "{{NATIONALITY}}": data.nationality || "Moroccan",
    "{{DATE}}": dateStr,
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

    // Obtener datos de la aplicación
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
    console.log(`📄 cv_url: ${application.cv_url || "No CV"}`);
    console.log(`📎 pdf_url: ${application.pdf_url || "No PDF"}`);

    // Verificar si el usuario tiene CV
    const hasUserCV = !!application.cv_url && application.cv_url.trim() !== "";
    console.log(`📋 Has user CV: ${hasUserCV}`);

    // Generar CV
    console.log("🤖 Generating premium CV...");
    const cvContent = await generatePremiumCV(application, hasUserCV);
    console.log(`✅ CV generated with ${cvContent.tokens || 0} tokens`);
    console.log(`   Job Title: ${cvContent.jobTitle}`);
    console.log(`   Company: ${cvContent.company.name} (${cvContent.company.city})`);

    // Generar carta
    console.log("🤖 Generating premium cover letter...");
    const letterContent = await generatePremiumCoverLetter(application, cvContent.company, cvContent.jobTitle);
    console.log(`✅ Cover letter generated with ${letterContent.tokens || 0} tokens`);

    // Generar HTML del CV
    console.log("📄 Generating CV HTML...");
    const cvHtml = generateCVHtml(application, cvContent, cvContent.company, cvContent.city);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    // Generar HTML de la carta
    console.log("📄 Generating Cover Letter HTML...");
    const coverHtml = generateCoverHtml(application, letterContent, cvContent.company, cvContent.city, cvContent.jobTitle);
    console.log(`✅ Cover Letter HTML generated (${coverHtml.length} chars)`);

    // Convertir a PDF
    console.log("🖨️ Converting CV to PDF...");
    const cvPdf = await renderPdfFromHtml(cvHtml);
    console.log(`✅ CV PDF generated (${cvPdf.length} bytes)`);

    console.log("🖨️ Converting Cover Letter to PDF...");
    const coverPdf = await renderPdfFromHtml(coverHtml);
    console.log(`✅ Cover Letter PDF generated (${coverPdf.length} bytes)`);

    // Subir a Supabase
    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    console.log("📤 Uploading CV PDF...");
    const cvUrl = await uploadPDF(cvPdf, cvFileName);

    console.log("📤 Uploading Cover Letter PDF...");
    const letterUrl = await uploadPDF(coverPdf, letterFileName);

    console.log("✅ Both PDFs uploaded successfully");

    // Generar texto completo de la carta
    const fullLetterText = `${letterContent.introduction}\n\n${letterContent.body1}\n\n${letterContent.body2}\n\n${letterContent.body3}\n\n${letterContent.closing}`;

    // Actualizar aplicación con TODOS los datos
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
      
      // ✅ Guardar todos los datos generados por IA para no tener que regenerarlos
      ai_summary: cvContent.summary,
      ai_experience: cvContent.experience || [],
      ai_skills: cvContent.skills || [],
      ai_languages: application.idiomas ? application.idiomas.split(",").map((i: string) => i.trim()) : [],
      ai_cover_letter: fullLetterText,
      ai_job_title: cvContent.jobTitle,
      ai_core_competencies: cvContent.coreCompetencies || [],
      ai_achievements: cvContent.achievements || [],
      ai_soft_skills: cvContent.softSkills || [],
      ai_technical_skills: cvContent.technicalSkills || [],
      ai_certificates: cvContent.certificates || [],
      ai_education: cvContent.education || application.education_level || "",
      
      // Si el usuario tiene CV original, guardarlo
      original_cv_url: application.cv_url || "",
      has_user_cv: hasUserCV,
    };

    // Si hay foto, guardar la URL
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

    // Añadir a worker queue
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
