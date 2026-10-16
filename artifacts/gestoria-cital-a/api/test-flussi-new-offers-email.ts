import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

/**
 * TEST-ONLY email for the NEW Decreto Flussi offers table.
 * - Reads only "ofertas nuevas de 10 días".
 * - Never reads or modifies flussi_offerte.
 * - Can only send a single test email to the business test inbox.
 * - No customer/bulk sending route exists in this endpoint.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || process.env.FROM_EMAIL || SMTP_USER;
const FLUSSI_TEST_SECRET = process.env.FLUSSI_TEST_SECRET || "";
const TEST_RECIPIENT = "gestoriacitaia@gmail.com";
const TABLE = '"ofertas nuevas de 10 días"';

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clean(value: unknown, fallback = "No indicado"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDate(value: unknown): string {
  if (!value) return "No indicada";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Rome" }).format(d);
}

function offerCard(o: any): string {
  const link = String(o.enlace_oferta ?? "").trim();
  const validLink = /^https?:\/\//i.test(link);
  const details = [
    ["Ciudad", o.localidad],
    ["Provincia", o.provincia],
    ["Dirección", o.direccion],
    ["Teléfono", o.telefono_responsable],
    ["Email de contacto", o.email_responsable],
    ["Contrato", o.tipo_contrato],
    ["Jornada", o.jornada],
    ["Salario publicado", o.salario],
    ["Fecha límite", formatDate(o.fecha_limite)],
  ];
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #dce5ed;border-radius:12px;overflow:hidden">
      <tr><td style="padding:18px;background:#0b2235;color:#fff">
        <div style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#f5cc39">DECRETO FLUSSI · OFERTA</div>
        <h2 style="font-size:20px;line-height:1.35;margin:8px 0 0;color:#fff">${esc(clean(o.titulo, "Oferta de trabajo"))}</h2>
      </td></tr>
      <tr><td style="padding:16px;background:#fff">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${details.map(([label, value]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #edf1f5;color:#5c6b78;font-size:13px;width:38%;vertical-align:top">${esc(label)}</td><td style="padding:8px 0;border-bottom:1px solid #edf1f5;color:#172b3a;font-size:13px;word-break:break-word">${esc(clean(value))}</td></tr>`).join("")}
        </table>
        ${validLink ? `<p style="margin:18px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#0b7b58;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:8px">Ver anuncio original</a></p>` : ""}
        <p style="font-size:12px;color:#6b7785;line-height:1.6;margin:16px 0 0">Fuente: ${esc(clean(o.fuente))}. Fecha de publicación: ${esc(formatDate(o.fecha_publicacion))}.</p>
      </td></tr>
    </table>`;
}

function buildHtml(offers: any[]): string {
  const cards = offers.length
    ? offers.map(offerCard).join("")
    : `<p style="padding:16px;background:#fff7df;border:1px solid #f2d780;border-radius:8px">No se encontraron ofertas que cumplan el filtro de fecha de esta prueba. No se ha incluido ninguna oferta caducada.</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#172b3a">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Nuevas ofertas de trabajo relacionadas con el Decreto Flussi.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 8px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-radius:16px;overflow:hidden">
          <tr><td style="padding:26px 22px;background:#071c2b;color:#fff">
            <div style="font-size:24px;font-weight:800">gestoria<span style="color:#f5cc39">cita</span><span style="color:#28d7a0">ia</span></div>
            <div style="margin-top:8px;color:#f5cc39;font-size:12px;font-weight:bold;letter-spacing:1px">DECRETO FLUSSI · ITALIA</div>
            <h1 style="font-size:25px;line-height:1.25;margin:18px 0 8px">Nuevas oportunidades de trabajo</h1>
            <p style="margin:0;color:#d9e4eb;font-size:15px;line-height:1.7">Ofertas recopiladas para que puedas revisar los detalles y contactar con la fuente del anuncio.</p>
          </td></tr>
          <tr><td style="padding:20px 12px 8px">
            <div dir="rtl" style="background:#fff;border-radius:10px;padding:16px;margin-bottom:18px;text-align:right;line-height:1.9">
              <strong style="font-size:17px">السلام عليكم،</strong><br>
              هادي عيّنة ديال عروض العمل المرتبطة بـ Decreto Flussi اللي لقيناها فالمصادر. راجع تاريخ نهاية كل عرض والشروط ديالو، وتواصل مع الجهة اللي ناشراه باش تتأكد من المعلومات قبل الترشيح.
            </div>
            ${cards}
            <div style="background:#fff8e5;border:1px solid #f0d783;border-radius:10px;padding:16px;font-size:12px;line-height:1.7;color:#4f4530">
              <strong>Importante / تنبيه مهم</strong><br>
              GestoriaCitaIA ofrece información sobre ofertas; no garantiza contratación, nulla osta, visado ni autorización de trabajo. La dirección o el contacto pueden corresponder al servicio público de empleo y no necesariamente al empleador. Verifica siempre el anuncio original. No se inventan los datos que no figuran en la fuente.
            </div>
          </td></tr>
          <tr><td style="padding:20px;text-align:center;color:#6d7b86;font-size:12px;line-height:1.7">
            <strong style="color:#172b3a">GestoriaCitaIA</strong><br>
            Información sobre oportunidades laborales · Decreto Flussi<br>
            <a href="https://gestoriacitaia.com" style="color:#087a59">gestoriacitaia.com</a><br>
            <span style="font-size:10px">Correo de prueba enviado únicamente al buzón interno de GestoriaCitaIA.</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const suppliedSecret = String(req.headers["x-flussi-test-secret"] || "");
  if (!FLUSSI_TEST_SECRET || suppliedSecret !== FLUSSI_TEST_SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const missing = [
    !SUPABASE_URL && "SUPABASE_URL (or VITE_SUPABASE_URL)",
    !SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !SMTP_HOST && "SMTP_HOST",
    !SMTP_USER && "SMTP_USER",
    !SMTP_PASS && "SMTP_PASS",
    !SMTP_FROM && "SMTP_FROM (or FROM_EMAIL)",
  ].filter(Boolean);

  if (missing.length) {
    return res.status(500).json({ ok: false, error: "Missing configuration", missing });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tablePath = encodeURIComponent(TABLE);
    const query = new URLSearchParams({
      select: "titulo,categoria,provincia,localidad,vacantes,tipo_contrato,jornada,salario,fecha_publicacion,fecha_limite,telefono_responsable,email_responsable,direccion,enlace_oferta,fuente,estado_verificacion,estado_envio",
      fecha_limite: `gte.${today}`,
      order: "fecha_publicacion.desc",
      limit: "8",
    });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}?${query.toString()}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Supabase query failed (${response.status}): ${responseText.slice(0, 500)}`);
    }

    const rows = JSON.parse(responseText);
    const offers = (Array.isArray(rows) ? rows : []).filter((o: any) => {
      const published = o.fecha_publicacion ? String(o.fecha_publicacion).slice(0, 10) : "";
      return (!published || published >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
        && String(o.estado_verificacion || "").toLowerCase() !== "rechazada";
    });

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });

    await transporter.verify();
    const result = await transporter.sendMail({
      from: `"GestoriaCitaIA" <${SMTP_FROM}>`,
      to: TEST_RECIPIENT,
      subject: "[PRUEBA INTERNA] Nuevas ofertas Decreto Flussi — GestoriaCitaIA",
      html: buildHtml(offers),
      text: [
        "GestoriaCitaIA — prueba interna de email Decreto Flussi",
        "Solo se consultó la tabla nueva: ofertas nuevas de 10 días.",
        ...offers.map((o: any) => `${clean(o.titulo)} — ${clean(o.localidad)}, ${clean(o.provincia)} — fecha límite: ${formatDate(o.fecha_limite)} — ${clean(o.enlace_oferta)}`),
        "Aviso: verifica el anuncio original; no se garantiza contratación ni autorización de trabajo.",
      ].join("\n\n"),
    });

    return res.status(200).json({
      ok: true,
      action: "internal_test_email",
      recipient: TEST_RECIPIENT,
      sent: 1,
      offersIncluded: offers.length,
      sourceTable: TABLE,
      messageId: result.messageId,
      note: "This endpoint can only send one internal test email. It does not send to customers and does not modify any table.",
    });
  } catch (error: any) {
    console.error("FLUSSI INTERNAL TEST EMAIL ERROR", error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
