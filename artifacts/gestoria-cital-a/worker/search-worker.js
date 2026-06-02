import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

const supabase = createClient(
process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runWorker() {

  console.log("🔥 Sara Worker Started");

  const { data, error } = await supabase
 .from("sara_searches")
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
      BRIGHT DATA CLOUD BROWSER
      =========================
      */

      browser = await chromium.connectOverCDP(
        "wss://brd-customer-hl_9084dec2-zone-scraping_browser1:6qhjhkbz8cwt@brd.superproxy.io:9222"
      );

      const context =
        browser.contexts()[0];

      const page =
        context.pages()[0] ||
        await context.newPage();

      await page.setViewportSize({
        width: 1280 +
          Math.floor(Math.random() * 100),

        height: 720 +
          Math.floor(Math.random() * 100),
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

      await page.waitForTimeout(4000);

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

      await page.waitForTimeout(3000);

      /*
      =========================
      CLICK ACEPTAR
      =========================
      */

      await page.click("#btnAceptar");

      console.log("✅ Accept clicked");

      await page.waitForTimeout(4000);

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

      await page.waitForTimeout(3000);

      /*
      =========================
      CLICK ENTRAR
      =========================
      */

      const buttons =
        await page.$$("input");

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

      await page.waitForTimeout(5000);

      /*
      =========================
      SCREENSHOT
      =========================
      */

      const screenshotName =
        `proof-${Date.now()}.png`;

      await page.screenshot({
        path: screenshotName,
        fullPage: true,
      });

      console.log("📸 Screenshot saved");
await page.screenshot({
  path: screenshotName,
  fullPage: true,
});

console.log("📸 Screenshot saved");

const pageContent = await page.textContent("body");

console.log("========== PAGE CONTENT ==========");
console.log(pageContent);
console.log("=================================");
      /*
      =========================
      EXTRACTION
      =========================
      */

      let extractedDate =
        "28/05/2026";

      let extractedHour =
        "09:30";

      let extractedOffice =
        "Policía Barcelona";

      /*
      =========================
      TEST MODE
      =========================
      */

  const fakeFound = false;

      if (fakeFound) {

        console.log(
          "🔥 TEST CITA FOUND"
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
    .from("sara_searches")
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
        SEND WEBHOOK TO MAKE
        */

        if (
          process.env.MAKE_WEBHOOK_FOUND
        ) {

          await fetch(
            process.env.MAKE_WEBHOOK_FOUND,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                customer_phone:
                  client.customer_phone,

                office:
                  extractedOffice,

                appointment_date:
                  extractedDate,

                appointment_hour:
                  extractedHour,

                confirmation_link:
                  confirmLink,
              }),
            }
          );

          console.log(
            "✅ Make webhook sent"
          );
        }

      }

      /*
      =========================
      CLOSE
      =========================
      */

      await browser.close();

      await new Promise((resolve) =>
        setTimeout(resolve, 10000)
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

    console.log(
      "⏳ Waiting next cycle..."
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 60000)
    );

  }

}

startLoop();
