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
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
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
// 🔍 ANALIZAR ESTADO
// ==============================================
function analizarEstado(texto) {
  const body = texto.toLowerCase();
  
  if (body.includes("favorable") || body.includes("concedido") || body.includes("resuelto favorable")) return "favorable";
  if (body.includes("desfavorable") || body.includes("denegado") || body.includes("rechazado")) return "desfavorable";
  if (body.includes("requerimiento") || body.includes("documentación") || body.includes("subsanar") || body.includes("falta")) return "requerimiento";
  if (body.includes("archivado")) return "archivado";
  if (body.includes("inadmitido")) return "inadmitido";
  if (body.includes("en trámite") || body.includes("en tramite") || body.includes("pendiente") || body.includes("en estudio") || body.includes("tramitación") || body.includes("en proceso")) return "tramite";
  if (body.includes("resuelto")) return "resuelto";
  
  return "desconocido";
}

// ==============================================
// 🆕 FUNCIONES PARA NUSS Y SEGURIDAD SOCIAL
// ==============================================

function extraerNIE(texto) {
  const regex = /[XYZ]\s*[-]?\s*\d{7,8}\s*[-]?\s*[A-Z]/i;
  const match = texto.match(regex);
  if (match) return match[0].replace(/\s/g, '').toUpperCase();
  const regex2 = /\b\d{8}\s*[A-Z]\b/i;
  const match2 = texto.match(regex2);
  if (match2) return match2[0].replace(/\s/g, '').toUpperCase();
  return null;
}

function extraerNUSS(texto) {
  const regex = /\b(\d{2})\/(\d{8,10})\s*(\d{2})\b/;
  const match = texto.match(regex);
  if (match) return `${match[1]}/${match[2]} ${match[3]}`;
  const regex2 = /\b(\d{2})\s+(\d{8,10})\s+(\d{2})\b/;
  const match2 = texto.match(regex2);
  if (match2) return `${match2[1]}/${match2[2]} ${match2[3]}`;
  return null;
}

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
    mensaje_es: `📱 ${cliente.customer_name}, la Seguridad Social te ha enviado un SMS con un código de 6 dígitos.\n\nRESPONDE A ESTE MENSAJE con el código.\n\nEjemplo: 123456\n\n✅ Con este código obtendremos tu NUSS.\n\n💼 GestoriaCitaIA`,
    mensaje_ar: `📱 ${cliente.customer_name}, الضمان الاجتماعي أرسل لك رمز.\n\nالرد على هذه الرسالة بالرمز.\n\nمثال: 123456\n\n✅ بهذا الرمز سنحصل على رقم الضمان الاجتماعي.\n\n💼 GestoriaCitaIA`,
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
  else console.log("❌ Error:", await res.text());
}

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
    mensaje_es: `🎉 FELICIDADES ${cliente.customer_name}!\n\nTu NÚMERO DE SEGURIDAD SOCIAL es:\n📌 ${nuss}\n\n✅ Con este número puedes darte de alta en la Seguridad Social.\n\n📋 Tu NIE es: ${nie}\n\n💼 GestoriaCitaIA`,
    mensaje_ar: `🎉 ${cliente.customer_name}! تهانينا!\n\nرقم الضمان الاجتماعي:\n📌 ${nuss}\n\n✅ بهذا الرقم يمكنك التسجيل في الضمان الاجتماعي.\n\n📋 NIE الخاص بك هو: ${nie}\n\n💼 GestoriaCitaIA`,
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
  else console.log("❌ Error:", await res.text());
}

async function solicitarSMSSeguridadSocial(nie, fechaNacimiento, telefono) {
  let browser;
  console.log(`🔍 Solicitando SMS para NIE: ${nie}`);
  
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    await page.goto("https://portal.seg-social.gob.es/");
    await sleep(3000);
    
    try { await page.click('a:has-text("Importass")'); await sleep(3000); } 
    catch { await page.goto("https://portal.seg-social.gob.es/importass"); await sleep(3000); }
    
    try { await page.fill('input[name="nie"]', nie); await sleep(500); } catch {}
    try { await page.fill('input[name="fechaNacimiento"]', normalizeDate(fechaNacimiento)); await sleep(500); } catch {}
    
    const telefonoLimpio = telefono.replace(/\s/g, '').replace(/^\+34/, '');
    try { await page.fill('input[name="telefono"]', telefonoLimpio); await sleep(500); } catch {}
    
    try { await page.click('button:has-text("Enviar")'); await sleep(3000); } 
    catch { await page.click('button:has-text("Solicitar código")'); await sleep(3000); }
    
    console.log("✅ SMS solicitado correctamente");
    await browser.close();
    return true;
  } catch (error) {
    console.error("❌ Error solicitando SMS:", error.message);
    if (browser) await browser.close();
    return false;
  }
}

async function completarNUSS(nie, fechaNacimiento, codigo) {
  let browser;
  console.log(`🔍 Completando NUSS con código: ${codigo}`);
  
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    await page.goto("https://portal.seg-social.gob.es/");
    await sleep(3000);
    
    try { await page.click('a:has-text("Importass")'); await sleep(3000); } 
    catch { await page.goto("https://portal.seg-social.gob.es/importass"); await sleep(3000); }
    
    try { await page.fill('input[name="nie"]', nie); await sleep(500); } catch {}
    try { await page.fill('input[name="fechaNacimiento"]', normalizeDate(fechaNacimiento)); await sleep(500); } catch {}
    
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
// 🎯 RESOLVER CAPTCHA (MEJORADO)
// ==============================================
async function resolverCaptcha(page) {
  console.log("🔊 Resolviendo CAPTCHA...");
  await sleep(3000);
  
  try {
    // Verificar que existe el elemento audio
    const audioExists = await page.$('audio');
    if (!audioExists) {
      console.error("❌ No se encontró elemento audio en la página");
      return "error";
    }
    
    const audioSrc = await page.$eval('audio', el => el.src);
    console.log("🔊 URL del audio:", audioSrc.substring(0, 100) + "...");
    
    // Descargar audio
    const response = await fetch(audioSrc);
    if (!response.ok) {
      console.error(`❌ Error descargando audio: ${response.status}`);
      return "error";
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const timestamp = Date.now();
    
    // Guardar copia local para depuración
    fs.writeFileSync(`/root/captcha-${timestamp}.mp3`, buffer);
    console.log(`🔊 Audio guardado en: /root/captcha-${timestamp}.mp3`);
    
    // Intentar con whisper-1 primero (más preciso)
    let transcription = null;
    let modelUsed = "";
    
    try {
      console.log("🔊 Intentando con whisper-1...");
      const result = await openai.audio.transcriptions.create({
        file: fs.createReadStream(`/root/captcha-${timestamp}.mp3`),
        model: "whisper-1",
        language: "es",
        response_format: "text",
        temperature: 0.1,
      });
      transcription = result;
      modelUsed = "whisper-1";
      console.log("✅ Transcripción whisper-1:", transcription);
    } catch (whisperError) {
      console.warn("⚠️ Error con whisper-1, intentando con gpt-4o-mini-transcribe:", whisperError.message);
      
      try {
        console.log("🔊 Intentando con gpt-4o-mini-transcribe...");
        const result = await openai.audio.transcriptions.create({
          file: fs.createReadStream(`/root/captcha-${timestamp}.mp3`),
          model: "gpt-4o-mini-transcribe",
          language: "es",
          prompt: "Esta es una palabra de 6 letras en español. Solo letras minúsculas, sin números.",
          temperature: 0.2,
        });
        transcription = result.text;
        modelUsed = "gpt-4o-mini-transcribe";
        console.log("✅ Transcripción gpt-4o-mini-transcribe:", transcription);
      } catch (miniError) {
        console.error("❌ Error con gpt-4o-mini-transcribe:", miniError.message);
        return "error";
      }
    }
    
    // Limpiar el texto: solo letras y números, máximo 6 caracteres
    const textoLimpio = transcription.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase().slice(0, 6);
    console.log(`✅ CAPTCHA ENVIADO (${modelUsed}): "${textoLimpio}"`);
    console.log(`✅ Longitud CAPTCHA: ${textoLimpio.length}`);
    
    // Verificar que el CAPTCHA tiene al menos 4 caracteres
    if (textoLimpio.length < 4) {
      console.warn("⚠️ CAPTCHA demasiado corto, podría ser incorrecto");
    }
    
    return textoLimpio;
  } catch (error) {
    console.error("❌ Error resolviendo CAPTCHA:", error.message);
    return "error";
  }
}

// ==============================================
// 🔄 VERIFICAR EXPEDIENTE (PRINCIPAL CON DEBUG)
// ==============================================
async function verificarExpediente(cliente) {
  let browser;
  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`👤 Cliente: ${cliente.customer_name}`);
    console.log(`📋 Expediente: ${cliente.expediente_numero}`);
    console.log(`🆔 Solicitud: ${cliente.identificador_solicitud}`);
    console.log(`${"=".repeat(60)}`);
    
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // 1. Ir a la página
    console.log("🌐 Navegando a InfoExt...");
    await page.goto(INFOEXT_URL);
    await sleep(2000);
    
    // 2. Entrar al formulario
    console.log("📝 Entrando al formulario...");
    await page.click("text=ENTRAR FORMULARIO");
    await sleep(2000);
    
    // 3. Buscar por expediente
    console.log("🔍 Seleccionando búsqueda por expediente...");
    await page.click("text=BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD");
    await sleep(2000);
    
    // 4. Rellenar datos
    console.log("📝 Rellenando datos del expediente...");
    await page.fill('input[name="idExpediente"]', cliente.identificador_solicitud);
    await page.fill('input[name="fechaPresentacion"]', normalizeDate(cliente.fecha_presentacion));
    await page.fill('input[name="anio"]', extractYear(cliente.fecha_nacimiento));
    
    // Tomar screenshot antes del CAPTCHA
    await page.screenshot({ 
      path: `/root/debug-1-formulario-${cliente.id}-${Date.now()}.png`, 
      fullPage: true 
    });
    console.log("📸 Screenshot 1: Formulario rellenado");
    
    // 5. Resolver CAPTCHA
    console.log("🎯 Resolviendo CAPTCHA...");
    const captcha = await resolverCaptcha(page);
    console.log(`🔑 CAPTCHA ENVIADO: "${captcha}"`);
    
    if (captcha === "error" || captcha.length < 4) {
      console.error("❌ Error obteniendo CAPTCHA válido");
      await page.screenshot({ 
        path: `/root/debug-error-captcha-${cliente.id}-${Date.now()}.png`, 
        fullPage: true 
      });
      await browser.close();
      return;
    }
    
    // 6. Rellenar CAPTCHA y consultar
    console.log("✍️ Rellenando CAPTCHA...");
    await page.fill('input[type="text"]', captcha);
    await sleep(2000);
    
    // Tomar screenshot antes de enviar
    await page.screenshot({ 
      path: `/root/debug-2-antes-consultar-${cliente.id}-${Date.now()}.png`, 
      fullPage: true 
    });
    console.log("📸 Screenshot 2: Antes de consultar");
    
    console.log("🔄 Haciendo clic en Consultar...");
    await page.click('button:has-text("Consultar")');
    await sleep(10000);
    
    // Tomar screenshot después de consultar
    await page.screenshot({ 
      path: `/root/debug-3-despues-consultar-${cliente.id}-${Date.now()}.png`, 
      fullPage: true 
    });
    console.log("📸 Screenshot 3: Después de consultar");
    
    // 7. Analizar respuesta
    const texto = await page.textContent("body");
    console.log("📄 PRIMEROS 800 CARACTERES DE RESPUESTA:");
    console.log(texto.substring(0, 800));
    console.log("...");
    
    // 8. Verificar si hay error de CAPTCHA
    if (texto.toLowerCase().includes("valida el captcha") || 
        texto.toLowerCase().includes("captcha incorrecto") ||
        texto.toLowerCase().includes("código de seguridad incorrecto") ||
        texto.toLowerCase().includes("por favor, valida")) {
      
      console.log("❌ ERROR DETECTADO: El CAPTCHA fue rechazado");
      console.log(`❌ CAPTCHA enviado: "${captcha}"`);
      
      // Guardar evidencia adicional
      await page.screenshot({ 
        path: `/root/debug-4-captcha-rechazado-${cliente.id}-${Date.now()}.png`, 
        fullPage: true 
      });
      console.log("📸 Screenshot 4: CAPTCHA rechazado");
      
      await browser.close();
      return;
    }
    
    // 9. Analizar estado
    const estado = analizarEstado(texto);
    console.log(`📊 Estado detectado: ${estado}`);
    
    // ==============================================
    // ⭐ SI ES FAVORABLE
    // ==============================================
    if (estado === "favorable" && !cliente.notificado_favorable) {
      console.log("🎉 EXPEDIENTE FAVORABLE DETECTADO!");
      
      // 1. Enviar WhatsApp de favorable
      await enviarWhatsAppFavorable(cliente);
      
      // 2. Extraer NIE
      const nie = extraerNIE(texto);
      if (nie) {
        console.log(`✅ NIE extraído: ${nie}`);
        await supabase.from("expediente_checks").update({ nie }).eq("id", cliente.id);
        
        // 3. Solicitar SMS a la Seguridad Social
        const smsenviado = await solicitarSMSSeguridadSocial(
          nie, 
          cliente.fecha_nacimiento, 
          cliente.customer_phone
        );
        
        if (smsenviado) {
          // 4. Enviar WhatsApp pidiendo el código
          await enviarWhatsAppPedirCodigo(cliente, nie);
          await supabase.from("expediente_checks").update({ 
            esperando_codigo: true, 
            codigo_solicitado: new Date().toISOString() 
          }).eq("id", cliente.id);
        }
      }
      
      // 5. Marcar como notificado
      await supabase.from("expediente_checks").update({ 
        notificado_favorable: true 
      }).eq("id", cliente.id);
    }
    
    // ==============================================
    // ⭐ ACTUALIZAR REGISTRO
    // ==============================================
    await supabase.from("expediente_checks").update({
      estado_detalle: estado,
      resultado: cleanText(texto).slice(0, 2000),
      ultimo_check: new Date().toISOString()
    }).eq("id", cliente.id);
    
    await browser.close();
    console.log("✅ Consulta completada exitosamente");
    
  } catch (error) {
    console.error("❌ Error en verificarExpediente:", error.message);
    if (browser) {
      try {
        await browser.screenshot({ 
          path: `/root/debug-error-${cliente.id}-${Date.now()}.png`, 
          fullPage: true 
        });
      } catch (e) {}
      await browser.close();
    }
  }
}

// ==============================================
// 📡 ENDPOINT PARA RECIBIR CÓDIGO DE MAKE
// ==============================================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/sms-code', async (req, res) => {
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
    
    const nuss = await completarNUSS(cliente.nie, cliente.fecha_nacimiento, codigoLimpio);
    
    if (nuss) {
      await supabase
        .from("expediente_checks")
        .update({ 
          nuss: nuss, 
          nuss_enviado: true,
          esperando_codigo: false,
          codigo_recibido: codigoLimpio,
          fecha_nuss: new Date().toISOString()
        })
        .eq('id', clienteId);
      
      await enviarWhatsAppNUSS(cliente, cliente.nie, nuss);
      
      return res.status(200).json({ success: true, nuss });
    } else {
      return res.status(500).json({ error: 'No se pudo obtener el NUSS' });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Sara en puerto ${PORT}`);
  console.log(`📡 Endpoint SMS: http://localhost:${PORT}/api/sms-code`);
});

// ==============================================
// 🚀 MAIN
// ==============================================
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Worker iniciado", new Date().toISOString());
  console.log("=".repeat(60));
  
  const { data: expedientes, error } = await supabase
    .from("expediente_checks")
    .select("*")
    .or('notificado_favorable.eq.false,notificado_favorable.is.null');
  
  if (error) {
    console.error("❌ Error consultando expedientes:", error.message);
    return;
  }
  
  if (!expedientes?.length) {
    console.log("📭 No hay expedientes pendientes");
    return;
  }
  
  console.log(`📋 ${expedientes.length} expedientes pendientes de verificar`);
  
  for (const exp of expedientes) {
    await verificarExpediente(exp);
    await sleep(5000);
  }
  
  console.log("✅ Ciclo completado");
}

// Ejecutar main una vez al iniciar y luego cada intervalo
main();
setInterval(main, CHECK_INTERVAL_MS);

console.log("🔄 Sara worker ejecutándose...");
console.log(`⏱️ Intervalo: ${CHECK_INTERVAL_MS / 1000 / 60} minutos`);
