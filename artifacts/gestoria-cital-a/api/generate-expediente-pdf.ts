import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function wrapText(
  text: string,
  maxLength: number = 85
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine + word + " ";

    if (testLine.length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}

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
      tiempo_espana = "",
      profesion = "",
      situacion_actual = "",
      objetivo = "",
      idiomas = "",
      familia = "",
    } = body;

    // 📄 Crear PDF
    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([595, 842]); // A4

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();

    const margin = 50;
    let y = height - 60;

    // 🎨 Título
    page.drawText(
      "INFORME PERSONAL DE INTEGRACIÓN Y COMPROMISO SOCIAL",
      {
        x: margin,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0, 0.45, 0.2),
      }
    );

    y -= 40;

    // 📄 Fecha
    page.drawText(
      `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      }
    );

    y -= 30;

    // 🧠 Texto dinámico profesional
    const text = `
A LA ATENCIÓN DE LAS AUTORIDADES COMPETENTES

Yo, ${nombre}, de nacionalidad ${nacionalidad}, actualmente residente en ${ciudad}, presento este informe personal de integración y compromiso social con el máximo respeto hacia las autoridades españolas.

Desde mi llegada a España el ${fecha_llegada}, he realizado esfuerzos constantes para integrarme de manera positiva dentro de la sociedad española. Durante este tiempo he intentado construir una vida estable, basada en el respeto, la convivencia y la voluntad de avanzar honestamente.

Actualmente mi situación es la siguiente:

${situacion_actual}

A pesar de las dificultades derivadas de mi situación administrativa, nunca he perdido la esperanza de poder regularizar mi situación y formar parte activa del desarrollo económico y social de España.

Mi intención es trabajar legalmente como ${profesion}, cotizar en la Seguridad Social, respetar las leyes y contribuir positivamente al país que me ha dado una oportunidad de futuro.

Durante mi estancia en España he desarrollado vínculos sociales y personales importantes. También he realizado esfuerzos de adaptación cultural y lingüística, especialmente en los siguientes idiomas:

${idiomas}

Situación familiar y entorno personal:

${familia}

Mi principal objetivo es:

${objetivo}

Deseo expresar mi sincero agradecimiento por las oportunidades de regularización que permiten a muchas personas salir de la precariedad y avanzar hacia una vida digna, estable y legal.

España representa para mí un país de convivencia, esfuerzo y oportunidades. Mi compromiso es continuar integrándome plenamente, aportar mediante el trabajo y actuar siempre desde el respeto hacia las normas y valores de la sociedad española.

Solicito humildemente que mi situación sea valorada con humanidad, justicia y consideración.

Agradezco profundamente el tiempo y la atención prestada.

Atentamente,

${nombre}
`;

    // ✍️ Dividir texto automáticamente
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
      const lines = wrapText(paragraph, 85);

      for (const line of lines) {
        if (y < 70) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 780;

          newPage.drawText(line, {
            x: margin,
            y,
            size: 11,
            font,
            color: rgb(0, 0, 0),
          });

          y -= 18;
        } else {
          page.drawText(line, {
            x: margin,
            y,
            size: 11,
            font,
            color: rgb(0, 0, 0),
          });

          y -= 18;
        }
      }

      y -= 10;
    }

    // 📦 Guardar PDF
    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Informe_Integracion.pdf"
    );

    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error(error);

    return res.status(500).send("Error generating PDF");
  }
}
