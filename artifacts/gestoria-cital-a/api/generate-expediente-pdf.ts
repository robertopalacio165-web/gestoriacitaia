import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { nombre = "NOMBRE APELLIDO" } = req.query;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const text = `
A la atención de la Administración Pública Española,

Yo, ${nombre}, manifiesto mi firme voluntad de regularizar mi situación administrativa en España y de integrarme plenamente en la sociedad.

Quisiera expresar mi sincero agradecimiento a las instituciones del Estado español por las oportunidades que se están promoviendo para facilitar la regularización y la inclusión de personas en situación administrativa irregular. Estas iniciativas representan una vía real hacia la estabilidad, la dignidad y la participación activa en la vida social y económica del país.

Mi objetivo es desarrollar un proyecto de vida honesto y responsable en España: acceder al empleo de forma legal, cotizar a la Seguridad Social, cumplir con todas las obligaciones fiscales y contribuir positivamente al crecimiento y bienestar de la sociedad española.

Asimismo, me comprometo a continuar formándome, mejorar mis competencias profesionales y adaptarme plenamente a los valores y normas de convivencia, con el propósito de aportar valor a la comunidad que me ha abierto sus puertas.

Esta oportunidad de regularización supone para mí un punto de inflexión que permitirá transformar mi situación actual en un futuro estable, productivo y alineado con los principios de legalidad y responsabilidad.

Por todo lo expuesto, solicito respetuosamente que se tenga en consideración mi caso y se valore favorablemente mi proceso de regularización.

Agradezco de antemano la atención prestada.

Atentamente,

${nombre}
`;

    page.drawText(text, {
      x: 50,
      y: 780,
      size: 11,
      font,
      lineHeight: 16,
      maxWidth: 500,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=lettre_motivacion.pdf"
    );

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error: any) {
    return res.status(500).send("Error generating PDF");
  }
}
