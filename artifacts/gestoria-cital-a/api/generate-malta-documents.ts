// ============================================
// FUNCIONES PARA GENERAR CV Y CARTA
// ============================================

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
// FUNCIONES PARA GENERAR HTML Y SUBIR PDF
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
// FUNCIÓN PARA SUBIR PDF
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
