export async function enviarMensajeSara(mensaje: string): Promise<string> {
  const response = await fetch("/api/sara", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "No se pudo obtener respuesta de Sara.");
  }
  return typeof data?.respuesta === "string" ? data.respuesta : "Sara no devolvió respuesta.";
}
