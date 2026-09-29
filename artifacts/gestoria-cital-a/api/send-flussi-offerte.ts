import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { buildFlussiOfferteEmail } from "./flussi-lavoro-gmail-offerte";

/**
 * GESTORIACITAIA
 * DECRETO FLUSSI 2027 — ENVÍO MANUAL DE OFERTAS
 *
 * NO toca Flussi Verification.
 * NO usa Make.
 * NO tiene cron.
 * dryRun=true  -> no envía.
 * dryRun=false -> envío real.
 */

export const config = {
  api: {
    bodyParser: true,
  },
};

const clean = (value: unknown, max = 2000): string =>
  String(value ?? "").trim().slice(0, max);

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
    auth: { user, pass },
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
    return value.map(normalise).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map(normalise)
    .filter(Boolean);
}

function workTypeMatches(
  clientType: string,
  offerType: string
): boolean {
  const client = normalise(clientType);
  const offer = normalise(offerType);

  if (!offer || client === offer) {
    return true;
  }

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

  if (!offerCode && !offerName) {
    return true;
  }

  return wanted.some((item) => {
    if (!item) return false;

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

  if (table === "flussi_lavoro_9_99") {
    return true;
  }

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
        : table === "flussi_lavoro_9_99"
          ? "id,first_name,last_name,email,phone,work_type,categories,payment_status"
          : "id,first_name,last_name,email,phone,work_type,categories,payment_status,starts_at,expires_at";

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
      if (!row.email || !isClientActive(row, table)) {
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
    salary: "",
    city: row.city || "",
    province: row.province || "",
    address: row.address || "",
    phone: row.phone || "",
    email: row.email || "",
    contractType: row.contract_type || "",
    workType: row.work_type || "",
    offerUrl: row.source_url || "",
  };
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
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      method: req.method,
    });
  }

  try {
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

    const dryRun = body.dryRun === true;

    if (!offerIds.length) {
      return res.status(400).json({
        error: "offerIds is required",
        example: {
          dryRun: true,
          offerIds: ["UUID-DE-LA-OFERTA"],
        },
      });
    }

    if (offerIds.length > 50) {
      return res.status(400).json({
        error: "Maximum 50 offers per bulletin",
      });
    }

    const offers = await getOffers(offerIds);

    if (!offers.length) {
      return res.status(404).json({
        error: "No active offers found",
        requestedOfferIds: offerIds,
      });
    }

    const clients = await getActiveClients();

    const delivered = await getAlreadyDelivered(
      offers.map((offer) => offer.id)
    );

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

        return !delivered.has(key);
      });

      if (matched.length) {
        matches.set(normalise(client.email), {
          client,
          offers: matched,
        });
      }
    }

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

    const transporter = createTransporter();

    const from =
      process.env.FROM_EMAIL ||
      process.env.SMTP_USER;

    if (!from) {
      throw new Error(
        "FROM_EMAIL / SMTP_USER missing"
      );
    }

    await transporter.verify();

    let sent = 0;
    let failed = 0;

    const results: Array<Record<string, unknown>> = [];

    for (const item of matches.values()) {
      const emailOffers =
        item.offers.map(toEmailOffer);

      /*
       * ESTA ES LA PLANTILLA NUEVA APROBADA.
       * NO se usa ninguna plantilla antigua aquí.
       */
      const html = buildFlussiOfferteEmail({
        recipientName: item.client.first_name,
        offers: emailOffers,
      });

      const subject =
        "🇮🇹 🇲🇦 Nuove offerte di lavoro — Decreto Flussi 2027";

      try {
        const info = await transporter.sendMail({
          from: `"GestoriaCitaIA" <${from}>`,
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

        for (const offer of item.offers) {
          const delivery =
            await supabaseRequest(
              "flussi_deliveries",
              {
                method: "POST",
                headers: {
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  offer_id: offer.id,
                  email: item.client.email,
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
          offers: item.offers.length,
          messageId: info.messageId,
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
          offers: item.offers.length,
          status: "error",
          error: message,
        });

        for (const offer of item.offers) {
          try {
            await supabaseRequest(
              "flussi_deliveries",
              {
                method: "POST",
                headers: {
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  offer_id: offer.id,
                  email: item.client.email,
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
