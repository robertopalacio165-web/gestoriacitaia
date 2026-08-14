import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { partitaIva } = req.body;

  if (!partitaIva) {
    return res.status(400).json({ error: 'Falta la Partita IVA' });
  }

  const cleanVat = partitaIva.replace(/\s/g, '').toUpperCase();
  const apiKey = process.env.TAXID_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta la API key en el servidor' });
  }

  try {
    const response = await fetch(
      `https://api.taxid.dev/v1/validate/IT/${cleanVat}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Error validando el IVA'
      });
    }

    return res.status(200).json({
      valido: data.valid ?? false,
      nombre: data.name || null,
      direccion: data.address || null,
      partitaIva: data.vat || cleanVat
    });

  } catch (error: any) {
    console.error('Error en verify-italy-company:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}
