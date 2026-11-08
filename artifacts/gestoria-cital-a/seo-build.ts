import type { Plugin } from 'vite';
import { publicPages, SITE_URL } from './src/lib/seo';
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function seoPages(): Plugin {
 return {
  name: 'public-page-metadata', enforce: 'post',
  generateBundle(_options, bundle) {
   const index = bundle['index.html'];
   if (!index || index.type !== 'asset') throw new Error('Missing index.html');
   const template = String(index.source);
   for (const [route, page] of Object.entries(publicPages)) {
    const url = SITE_URL + route;
    let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`);
    const values: Record<string, string> = {description: page.description, 'og:title': page.title, 'og:description': page.description, 'og:url': url, 'twitter:title': page.title, 'twitter:description': page.description};
    for (const [key, value] of Object.entries(values)) {
     html = html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*/>)`), (_match, before, after) => before + escape(value) + after);
    }
    html = html.replace(/(<link rel="canonical" href=")[^"]*("\s*\/>)/, (_match, before, after) => before + url + after);
    if (route === '/') index.source = html;
    else this.emitFile({type: 'asset', fileName: `${route.slice(1)}/index.html`, source: html});
   }
   this.emitFile({type: 'asset', fileName: 'private.html', source: template.replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="noindex, follow" />').replace(/<title>.*?<\/title>/, '<title>Área privada | GestoriaCitaIA</title>')});
   this.emitFile({type: 'asset', fileName: '404.html', source: template.replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="noindex, follow" />').replace(/<title>.*?<\/title>/, '<title>Página no encontrada | GestoriaCitaIA</title>')});
  },
 };
}
