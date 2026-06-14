import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/"/g, "").trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?.replace(/"/g, "")
  .trim();

const BRIGHT_DATA_WS_ENDPOINT = process.env.BRIGHT_DATA_WS_ENDPOINT
  ?.replace(/"/g, "")
  .trim();

const CHECK_INTERVAL_MS = Number(process.env.EXPEDIENTE_WORKER_INTERVAL_MS || 60000);
const BATCH_LIMIT = Number(process.env.EXPEDIENTE_WORKER_BATCH_LIMIT || 5);
const INFOEXT_URL = "https://sede.administracionespublicas.gob.es/infoext2/";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDateForSpain(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }

  return raw;
}

function extractBirthYear(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.split("-")[0];
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw.split("/")[2];
  }

  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : raw;
}

function buildStatus(text) {
  const body = cleanText(text).toLowerCase();
  
  // Resultados definitivos
  if (body.includes("favorable") || 
      body.includes("resuelto favorable") || 
      body.includes("resolución favorable") ||
      body.includes("concedido") ||
      body.includes("concedida") ||
      body.includes("aprobado") ||
      body.includes("aprobada")) {
    return "favorable";
  }
  
  // Resultados desfavorables
  if (body.includes("denegado") || 
      body.includes("denegada") ||
      body.includes("rechazado") ||
      body.includes("rechazada") ||
      body.includes("no favorable") ||
      body.includes("desfavorable")) {
    return "denegado";
  }
  
  // En proceso
  if (body.includes("en trámite") || 
      body.includes("en tramite") || 
      body.includes("pendiente") || 
      body.includes("no resuelto") ||
      body.includes("en estudio") ||
      body.includes("tramitación") ||
      body.includes("tramitacion")) {
    return "pendiente";
  }
  
  // Errores del sistema
  if (body.includes("error") || 
      body.includes("no encontrado") ||
      body.includes("no existe")) {
    return "error";
  }
  
  return "revisado";
}

async function connectBrowser() {
  if (BRIGHT_DATA_WS_ENDPOINT) {
    console.log("✅ Conectando a Bright Data Browser (anti-detección)...");
    const browser = await chromium.connectOverCDP(BRIGHT_DATA_WS_ENDPOINT);
    const context = browser.contexts()[0] || await browser.newContext({
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    });
    return { browser, context };
  }

  console.log("⚠️ BRIGHT_DATA_WS_ENDPOINT no configurado. Usando Chromium local (puede ser detectado).");
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox'
    ]
  });
  const context = await browser.newContext({
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    viewport: { width: 1280, height: 720 }
  });
  return { browser, context };
}

async function fillFirstAvailable(page, selectors, value, fieldName) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error(`Falta valor para ${fieldName}`);
  }

  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if ((await locator.count()) > 0 && (await locator.isVisible({ timeout: 1500 }))) {
        await locator.fill(text);
        console.log(`${fieldName} rellenado con selector: ${selector}`);
        return;
      }
    } catch {
      // Probamos el siguiente selector.
    }
  }

  throw new Error(`No se encontró el campo ${fieldName}`);
}

async function fillVisibleInputByPosition(page, position, value, fieldName) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error(`Falta valor para ${fieldName}`);
  }

  const inputs = page.locator(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'
  );

  const count = await inputs.count();
  const visibleInputs = [];

  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);

    try {
      if (await input.isVisible({ timeout: 1000 })) {
        visibleInputs.push(input);
      }
    } catch {
      // Ignoramos inputs no accesibles.
    }
  }

  if (!visibleInputs[position]) {
    throw new Error(`No se encontró el campo visible ${position + 1} para ${fieldName}`);
  }

  await visibleInputs[position].fill(text);
  console.log(`${fieldName} rellenado por posición visible: ${position + 1}`);
}

async function fillFirstAvailableOrPosition(page, selectors, value, fieldName, position) {
  try {
    await fillFirstAvailable(page, selectors, value, fieldName);
  } catch (error) {
    console.log(`${fieldName}: no se encontró por selector. Probando por posición visible...`);
    await fillVisibleInputByPosition(page, position, value, fieldName);
  }
}

async function clickFirstAvailable(page, selectors, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if ((await locator.count()) > 0 && (await locator.isVisible({ timeout: 1500 }))) {
        await locator.click();
        console.log(`${label} pulsado con selector: ${selector}`);
        return;
      }
    } catch {
      // Probamos el siguiente selector.
    }
  }

  throw new Error(`No se encontró el botón ${label}`);
}

async function selectIdExpedienteSolicitudMode(page) {
  console.log("Pulsando BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD...");

  const selectors = [
    'text=BUSCAR POR NÚMERO DE EXPEDIENTE',
    'text=BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD',
    'a:has-text("BUSCAR POR NÚMERO")',
    'button:has-text("BUSCAR POR NÚMERO")',
    'input[value*="EXPEDIENTE"]'
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if (await locator.isVisible({ timeout: 3000 })) {
        await locator.click();
        await page.waitForTimeout(3000);
        console.log("Modo expediente activado");
        return;
      }
    } catch {}
  }

  throw new Error("No se encontró el botón BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD");
}

async function updateExpediente(id, payload) {
  const attempts = [
    payload,
    {
      estado: payload.estado,
      resultado: payload.resultado,
      favorable: payload.favorable,
      notificado: payload.notificado,
      last_check: payload.last_check,
    },
    {
      estado: payload.estado,
      favorable: payload.favorable,
      notificado: payload.notificado,
      last_check: payload.last_check,
    },
    {
      favorable: payload.favorable,
      notificado: payload.notificado,
      last_check: payload.last_check,
    },
    {
      notificado: payload.notificado,
    },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    const { error } = await supabase
      .from("expediente_checks")
      .update(attempt)
      .eq("id", id);

    if (!error) return;

    lastError = error;
  }

  throw lastError;
}

async function sendWhatsAppNotification(client, resultText) {
  if (!process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE) {
    console.log("MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE no configurado. No se envía WhatsApp.");
    return;
  }

  await fetch(process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: client.id,
      full_name: client.full_name || client.customer_name || client.nombre || "",
      phone: client.phone || client.customer_phone || client.telefono || "",
      email: client.email || client.customer_email || "",
      expediente_numero: client.expediente_numero,
      identificador_solicitud: client.identificador_solicitud,
      fecha_nacimiento: client.fecha_nacimiento,
      estado: "favorable",
      resultado: cleanText(resultText).slice(0, 4000),
      message: "✅ ¡BUENAS NOTICIAS! Tu expediente aparece como FAVORABLE. Ya puedes continuar con Seguridad Social y alta.",
    }),
  });

  console.log("✅ WhatsApp enviado por Make para expediente favorable.");
}

async function resolveCaptchaAudio(page) {
  console.log("🔊 Resolviendo CAPTCHA de audio...");
  
  // Buscar el reproductor de audio
  const audioElement = page.locator("audio").first();
  const audioCount = await audioElement.count();
  
  if (audioCount === 0) {
    throw new Error("No se encontró el reproductor de audio del CAPTCHA");
  }
  
  // Hacer clic en el botón de reproducir si existe
  const playButton = page.locator('button:has-text("Escuchar"), button:has-text("Reproducir"), .play-audio, [aria-label*="audio"]').first();
  if (await playButton.count() > 0 && await playButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await playButton.click();
    await page.waitForTimeout(2000);
  }
  
  // Obtener la URL del audio
  let audioSrc = await audioElement.getAttribute("src");
  console.log("Audio SRC:", audioSrc);
  
  let audioBuffer;
  
  if (audioSrc && audioSrc.startsWith('data:audio')) {
    // Es base64 inline
    const base64Data = audioSrc.split(',')[1];
    audioBuffer = Buffer.from(base64Data, 'base64');
  } else if (audioSrc && (audioSrc.startsWith('http') || audioSrc.startsWith('/'))) {
    // Es una URL - descargarlo
    const audioUrl = audioSrc.startsWith('http') ? audioSrc : `https://sede.administracionespublicas.gob.es${audioSrc}`;
    console.log("Descargando audio desde:", audioUrl);
    
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);
  } else {
    // Intentar obtener el audio de la petición de red
    throw new Error("No se pudo obtener el audio del CAPTCHA");
  }
  
  // Guardar el audio temporalmente
  fs.writeFileSync("captcha_temp.mp3", audioBuffer);
  
  // Transcribir con Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream("captcha_temp.mp3"),
    model: "whisper-1",
    language: "es",
  });
  
  let captchaText = transcription.text
    .replace(/[^a-zA-Z0-9]/g, "")
    .trim()
    .toLowerCase();
  
  // Corregir números escritos como letras
  captchaText = captchaText
    .replace(/cero/g, '0')
    .replace(/uno/g, '1')
    .replace(/dos/g, '2')
    .replace(/tres/g, '3')
    .replace(/cuatro/g, '4')
    .replace(/cinco/g, '5')
    .replace(/seis/g, '6')
    .replace(/siete/g, '7')
    .replace(/ocho/g, '8')
    .replace(/nueve/g, '9');
  
  console.log("🎯 CAPTCHA transcrito:", captchaText);
  
  // Limpiar archivo temporal
  fs.unlinkSync("captcha_temp.mp3");
  
  return captchaText;
}

async function checkExpediente(client) {
  let browser = null;
  let context = null;
  let page = null;

  try {
    const connection = await connectBrowser();
    browser = connection.browser;
    context = connection.context;
    page = await context.newPage();

    // Configurar headers para evitar detección
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-ES,es;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    console.log(`📋 Abriendo InfoExt2 para expediente ${client.expediente_numero}`);

    await page.goto(INFOEXT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForTimeout(5000);

    console.log("🔘 Pulsando ENTRAR FORMULARIO...");
    await page.locator("text=ENTRAR FORMULARIO").click({ timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log("🔘 Seleccionando búsqueda por expediente...");
    await selectIdExpedienteSolicitudMode(page);
    await page.waitForTimeout(5000);

    console.log("📝 Rellenando formulario...");
    
    await fillFirstAvailableOrPosition(
      page,
      [
        'input[name="idExpediente"]',
        'input[name="idSolicitud"]',
        'input[name="identificadorSolicitud"]',
        'input[name="codSolicitud"]',
        'input[name="identificador"]',
        'input[id*="solicitud" i]',
        'input[name*="solicitud" i]',
        'input[placeholder*="solicitud" i]',
        'input[id*="identificador" i]',
        'input[name*="identificador" i]',
        'input[placeholder*="identificador" i]',
        'input[id*="id" i]',
        'input[name*="id" i]',
        'input[name="numExpediente"]',
        'input[name="numeroExpediente"]',
        'input[name="expediente"]',
        'input[id*="expediente" i]',
        'input[name*="expediente" i]',
        'input[placeholder*="expediente" i]',
      ],
      client.identificador_solicitud || client.expediente_numero,
      "ID de expediente/solicitud",
      0
    );

    await fillFirstAvailableOrPosition(
      page,
      [
        'input[name="fechaPresentacion"]',
        'input[name="fecha_presentacion"]',
        'input[name="fechaSolicitud"]',
        'input[name="fecha"]',
        'input[id*="fecha" i]',
        'input[name*="fecha" i]',
        'input[placeholder*="fecha" i]',
      ],
      normalizeDateForSpain(client.fecha_presentacion),
      "fecha de presentación",
      1
    );
    
    await fillFirstAvailableOrPosition(
      page,
      [
        'input[name="anio"]',
        'input[name="ano"]',
        'input[name="year"]',
        'input[name="birthYear"]',
        'input[name="anioNacimiento"]',
        'input[name="anoNacimiento"]',
        'input[id*="anio" i]',
        'input[name*="anio" i]',
        'input[placeholder*="anio" i]',
        'input[id*="año" i]',
        'input[name*="año" i]',
        'input[placeholder*="año" i]',
        'input[id*="ano" i]',
        'input[name*="ano" i]',
        'input[placeholder*="ano" i]',
        'input[id*="nacimiento" i]',
        'input[name*="nacimiento" i]',
        'input[placeholder*="nacimiento" i]',
      ],
      extractBirthYear(client.fecha_nacimiento),
      "año de nacimiento",
      2
    );

    // Resolver CAPTCHA de audio
    const captchaText = await resolveCaptchaAudio(page);
    
    // Encontrar y llenar el input del CAPTCHA
    const captchaInput = page.locator('input[type="text"], input[placeholder*="texto"], input[placeholder*="código"], input[name*="captcha"]').first();
    await captchaInput.fill(captchaText);
    console.log("📝 Captcha escrito:", captchaText);

    // Tomar screenshot antes de consultar
    await page.screenshot({ path: "antes-consultar.png", fullPage: true });
    await page.waitForTimeout(2000);

    // Hacer clic en CONSULTAR
    await clickFirstAvailable(
      page,
      [
        'button:has-text("Consultar")',
        'input[type="submit"][value*="Consultar"]',
        'button[type="submit"]',
        '#consultar',
        '.btn-consultar',
        'input[value*="Consultar" i]',
        'input[value*="Aceptar" i]',
        'button:has-text("Aceptar")',
      ],
      "consultar"
    );

    // Esperar la respuesta
    await page.waitForTimeout(8000);
    
    // Verificar si hay error de JavaScript
    const pageContent = await page.content();
    if (pageContent.includes('JavaScript desactivado') || pageContent.includes('noJS')) {
      console.log("⚠️ El sitio detectó automatización. Reintentando con más delays...");
      await page.waitForTimeout(5000);
    }

    // Esperar a que cargue el resultado
    try {
      await page.waitForFunction(
        () => {
          const body = document.body.innerText;
          return body.includes('favorable') || 
                 body.includes('pendiente') || 
                 body.includes('en trámite') ||
                 body.includes('resuelto') ||
                 body.includes('denegado') ||
                 body.length > 500;
        },
        { timeout: 30000 }
      );
    } catch (error) {
      console.log("Timeout esperando resultado, continuando...");
    }

    const resultText = await page.textContent("body");
    const estado = buildStatus(resultText);
    const favorable = estado === "favorable";

    const screenshotName = `expediente-${client.id}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotName, fullPage: true });

    console.log("📊 Resultado expediente:", estado);
    console.log("📝 Texto extraído:", cleanText(resultText).slice(0, 500));
    console.log("📸 Screenshot:", screenshotName);

    if (favorable) {
      await sendWhatsAppNotification(client, resultText);
    }

    await updateExpediente(client.id, {
      estado,
      resultado: cleanText(resultText).slice(0, 4000),
      raw_result: cleanText(resultText).slice(0, 8000),
      favorable,
      notificado: favorable,
      last_check: new Date().toISOString(),
      checked_at: new Date().toISOString(),
      screenshot_path: screenshotName,
    });

    await browser.close();
    
  } catch (error) {
    console.log("❌ Error verificando expediente:");
    console.log(error);

    try {
      await updateExpediente(client.id, {
        estado: "error",
        resultado: error?.message || String(error),
        favorable: false,
        notificado: false,
        last_check: new Date().toISOString(),
        checked_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.log("No se pudo guardar el error en expediente_checks:");
      console.log(updateError);
    }

    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function runWorker() {
  console.log("🚀 Expediente Worker Started");
  console.log(`📅 ${new Date().toISOString()}`);

  const { data, error } = await supabase
    .from("expediente_checks")
    .select("*")
    .eq("notificado", false)
    .limit(BATCH_LIMIT);

  if (error) {
    console.log("Error leyendo expediente_checks:");
    console.log(error);
    return;
  }

  if (!data?.length) {
    console.log("📭 No hay expedientes pendientes.");
    return;
  }

  console.log(`📋 Procesando ${data.length} expediente(s)...`);

  for (const client of data) {
    console.log(`\n👤 Cliente: ${client.id} - ${client.expediente_numero}`);
    
    if (
      !client.expediente_numero ||
      !client.identificador_solicitud ||
      !client.fecha_nacimiento
    ) {
      console.log(`⚠️ Expediente ${client.id} incompleto. Saltando.`);

      await updateExpediente(client.id, {
        estado: "datos_incompletos",
        resultado: "Faltan expediente_numero, identificador_solicitud o fecha_nacimiento.",
        favorable: false,
        notificado: false,
        last_check: new Date().toISOString(),
        checked_at: new Date().toISOString(),
      }).catch(console.log);

      continue;
    }

    await checkExpediente(client);
    await sleep(10000);
  }
}

async function startLoop() {
  console.log("🔄 Iniciando loop de monitoreo...");
  console.log(`⏱️  Intervalo: ${CHECK_INTERVAL_MS / 1000} segundos`);
  
  while (true) {
    try {
      await runWorker();
    } catch (error) {
      console.log("Error general del worker:");
      console.log(error);
    }

    console.log(`\n⏰ Esperando ${CHECK_INTERVAL_MS / 1000}s para el siguiente ciclo...\n`);
    await sleep(CHECK_INTERVAL_MS);
  }
}

startLoop();
