import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { canonicalPath, publicPages, SITE_URL } from '@/lib/seo';
export function PageSeo() {
 const [location] = useLocation();
 useEffect(() => {
  const path = canonicalPath(location.split('?')[0]);
  const page = publicPages[path];
  const privatePage = /^\/(panel|auth|checkout|confirmar-cita)(\/|$)/.test(path);
  const title = page?.title ?? (privatePage ? 'Área privada | GestoriaCitaIA' : 'Página no encontrada | GestoriaCitaIA');
  const description = page?.description ?? 'GestoriaCitaIA: acceso a la plataforma.';
  const setMeta = (attribute: string, name: string, content: string) => {
   let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
   if (!element) {
    element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.appendChild(element);
   }
   element.content = content;
  };
  document.title = title;
  setMeta('name', 'robots', page ? 'index, follow, max-image-preview:large' : 'noindex, follow');
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', SITE_URL + path);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical);}
  canonical.href = SITE_URL + path;
 }, [location]);
 return null;
}
