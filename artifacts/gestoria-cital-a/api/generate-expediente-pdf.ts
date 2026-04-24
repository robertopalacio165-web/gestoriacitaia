import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function safe(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function wrapText(text: string, maxChars = 90) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const {
      nombre = "",
      telefono = "",
      correo_electronico = "",
      nie_pasaporte = "",
      ciudad = "",
      nacionalidad = "",
      fecha_llegada = "",
      cumple_5_meses = "",
      asilo = "",
      penales = "",
      tramite = "",
      estado_expediente = "",
      observaciones = "",
    } = req.body || {};

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    const drawLine = (text: string, size = 11, bold = false, color = rgb(0, 0, 0)) => {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font: bold ? fontBold : fontRegular,
        color,
      });
      y -= size + 8;
    };

    const drawSectionTitle = (text: string) => {
      y -= 6;
      page.drawRectangle({
        x: 50,
        y: y - 6,
        width: width - 100,
        height: 22,
        color: rgb(0.92, 0.95, 1),
      });
      page.drawText(text, {
        x: 56,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.0, 0.23, 0.51),
      });
      y -= 28;
    };

    const drawField = (label: string, value: string) => {
      const content = `${label}: ${safe(value) || "-"}`;
      const lines = wrapText(content, 85);
      for (const line of lines) {
        drawLine(line, 11, false);
      }
    };

    const addNewPageIfNeeded = () => {
      if (y < 90) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;

        (page as any) = newPage;
      }
    };

    drawLine("GESTORIACITAIA - EXPEDIENTE FINAL", 18, true, rgb(0.0, 0.23, 0.51));
    drawLine("Documento generado automáticamente por GestoriaCitaIA.", 10, false, rgb(0.35, 0.35, 0.35));
    drawLine(`Fecha de generación: ${new Date().toLocaleString("es-ES")}`, 10, false, rgb(0.35, 0.35, 0.35));

    y -= 10;
    drawSectionTitle("DATOS DEL CLIENTE");
    drawField("Nombre completo", safe(nombre));
    drawField("Teléfono", safe(telefono));
    drawField("Correo electrónico", safe(correo_electronico));
    drawField("NIE / Pasaporte", safe(nie_pasaporte));
    drawField("Ciudad", safe(ciudad));
    drawField("Nacionalidad", safe(nacionalidad));
    drawField("Fecha llegada a España", safe(fecha_llegada));

    addNewPageIfNeeded();

    drawSectionTitle("DATOS DEL EXPEDIENTE");
    drawField("Trámite", safe(tramite));
    drawField("Cumple 5 meses", safe(cumple_5_meses));
    drawField("Asilo", safe(asilo));
    drawField("Antecedentes penales", safe(penales));
    drawField("Estado expediente", safe(estado_expediente));

    addNewPageIfNeeded();

    drawSectionTitle("OBSERVACIONES");
    const notes = safe(observaciones) || "Sin observaciones.";
    const noteLines = wrapText(notes, 90);
    for (const line of noteLines) {
      drawLine(line, 11, false);
      addNewPageIfNeeded();
    }

    y -= 8;
    drawSectionTitle("AVISO");
    drawLine(
      "Este expediente ha sido preparado por GestoriaCitaIA como ayuda organizativa y de revisión documental.",
      10,
      false,
      rgb(0.25, 0.25, 0.25)
    );
    drawLine(
      "La decisión final siempre corresponde a la administración competente.",
      10,
      false,
      rgb(0.25, 0.25, 0.25)
    );

    const pdfBytes = await pdfDoc.save();
    const fileName = `expediente-${safe(nombre).replace(/\s+/g, "-") || "cliente"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", String(pdfBytes.length));

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("generate-expediente-pdf error:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Error interno al generar el PDF",
    });
  }
}
