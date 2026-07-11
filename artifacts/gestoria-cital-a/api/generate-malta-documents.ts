import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Configuración de Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Configuración de OpenAI con validación
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing");
}
const OPENAI_MODEL = "gpt-4o-mini";
const BUCKET_NAME = "malta-documents";
const OPENAI_TIMEOUT_MS = 90000;

// Función para dividir texto en líneas
function wrapText(text: string, maxLength: number = 85): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine + word + " ";

    if (testLine.length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}

// Función mejorada para llamar a OpenAI y generar contenido
async function generateContent(prompt: string): Promise<{ text: string; tokens?: number }> {
  // ✅ Timeout para OpenAI
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // ✅ Extraer texto de forma robusta
    let text = "";
    if (data.output && data.output.length > 0) {
      const output = data.output[0];
      if (output.content) {
        if (Array.isArray(output.content)) {
          text = output.content
            .map((block: any) => {
              if (block.text && typeof block.text === "string") {
                return block.text.trim();
              }
              if (block.content && typeof block.content === "string") {
                return block.content.trim();
              }
              if (typeof block === "string") {
                return block.trim();
              }
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

// Función para generar CV profesional en inglés (optimizado para Malta)
async function generateCV(applicationData: any): Promise<{ text: string; tokens?: number; prompt: string }> {
  const prompt = `
You are a professional CV writer specialized in the Maltese job market. Create a professional CV in English for a job applicant based on the following information:

PERSONAL INFORMATION:
- Full Name: ${applicationData.full_name || ""}
- Nationality: ${applicationData.nacionalidad || ""}
- WhatsApp: ${applicationData.whatsapp || ""}
- Email: ${applicationData.email || ""}

PROFESSIONAL INFORMATION:
- Profession: ${applicationData.profesion || ""}
- Years of Experience: ${applicationData.anos_experiencia || ""}
- Education: ${applicationData.estudios || ""}
- Current Situation: ${applicationData.current_situation || ""}
- Main Objective: ${applicationData.puesto_busca || ""}

SKILLS & LANGUAGES:
- English Level: ${applicationData.nivel_ingles || ""}
- Other Languages: ${applicationData.otros_idiomas || ""}
- Driving License: ${applicationData.carnet_conducir || "No"}
- Has CV: ${applicationData.tiene_cv || "No"}
- Availability to Travel: ${applicationData.disponibilidad_viajar || "No"}
- Availability Date: ${applicationData.fecha_disponible || ""}

ADDITIONAL INFO:
- Nationality: ${applicationData.nacionalidad || ""}
- Country of Residence: ${applicationData.pais_residencia || ""}
- Plan: ${applicationData.plan_name || ""}

The CV should be:
- Professional and well-structured with UK/European style
- ATS-friendly (Applicant Tracking System optimized)
- In English
- Include sections: Professional Summary, Work Experience, Education, Skills, Languages
- Highlight skills relevant to Malta's job market (hospitality, tourism, logistics, construction, customer service)
- Be approximately 350-400 words
- Use a formal and professional tone
- Include keywords that recruiters in Malta look for
- Format the CV with clear section headers and proper spacing
- Make it specific to the candidate's profession and objectives

Focus on making the candidate stand out for roles in:
- Hospitality (hotels, restaurants, bars)
- Tourism and customer service
- Logistics and warehousing
- Construction and maintenance
- Kitchen and cleaning services
`;

  const result = await generateContent(prompt);
  return {
    text: result.text,
    tokens: result.tokens,
    prompt: prompt,
  };
}

// Función para generar Cover Letter personalizada (optimizado para Malta)
async function generateCoverLetter(applicationData: any): Promise<{ text: string; tokens?: number; prompt: string }> {
  const prompt = `
You are a professional cover letter writer specialized in the Maltese job market. Create a personalized cover letter in English for a job application based on the following information:

PERSONAL INFORMATION:
- Full Name: ${applicationData.full_name || ""}
- Nationality: ${applicationData.nacionalidad || ""}
- WhatsApp: ${applicationData.whatsapp || ""}
- Email: ${applicationData.email || ""}

PROFESSIONAL INFORMATION:
- Profession: ${applicationData.profesion || ""}
- Years of Experience: ${applicationData.anos_experiencia || ""}
- Education: ${applicationData.estudios || ""}
- Main Objective: ${applicationData.puesto_busca || ""}

SKILLS & LANGUAGES:
- English Level: ${applicationData.nivel_ingles || ""}
- Other Languages: ${applicationData.otros_idiomas || ""}
- Driving License: ${applicationData.carnet_conducir || "No"}
- Availability to Travel: ${applicationData.disponibilidad_viajar || "No"}
- Availability Date: ${applicationData.fecha_disponible || ""}

The cover letter should:
- Be professional and persuasive with UK/European style
- In English
- Include a proper letter format (date, recipient, subject)
- Explain why the candidate is suitable for the position in Malta
- Reference their skills and experience relevant to Maltese job market
- Express enthusiasm for working in Malta
- Be approximately 250-300 words
- Use a formal and respectful tone
- End with a call to action and contact details
- Highlight adaptability to multicultural work environment
- Mention availability to start working

Make it specific to the candidate's profession and the Maltese job market.
`;

  const result = await generateContent(prompt);
  return {
    text: result.text,
    tokens: result.tokens,
    prompt: prompt,
  };
}

// Función mejorada para crear PDF a partir de texto
async function createPDF(text: string, title: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { height } = page.getSize();
  const margin = 50;
  let y = height - 60;

  // Título
  page.drawText(title, {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0, 0.45, 0.2),
  });

  y -= 30;

  // Fecha
  page.drawText(`Date: ${new Date().toLocaleDateString("en-US")}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 30;

  // Contenido
  const paragraphs = text.split("\n");
  
  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, 85);

    for (const line of lines) {
      if (y < 70) {
        const newPage = pdfDoc.addPage([595, 842]);
        page = newPage;
        y = 780;

        page.drawText(line, {
          x: margin,
          y,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });

        y -= 18;
      } else {
        page.drawText(line, {
          x: margin,
          y,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });

        y -= 18;
      }
    }

    y -= 10;
  }

  return await pdfDoc.save();
}

// Función para subir PDF a Supabase Storage
async function uploadPDF(pdfBytes: Uint8Array, fileName: string): Promise<string> {
  // ✅ VALIDAR QUE EL BUCKET EXISTE
  const { data: bucket, error: bucketError } = await supabase.storage
    .getBucket(BUCKET_NAME);

  if (bucketError || !bucket) {
    throw new Error(`Bucket "${BUCKET_NAME}" not found: ${bucketError?.message || "Bucket does not exist"}`);
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

// Handler principal
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo aceptar POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Parsear body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { applicationId } = body;

    // Validar applicationId
    if (!applicationId) {
      return res.status(400).json({ error: "applicationId is required" });
    }

    console.log(`📄 Generating documents for application: ${applicationId}`);

    // 1. Leer datos de la aplicación desde Supabase
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

    // ✅ VALIDAR DATOS OBLIGATORIOS ANTES DE GENERAR
    if (!application.email) {
      throw new Error("Application has no email");
    }

    if (!application.full_name) {
      throw new Error("Application has no full name");
    }

    // ✅ COMPROBAR SI YA TIENE DOCUMENTOS GENERADOS
    if (application.cv_generated && application.letter_generated) {
      console.log("⚠️ Documents already generated for this application");
      return res.status(200).json({
        success: true,
        applicationId,
        cvUrl: application.cv_url,
        letterUrl: application.letter_url,
        message: "Documents already generated",
        alreadyGenerated: true,
      });
    }

    const startTime = Date.now();

    // 2. Generar CV con OpenAI
    console.log("🤖 Generating CV...");
    const cvResult = await generateCV(application);
    console.log(`✅ CV generated (${cvResult.text.length} characters)`);

    // 3. Generar Cover Letter con OpenAI
    console.log("🤖 Generating Cover Letter...");
    const coverLetterResult = await generateCoverLetter(application);
    console.log(`✅ Cover Letter generated (${coverLetterResult.text.length} characters)`);

    // 4. Crear PDFs
    console.log("📄 Creating CV PDF...");
    const cvPDF = await createPDF(cvResult.text, "CURRICULUM VITAE");
    
    console.log("📄 Creating Cover Letter PDF...");
    const coverLetterPDF = await createPDF(coverLetterResult.text, "COVER LETTER");

    // 5. Subir PDFs a Supabase Storage
    const timestamp = Date.now();
    const cvFileName = `cv_${applicationId}_${timestamp}.pdf`;
    const letterFileName = `cover_letter_${applicationId}_${timestamp}.pdf`;

    console.log(`📤 Uploading CV PDF: ${cvFileName}`);
    const cvUrl = await uploadPDF(cvPDF, cvFileName);

    console.log(`📤 Uploading Cover Letter PDF: ${letterFileName}`);
    const letterUrl = await uploadPDF(coverLetterPDF, letterFileName);

    console.log("✅ Both PDFs uploaded successfully");

    const totalTime = Date.now() - startTime;

    // 6. Actualizar la aplicación en Supabase
    const { error: updateError } = await supabase
      .from("malta_applications")
      .update({
        cv_generated: true,
        letter_generated: true,
        cv_url: cvUrl,
        letter_url: letterUrl,
        cv_text: cvResult.text,
        letter_text: coverLetterResult.text,
        cv_prompt: cvResult.prompt,
        letter_prompt: coverLetterResult.prompt,
        cv_tokens: cvResult.tokens || 0,
        letter_tokens: coverLetterResult.tokens || 0,
        total_tokens: (cvResult.tokens || 0) + (coverLetterResult.tokens || 0),
        model_used: OPENAI_MODEL,
        generation_time_ms: totalTime,
        documents_generated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("❌ Error updating application:", updateError);
      return res.status(500).json({ 
        error: "Failed to update application",
        details: updateError.message 
      });
    }

    console.log(`✅ Application updated successfully in ${totalTime}ms`);

    // 7. Responder OK
    return res.status(200).json({
      success: true,
      applicationId,
      cvUrl,
      letterUrl,
      cvTokens: cvResult.tokens,
      letterTokens: coverLetterResult.tokens,
      totalTokens: (cvResult.tokens || 0) + (coverLetterResult.tokens || 0),
      generationTimeMs: totalTime,
      message: "Documents generated and uploaded successfully",
    });

  } catch (error: any) {
    console.error("❌ Error in generate-malta-documents:", error);
    
    return res.status(500).json({
      error: "Failed to generate documents",
      details: error.message || "Unknown error",
    });
  }
}
