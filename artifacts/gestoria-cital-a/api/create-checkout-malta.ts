import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/ui/button";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { useLang } from "@/contexts/LanguageContext";
import {
  CheckCircle2,
  FileText,
  Shield,
  Bell,
  ArrowRight,
  Briefcase,
  FileSearch,
  UserCheck,
  Globe,
  Clock,
  Award,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

type PlanItem = {
  id: string;
  price: string;
  period: string;
  color: string;
  border: string;
  btnClass: string;
  badge: string | null;
  free: boolean;
  shadow: boolean;
  features: string[];
};

function getPlans(t: (k: string) => string): PlanItem[] {
  return [
    {
      id: "weekly",
      price: "14,99€",
      period: "7 días",
      color: "from-blue-900/40 to-blue-950/20",
      border: "border-blue-400/35",
      btnClass:
        "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30",
      badge: null,
      free: false,
      shadow: true,
      features: [
        t("plan_malta_weekly_f1"),
        t("plan_malta_weekly_f2"),
        t("plan_malta_weekly_f3"),
        t("plan_malta_weekly_f4"),
      ],
    },
    {
      id: "monthly",
      price: "24,99€",
      period: "30 días",
      color: "from-yellow-900/30 to-yellow-950/20",
      border: "border-yellow-400/40",
      btnClass:
        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
      badge: "MÁS POPULAR",
      free: false,
      shadow: true,
      features: [
        t("plan_malta_monthly_f1"),
        t("plan_malta_monthly_f2"),
        t("plan_malta_monthly_f3"),
        t("plan_malta_monthly_f4"),
        t("plan_malta_monthly_f5"),
      ],
    },
  ];
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { t } = useLang();

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const goWithGoogleAuth = async (targetPath: string) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth.getUser error:", userError);
      }

      if (user) {
        window.location.href = targetPath;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${targetPath}`,
        },
      });

      if (error) {
        console.error("Google login error:", error);
        alert(tr("google_login_error", "Error al iniciar sesión con Google"));
      }
    } catch (error) {
      console.error("goWithGoogleAuth error:", error);
      alert(tr("google_login_failed", "No se pudo iniciar sesión con Google"));
    }
  };

  const PLANS = getPlans(t);

  const handleMaltaPlanClick = () => {
    setLocation("/trabajo-malta");
  };

  const handleFlussiClick = () => {
    window.location.href = "/verificar-decreto-flussi";
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <Navbar />

      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* ✅ BADGE ACTUALIZADO - SIN IA */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            🇪🇺 Verificación profesional de documentos
          </div>

          {/* ✅ TÍTULO ACTUALIZADO */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight mb-4 max-w-3xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/80">
              Verifica contratos, documentos y oportunidades
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-blue-400">
              de trabajo en Europa
            </span>
          </h1>

          {/* ✅ SUBTÍTULO ACTUALIZADO - SIN IA */}
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
            Verificamos contratos, documentos y oportunidades de trabajo en España, Italia y Malta.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch gap-3 mb-5 max-w-3xl mx-auto">
            {/* ✅ BOTÓN VERIFICAR CONTRATO Y DECRETO FLUSSI - TEXTO ACTUALIZADO */}
            <Button
              className="w-full sm:w-auto rounded-full px-8 py-4 min-h-[56px]
              bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600
              hover:scale-[1.04] hover:shadow-2xl hover:shadow-blue-500/50
              transition-all duration-300
              text-white text-base font-extrabold
              shadow-2xl shadow-blue-500/40
              border-0
              tracking-wide"
              onClick={handleFlussiClick}
            >
              🇮🇹 Verificar Contrato y Decreto Flussi
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {/* ✅ BOTÓN KHALID - NARANJA */}
            <Button
              className="w-full sm:w-auto rounded-full px-7 py-3 min-h-[52px]
              bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500
              hover:scale-[1.02] transition-all duration-300
              text-black font-bold shadow-xl shadow-orange-500/30 border-0"
              onClick={() => goWithGoogleAuth("/khalid-extranjeria")}
            >
              🟨 Consulta con Khalid
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {/* ✅ BOTÓN TRABAJO EN MALTA - VERDE */}
            <Button
              className="w-full sm:w-auto rounded-full px-8 py-4 min-h-[56px]
              bg-gradient-to-r from-green-500 via-emerald-500 to-green-600
              hover:scale-[1.04] hover:shadow-2xl hover:shadow-green-500/50
              transition-all duration-300
              text-white text-base font-extrabold
              shadow-2xl shadow-green-500/40
              border-0
              tracking-wide"
              onClick={handleMaltaPlanClick}
            >
              🇲🇹 Mi Trabajo en Malta
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {["🇮🇹", "🇲🇹", "🇪🇸", "🇲🇦", "🇸🇳"].map((flag, i) => (
                <span
                  key={i}
                  className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px]"
                >
                  {flag}
                </span>
              ))}
            </div>
            <span>Más de 5.000 usuarios confían en nosotros</span>
          </div>
        </motion.div>

        {/* ✅ NUEVA SECCIÓN DE SERVICIOS DESTACADOS - TEXTO ACTUALIZADO */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={handleFlussiClick}>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <FileSearch className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">🇮🇹 Decreto Flussi</h3>
            {/* ✅ TEXTO ACTUALIZADO - SIN IA */}
            <p className="text-white/60 text-xs">Analizamos contratos, resguardos y documentos del Decreto Flussi</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-green-500/20 bg-green-500/5 text-center hover:border-green-400 transition-colors cursor-pointer" onClick={handleMaltaPlanClick}>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">🇲🇹 Trabajo en Malta</h3>
            <p className="text-white/60 text-xs">Planes de suscripción para encontrar trabajo en Malta</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-orange-500/20 bg-orange-500/5 text-center hover:border-orange-400 transition-colors cursor-pointer" onClick={() => goWithGoogleAuth("/khalid-extranjeria")}>
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">🇪🇸 Regularización</h3>
            <p className="text-white/60 text-xs">Asesoría con Khalid para extranjería en España</p>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AgentCard
            name="Soufiane"
            role="Experto en Regularización"
            imagePath={`${import.meta.env.BASE_URL}images/soufiane.png`}
            delay={0.1}
          />

          <AgentCard
            name="Sara"
            // ✅ ROL ACTUALIZADO - SIN IA
            role="Especialista en Verificación Documental"
            imagePath={`${import.meta.env.BASE_URL}images/sara.png`}
            delay={0.2}
          />
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[
            "✅ Verificación profesional de documentos",
            "✅ Análisis detallado de contratos",
            "✅ Resultados en menos de 24 horas",
            "✅ Soporte en español, inglés y árabe",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-white/75 text-sm">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>{f}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="relative rounded-2xl overflow-hidden glass-panel aspect-video max-w-3xl mx-auto border border-white/10 shadow-2xl shadow-primary/10">
            <video
              controls
              playsInline
              poster="/video12-thumb.png"
              className="w-full h-full object-cover"
            >
              <source src="/Video12.mp4" type="video/mp4" />
            </video>
          </div>
        </motion.div>

        {/* SECCIÓN DE PLANES DE MALTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              🇲🇹 Planes para Trabajar en Malta
            </h2>
            <p className="text-sm text-muted-foreground">
              Elige el plan que mejor se adapte a tus necesidades
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto items-stretch">
            {PLANS.map((plan) => {
              const nameKey =
                plan.id === "weekly"
                  ? "plan_malta_weekly_title"
                  : "plan_malta_monthly_title";

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border ${plan.border} bg-gradient-to-b ${plan.color} backdrop-blur-sm p-5 flex flex-col`}
                  style={{
                    boxShadow: plan.shadow
                      ? "0 0 50px -10px hsl(142,71%,45%,0.30)"
                      : undefined,
                  }}
                >
                  {plan.badge && (
                    <div className="absolute top-0 right-0 overflow-hidden w-20 h-20">
                      <div className="absolute top-3 right-[-20px] w-24 text-center bg-primary text-white text-[10px] font-bold py-1 rotate-45 shadow-sm">
                        MÁS POPULAR
                      </div>
                    </div>
                  )}

                  <div className="mb-5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      {t(nameKey)}
                    </p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-display font-black text-white">
                        {plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground mb-1">
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.id === "weekly" 
                        ? t("plan_malta_weekly_subtitle")
                        : t("plan_malta_monthly_subtitle")}
                    </p>
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
                    onClick={handleMaltaPlanClick}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${plan.btnClass}`}
                    type="button"
                  >
                    {plan.id === "weekly" 
                      ? t("plan_malta_weekly_button")
                      : t("plan_malta_monthly_button")}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* SECCIÓN DE SERVICIOS SARA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              🇪🇺 Servicios de Verificación
            </h2>
            <p className="text-sm text-muted-foreground">
              Análisis profesional para tus documentos europeos
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-blue-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-blue-500/5 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={handleFlussiClick}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                🇮🇹 Decreto Flussi
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-green-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-green-500/5 hover:border-green-400 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                ✅ Verificación de contratos
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-purple-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-purple-500/5 hover:border-purple-400 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                🛡️ Verificación de empresa
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-yellow-500/5 hover:border-yellow-400 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                ⏱️ Resultados en 24h
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* SECCIÓN DE PAÍSES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-white">
              🌍 Países donde operamos
            </h3>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { flag: "🇮🇹", name: "Italia", color: "blue", onClick: handleFlussiClick },
              { flag: "🇲🇹", name: "Malta", color: "green", onClick: handleMaltaPlanClick },
              { flag: "🇪🇸", name: "España", color: "orange", onClick: () => goWithGoogleAuth("/khalid-extranjeria") },
            ].map((country, i) => (
              <div
                key={i}
                className={`glass-panel rounded-xl px-5 py-3 border border-${country.color}-500/20 bg-${country.color}-500/5 hover:border-${country.color}-400 transition-colors cursor-pointer`}
                onClick={country.onClick}
              >
                <span className="text-white font-medium">
                  {country.flag} {country.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      <section className="relative z-10 border-t border-white/[0.06] py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
            Pago seguro · Métodos aceptados
          </p>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Pagos procesados con cifrado SSL 256-bit · PCI DSS Compliant
          </div>
        </div>
      </section>

      <LegalDisclaimer />

      <footer className="relative z-10 border-t border-white/[0.07] bg-[hsl(222,47%,4%,0.8)] backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex gap-3 flex-wrap justify-center">
            <Link href="/aviso-legal" className="hover:text-white transition-colors">
              Aviso legal
            </Link>
            <span>·</span>
            <Link href="/privacidad" className="hover:text-white transition-colors">
              Privacidad
            </Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-white transition-colors">
              Cookies
            </Link>
            <span>·</span>
            <Link href="/contacto" className="hover:text-white transition-colors">
              Contacto
            </Link>
          </div>

          <div className="text-xs text-muted-foreground flex flex-col items-end gap-1">
            <div>© 2026 GestoriaCitaIA</div>
            <div>
              Contacto:{" "}
              <a
                href="mailto:jobs@gestoriacitaia.com"
                className="hover:text-white transition-colors"
              >
                jobs@gestoriacitaia.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
