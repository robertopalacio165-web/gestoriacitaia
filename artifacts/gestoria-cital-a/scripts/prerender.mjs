// Render the actual public React pages at build time for all visitors.
// Never contact production APIs or snapshot authenticated/personal content.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const pages = JSON.parse(await readFile(path.join(root, 'src/seo/pages.json'), 'utf8'));
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/assets/')) {
      const file = path.resolve(dist, '.' + pathname);
      if (!file.startsWith(dist + path.sep)) throw new Error('Invalid path');
      const data = await readFile(file);
      res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/css');
      res.end(data);
    } else if (Object.hasOwn(pages, pathname)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(template);
    } else { res.writeHead(404).end(); }
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await puppeteer.launch({args: chromium.args.filter(arg => arg !== "--single-process"), executablePath: await chromium.executablePath(), headless: true});
  for (const [route, metadata] of Object.entries(pages)) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width: 1280, height: 900});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === origin && ['document','script','stylesheet'].includes(request.resourceType())) request.continue();
      else request.abort();
    });
    await page.goto(origin + route, {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#root')?.textContent.length > 100, {timeout:15000});
    // Reveal below-the-fold motion sections before taking the public snapshot.
    await page.evaluate(async () => {
      for (let y=0; y<document.body.scrollHeight; y+=700) {
        window.scrollTo(0,y);
        await new Promise(resolve => setTimeout(resolve,80));
      }
      window.scrollTo(0,0);
    });
    await new Promise(resolve => setTimeout(resolve,700));
    if (errors.length) throw new Error(`${route}: ${errors.join('; ')}`);
    const html = await page.content();
    if (!html.includes(metadata.title) || !html.includes('ca-pub-9070805815562548')) throw new Error(`Missing metadata: ${route}`);
    // Preserve the original entry scripts: React mounts its interactive app normally.
    await writeFile(path.join(dist, route === '/' ? 'index.html' : `${route.slice(1)}.html`), html);
    console.log(`Prerendered ${route}`);
    await context.close();
  }
  // SPA-only routes must not inherit the homepage snapshot.
  await writeFile(path.join(dist, 'app.html'), template.replace('index, follow, max-image-preview:large','noindex, follow'));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
