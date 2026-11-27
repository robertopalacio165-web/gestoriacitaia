#!/usr/bin/env node
// Render GSAP motion-graphics templates (assets/motion/templates.html) to transparent PNG frames.
// usage: node motion_render.js jobs.json      jobs = [{template, params, duration, fps, out}]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const url = "file://" + path.resolve(__dirname, "../assets/motion/templates.html");
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  for (const j of jobs) {
    fs.mkdirSync(j.out, { recursive: true });
    await page.evaluate(([n, p, d]) => window.build(n, p, d), [j.template, j.params, j.duration]);
    await page.evaluate(() => document.fonts.ready);
    const n = Math.round(j.duration * (j.fps || 30));
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => window.seek(t), i / (j.fps || 30));
      await page.screenshot({ path: path.join(j.out, String(i).padStart(5, "0") + ".png"), omitBackground: true });
    }
    fs.writeFileSync(path.join(j.out, "done"), String(n));
    process.stdout.write(`[motion] ${j.template} ${n} frames -> ${j.out}\n`);
  }
  await browser.close();
})();
