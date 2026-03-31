import { supabase } from "@/lib/supabaseClient";

type UploadDocumentParams = {
  file: File;
  documentType: string;
  title: string;
  verification_status?: string;
  verification_notes?: string;
  case_id?: string | null;
  bucket?: string;
  is_required?: boolean;
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export async function uploadDocument({
  file,
  documentType,
  title,
  verification_status = "pending",
  verification_notes = "",
  case_id = null,
  bucket = "user-documents",
  is_required = true,
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
  const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "documento";
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

  const payload = {
    user_id: user.id,
    case_id,
    document_type: folder,
    title: title?.trim() || baseName,
    storage_bucket: bucket,
    file_path: filePath,
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    verification_status,
    verification_notes,
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

    throw new Error(`Error al guardar en la base de datos: ${dbError.message}`);
  }

  return insertedDoc;
}
