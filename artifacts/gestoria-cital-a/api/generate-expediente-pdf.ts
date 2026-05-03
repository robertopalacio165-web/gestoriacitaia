import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Buffer } from "buffer";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const {
      nombre,
      nacionalidad,
      ciudad,
    } = body;

    const content = `
SOLICITUD PERSONAL DE REGULARIZACIÓN

Yo, ${nombre || "________________"}, de nacionalidad ${nacionalidad || "________"}, actualmente residiendo en ${ciudad || "________"}, expongo lo siguiente:

Que me encuentro en España con el objetivo de integrarme plenamente en la sociedad, trabajar de manera legal y contribuir activamente al desarrollo económico y social del país.

Quiero expresar mi agradecimiento al Gobierno de España y al presidente Pedro Sánchez por esta oportunidad de regularización.

Mi intención es trabajar, cotizar, respetar las leyes y construir una vida digna en España.

Solicito se tenga en cuenta mi situación para acceder a la regularización.

Atentamente,

${nombre || "________________"}
`;

    const buffer = Buffer.from(content, "utf-8");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=expediente_${nombre || "cliente"}.pdf`
    );

    return res.status(200).send(buffer);

  } catch (error: any) {
    return res.status(500).send(error.message);
  }
}
