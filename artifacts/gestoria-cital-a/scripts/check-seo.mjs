import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const dist=new URL('../dist/',import.meta.url);
const sitemap=readFileSync(new URL('sitemap.xml',dist),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(urls.length,10);
const titles=new Set();
for(const url of urls){
 const path=new URL(url).pathname;
 const html=readFileSync(new URL(path==='/'?'index.html':path.slice(1)+'/index.html',dist),'utf8');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];assert.ok(title);assert.ok(!titles.has(title),'Duplicate title: '+title);titles.add(title);
 const canonicals=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];assert.equal(canonicals.length,1);assert.equal(canonicals[0][1],url);
 for(const key of ['description','og:title','og:description','og:url','twitter:title','twitter:description'])assert.ok(new RegExp(`<meta (?:name|property)="${key}" content="[^"]+"`).test(html),key+' missing');
 assert.ok(html.includes('content="index, follow, max-image-preview:large"'));assert.ok(!html.includes('maximum-scale'));
}
for(const file of ['private.html','404.html'])assert.ok(readFileSync(new URL(file,dist),'utf8').includes('content="noindex, follow"'));
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
assert.ok(!config.rewrites.some(r=>r.source.includes('(.*)')),'Catch-all rewrite would hide real 404 responses');
for(const r of config.rewrites)assert.ok(existsSync(new URL(r.destination.slice(1),dist)),r.destination+' missing');
for(const image of ['images/logo.webp','images/sara.webp','images/soufiane.webp','images/decreto-flussi-2027.webp','images/malta-estudiar-2027.webp','images/malta-poster.webp','video12-thumb.webp'])assert.ok(existsSync(new URL(image,dist)));
console.log('PASS: 10 public pages, unique metadata and canonical URLs, sitemap, private/404 noindex, rewrite targets, zoom and image assets.');
