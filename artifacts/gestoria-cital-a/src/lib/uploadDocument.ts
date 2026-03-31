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
    throw userError;
  }

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  if (!file) {
    throw new Error("No hay archivo");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const folder = documentType || "general";
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
    throw uploadError;
  }

  const payload = {
    user_id: user.id,
    case_id,
    document_type: documentType,
    title,
    storage_bucket: bucket,
    file_path: filePath,
    original_name: file.name,
    mime_type: file.type,
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

    throw dbError;
  }

  return insertedDoc;
}
