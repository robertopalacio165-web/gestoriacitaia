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

// ==============================================
// 📱 WHATSAPP EN DARIJA MARROQUÍ - TODOS LOS ESTADOS
// ==============================================

async function enviarWhatsAppEstado(cliente, estado) {
  const webhook = process.env.MAKE_WEBHOOK_ESTADO;
  if (!webhook) {
    console.log("⚠️ Webhook de estado no configurado");
    return;
  }
  
  const mensajes = {
    'favorable': {
      darija: `✅ مبروك ${cliente.customer_name}! ملف ديالك تم قبوله. مزيان!`,
      es: `✅ ¡FELICIDADES ${cliente.customer_name}! Tu expediente ha sido APROBADO. ¡Excelente!`
    },
    'desfavorable': {
      darija: `❌ ${cliente.customer_name}, ملف ديالك مرفوض. خاصك تقدم طعون.`,
      es: `❌ ${cliente.customer_name}, tu expediente ha sido DENEGADO. Debes presentar recurso.`
    },
    'requerimiento': {
      darija: `📄 ${cliente.customer_name}, ملف ديالك ناقص وثائق. خاصك ترسل وثائق.`,
      es: `📄 ${cliente.customer_name}, tu expediente requiere DOCUMENTACIÓN adicional.`
    },
    'archivado': {
      darija: `📁 ${cliente.customer_name}, ملف ديالك تم أرشفته.`,
      es: `📁 ${cliente.customer_name}, tu expediente ha sido ARCHIVADO.`
    },
    'inadmitido': {
      darija: `🚫 ${cliente.customer_name}, ملف ديالك غير مقبول.`,
      es: `🚫 ${cliente.customer_name}, tu expediente NO HA SIDO ADMITIDO.`
    },
    'tramite': {
      darija: `⏳ ${cliente.customer_name}, ملف ديالك فالطريق. كنتمنو.`,
      es: `⏳ ${cliente.customer_name}, tu expediente está EN TRÁMITE. En espera.`
    },
    'desconocido': {
      darija: `❓ ${cliente.customer_name}, مازال ما عرفناش الحالة ديال ملفك. غانرجعو.`,
      es: `❓ ${cliente.customer_name}, aún no conocemos el estado de tu expediente. Volveremos a consultar.`
    }
  };
  
  const mensaje = mensajes[estado] || mensajes['desconocido'];
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: estado,
    mensaje_darija: mensaje.darija,
    mensaje_es: mensaje.es,
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp de estado (${estado}) a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${mensaje.darija}`);
  
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) console.log("✅ WhatsApp de estado enviado");
  else console.log("❌ Error WhatsApp:", await res.text());
}

async function enviarWhatsAppFavorable(cliente) {
  const webhook = process.env.MAKE_WEBHOOK_FAVORABLE;
  if (!webhook) {
    console.log("⚠️ Webhook favorable no configurado");
    return;
  }
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: "favorable",
    mensaje_darija: `🎉 مبروك ${cliente.customer_name}! ملف ديالك تقبل. دابا غادي نجيبو رقم الضمان الاجتماعي ديالك.`,
    mensaje_es: `🎉 ¡FELICIDADES ${cliente.customer_name}! Tu expediente ha sido APROBADO. Ahora vamos a obtener tu número de Seguridad Social.`,
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp favorable a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);
  
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
    mensaje_darija: `📱 ${cliente.customer_name}, الضمان الاجتماعي صيفط ليك SMS فيه كود ديال 6 أرقام.\n\nجاوب على هاد الرسالة بالكود.\n\nمثال: 123456\n\n✅ بهاد الكود غادي نجيبو رقم الضمان الاجتماعي ديالك.\n\n💼 GestoriaCitaIA`,
    mensaje_es: `📱 ${cliente.customer_name}, la Seguridad Social te ha enviado un SMS con un código de 6 dígitos.\n\nRESPONDE A ESTE MENSAJE con el código.\n\nEjemplo: 123456\n\n✅ Con este código obtendremos tu NUSS.\n\n💼 GestoriaCitaIA`,
    tipo: "pedir_codigo",
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp pidiendo código a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);
  
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
    mensaje_darija: `🎉 تهانينا ${cliente.customer_name}!\n\nرقم الضمان الاجتماعي ديالك هو:\n📌 ${nuss}\n\n✅ بهاد الرقم يمكنك التسجيل فالصندوق.\n\n📋 NIE ديالك هو: ${nie}\n\n💼 GestoriaCitaIA`,
    mensaje_es: `🎉 FELICIDADES ${cliente.customer_name}!\n\nTu NÚMERO DE SEGURIDAD SOCIAL es:\n📌 ${nuss}\n\n✅ Con este número puedes darte de alta en la Seguridad Social.\n\n📋 Tu NIE es: ${nie}\n\n💼 GestoriaCitaIA`,
    tipo: "nuss",
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp con NUSS a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);
  
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) console.log("✅ WhatsApp NUSS enviado");
  else console.log("❌ Error:", await res.text());
}

// ==============================================
// 🎯 RESOLVER CAPTCHA
// ==============================================
async function resolverCaptcha(page) {
  console.log("🔊 Resolviendo CAPTCHA por audio...");
  
  try {
    await page.waitForSelector('audio', { timeout: 10000 });
    await sleep(2000);
    
    const audioSrc = await page.$eval('audio', el => el.src);
    console.log(`🔊 URL audio: ${audioSrc.substring(0, 80)}...`);
    
    const response = await fetch(audioSrc, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Error descargando audio: ${response.status}`);
      return "error";
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    if (buffer.length < 1000) {
      console.error(`❌ Audio demasiado pequeño: ${buffer.length} bytes`);
      return "error";
    }
    
    const timestamp = Date.now();
    const audioPath = `/root/captcha-${timestamp}.mp3`;
    fs.writeFileSync(audioPath, buffer);
    console.log(`✅ Audio guardado: ${audioPath} (${buffer.length} bytes)`);
    
    let transcription = null;
    let modelUsed = "whisper-1";
    
    try {
      console.log("🔊 Transcribiendo con whisper-1...");
      const result = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        language: "es",
        response_format: "text",
        temperature: 0.0,
        prompt: "El audio contiene una palabra de 6 letras en español. Solo letras minúsculas. Ejemplos: cinco, seis, siete, ocho, nueve.",
      });
      transcription = result;
      console.log(`✅ Transcripción (${modelUsed}): "${transcription}"`);
    } catch (error) {
      console.warn(`⚠️ Error whisper-1: ${error.message}`);
      
      try {
        console.log("🔊 Intentando con gpt-4o-mini-transcribe...");
        const result = await openai.audio.transcriptions.create({
          file: fs.createReadStream(audioPath),
          model: "gpt-4o-mini-transcribe",
          language: "es",
          temperature: 0.0,
          prompt: "Palabra de 6 letras en español.",
        });
        transcription = result.text;
        modelUsed = "gpt-4o-mini-transcribe";
        console.log(`✅ Transcripción (${modelUsed}): "${transcription}"`);
      } catch (error2) {
        console.error(`❌ Error en ambos modelos: ${error2.message}`);
        return "error";
      }
    }
    
    let textoLimpio = transcription
      .replace(/[^a-zA-Záéíóúüñ]/g, " ")
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 0)[0] || "";
    
    console.log(`📝 Texto extraído: "${textoLimpio}"`);
    
    const normalizar = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
      'ü': 'u', 'ñ': 'n'
    };
    textoLimpio = textoLimpio.split('').map(c => normalizar[c] || c).join('');
    
    const correcciones = {
      'cincoc': 'cinco', 'cincot': 'cinco', 'cincu': 'cinco',
      'cinca': 'cinco', 'cinc': 'cinco', 'sinco': 'cinco',
      'sinko': 'cinco', 'dobres': 'dos', 'dobreu': 'dos',
      'dobre': 'dos', 'dobr': 'dos', 'doss': 'dos',
      'tres': 'tres', 'cuatro': 'cuatro', 'cuatr': 'cuatro',
      'seis': 'seis', 'siete': 'siete', 'ocho': 'ocho',
      'nueve': 'nueve', 'diez': 'diez', 'once': 'once',
      'doce': 'doce', 'trece': 'trece', 'catorce': 'catorce',
      'quince': 'quince', 'veinte': 'veinte'
    };
    
    if (correcciones[textoLimpio]) {
      textoLimpio = correcciones[textoLimpio];
      console.log(`✅ Corregido: "${textoLimpio}"`);
    }
    
    if (textoLimpio === 'mm' || textoLimpio === 'mmm' || textoLimpio.length < 3) {
      console.warn(`⚠️ Audio inaudible: "${textoLimpio}"`);
      return "error";
    }
    
    console.log(`🔑 CAPTCHA FINAL: "${textoLimpio}" (${textoLimpio.length} letras)`);
    
    if (/^[a-z]+$/.test(textoLimpio) && textoLimpio.length >= 3) {
      return textoLimpio;
    } else {
      console.warn(`⚠️ CAPTCHA inválido: "${textoLimpio}"`);
      return "error";
    }
    
  } catch (error) {
    console.error("❌ Error en resolverCaptcha:", error.message);
    return "error";
  }
}

// ==============================================
// 🔄 SOLICITAR SMS SEGURIDAD SOCIAL
// ==============================================
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
// 🔄 VERIFICAR EXPEDIENTE
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
    
    console.log("🌐 Navegando a InfoExt...");
    await page.goto(INFOEXT_URL);
    await sleep(2000);
    
    console.log("📝 Entrando al formulario...");
    await page.click("text=ENTRAR FORMULARIO");
    await sleep(2000);
    
    console.log("🔍 Seleccionando búsqueda por expediente...");
    await page.click("text=BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD");
    await sleep(2000);
    
    console.log("📝 Rellenando datos del expediente...");
    await page.fill('input[name="idExpediente"]', cliente.identificador_solicitud);
    await page.fill('input[name="fechaPresentacion"]', normalizeDate(cliente.fecha_presentacion));
    await page.fill('input[name="anio"]', extractYear(cliente.fecha_nacimiento));
    
    console.log("🎯 Resolviendo CAPTCHA...");
    let captcha = null;
    let intentos = 0;
    const maxIntentos = 3;
    
    while (captcha === null && intentos < maxIntentos) {
      intentos++;
      console.log(`🔄 Intento ${intentos}/${maxIntentos}`);
      
      if (intentos > 1) {
        console.log("🔄 Recargando página para nuevo CAPTCHA...");
        await page.reload();
        await sleep(3000);
        await page.click("text=ENTRAR FORMULARIO");
        await sleep(2000);
        await page.click("text=BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD");
        await sleep(2000);
        await page.fill('input[name="idExpediente"]', cliente.identificador_solicitud);
        await page.fill('input[name="fechaPresentacion"]', normalizeDate(cliente.fecha_presentacion));
        await page.fill('input[name="anio"]', extractYear(cliente.fecha_nacimiento));
        await sleep(1000);
      }
      
      captcha = await resolverCaptcha(page);
      
      if (captcha && captcha !== "error") {
        console.log(`✍️ Rellenando CAPTCHA: "${captcha}"`);
        await page.fill('input[type="text"]', captcha);
        await sleep(1000);
        await page.click('button:has-text("Consultar")');
        await sleep(8000);
        
        const pageText = await page.textContent("body");
        if (pageText.toLowerCase().includes("valida el captcha") || 
            pageText.toLowerCase().includes("captcha incorrecto") ||
            pageText.toLowerCase().includes("código de seguridad incorrecto")) {
          console.log(`❌ CAPTCHA "${captcha}" rechazado`);
          captcha = null;
        }
      } else {
        captcha = null;
      }
    }
    
    if (!captcha) {
      console.error("❌ No se pudo resolver CAPTCHA después de 3 intentos");
      await page.screenshot({ 
        path: `/root/debug-error-final-${cliente.id}-${Date.now()}.png`, 
        fullPage: true 
      });
      await browser.close();
      return;
    }
    
    const texto = await page.textContent("body");
    console.log("📄 PRIMEROS 500 CARACTERES DE RESPUESTA:");
    console.log(texto.substring(0, 500));
    
    const estado = analizarEstado(texto);
    console.log(`📊 Estado detectado: ${estado}`);
    
    // ==============================================
    // 📱 ENVIAR WHATSAPP PARA TODOS LOS ESTADOS
    // ==============================================
    await enviarWhatsAppEstado(cliente, estado);
    
    // ==============================================
    // ⭐ SI ES FAVORABLE - FLUJO COMPLETO
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

main();
setInterval(main, CHECK_INTERVAL_MS);

console.log("🔄 Sara worker ejecutándose...");
console.log(`⏱️ Intervalo: ${CHECK_INTERVAL_MS / 1000 / 60} minutos`);
