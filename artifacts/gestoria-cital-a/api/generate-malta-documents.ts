import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

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
// MAPEO DE SECTORES
// ============================================
const SECTOR_TEMPLATES: Record<string, {
  title: string;
  atsKeywords: string[];
  skills: string[];
  companies: string[];
}> = {
  kitchen: {
    title: "Kitchen Assistant",
    atsKeywords: ["food preparation", "hygiene", "HACCP", "cleaning", "inventory"],
    skills: ["Food Preparation", "Kitchen Hygiene", "HACCP", "Inventory Management"],
    companies: ["Hilton Malta", "Radisson Blu", "Corinthia Palace", "Marriott Malta"],
  },
  hotel: {
    title: "Housekeeping Attendant",
    atsKeywords: ["cleaning", "organization", "customer service", "attention to detail"],
    skills: ["Cleaning", "Organization", "Customer Service", "Attention to Detail"],
    companies: ["Hilton Malta", "Corinthia Palace", "Radisson Blu", "The Phoenicia"],
  },
  restaurant: {
    title: "Food & Beverage Assistant",
    atsKeywords: ["customer service", "food safety", "hygiene", "team work"],
    skills: ["Customer Service", "Food Safety", "Hygiene", "Team Collaboration"],
    companies: ["Hilton Malta", "Radisson Blu", "Corinthia Palace", "db Hotels"],
  },
  cleaning: {
    title: "Professional Cleaner",
    atsKeywords: ["cleaning", "hygiene", "organization", "attention to detail"],
    skills: ["Cleaning", "Hygiene", "Organization", "Attention to Detail"],
    companies: ["Hilton Malta", "Corinthia Palace", "Radisson Blu", "The Phoenicia"],
  },
  warehouse: {
    title: "Warehouse Operative",
    atsKeywords: ["inventory", "forklift", "packing", "organization", "safety"],
    skills: ["Inventory Management", "Forklift", "Packing", "Safety"],
    companies: ["DB Schenker", "Kuehne + Nagel", "Malta Freeport", "Express Group"],
  },
  delivery: {
    title: "Delivery Driver",
    atsKeywords: ["driving", "navigation", "time management", "customer service"],
    skills: ["Driving", "Navigation", "Time Management", "Customer Service"],
    companies: ["Bolt Malta", "Wolt Malta", "Glovo Malta", "DHL Malta"],
  },
  construction: {
    title: "Construction Worker",
    atsKeywords: ["building", "safety", "tools", "team work", "physical work"],
    skills: ["Construction", "Safety", "Tools", "Team Work"],
    companies: ["Vassallo Builders", "Hili Company", "Mason Group", "PG Group"],
  },
  aluminium: {
    title: "Aluminium & Carpentry Worker",
    atsKeywords: ["aluminium", "carpentry", "tools", "measurement", "quality"],
    skills: ["Aluminium Work", "Carpentry", "Tools", "Quality Control"],
    companies: ["Vassallo Builders", "Hili Company", "Mason Group", "PG Group"],
  },
  manufacturing: {
    title: "Manufacturing Operative",
    atsKeywords: ["production", "quality", "machinery", "safety", "team work"],
    skills: ["Production", "Quality Control", "Machinery", "Safety"],
    companies: ["ST Microelectronics", "Malta Enterprise", "Venture Global", "Mizzi Group"],
  },
  default: {
    title: "General Worker",
    atsKeywords: ["reliability", "team work", "safety", "quality", "adaptability"],
    skills: ["Reliability", "Team Work", "Safety", "Adaptability"],
    companies: ["Various Maltese Companies"],
  },
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getLevelStars(level: string): string {
  const map: Record<string, string> = {
    basico: "★",
    intermedio: "★★",
    avanzado: "★★★",
    nativo: "★★★★★",
  };
  return map[level] || "★";
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
  if (!value || value === "No") return "Not Available";
  return `Category ${value}`;
}

// ============================================
// ✅ LEER PLANTILLAS HTML - CORREGIDO
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
// PROMPT PREMIUM PARA CV
// ============================================

function getPremiumPrompt(data: any): string {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const expYears = data.anos_experiencia || "sin_experiencia";
  const expMap: Record<string, string> = {
    sin_experiencia: "0 years (entry level - highly motivated)",
    menos_1: "less than 1 year",
    "1_2": "1-2 years",
    "3_5": "3-5 years",
    mas_5: "5+ years",
  };
  const expLabel = expMap[expYears] || expYears;

  const availability = data.disponibilidad_inicio || "inmediato";
  const availabilityMap: Record<string, string> = {
    inmediato: "Immediate",
    "1_semana": "1 week",
    "2_semanas": "2 weeks",
    "1_mes": "1 month",
  };
  const availabilityLabel = availabilityMap[availability] || availability;

  let languagesText = "";
  if (data.idiomas) {
    const idiomas = data.idiomas.split(",").map((i: string) => i.trim());
    const levels: Record<string, string> = {
      basico: "Basic",
      intermedio: "Intermediate",
      avanzado: "Advanced",
      nativo: "Native",
    };
    languagesText = idiomas.map((lang: string) => {
      const levelKey = `${lang.toLowerCase()}_nivel`;
      const level = data[levelKey] || "";
      return `${lang} (${levels[level] || level || "Professional"})`;
    }).join(", ");
  }

  const license = data.carnet_conducir || "No";
  const licenseText = license !== "No" ? `Category ${license}` : "Not available";

  const passport = data.pasaporte_valido || "No";
  const passportText = passport === "Sí" ? "Valid" : "Not available";

  const video = data.entrevista_video || "No";
  const videoText = video === "Sí" ? "Available" : "Not available";

  const randomCompany = template.companies[Math.floor(Math.random() * template.companies.length)];

  return `
You are a senior recruitment specialist with 20 years of experience in the Maltese job market.
Create a PREMIUM, PROFESSIONAL, and EXCEPTIONAL CV for a candidate applying for ${template.title} positions in Malta.

CANDIDATE PROFILE:
- Full Name: ${data.full_name || "N/A"}
- Current Country: ${data.pais_residencia || "N/A"}
- Nationality: ${data.nacionalidad || "N/A"}
- Target Role: ${template.title}
- Experience Level: ${expLabel}
- Education: ${data.estudios || "N/A"}
- Languages: ${languagesText || "English (Professional)"}
- Driver's License: ${licenseText}
- Availability: ${availabilityLabel}
- Valid Passport: ${passportText}
- Video Interview: ${videoText}

ATS KEYWORDS TO INCLUDE:
${template.atsKeywords.map(k => `- ${k}`).join("\n")}

Generate a PREMIUM CV with these sections:

1. EXECUTIVE SUMMARY (4-5 sentences):
   - Powerful, confident opening
   - Unique value proposition
   - Key strengths and what they offer

2. PROFESSIONAL PROFILE (3-4 sentences):
   - Professional identity
   - Core competencies and expertise

3. KEY ACHIEVEMENTS (3-5 bullet points):
   - Specific, measurable achievements

4. CORE COMPETENCIES (10-12 bullet points):
   - Technical and soft skills

5. PROFESSIONAL EXPERIENCE (3-4 bullet points):
   - Write realistic, compelling experience

6. EDUCATION & QUALIFICATIONS:
   - List all education and relevant training

7. LANGUAGES:
   - Format: Language (Level - CEFR)

8. ADDITIONAL INFORMATION:
   - Driver's License: ${licenseText}
   - Valid Passport: ${passportText}
   - Video Interview: ${videoText}
   - Availability: ${availabilityLabel}

Return as JSON:
{
  "summary": "...",
  "profile": "...",
  "achievements": ["...", "...", "..."],
  "competencies": ["...", "...", "...", "..."],
  "experience": ["...", "...", "..."],
  "education": "...",
  "languages": "...",
  "additional": "..."
}
`;
}

async function generatePremiumCV(data: any): Promise<{
  summary: string;
  profile: string;
  achievements: string[];
  competencies: string[];
  experience: string[];
  education: string;
  languages: string;
  additional: string;
  tokens?: number;
}> {
  const prompt = getPremiumPrompt(data);
  const result = await generateContent(prompt);
  
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "",
        profile: parsed.profile || "",
        achievements: parsed.achievements || [],
        competencies: parsed.competencies || [],
        experience: parsed.experience || [],
        education: parsed.education || "",
        languages: parsed.languages || "",
        additional: parsed.additional || "",
        tokens: result.tokens,
      };
    }
    return {
      summary: result.text,
      profile: "",
      achievements: [],
      competencies: [],
      experience: [],
      education: "",
      languages: "",
      additional: "",
      tokens: result.tokens,
    };
  } catch {
    return {
      summary: result.text,
      profile: "",
      achievements: [],
      competencies: [],
      experience: [],
      education: "",
      languages: "",
      additional: "",
      tokens: result.tokens,
    };
  }
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
// PROMPT PARA COVER LETTER
// ============================================

async function generatePremiumCoverLetter(data: any): Promise<{ text: string; tokens?: number }> {
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;
  const randomCompany = template.companies[Math.floor(Math.random() * template.companies.length)];

  const availability = data.disponibilidad_inicio || "inmediato";
  const availabilityMap: Record<string, string> = {
    inmediato: "immediate",
    "1_semana": "1 week",
    "2_semanas": "2 weeks",
    "1_mes": "1 month",
  };
  const availabilityLabel = availabilityMap[availability] || availability;

  const license = data.carnet_conducir || "No";
  const licenseText = license !== "No" ? `Category ${license}` : "not available";

  const passport = data.pasaporte_valido || "No";
  const passportText = passport === "Sí" ? "a valid passport" : "currently processing my passport";

  const video = data.entrevista_video || "No";
  const videoText = video === "Sí" ? "available for immediate video interview" : "available for interview";

  const prompt = `
You are a professional cover letter writer for the Maltese job market.
Write a PREMIUM, PERSUASIVE, and PERSONALIZED cover letter for a candidate applying to ${randomCompany} for a ${template.title} position in Malta.

CANDIDATE:
- Name: ${data.full_name || "N/A"}
- Target Role: ${template.title}
- Target Company: ${randomCompany}
- Experience: ${data.anos_experiencia || "Entry level"}
- Education: ${data.estudios || "N/A"}
- Languages: ${data.idiomas || "English"}
- Driver's License: ${licenseText}
- Availability: ${availabilityLabel}
- Passport: ${passportText}
- Interview: ${videoText}

STRUCTURE:
1. Date (today's date)
2. Subject line: "Application for ${template.title} - ${data.full_name || "Candidate"}"
3. Professional salutation
4. OPENING: Hook them with why you're the perfect fit
5. BODY 1: Your relevant experience and skills
6. BODY 2: Why Malta and ${randomCompany}
7. BODY 3: Availability and next steps
8. CLOSING: Strong call to action
9. Signature

Write the complete cover letter.`;

  const result = await generateContent(prompt);
  return {
    text: result.text,
    tokens: result.tokens,
  };
}

// ============================================
// RENDERIZAR HTML → PDF CON PLAYWRIGHT
// ============================================

async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
// GENERAR HTML DEL CV - USANDO PLANTILLA PREMIUM CON CSS
// ============================================

function generateCVHtml(
  data: any,
  content: {
    summary: string;
    profile: string;
    achievements: string[];
    competencies: string[];
    experience: string[];
    education: string;
    languages: string;
    additional: string;
  }
): string {
  // ✅ Leer plantilla premium
  let template = readTemplate("premium-cv.html");
  const css = readTemplate("premium-style.css");
  
  // ✅ Insertar CSS antes de </head> (más robusto)
  if (template.includes("</head>")) {
    template = template.replace(
      "</head>",
      `<style>${css}</style></head>`
    );
  }
  
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const templateData = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;

  const initials = getInitials(data.full_name);
  const availability = getAvailabilityLabel(data.disponibilidad_inicio || "inmediato");
  const expLabel = getExperienceLabel(data.anos_experiencia || "");
  const eduLabel = getEducationLabel(data.estudios || "");
  const licenseLabel = getDriverLicenseLabel(data.carnet_conducir || "");

  // Construir idiomas
  let languagesHtml = "";
  if (data.idiomas) {
    const idiomas = data.idiomas.split(",").map((i: string) => i.trim());
    for (const idioma of idiomas) {
      const nivelKey = `${idioma.toLowerCase()}_nivel`;
      const nivel = data[nivelKey] || "";
      const stars = getLevelStars(nivel);
      const levelLabel = getLanguageLevel(nivel);
      languagesHtml += `
        <div class="language-item">
          <span class="language-name">${idioma}</span>
          <span class="language-level">${stars} ${levelLabel}</span>
        </div>
      `;
    }
  }

  // Construir competencias
  let competenciesHtml = "";
  for (const comp of content.competencies) {
    competenciesHtml += `<li>${comp}</li>`;
  }

  // Construir logros
  let achievementsHtml = "";
  for (const ach of content.achievements) {
    achievementsHtml += `<li>${ach}</li>`;
  }

  // Construir experiencia
  let experienceHtml = "";
  for (const exp of content.experience) {
    experienceHtml += `<li>${exp}</li>`;
  }

  // ✅ Reemplazar variables en la plantilla premium
  const photoHtml = data.photo_url 
    ? `<img src="${data.photo_url}" alt="Photo" class="photo-img">` 
    : `<div class="photo-initials">${initials}</div>`;

  const replacements: Record<string, string> = {
    "{{PHOTO}}": photoHtml,
    "{{NAME}}": data.full_name || "Candidate",
    "{{TITLE}}": templateData.title,
    "{{WHATSAPP}}": data.whatsapp || "N/A",
    "{{EMAIL}}": data.email || "N/A",
    "{{NATIONALITY}}": data.nacionalidad || "N/A",
    "{{LANGUAGES}}": languagesHtml,
    "{{DRIVER_LICENSE}}": licenseLabel,
    "{{AVAILABILITY}}": availability,
    "{{SUMMARY}}": content.summary || "Professional summary",
    "{{PROFILE}}": content.profile || "Professional profile",
    "{{ACHIEVEMENTS}}": achievementsHtml,
    "{{COMPETENCIES}}": competenciesHtml,
    "{{EXPERIENCE}}": experienceHtml,
    "{{EXPERIENCE_YEARS}}": expLabel,
    "{{EDUCATION}}": `${eduLabel}${content.education ? ` — ${content.education}` : ''}`,
    "{{COMPETENCIES_GRID}}": competenciesHtml,
    "{{ADDITIONAL}}": content.additional || "Available for immediate start in Malta",
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, "g"), value);
  }

  return template;
}

// ============================================
// GENERAR HTML DE LA COVER LETTER - USANDO PLANTILLA PREMIUM CON CSS
// ============================================

function generateCoverHtml(data: any, content: string): string {
  // ✅ Leer plantilla premium
  let template = readTemplate("premium-cover-letter.html");
  const css = readTemplate("premium-style.css");
  
  // ✅ Insertar CSS antes de </head> (más robusto)
  if (template.includes("</head>")) {
    template = template.replace(
      "</head>",
      `<style>${css}</style></head>`
    );
  }
  
  const sector = data.sectores ? data.sectores.split(",")[0]?.trim()?.toLowerCase() : "default";
  const templateData = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.default;
  
  // Seleccionar empresa aleatoria
  const randomCompany = templateData.companies[Math.floor(Math.random() * templateData.companies.length)];
  
  // Fecha actual formateada
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Direcciones de empresas (ejemplo)
  const companyAddresses: Record<string, string> = {
    "Hilton Malta": "Portomaso, St. Julian's, Malta",
    "Radisson Blu": "St. Julian's, Malta",
    "Corinthia Palace": "San Anton, Attard, Malta",
    "Marriott Malta": "Balluta Bay, St. Julian's, Malta",
    "The Phoenicia": "Floriana, Malta",
    "db Hotels": "Sliema, Malta",
    "DB Schenker": "Mriehel, Malta",
    "Kuehne + Nagel": "Mriehel, Malta",
    "Malta Freeport": "Birzebbuga, Malta",
    "Express Group": "Qormi, Malta",
    "Bolt Malta": "Sliema, Malta",
    "Wolt Malta": "Birkirkara, Malta",
    "Glovo Malta": "Birkirkara, Malta",
    "DHL Malta": "Mriehel, Malta",
    "UPS Malta": "Mriehel, Malta",
    "Vassallo Builders": "Naxxar, Malta",
    "Hili Company": "Mosta, Malta",
    "Mason Group": "Mriehel, Malta",
    "PG Group": "Mriehel, Malta",
    "ST Microelectronics": "Kirkop, Malta",
    "Malta Enterprise": "Gwardamangia, Malta",
    "Venture Global": "Mriehel, Malta",
    "Mizzi Group": "Mriehel, Malta",
    "Alf Malta": "Qormi, Malta",
    "Various Maltese Companies": "Malta",
  };

  const companyAddress = companyAddresses[randomCompany] || "Malta";

  // Extraer las partes de la carta
  const paragraphs = content.split("\n").filter((p: string) => p.trim());
  
  // Asignar párrafos a las variables
  let introduction = paragraphs[0] || "I am writing to express my interest in the position.";
  let body1 = paragraphs[1] || "I have experience in the sector and I am highly motivated.";
  let body2 = paragraphs[2] || "I am particularly interested in working in Malta.";
  let body3 = paragraphs[3] || "I am available to start immediately.";
  let closing = paragraphs[4] || "I look forward to hearing from you.";

  // Si hay más párrafos, combinarlos
  if (paragraphs.length > 5) {
    const extra = paragraphs.slice(4, paragraphs.length - 1).join(" ");
    body3 = body3 + " " + extra;
  }

  // Saludo dinámico - usando la empresa real
  const greetingOptions = [
    "Dear Hiring Manager,",
    "Dear Recruitment Team,",
    "Dear Human Resources Manager,",
    `Dear ${randomCompany} Recruitment Team,`,
  ];
  const greeting = greetingOptions[Math.floor(Math.random() * greetingOptions.length)];

  // ✅ Reemplazar variables en la plantilla premium
  const replacements: Record<string, string> = {
    "{{NAME}}": data.full_name || "Candidate",
    "{{TITLE}}": templateData.title,
    "{{EMAIL}}": data.email || "N/A",
    "{{WHATSAPP}}": data.whatsapp || "N/A",
    "{{NATIONALITY}}": data.nacionalidad || "N/A",
    "{{DRIVER_LICENSE}}": getDriverLicenseLabel(data.carnet_conducir || ""),
    "{{DATE}}": dateStr,
    "{{COMPANY}}": randomCompany,
    "{{COMPANY_ADDRESS}}": companyAddress,
    "{{GREETING}}": greeting,
    "{{INTRODUCTION}}": introduction,
    "{{BODY_1}}": body1,
    "{{BODY_2}}": body2,
    "{{BODY_3}}": body3,
    "{{CLOSING}}": closing,
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

    console.log(`📄 Generating premium CV for application: ${applicationId}`);

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
    console.log(`📸 Photo URL: ${application.photo_url || "No photo"}`);

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

    // 1. Generar contenido
    console.log("🤖 Generating premium CV content...");
    const cvContent = await generatePremiumCV(application);
    console.log(`✅ CV content generated`);

    console.log("🤖 Generating premium Cover Letter...");
    const coverLetter = await generatePremiumCoverLetter(application);
    console.log(`✅ Cover Letter generated`);

    // 2. Generar HTML desde plantillas
    console.log("📄 Generating CV HTML from template...");
    const cvHtml = generateCVHtml(application, cvContent);
    console.log(`✅ CV HTML generated (${cvHtml.length} chars)`);

    console.log("📄 Generating Cover Letter HTML from template...");
    const coverHtml = generateCoverHtml(application, coverLetter.text);
    console.log(`✅ Cover Letter HTML generated (${coverHtml.length} chars)`);

    // 3. Convertir HTML → PDF con Playwright
    console.log("🖨️ Converting CV HTML to PDF...");
    const cvPdf = await renderPdfFromHtml(cvHtml);
    console.log(`✅ CV PDF generated (${cvPdf.length} bytes)`);

    console.log("🖨️ Converting Cover Letter HTML to PDF...");
    const coverPdf = await renderPdfFromHtml(coverHtml);
    console.log(`✅ Cover Letter PDF generated (${coverPdf.length} bytes)`);

    // 4. Subir a Supabase
    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    console.log(`📤 Uploading CV PDF...`);
    const cvUrl = await uploadPDF(cvPdf, cvFileName);

    console.log(`📤 Uploading Cover Letter PDF...`);
    const letterUrl = await uploadPDF(coverPdf, letterFileName);

    console.log("✅ Both PDFs uploaded successfully");

    const totalTime = Date.now() - startTime;

    // 5. Actualizar Supabase
    const updateData: any = {
      cv_generated: true,
      letter_generated: true,
      cv_url: cvUrl,
      letter_url: letterUrl,
      cv_text: cvContent.summary,
      letter_text: coverLetter.text,
      cv_html: cvHtml,
      letter_html: coverHtml,
      cv_prompt: "Premium recruiter prompt - HTML template",
      letter_prompt: "Premium cover letter prompt - HTML template",
      cv_tokens: cvContent.tokens || 0,
      letter_tokens: coverLetter.tokens || 0,
      total_tokens: (cvContent.tokens || 0) + (coverLetter.tokens || 0),
      model_used: OPENAI_MODEL,
      generation_time_ms: totalTime,
      documents_generated_at: new Date().toISOString(),
      worker_ready: true,
      worker_status: "ready",
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

    // 6. ✅ AÑADIR A LA COLA DEL WORKER
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
      cvTokens: cvContent.tokens || 0,
      letterTokens: coverLetter.tokens || 0,
      totalTokens: (cvContent.tokens || 0) + (coverLetter.tokens || 0),
      generationTimeMs: totalTime,
      photoUsed: !!application.photo_url,
      workerQueued: true,
      message: "Premium CV generated successfully",
    });

  } catch (error: any) {
    console.error("❌ Error in generate-malta-documents:", error);
    
    return res.status(500).json({
      error: "Failed to generate documents",
      details: error.message || "Unknown error",
    });
  }
}
