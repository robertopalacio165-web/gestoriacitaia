import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

/**
 * ============================================================
 * GESTORIACITAIA
 * DECRETO FLUSSI 2027 — ENVÍO MANUAL DE OFERTAS
 * ============================================================
 *
 * ARCHIVO:
 *   api/send-flussi-offerte.ts
 *
 * FLUJO:
 *
 *   Apify
 *      ↓
 *   flussi_offerte
 *      ↓
 *   seleccionas ofertas
 *      ↓
 *   POST a este endpoint
 *      ↓
 *   busca clientes PAGADOS y ACTIVOS
 *      ↓
 *   filtra por tipo de trabajo + categoría
 *      ↓
 *   envía por Brevo SMTP
 *      ↓
 *   registra en flussi_deliveries
 *
 * IMPORTANTE:
 * - Este archivo NO usa Make.
 * - Este archivo NO usa Brevo API.
 * - Usa SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
 * - No toca las tablas de Flussi Verification.
 * - dryRun=true NO envía emails.
 * - El envío es MANUAL: no hay cron ni envío automático.
 *
 * POST:
 *
 * {
 *   "dryRun": true,
 *   "offerIds": ["UUID-1", "UUID-2"]
 * }
 *
 * Para enviar realmente:
 *
 * {
 *   "dryRun": false,
 *   "offerIds": ["UUID-1", "UUID-2"]
 * }
 *
 * Si existe FLUSSI_LAVORO_INTERNAL_SECRET en Vercel,
 * hay que enviar también:
 *
 * x-flussi-lavoro-secret: TU_SECRETO
 * ============================================================
 */

export const config = {
  api: {
    bodyParser: true,
  },
};

const clean = (value: unknown, max = 2000): string =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const normalise = (value: unknown): string =>
  clean(value).toLowerCase().trim();

const supabaseUrl = clean(process.env.SUPABASE_URL);
const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function supabaseRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase configuration missing");
  }

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {}),
    },
  });
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration missing");
  }

  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  work_type: string;
  categories?: string[] | null;
  category?: string | null;
  source_table: string;
  active: boolean;
};

type OfferRow = {
  id: string;
  job_title?: string | null;
  category?: string | null;
  category_code?: string | null;
  company_name?: string | null;
  publication_date?: string | null;
  published_at?: string | null;
  // flussi_offerte does not have a salary column; kept only for email-template compatibility.
  salary?: string | null;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  source_url?: string | null;
  contract_type?: string | null;
  work_type?: string | null;
  is_active?: boolean;
  status?: string | null;
};

function listValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalise(item))
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => normalise(item))
    .filter(Boolean);
}

function workTypeMatches(
  clientType: string,
  offerType: string
): boolean {
  const client = normalise(clientType);
  const offer = normalise(offerType);

  /*
   * Si la oferta no tiene work_type, no bloqueamos.
   */
  if (!offer) {
    return true;
  }

  if (client === offer) {
    return true;
  }

  /*
   * Compatibilidad con los valores utilizados
   * por el formulario de Decreto Flussi.
   */
  const nonSeasonal = new Set([
    "non_stagionale",
    "non-stagionale",
    "non estazionale",
    "non_estazionale",
    "no_estacional",
    "no-estacional",
  ]);

  const seasonal = new Set([
    "stagionale",
    "stagionale",
    "estacional",
    "estazionale",
  ]);

  if (nonSeasonal.has(client) && nonSeasonal.has(offer)) {
    return true;
  }

  if (seasonal.has(client) && seasonal.has(offer)) {
    return true;
  }

  return false;
}

function categoryMatches(
  client: Client,
  offer: OfferRow
): boolean {
  const offerCode = normalise(offer.category_code);
  const offerName = normalise(offer.category);

  const wanted =
    client.source_table === "flussi_lavoro_24_99"
      ? listValues(client.category)
      : listValues(client.categories);

  /*
   * Si la oferta no tiene categoría, no la bloqueamos.
   */
  if (!offerCode && !offerName) {
    return true;
  }

  return wanted.some((item) => {
    if (!item) {
      return false;
    }

    return (
      item === offerCode ||
      item === offerName ||
      (!!offerCode && item.includes(offerCode)) ||
      (!!offerName && item.includes(offerName)) ||
      (!!offerCode && offerCode.includes(item)) ||
      (!!offerName && offerName.includes(item))
    );
  });
}

function isClientActive(
  row: Record<string, any>,
  table: string
): boolean {
  if (normalise(row.payment_status) !== "paid") {
    return false;
  }

  /*
   * 9,99 € = compra de una selección/bulletin.
   * No necesita expires_at para poder recibir las ofertas
   * seleccionadas que todavía no hayan sido enviadas.
   */
  if (table === "flussi_lavoro_9_99") {
    return true;
  }

  /*
   * 19,99 € y 24,99 € tienen periodo activo.
   */
  if (!row.expires_at) {
    return false;
  }

  return new Date(row.expires_at).getTime() >= Date.now();
}

async function getActiveClients(): Promise<Client[]> {
  const tables = [
    "flussi_lavoro_9_99",
    "flussi_lavoro_19_99",
    "flussi_lavoro_24_99",
  ];

  const all: Client[] = [];

  for (const table of tables) {
    const select =
      table === "flussi_lavoro_24_99"
        ? "id,first_name,last_name,email,phone,work_type,category,payment_status,expires_at"
        : "id,first_name,last_name,email,phone,work_type,categories,payment_status,expires_at";

    const response = await supabaseRequest(
      `${table}?select=${encodeURIComponent(select)}&payment_status=eq.paid`
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Supabase ${table} failed: ${response.status} ${responseText}`
      );
    }

    const rows = JSON.parse(responseText);

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row.email) {
        continue;
      }

      if (!isClientActive(row, table)) {
        continue;
      }

      all.push({
        id: row.id,
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        email: row.email,
        phone: row.phone || null,
        work_type: row.work_type || "non_stagionale",
        categories: row.categories || null,
        category: row.category || null,
        source_table: table,
        active: true,
      });
    }
  }

  return all;
}

async function getOffers(
  offerIds: string[]
): Promise<OfferRow[]> {
  const ids = offerIds
    .map((id) => clean(id, 100))
    .filter(Boolean);

  if (!ids.length) {
    return [];
  }

  const encoded = ids
    .map((id) => `"${id.replace(/"/g, '\\"')}"`)
    .join(",");

  const select = [
    "id",
    "job_title",
    "category",
    "category_code",
    "company_name",
    "publication_date",
    "published_at",
    "city",
    "province",
    "address",
    "phone",
    "email",
    "source_url",
    "contract_type",
    "work_type",
    "is_active",
    "status",
  ].join(",");

  const response = await supabaseRequest(
    `flussi_offerte?select=${select}&id=in.(${encoded})`
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_offerte failed: ${response.status} ${responseText}`
    );
  }

  const rows = JSON.parse(responseText);

  return (Array.isArray(rows) ? rows : []).filter(
    (row) =>
      row.is_active !== false &&
      normalise(row.status) !== "inactive"
  );
}

async function getAlreadyDelivered(
  offerIds: string[]
): Promise<Set<string>> {
  if (!offerIds.length) {
    return new Set<string>();
  }

  const encoded = offerIds
    .map((id) => `"${id.replace(/"/g, '\\"')}"`)
    .join(",");

  const response = await supabaseRequest(
    `flussi_deliveries?select=offer_id,email,status&offer_id=in.(${encoded})&status=eq.sent`
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase flussi_deliveries failed: ${response.status} ${responseText}`
    );
  }

  const rows = JSON.parse(responseText);
  const delivered = new Set<string>();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.offer_id && row.email) {
      delivered.add(
        `${row.offer_id}::${normalise(row.email)}`
      );
    }
  }

  return delivered;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function toEmailOffer(row: OfferRow) {
  return {
    jobTitle: row.job_title || "Offerta di lavoro",
    category:
      row.category ||
      row.category_code ||
      "Offerta di lavoro",
    companyName: row.company_name || "",
    publicationDate:
      row.publication_date ||
      row.published_at ||
      "",
    salary: row.salary || "",
    city: row.city || "",
    province: row.province || "",
    address: row.address || "",
    phone: row.phone || "",
    email: row.email || "",
    offerUrl:
      row.source_url ||
      "https://gestoriacitaia.com/decreto-flussi-2027",
  };
}

/**
 * Plantilla de email incluida directamente en este archivo.
 *
 * Así evitamos depender de:
 * ../src/flussi-lavoro-gmail-offerte
 *
 * y eliminamos una causa frecuente de FUNCTION_INVOCATION_FAILED.
 */
function buildFlussiOfferteEmail(data: {
  recipientName?: string;
  offers: ReturnType<typeof toEmailOffer>[];
}): string {
  const recipientName =
    escapeHtml(data.recipientName || "");

  const cards = data.offers
    .map((offer, index) => {
      const title = escapeHtml(
        offer.jobTitle || "Offerta di lavoro"
      );
      const category = escapeHtml(
        offer.category || "Offerta di lavoro"
      );
      const company = escapeHtml(
        offer.companyName || "Azienda"
      );
      const date = escapeHtml(
        offer.publicationDate || "—"
      );
      const salary = escapeHtml(
        offer.salary || "—"
      );
      const city = escapeHtml(
        offer.city || "—"
      );
      const province = escapeHtml(
        offer.province || "—"
      );
      const address = escapeHtml(
        offer.address || "—"
      );
      const phone = escapeHtml(
        offer.phone || "—"
      );
      const email = escapeHtml(
        offer.email || "—"
      );
      const url = escapeHtml(
        offer.offerUrl ||
          "https://gestoriacitaia.com/decreto-flussi-2027"
      );

      return `
      <div style="
        margin:0 0 18px;
        padding:20px;
        background:#071723;
        border:1px solid #176274;
        border-radius:18px;
      ">
        <div style="
          display:inline-block;
          padding:7px 13px;
          border:1px solid #d5ad32;
          border-radius:18px;
          color:#f2d15c;
          background:#12180f;
          font-size:12px;
          font-weight:700;
        ">
          🇮🇹 ${category}
        </div>

        <div style="
          margin-top:14px;
          color:#ffffff;
          font-size:22px;
          line-height:28px;
          font-weight:800;
        ">
          ${title}
        </div>

        <div style="
          margin-top:7px;
          color:#b8c7d2;
          font-size:14px;
        ">
          ${company}
        </div>

        <div style="
          margin-top:16px;
          padding:13px;
          background:#0a1e2b;
          border-radius:10px;
          color:#d9e4eb;
          font-size:13px;
          line-height:22px;
        ">
          📅 Pubblicata: ${date}<br>
          💰 Salario: ${salary}<br>
          📍 ${city}${province ? ` — ${province}` : ""}<br>
          🏠 ${address}<br>
          📞 ${phone}<br>
          ✉️ ${email}
        </div>

        <div style="margin-top:16px;">
          <a
            href="${url}"
            style="
              display:inline-block;
              padding:11px 17px;
              background:#10c985;
              border:1px solid #48efb1;
              border-radius:10px;
              color:#ffffff;
              text-decoration:none;
              font-size:13px;
              font-weight:800;
            "
          >
            Vedi offerta →
          </a>
        </div>

        <div style="
          margin-top:10px;
          color:#667785;
          font-size:10px;
        ">
          Offerta ${index + 1}
        </div>
      </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuove offerte di lavoro — Decreto Flussi 2027</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#02070b;
  font-family:Arial,Helvetica,sans-serif;
">
<center style="width:100%;background:#02070b;">

<div style="
  width:100%;
  max-width:680px;
  margin:20px auto;
  background:#06131d;
  border:1px solid #176274;
  border-radius:24px;
  overflow:hidden;
  color:#ffffff;
">

  <div style="
    padding:28px;
    background:#03101a;
  ">
    <div style="
      font-size:28px;
      font-weight:800;
      line-height:34px;
    ">
      <span style="color:#27e690;">G</span>
      <span style="color:#ffffff;"> gestoria</span><span style="color:#20df91;">citaIA</span>
    </div>

    <div style="
      margin-top:5px;
      color:#efc84a;
      font-size:12px;
      font-weight:800;
      letter-spacing:1px;
    ">
      DECRETO FLUSSI 2027
    </div>
  </div>

  <div style="padding:28px;">

    <div style="
      color:#ffffff;
      font-size:22px;
      font-weight:800;
    ">
      🇮🇹 🇲🇦 Nuove offerte di lavoro
    </div>

    <div style="
      margin-top:8px;
      color:#b8c7d2;
      font-size:14px;
      line-height:22px;
    ">
      Ciao ${recipientName},
      <br>
      abbiamo trovato nuove offerte compatibili
      con le categorie che hai selezionato.
    </div>

    <div style="margin-top:24px;">
      ${cards}
    </div>

    <div style="
      margin-top:24px;
      padding:16px;
      background:#0a1e2b;
      border-left:4px solid #10c985;
      border-radius:8px;
      color:#b8c7d2;
      font-size:12px;
      line-height:19px;
    ">
      <strong style="color:#ffffff;">
        Informazione importante
      </strong>
      <br>
      GestoriaCitaIA non è uno studio legale e non garantisce
      l'ottenimento di un contratto di lavoro, nulla osta,
      visto o permesso di soggiorno.
      Il servizio riguarda la gestione e l'invio di
      informazioni e offerte disponibili.
    </div>

    <div style="margin-top:22px;text-align:center;">
      <a
        href="https://gestoriacitaia.com/decreto-flussi-2027"
        style="
          display:inline-block;
          padding:12px 18px;
          background:#10c985;
          border-radius:10px;
          color:#ffffff;
          text-decoration:none;
          font-size:12px;
          font-weight:800;
        "
      >
        Vedi altre offerte →
      </a>
    </div>

  </div>

  <div style="
    padding:20px;
    background:#101827;
    color:#98a2b3;
    font-size:11px;
    text-align:center;
  ">
    GestoriaCitaIA · Decreto Flussi 2027
  </div>

</div>

</center>
</body>
</html>`;
}

function getHeaderValue(
  req: VercelRequest,
  name: string
): string {
  const value = req.headers[name];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * Solo POST.
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      method: req.method,
    });
  }

  try {
    /*
     * Seguridad opcional.
     *
     * Si FLUSSI_LAVORO_INTERNAL_SECRET existe en Vercel,
     * el cliente debe enviar el header correspondiente.
     *
     * Si la variable NO existe, el endpoint sigue funcionando
     * para la prueba inicial.
     */
    const internalSecret =
      process.env.FLUSSI_LAVORO_INTERNAL_SECRET;

    if (internalSecret) {
      const providedSecret = getHeaderValue(
        req,
        "x-flussi-lavoro-secret"
      );

      if (providedSecret !== internalSecret) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }
    }

    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const offerIds = Array.isArray(body.offerIds)
      ? body.offerIds
          .map((id: unknown) => clean(id, 100))
          .filter(Boolean)
      : [];

    /*
     * dryRun:
     * true = solo lectura / simulación.
     * false = envío real.
     */
    const dryRun = body.dryRun === true;

    if (!offerIds.length) {
      return res.status(400).json({
        error: "offerIds is required",
        example: {
          dryRun: true,
          offerIds: [
            "UUID-DE-LA-OFERTA"
          ],
        },
      });
    }

    if (offerIds.length > 50) {
      return res.status(400).json({
        error: "Maximum 50 offers per bulletin",
      });
    }

    /*
     * 1. Leer ofertas seleccionadas.
     */
    const offers = await getOffers(offerIds);

    if (!offers.length) {
      return res.status(404).json({
        error: "No active offers found",
        requestedOfferIds: offerIds,
      });
    }

    /*
     * 2. Leer clientes activos de las 3 tablas nuevas.
     */
    const clients = await getActiveClients();

    /*
     * 3. Saber qué oferta ya fue enviada a qué email.
     */
    const delivered = await getAlreadyDelivered(
      offers.map((offer) => offer.id)
    );

    /*
     * 4. Buscar coincidencias.
     */
    const matches = new Map<
      string,
      {
        client: Client;
        offers: OfferRow[];
      }
    >();

    for (const client of clients) {
      const matched = offers.filter((offer) => {
        if (
          !workTypeMatches(
            client.work_type,
            offer.work_type || ""
          )
        ) {
          return false;
        }

        if (!categoryMatches(client, offer)) {
          return false;
        }

        const key =
          `${offer.id}::${normalise(client.email)}`;

        /*
         * Si ya recibió esa oferta, no la volvemos a enviar.
         */
        return !delivered.has(key);
      });

      if (matched.length) {
        matches.set(
          normalise(client.email),
          {
            client,
            offers: matched,
          }
        );
      }
    }

    /*
     * Preview seguro.
     */
    const preview = Array.from(matches.values()).map(
      (item) => ({
        email: item.client.email,
        name:
          `${item.client.first_name} ${item.client.last_name}`
            .trim(),
        offers: item.offers.length,
        offerIds: item.offers.map(
          (offer) => offer.id
        ),
        sourceTable: item.client.source_table,
        workType: item.client.work_type,
        categories:
          item.client.source_table ===
          "flussi_lavoro_24_99"
            ? item.client.category
            : item.client.categories,
      })
    );

    /*
     * ========================================================
     * DRY RUN
     * ========================================================
     *
     * Aquí NO se conecta a SMTP.
     * Aquí NO se envía ningún email.
     * Aquí NO se escribe en flussi_deliveries.
     */
    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        message:
          "Prueba realizada. No se ha enviado ningún email.",
        selectedOffers: offers.length,
        activeClients: clients.length,
        recipientsMatched: matches.size,
        recipients: preview,
      });
    }

    /*
     * Si no hay coincidencias, no hacemos ningún envío.
     */
    if (!matches.size) {
      return res.status(200).json({
        ok: true,
        dryRun: false,
        sent: 0,
        failed: 0,
        message:
          "No active client matches the selected offers.",
        selectedOffers: offers.length,
        activeClients: clients.length,
      });
    }

    /*
     * 5. SMTP solamente cuando dryRun=false.
     */
    const transporter = createTransporter();

    const from =
      process.env.FROM_EMAIL ||
      process.env.SMTP_USER;

    if (!from) {
      throw new Error(
        "FROM_EMAIL / SMTP_USER missing"
      );
    }

    /*
     * Verificamos conexión SMTP antes de empezar.
     */
    await transporter.verify();

    let sent = 0;
    let failed = 0;

    const results: Array<Record<string, unknown>> = [];

    /*
     * 6. Un email por cliente con todas sus ofertas.
     */
    for (const item of matches.values()) {
      const emailOffers =
        item.offers.map(toEmailOffer);

      const html =
        buildFlussiOfferteEmail({
          recipientName:
            item.client.first_name,
          offers: emailOffers,
        });

      const subject =
        "🇮🇹 🇲🇦 Nuove offerte di lavoro — Decreto Flussi 2027";

      try {
        const info =
          await transporter.sendMail({
            from:
              `"GestoriaCitaIA" <${from}>`,
            to: item.client.email,
            subject,
            text:
              "Nuove offerte di lavoro — Decreto Flussi 2027\n\n" +
              `${item.offers.length} nuove offerte sono disponibili.\n` +
              "Controlla la tua email per i dettagli.",
            html,
          });

        const now =
          new Date().toISOString();

        /*
         * Registramos cada oferta enviada.
         *
         * order_id se deja fuera intencionadamente:
         * las compras de Flussi Lavoro viven en las
         * 3 tablas nuevas y no queremos crear dependencia
         * con la tabla antigua flussi_orders.
         */
        for (const offer of item.offers) {
          const delivery =
            await supabaseRequest(
              "flussi_deliveries",
              {
                method: "POST",
                headers: {
                  Prefer:
                    "return=minimal",
                },
                body: JSON.stringify({
                  offer_id: offer.id,
                  email:
                    item.client.email,
                  delivery_type:
                    "offer_bulletin",
                  status: "sent",
                  sent_at: now,
                  error_message: null,
                }),
              }
            );

          if (!delivery.ok) {
            console.error(
              "Delivery record failed:",
              await delivery.text()
            );
          }
        }

        sent++;

        results.push({
          email: item.client.email,
          offers:
            item.offers.length,
          messageId:
            info.messageId,
          status: "sent",
        });
      } catch (error) {
        failed++;

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        results.push({
          email: item.client.email,
          offers:
            item.offers.length,
          status: "error",
          error: message,
        });

        /*
         * Registramos error de entrega sin tocar
         * ninguna tabla de verificación.
         */
        for (const offer of item.offers) {
          try {
            await supabaseRequest(
              "flussi_deliveries",
              {
                method: "POST",
                headers: {
                  Prefer:
                    "return=minimal",
                },
                body: JSON.stringify({
                  offer_id: offer.id,
                  email:
                    item.client.email,
                  delivery_type:
                    "offer_bulletin",
                  status: "error",
                  sent_at: null,
                  error_message:
                    message.slice(0, 1000),
                }),
              }
            );
          } catch (deliveryError) {
            console.error(
              "Could not save delivery error:",
              deliveryError
            );
          }
        }
      }
    }

    /*
     * Resultado final.
     */
    return res.status(200).json({
      ok: true,
      dryRun: false,
      selectedOffers: offers.length,
      activeClients: clients.length,
      recipientsMatched: matches.size,
      sent,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "send-flussi-offerte:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Could not process Flussi offers",
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}
