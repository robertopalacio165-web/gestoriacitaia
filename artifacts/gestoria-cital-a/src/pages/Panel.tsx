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
  Calendar,
  TrendingUp,
  Phone,
  LogOut,
  User,
  Clock,
  Briefcase,
  Award,
  AlertCircle,
  Lock,
  RefreshCw,
  Mail,
  XCircle,
  Hourglass,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  plan: string | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
  cv_url: string | null;
  letter_url: string | null;
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

type TabKey = "dashboard" | "documentos" | "progreso" | "cuenta";

// ============================================
// COMPONENTE DE ESTADO DEL PLAN
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
      label: t("panel_status_active"),
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: CheckCircle2,
    },
    expired: {
      label: t("panel_status_expired"),
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: AlertCircle,
    },
    none: {
      label: t("panel_status_no_plan"),
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: Hourglass,
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

// ============================================
// COMPONENTE DE TARJETA DE ESTADÍSTICA
// ============================================
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  sub, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  sub?: string; 
  color: string;
}) => (
  <div className="glass-panel border border-white/[0.07] rounded-xl p-4 text-center">
    <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-bold text-white">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
  </div>
);

export default function PanelMalta() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, lang } = useLang();

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
      title: t("panel_logout_success"),
      description: t("panel_logout_desc"),
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
  const planName = profile?.plan === "weekly" ? t("panel_plan_weekly") : t("panel_plan_monthly");
  const applicationsProgress = profile?.applications_total 
    ? Math.round((profile.applications_sent / profile.applications_total) * 100)
    : 0;

  // Tabs del menú
  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "dashboard", label: t("panel_tab_dashboard"), icon: TrendingUp },
    { key: "documentos", label: t("panel_tab_documents"), icon: FileText },
    { key: "progreso", label: t("panel_tab_progress"), icon: Calendar },
    { key: "cuenta", label: t("panel_tab_account"), icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{t("panel_loading")}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // SIEMPRE MOSTRAMOS EL PANEL
  // ============================================
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(34,197,94,0.12), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.08), transparent)",
        }}
      />

      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* ============================================ */}
        {/* TARJETA SUPERIOR - BIENVENIDA + PLAN */}
        {/* ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-panel border rounded-2xl p-6 mb-6 ${
            planStatus === "expired" 
              ? "border-orange-500/40 bg-orange-500/5" 
              : planStatus === "none"
              ? "border-yellow-500/40 bg-yellow-500/5"
              : "border-white/[0.07]"
          }`}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {t("panel_welcome")} {profile?.full_name || t("panel_user")}
              </h1>
              
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{t("panel_plan")}:</span>
                
                {planStatus === "none" ? (
                  <span className="text-sm font-bold text-yellow-400">{t("panel_no_plan")}</span>
                ) : planStatus === "active" ? (
                  <>
                    <span className="text-sm font-bold text-primary">🇲🇹 {planName}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-sm text-muted-foreground">{t("panel_days_left")}:</span>
                    <span className="text-sm font-bold text-yellow-400">{daysRemaining}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-orange-400">{t("panel_expired")}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PlanStatusBadge status={planStatus} t={t} />
              
              {(planStatus === "none" || planStatus === "expired") && (
                <button
                  onClick={() => setLocation("/trabajo-malta")}
                  className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-yellow-500/30"
                >
                  <RefreshCw className="w-4 h-4" />
                  {planStatus === "none" ? t("panel_choose_plan") : t("panel_renew_plan")}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* DASHBOARD - TARJETAS RÁPIDAS */}
        {/* ============================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={FileText}
            label={t("panel_cv")}
            value={profile?.cv_generated ? "✅" : "⏳"}
            sub={profile?.cv_generated ? t("panel_generated") : t("panel_pending")}
            color="text-blue-400"
          />
          <StatCard
            icon={FileText}
            label={t("panel_letter")}
            value={profile?.letter_generated ? "✅" : "⏳"}
            sub={profile?.letter_generated ? t("panel_generated") : t("panel_pending")}
            color="text-purple-400"
          />
          <StatCard
            icon={Briefcase}
            label={t("panel_applications")}
            value={profile?.applications_sent || 0}
            color="text-emerald-400"
          />
          <StatCard
            icon={Award}
            label={t("panel_plan_status")}
            value={
              planStatus === "active" 
                ? `${daysRemaining}${t("panel_days")}` 
                : planStatus === "expired" 
                ? t("panel_expired_short")
                : t("panel_none_short")
            }
            sub={
              planStatus === "active" 
                ? t("panel_active")
                : planStatus === "expired" 
                ? t("panel_inactive")
                : t("panel_no_plan_short")
            }
            color={planStatus === "active" ? "text-green-400" : planStatus === "expired" ? "text-orange-400" : "text-yellow-400"}
          />
        </div>

        {/* ============================================ */}
        {/* TABS - MENÚ NAVEGACIÓN */}
        {/* ============================================ */}
        <div className="glass-panel border border-white/[0.07] rounded-2xl overflow-hidden mb-6">
          <div className="flex border-b border-white/[0.06] overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold transition-colors whitespace-nowrap px-4 ${
                  activeTab === tab.key
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ============================================ */}
          {/* TAB: DASHBOARD */}
          {/* ============================================ */}
          {activeTab === "dashboard" && (
            <div className="p-6 space-y-6">
              {/* 📄 Mis documentos */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">{t("panel_my_documents")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CV */}
                  <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{t("panel_cv")}</span>
                      <span className={`text-xs font-semibold ${profile?.cv_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                        {profile?.cv_generated ? `✅ ${t("panel_generated")}` : `⏳ ${t("panel_generating")}`}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {profile?.cv_url ? (
                        <>
                          <button
                            onClick={() => window.open(profile.cv_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> {t("panel_view")}
                          </button>
                          <button
                            onClick={() => window.open(profile.cv_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Download className="w-3 h-3" /> {t("panel_download")}
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("panel_generating_doc")}</p>
                      )}
                    </div>
                  </div>

                  {/* Carta de motivación */}
                  <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{t("panel_letter")}</span>
                      <span className={`text-xs font-semibold ${profile?.letter_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                        {profile?.letter_generated ? `✅ ${t("panel_generated")}` : `⏳ ${t("panel_generating")}`}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {profile?.letter_url ? (
                        <>
                          <button
                            onClick={() => window.open(profile.letter_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> {t("panel_view")}
                          </button>
                          <button
                            onClick={() => window.open(profile.letter_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Download className="w-3 h-3" /> {t("panel_download")}
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("panel_generating_doc")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 📊 Solicitudes */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">{t("panel_applications_title")}</h2>
                <div className={`glass-panel border rounded-xl p-4 ${planStatus === "expired" ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/[0.07]'}`}>
                  {planStatus === "expired" && (
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Lock className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-orange-400 font-semibold">{t("panel_paused")}</span>
                    </div>
                  )}
                  {planStatus === "none" && (
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Hourglass className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-semibold">{t("panel_waiting_plan")}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">{t("panel_companies_contacted")}</span>
                    <span className="text-sm font-bold text-white">
                      {profile?.applications_sent || 0} / {profile?.applications_total || 300}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
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
                      <p className="text-xs text-muted-foreground">{t("panel_today")}</p>
                      <p className="text-sm font-bold text-white">
                        {planStatus === "expired" || planStatus === "none" ? '—' : (profile?.applications_daily || 0)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">{t("panel_total")}</p>
                      <p className="text-sm font-bold text-white">{profile?.applications_sent || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">{t("panel_remaining")}</p>
                      <p className={`text-sm font-bold ${planStatus === "expired" ? 'text-orange-400' : planStatus === "none" ? 'text-yellow-400' : 'text-yellow-400'}`}>
                        {planStatus === "expired" || planStatus === "none" 
                          ? '—' 
                          : ((profile?.applications_total || 300) - (profile?.applications_sent || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📬 Respuestas */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">{t("panel_responses")}</h2>
                <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">{t("panel_companies_interested")}</p>
                      <p className="text-2xl font-bold text-white">{profile?.responses || 0}</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                      <Bell className="w-4 h-4 text-yellow-400" />
                      <p className="text-[10px] text-yellow-400 font-semibold">{t("panel_we_notify")}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {planStatus === "expired" || planStatus === "none"
                      ? t("panel_notify_renew")
                      : t("panel_notify_whatsapp")}
                  </p>
                </div>
              </div>

              {/* 📱 WhatsApp */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">{t("panel_whatsapp")}</h2>
                <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white">{profile?.whatsapp || t("panel_not_configured")}</p>
                        <p className="text-xs text-green-400">{t("panel_verified")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLocation("/trabajo-malta")}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    >
                      {t("panel_change_number")}
                    </button>
                  </div>
                </div>
              </div>

              {/* ⏰ Próximo envío */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">{t("panel_next_send")}</h2>
                <div className={`glass-panel border rounded-xl p-4 ${
                  planStatus === "expired" ? 'border-orange-500/30 bg-orange-500/5' : 
                  planStatus === "none" ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-white/[0.07]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">{t("panel_next_auto_send")}</p>
                      {planStatus === "active" ? (
                        <p className="text-lg font-bold text-white">{t("panel_today_20h")}</p>
                      ) : planStatus === "expired" ? (
                        <p className="text-lg font-bold text-orange-400">{t("panel_paused_renew")}</p>
                      ) : (
                        <p className="text-lg font-bold text-yellow-400">{t("panel_waiting_activation")}</p>
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
                      ? t("panel_daily_sends")
                      : planStatus === "expired"
                      ? t("panel_paused_message")
                      : t("panel_no_plan_message")}
                  </p>
                  {(planStatus === "expired" || planStatus === "none") && (
                    <button
                      onClick={() => setLocation("/trabajo-malta")}
                      className="mt-3 w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {planStatus === "expired" ? t("panel_renew_plan") : t("panel_choose_plan")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: DOCUMENTOS */}
          {/* ============================================ */}
          {activeTab === "documentos" && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">{t("panel_my_documents")}</h2>
                {planStatus === "expired" && (
                  <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {t("panel_expired_plan")}
                  </span>
                )}
              </div>
              
              {/* CV */}
              <div className={`glass-panel border rounded-xl p-6 ${planStatus === "expired" ? 'border-orange-500/20' : 'border-white/[0.07]'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{t("panel_cv")}</p>
                        <p className={`text-sm ${profile?.cv_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                          {profile?.cv_generated ? `✅ ${t("panel_generated")}` : `⏳ ${t("panel_generating")}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {profile?.cv_url ? (
                      <>
                        <button
                          onClick={() => window.open(profile.cv_url || "", "_blank")}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> {t("panel_view")}
                        </button>
                        <button
                          onClick={() => window.open(profile.cv_url || "", "_blank")}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> {t("panel_download")}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("panel_generating_doc")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Carta de motivación */}
              <div className={`glass-panel border rounded-xl p-6 ${planStatus === "expired" ? 'border-orange-500/20' : 'border-white/[0.07]'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{t("panel_letter")}</p>
                        <p className={`text-sm ${profile?.letter_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                          {profile?.letter_generated ? `✅ ${t("panel_generated")}` : `⏳ ${t("panel_generating")}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {profile?.letter_url ? (
                      <>
                        <button
                          onClick={() => window.open(profile.letter_url || "", "_blank")}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> {t("panel_view")}
                        </button>
                        <button
                          onClick={() => window.open(profile.letter_url || "", "_blank")}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> {t("panel_download")}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("panel_generating_doc")}</p>
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
                    {planStatus === "expired" ? t("panel_docs_available_renew") : t("panel_docs_waiting_plan")}
                  </p>
                  <p className={`text-sm mt-1 ${
                    planStatus === "expired" ? 'text-orange-300/70' : 'text-yellow-300/70'
                  }`}>
                    {planStatus === "expired" ? t("panel_renew_to_continue") : t("panel_activate_to_continue")}
                  </p>
                  <button
                    onClick={() => setLocation("/trabajo-malta")}
                    className="mt-3 px-6 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors"
                  >
                    {planStatus === "expired" ? t("panel_renew_plan") : t("panel_choose_plan")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: PROGRESO */}
          {/* ============================================ */}
          {activeTab === "progreso" && (
            <div className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-white">{t("panel_service_progress")}</h2>

              {(planStatus === "expired" || planStatus === "none") && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  planStatus === "expired"
                    ? 'bg-orange-500/10 border border-orange-500/30'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}>
                  {planStatus === "expired" ? (
                    <Lock className="w-5 h-5 text-orange-400" />
                  ) : (
                    <Hourglass className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <p className={`font-semibold ${planStatus === "expired" ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {planStatus === "expired" ? t("panel_expired_plan") : t("panel_no_plan_yet")}
                    </p>
                    <p className={`text-sm ${planStatus === "expired" ? 'text-orange-300/70' : 'text-yellow-300/70'}`}>
                      {planStatus === "expired" ? t("panel_renew_to_continue") : t("panel_choose_plan_start")}
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation("/trabajo-malta")}
                    className="ml-auto px-4 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold transition-colors"
                  >
                    {planStatus === "expired" ? t("panel_renew") : t("panel_choose")}
                  </button>
                </div>
              )}

              {/* Empresas contactadas */}
              <div className="glass-panel border border-white/[0.07] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">{t("panel_companies_contacted")}</span>
                  <span className="text-sm font-bold text-white">
                    {profile?.applications_sent || 0} / {profile?.applications_total || 300}
                  </span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
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
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-2xl font-bold text-white">
                      {planStatus === "expired" || planStatus === "none" ? '—' : (profile?.applications_daily || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("panel_today")}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-2xl font-bold text-white">{profile?.applications_sent || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("panel_total")}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className={`text-2xl font-bold ${
                      planStatus === "expired" ? 'text-orange-400' : 
                      planStatus === "none" ? 'text-yellow-400' : 
                      'text-yellow-400'
                    }`}>
                      {planStatus === "expired" || planStatus === "none"
                        ? '—'
                        : ((profile?.applications_total || 300) - (profile?.applications_sent || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("panel_remaining")}</p>
                  </div>
                </div>
              </div>

              {/* Respuestas */}
              <div className="glass-panel border border-white/[0.07] rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("panel_responses_received")}</p>
                    <p className="text-3xl font-bold text-white">{profile?.responses || 0}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <Bell className="w-5 h-5 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-semibold">{t("panel_whatsapp_notifications")}</p>
                  </div>
                </div>
                {(planStatus === "expired" || planStatus === "none") && (
                  <p className={`text-xs mt-3 ${planStatus === "expired" ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {planStatus === "expired" ? t("panel_notify_renew") : t("panel_notify_choose")}
                  </p>
                )}
              </div>

              {/* Próximo envío */}
              <div className={`glass-panel border rounded-xl p-6 ${
                planStatus === "expired" ? 'border-orange-500/30' : 
                planStatus === "none" ? 'border-yellow-500/30' :
                'border-white/[0.07]'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("panel_next_auto_send")}</p>
                    {planStatus === "active" ? (
                      <p className="text-2xl font-bold text-white">{t("panel_today_20h")}</p>
                    ) : planStatus === "expired" ? (
                      <p className="text-2xl font-bold text-orange-400">{t("panel_paused")}</p>
                    ) : (
                      <p className="text-2xl font-bold text-yellow-400">{t("panel_waiting")}</p>
                    )}
                  </div>
                  <Clock className={`w-8 h-8 ${
                    planStatus === "expired" ? 'text-orange-400' : 
                    planStatus === "none" ? 'text-yellow-400' : 
                    'text-yellow-400'
                  }`} />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {planStatus === "active" 
                    ? t("panel_daily_sends_to_companies")
                    : planStatus === "expired"
                    ? t("panel_no_sends_until_renew")
                    : t("panel_choose_plan_to_start")}
                </p>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: CUENTA */}
          {/* ============================================ */}
          {activeTab === "cuenta" && (
            <div className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-white">{t("panel_account")}</h2>

              <div className="glass-panel border border-white/[0.07] rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("panel_name")}</p>
                  <p className="text-sm font-semibold text-white">{profile?.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("panel_email")}</p>
                  <p className="text-sm font-semibold text-white">{profile?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("panel_whatsapp")}</p>
                  <p className="text-sm font-semibold text-white">{profile?.whatsapp || t("panel_not_configured")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("panel_plan")}</p>
                  <p className={`text-sm font-semibold ${
                    planStatus === "expired" ? 'text-orange-400' : 
                    planStatus === "none" ? 'text-yellow-400' : 
                    'text-primary'
                  }`}>
                    {planStatus === "active" ? `🇲🇹 ${planName}` : 
                     planStatus === "expired" ? `⏸ ${t("panel_expired")}` : 
                     t("panel_no_plan")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("panel_status")}</p>
                  <p className={`text-sm font-semibold ${
                    planStatus === "active" ? 'text-green-400' : 
                    planStatus === "expired" ? 'text-orange-400' : 
                    'text-yellow-400'
                  }`}>
                    {planStatus === "active" ? `✅ ${t("panel_active")}` : 
                     planStatus === "expired" ? `⏸ ${t("panel_inactive_renew")}` : 
                     `⏳ ${t("panel_waiting_for_plan")}`}
                  </p>
                </div>
              </div>

              {(planStatus === "expired" || planStatus === "none") && (
                <button
                  onClick={() => setLocation("/trabajo-malta")}
                  className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30"
                >
                  <RefreshCw className="w-4 h-4" />
                  {planStatus === "expired" ? t("panel_renew_plan") : t("panel_choose_plan")}
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t("panel_logout")}
              </button>
            </div>
          )}
        </div>
      </main>

      <LegalDisclaimer />

      {/* ============================================ */}
      {/* MENÚ MÓVIL - SOLO 4 BOTONES */}
      {/* ============================================ */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/[0.07] sm:hidden">
        <div className="flex justify-around items-center h-14 px-2">
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
