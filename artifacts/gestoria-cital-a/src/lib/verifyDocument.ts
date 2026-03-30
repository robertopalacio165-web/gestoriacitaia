export async function verifyDocument(file: File, type: string) {
  const text = await file.text().catch(() => "");

  let status: "valid" | "warning" | "invalid" = "valid";
  let notes: string[] = [];

  if (file.size < 5000) {
    status = "warning";
    notes.push("Archivo muy pequeño");
  }

  if (type === "dni_nie") {
    if (!/[XYZ]?\d{7,8}[A-Z]/.test(text)) {
      status = "invalid";
      notes.push("Formato DNI/NIE inválido");
    }
  }

  if (type === "passport") {
    if (!text.toLowerCase().includes("passport")) {
      status = "warning";
      notes.push("No parece pasaporte");
    }
  }

  if (type === "empadronamiento") {
    if (!text.toLowerCase().includes("ayuntamiento")) {
      status = "warning";
      notes.push("No parece documento oficial");
    }
  }

  if (type === "tasa_pagada") {
    if (!text.toLowerCase().includes("modelo")) {
      status = "warning";
      notes.push("No se detecta tasa");
    }
  }

  const hasDate = /\d{2}\/\d{2}\/\d{4}/.test(text);
  if (!hasDate) {
    notes.push("Sin fecha visible");
  }

  return {
    status,
    notes: notes.join(", "),
  };
}
