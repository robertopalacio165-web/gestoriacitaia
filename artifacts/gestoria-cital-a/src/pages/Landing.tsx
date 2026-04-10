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
  Play,
  FileText,
  Globe,
  MapPin,
  Users,
  Shield,
  Home,
  Briefcase,
  GraduationCap,
  Heart,
  Car,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabaseClient";

function getPlans(t: (k: string) => string) {
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

function getTramites(t: (k: string) => string) {
  return [
    { icon: FileText, label: t("tr_tie"), color: "text-blue-400" },
    { icon: Globe, label: t("tr_visado_nac"), color: "text-indigo-400" },
    { icon: Shield, label: t("tr_nie"), color: "text-green-400" },
    { icon: Home, label: t("tr_empadron"), color: "text-yellow-400" },
    { icon: Briefcase, label: t("tr_trabajo"), color: "text-orange-400" },
    { icon: Users, label: t("tr_familiar"), color: "text-pink-400" },
    { icon: GraduationCap, label: t("tr_estudiante"), color: "text-cyan-400" },
    { icon: Heart, label: t("tr_arraigo"), color: "text-red-400" },
    { icon: Car, label: t("tr_conducir"), color: "text-purple-400" },
    { icon: Building2, label: t("tr_larga"), color: "text-teal-400" },
    { icon: Globe, label: t("tr_regreso"), color: "text-blue-300" },
    { icon: MapPin, label: t("tr_ue"), color: "text-emerald-400" },
  ];
}

export default function Landing() {
  const [showPayment, setShowPayment] = useState(false);
  const { t } = useLang();

  const tr = (key: string, fallback: string) => {
    const value = t(key as never);
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
        alert(tr("google_login_error", "Error al iniciar sesión con Google"));
        console.error(error);
      }
    } catch (error) {
      console.error("goWithGoogleAuth error:", error);
      alert(tr("google_login_failed", "No se pudo iniciar sesión con Google"));
    }
  };

  const PLANS = getPlans(t);
  const TRAMITES = getTramites(t);

  const handlePlanClick = (plan: { id: string; free?: boolean }) => {
    if (plan.free) {
      goWithGoogleAuth("/buscar-citas");
    } else if (plan.id === "reg") {
      goWithGoogleAuth("/regularizacion-2026");
    } else if (plan.id === "cita") {
      goWithGoogleAuth("/buscar-citas");
    } else {
      setShowPayment(true);
    }
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
            {t("hero_badge" as never)}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight mb-4 max-w-3xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/80">
              {t("hero_title_1" as never)}{" "}
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-blue-400">
              {t("hero_title_2" as never)}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
            {t("hero_sub" as never)}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-5">
            <Button
              className="rounded-full px-7 py-3 shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90 text-base font-bold"
              onClick={() => goWithGoogleAuth("/regularizacion-2026")}
            >
              {t("hero_btn1" as never)} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              className="rounded-full px-7 py-3 shadow-lg shadow-blue-500/30 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold border-0"
              onClick={() => goWithGoogleAuth("/buscar-citas")}
            >
              {t("hero_btn_citas" as never)} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              variant="outline"
              className="rounded-full px-6 border-white/15 hover:bg-white/5"
              onClick={() => goWithGoogleAuth("/panel")}
            >
              {t("hero_btn2" as never)}
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
            <span>{t("hero_trust" as never)}</span>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AgentCard
            name="Mohamed"
            role={tr("agent_mo_role", "Especialista en Extranjería")}
            imagePath={`${import.meta.env.BASE_URL}images/avatar-mohamed.png`}
            delay={0.1}
          />
          <AgentCard
            name="Sara"
            role={tr("agent_sara_role", "Buscar Citas · 24/7")}
            imagePath={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            delay={0.2}
          />
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[t("feat1" as never), t("feat2" as never), t("feat3" as never), t("feat4" as never)].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-white/75 text-sm">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
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
          <div className="relative rounded-2xl overflow-hidden glass-panel aspect-video max-w-3xl mx-auto border border-white/10 group cursor-pointer shadow-2xl shadow-primary/10">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10" />
            <div className="absolute inset-0 bg-[hsl(222,47%,5%,0.5)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-bold text-xl text-white">
                  GestoriaCita<span className="text-primary">IA</span>
                </span>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-600 border-4 border-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl">
                <Play className="w-7 h-7 text-white ml-1 fill-white" />
              </div>
              <p className="font-medium text-sm text-white/80">
                {tr("landing_video_text", "Cómo funciona GestoriaCitaIA en 2 minutos")}
              </p>
            </div>
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
              {t("plans_title" as never)}
            </h2>
            <p className="text-sm text-muted-foreground">{t("plans_sub" as never)}</p>
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
                        {t("plan_popular" as never)}
                      </div>
                    </div>
                  )}

                  <div className="mb-5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      {t(nameKey as never)}
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
                  >
                    {plan.free ? t("plan_free_btn" as never) : t("plan_btn" as never)}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              {t("tramites_title" as never)}
            </h2>
            <p className="text-sm text-muted-foreground">{t("tramites_sub" as never)}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {TRAMITES.map((trm, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="glass-panel border border-white/[0.07] rounded-xl p-4 flex flex-col items-center gap-3 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <trm.icon className={`w-5 h-5 ${trm.color}`} />
                </div>
                <span className="text-xs font-medium text-white/80 leading-tight">
                  {trm.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <section className="relative z-10 border-t border-white/[0.06] py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
            {tr("secure_payment_methods", "Pago seguro · Métodos aceptados")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="h-9 px-3 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <svg
                height="20"
                viewBox="0 0 750 471"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="750" height="471" rx="40" fill="white" />
                <path d="M278.198 334.228L311.423 138.897H364.007L330.767 334.228H278.198Z" fill="#00579F" />
                <path d="M524.307 144.162C513.849 140.093 497.461 135.712 477.194 135.712C425.254 135.712 388.796 163.398 388.528 203.229C388.261 232.787 415.267 248.752 435.734 258.26C456.736 268.002 463.828 274.282 463.693 283.122C463.559 296.683 447.973 302.83 433.456 302.83C413.323 302.83 402.53 299.762 385.474 292.348L378.516 289.146L371.022 333.162C383.217 338.678 405.485 343.46 428.566 343.728C483.884 343.728 519.804 316.309 520.204 273.88C520.404 250.354 506.421 232.253 476.126 217.355C457.258 208.183 445.73 202.096 445.863 192.588C445.863 184.145 455.669 175.034 477.461 175.034C495.797 174.766 509.18 178.968 519.537 183.25L524.574 185.781L532.002 143.626L524.307 144.162Z" fill="#00579F" />
                <path d="M618.23 138.897H577.388C564.927 138.897 555.656 142.432 550.352 155.324L470.967 334.228H526.218L537.212 305.564H604.481C606.083 312.978 611.121 334.228 611.121 334.228H660L618.23 138.897ZM552.221 267.622C556.324 256.93 571.843 214.553 571.843 214.553C571.576 215.089 575.947 203.629 578.32 196.482L581.36 213.081C581.36 213.081 589.655 253.729 591.391 267.622H552.221Z" fill="#00579F" />
                <path d="M232.38 138.897L181.108 273.347L175.536 245.528C166.532 215.624 139.526 183.116 109.097 167.152L156.671 334.094H212.322L289.099 138.897H232.38Z" fill="#00579F" />
                <path d="M141.268 138.897H57.5352L56.8672 142.7C120.891 159.097 163.328 196.348 179.916 241.927L162.994 156.124C160.154 143.5 151.55 139.297 141.268 138.897Z" fill="#FAA61A" />
              </svg>
            </div>

            <div className="h-9 px-3 rounded-lg bg-white flex items-center justify-center gap-1 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-[#EB001B]" />
              <div className="w-6 h-6 rounded-full bg-[#F79E1B] -ml-3 opacity-90" />
            </div>

            <div className="h-9 px-4 rounded-lg bg-[#003087] flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">
                Pay<span className="text-[#009cde]">Pal</span>
              </span>
            </div>

            <div className="h-9 px-4 rounded-lg bg-[#635bff] flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">stripe</span>
            </div>

            <div className="h-9 px-4 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <span className="font-black text-sm" style={{ color: "#00CFFF" }}>
                bi<span style={{ color: "#282828" }}>zum</span>
              </span>
            </div>

            <div className="h-9 px-4 rounded-lg bg-black border border-white/20 flex items-center justify-center gap-1.5 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 814 1000" fill="white">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.8-155.5-108.5C46 679.5 0 563.1 0 531.3c0-128.9 41.5-205.6 99.6-268.4 51.1-55.9 135.5-93.1 219.2-93.1 84.1 0 148.8 39.5 200.6 39.5 50.1 0 126.4-42.8 224.5-42.8 32.5.1 103.1 6.8 162.2 74.4zm-178.6-73.4c-31.3-39.5-80.3-67.7-134.9-67.7-4.5 0-9 .6-13.5.6 2.6-9.7 7.1-19.4 13.5-28.5 31.3-42.2 83.2-73.4 135.5-73.4 4.5 0 9 .6 13.5.6-1.3 10.3-5.2 20-10.3 29.1-29.1 42.8-80.3 67.7-3.8 139.3z" />
              </svg>
              <span className="text-white text-xs font-bold">Pay</span>
            </div>

            <div className="h-9 px-4 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <span className="font-bold text-sm">
                <span style={{ color: "#4285F4" }}>G</span>
                <span style={{ color: "#EA4335" }}>o</span>
                <span style={{ color: "#FBBC05" }}>o</span>
                <span style={{ color: "#4285F4" }}>g</span>
                <span style={{ color: "#34A853" }}>l</span>
                <span style={{ color: "#EA4335" }}>e</span>{" "}
                <span className="text-gray-700">Pay</span>
              </span>
            </div>
          </div>

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

          <div className="flex gap-3 text-muted-foreground">
            <a
              href="#"
              className="w-7 h-7 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-600/30 cursor-pointer flex items-center justify-center text-white text-xs font-bold transition-colors"
            >
              f
            </a>
            <a
              href="#"
              className="w-7 h-7 rounded-lg bg-pink-600/20 hover:bg-pink-600 border border-pink-600/30 cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="#"
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.845L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="#"
              className="w-7 h-7 rounded-lg bg-green-600/20 hover:bg-green-600 border border-green-600/30 cursor-pointer flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>

          <div className="text-xs text-muted-foreground">© 2026 GestoriaCitaIA</div>
        </div>
      </footer>
    </div>
  );
}
