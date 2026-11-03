import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const pages=JSON.parse(await readFile('src/seo/pages.json','utf8'));
const config=JSON.parse(await readFile('vercel.json','utf8'));
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const dest=config.rewrites.find(r=>r.source===pathname)?.destination??pathname;
 try{const p=path.join(process.cwd(),'dist',dest);const data=await readFile(p);res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.txt')?'text/plain':'text/html; charset=utf-8');res.end(data);}catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({args:chromium.args.filter(a=>a!=='--single-process'),executablePath:await chromium.executablePath(),headless:true});
try{
 const page=await browser.newPage();
 await page.setJavaScriptEnabled(false);
 for(const [route,meta] of Object.entries(pages)){
  const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  assert.equal(await page.title(),meta.title);
  assert.equal(await page.$eval('link[rel=canonical]',el=>el.href),`https://www.gestoriacitaia.com${route}`);
  assert.equal(await page.$$eval('h1',els=>els.length),1,route);
  assert.ok(await page.$eval('#root',el=>el.innerText.length)>100,route);
  assert.equal(await page.$eval('meta[name=google-adsense-account]',el=>el.content),'ca-pub-9070805815562548');
 }
 assert.equal((await fetch(origin+'/ads.txt')).headers.get('content-type'),'text/plain');
 assert.equal(await(await fetch(origin+'/ads.txt')).text(),'google.com, pub-9070805815562548, DIRECT, f08c47fec0942fa0\n');
 assert.equal((await fetch(origin+'/missing-page')).status,404);
 const spa=await(await fetch(origin+'/checkout/success')).text();assert.ok(spa.includes('noindex, follow'));assert.ok(spa.includes('<div id="root"></div>'));
 console.log('PASS: 9 pages without JavaScript, titles, canonicals, H1s, AdSense, ads.txt, unknown URL and checkout shell');
 await page.setJavaScriptEnabled(true);
 await page.setRequestInterception(true);
 page.on('request',r=>new URL(r.url()).origin===origin?r.continue():r.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of Object.keys(pages)){
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#root')?.innerText.length>100);
 }
 await page.goto(origin+'/decreto-flussi-2027',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('input');
 const editable=await page.$('input[type=text]');
 if(editable){await editable.type('Prueba SEO');assert.equal(await editable.evaluate(el=>el.value),'Prueba SEO');}
 assert.deepEqual(errors,[]);
 console.log('PASS: React mounts all public pages without page errors; form accepts input (no submission)');
}finally{await browser.close();await new Promise(r=>server.close(r));}
