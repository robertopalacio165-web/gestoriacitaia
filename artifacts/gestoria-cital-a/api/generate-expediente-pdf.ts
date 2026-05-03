import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const {
      nombre = "",
      nacionalidad = "",
      ciudad = "",
      fecha_llegada = "",
    } = body;

    // 📄 إنشاء PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();

    const text = `
A LA ATENCIÓN DE LAS AUTORIDADES COMPETENTES

Yo, ${nombre}, de nacionalidad ${nacionalidad}, actualmente residente en ${ciudad}, expongo respetuosamente lo siguiente:

Desde mi llegada a España el ${fecha_llegada}, he intentado integrarme de manera activa en la sociedad española. A pesar de no disponer actualmente de una autorización de residencia, mi intención siempre ha sido vivir de forma digna, respetar las leyes y contribuir positivamente al país.

Deseo expresar mi agradecimiento al Gobierno de España y a su Presidente, Pedro Sánchez, por las oportunidades que se están abriendo para la regularización de personas en situación administrativa irregular.

España es un país que me ha dado la oportunidad de soñar con un futuro mejor. Mi objetivo es poder trabajar legalmente, cotizar en la Seguridad Social, formarme profesionalmente y aportar valor a la sociedad.

Actualmente me encuentro en una situación vulnerable, ya que sin documentación no puedo acceder plenamente al mercado laboral ni desarrollar una vida estable. Sin embargo, tengo plena disposición para trabajar, aprender y adaptarme.

Solicito que se valore mi situación con humanidad y justicia, y que se me brinde la oportunidad de regularizar mi situación administrativa.

Estoy comprometido con integrarme, respetar las normas, y contribuir al crecimiento económico y social de España.

Agradezco profundamente la atención prestada.

Atentamente,

${nombre}
`;

    // ✍️ كتابة النص في الصفحة
    const fontSize = 11;
    const margin = 50;
    let y = height - margin;

    const lines = text.split("\n");

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 16;
    }

    // 📦 حفظ PDF
    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=motivacion.pdf"
    );

    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error(error);
    return res.status(500).send("Error generating PDF");
  }
}
