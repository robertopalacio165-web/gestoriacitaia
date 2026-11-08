import { Navbar } from '@/components/Navbar';
import { useLang } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { Mail, ArrowLeft } from 'lucide-react';
export default function ContactoPage() {
 const {lang}=useLang();
 const copy=lang==='darija' ? {title:'تواصل معنا',body:'عندك شي سؤال على المنصة أو الخدمات ديالنا؟ تقدر تراسلنا بالإيميل.',action:'راسلنا بالإيميل',back:'رجوع للرئيسية'} : lang==='en' ? {title:'Contact us',body:'Have a question about the platform or our digital services? Contact us by email.',action:'Email us',back:'Back to home'} : {title:'Contacta con nosotros',body:'¿Tienes dudas sobre la plataforma o nuestros servicios digitales? Escríbenos por correo electrónico.',action:'Escríbenos',back:'Volver al inicio'};
 return <div className="min-h-screen bg-background text-foreground"><Navbar/><main className="max-w-3xl mx-auto px-6 pt-28 pb-16"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-8"><ArrowLeft className="h-4 w-4"/>{copy.back}</Link><section className="glass-panel rounded-2xl border border-white/10 p-6 sm:p-10"><Mail className="h-10 w-10 text-primary mb-5" aria-hidden="true"/><h1 className="text-3xl font-bold font-display mb-4">{copy.title}</h1><p className="text-muted-foreground leading-relaxed mb-6">{copy.body}</p><a href="mailto:jobs@gestoriacitaia.com" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{copy.action}</a><p className="mt-5 text-sm break-all" dir="ltr">jobs@gestoriacitaia.com</p></section></main></div>;
}
