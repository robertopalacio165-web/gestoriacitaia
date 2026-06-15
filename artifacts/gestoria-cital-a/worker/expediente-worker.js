import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/"/g, "").trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, "").trim();
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const INFOEXT_URL = "https://infoext2.delegaciondelgobierno.gob.es/infoext2/consulta.html";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan variables de Supabase");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function esFavorable(texto) {
  const body = cleanText(texto).toLowerCase();
  return body.includes("favorable") || 
         body.includes("resuelto favorable") || 
         body.includes("concedido");
}

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

async function enviarWhatsApp(cliente, resultado) {
  const webhook = process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE;
  if (!webhook) {
    console.log("⚠️ Webhook no configurado");
    return;
  }
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    email: cliente.customer_email,
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: "favorable",
    mensaje: "✅ ¡BUENAS NOTICIAS! Tu expediente ha sido resuelto FAVORABLEMENTE.",
    fecha: new Date().toISOString()
  };
  
  console.log("📱 Enviando WhatsApp a:", cliente.customer_phone);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) {
    console.log("✅ WhatsApp enviado correctamente");
  } else {
    console.log("❌ Error enviando WhatsApp:", await res.text());
  }
}

async function verificarExpediente(cliente) {
  let browser;
  try {
    console.log(`\n👤 Cliente: ${cliente.customer_name}`);
    console.log(`📝 Expediente: ${cliente.expediente_numero}`);
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
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
    
    const resultado = await page.textContent("body");
    const favorable = esFavorable(resultado);
    
    console.log(favorable ? "🎉 FAVORABLE!" : "❌ Pendiente");
    
    await supabase
      .from("expediente_checks")
      .update({
        favorable: favorable,
        notificado: favorable,
        estado: favorable ? "favorable" : "pendiente",
        resultado: cleanText(resultado).slice(0, 2000),
        ultimo_check: new Date().toISOString()
      })
      .eq("id", cliente.id);
    
    if (favorable) {
      await enviarWhatsApp(cliente, resultado);
    }
    
    await browser.close();
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (browser) await browser.close().catch(() => {});
    
    await supabase
      .from("expediente_checks")
      .update({
        estado: "error",
        resultado: error.message,
        ultimo_check: new Date().toISOString()
      })
      .eq("id", cliente.id);
  }
}

async function main() {
  console.log("🚀 Worker iniciado", new Date().toISOString());
  
  const { data: expedientes, error } = await supabase
    .from("expediente_checks")
    .select("*")
    .eq("notificado", false);
  
  if (error) {
    console.log("❌ Error en Supabase:", error.message);
    return;
  }
  
  if (!expedientes?.length) {
    console.log("📭 No hay expedientes pendientes");
    return;
  }
  
  console.log(`📋 ${expedientes.length} expediente(s) pendiente(s)`);
  
  for (const exp of expedientes) {
    await verificarExpediente(exp);
    await sleep(5000);
  }
  
  console.log("✅ Ciclo completado\n");
}

// Ejecutar ahora y cada 30 minutos
main();
setInterval(main, CHECK_INTERVAL_MS);
