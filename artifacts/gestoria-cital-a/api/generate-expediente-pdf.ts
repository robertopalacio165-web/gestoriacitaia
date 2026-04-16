import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }

  try {
    const {
      nombre = "",
      telefono = "",
      nie = "",
      ciudad = "",
      tramite = "",
      cumple5meses = "",
      observaciones = "",
    } = req.body || {};

    const content = `
GESTORIACITAIA - EXPEDIENTE REVISADO

Nombre: ${nombre}
Teléfono: ${telefono}
NIE/Pasaporte: ${nie}
Ciudad: ${ciudad}
Trámite: ${tramite}

Cumple 5 meses: ${cumple5meses}

Observaciones:
${observaciones}

Revisión interna realizada por GestoriaCitaIA.
Pendiente siempre de validación oficial.
`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="expediente.pdf"'
    );

    res.status(200).send(content);
  } catch (error: any) {
    res.status(500).send("Error interno");
  }
}
