const dotenv = require("dotenv");

dotenv.config();
console.log("===============");
console.log("MAKE_WEBHOOK_NIE =", process.env.MAKE_WEBHOOK_NIE);
console.log("MAKE_WEBHOOK_FAVORABLE =", process.env.MAKE_WEBHOOK_FAVORABLE);
console.log("MAKE_WEBHOOK_ESTADO =", process.env.MAKE_WEBHOOK_ESTADO);
console.log("===============");
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
const CHECK_INTERVAL_MS = 30 * 1000; // 30 segundos para revisar la cola
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
  if (
    body.includes("requerimiento") ||
    body.includes("documentación") ||
    body.includes("subsanar") ||
    body.includes("falta")
  ) return "requerimiento";
  if (
    body.includes("recurso") ||
    body.includes("vía de recurso") ||
    body.includes("via de recurso")
  ) return "recurso";
  if (
    body.includes("pendiente de informes") ||
    body.includes("informes")
  ) return "pendiente_informes";
  if (body.includes("archivado")) return "archivado";
  if (body.includes("inadmitido")) return "inadmitido";
  if (body.includes("en trámite") || body.includes("en tramite") || body.includes("pendiente") || body.includes("en estudio") || body.includes("tramitación") || body.includes("en proceso")) return "tramite";
  if (body.includes("resuelto")) return "resuelto";

  return "desconocido";
}

// ==============================================
// FUNCIONES PARA NIE Y NUSS
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
// 📨 WHATSAPP FUNCTIONS
// ==============================================

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

// 3️⃣ WhatsApp Favorable (mabrouk_ma9boul)
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
    nie: cliente.nie,
    nuss: cliente.nuss,
    mensaje_darija: `🎉 مبروك ${cliente.customer_name}! ملف ديالك تقبل. غادي يصلك SMS من الضمان الاجتماعي فهادي اللحظة. جاوب على هاد الرسالة بالكود لي جاك فـ SMS.`,
    mensaje_es: `🎉 ¡FELICIDADES ${cliente.customer_name}! Tu expediente ha sido FAVORABLE. Vas a recibir un SMS de la Seguridad Social ahora mismo. RESPONDE a este mensaje con el código que te llegue.`,
    tipo: "mabrouk_ma9boul",
    fecha: new Date().toISOString()
  };

  console.log(`📱 Enviando WhatsApp 3️⃣ FAVORABLE (mabrouk_ma9boul) a: ${cliente.customer_phone}`);
  console.log(`💬 Darija: ${payload.mensaje_darija}`);

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log("✅ WhatsApp 3️⃣ FAVORABLE enviado");
    
    const webhookAdmin = process.env.MAKE_WEBHOOK_ALERTA_ADMIN;
    if (webhookAdmin) {
      await fetch(webhookAdmin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: cliente.customer_name,
          telefono: cliente.customer_phone,
          expediente: cliente.expediente_numero,
          tipo: "alerta_favorable_admin"
        })
      });
      console.log("🚨 Alerta admin enviada");
    }
    return true;
  } else {
    console.log("❌ Error:", await res.text());
    return false;
  }
}

// 6️⃣ WhatsApp Estado alternativo (resultado_no_favorable)
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
    'recurso': {
      darija: `⚖️ ${cliente.customer_name}, ملف ديالك فطريق الطعون. كنتمنو ليك الخير.`,
      es: `⚖️ ${cliente.customer_name}, tu expediente está en VÍA DE RECURSO. Seguimos pendientes.`
    },
    'pendiente_informes': {
      darija: `📋 ${cliente.customer_name}, ملف ديالك مستنى تقارير. غانعلموك ملي يكملو.`,
      es: `📋 ${cliente.customer_name}, tu expediente está PENDIENTE DE INFORMES. Te avisaremos cuando se completen.`
    }
  };

  const mensaje = mensajes[estado] || {
    darija: `❓ ${cliente.customer_name}, حالة ملفك: ${estado}. غانرجعو نعلموك من بعد.`,
    es: `❓ ${cliente.customer_name}, estado de tu expediente: ${estado}. Te informaremos más adelante.`
  };

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
    tipo: "resultado_no_favorable",
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
// 🔄 VERIFICAR EXPEDIENTE
// ==============================================
async function verificarExpediente(cliente) {
  let browser;
  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`👤 Cliente: ${cliente.customer_name}`);
    console.log(`🆔 NIE: ${cliente.nie || "NO DETECTADO"}`);
    console.log(`📨 NIE enviado: ${cliente.nie_notificado ? "SI" : "NO"}`);
    console.log(`🎉 Favorable enviado: ${cliente.notificado_favorable ? "SI" : "NO"}`);
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

    // ✅ 2️⃣ ENVIAR NIE DETECTADO (si no se ha enviado y encontramos NIE)
    if (nie && !cliente.nie_notificado) {
      console.log(`✅ NIE extraído: ${nie}`);
      const enviado = await enviarWhatsAppNIE(cliente, nie);
      if (enviado) {
        await supabase.from("expediente_checks").update({
          nie: nie,
          nie_notificado: true,
          fecha_nie: new Date().toISOString()
        }).eq("id", cliente.id);

        cliente.nie_notificado = true;
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

    // ✅ 6️⃣ SI ES ESTADO ALTERNATIVO (no favorable, no en trámite)
    } else if (
      [
        "desfavorable",
        "requerimiento",
        "archivado",
        "inadmitido",
        "recurso",
        "pendiente_informes"
      ].includes(estado)
    ) {
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
        console.log(`⏸️ Estado "${estado}" ya fue enviado anteriormente.`);
      }

    } else {
      console.log(`⏳ Estado "${estado}" -> no se envía WhatsApp.`);
    }

    // Actualizar estado y resultado siempre
    await supabase.from("expediente_checks").update({
      estado_detalle: estado,
      resultado: cleanText(texto).slice(0, 2000),
      ultimo_check: new Date().toISOString()
    }).eq("id", cliente.id);

    // ==============================================
    // AJUSTAR PRÓXIMA REVISIÓN (SOLO SI NO ESTÁ NOTIFICADO FAVORABLE)
    // ==============================================
    
    if (!cliente.notificado_favorable) {
      const ahora = Date.now();
      const creado = new Date(cliente.created_at).getTime();
      const minutosDesdeAlta = (ahora - creado) / 60000;
      
      const siguienteRevision =
        minutosDesdeAlta <= 60
          ? new Date(ahora + 10 * 60 * 1000)   // primeros 60 min → cada 10 min
          : new Date(ahora + 30 * 60 * 1000);  // después → cada 30 min
      
      await supabase
        .from("expediente_checks")
        .update({
          proxima_revision: siguienteRevision.toISOString()
        })
        .eq("id", cliente.id);
    }

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
// 🚀 MAIN
// ==============================================
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Worker iniciado", new Date().toISOString());
  console.log("=".repeat(60));

  const ahora = new Date().toISOString();

  const { data: expedientes, error } = await supabase
    .from("expediente_checks")
    .select("*")
    .eq("notificado_favorable", false)
    .lte("proxima_revision", ahora);

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

// Programar ejecución periódica (cada 30 segundos)
setInterval(main, CHECK_INTERVAL_MS);

console.log("🔄 Sara worker ejecutándose...");
console.log(`⏱️ Revisión de cola: cada ${CHECK_INTERVAL_MS / 1000} segundos`);
console.log(`📊 Estrategia de revisión:`);
console.log(`   • Primera hora: cada 10 minutos`);
console.log(`   • Después: cada 30 minutos`);
console.log(`   • Solo para expedientes no favorables`);
