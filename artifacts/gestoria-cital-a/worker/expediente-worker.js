import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/"/g, "").trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, "").trim();
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
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

function obtenerMensaje(estado, nombre, expediente) {
  const mensajes = {
    favorable: {
      es: `✅ ¡BUENAS NOTICIAS ${nombre.toUpperCase()}!\n\nTu expediente Nº ${expediente} ha sido resuelto FAVORABLEMENTE.\n\nYa puedes continuar con los siguientes trámites.\n\n¡Enhorabuena!`,
      ar: `✅ أخبار جيدة ${nombre}!\n\nملفك رقم ${expediente} تمت الموافقة عليه.\n\nيمكنك متابعة الإجراءات التالية.\n\nمبروك!`
    },
    desfavorable: {
      es: `❌ LO SENTIMOS ${nombre.toUpperCase()}!\n\nTu expediente Nº ${expediente} ha sido DENEGADO.\n\nNecesitas asesoramiento para continuar.\n\nContáctanos.`,
      ar: `❌ للأسف ${nombre}!\n\nملفك رقم ${expediente} مرفوض.\n\nتحتاج إلى استشارة للمتابعة.\n\nاتصل بنا.`
    },
    requerimiento: {
      es: `📋 ATENCIÓN ${nombre.toUpperCase()}!\n\nTu expediente Nº ${expediente} tiene un REQUERIMIENTO.\n\nFalta documentación. Revisa tu correo electrónico.\n\nContáctanos para ayudarte.`,
      ar: `📋 تنبيه ${nombre}!\n\nملفك رقم ${expediente} بحاجة إلى وثائق إضافية.\n\nتحقق من بريدك الإلكتروني.\n\nاتصل بنا للمساعدة.`
    },
    archivado: {
      es: `📁 ${nombre.toUpperCase()}!\n\nTu expediente Nº ${expediente} ha sido ARCHIVADO.\n\nSi quieres recuperarlo, contáctanos.`,
      ar: `📁 ${nombre}!\n\nملفك رقم ${expediente} تم أرشفته.\n\nإذا كنت تريد استعادته، اتصل بنا.`
    },
    inadmitido: {
      es: `⚠️ ${nombre.toUpperCase()}!\n\nTu expediente Nº ${expediente} ha sido INADMITIDO.\n\nNo cumple con los requisitos necesarios.\n\nContáctanos para más información.`,
      ar: `⚠️ ${nombre}!\n\nملفك رقم ${expediente} غير مقبول.\n\nلا يستوفي المتطلبات اللازمة.\n\nاتصل بنا لمزيد من المعلومات.`
    }
  };
  
  return mensajes[estado] || {
    es: `📌 ACTUALIZACIÓN ${nombre}!\n\nTu expediente Nº ${expediente} tiene un nuevo estado.\n\nContáctanos para más información.`,
    ar: `📌 تحديث ${nombre}!\n\nملفك رقم ${expediente} لديه حالة جديدة.\n\nاتصل بنا لمزيد من المعلومات.`
  };
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

async function enviarWhatsApp(cliente, estado) {
  const webhook = process.env.MAKE_WEBHOOK_EXPEDIENTE_FAVORABLE;
  if (!webhook) {
    console.log("⚠️ Webhook no configurado");
    return;
  }
  
  const mensajes = obtenerMensaje(estado, cliente.customer_name, cliente.expediente_numero);
  
  const payload = {
    id: cliente.id,
    nombre: cliente.customer_name,
    telefono: cliente.customer_phone,
    expediente: cliente.expediente_numero,
    solicitud: cliente.identificador_solicitud,
    estado: estado,
    mensaje_es: mensajes.es,
    mensaje_ar: mensajes.ar,
    fecha: new Date().toISOString()
  };
  
  console.log(`📱 Enviando WhatsApp a: ${cliente.customer_phone} - Estado: ${estado}`);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) console.log("✅ WhatsApp enviado");
  else console.log("❌ Error WhatsApp:", await res.text());
}

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
    const resultado = await page.textContent("body");
    const estado = analizarEstado(resultado);
    const notificar = ["favorable", "desfavorable", "requerimiento", "archivado", "inadmitido"].includes(estado);
    
    console.log(`📊 Estado detectado: ${estado}`);
    
    if (notificar && !cliente.notificado) {
      await enviarWhatsApp(cliente, estado);
    }
    
    await supabase.from("expediente_checks").update({
      estado_detalle: estado,
      notificado: notificar,
      favorable: estado === "favorable",
      resultado: cleanText(resultado).slice(0, 2000),
      ultimo_check: new Date().toISOString()
    }).eq("id", cliente.id);
    
    await browser.close();
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (browser) await browser.close();
  }
}

async function main() {
  console.log("🚀 Worker iniciado", new Date().toISOString());
  const { data: expedientes } = await supabase.from("expediente_checks").select("*").eq("notificado", false);
  if (!expedientes?.length) { console.log("No hay expedientes pendientes"); return; }
  for (const exp of expedientes) { await verificarExpediente(exp); await sleep(5000); }
}

main();
setInterval(main, CHECK_INTERVAL_MS);
