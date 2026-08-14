import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  FileText,
  CheckCircle2,
  Bell,
  Download,
  Eye,
  Phone,
  LogOut,
  User,
  Clock,
  AlertCircle,
  Lock,
  RefreshCw,
  Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";

// ✅ CORREGIDO: Nombres de campos coinciden con la tabla de Supabase
type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  plan: string | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
  cv_generado_url: string | null;        // ✅ Cambiado
  cover_letter_url: string | null;       // ✅ Cambiado
  cv_generated: boolean;
  letter_generated: boolean;
  applications_sent: number;
  applications_total: number;
  applications_daily: number;
  responses: number;
  whatsapp: string | null;
  paid: boolean;
  created_at: string;
};

type TabKey = "inicio" | "documentos" | "cuenta";

// ============================================
// COMPONENTE DE ESTADO DEL PLAN (BADGE)
// ============================================
const PlanStatusBadge = ({ 
  status, 
  t 
}: { 
  status: "active" | "expired" | "none"; 
  t: (key: string) => string;
}) => {
  const configs = {
    active: {
      label: t("active"),
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: CheckCircle2,
    },
    expired: {
      label: t("expired"),
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: AlertCircle,
    },
    none: {
      label: t("no_plan"),
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: Clock,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export default function PanelMalta() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLang();

  // Cargar perfil del usuario
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setLocation("/");
          return;
        }

        // Obtener avatar de Google (no se guarda en la base de datos)
        const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        setAvatarUrl(userAvatar);

        const { data, error } = await supabase
          .from("malta_applications")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (error) {
          console.error("Error loading profile:", error);
          return;
        }

        setProfile(data as ProfileRow);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [setLocation]);

  // Cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/");
    toast({
      title: t("logout_success"),
      description: t("logout_desc"),
    });
  };

  // Calcular días restantes del plan
  const getDaysRemaining = () => {
    if (!profile?.plan_end_date) return 0;
    const end = new Date(profile.plan_end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Verificar estado del plan
  const getPlanStatus = (): "active" | "expired" | "none" => {
    if (!profile) return "none";
    if (!profile.plan_end_date) return "none";
    if (!profile.paid) return "expired";
    const end = new Date(profile.plan_end_date);
    const now = new Date();
    return end > now ? "active" : "expired";
  };

  const planStatus = getPlanStatus();
  const daysRemaining = getDaysRemaining();
  const planName = profile?.plan === "weekly" ? t("weekly") : t("monthly");
  const applicationsProgress = profile?.applications_total 
    ? Math.round((profile.applications_sent / profile.applications_total) * 100)
    : 0;

  // Tabs del menú - SOLO 3
  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "inicio", label: t("home"), icon: Home },
    { key: "documentos", label: t("documents"), icon: FileText },
    { key: "cuenta", label: t("my_account"), icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Obtener iniciales para el avatar (respaldo)
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Fondo decorativo */}
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(34,197,94,0.12), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.08), transparent)",
        }}
      />

      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-20 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        {/* ============================================ */}
        {/* HEADER - BIENVENIDA + PLAN */}
        {/* ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {t("welcome")} {profile?.full_name || t("user")}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                {planStatus === "none" ? (
                  <span className="text-sm font-bold text-yellow-400">{t("no_plan")}</span>
                ) : planStatus === "active" ? (
                  <>
                    <span className="text-sm font-bold text-primary">🇲🇹 {planName}</span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">·</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">{daysRemaining}</span>
                      <span className="text-muted-foreground">{t("days_left")}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-orange-400">{t("expired")}</span>
                )}
              </div>
            </div>
            <PlanStatusBadge status={planStatus} t={t} />
          </div>

          {(planStatus === "none" || planStatus === "expired") && (
            <button
              onClick={() => setLocation("/trabajo-malta")}
              className="mt-3 w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30"
            >
              <RefreshCw className="w-4 h-4" />
              {planStatus === "none" ? t("choose_plan") : t("renew_plan")}
            </button>
          )}
        </motion.div>

        {/* ============================================ */}
        {/* TABS - MENÚ NAVEGACIÓN (SOLO 3) - SOLO PC */}
        {/* ============================================ */}
        <div className="hidden md:flex border-b border-white/[0.06] mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* ============================================ */}
        {/* TAB: INICIO */}
        {/* ============================================ */}
        {activeTab === "inicio" && (
          <div className="space-y-6">
            {/* 📄 Mis documentos */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3">{t("my_documents")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* CV - CORREGIDO */}
                <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{t("cv")}</span>
                    <span className={`text-xs font-semibold ${profile?.cv_generado_url ? 'text-green-400' : 'text-yellow-400'}`}>
                      {profile?.cv_generado_url ? `✅ ${t("generated")}` : `⏳ ${t("generating")}`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {profile?.cv_generado_url ? (
                      <>
                        <button
                          onClick={() => window.open(profile.cv_generado_url || "", "_blank")}
                          className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> {t("view")}
                        </button>
                        <button
                          onClick={() => window.open(profile.cv_generado_url || "", "_blank")}
                          className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" /> {t("download")}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("generating")}</p>
                    )}
                  </div>
                </div>

                {/* Motivation Letter - CORREGIDO */}
                <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{t("motivation_letter")}</span>
                    <span className={`text-xs font-semibold ${profile?.cover_letter_url ? 'text-green-400' : 'text-yellow-400'}`}>
                      {profile?.cover_letter_url ? `✅ ${t("generated")}` : `⏳ ${t("generating")}`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {profile?.cover_letter_url ? (
                      <>
                        <button
                          onClick={() => window.open(profile.cover_letter_url || "", "_blank")}
                          className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> {t("view")}
                        </button>
                        <button
                          onClick={() => window.open(profile.cover_letter_url || "", "_blank")}
                          className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" /> {t("download")}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("generating")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 💼 Solicitudes */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3">{t("applications")}</h2>
              <div className={`bg-white/5 border rounded-xl p-4 ${
                planStatus === "expired" ? 'border-orange-500/30' : 
                planStatus === "none" ? 'border-yellow-500/30' : 
                'border-white/[0.06]'
              }`}>
                {(planStatus === "expired" || planStatus === "none") && (
                  <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${
                    planStatus === "expired" 
                      ? 'bg-orange-500/10 border border-orange-500/20' 
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}>
                    {planStatus === "expired" ? (
                      <Lock className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className={`text-xs font-semibold ${
                      planStatus === "expired" ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                      {planStatus === "expired" ? t("paused") : t("waiting_plan")}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">{t("companies_contacted")}</span>
                  <span className="text-sm font-bold text-white">
                    {profile?.applications_sent || 0} / {profile?.applications_total || 300}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      planStatus === "expired" ? 'bg-orange-400' : 
                      planStatus === "none" ? 'bg-yellow-400' : 
                      'bg-gradient-to-r from-primary to-green-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${applicationsProgress}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">{t("today")}</p>
                    <p className="text-sm font-bold text-white">
                      {planStatus === "expired" || planStatus === "none" ? '—' : (profile?.applications_daily || 0)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">{t("total")}</p>
                    <p className="text-sm font-bold text-white">{profile?.applications_sent || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">{t("remaining")}</p>
                    <p className={`text-sm font-bold ${
                      planStatus === "expired" ? 'text-orange-400' : 
                      planStatus === "none" ? 'text-yellow-400' : 
                      'text-yellow-400'
                    }`}>
                      {planStatus === "expired" || planStatus === "none"
                        ? '—'
                        : ((profile?.applications_total || 300) - (profile?.applications_sent || 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 📬 Respuestas - MEJORADO */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3">{t("responses")}</h2>
              <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">{t("companies_interested")}</p>
                    {profile?.responses && profile.responses > 0 ? (
                      <p className="text-2xl font-bold text-white">{profile.responses}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("no_responses_yet")}</p>
                    )}
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                    <Bell className="w-4 h-4 text-yellow-400" />
                    <p className="text-[10px] text-yellow-400 font-semibold">{t("we_notify")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {planStatus === "expired" || planStatus === "none"
                    ? t("notify_renew")
                    : t("notify_whatsapp")}
                </p>
              </div>
            </div>

            {/* 📱 WhatsApp */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3">{t("whatsapp")}</h2>
              <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white">{profile?.whatsapp || t("not_configured")}</p>
                      <p className="text-xs text-green-400">{t("verified")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocation("/trabajo-malta")}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                  >
                    {t("update_whatsapp")}
                  </button>
                </div>
              </div>
            </div>

            {/* ⏰ Próximo envío */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3">{t("next_send")}</h2>
              <div className={`bg-white/5 border rounded-xl p-4 ${
                planStatus === "expired" ? 'border-orange-500/30' : 
                planStatus === "none" ? 'border-yellow-500/30' : 
                'border-white/[0.06]'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">{t("next_auto_send")}</p>
                    {planStatus === "active" ? (
                      <p className="text-lg font-bold text-white">{t("today_20h")}</p>
                    ) : planStatus === "expired" ? (
                      <p className="text-lg font-bold text-orange-400">{t("paused")}</p>
                    ) : (
                      <p className="text-lg font-bold text-yellow-400">{t("waiting")}</p>
                    )}
                  </div>
                  <Clock className={`w-6 h-6 ${
                    planStatus === "expired" ? 'text-orange-400' : 
                    planStatus === "none" ? 'text-yellow-400' : 
                    'text-yellow-400'
                  }`} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {planStatus === "active" 
                    ? t("daily_sends")
                    : planStatus === "expired"
                    ? t("paused_message")
                    : t("no_plan_message")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: DOCUMENTOS - CORREGIDO */}
        {/* ============================================ */}
        {activeTab === "documentos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{t("my_documents")}</h2>
              {planStatus === "expired" && (
                <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {t("expired_plan")}
                </span>
              )}
            </div>
            
            {/* CV - CORREGIDO */}
            <div className={`bg-white/5 border rounded-xl p-4 ${planStatus === "expired" ? 'border-orange-500/20' : 'border-white/[0.06]'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t("cv")}</p>
                    <p className={`text-xs ${profile?.cv_generado_url ? 'text-green-400' : 'text-yellow-400'}`}>
                      {profile?.cv_generado_url ? `✅ ${t("generated")}` : `⏳ ${t("generating")}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {profile?.cv_generado_url ? (
                    <>
                      <button
                        onClick={() => window.open(profile.cv_generado_url || "", "_blank")}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> {t("view")}
                      </button>
                      <button
                        onClick={() => window.open(profile.cv_generado_url || "", "_blank")}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> {t("download")}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("generating")}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Motivation Letter - CORREGIDO */}
            <div className={`bg-white/5 border rounded-xl p-4 ${planStatus === "expired" ? 'border-orange-500/20' : 'border-white/[0.06]'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t("motivation_letter")}</p>
                    <p className={`text-xs ${profile?.cover_letter_url ? 'text-green-400' : 'text-yellow-400'}`}>
                      {profile?.cover_letter_url ? `✅ ${t("generated")}` : `⏳ ${t("generating")}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {profile?.cover_letter_url ? (
                    <>
                      <button
                        onClick={() => window.open(profile.cover_letter_url || "", "_blank")}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> {t("view")}
                      </button>
                      <button
                        onClick={() => window.open(profile.cover_letter_url || "", "_blank")}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> {t("download")}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("generating")}</p>
                  )}
                </div>
              </div>
            </div>

            {(planStatus === "expired" || planStatus === "none") && (
              <div className={`p-4 rounded-xl text-center ${
                planStatus === "expired" 
                  ? 'bg-orange-500/10 border border-orange-500/30' 
                  : 'bg-yellow-500/10 border border-yellow-500/30'
              }`}>
                <p className={`font-semibold ${
                  planStatus === "expired" ? 'text-orange-400' : 'text-yellow-400'
                }`}>
                  {planStatus === "expired" ? t("docs_available_renew") : t("docs_waiting_plan")}
                </p>
                <button
                  onClick={() => setLocation("/trabajo-malta")}
                  className="mt-3 px-6 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors"
                >
                  {planStatus === "expired" ? t("renew_plan") : t("choose_plan")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: CUENTA */}
        {/* ============================================ */}
        {activeTab === "cuenta" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">{t("my_account")}</h2>

            {/* Perfil con foto/avatar - PRIORIDAD A GOOGLE AVATAR */}
            <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.full_name || "User"}
                  className="w-14 h-14 rounded-full border-2 border-primary/30 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
                  {getInitials(profile?.full_name)}
                </div>
              )}
              <div>
                <p className="text-base font-bold text-white">{profile?.full_name || t("user")}</p>
                <p className="text-sm text-muted-foreground">{profile?.email || "—"}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("whatsapp")}</p>
                <p className="text-sm font-semibold text-white">{profile?.whatsapp || t("not_configured")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("plan")}</p>
                <p className={`text-sm font-semibold ${
                  planStatus === "expired" ? 'text-orange-400' : 
                  planStatus === "none" ? 'text-yellow-400' : 
                  'text-primary'
                }`}>
                  {planStatus === "active" ? `🇲🇹 ${planName}` : 
                   planStatus === "expired" ? t("expired") : 
                   t("no_plan")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("status")}</p>
                <p className={`text-sm font-semibold ${
                  planStatus === "active" ? 'text-green-400' : 
                  planStatus === "expired" ? 'text-orange-400' : 
                  'text-yellow-400'
                }`}>
                  {planStatus === "active" ? `✅ ${t("active")}` : 
                   planStatus === "expired" ? `⏸ ${t("inactive_renew")}` : 
                   `⏳ ${t("waiting_for_plan")}`}
                </p>
              </div>
            </div>

            {(planStatus === "expired" || planStatus === "none") && (
              <button
                onClick={() => setLocation("/trabajo-malta")}
                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30"
              >
                <RefreshCw className="w-4 h-4" />
                {planStatus === "expired" ? t("renew_plan") : t("choose_plan")}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {t("logout")}
            </button>
          </div>
        )}
      </main>

      <LegalDisclaimer />

      {/* ============================================ */}
      {/* MENÚ MÓVIL - SOLO 3 BOTONES - SOLO EN MÓVIL */}
      {/* ============================================ */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/[0.07] md:hidden">
        <div className="flex justify-around items-center h-14 px-2 max-w-2xl mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
