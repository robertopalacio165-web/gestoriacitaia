import type { VercelRequest, VercelResponse } from "@vercel/node";
import PDFDocument from "pdfkit";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
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

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="expediente.pdf"'
      );

      res.send(pdfData);
    });

    // Título
    doc
      .fontSize(22)
      .fillColor("#0f172a")
      .text("GestoriaCitaIA", { align: "center" });

    doc.moveDown(0.3);

    doc
      .fontSize(16)
      .fillColor("#16a34a")
      .text("Expediente Revisado", { align: "center" });

    doc.moveDown(1.5);

    // Datos cliente
    doc.fontSize(12).fillColor("#000");

    doc.text(`Nombre: ${nombre}`);
    doc.text(`Teléfono: ${telefono}`);
    doc.text(`NIE / Pasaporte: ${nie}`);
    doc.text(`Ciudad: ${ciudad}`);
    doc.text(`Trámite: ${tramite}`);

    doc.moveDown();

    doc
      .fontSize(13)
      .fillColor("#2563eb")
      .text("Resultado revisión interna");

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("#000")
      .text(
        `Cumplimiento 5 meses en España: ${cumple5meses}`
      );

    doc.moveDown();

    doc.text(
      "La documentación ha sido revisada internamente por GestoriaCitaIA."
    );

    doc.text(
      "Pendiente siempre de validación y decisión oficial por la administración."
    );

    doc.moveDown();

    doc
      .fontSize(13)
      .fillColor("#2563eb")
      .text("Observaciones");

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("#000")
      .text(observaciones || "Sin observaciones.");

    doc.moveDown(2);

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        `Generado automáticamente el ${new Date().toLocaleDateString("es-ES")}`,
        { align: "center" }
      );

    doc.end();
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Error generando PDF",
    });
  }
}
