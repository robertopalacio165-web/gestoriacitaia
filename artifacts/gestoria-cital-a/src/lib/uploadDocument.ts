import { supabase } from "@/lib/supabaseClient";

type UploadDocumentParams = {
  file: File;
  documentType: string;
  title: string;
  verification_status?: string;
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
    .toLowerCase();
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
  verification_status = "pending",
  verification_notes = "",
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

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const baseName =
    sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "documento";
  const safeName = `${Date.now()}-${baseName}.${ext}`;
  const folder = (documentType || "general").trim().toLowerCase();
  const filePath = `${user.id}/${folder}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
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

  try {
    const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: finalUserFullName || "cliente",
        email: finalUserEmail,
        telefono: finalUserPhone,
        documento: safeName,
        document_type: folder,
        original_name: file.name,
        file_path: filePath,
        bucket,
        user_id: user.id,
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
    title: title?.trim() || baseName,
    description,
    storage_bucket: bucket,
    file_path: filePath,
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    verification_status,
    verification_notes,

    extracted_data: {
      ...extracted_data,
      original_name: file.name,
      display_name: title?.trim() || baseName,
      normalized_title: baseName,
      extension: ext,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      document_type: folder,
      bucket,
      path: filePath,
      uploaded_at: new Date().toISOString(),
      is_pdf: ext === "pdf" || file.type === "application/pdf",
      is_image:
        (file.type || "").startsWith("image/") ||
        ["jpg", "jpeg", "png", "webp"].includes(ext),
      user_email: finalUserEmail,
      user_id: user.id,
      user_full_name: finalUserFullName,
      user_phone: finalUserPhone,
      user_nie: finalUserNie,
      user_dni: finalUserDni,
      user_passport_number: finalUserPassportNumber,
      user_nationality: finalUserNationality,
    },

    reviewed_at: new Date().toISOString(),
    reviewed_by: "IA",
    is_required,
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
