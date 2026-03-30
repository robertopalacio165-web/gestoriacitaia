export async function verifyDocument(file: File, type: string) {
  // 🔥 Simulación básica (luego metemos IA real)
  
  let status = "valid";
  let notes = "Documento válido";

  // ejemplo simple
  if (file.size > 5 * 1024 * 1024) {
    status = "warning";
    notes = "Archivo demasiado grande";
  }

  if (!file.type.includes("pdf") && !file.type.includes("image")) {
    status = "invalid";
    notes = "Formato no permitido";
  }

  return {
    status,
    notes,
  };
}
