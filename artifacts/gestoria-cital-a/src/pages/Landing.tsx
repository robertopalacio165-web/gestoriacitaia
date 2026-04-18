import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  FileText,
  MessageSquare,
  Clock3,
} from "lucide-react";

export default function Index() {
  const { lang } = useLang();

  const ui = (() => {
    if (lang === "darija") {
      return {
        badge: "وكيل ذكي ديال الهجرة — قانوني وآمن 100%",
        title1: "شوف واش تقدر",
        title2: "تسوي وضعيتك",
        title3: "فـ إسبانيا",
        subtitle:
          "الوكيل الذكي ديالنا كيشوف الحالة ديالك، كيراجع الوثائق ديالك، وكيوجهك خطوة بخطوة بطريقة واضحة وسريعة وآمنة.",
        startNow: "بدا دابا",
        searchAppointment: "قلب على موعد",
        goPanel: "ادخل للبانيل",
        socialProof: "آلاف الناس كيستعملو GestoriaCitaIA",
        mohamedName: "Mohamed",
        mohamedRole: "مختص فالهجرة",
        saraName: "Sara",
        saraRole: "البحث على المواعيد · 24/7",
        online: "متصل الآن",
        features: [
          "تحليل سريع",
          "رفع الوثائق",
          "إعداد PDF",
          "مساعدة 24/7",
        ],
      };
    }

    if (lang === "en") {
      return {
        badge: "Immigration AI Agent — 100% legal and secure",
        title1: "Find out if you can",
        title2: "regularize your status",
        title3: "in Spain",
        subtitle:
          "Our AI agent analyzes your situation, reviews your documents, and guides you step by step in a clear, fast, and safe way.",
        startNow: "Start now",
        searchAppointment: "Search appointments",
        goPanel: "Go to panel",
        socialProof: "Thousands of people already use GestoriaCitaIA",
        mohamedName: "Mohamed",
        mohamedRole: "Immigration Specialist",
        saraName: "Sara",
        saraRole: "Appointments · 24/7",
        online: "Online",
        features: [
          "Fast analysis",
          "Document upload",
          "PDF preparation",
          "24/7 support",
        ],
      };
    }

    return {
      badge: "Agente IA de Extranjería — 100% legal y seguro",
      title1: "Descubre si puedes",
      title2: "regularizarte",
      title3: "en España",
      subtitle:
        "Nuestro agente IA analiza tu situación, revisa tus documentos y te guía paso a paso de forma clara, rápida y segura.",
      startNow: "Empezar ahora",
      searchAppointment: "Buscar citas",
      goPanel: "Ir al panel",
      socialProof: "Miles de personas ya usan GestoriaCitaIA",
      mohamedName: "Mohamed",
      mohamedRole: "Especialista en Extranjería",
      saraName: "Sara",
      saraRole: "Buscar Citas · 24/7",
      online: "En línea",
      features: [
        "Análisis rápido",
        "Subida de documentos",
        "Preparación en PDF",
        "Asistencia 24/7",
      ],
    };
  })();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,197,94,0.10), transparent), radial-gradient(ellipse 50% 35% at 85% 85%, rgba(59,130,246,0.10), transparent)",
        }}
      />

      <Navbar />

      <main className="relative z-10">
        <section className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] sm:text-xs font-semibold text-primary mb-6">
                <Shield className="w-3.5 h-3.5" />
                <span>{ui.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black leading-[1.08] tracking-tight text-white">
                {ui.title1}{" "}
                <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                  {ui.title2}
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                  {ui.title3}
                </span>
              </h1>

              <p className="mt-6 text-sm sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {ui.subtitle}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/regularizacion-2026"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-base font-bold shadow-[0_0_30px_-5px_hsl(var(--primary)/0.55)] transition-all"
                >
                  {ui.startNow}
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="/buscar-citas"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-base font-bold shadow-[0_0_30px_-5px_rgba(59,130,246,0.55)] transition-all"
                >
                  {ui.searchAppointment}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-4 flex justify-center">
                <a
                  href="/panel"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white px-7 py-3 text-sm font-semibold transition-colors"
                >
                  {ui.goPanel}
                </a>
              </div>

              <div className="mt-7 flex items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {["MA", "ES", "DZ", "CI", "PK"].map((item, index) => (
                    <div
                      key={item}
                      className="w-7 h-7 rounded-full border border-white/10 bg-white/5 text-[9px] text-white/70 flex items-center justify-center"
                      style={{ zIndex: 10 - index }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <span>{ui.socialProof}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 max-w-3xl mx-auto"
            >
              <HomeAgentCard
                image={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
                name={ui.mohamedName}
                role={ui.mohamedRole}
                online={ui.online}
                href="/regularizacion-2026"
              />

              <HomeAgentCard
                image={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                name={ui.saraName}
                role={ui.saraRole}
                online={ui.online}
                href="/buscar-citas"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="mt-10 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <FeatureItem icon={CheckCircle2} label={ui.features[0]} />
              <FeatureItem icon={UploadIconFake} label={ui.features[1]} />
              <FeatureItem icon={FileText} label={ui.features[2]} />
              <FeatureItem icon={Clock3} label={ui.features[3]} />
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}

function HomeAgentCard({
  image,
  name,
  role,
  online,
  href,
}: {
  image: string;
  name: string;
  role: string;
  online: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group relative rounded-[26px] overflow-hidden border border-white/10 bg-black/40 hover:border-primary/30 transition-all shadow-xl"
    >
      <div className="aspect-[0.78/1] relative">
        <img
          src={image}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        <div className="absolute bottom-4 left-0 right-0 px-4 text-center">
          <p className="text-white text-2xl sm:text-3xl font-black drop-shadow-lg">
            {name}
          </p>
          <p className="text-white/75 text-sm sm:text-base mt-1 drop-shadow-lg">
            {role}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-black/55 border border-white/10 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-white">
              {online}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

function FeatureItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-white/90">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function UploadIconFake({ className }: { className?: string }) {
  return <MessageSquare className={className} />;
}
