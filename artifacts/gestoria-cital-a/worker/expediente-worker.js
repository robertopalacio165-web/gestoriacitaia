const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const axios = require("axios");

const OpenAI = require("openai");
const { Solver } = require("2captcha");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("playwright");
const express = require("express");

// ==============================================
// CONFIGURACIÓN
// ==============================================
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/"/g, "").trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, "").trim();
const CHECK_INTERVAL_MS = 1 * 60 * 1000;
const INFOEXT_URL = "https://infoext2.delegaciondelgobierno.gob.es/infoext2/consulta.html";
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan variables de Supabase");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const solver = new Solver(process.env.TWOCAPTCHA_API_KEY);

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
  if (body.includes("bloqueado") || body.includes("bloqueada")) return "bloqueado";
  if (body.includes("requerimiento") || body.includes("documentación") || body.includes("subsanar") || body.includes("falta")) return "requerimiento";
  if (body.includes("archivado")) return "archivado";
  if (body.includes("inadmitido")) return "inadmitido";
  if (body.includes("en trámite") || body.includes("en tramite") || body.includes("pendiente") || body.includes("en estudio") || body.includes("tramitación") || body.includes("en proceso")) return "tramite";
  if (body.includes("resuelto")) return "resuelto";

  return "desconocido";
}

// ==============================================
// FUNCIONES PARA NUSS Y SEGURIDAD SOCIAL
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
// 📤 SUBIR PDF A SUPABASE STORAGE
// ==============================================
async function subirPDFaSupabase(pdfPath, nie, nombre) {
  try {
    console.log('📤 Subiendo PDF a Supabase Storage...');
    
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = `tasa_${nie}_${nombre.replace(/\s/g, '_')}_${Date.now()}.pdf`;
    
    const { data, error } = await supabase.storage
      .from('tasas-pdf')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('❌ Error subiendo PDF:', error.message);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('tasas-pdf')
      .getPublicUrl(fileName);
    
    console.log('✅ PDF subido a Supabase');
    console.log('🔗 URL:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// ==============================================
// 📨 ENVIAR PDF POR WHATSAPP (DIRECTO)
// ==============================================
async function enviarPDFWhatsApp(telefono, pdfUrl, nombre, nuss) {
  const TOKEN = 'EAAX4uaZASSO0BR8WjHnHefCITS2nIiZAB94ydOZBxpz6nMCIfA98yjOdjZCcGWBKYziXu5zZC3QN42cRiF67UB6xboreIXCVPguVA5yqT0z3tcQGCdBK3GYzF6QlYbpQrcCKvwozOQEWi9fRUke5kQWb2k3eWIa5ACdbDpcqBlv9dId38SC3BMb7O9ufjmFKU7j1rMB4aUw82vH0yzq1ULXiuQ18mQBHwafPhTleRpSYW219avjTXuFovqvdd9ZBBecsJAOZADuG8LYC10ZBHCZAuPZByE';
  const PHONE_ID = '1121390731046153';
  
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: {
          body: `🎉 ${nombre}, tu Tasa 790-012 está lista!\n\n🔑 NUSS: ${nuss}\n💰 Importe: 16.08€`
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: telefono,
        type: "document",
        document: {
          link: pdfUrl,
          filename: `Tasa_790-012_${nombre.replace(/\s/g, '_')}.pdf`
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ PDF enviado por WhatsApp');
    console.log('📝 ID mensaje:', res.data?.messages?.[0]?.id);
    return true;
  } catch (error) {
    console.error('❌ Error enviando PDF:', error.response?.data || error.message);
    return false;
  }
}

// ==============================================
// 📄 GENERAR TASA AUTOMÁTICAMENTE
// ==============================================
async function generarTasa(nie, nombreCompleto, expediente) {
  let browser;
  console.log(`📄 Generando tasa para ${nombreCompleto} (${nie})`);

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    console.log("🌐 Navegando a la página de tasas...");
    await page.goto('https://sede.policia.gob.es/Tasa790_012/ImpresoRellenar', { waitUntil: 'networkidle' });
    await sleep(2000);

    console.log("📝 Rellenando datos del cliente...");
    await page.fill('#nif', nie);
    await page.fill('#nombre', nombreCompleto);
    await page.fill('#calle', 'Pasaje');
    await page.fill('#via', 'Progresso');
    await page.fill('#numero', '1');
    await page.fill('#localidad', 'Sabadell');
    await page.fill('#municipio', 'Sabadell');
    await page.fill('#provincia', 'Barcelona');
    await page.fill('#codigoPostal', '08206');
    await page.fill('#telefono', '600000000');

    console.log("💰 Seleccionando tasa 5...");
    await page.check('#tasa5Input');
    await sleep(3000);

    const importe = await page.locator('#total').inputValue().catch(() => 'NO_ENCONTRADO');
    console.log(`💰 Importe calculado: ${importe}€`);

    await page.check('#efectivo');

    console.log("🎯 Resolviendo CAPTCHA para la tasa...");

    const captchaImg = await page.locator('img[id*="captcha"], img[src*="captcha"]').first();
    const imgBuffer = await captchaImg.screenshot({ type: 'png' });

    fs.writeFileSync(`/root/captcha-tasa-${Date.now()}.png`, imgBuffer);
    console.log("📸 CAPTCHA guardado");

    const result = await solver.imageCaptcha(imgBuffer.toString('base64'));

    if (result && result.data) {
      console.log(`✅ CAPTCHA resuelto: "${result.data}"`);
      await page.fill('#codSeguridadForm', result.data);
    } else {
      throw new Error('No se pudo resolver CAPTCHA');
    }

    console.log("📥 Descargando PDF de la tasa...");

    if (!fs.existsSync('/root/pdfs')) {
      fs.mkdirSync('/root/pdfs', { recursive: true });
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.click('input[value="Descargar impreso rellenado"]');
    console.log("⏳ Esperando descarga...");

    const download = await downloadPromise;
    const fecha = new Date().toISOString().slice(0,10);
    const pdfNombre = `tasa_790-012_${nie}_${expediente}_${fecha}.pdf`;
    const pdfPath = `/root/pdfs/${pdfNombre}`;

    await download.saveAs(pdfPath);

    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`✅ Tasa generada exitosamente: ${pdfPath}`);
      console.log(`📄 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
      return pdfPath;
    } else {
      console.error("❌ El PDF no se guardó correctamente");
      return null;
    }

  } catch (error) {
    console.error("❌ Error generando tasa:", error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// ==============================================
// 📨 WHATSAPP FINAL CON NUSS + TASA + PDF
// ==============================================
async function enviarWhatsAppFinal(cliente, nie, nuss, pdfUrl) {
  await enviarPDFWhatsApp(cliente.customer_phone, pdfUrl, cliente.customer_name, nuss);
  
  const webhook = process.env.MAKE_WEBHOOK_FINAL || process.env.MAKE_WEBHOOK_NUSS;
  if (webhook) {
    try {
      const payload = {
        id: cliente.id,
        nombre: cliente.customer_name,
        telefono: cliente.customer_phone,
        nie: nie,
        nuss: nuss,
        pdf_url: pdfUrl,
        mensaje_darija: `🎉 مبروك ${cliente.customer_name}! هنا رقم الضمان الاجتماعي ديالك: ${nuss}\n\n📄 وتاعسة ديالك جاهزة. دوز للبنك القريب وخلصها. حظ سعيد في التقنين ديالك فإسبانيا!`,
        mensaje_es: `🎉 FELICIDADES ${cliente.customer_name}! Tu NUSS es: ${nuss}\n\n📄 Tu tasa está lista. Ve al banco más cercano y págala. ¡Mucha suerte en tu regularización en España!`,
        tipo: "final",
        fecha: new Date().toISOString()
      };
      
      await axios.post(webhook, payload);
      console.log('✅ WhatsApp FINAL enviado por Make');
    } catch (error) {
      console.error('❌ Error enviando Make:', error.message);
    }
  }
}

// ==============================================
// 📨 WHATSAPP NIE DETECTADO
// ==============================================
async function enviarWhatsAppNIE(cliente, nie) {
  const webhook = process.env.MAKE_WEBHOOK_NIE || process.env.MAKE_WEBHOOK_ESTADO;
  if (!webhook) {
    console.log("⚠️ Webhook NIE no configurado");
    return;
  }

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    nie: nie,
    mensaje_darija: `✅ ${cliente.customer_name}! NIE ديالك خرج: ${nie}\n\nهاد شي إشارة مزيانة. نتمناو يخرج القرار النهائي قريبا.`,
    mensaje_es: `✅ ${cliente.customer_name}! Tu NIE ha salido: ${nie}\n\nEs una buena señal. Esperamos que salga la resolución final pronto.`,
    tipo: "nie_detectado",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp NIE a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) console.log("✅ WhatsApp NIE enviado");
  else console.log("❌ Error WhatsApp NIE:", await res.text());
}

// ==============================================
// 📨 WHATSAPP FAVORABLE
// ==============================================
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
    mensaje_darija: `🎉 مبروك ${cliente.customer_name}! ملف ديالك تقبل.\n\nدابا تسنا رسالة SMS فتيليفونك. خد الكود ورد علينا به هنا باش نكملك الإجراءات.`,
    mensaje_es: `🎉 FELICIDADES ${cliente.customer_name}! Tu expediente ha sido APROBADO.\n\nAhora espera un mensaje SMS en tu móvil. Coge el código y respóndenos aquí para completar el trámite.`,
    tipo: "favorable",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp FAVORABLE a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) console.log("✅ WhatsApp FAVORABLE enviado");
  else console.log("❌ Error WhatsApp FAVORABLE:", await res.text());
}

// ==============================================
// 📨 WHATSAPP DESFAVORABLE
// ==============================================
async function enviarWhatsAppDesfavorable(cliente) {
  const webhook = process.env.MAKE_WEBHOOK_DESFAVORABLE || process.env.MAKE_WEBHOOK_ESTADO;
  if (!webhook) {
    console.log("⚠️ Webhook desfavorable no configurado");
    return;
  }

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: "desfavorable",
    mensaje_darija: `❌ ${cliente.customer_name}! ملف ديالك مرفوض.\n\nخاصك تتواصل مع المحامي ديالك بسرعة. كاين شي مشكل فملفك.`,
    mensaje_es: `❌ ${cliente.customer_name}! Tu expediente ha sido DENEGADO.\n\nTienes que contactar con tu abogado urgentemente. Hay algo mal en tu expediente.`,
    tipo: "desfavorable",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp DESFAVORABLE a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) console.log("✅ WhatsApp DESFAVORABLE enviado");
  else console.log("❌ Error WhatsApp DESFAVORABLE:", await res.text());
}

// ==============================================
// 📨 WHATSAPP PEDIR CÓDIGO SMS
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
    mensaje_darija: `📱 ${cliente.customer_name}! وصل ليك SMS بالكود. جاوب على هاد الرسالة بالكود باش نكملو.`,
    mensaje_es: `📱 ${cliente.customer_name}! Te ha llegado un SMS con el código. RESPONDE a este mensaje con el código para continuar.`,
    tipo: "pedir_codigo",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp PEDIR CÓDIGO a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) console.log("✅ WhatsApp PEDIR CÓDIGO enviado");
  else console.log("❌ Error:", await res.text());
}

// ==============================================
// 📨 WHATSAPP NUSS ENCONTRADO
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
    mensaje_darija: `🔑 ${cliente.customer_name}! رقم الضمان الاجتماعي ديالك: ${nuss}\n\nدابا غادي نعمرو لك التاعسة ويوصلك PDF.`,
    mensaje_es: `🔑 ${cliente.customer_name}! Tu NUSS es: ${nuss}\n\nAhora vamos a rellenar tu tasa y te llegará el PDF.`,
    tipo: "nuss",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp NUSS a: ${cliente.customer_phone}`);
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
// 📨 WHATSAPP ESTADO (TRAMITE, BLOQUEADO, ETC)
// ==============================================
async function enviarWhatsAppEstado(cliente, estado) {
  const webhook = process.env.MAKE_WEBHOOK_ESTADO;
  if (!webhook) {
    console.log("⚠️ Webhook de estado no configurado");
    return;
  }

  const mensajes = {
    'tramite': {
      darija: `⏳ ${cliente.customer_name}! ملف ديالك فالطريق. كنتمنو.`,
      es: `⏳ ${cliente.customer_name}! Tu expediente está EN TRÁMITE. Estamos pendientes.`
    },
    'bloqueado': {
      darija: `🔒 ${cliente.customer_name}! ملف ديالك محظور. خاصك تتواصل مع المحامي.`,
      es: `🔒 ${cliente.customer_name}! Tu expediente está BLOQUEADO. Contacta con tu abogado.`
    },
    'requerimiento': {
      darija: `📄 ${cliente.customer_name}! ملف ديالك ناقص وثائق. خاصك ترسل وثائق جديدة.`,
      es: `📄 ${cliente.customer_name}! Tu expediente requiere DOCUMENTACIÓN adicional.`
    },
    'archivado': {
      darija: `📁 ${cliente.customer_name}! ملف ديالك تم أرشفته.`,
      es: `📁 ${cliente.customer_name}! Tu expediente ha sido ARCHIVADO.`
    },
    'inadmitido': {
      darija: `🚫 ${cliente.customer_name}! ملف ديالك غير مقبول.`,
      es: `🚫 ${cliente.customer_name}! Tu expediente NO HA SIDO ADMITIDO.`
    },
    'resuelto': {
      darija: `✅ ${cliente.customer_name}! ملف ديالك تم حله.`,
      es: `✅ ${cliente.customer_name}! Tu expediente ha sido RESUELTO.`
    },
    'desconocido': {
      darija: `❓ ${cliente.customer_name}! مازال ما عرفناش الحالة ديال ملفك. غانرجعو.`,
      es: `❓ ${cliente.customer_name}! Aún no conocemos el estado de tu expediente. Volveremos.`
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

  console.log(`📱 Enviando WhatsApp estado (${estado}) a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${mensaje.darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) console.log("✅ WhatsApp estado enviado");
  else console.log("❌ Error WhatsApp:", await res.text());
}

// ==============================================
// 🎯 RESOLVER CAPTCHA CON 2CAPTCHA (IMAGEN)
// ==============================================
async function resolverCaptcha(page) {
  console.log("🔊 Resolviendo CAPTCHA con 2Captcha...");

  try {
    await sleep(2000);

    console.log("🔍 Buscando imagen del CAPTCHA...");

    let captchaImg = await page.locator('img[alt="captcha"]');
    if (await captchaImg.count() === 0) {
      captchaImg = await page.locator('img[src*="captcha"]');
    }
    if (await captchaImg.count() === 0) {
      captchaImg = await page.locator('img[id*="captcha"]');
    }
    if (await captchaImg.count() === 0) {
      captchaImg = await page.locator('form img:not([alt*="logo"]):not([alt*="icon"])');
    }

    if (await captchaImg.count() === 0) {
      console.error("❌ No se encontró imagen del CAPTCHA");
      return "error";
    }

    console.log(`✅ Imagen CAPTCHA encontrada (${await captchaImg.count()} elementos)`);

    const imagePath = `/root/captcha-image-${Date.now()}.png`;
    await captchaImg.first().screenshot({
      path: imagePath
    });

    console.log(`📸 CAPTCHA guardado: ${imagePath}`);

    console.log("🔧 Enviando a 2Captcha...");
    const imageBase64 = fs.readFileSync(imagePath, "base64");

    const captchaResult = await solver.imageCaptcha(imageBase64, {
      numeric: 4,
      min_len: 5,
      max_len: 5,
      phrase: 0,
      case_sensitive: 0
    });

    console.log("📤 Respuesta 2Captcha:", captchaResult);

    let textoConvertido = String(
      captchaResult.data ||
      captchaResult.code ||
      captchaResult.text ||
      ""
    )
    .replace(/[^a-zA-Z0-9]/g, "")
    .trim();

    if (textoConvertido.length < 4) {
      console.log("❌ CAPTCHA inválido:", textoConvertido);
      return "error";
    }

    console.log(`🔑 CAPTCHA FINAL: "${textoConvertido}" (${textoConvertido.length} caracteres)`);
    return textoConvertido;

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
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
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
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
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

        let captchaInput = await page.locator('input[placeholder*="Introduce"]');
        if (await captchaInput.count() === 0) {
          captchaInput = page.locator('input').nth(3);
        }
        if (await captchaInput.count() === 0) {
          captchaInput = page.locator('form input[type="text"]');
        }
        if (await captchaInput.count() === 0) {
          captchaInput = page.locator('input:visible').last();
        }

        await captchaInput.fill(captcha);
        console.log(`✅ CAPTCHA rellenado`);

        await page.screenshot({
          path: `/root/debug-captcha-${Date.now()}.png`,
          fullPage: true
        });
        console.log(`📸 Captura guardada`);

        await sleep(1000);
        await page.click('button:has-text("Consultar")');
        await sleep(8000);

        const pageText = await page.textContent("body");

        if (pageText.toLowerCase().includes("valida el captcha") ||
            pageText.toLowerCase().includes("captcha incorrecto")) {
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
    const nie = extraerNIE(texto);

    // ==============================================
    // 📨 NOTIFICAR NIE DETECTADO (SOLO 1 VEZ)
    // ==============================================
    if (nie && !cliente.nie_notificado) {
      console.log(`📨 NIE detectado: ${nie} - Enviando WhatsApp...`);
      await enviarWhatsAppNIE(cliente, nie);
      await supabase.from("expediente_checks").update({
        nie: nie,
        nie_notificado: true
      }).eq("id", cliente.id);
    } else if (nie && !cliente.nie) {
      await supabase.from("expediente_checks").update({
        nie: nie
      }).eq("id", cliente.id);
    }

    // ==============================================
    // 📨 NOTIFICAR DESFAVORABLE (SOLO 1 VEZ)
    // ==============================================
    if (estado === "desfavorable" && !cliente.notificado_desfavorable) {
      console.log(`📨 DESFAVORABLE detectado - Enviando WhatsApp...`);
      await enviarWhatsAppDesfavorable(cliente);
      await supabase.from("expediente_checks").update({
        notificado_desfavorable: true,
        estado_detalle: estado
      }).eq("id", cliente.id);
    }

    // ==============================================
    // 📨 NOTIFICAR FAVORABLE (SOLO 1 VEZ) + FLUJO COMPLETO
    // ==============================================
    if (estado === "favorable" && !cliente.notificado_favorable) {
      console.log("🎉 EXPEDIENTE FAVORABLE DETECTADO!");

      await enviarWhatsAppFavorable(cliente);

      if (nie) {
        const smsenviado = await solicitarSMSSeguridadSocial(
          nie,
          cliente.fecha_nacimiento,
          cliente.customer_phone
        );

        if (smsenviado) {
          await enviarWhatsAppPedirCodigo(cliente, nie);
          await supabase.from("expediente_checks").update({
            esperando_codigo: true,
            codigo_solicitado: new Date().toISOString(),
            notificado_favorable: true,
            estado_detalle: estado
          }).eq("id", cliente.id);
        }
      }
    }

    // ==============================================
    // 📨 NOTIFICAR OTROS ESTADOS (SOLO 1 VEZ)
    // ==============================================
    const estadoNotificadoKey = `notificado_${estado}`;
    if (estado !== "favorable" && estado !== "desfavorable" && estado !== "tramite" && estado !== "desconocido" && !cliente[estadoNotificadoKey]) {
      await enviarWhatsAppEstado(cliente, estado);
      await supabase.from("expediente_checks").update({
        [estadoNotificadoKey]: true,
        estado_detalle: estado
      }).eq("id", cliente.id);
    }

    // ==============================================
    // 📨 NOTIFICAR TRAMITE (SOLO 1 VEZ)
    // ==============================================
    if (estado === "tramite" && !cliente.notificado_tramite) {
      await enviarWhatsAppEstado(cliente, estado);
      await supabase.from("expediente_checks").update({
        notificado_tramite: true,
        estado_detalle: estado
      }).eq("id", cliente.id);
    }

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

    // ==============================================
    // 🔄 COMPLETAR NUSS
    // ==============================================
    const nuss = await completarNUSS(cliente.nie, cliente.fecha_nacimiento, codigoLimpio);

    if (nuss) {
      await supabase.from("expediente_checks").update({
        nuss: nuss,
        nuss_enviado: true,
        esperando_codigo: false,
        codigo_recibido: codigoLimpio,
        fecha_nuss: new Date().toISOString()
      }).eq('id', clienteId);

      await enviarWhatsAppNUSS(cliente, cliente.nie, nuss);

      // ==============================================
      // 📄 GENERAR TASA AUTOMÁTICAMENTE
      // ==============================================
      console.log("📄 Generando tasa automáticamente...");
      const pdfPath = await generarTasa(
        cliente.nie,
        cliente.customer_name,
        cliente.expediente_numero
      );

      if (pdfPath) {
        const pdfUrl = await subirPDFaSupabase(pdfPath, cliente.nie, cliente.customer_name);
        
        if (pdfUrl) {
          await supabase.from("expediente_checks").update({
            tas_generated: true,
            tas_pdf_url: pdfUrl,
            fecha_favorable: new Date().toISOString()
          }).eq('id', clienteId);

          // 📨 WHATSAPP FINAL
          await enviarWhatsAppFinal(cliente, cliente.nie, nuss, pdfUrl);
          
          console.log(`✅ Proceso completado para ${cliente.customer_name}`);
          console.log(`📄 PDF URL: ${pdfUrl}`);
          console.log(`🆔 NUSS: ${nuss}`);
        }
      }

      return res.status(200).json({ success: true, nuss, pdf_generado: pdfPath ? true : false });
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
