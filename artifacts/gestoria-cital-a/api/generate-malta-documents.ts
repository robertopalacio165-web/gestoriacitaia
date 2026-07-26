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
// COPIAR ARCHIVOS EXISTENTES
// ============================================

async function copyExistingFile(
  sourceUrl: string,
  destinationFile: string,
  contentType = "application/octet-stream"
) {
  if (!sourceUrl) return;

  const response = await fetch(sourceUrl);

  if (!response.ok) {
    console.log("No se pudo descargar:", sourceUrl);
    return;
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  await supabase.storage
    .from(BUCKET_NAME)
    .upload(destinationFile, bytes, {
      upsert: true,
      contentType,
    });

  console.log("Copiado:", destinationFile);
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

    // --- NUEVO: Crear carpeta con nombre normalizado ---
    const folder = (application.full_name || "candidate")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const cvFileName = `${folder}/CV.pdf`;
    const letterFileName = `${folder}/CoverLetter.pdf`;

    console.log(`📁 Folder: ${folder}`);
    console.log(`📄 CV Path: ${cvFileName}`);
    console.log(`📄 Cover Letter Path: ${letterFileName}`);

    console.log(`📤 Uploading CV PDF...`);
    const cvUrl = await uploadPDF(cvPdf, cvFileName);

    console.log(`📤 Uploading Cover Letter PDF...`);
    const letterUrl = await uploadPDF(coverPdf, letterFileName);

    // --- NUEVO: Copiar archivos existentes ---
    if (application.pdf_url) {
      const extension =
        application.pdf_url.split(".").pop()?.split("?")[0] || "pdf";

      await copyExistingFile(
        application.pdf_url,
        `${folder}/original-document.${extension}`,
        "application/pdf"
      );
    }

    if (application.photo_url) {
      const extension =
        application.photo_url.split(".").pop()?.split("?")[0] || "jpg";

      await copyExistingFile(
        application.photo_url,
        `${folder}/photo.${extension}`,
        `image/${extension}`
      );
    }

    console.log("✅ All files uploaded successfully");

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
