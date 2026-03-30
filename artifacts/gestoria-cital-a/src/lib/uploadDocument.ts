import { supabase } from "@/lib/supabaseClient";

export const uploadDocument = async ({
  file,
  documentType,
  title,
}: {
  file: File;
  documentType: string;
  title: string;
}) => {
  // 🔹 1. Usuario actual
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuario no autenticado");
  }

  // 🔹 2. Nombre único archivo
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `general/${fileName}`;

  // 🔹 3. Subir a storage
  const { error: uploadError } = await supabase.storage
    .from("user-files")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  // 🔹 4. GUARDAR EN BASE DE DATOS 🔥 (ESTO FALTABA)
  const { error: dbError } = await supabase
    .from("user_documents")
    .insert([
      {
        user_id: user.id,
        document_type: documentType,
        title: title,
        file_path: filePath,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      },
    ]);

  if (dbError) {
    throw dbError;
  }

  return true;
};
