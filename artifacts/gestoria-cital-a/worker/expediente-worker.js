import dotenv from "dotenv";
dotenv.config({ path: ".env" });

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

function detectFavorable(text) {
  const body = cleanText(text).toLowerCase();

  return (
    body.includes("favorable") ||
    body.includes("resuelto favorable") ||
    body.includes("resolución favorable") ||
    body.includes("concedido") ||
    body.includes("concedida")
  );
}

function detectPending(text) {
  const body = cleanText(text).toLowerCase();

  return (
    body.includes("en trámite") ||
    body.includes("en tramite") ||
    body.includes("pendiente") ||
    body.includes("no resuelto") ||
    body.includes("en vía de tramitación") ||
    body.includes("en via de tramitacion")
  );
}

function buildStatus(text) {
  if (detectFavorable(text)) return "favorable";
  if (detectPending(text)) return "pendiente";
  return "revisado";
}

async function connectBrowser() {
  if (BRIGHT_DATA_WS_ENDPOINT) {
    console.log("Conectando a Bright Data Browser...");
    return chromium.connectOverCDP(BRIGHT_DATA_WS_ENDPOINT);
  }

  console.log("BRIGHT_DATA_WS_ENDPOINT no configurado. Usando Chromium local.");
  return chromium.launch({
    headless: true,
  });
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
      message:
        "Tu expediente aparece como favorable. Ya puedes continuar con Seguridad Social y alta.",
    }),
  });

  console.log("WhatsApp enviado por Make para expediente favorable.");
}

async function checkExpediente(client) {
  let browser;

  try {
    browser = await connectBrowser();

    const context =
      browser.contexts?.()[0] ||
      (await browser.newContext({
        ignoreHTTPSErrors: true,
        locale: "es-ES",
        timezoneId: "Europe/Madrid",
      }));

    const page = await context.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-ES,es;q=0.9",
    });

    await page.setViewportSize({
      width: 1280 + Math.floor(Math.random() * 80),
      height: 720 + Math.floor(Math.random() * 80),
    });

    console.log(`Abriendo InfoExt2 para expediente ${client.expediente_numero}`);

    await page.goto(INFOEXT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForTimeout(5000);

    console.log("Pulsando ENTRAR FORMULARIO...");

    await page
      .locator("text=ENTRAR FORMULARIO")
      .click({
        timeout: 60000,
      });

    await page.waitForTimeout(5000);

    console.log("Pulsando ID DE EXPEDIENTE/SOLICITUD...");

    await page
      .locator("text=ID de expediente/solicitud")
      .click({
        timeout: 60000,
      });

    await page.waitForTimeout(5000);

    console.log("Formulario por ID de expediente/solicitud abierto");

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
      1
    );

    await clickFirstAvailable(
      page,
      [
        'input[type="submit"]',
        'button[type="submit"]',
        'input[value*="Consultar" i]',
        'input[value*="Aceptar" i]',
        'button:has-text("Consultar")',
        'button:has-text("Aceptar")',
        'a:has-text("Consultar")',
      ],
      "consultar"
    );

    await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(8000);

    const resultText = (await page.textContent("body")) || "";
    const estado = buildStatus(resultText);
    const favorable = estado === "favorable";

    const screenshotName = `expediente-${client.id}-${Date.now()}.png`;

    await page.screenshot({
      path: screenshotName,
      fullPage: true,
    });

    console.log("Resultado expediente:", estado);
    console.log(cleanText(resultText).slice(0, 1000));
    console.log("Screenshot:", screenshotName);

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
    console.log("Error verificando expediente:");
    console.log(error);

    await updateExpediente(client.id, {
      estado: "error",
      resultado: error?.message || String(error),
      favorable: false,
      notificado: false,
      last_check: new Date().toISOString(),
      checked_at: new Date().toISOString(),
    }).catch((updateError) => {
      console.log("No se pudo guardar el error en expediente_checks:");
      console.log(updateError);
    });

    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function runWorker() {
  console.log("Expediente Worker Started");

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
    console.log("No hay expedientes pendientes.");
    return;
  }

  for (const client of data) {
    if (
      !client.expediente_numero ||
      !client.identificador_solicitud ||
      !client.fecha_nacimiento
    ) {
      console.log(`Expediente ${client.id} incompleto. Saltando.`);

      await updateExpediente(client.id, {
        estado: "datos_incompletos",
        resultado:
          "Faltan expediente_numero, identificador_solicitud o fecha_nacimiento.",
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
  while (true) {
    try {
      await runWorker();
    } catch (error) {
      console.log("Error general del worker:");
      console.log(error);
    }

    console.log(`Esperando ${CHECK_INTERVAL_MS / 1000}s para el siguiente ciclo...`);
    await sleep(CHECK_INTERVAL_MS);
  }
}

startLoop();
