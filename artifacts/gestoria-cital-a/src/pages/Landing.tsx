import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/ui/button";
import { PaymentModal } from "@/components/PaymentModal";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { useLang } from "@/contexts/LanguageContext";
import {
  CheckCircle2,
  FileText,
  Shield,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
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
      id: "free",
      price: "0€",
      period: "",
      color: "from-white/5 to-white/[0.02]",
      border: "border-white/10",
      btnClass:
        "bg-white/8 hover:bg-white/15 text-white border border-white/15",
      badge: null,
      free: true,
      shadow: false,
      features: [
        t("plan_free_f1"),
        t("plan_free_f2"),
        t("plan_free_f3"),
        t("plan_free_f4"),
      ],
    },
    {
      id: "cita",
      price: "9.99€",
      period: "/mes",
      color: "from-green-900/30 to-green-950/10",
      border: "border-green-600/20",
      btnClass:
        "bg-white/8 hover:bg-white/15 text-white border border-white/15",
      badge: null,
      free: false,
      shadow: false,
      features: [
        t("plan_cita_f1"),
        t("plan_cita_f2"),
        t("plan_cita_f3"),
        t("plan_cita_f4"),
        t("plan_cita_f5"),
        t("plan_cita_f6"),
      ],
    },
    {
      id: "reg",
      price: "9.99€",
      period: "/mes",
      color: "from-orange-900/25 to-orange-950/10",
      border: "border-orange-500/25",
      btnClass:
        "bg-white/8 hover:bg-white/15 text-white border border-white/15",
      badge: null,
      free: false,
      shadow: false,
      features: [
        t("plan_reg_f1"),
        t("plan_reg_f2"),
        t("plan_reg_f3"),
        t("plan_reg_f4"),
        t("plan_reg_f5"),
      ],
    },
    {
      id: "std",
      price: "19.99€",
      period: "/mes",
      color: "from-blue-900/40 to-blue-950/20",
      border: "border-blue-400/35",
      btnClass:
        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
      badge: "POPULAR",
      free: false,
      shadow: true,
      features: [
        t("plan_std_f1"),
        t("plan_std_f2"),
        t("plan_std_f3"),
        t("plan_std_f4"),
        t("plan_std_f5"),
        t("plan_std_f6"),
        t("plan_std_f7"),
      ],
    },
  ];
}

export default function Landing() {
  const [showPayment, setShowPayment] = useState(false);
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

  const handlePlanClick = (plan: PlanItem) => {
    if (plan.free) {
      goWithGoogleAuth("/buscar-citas");
      return;
    }

    if (plan.id === "reg") {
      goWithGoogleAuth("/regularizacion-2026");
      return;
    }

    if (plan.id === "cita") {
      goWithGoogleAuth("/buscar-citas");
      return;
    }

    setShowPayment(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={() => {
          setShowPayment(false);
          goWithGoogleAuth("/panel");
        }}
      />

      <Navbar />

      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("hero_badge")}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight mb-4 max-w-3xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/80">
              {t("hero_title_1")}{" "}
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-blue-400">
              {t("hero_title_2")}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
            {t("hero_sub")}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch gap-3 mb-5 max-w-2xl mx-auto">
            <Button
              className="w-full sm:w-auto rounded-full px-7 py-3 shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90 text-base font-bold min-h-[52px]"
              onClick={() => goWithGoogleAuth("/regularizacion-2026")}
            >
              {t("hero_btn1")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {/* ✅ BOTÓN SARA - USA t("hero_btn_sara") */}
            <Button
              className="w-full sm:w-auto rounded-full px-7 py-3 shadow-lg shadow-blue-500/30 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold border-0 min-h-[52px]"
              onClick={() => goWithGoogleAuth("/buscar-citas")}
            >
              {t("hero_btn_sara")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              className="w-full sm:w-auto rounded-full px-7 py-3 min-h-[52px]
              bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500
              hover:scale-[1.02] transition-all duration-300
              text-black font-bold shadow-xl shadow-orange-500/30 border-0"
              onClick={() => goWithGoogleAuth("/khalid-extranjeria")}
            >
              {t("hero_btn_khalid")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {["🇲🇦", "🇸🇳", "🇩🇿", "🇨🇴", "🇵🇰"].map((flag, i) => (
                <span
                  key={i}
                  className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px]"
                >
                  {flag}
                </span>
              ))}
            </div>
            <span>{t("hero_trust")}</span>
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

          {/* ✅ AGENT CARD SARA - USA t("agent_sara_role") */}
          <AgentCard
            name="Sara"
            role={t("agent_sara_role")}
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
          {[t("feat1"), t("feat2"), t("feat3"), t("feat4")].map((f, i) => (
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

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              {t("plans_title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("plans_sub")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto items-stretch">
            {PLANS.map((plan) => {
              const nameKey =
                plan.id === "free"
                  ? "plan_free_name"
                  : plan.id === "cita"
                  ? "plan_cita_name"
                  : plan.id === "reg"
                  ? "plan_reg_name"
                  : "plan_std_name";

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
                        {t("plan_popular")}
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
                    onClick={() => handlePlanClick(plan)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${plan.btnClass}`}
                    type="button"
                  >
                    {plan.free ? t("plan_free_btn") : t("plan_btn")}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ✅ SECCIÓN DE SERVICIOS SARA - NUEVA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              {t("sara_services_title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("sara_services_sub")}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-yellow-500/5"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                {t("sara_service_1")}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-green-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-green-500/5"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                {t("sara_service_2")}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-blue-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-blue-500/5"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                {t("sara_service_3")}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-purple-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center bg-purple-500/5"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-white/80 leading-tight">
                {t("sara_service_4")}
              </span>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <section className="relative z-10 border-t border-white/[0.06] py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
            {tr("secure_payment_methods", "Pago seguro · Métodos aceptados")}
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
            {tr(
              "ssl_payment_text",
              "Pagos procesados con cifrado SSL 256-bit · PCI DSS Compliant"
            )}
          </div>
        </div>
      </section>

      <LegalDisclaimer />

      <footer className="relative z-10 border-t border-white/[0.07] bg-[hsl(222,47%,4%,0.8)] backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex gap-3">
            <Link href="/aviso-legal" className="hover:text-white transition-colors">
              {tr("footer_legal", "Aviso legal")}
            </Link>
            <span>·</span>
            <Link href="/privacidad" className="hover:text-white transition-colors">
              {tr("footer_privacy", "Privacidad")}
            </Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-white transition-colors">
              {tr("footer_cookies", "Cookies")}
            </Link>
          </div>

          <div className="text-xs text-muted-foreground">© 2026 GestoriaCitaIA</div>
        </div>
      </footer>
    </div>
  );
}
