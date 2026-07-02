const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");

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
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
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
// 📨 WHATSAPP FUNCTIONS
// ==============================================

// 1️⃣ WhatsApp Bienvenida (una sola vez)
async function enviarWhatsAppBienvenida(cliente) {
  const webhook = process.env.MAKE_WEBHOOK_BIENVENIDA;
  if (!webhook) {
    console.log("⚠️ Webhook bienvenida no configurado");
    return false;
  }

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    direccion: cliente.direccion || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    fecha_nacimiento: cliente.fecha_nacimiento || "",
    expediente: cliente.expediente_numero,
    mensaje_darija: `👋 Salam ${cliente.customer_name}! Sara tlebt 3lik l'exposant dyalk. Ghat9lb 3lih kola 30 minute w ghan9olik 7al l7ala dialo.`,
    mensaje_es: `👋 Hola ${cliente.customer_name}! Sara ha comenzado a vigilar tu expediente. Revisará cada 30 minutos y te informará del estado.`,
    tipo: "bienvenida",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 1️⃣ BIENVENIDA a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 1️⃣ BIENVENIDA enviado");
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
}

// 2️⃣ WhatsApp NIE detectado (una sola vez)
async function enviarWhatsAppNIE(cliente, nie) {
  const webhook = process.env.MAKE_WEBHOOK_NIE;
  if (!webhook) {
    console.log("⚠️ Webhook NIE no configurado");
    return false;
  }

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    direccion: cliente.direccion || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    fecha_nacimiento: cliente.fecha_nacimiento || "",
    nie: nie,
    mensaje_darija: `✅ ${cliente.customer_name}, l9ina NIE dyalk: ${nie}. Daba ghanb9aw ntab3o l'exposant dyalk.`,
    mensaje_es: `✅ ${cliente.customer_name}, hemos localizado tu NIE: ${nie}. Ahora seguiremos tu expediente.`,
    tipo: "nie_detectado",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 2️⃣ NIE DETECTADO a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 2️⃣ NIE DETECTADO enviado");
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
}

// 3️⃣ WhatsApp Favorable
async function enviarWhatsAppFavorable(cliente) {
  const webhook = process.env.MAKE_WEBHOOK_FAVORABLE;
  if (!webhook) {
    console.log("⚠️ Webhook favorable no configurado");
    return false;
  }

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    direccion: cliente.direccion || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    fecha_nacimiento: cliente.fecha_nacimiento || "",
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    mensaje_darija: `🎉 مبروك ${cliente.customer_name}! ملف ديالك تقبل. غادي يصلك SMS من الضمان الاجتماعي فهادي اللحظة. جاوب على هاد الرسالة بالكود لي جاك فـ SMS.`,
    mensaje_es: `🎉 ¡FELICIDADES ${cliente.customer_name}! Tu expediente ha sido FAVORABLE. Vas a recibir un SMS de la Seguridad Social ahora mismo. RESPONDE a este mensaje con el código que te llegue.`,
    tipo: "favorable",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 3️⃣ FAVORABLE a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 3️⃣ FAVORABLE enviado");
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
}

// 4️⃣ WhatsApp NUSS
async function enviarWhatsAppNUSS(cliente, nie, nuss) {
  const webhook = process.env.MAKE_WEBHOOK_NUSS;
  if (!webhook) {
    console.log("⚠️ Webhook NUSS no configurado");
    return false;
  }

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    direccion: cliente.direccion || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    fecha_nacimiento: cliente.fecha_nacimiento || "",
    nie: nie,
    nuss: nuss,
    mensaje_darija: `🎉 تهانينا ${cliente.customer_name}! رقم الضمان الاجتماعي ديالك هو: ${nuss}\n\n📌 هاد الرقم خاصك باش تتعامل مع الضمان الاجتماعي فلمغريب.`,
    mensaje_es: `🎉 FELICIDADES ${cliente.customer_name}! Tu Número de Seguridad Social (NUSS) es: ${nuss}\n\n📌 Este número es necesario para todos tus trámites con la Seguridad Social en España.`,
    tipo: "nuss",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 4️⃣ NUSS a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 4️⃣ NUSS enviado");
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
}

// 5️⃣ WhatsApp Tasa 790
async function enviarWhatsAppTasa(cliente, pdfPath) {
  const webhook = process.env.MAKE_WEBHOOK_TASA;
  if (!webhook) {
    console.log("⚠️ Webhook tasa no configurado");
    return false;
  }

  const pdfUrl = `http://167.233.48.133:8000/${pdfPath.split('/').pop()}`;

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    direccion: cliente.direccion || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    fecha_nacimiento: cliente.fecha_nacimiento || "",
    pdf_url: pdfUrl,
    mensaje_darija: `📄 ${cliente.customer_name}, تاعسة 790 ديالك جاهزة:\n${pdfUrl}\n\n📌 خطوات الجاية:\n1️⃣ طبع التاعسة\n2️⃣ سير لأي بنك وخلص 14.99€\n3️⃣ مشي لمكتب البوليس باش تاخد بصماتك\n4️⃣ قدم الوثائق كاملين فلمكتب ديال الإقامة`,
    mensaje_es: `📄 ${cliente.customer_name}, tu Tasa 790 está lista:\n${pdfUrl}\n\n📌 Próximos pasos:\n1️⃣ Imprime la tasa\n2️⃣ Ve a cualquier banco y paga 14.99€\n3️⃣ Ve a la comisaría de policía para tomar tus huellas\n4️⃣ Presenta toda la documentación en la oficina de extranjería`,
    tipo: "tasa",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 5️⃣ TASA a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 5️⃣ TASA enviado");
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
}

// 6️⃣ WhatsApp Estado alternativo
async function enviarWhatsAppEstado(cliente, estado) {
  const webhook = process.env.MAKE_WEBHOOK_ESTADO;
  if (!webhook) {
    console.log("⚠️ Webhook estado no configurado");
    return false;
  }

  const mensajes = {
    'desfavorable': {
      darija: `❌ ${cliente.customer_name}, ملف ديالك مرفوض. خاصك تقدم طعون فالمدة القانونية.`,
      es: `❌ ${cliente.customer_name}, tu expediente ha sido DENEGADO. Debes presentar recurso en el plazo legal.`
    },
    'requerimiento': {
      darija: `📄 ${cliente.customer_name}, ملف ديالك ناقص وثائق. خاصك ترسل الوثائق الناقصة فالمدة القانونية.`,
      es: `📄 ${cliente.customer_name}, tu expediente requiere DOCUMENTACIÓN adicional. Debes presentar los documentos faltantes en el plazo legal.`
    },
    'archivado': {
      darija: `📁 ${cliente.customer_name}, ملف ديالك تم أرشفته. خاصك تتواصل مع مكتب الإقامة باش تعرف السبب.`,
      es: `📁 ${cliente.customer_name}, tu expediente ha sido ARCHIVADO. Debes contactar con la oficina de extranjería para saber el motivo.`
    },
    'inadmitido': {
      darija: `🚫 ${cliente.customer_name}, ملف ديالك غير مقبول. خاصك تقدم طعون.`,
      es: `🚫 ${cliente.customer_name}, tu expediente NO HA SIDO ADMITIDO. Debes presentar recurso.`
    },
    'tramite': {
      darija: `⏳ ${cliente.customer_name}, ملف ديالك فالطريق. كنتمنو ليك الخير. غانرجعو نعلموك كولشي جديد.`,
      es: `⏳ ${cliente.customer_name}, tu expediente está EN TRÁMITE. Seguimos pendientes de cualquier novedad.`
    },
    'desconocido': {
      darija: `❓ ${cliente.customer_name}, مازال ما عرفناش الحالة ديال ملفك. غانرجعو نعلموك من بعد.`,
      es: `❓ ${cliente.customer_name}, aún no conocemos el estado de tu expediente. Te informaremos más adelante.`
    }
  };

  const mensaje = mensajes[estado] || mensajes['desconocido'];

  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    direccion: cliente.direccion || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    provincia: cliente.provincia || "",
    fecha_nacimiento: cliente.fecha_nacimiento || "",
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: estado,
    mensaje_darija: mensaje.darija,
    mensaje_es: mensaje.es,
    tipo: "estado_alternativo",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 6️⃣ ESTADO (${estado}) a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${mensaje.darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 6️⃣ ESTADO enviado");
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
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

    // ✅ 1️⃣ ENVIAR BIENVENIDA (si no se ha enviado)
    if (!cliente.bienvenida_enviada) {
      const enviado = await enviarWhatsAppBienvenida(cliente);
      if (enviado) {
        await supabase.from("expediente_checks").update({
          bienvenida_enviada: true,
          fecha_bienvenida: new Date().toISOString()
        }).eq("id", cliente.id);
        cliente.bienvenida_enviada = true;
      }
    }

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

    // ✅ 2️⃣ ENVIAR NIE DETECTADO (si no se ha enviado y encontramos NIE)
    if (nie && !cliente.nie_enviado) {
      console.log(`✅ NIE extraído: ${nie}`);
      const enviado = await enviarWhatsAppNIE(cliente, nie);
      if (enviado) {
        await supabase.from("expediente_checks").update({
          nie: nie,
          nie_enviado: true,
          fecha_nie: new Date().toISOString()
        }).eq("id", cliente.id);
        cliente.nie_enviado = true;
        cliente.nie = nie;
      }
    }

    // ✅ 3️⃣ SI ES FAVORABLE
    if (estado === "favorable" && !cliente.notificado_favorable) {
      console.log("🎉 EXPEDIENTE FAVORABLE DETECTADO!");

      const enviado = await enviarWhatsAppFavorable(cliente);
      if (enviado) {
        await supabase.from("expediente_checks").update({
          notificado_favorable: true,
          fecha_favorable: new Date().toISOString()
        }).eq("id", cliente.id);
        cliente.notificado_favorable = true;
      }

      // Solicitar SMS de la Seguridad Social
      if (cliente.nie) {
        const smsenviado = await solicitarSMSSeguridadSocial(
          cliente.nie,
          cliente.fecha_nacimiento,
          cliente.customer_phone
        );

        if (smsenviado) {
          await supabase.from("expediente_checks").update({
            esperando_codigo: true,
            codigo_solicitado: new Date().toISOString()
          }).eq("id", cliente.id);
        }
      }

    // ✅ 6️⃣ SI ES ESTADO ALTERNATIVO (no favorable)
    } else if (estado !== "favorable") {
      // Comprobar si el estado ha cambiado
      const estadoAnterior = cliente.ultimo_estado_enviado || cliente.estado_detalle;
      
      if (estado !== estadoAnterior || !cliente.estado_enviado) {
        console.log(`🔄 Estado cambiado de "${estadoAnterior}" a "${estado}"`);
        
        const enviado = await enviarWhatsAppEstado(cliente, estado);
        if (enviado) {
          await supabase.from("expediente_checks").update({
            estado_enviado: true,
            ultimo_estado_enviado: estado,
            fecha_estado: new Date().toISOString()
          }).eq("id", cliente.id);
          cliente.estado_enviado = true;
          cliente.ultimo_estado_enviado = estado;
        }
      } else {
        console.log(`⏸️ Estado "${estado}" ya fue enviado anteriormente. No se envía duplicado.`);
      }
    }

    // Actualizar estado y resultado siempre
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
          esperando_codigo: false,
          codigo_recibido: codigoLimpio,
          fecha_nuss: new Date().toISOString()
        })
        .eq('id', clienteId);

      // ✅ 4️⃣ ENVIAR NUSS
      const enviadoNUSS = await enviarWhatsAppNUSS(cliente, cliente.nie, nuss);
      if (enviadoNUSS) {
        await supabase.from("expediente_checks").update({
          nuss_enviado: true
        }).eq('id', clienteId);
      }

      // ✅ Esperar 2 minutos antes de generar la tasa
      console.log("⏳ Esperando 2 minutos antes de generar la tasa...");
      await sleep(120000); // 2 minutos

      // ✅ 5️⃣ GENERAR Y ENVIAR TASA
      console.log("📄 Generando tasa automáticamente...");
      const pdfPath = await generarTasa(
        cliente.nie,
        cliente.customer_name,
        cliente.expediente_numero
      );

      if (pdfPath) {
        await supabase.from("expediente_checks").update({
          pdf_tasa_generado: true,
          pdf_tasa_path: pdfPath,
          pdf_tasa_fecha: new Date().toISOString()
        }).eq('id', clienteId);

        const enviadoTasa = await enviarWhatsAppTasa(cliente, pdfPath);
        if (enviadoTasa) {
          await supabase.from("expediente_checks").update({
            tasa_enviada: true
          }).eq('id', clienteId);
        }
        
        console.log(`✅ Proceso completado para ${cliente.customer_name}`);
        console.log(`📄 PDF: ${pdfPath}`);
        console.log(`🆔 NUSS: ${nuss}`);
      } else {
        console.log(`⚠️ No se pudo generar la tasa para ${cliente.customer_name}`);
      }

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
    .or('notificado_favorable.eq.false,notificado_favorable.is.null,estado_enviado.is.null,ultimo_estado_enviado.is.null');

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

// Ejecutar main una vez al inicio
main();

// Programar ejecución periódica
setInterval(main, CHECK_INTERVAL_MS);

console.log("🔄 Sara worker ejecutándose...");
console.log(`⏱️ Intervalo: ${CHECK_INTERVAL_MS / 1000 / 60} minutos`);
