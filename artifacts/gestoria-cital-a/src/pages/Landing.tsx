import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, FileText, Globe, MapPin, Users, Shield, Home, Briefcase, GraduationCap, Heart, Car, Building2, Star, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const PLANS = [
  {
    name: "BÁSICO",
    price: "$9.99",
    period: "/mes",
    color: "from-blue-600/20 to-blue-800/10",
    border: "border-blue-600/20",
    btnClass: "bg-white/10 hover:bg-white/15 text-white border border-white/15",
    badge: null,
    features: [
      "1 trámite activo",
      "Citas limitadas (2/mes)",
      "Chat con agente IA",
      "Soporte básico",
      "Verificación de documentos",
    ],
  },
  {
    name: "ESTÁNDAR",
    price: "$14.99",
    period: "/mes",
    color: "from-indigo-600/20 to-indigo-800/10",
    border: "border-indigo-500/30",
    btnClass: "bg-white/10 hover:bg-white/15 text-white border border-white/15",
    badge: null,
    features: [
      "3 trámites activos",
      "Citas ilimitadas",
      "Videollamada con agente",
      "Soporte prioritario",
      "Aviso WhatsApp automático",
      "Historial de trámites",
    ],
  },
  {
    name: "PRO",
    price: "$27.99",
    period: "/mes",
    color: "from-blue-500/25 to-indigo-600/20",
    border: "border-blue-400/40",
    btnClass: "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30",
    badge: "POPULAR",
    features: [
      "Trámites ilimitados",
      "Citas ilimitadas",
      "Agente IA dedicado 24/7",
      "Soporte urgente prioritario",
      "Aviso WhatsApp + Email",
      "Gestión completa de documentos",
      "20% descuento incluido",
    ],
  },
];

const TRAMITES = [
  { icon: FileText, label: "Renovación TIE", color: "text-blue-400" },
  { icon: Globe, label: "Visado Nacional", color: "text-indigo-400" },
  { icon: Shield, label: "Asignación NIE", color: "text-green-400" },
  { icon: Home, label: "Empadronamiento", color: "text-yellow-400" },
  { icon: Briefcase, label: "Autorización Trabajo", color: "text-orange-400" },
  { icon: Users, label: "Reagrupación Familiar", color: "text-pink-400" },
  { icon: GraduationCap, label: "Visado Estudiante", color: "text-cyan-400" },
  { icon: Heart, label: "Residencia por Arraigo", color: "text-red-400" },
  { icon: Car, label: "Canje Permiso Conducir", color: "text-purple-400" },
  { icon: Building2, label: "Residencia Larga Duración", color: "text-teal-400" },
  { icon: Globe, label: "Autorización de Regreso", color: "text-blue-300" },
  { icon: MapPin, label: "Certificado UE", color: "text-emerald-400" },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <Navbar />

      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

        {/* HERO */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-primary/20 text-primary mb-5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-medium">Agente IA de Extranjería v2.0 Activo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight mb-4">
            Tu Gestoría de Extranjería{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-secondary">
              con Inteligencia Artificial
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
            Nuestros agentes IA te guían paso a paso en tiempo real para conseguir tu cita y tramitar tus documentos de extranjería desde el móvil.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              className="rounded-full px-6 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/buscar-citas")}
            >
              Buscar mi cita <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" className="rounded-full px-6 border-white/15 hover:bg-white/5" onClick={() => setLocation("/panel")}>
              Ver mi panel
            </Button>
          </div>
        </motion.div>

        {/* TWO AGENT WINDOWS */}
        <motion.div
          className="grid grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AgentCard name="Mohamed" role="Especialista en Extranjería" imagePath={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`} delay={0.1} />
          <AgentCard name="Sara" role="Asesora Legal" imagePath={`${import.meta.env.BASE_URL}images/avatar-sara.png`} delay={0.2} />
        </motion.div>

        {/* FEATURES ROW */}
        <motion.div
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {["100% online", "Soporte en español y darija", "Verificación IA de documentos", "Aviso WhatsApp de citas disponibles"].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-white/75 text-sm">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </motion.div>

        {/* VIDEO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="relative rounded-2xl overflow-hidden glass-panel aspect-video max-w-3xl mx-auto border border-white/10 group cursor-pointer shadow-2xl shadow-primary/10">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10"></div>
            <div className="absolute inset-0 bg-[hsl(222,47%,5%,0.5)]"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-bold text-xl text-white">GestoriaCita<span className="text-primary">IA</span></span>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-600 border-4 border-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl">
                <Play className="w-7 h-7 text-white ml-1 fill-white" />
              </div>
              <p className="font-medium text-sm text-white/80">Cómo funciona GestoriaCitaIA en 2 minutos</p>
            </div>
          </div>
        </motion.div>

        {/* ── PRICING ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">Planes de servicio</h2>
            <p className="text-sm text-muted-foreground">Elige el plan que mejor se adapta a tu situación</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border ${plan.border} bg-gradient-to-b ${plan.color} backdrop-blur-sm p-6 flex flex-col`}
                style={{ boxShadow: plan.badge ? "0 0 40px -10px hsl(217,91%,60%,0.3)" : undefined }}
              >
                {/* Popular badge - corner ribbon */}
                {plan.badge && (
                  <div className="absolute top-0 right-0 overflow-hidden w-20 h-20">
                    <div className="absolute top-3 right-[-20px] w-24 text-center bg-primary text-white text-[10px] font-bold py-1 rotate-45 shadow-sm">
                      POPULAR
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-display font-black text-white">{plan.price}</span>
                    <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setLocation("/panel")}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${plan.btnClass}`}
                >
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── ALL TRAMITES ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">Trámites de Extranjería</h2>
            <p className="text-sm text-muted-foreground">Gestionamos todos los trámites del proceso de extranjería en España</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {TRAMITES.map((t, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setLocation("/buscar-citas")}
                className="glass-panel border border-white/[0.07] rounded-xl p-4 flex flex-col items-center gap-3 text-center hover:border-primary/30 hover:bg-white/[0.07] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <t.icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <span className="text-xs font-medium text-white/80 leading-tight">{t.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="text-center mt-6">
            <Button variant="outline" className="rounded-full border-white/15 hover:bg-white/5 text-sm" onClick={() => setLocation("/buscar-citas")}>
              Ver todos los trámites <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.07] bg-[hsl(222,47%,4%,0.8)] backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex gap-3">
            <a href="#" className="hover:text-white transition-colors">Aviso legal</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
          <div className="flex gap-3 text-muted-foreground">
            <a href="#" className="w-7 h-7 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-600/30 cursor-pointer flex items-center justify-center text-white text-xs font-bold transition-colors">f</a>
            <a href="#" className="w-7 h-7 rounded-lg bg-pink-600/20 hover:bg-pink-600 border border-pink-600/30 cursor-pointer flex items-center justify-center transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="#" className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer flex items-center justify-center transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.845L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="w-7 h-7 rounded-lg bg-green-600/20 hover:bg-green-600 border border-green-600/30 cursor-pointer flex items-center justify-center transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
          <div className="text-xs text-muted-foreground">© 2026 GestoriaCitalA</div>
        </div>
      </footer>
    </div>
  );
}
