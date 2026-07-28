// ============================================
// FUNCIONES DE NORMALIZACIÓN - MODIFICADAS
// ============================================

function normalizePassport(value: string | null | undefined): string {
  if (!value) return "Yes";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  return "Yes"; // Siempre devuelve Yes
}

function normalizeVideo(value: string | null | undefined): string {
  if (!value) return "Yes";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  return "Yes"; // Siempre devuelve Yes
}

function normalizeWorkPermit(value: string | null | undefined): string {
  if (!value) return "Yes";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  if (normalized === "en tramite" || normalized === "en_trámite" || normalized === "in_process") {
    return "In process";
  }
  return "Yes"; // Siempre devuelve Yes si no hay valor o no coincide
}

function normalizeRelocate(value: string | null | undefined): string {
  if (!value) return "Yes";
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "true" || normalized === "1") {
    return "Yes";
  }
  return "No";
}
