import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { ArrowLeft, Cookie } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Política de Cookies</h1>
            <p className="text-xs text-muted-foreground">Última actualización: enero 2026 · Ley 34/2002 LSSI-CE</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-white/80 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-white mb-3">¿Qué son las cookies?</h2>
            <p>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Nos permiten recordar tus preferencias, analizar el uso del sitio y mejorar la experiencia de usuario.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Cookies que utilizamos</h2>
            <div className="space-y-3">
              {[
                {
                  type: "Cookies técnicas (necesarias)",
                  color: "text-primary",
                  bg: "bg-primary/10",
                  border: "border-primary/20",
                  desc: "Imprescindibles para el funcionamiento de la plataforma. No pueden desactivarse.",
                  items: ["Sesión de usuario autenticado", "Preferencia de idioma (Castellano / Darija)", "Token de seguridad CSRF"],
                },
                {
                  type: "Cookies analíticas",
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/20",
                  desc: "Nos ayudan a entender cómo se usa la plataforma (datos anonimizados). Requieren tu consentimiento.",
                  items: ["Páginas visitadas", "Tiempo en sesión", "Origen del tráfico"],
                },
                {
                  type: "Cookies de preferencias",
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20",
                  desc: "Recuerdan tus configuraciones personales. Requieren tu consentimiento.",
                  items: ["Preferencia de notificaciones", "Plan activo seleccionado", "Última página visitada"],
                },
              ].map((c) => (
                <div key={c.type} className={`glass-panel border ${c.border} rounded-xl p-4`}>
                  <p className={`text-xs font-bold ${c.color} mb-1`}>{c.type}</p>
                  <p className="text-[11px] text-muted-foreground mb-2">{c.desc}</p>
                  <ul className="text-[11px] text-white/60 space-y-0.5">
                    {c.items.map((item) => <li key={item} className="flex items-center gap-1.5">· {item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Gestión de cookies</h2>
            <p>Puedes gestionar o eliminar las cookies desde la configuración de tu navegador:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2 text-xs">
              <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad</li>
              <li><strong>Safari:</strong> Preferencias → Privacidad</li>
              <li><strong>Edge:</strong> Configuración → Privacidad, búsqueda y servicios</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Ten en cuenta que deshabilitar cookies técnicas puede afectar al funcionamiento de la plataforma.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Contacto</h2>
            <p>Para cualquier consulta sobre nuestra política de cookies: <a href="mailto:privacidad@gestoriacitaia.com" className="text-primary hover:underline">privacidad@gestoriacitaia.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
