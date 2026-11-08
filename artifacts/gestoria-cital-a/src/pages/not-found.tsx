import {Link} from 'wouter';
import {useLang} from '@/contexts/LanguageContext';
export default function NotFound() {
 const {lang}=useLang();
 const copy=lang==='darija'?{title:'الصفحة ما كايناش',body:'الرابط تبدل أو الصفحة ما بقاتش متوفرة.',back:'رجوع للرئيسية'}:lang==='en'?{title:'Page not found',body:'The link has changed or this page is no longer available.',back:'Back to home'}:{title:'Página no encontrada',body:'El enlace ha cambiado o esta página ya no está disponible.',back:'Volver al inicio'};
 return <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"><section className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 p-8 text-center"><p className="text-primary text-sm font-semibold mb-4">GestoriaCitaIA · 404</p><h1 className="font-display text-3xl font-bold mb-4">{copy.title}</h1><p className="text-muted-foreground mb-6">{copy.body}</p><Link href="/" className="inline-block rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold">{copy.back}</Link></section></main>;
}
