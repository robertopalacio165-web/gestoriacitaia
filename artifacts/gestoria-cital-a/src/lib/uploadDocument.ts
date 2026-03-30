import { supabase } from "@/lib/supabaseClient";

type UploadDocumentParams = {
  file: File;
  documentType: string;
  title: string;
};

export async function uploadDocument({
  file,
  documentType,
  title,
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
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${user.id}/${documentType}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("user-files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("storage upload error:", uploadError);
    throw uploadError;
  }

  const { data: insertedDoc, error: dbError } = await supabase
    .from("user_documents")
    .insert({
      user_id: user.id,
      document_type: documentType,
      title,
      storage_bucket: "user-files",
      file_path: filePath,
      original_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      verification_status: "pending",
      is_required: true,
    })
    .select()
    .single();

  if (dbError) {
    console.error("user_documents insert error:", dbError);
    throw dbError;
  }

  return insertedDoc;
}
