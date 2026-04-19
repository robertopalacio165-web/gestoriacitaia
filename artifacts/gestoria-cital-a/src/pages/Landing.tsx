import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { lang } = useLang();

  const copy = {
    es: {
      badge: "Agente IA de Extranjería — 100% legal y seguro",
      title1: "Descubre si puedes",
      title2: "regularizarte",
      title3: "en España",
      desc:
        "Nuestro agente IA analiza tu situación, revisa tus documentos y te guía paso a paso de forma clara, rápida y segura.",
      start: "Empezar ahora",
      citas: "Buscar citas",
      panel: "Ir al panel",
      trust: "Miles de personas ya usan GestoriaCitaIA",
      mohamedRole: "Especialista en Extranjería",
      saraRole: "Buscar Citas · 24/7",
      online: "En línea",
      f1: "Análisis rápido",
      f2: "Subida de documentos",
      f3: "Preparación en PDF",
      f4: "Asistencia 24/7",
    },
    en: {
      badge: "Immigration AI Agent — 100% legal and safe",
      title1: "Discover if you can",
      title2: "regularize your status",
      title3: "in Spain",
      desc:
        "Our AI agent analyzes your situation, reviews your documents and guides you step by step in a clear, fast and safe way.",
      start: "Start now",
      citas: "Find appointments",
      panel: "Go to panel",
      trust: "Thousands of people already use GestoriaCitaIA",
      mohamedRole: "Immigration Specialist",
      saraRole: "Appointments · 24/7",
      online: "Online",
      f1: "Fast analysis",
      f2: "Document upload",
      f3: "PDF preparation",
      f4: "24/7 assistance",
    },
    darija: {
      badge: "وكيل ذكي للهجرة — قانوني وآمن 100%",
      title1: "شوف واش تقدر",
      title2: "تسوّي وضعيتك",
      title3: "في إسبانيا",
      desc:
        "الوكيل الذكي ديالنا كيشوف الحالة ديالك، كيراجع الوثائق ديالك، وكيعاونك خطوة بخطوة بطريقة واضحة وسريعة وآمنة.",
      start: "ابدأ الآن",
      citas: "البحث عن المواعيد",
      panel: "الذهاب إلى اللوحة",
      trust: "آلاف الناس كايستعملو GestoriaCitaIA",
      mohamedRole: "مختص في الهجرة",
      saraRole: "البحث عن المواعيد · 24/7",
      online: "متصل الآن",
      f1: "تحليل سريع",
      f2: "رفع الوثائق",
      f3: "إعداد PDF",
      f4: "مساعدة 24/7",
    },
  }[lang === "en" ? "en" : lang === "darija" ? "darija" : "es"];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 65% 45% at 50% 0%, rgba(34,197,94,0.10), transparent), radial-gradient(ellipse 45% 35% at 80% 70%, rgba(59,130,246,0.10), transparent)",
        }}
      />

      <Navbar />

      <main className="relative z-10 pt-24 pb-14 px-4 sm:px-6">
        <section className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[11px] sm:text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              {copy.badge}
            </div>

            <h1 className="mt-7 text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.05] tracking-tight text-white">
              {copy.title1}{" "}
              <span className="bg-gradient-to-r from-primary via-green-400 to-blue-400 bg-clip-text text-transparent">
                {copy.title2}
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                {copy.title3}
              </span>
            </h1>

            <p className="mt-6 max-w-3xl mx-auto text-sm sm:text-lg text-muted-foreground leading-relaxed">
              {copy.desc}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setLocation("/regularizacion-2026")}
                className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-bold shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)] transition-all"
              >
                {copy.start}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setLocation("/buscar-citas")}
                className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563ff] hover:bg-[#1f56de] text-white px-8 py-4 text-lg font-bold shadow-[0_0_30px_-8px_rgba(37,99,255,0.55)] transition-all"
              >
                {copy.citas}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setLocation("/panel")}
                className="w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white px-8 py-4 text-lg font-semibold transition-all"
              >
                {copy.panel}
              </button>
            </div>

            <div className="mt-7 flex items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["MA", "ES", "DZ", "CI", "PK"].map((item, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-[10px] text-white/70 flex items-center justify-center backdrop-blur-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <span>{copy.trust}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto"
          >
            <button
              type="button"
              onClick={() => setLocation("/regularizacion-2026")}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 hover:border-primary/30 transition-all text-left"
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                alt="Mohamed"
                className="w-full h-[260px] sm:h-[420px] object-cover object-top opacity-80 group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <h3 className="text-2xl sm:text-5xl font-black text-white">
                  Mohamed
                </h3>
                <p className="mt-1 text-sm sm:text-2xl text-white/75">
                  {copy.mohamedRole}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/55 border border-white/10 px-3 py-1.5 text-xs sm:text-sm text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  {copy.online}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLocation("/buscar-citas")}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 hover:border-primary/30 transition-all text-left"
            >
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                alt="Sara"
                className="w-full h-[260px] sm:h-[420px] object-cover object-top opacity-80 group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <h3 className="text-2xl sm:text-5xl font-black text-white">
                  Sara
                </h3>
                <p className="mt-1 text-sm sm:text-2xl text-white/75">
                  {copy.saraRole}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/55 border border-white/10 px-3 py-1.5 text-xs sm:text-sm text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  {copy.online}
                </div>
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-10 max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6"
          >
            {[copy.f1, copy.f2, copy.f3, copy.f4].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-2 text-sm sm:text-lg text-white/90"
              >
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
