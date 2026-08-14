import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const { partitaIva } = req.body || {};

    if (!partitaIva || typeof partitaIva !== "string") {
      return res.status(400).json({
        error: "Falta la Partita IVA",
      });
    }

    let cleanVat = partitaIva
      .replace(/\s/g, "")
      .replace(/-/g, "")
      .toUpperCase();

    if (cleanVat.startsWith("IT")) {
      cleanVat = cleanVat.substring(2);
    }

    if (!/^\d{11}$/.test(cleanVat)) {
      return res.status(400).json({
        error: "La Partita IVA italiana debe contener 11 dígitos",
        partitaIva: cleanVat,
      });
    }

    /*
     * IMPORTANTE:
     * La API KEY NO se pone aquí.
     * Debe estar en Vercel:
     *
     * TAXID_API_KEY=tu_clave_taxid
     */

    const apiKey = process.env.TAXID_API_KEY;

    if (!apiKey) {
      console.error("TAXID_API_KEY no configurada");

      return res.status(500).json({
        error: "Falta TAXID_API_KEY en las variables de entorno",
      });
    }

    const url =
      `https://www.taxid.dev/api/v1/validate/IT/IT${cleanVat}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    console.log("TaxID:", {
      status: response.status,
      valid: data?.valid,
      company_name: data?.company_name,
      request_id: data?.request_id,
    });

    /*
     * VIES / autoridad temporalmente no disponible
     */

    if (
      response.status === 503 ||
      data?.status === "service_unavailable"
    ) {
      return res.status(503).json({
        valido: false,
        disponible: false,
        estado: "service_unavailable",
        mensaje:
          "La fuente oficial de verificación no está disponible temporalmente.",
        partitaIva: `IT${cleanVat}`,
        fuente: data?.source || "VIES",
        requestId: data?.request_id || null,
      });
    }

    /*
     * Error TaxID
     */

    if (!response.ok) {
      return res.status(response.status).json({
        valido: false,
        disponible: true,
        error:
          data?.message ||
          data?.error ||
          "Error validando la Partita IVA",
        estado: data?.status || null,
        requestId: data?.request_id || null,
      });
    }

    /*
     * Resultado correcto
     */

    const valido = data?.valid === true;

    return res.status(200).json({
      valido,

      estado:
        data?.status ||
        (valido ? "active" : "invalid"),

      nombre:
        data?.company_name || null,

      direccion:
        data?.company_address ||
        data?.address ||
        null,

      partitaIva:
        data?.vat_number ||
        `IT${cleanVat}`,

      pais:
        data?.country_code || "IT",

      fuente:
        data?.source || "VIES",

      fechaConsulta:
        data?.request_date || null,

      cache:
        data?.cached ?? false,

      requestId:
        data?.request_id || null,

      /*
       * Para nuestro informe PDF
       */

      empresaRegistrada:
        valido,

      mensaje: valido
        ? "La Partita IVA aparece activa en la consulta realizada."
        : "La Partita IVA no aparece como válida en la consulta realizada.",
    });

  } catch (error: any) {

    console.error(
      "Error en verify-italy-company:",
      error
    );

    return res.status(500).json({
      error: "Error interno del servidor",
      message:
        process.env.NODE_ENV === "development"
          ? error?.message || "Error desconocido"
          : undefined,
    });
  }
}
