
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
      price: "9,99€",
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
      price: "19,99€",
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

  /* ============================================================
     🟡 CONTADOR REAL DE USUARIOS - SUPABASE
     ============================================================ */

  const [registeredUsers, setRegisteredUsers] = useState(0);

  useEffect(() => {
    let channel: any = null;
    let mounted = true;

    const loadRegisteredUsers = async () => {
      try {
        const { data, error } = await supabase.rpc(
          "get_registered_users_count"
        );

        if (!error && mounted) {
          setRegisteredUsers(Number(data) || 0);
          return;
        }

        /*
         * Fallback por si la función RPC todavía no existe.
         * No rompe la página.
         */
        const { count, error: countError } = await supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          });

        if (!countError && mounted) {
          setRegisteredUsers(count || 0);
        }

        if (error && countError) {
          console.error(
            "Error contando usuarios:",
            error,
            countError
          );
        }
      } catch (error) {
        console.error("Error contador usuarios:", error);
      }
    };

    loadRegisteredUsers();

    /* ============================================================
       🔴 SUPABASE REALTIME
       Detecta nuevos registros en profiles
       ============================================================ */

    channel = supabase
      .channel("live-registered-users")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        () => {
          if (mounted) {
            setRegisteredUsers((current) => current + 1);
          }
        }
      )
      .subscribe((status) => {
        console.log(
          "Realtime contador usuarios:",
          status
        );
      });

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  /* ============================================================
     🌍 IDIOMAS
     Darija / Español / English
     ============================================================ */

  const getLiveLanguage = () => {
    if (typeof document === "undefined") {
      return "es";
    }

    const htmlLang =
      document.documentElement.lang?.toLowerCase() || "";

    const storedLanguage =
      localStorage.getItem("language")?.toLowerCase() ||
      localStorage.getItem("lang")?.toLowerCase() ||
      "";

    const language =
      htmlLang || storedLanguage || navigator.language?.toLowerCase() || "es";

    if (
      language.startsWith("ar") ||
      language.startsWith("ma") ||
      language.startsWith("darija")
    ) {
      return "darija";
    }

    if (
      language.startsWith("en") ||
      language.startsWith("uk") ||
      language.startsWith("us")
    ) {
      return "en";
    }

    return "es";
  };

  const liveLanguage = getLiveLanguage();

  const liveTexts = {
    darija: {
      live: "مباشر",
      title: "شخص مسجل ف GestoriaCitaIA",
      realtime: "تحديث فالوقت الحقيقي",
    },

    es: {
      live: "EN DIRECTO",
      title: "Personas registradas en GestoriaCitaIA",
      realtime: "Actualización en tiempo real",
    },

    en: {
      live: "LIVE",
      title: "People registered on GestoriaCitaIA",
      realtime: "Real-time update",
    },
  };

  const liveText =
    liveTexts[liveLanguage as keyof typeof liveTexts] ||
    liveTexts.es;

  /* ============================================================ */

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
        alert(
          tr(
            "google_login_error",
            "Error al iniciar sesión con Google"
          )
        );
      }
    } catch (error) {
      console.error("goWithGoogleAuth error:", error);
      alert(
        tr(
          "google_login_failed",
          "No se pudo iniciar sesión con Google"
        )
      );
    }
  };

  const PLANS = getPlans(t);

  // ✅ Redirige directamente a la página de planes de Malta
  const handleMaltaPlanClick = () => {
    setLocation("/trabajo-malta");
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("hero_badge")}
          </div>

          {/* =====================================================
              🔥 TITULAR — USA EL IDIOMA REAL DEL CONTEXT
              ===================================================== */}

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
            {/* ✅ BOTÓN SARA */}
            <Button
              className="w-full sm:w-auto rounded-full px-7 py-3 shadow-lg shadow-blue-500/30 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold border-0 min-h-[52px]"
              onClick={() =>
                (window.location.href =
                  "/verificar-decreto-flussi")
              }
            >
              {t("hero_btn_sara")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {/* 🇲🇹 BOTÓN ESTUDIAR EN MALTA 2027 */}
            <Button
              className="w-full sm:w-auto rounded-full px-7 py-3 min-h-[52px]
              bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500
              hover:scale-[1.02] transition-all duration-300
              text-black font-bold shadow-xl shadow-orange-500/30 border-0"
              onClick={() =>
                (window.location.href =
                  "/estudiar-en-malta-2027")
              }
            >
              🇲🇹 {t("hero_btn_study_malta")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {/* ✅ BOTÓN TRABAJO EN MALTA */}
            <Button
              className="w-full sm:w-auto rounded-full px-8 py-4 min-h-[60px]
              bg-gradient-to-r from-green-500 via-emerald-500 to-green-600
              hover:scale-[1.05] hover:shadow-2xl hover:shadow-green-500/50
              transition-all duration-300
              text-white text-xl font-extrabold
              shadow-2xl shadow-green-500/40
              border-0
              tracking-wide"
              onClick={() =>
                (window.location.href = "/trabajo-malta")
              }
            >
              🇲🇹 {t("hero_btn_malta")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {["🇲🇦", "🇸🇳", "🇩🇿", "🇨🇴", "🇵🇰"].map(
                (flag, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px]"
                  >
                    {flag}
                  </span>
                )
              )}
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

          <AgentCard
            name="Sara"
            role="Especialista en Verificación de Contratos"
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
          {[t("feat1"), t("feat2"), t("feat3"), t("feat4")].map(
            (f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-white/75 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            )
          )}
        </motion.div>

        {/* =====================================================
            🖼️ FOTO GRANDE MALTA
           ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="relative rounded-2xl overflow-hidden glass-panel aspect-video max-w-3xl mx-auto border border-white/10 shadow-2xl shadow-primary/10">
            <img
              src="/video12-thumb.png"
              alt="GestoriaCitaIA"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* =====================================================
            🟡 CONTADOR DE USUARIOS
            COMPACTO / HORIZONTAL / RESPONSIVE
           ===================================================== */}

        {/* 🟡 CONTADOR DE USUARIOS — DISEÑO PREMIUM */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-10 w-full max-w-3xl mx-auto"
        >
          <div
            className="
              relative
              w-full
              min-h-[105px]
              sm:min-h-[115px]
              rounded-2xl
              border-2 border-yellow-400
              bg-[#101010]
              shadow-[0_0_30px_rgba(250,204,21,0.16)]
              overflow-hidden
            "
          >
            <div
              className="
                flex items-center
                justify-center
                w-full h-full
                px-4 sm:px-8
                py-4
                gap-4 sm:gap-7
              "
            >
              {/* 🟡 ESTADO EN DIRECTO */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="
                      w-2.5 h-2.5
                      rounded-full
                      bg-yellow-400
                      animate-pulse
                      shadow-[0_0_12px_rgba(250,204,21,1)]
                    "
                  />

                  <span
                    className="
                      text-yellow-400
                      text-[9px]
                      sm:text-[11px]
                      font-extrabold
                      uppercase
                    "
                  >
                    {t("live_registered_live")}
                  </span>
                </div>
              </div>

              {/* 👥 USUARIOS + NÚMERO */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* ICONO */}
                  <svg
                    viewBox="0 0 64 64"
                    className="
                      w-9 h-9
                      sm:w-11 sm:h-11
                      text-yellow-400
                      fill-yellow-400
                      drop-shadow-[0_0_8px_rgba(250,204,21,0.35)]
                    "
                  >
                    <circle cx="32" cy="20" r="9" />
                    <path d="M14 52c0-10 7-17 18-17s18 7 18 17H14z" />
                    <circle cx="13" cy="25" r="6" />
                    <path d="M3 48c1-8 5-13 12-13 4 0 7 1 9 4-7 2-11 6-12 13H3z" />
                    <circle cx="51" cy="25" r="6" />
                    <path d="M61 48c-1-8-5-13-12-13-4 0-7 1-9 4 7 2 11 6 12 13h9z" />
                  </svg>

                  {/* NÚMERO */}
                  <span
                    className="
                      text-yellow-400
                      text-4xl
                      sm:text-5xl
                      font-black
                      leading-none
                      tracking-tight
                      tabular-nums
                      drop-shadow-[0_0_10px_rgba(250,204,21,0.25)]
                    "
                  >
                    {registeredUsers.toLocaleString(
                      liveLanguage === "en" ? "en-US" : "es-ES"
                    )}
                  </span>
                </div>

                {/* TEXTO DE USUARIOS */}
                <span
                  className="
                    mt-2
                    text-white
                    text-[10px]
                    sm:text-xs
                    font-bold
                    text-center
                    whitespace-nowrap
                  "
                >
                  {t("live_registered_title")}
                </span>
              </div>

              {/* SEPARADOR */}
              <div
                className="
                  h-14
                  sm:h-16
                  w-px
                  bg-yellow-400/25
                  shrink-0
                "
              />

              {/* 📈 ACTUALIZACIÓN */}
              <div className="flex flex-col items-center justify-center text-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="
                    w-7 h-7
                    sm:w-8 sm:h-8
                    text-white/80
                    mb-1
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M4 19V5" />
                  <path d="M4 19h16" />
                  <path d="M7 15l4-4 3 2 5-6" />
                  <path d="M15 7h4v4" />
                </svg>

                <span
                  className="
                    text-yellow-400
                    text-[9px]
                    sm:text-[10px]
                    font-bold
                    leading-tight
                    max-w-[85px]
                  "
                >
                  {t("live_registered_realtime")}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* =====================================================
            PLANES
           ===================================================== */}

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

            <p className="text-sm text-muted-foreground">
              {t("plans_sub")}
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

                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.id === "weekly"
                        ? t("plan_malta_weekly_subtitle")
                        : t("plan_malta_monthly_subtitle")}
                    </p>
                  </div>

                  <ul className="flex-1 space-y-2.5 mb-6">
                    {plan.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-white/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* ✅ BOTÓN */}
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

        {/* =====================================================
            SERVICIOS SARA
           ===================================================== */}

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

            <p className="text-sm text-muted-foreground">
              {t("sara_services_sub")}
            </p>
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

      {/* =====================================================
          PAGOS
         ===================================================== */}

      <section className="relative z-10 border-t border-white/[0.06] py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
            {tr(
              "secure_payment_methods",
              "Pago seguro · Métodos aceptados"
            )}
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
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
              />

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

      {/* =====================================================
          FOOTER
         ===================================================== */}

      <footer className="relative z-10 border-t border-white/[0.07] bg-[hsl(222,47%,4%,0.8)] backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex gap-3">
            <Link
              href="/aviso-legal"
              className="hover:text-white transition-colors"
            >
              {tr("footer_legal", "Aviso legal")}
            </Link>

            <span>·</span>

            <Link
              href="/privacidad"
              className="hover:text-white transition-colors"
            >
              {tr("footer_privacy", "Privacidad")}
            </Link>

            <span>·</span>

            <Link
              href="/cookies"
              className="hover:text-white transition-colors"
            >
              {tr("footer_cookies", "Cookies")}
            </Link>

            <span>·</span>

            <Link
              href="/contacto"
              className="hover:text-white transition-colors"
            >
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
