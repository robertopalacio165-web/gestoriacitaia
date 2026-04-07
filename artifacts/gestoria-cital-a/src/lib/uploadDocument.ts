import { supabase } from "@/lib/supabaseClient";

type UploadDocumentParams = {
  file: File;
  documentType: string;
  title: string;
  verification_status?: "needs_review" | "verified" | "rejected";
  verification_notes?: string;
  extracted_data?: Record<string, any>;
  case_id?: string | null;
  bucket?: string;
  is_required?: boolean;
  description?: string | null;
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/1eds89bv5j26urck6m96kogvlgszvtlc";

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function sanitizeFolderName(name: string) {
  return sanitizeFileName(name || "general") || "general";
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "bin";
}

function getDocumentCategory(documentType: string) {
  const value = (documentType || "").toLowerCase().trim();

  if (
    value.includes("pasaporte") ||
    value.includes("passport")
  ) {
    return "identity_document";
  }

  if (
    value.includes("dni") ||
    value.includes("nie") ||
    value.includes("id_card") ||
    value.includes("documento_identidad")
  ) {
    return "identity_document";
  }

  if (
    value.includes("foto") ||
    value.includes("photo") ||
    value.includes("fotografia") ||
    value.includes("selfie")
  ) {
    return "photo";
  }

  if (
    value.includes("empadronamiento") ||
    value.includes("padron") ||
    value.includes("certificado")
  ) {
    return "certificate";
  }

  if (
    value.includes("tasa") ||
    value.includes("fee") ||
    value.includes("payment") ||
    value.includes("pago")
  ) {
    return "payment_document";
  }

  if (
    value.includes("formulario") ||
    value.includes("solicitud") ||
    value.includes("application_form")
  ) {
    return "form";
  }

  return "general_document";
}

async function getProfileData(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name, phone, nie, dni, passport_number, nationality")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("load profile for uploadDocument error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("load profile for uploadDocument fatal error:", error);
    return null;
  }
}

export async function uploadDocument({
  file,
  documentType,
  title,
  verification_status = "needs_review",
  verification_notes = "Documento recibido. Pendiente de revisión.",
  extracted_data = {},
  case_id = null,
  bucket = "user-documents",
  is_required = true,
  description = null,
}: UploadDocumentParams) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("auth.getUser error:", userError);
    throw new Error(`No se pudo obtener el usuario: ${userError.message}`);
  }

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  if (!file) {
    throw new Error("No hay archivo para subir");
  }

  if (file.size <= 0) {
    throw new Error("El archivo está vacío");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("El archivo supera el límite de 15 MB");
  }

  const ext = getFileExtension(file.name);
  const originalBaseName = file.name.replace(/\.[^/.]+$/, "");
  const normalizedBaseName = sanitizeFileName(originalBaseName) || "documento";
  const safeName = `${Date.now()}-${normalizedBaseName}.${ext}`;

  const folder = sanitizeFolderName(documentType);
  const filePath = `${user.id}/${folder}/${safeName}`;

  const mimeType = file.type || "application/octet-stream";
  const isPdf = ext === "pdf" || mimeType === "application/pdf";
  const isImage =
    mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(ext);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (uploadError) {
    console.error("storage upload error:", uploadError);
    throw new Error(`Error al subir al storage: ${uploadError.message}`);
  }

  const profile = await getProfileData(user.id);

  const finalUserEmail =
    user.email?.trim() || profile?.email?.trim() || "no-email@error.com";
  const finalUserFullName = profile?.full_name?.trim() || "";
  const finalUserPhone = profile?.phone?.trim() || "";
  const finalUserNie = profile?.nie?.trim() || "";
  const finalUserDni = profile?.dni?.trim() || "";
  const finalUserPassportNumber = profile?.passport_number?.trim() || "";
  const finalUserNationality = profile?.nationality?.trim() || "";

  const displayTitle = title?.trim() || originalBaseName || normalizedBaseName;
  const documentCategory = getDocumentCategory(folder);
  const uploadedAt = new Date().toISOString();

  try {
    const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "document_uploaded",
        source: "gestoriacitaia",
        uploaded_at: uploadedAt,

        user_id: user.id,
        case_id,

        nombre: finalUserFullName || "cliente",
        email: finalUserEmail,
        telefono: finalUserPhone,
        nie: finalUserNie,
        dni: finalUserDni,
        passport_number: finalUserPassportNumber,
        nationality: finalUserNationality,

        documento: safeName,
        title: displayTitle,
        description: description || "",
        document_type: folder,
        document_category: documentCategory,
        original_name: file.name,

        file_path: filePath,
        bucket,
        mime_type: mimeType,
        extension: ext,
        file_size: file.size,
        is_pdf: isPdf,
        is_image: isImage,

        verification_status,
        verification_notes,
        ai_result: "pending",
        is_valid: null,

        panel_url: "https://gestoriacitaia.com/panel",

        whatsapp_ready: true,
        email_ready: true,
        review_required: true,
        twilio_channel: "make",
      }),
    });

    console.log("make webhook status:", webhookResponse.status);

    if (!webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      console.error(
        "make webhook response error:",
        webhookResponse.status,
        responseText
      );
    }
  } catch (webhookError) {
    console.error("make webhook error:", webhookError);
  }

  const payload = {
    user_id: user.id,
    case_id,
    document_type: folder,
    title: displayTitle,
    description,
    storage_bucket: bucket,
    file_path: filePath,
    original_name: file.name,
    mime_type: mimeType,
    file_size: file.size,

    verification_status,
    verification_notes,
    reviewed_by: "system",
    reviewed_at: null,
    is_required,

    extracted_data: {
      ...extracted_data,

      original_name: file.name,
      safe_name: safeName,
      display_name: displayTitle,
      normalized_title: normalizedBaseName,

      extension: ext,
      mime_type: mimeType,
      size_bytes: file.size,

      document_type: folder,
      document_category: documentCategory,
      bucket,
      path: filePath,

      uploaded_at: uploadedAt,
      is_pdf: isPdf,
      is_image: isImage,

      user_id: user.id,
      user_email: finalUserEmail,
      user_full_name: finalUserFullName,
      user_phone: finalUserPhone,
      user_nie: finalUserNie,
      user_dni: finalUserDni,
      user_passport_number: finalUserPassportNumber,
      user_nationality: finalUserNationality,

      ai_result: "pending",
      is_valid: null,
      review_required: true,
      review_status: "pending",

      form_fill_ready: true,
      ocr_ready: true,
      whatsapp_ready: true,
      email_ready: true,
      make_ready: true,
      twilio_ready: true,

      form_template_id: null,
      form_template_name: null,
      auto_fill_status: "pending",
      auto_fill_fields: {},
      auto_fill_missing_fields: [],
      generated_pdf_url: null,
    },
  };

  const { data: insertedDoc, error: dbError } = await supabase
    .from("user_documents")
    .insert([payload])
    .select()
    .single();

  if (dbError) {
    console.error("user_documents insert error:", dbError);

    await supabase.storage.from(bucket).remove([filePath]);

    throw new Error(
      `Error al guardar en la base de datos: ${dbError.message}`
    );
  }

  return insertedDoc;
}
