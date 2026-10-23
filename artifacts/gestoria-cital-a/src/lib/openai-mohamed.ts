export async function enviarMensajeMohamed(mensaje: string): Promise<string> {
  const response = await fetch("/api/mohamed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "No se pudo obtener respuesta de Mohamed.");
  }
  return typeof data?.respuesta === "string" ? data.respuesta : "Mohamed no devolvió respuesta.";
}
