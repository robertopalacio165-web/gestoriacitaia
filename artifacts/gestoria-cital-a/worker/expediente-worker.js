import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import express from "express";

// ==============================================
// CONFIGURACIÓN
// ==============================================
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/"/g, "").trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, "").trim();
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const INFOEXT_URL = "https://infoext2.delegaciondelgobierno.gob.es/infoext2/consulta.html";
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan variables de Supabase");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==============================================
// UTILIDADES
// ==============================================
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }

function normalizeDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }
  return raw;
}

function extractYear(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.split("-")[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw.split("/")[2];
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : raw;
}

// ==============================================
// 🔍 EXTRAER NIE DE LA PÁGINA
// ==============================================
function extraerNIE(texto) {
  const regex = /[XYZ]\s*[-]?\s*\d{7,8}\s*[-]?\s*[A-Z]/i;
  const match = texto.match(regex);
  if (match) {
    return match[0].replace(/\s/g, '').toUpperCase();
  }
  const regex2 = /\b\d{8}\s*[A-Z]\b/i;
  const match2 = texto.match(regex2);
  if (match2) {
    return match2[0].replace(/\s/g, '').toUpperCase();
  }
  return null;
}

// ==============================================
// 🔍 EXTRAER NUSS DE LA PÁGINA
// ==============================================
function extraerNUSS(texto) {
  const regex = /\b(\d{2})\/(\d{8,10})\s*(\d{2})\b/;
  const match = texto.match(regex);
  if (match) {
    return `${match[1]}/${match[2]} ${match[3]}`;
  }
  const regex2 = /\b(\d{2})\s+(\d{8,10})\s+(\d{2})\b/;
  const match2 = texto.match(regex2);
  if (match2) {
    return `${match2[1]}/${match2[2]} ${match2[3]}`;
  }
  return null;
}

// ==============================================
// 📱 ENVIAR WHATSAPP - FAVORABLE
// ==============================================
async function enviarWhatsAppFavorable(cliente) {
  const webhook = process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE;
  if (!webhook) {
    console.log("⚠️ Webhook no configurado");
    return;
  }
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: "favorable",
    mensaje_es: `✅ ¡BUENAS NOTICIAS ${cliente.customer_name}!\n\nTu expediente ha sido resuelto FAVORABLEMENTE.\n\n¡Enhorabuena!`,
    mensaje_ar: `✅ أخبار جيدة ${cliente.customer_name}!\n\nملفك تمت الموافقة عليه.\n\nمبروك!`,
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp favorable a: ${cliente.customer_phone}`);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) console.log("✅ WhatsApp favorable enviado");
  else console.log("❌ Error WhatsApp:", await res.text());
}

// ==============================================
// 📱 ENVIAR WHATSAPP PIDIENDO EL CÓDIGO SMS
// ==============================================
async function enviarWhatsAppPedirCodigo(cliente, nie) {
  const webhook = process.env.MAKE_WEBHOOK_PEDIR_CODIGO;
  if (!webhook) {
    console.log("⚠️ Webhook pedir código no configurado");
    return;
  }
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    nie: nie,
    mensaje_es: `
📱 ${cliente.customer_name}, la Seguridad Social te ha enviado un SMS con un código de 6 dígitos.

🔢 Por favor, RESPONDE A ESTE MENSAJE con el código que te ha llegado por SMS.

Ejemplo: 123456

✅ Con este código podremos obtener tu número de Seguridad Social (NUSS) automáticamente.

⏳ Tienes 5 minutos para responder.

💼 GestoriaCitaIA`,
    mensaje_ar: `
📱 ${cliente.customer_name}, الضمان الاجتماعي أرسل لك رسالة نصية تحتوي على رمز من 6 أرقام.

🔢 الرجاء الرد على هذه الرسالة بالرمز الذي تلقيته عبر SMS.

مثال: 123456

✅ بهذا الرمز سنتمكن من الحصول على رقم الضمان الاجتماعي الخاص بك تلقائياً.

⏳ لديك 5 دقائق للرد.

💼 GestoriaCitaIA`,
    tipo: "pedir_codigo",
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp pidiendo código a: ${cliente.customer_phone}`);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) console.log("✅ WhatsApp pedir código enviado");
  else console.log("❌ Error WhatsApp pedir código:", await res.text());
}

// ==============================================
// 📱 ENVIAR WHATSAPP CON NUSS
// ==============================================
async function enviarWhatsAppNUSS(cliente, nie, nuss) {
  const webhook = process.env.MAKE_WEBHOOK_NUSS;
  if (!webhook) {
    console.log("⚠️ Webhook NUSS no configurado");
    return;
  }
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    nie: nie,
    nuss: nuss,
    mensaje_es: `
🎉 ¡FELICIDADES ${cliente.customer_name}!

🔢 Tu NÚMERO DE SEGURIDAD SOCIAL (NUSS) es:

📌 ${nuss}

✅ Con este número ya puedes:
• Darte de alta en la Seguridad Social
• Solicitar tu tarjeta sanitaria
• Iniciar trámites laborales

📋 Tu NIE es: ${nie}

💼 GestoriaCitaIA`,
    mensaje_ar: `
🎉 ${cliente.customer_name}! تهانينا!

🔢 رقم الضمان الاجتماعي الخاص بك هو:

📌 ${nuss}

✅ بهذا الرقم يمكنك:
• التسجيل في الضمان الاجتماعي
• طلب بطاقة صحية
• بدء الإجراءات العمالية

📋 NIE الخاص بك هو: ${nie}

💼 GestoriaCitaIA`,
    tipo: "nuss",
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp con NUSS a: ${cliente.customer_phone}`);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) console.log("✅ WhatsApp NUSS enviado");
  else console.log("❌ Error WhatsApp NUSS:", await res.text());
}

// ==============================================
// 🏦 CONSULTAR NUSS - SOLICITAR SMS
// ==============================================
async function solicitarSMSSeguridadSocial(nie, fechaNacimiento, telefono) {
  let browser;
  console.log(`🔍 Solicitando SMS para NIE: ${nie}`);
  
  try {
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    await page.goto("https://portal.seg-social.gob.es/");
    await sleep(3000);
    
    try {
      await page.click('a:has-text("Importass")');
      await sleep(3000);
    } catch {
      await page.goto("https://portal.seg-social.gob.es/importass");
      await sleep(3000);
    }
    
    console.log("📝 Rellenando datos del cliente...");
    try {
      await page.fill('input[name="nie"]', nie);
      await sleep(500);
    } catch {}
    
    try {
      await page.fill('input[name="fechaNacimiento"]', normalizeDate(fechaNacimiento));
      await sleep(500);
    } catch {}
    
    try {
      const telefonoLimpio = telefono.replace(/\s/g, '').replace(/^\+34/, '');
      await page.fill('input[name="telefono"]', telefonoLimpio);
      await sleep(500);
    } catch {}
    
    console.log("📱 Solicitando SMS...");
    try {
      await page.click('button:has-text("Enviar")');
      await sleep(3000);
    } catch {
      await page.click('button:has-text("Solicitar código")');
      await sleep(3000);
    }
    
    console.log("✅ SMS solicitado correctamente");
    await browser.close();
    return true;
    
  } catch (error) {
    console.error("❌ Error solicitando SMS:", error.message);
    if (browser) await browser.close();
    return false;
  }
}

// ==============================================
// 🏦 COMPLETAR NUSS CON EL CÓDIGO SMS
// ==============================================
async function completarNUSS(nie, fechaNacimiento, codigo) {
  let browser;
  console.log(`🔍 Completando NUSS con código: ${codigo}`);
  
  try {
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    await page.goto("https://portal.seg-social.gob.es/");
    await sleep(3000);
    
    try {
      await page.click('a:has-text("Importass")');
      await sleep(3000);
    } catch {
      await page.goto("https://portal.seg-social.gob.es/importass");
      await sleep(3000);
    }
    
    try {
      await page.fill('input[name="nie"]', nie);
      await sleep(500);
    } catch {}
    
    try {
      await page.fill('input[name="fechaNacimiento"]', normalizeDate(fechaNacimiento));
      await sleep(500);
    } catch {}
    
    console.log(`📝 Introduciendo código: ${codigo}`);
    try {
      await page.fill('input[name="codigo"]', codigo);
      await sleep(500);
      await page.click('button:has-text("Verificar")');
      await sleep(5000);
    } catch {
      await page.fill('input[type="text"]', codigo);
      await sleep(500);
      await page.click('button:has-text("Enviar")');
      await sleep(5000);
    }
    
    const texto = await page.textContent("body");
    const nuss = extraerNUSS(texto);
    
    if (nuss) {
      console.log(`✅ NUSS encontrado: ${nuss}`);
      await browser.close();
      return nuss;
    }
    
    console.log("⚠️ No se pudo encontrar el NUSS");
    await browser.close();
    return null;
    
  } catch (error) {
    console.error("❌ Error completando NUSS:", error.message);
    if (browser) await browser.close();
    return null;
  }
}

// ==============================================
// 🔍 ANALIZAR ESTADO
// ==============================================
function analizarEstado(texto) {
  const body = texto.toLowerCase();
  
  if (body.includes("favorable") || body.includes("concedido") || body.includes("resuelto favorable")) return "favorable";
  if (body.includes("desfavorable") || body.includes("denegado") || body.includes("rechazado")) return "desfavorable";
  if (body.includes("requerimiento") || body.includes("documentación") || body.includes("subsanar") || body.includes("falta")) return "requerimiento";
  if (body.includes("archivado")) return "archivado";
  if (body.includes("inadmitido")) return "inadmitido";
  if (body.includes("en trámite") || body.includes("pendiente") || body.includes("en estudio")) return "tramite";
  if (body.includes("resuelto")) return "resuelto";
  
  return "desconocido";
}

// ==============================================
// 🎯 RESOLVER CAPTCHA
// ==============================================
async function resolverCaptcha(page) {
  console.log("🔊 Resolviendo CAPTCHA...");
  await sleep(3000);
  const audioSrc = await page.$eval('audio', el => el.src);
  const response = await fetch(audioSrc);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync("/tmp/captcha.mp3", buffer);
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream("/tmp/captcha.mp3"),
    model: "gpt-4o-mini-transcribe",
    language: "es",
  });
  const texto = transcription.text.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase().slice(0, 6);
  console.log("✅ CAPTCHA:", texto);
  return texto;
}

// ==============================================
// 🔄 VERIFICAR EXPEDIENTE (PRINCIPAL)
// ==============================================
async function verificarExpediente(cliente) {
  let browser;
  try {
    console.log(`\n👤 ${cliente.customer_name} - ${cliente.expediente_numero}`);
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(INFOEXT_URL);
    await sleep(2000);
    await page.click("text=ENTRAR FORMULARIO");
    await sleep(2000);
    await page.click("text=BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD");
    await sleep(2000);
    await page.fill('input[name="idExpediente"]', cliente.identificador_solicitud);
    await page.fill('input[name="fechaPresentacion"]', normalizeDate(cliente.fecha_presentacion));
    await page.fill('input[name="anio"]', extractYear(cliente.fecha_nacimiento));
    const captcha = await resolverCaptcha(page);
    await page.fill('input[type="text"]', captcha);
    await sleep(2000);
    await page.click('button:has-text("Consultar")');
    await sleep(10000);
    
    const texto = await page.textContent("body");
    const estado = analizarEstado(texto);
    
    console.log(`📊 Estado detectado: ${estado}`);
    
    // ==============================================
    // ⭐ SI ES FAVORABLE Y NO NOTIFICADO
    // ==============================================
    if (estado === "favorable" && !cliente.notificado_favorable) {
      // 1. Enviar WhatsApp de favorable
      await enviarWhatsAppFavorable(cliente);
      
      // 2. Extraer NIE
      const nie = extraerNIE(texto);
      
      if (nie) {
        console.log(`✅ NIE extraído: ${nie}`);
        
        // 3. Guardar NIE en Supabase
        await supabase.from("expediente_checks").update({ 
          nie: nie 
        }).eq("id", cliente.id);
        
        // 4. Solicitar SMS en la Seguridad Social
        const smsenviado = await solicitarSMSSeguridadSocial(
          nie, 
          cliente.fecha_nacimiento, 
          cliente.customer_phone
        );
        
        if (smsenviado) {
          console.log("📱 SMS enviado al cliente. Esperando código...");
          
          // 5. Enviar WhatsApp pidiendo el código
          await enviarWhatsAppPedirCodigo(cliente, nie);
          
          // 6. Guardar que estamos esperando el código
          await supabase.from("expediente_checks").update({
            esperando_codigo: true,
            codigo_solicitado: new Date().toISOString()
          }).eq("id", cliente.id);
        }
      } else {
        console.log("⚠️ No se pudo extraer el NIE");
      }
      
      // 7. Marcar como notificado favorable
      await supabase.from("expediente_checks").update({
        notificado_favorable: true
      }).eq("id", cliente.id);
    }
    
    // ==============================================
    // ⭐ OTROS ESTADOS
    // ==============================================
    if (estado === "desfavorable" && !cliente.notificado_desfavorable) {
      await enviarWhatsApp(cliente, "desfavorable");
      await supabase.from("expediente_checks").update({
        notificado_desfavorable: true
      }).eq("id", cliente.id);
    }
    
    if (estado === "requerimiento" && !cliente.notificado_requerimiento) {
      await enviarWhatsApp(cliente, "requerimiento");
      await supabase.from("expediente_checks").update({
        notificado_requerimiento: true
      }).eq("id", cliente.id);
    }
    
    if (estado === "archivado" && !cliente.notificado_archivado) {
      await enviarWhatsApp(cliente, "archivado");
      await supabase.from("expediente_checks").update({
        notificado_archivado: true
      }).eq("id", cliente.id);
    }
    
    // Actualizar resultado
    await supabase.from("expediente_checks").update({
      estado_detalle: estado,
      resultado: cleanText(texto).slice(0, 2000),
      ultimo_check: new Date().toISOString()
    }).eq("id", cliente.id);
    
    await browser.close();
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (browser) await browser.close();
  }
}

// ==============================================
// 📡 ENDPOINT PARA RECIBIR EL CÓDIGO DE MAKE
// ==============================================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/sms-code', async (req, res) => {
  console.log("📩 Recibiendo código SMS de Make...");
  console.log("📝 Body:", req.body);
  
  // Make puede enviar el código de diferentes formas
  const clienteId = req.body.cliente_id || req.body.id;
  const codigoSMS = req.body.codigo || req.body.text || req.body.mensaje || req.body.Body;
  
  if (!clienteId || !codigoSMS) {
    console.log("❌ Faltan datos");
    return res.status(400).json({ error: 'Faltan datos: cliente_id y codigo' });
  }
  
  const codigoLimpio = String(codigoSMS).replace(/\D/g, '');
  
  if (codigoLimpio.length < 6) {
    console.log(`❌ Código inválido: ${codigoLimpio}`);
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }
  
  try {
    const { data: cliente, error } = await supabase
      .from('expediente_checks')
      .select('*')
      .eq('id', clienteId)
      .single();
    
    if (error || !cliente) {
      console.log("❌ Cliente no encontrado");
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    console.log(`👤 Cliente: ${cliente.customer_name}`);
    console.log(`🔑 NIE: ${cliente.nie}`);
    console.log(`📱 Código: ${codigoLimpio}`);
    
    const nuss = await completarNUSS(cliente.nie, cliente.fecha_nacimiento, codigoLimpio);
    
    if (nuss) {
      console.log(`✅ NUSS obtenido: ${nuss}`);
      
      await supabase
        .from('expediente_checks')
        .update({ 
          nuss: nuss, 
          nuss_enviado: true,
          esperando_codigo: false,
          codigo_recibido: codigoLimpio,
          fecha_nuss: new Date().toISOString()
        })
        .eq('id', clienteId);
      
      await enviarWhatsAppNUSS(cliente, cliente.nie, nuss);
      
      return res.status(200).json({ 
        success: true, 
        nuss: nuss
      });
    } else {
      return res.status(500).json({ 
        error: 'No se pudo obtener el NUSS. ¿El código es correcto?' 
      });
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==============================================
// 🚀 MAIN
// ==============================================
async function main() {
  console.log("🚀 Worker iniciado", new Date().toISOString());
  
  // Buscar expedientes que NO han sido notificados como favorables
  const { data: expedientes } = await supabase
    .from("expediente_checks")
    .select("*")
    .or('notificado_favorable.eq.false,notificado_favorable.is.null');
  
  if (!expedientes?.length) { 
    console.log("No hay expedientes pendientes"); 
    return; 
  }
  
  for (const exp of expedientes) { 
    await verificarExpediente(exp); 
    await sleep(5000); 
  }
}

// ==============================================
// ▶️ INICIAR SERVIDOR
// ==============================================
app.listen(PORT, () => {
  console.log(`✅ Servidor Sara escuchando en puerto ${PORT}`);
  console.log(`📡 Endpoint SMS: http://localhost:${PORT}/api/sms-code`);
});

// Ejecutar worker cada hora
main();
setInterval(main, CHECK_INTERVAL_MS);

console.log("🔄 Sara worker ejecutándose...");
