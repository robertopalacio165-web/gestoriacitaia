const { createClient } = require("@supabase/supabase-js");

const { chromium } = require("playwright-core");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runWorker() {

  console.log("🔥 Sara Worker Started");

  const { data, error } = await supabase
    .from("search_queue")
    .select("*")
    .eq("status", "waiting")
    .limit(5);

  if (error) {
    console.log(error);
    return;
  }

  if (!data?.length) {

    console.log("❌ No clients waiting");

    return;
  }

  for (const client of data) {

    console.log("🔍 Searching cita for:");

    console.log(client.customer_name);

    let browser;

    try {

      /*
      =========================
      PLAYWRIGHT START
      =========================
      */

   browser = await chromium.connectOverCDP(
  "wss://brd-customer-hl_9084dec2-zone-scraping_browser1:6qhjhkbz8cwt@brd.superproxy.io:9222"
);

        headless: true,

        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],

      });

      const page = await browser.newPage({

        viewport: {
          width: 1280 + Math.floor(Math.random() * 100),
          height: 720 + Math.floor(Math.random() * 100),
        },

        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",

      });

      /*
      =========================
      OPEN ICP
      =========================
      */

      await page.goto(
        "https://icp.administracionelectronica.gob.es/icpplus/index.html",
        {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        }
      );

      console.log("✅ ICP opened");

      /*
      =========================
      RANDOM DELAY
      =========================
      */

      await page.waitForTimeout(
        2000 + Math.floor(Math.random() * 4000)
      );

      /*
      =========================
      SELECT PROVINCIA
      =========================
      */

      const provinceToSearch =
        client.province || "Barcelona";

      await page.selectOption(
        'select[name="form"]',
        {
          label: provinceToSearch,
        }
      );

      console.log("✅ Provincia selected");

      await page.waitForTimeout(
        1500 + Math.floor(Math.random() * 3000)
      );

      /*
      =========================
      CLICK ACEPTAR
      =========================
      */

      await page.click("#btnAceptar");

      console.log("✅ Accept clicked");

      await page.waitForTimeout(
        2000 + Math.floor(Math.random() * 3000)
      );

      /*
      =========================
      SELECT TRAMITE
      =========================
      */

      await page.waitForSelector(
        'select[name="tramiteGrupo[0]"]',
        {
          timeout: 30000,
        }
      );

      await page.selectOption(
        'select[name="tramiteGrupo[0]"]',
        {
          label: "POLICIA-TOMA DE HUELLA",
        }
      );

      console.log("✅ Tramite selected");

      await page.waitForTimeout(
        1500 + Math.floor(Math.random() * 3000)
      );

      /*
      =========================
      CLICK ENTRAR
      =========================
      */

      const buttons = await page.$$("input");

      for (const btn of buttons) {

        const value =
          await btn.getAttribute("value");

        if (
          value &&
          value.toLowerCase().includes("entrar")
        ) {

          await btn.click();

          console.log("✅ Entrar clicked");

          break;
        }
      }

      await page.waitForTimeout(
        3000 + Math.floor(Math.random() * 5000)
      );

      /*
      =========================
      SCREENSHOT PROOF
      =========================
      */

      const screenshotName =
        `proof-${Date.now()}.png`;

      await page.screenshot({
        path: screenshotName,
        fullPage: true,
      });

      console.log("📸 Screenshot saved");

      /*
      =========================
      PAGE CONTENT
      =========================
      */

      const content = await page.content();

      /*
      =========================
      EXTRACTION
      =========================
      */

      let extractedDate = "PENDING";

      let extractedHour = "PENDING";

      let extractedOffice = "PENDING";

      try {

        const bodyText =
          await page.locator("body").innerText();

        /*
        DATE
        */

        const dateMatch =
          bodyText.match(
            /\b\d{2}\/\d{2}\/\d{4}\b/
          );

        if (dateMatch) {
          extractedDate = dateMatch[0];
        }

        /*
        HOUR
        */

        const hourMatch =
          bodyText.match(
            /\b\d{2}:\d{2}\b/
          );

        if (hourMatch) {
          extractedHour = hourMatch[0];
        }

        /*
        OFFICE
        */

        if (
          bodyText.includes("POLICIA")
        ) {

          extractedOffice =
            "POLICIA";

        }

        console.log(
          "📅 Date:",
          extractedDate
        );

        console.log(
          "🕒 Hour:",
          extractedHour
        );

        console.log(
          "🏢 Office:",
          extractedOffice
        );

      } catch (extractErr) {

        console.log(
          "❌ Extraction failed"
        );

      }

      /*
      =========================
      DETECTION
      =========================
      */

      const hasNoAppointments =
        content.includes(
          "En este momento no hay citas disponibles"
        );

      const hasError =
        content.includes(
          "No se pudo obtener información"
        );

      /*
      =========================
      FOUND APPOINTMENT
      =========================
      */

      if (!hasNoAppointments && !hasError) {

        console.log(
          "🔥 POSSIBLE REAL CITA FOUND"
        );

        const token =
          Math.random()
            .toString(36)
            .substring(2, 12);

        /*
        SAVE APPOINTMENT
        */

        const { data: foundData } =
          await supabase
            .from("found_appointments")
            .insert([
              {
                queue_id: client.id,

                customer_name:
                  client.customer_name,

                customer_phone:
                  client.customer_phone,

                customer_email:
                  client.customer_email,

                tramite:
                  client.tramite,

                province:
                  client.province,

                city:
                  client.city,

                appointment_date:
                  extractedDate,

                appointment_hour:
                  extractedHour,

                office:
                  extractedOffice,

                confirmation_token:
                  token,

                payment_status:
                  "pending",

                provider:
                  "sara_worker",
              },
            ])
            .select()
            .single();

        /*
        UPDATE QUEUE
        */

        await supabase
          .from("search_queue")
          .update({
            status: "found",
            found: true,
            last_check: new Date(),
          })
          .eq("id", client.id);

        /*
        CONFIRM LINK
        */

        const confirmLink =
`${process.env.NEXT_PUBLIC_URL}/confirmar?token=${token}`;

        console.log("🔗 Confirm Link:");
        console.log(confirmLink);

        /*
        WHATSAPP READY
        */

        console.log("📲 WhatsApp ready");

        /*
        MAKE WEBHOOK
        */

        if (process.env.MAKE_WEBHOOK_FOUND) {

          await fetch(
            process.env.MAKE_WEBHOOK_FOUND,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                type: "FOUND_CITA",

                appointment:
                  foundData,

                confirmLink,

                screenshot:
                  screenshotName,
              }),
            }
          );

          console.log(
            "✅ Webhook sent to Make"
          );
        }

      } else {

        console.log(
          "❌ No citas disponibles"
        );

        /*
        UPDATE LAST CHECK
        */

        await supabase
          .from("search_queue")
          .update({
            last_check: new Date(),
          })
          .eq("id", client.id);

      }

      /*
      =========================
      CLOSE BROWSER
      =========================
      */

      await browser.close();

      /*
      =========================
      RANDOM GLOBAL DELAY
      =========================
      */

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          5000 +
            Math.floor(
              Math.random() * 10000
            )
        )
      );

    } catch (err) {

      console.log("❌ Worker Error");

      console.log(err);

      if (browser) {
        await browser.close();
      }

    }

  }

}
 async function startLoop() {

  while (true) {

    try {

      await runWorker();

    } catch (err) {

      console.log(err);

    }

    console.log("⏳ Waiting next cycle...");

    await new Promise((resolve) =>
      setTimeout(resolve, 60000)
    );

  }

}

startLoop();
