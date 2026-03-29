import { supabase } from "@/lib/supabaseClient";

export async function uploadDocument({
  file,
  documentType,
  title,
}: {
  file: File;
  documentType: string;
  title: string;
}) {
  const { data } = await supabase.auth.getUser();

  const user = data.user;

  if (!user) {
    throw new Error("Usuario no logueado");
  }

  if (!file) {
    throw new Error("No hay archivo");
  }

  const ext = file.name.split(".").pop();
  const fileName = Date.now() + "." + ext;

  const path = `${user.id}/${documentType}/${fileName}`;

  // subir archivo
  const { error: uploadError } = await supabase.storage
    .from("user-files")
    .upload(path, file);

  if (uploadError) {
    throw uploadError;
  }

  // guardar en base de datos
  const { error: dbError } = await supabase
    .from("user_documents")
    .insert({
      user_id: user.id,
      document_type: documentType,
      title: title,
      file_path: path,
      verification_status: "pending",
    });

  if (dbError) {
    throw dbError;
  }

  return true;
}
