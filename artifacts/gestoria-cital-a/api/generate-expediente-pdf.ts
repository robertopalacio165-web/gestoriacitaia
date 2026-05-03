import type { VercelRequest, VercelResponse } from "@vercel/node";

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

Quiero manifestar mi profundo agradecimiento al Gobierno de España y a su presidente Pedro Sánchez por la oportunidad que se está brindando a las personas en situación irregular a través del proceso de regularización.

Mi intención es poder trabajar, cotizar a la Seguridad Social, respetar las leyes españolas y construir una vida estable y digna.

Deseo formarme, mejorar mis competencias y aportar valor a la sociedad española, dejando de ser una carga para convertirme en una persona productiva.

Por todo ello, solicito se tenga en consideración mi situación para acceder al proceso de regularización.

Atentamente,

${nombre || "________________"}

`;

    // نحولو ل Base64 باش نرجعوه للفرونت
    const pdfBase64 = Buffer.from(content, "utf-8").toString("base64");

    return res.status(200).json({
      ok: true,
      pdf: pdfBase64,
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
