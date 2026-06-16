// api/sms-code.js - Endpoint para recibir el código SMS de Make

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Faltan variables de Supabase");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("📩 Recibiendo código SMS de Make...");
  console.log("📝 Body:", req.body);

  const clienteId = req.body.cliente_id || req.body.id;
  const codigoSMS = req.body.codigo || req.body.text || req.body.mensaje || req.body.Body;

  if (!clienteId || !codigoSMS) {
    return res.status(400).json({ error: 'Faltan datos: cliente_id y codigo' });
  }

  const codigoLimpio = String(codigoSMS).replace(/\D/g, '');
  if (codigoLimpio.length < 6) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }

  try {
    const { data: cliente } = await supabase
      .from("expediente_checks")
      .select('*')
      .eq('id', clienteId)
      .single();

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    console.log(`👤 Cliente: ${cliente.customer_name}`);
    console.log(`🔑 NIE: ${cliente.nie}`);
    console.log(`📱 Código: ${codigoLimpio}`);

    // Aquí llamas a la función completarNUSS
    // Como está en otro archivo, tendrás que importarla o copiarla

    return res.status(200).json({ success: true, nuss: "XX/XXXXXXXXXX" });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
