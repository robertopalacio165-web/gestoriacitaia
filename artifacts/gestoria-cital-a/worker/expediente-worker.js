# Guarda el código corregido
cat > expediente-worker.js << 'EOF'
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/"/g, "").trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, "").trim();
const BRIGHT_DATA_WS_ENDPOINT = process.env.BRIGHT_DATA_WS_ENDPOINT?.replace(/"/g, "").trim();
const CHECK_INTERVAL_MS = Number(process.env.EXPEDIENTE_WORKER_INTERVAL_MS || 3600000);
const BATCH_LIMIT = Number(process.env.EXPEDIENTE_WORKER_BATCH_LIMIT || 5);
const INFOEXT_URL = "https://sede.administracionespublicas.gob.es/infoext2/";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }

function normalizeDateForSpain(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }
  return raw;
}

function extractBirthYear(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.split("-")[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw.split("/")[2];
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : raw;
}

function buildStatus(text) {
  const body = cleanText(text).toLowerCase();
  if (body.includes("favorable") || body.includes("resuelto favorable") || body.includes("concedido")) return "favorable";
  if (body.includes("denegado") || body.includes("rechazado") || body.includes("no favorable")) return "denegado";
  if (body.includes("en trámite") || body.includes("pendiente") || body.includes("no resuelto")) return "pendiente";
  return "revisado";
}

async function connectBrowser() {
  if (BRIGHT_DATA_WS_ENDPOINT) {
    console.log("✅ Conectando a Bright Data...");
    const browser = await chromium.connectOverCDP(BRIGHT_DATA_WS_ENDPOINT);
    const context = browser.contexts()[0] || await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
    return { browser, context };
  }
  console.log("⚠️ Usando Chromium local - probablemente será detectado");
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  const context = await browser.newContext({ 
    locale: 'es-ES', 
    timezoneId: 'Europe/Madrid',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
  });
  return { browser, context };
}

async function resolveCaptchaAudio(page) {
  console.log("🔊 Resolviendo CAPTCHA...");
  await page.waitForTimeout(3000);
  
  const audioElement = page.locator("audio").first();
  let audioSrc = await audioElement.getAttribute("src");
  
  let audioBuffer;
  try {
    audioBuffer = await page.evaluate(async (src) => {
      const response = await fetch(src);
      return Buffer.from(await response.arrayBuffer());
    }, audioSrc);
  } catch (e) {
    const audioUrl = audioSrc.startsWith('http') ? audioSrc : `https://sede.administracionespublicas.gob.es${audioSrc}`;
    const response = await fetch(audioUrl);
    audioBuffer = Buffer.from(await response.arrayBuffer());
  }
  
  fs.writeFileSync("captcha_temp.mp3", audioBuffer);
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream("captcha_temp.mp3"),
    model: "whisper-1",
    language: "es",
  });
  
  const captchaText = transcription.text.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase().substring(0, 6);
  fs.unlinkSync("captcha_temp.mp3");
  console.log("🎯 CAPTCHA:", captchaText);
  return captchaText;
}

async function checkExpediente(client) {
  let browser = null, context = null, page = null;
  try {
    const connection = await connectBrowser();
    browser = connection.browser;
    context = connection.context;
    page = await context.newPage();
    
    await page.goto(INFOEXT_URL, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(3000);
    await page.locator("text=ENTRAR FORMULARIO").click();
    await page.waitForTimeout(3000);
    await page.locator('text=BUSCAR POR NÚMERO DE EXPEDIENTE / SOLICITUD').first().click();
    await page.waitForTimeout(3000);
    
    await page.locator('input[name="idExpediente"]').fill(client.identificador_solicitud || client.expediente_numero);
    await page.locator('input[name="fechaPresentacion"]').fill(normalizeDateForSpain(client.fecha_presentacion));
    await page.locator('input[name="anio"]').fill(extractBirthYear(client.fecha_nacimiento));
    
    const captchaText = await resolveCaptchaAudio(page);
    await page.locator('input[type="text"]').first().fill(captchaText);
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Consultar")').first().click();
    await page.waitForTimeout(15000);
    
    const resultText = await page.textContent("body");
    const estado = buildStatus(resultText);
    const favorable = estado === "favorable";
    
    const screenshotName = `expediente-${client.id}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotName, fullPage: true });
    
    console.log("📊 Resultado:", estado);
    
    await supabase.from("expediente_checks").update({
      estado, favorable, notificado: favorable,
      resultado: cleanText(resultText).slice(0, 4000),
      last_check: new Date().toISOString(),
      screenshot_path: screenshotName
    }).eq("id", client.id);
    
    if (favorable && process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE) {
      await fetch(process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, phone: client.customer_phone, estado: "favorable" })
      });
      console.log("📱 WhatsApp enviado");
    }
    
    await browser.close();
  } catch (error) {
    console.log("❌ Error:", error.message);
    await supabase.from("expediente_checks").update({
      estado: "error", resultado: error.message, last_check: new Date().toISOString()
    }).eq("id", client.id);
    if (browser) await browser.close().catch(() => {});
  }
}

async function runWorker() {
  console.log("🚀 Worker iniciado", new Date().toISOString());
  const { data } = await supabase.from("expediente_checks").select("*").eq("notificado", false).limit(BATCH_LIMIT);
  if (!data?.length) { console.log("📭 No hay expedientes"); return; }
  for (const client of data) {
    if (!client.expediente_numero || !client.identificador_solicitud || !client.fecha_nacimiento) {
      console.log("⚠️ Datos incompletos");
      continue;
    }
    await checkExpediente(client);
    await sleep(10000);
  }
}

async function startLoop() {
  while (true) {
    try { await runWorker(); } catch (error) { console.log("Error:", error); }
    console.log(`⏰ Esperando ${CHECK_INTERVAL_MS/1000}s...`);
    await sleep(CHECK_INTERVAL_MS);
  }
}

startLoop();
EOF
