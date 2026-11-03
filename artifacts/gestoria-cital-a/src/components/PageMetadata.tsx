import { useEffect } from "react";
import { useLocation } from "wouter";
import pages from "@/seo/pages.json";

export function PageMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.replace(/\/$/, "") || "/";
    const canonicalPath = path === "/estudiar-malta-2027" ? "/estudiar-en-malta-2027" : path;
    const page = pages[canonicalPath as keyof typeof pages];
    const title = page?.title ?? "GestoriaCitaIA";
    document.title = title;
    const meta = (selector: string, value: string) => {
      const element = document.querySelector(selector);
      element?.setAttribute("content", value);
    };
    meta('meta[name="robots"]', page ? "index, follow, max-image-preview:large" : "noindex, follow");
    meta('meta[name="description"]', page?.description ?? "Área de gestión de GestoriaCitaIA.");
    meta('meta[property="og:title"]', title);
    meta('meta[name="twitter:title"]', title);
    meta('meta[property="og:description"]', page?.description ?? "GestoriaCitaIA");
    meta('meta[name="twitter:description"]', page?.description ?? "GestoriaCitaIA");
    const url = `https://www.gestoriacitaia.com${canonicalPath}`;
    meta('meta[property="og:url"]', url);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  }, [location]);
  return null;
}
