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
  Users,
  TrendingUp,
  Mail,
  Phone,
  Settings,
  LogOut,
  User,
  Clock,
  Briefcase,
  Award,
  AlertCircle,
  Lock,
  RefreshCw,
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

type TabKey = "inicio" | "documentos" | "progreso" | "cuenta";

export default function PanelMalta() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEverPaid, setHasEverPaid] = useState(false);
  const { toast } = useToast();
  const { t } = useLang();

  const tr = (key: string, fallback: string) => {
    const value = t(key as never);
    return value && value !== key ? value : fallback;
  };

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

        // Buscar en malta_applications
        const { data, error } = await supabase
          .from("malta_applications")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (error) {
          console.error("Error loading profile:", error);
          return;
        }

        // Verificar si alguna vez ha pagado
        if (data) {
          setHasEverPaid(true);
          setProfile(data as ProfileRow);
        } else {
          // Buscar en la tabla de pagos históricos (si existe)
          const { data: paymentHistory, error: historyError } = await supabase
            .from("malta_payments")
            .select("id")
            .eq("email", user.email)
            .maybeSingle();

          if (historyError) {
            console.error("Error checking payment history:", historyError);
          }

          setHasEverPaid(!!paymentHistory);
          setProfile(null);
        }
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
      title: tr("logout_success", "Sesión cerrada"),
      description: tr("logout_desc", "Has cerrado sesión correctamente"),
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

  // Verificar si el plan está activo
  const isPlanActive = () => {
    if (!profile?.plan_end_date) return false;
    const end = new Date(profile.plan_end_date);
    const now = new Date();
    return end > now && profile.paid === true;
  };

  const daysRemaining = getDaysRemaining();
  const planActive = isPlanActive();
  const planName = profile?.plan === "weekly" ? "Semanal" : "Mensual";
  const applicationsProgress = profile?.applications_total 
    ? Math.round((profile.applications_sent / profile.applications_total) * 100)
    : 0;

  // Tabs del menú
  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "inicio", label: "🏠 Inicio", icon: TrendingUp },
    { key: "documentos", label: "📄 Documentos", icon: FileText },
    { key: "progreso", label: "📈 Progreso", icon: Calendar },
    { key: "cuenta", label: "👤 Cuenta", icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando panel...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // CASO 1: NUEVO USUARIO (NUNCA HA PAGADO)
  // ============================================
  if (!profile && !hasEverPaid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              No tienes un plan activo
            </h2>
            <p className="text-muted-foreground mb-6">
              Contrata un plan de búsqueda de empleo en Malta para acceder a tu panel.
            </p>
            <button
              onClick={() => setLocation("/trabajo-malta")}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg shadow-green-500/30 hover:scale-[1.02] transition-all"
            >
              🇲🇹 Ver planes
            </button>
          </div>
        </div>
        <LegalDisclaimer />
      </div>
    );
  }

  // ============================================
  // CASO 2: USUARIO CON PLAN EXPIRADO O INACTIVO
  // ============================================
  const isExpired = !planActive && hasEverPaid;

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
            isExpired 
              ? "border-orange-500/40 bg-orange-500/5" 
              : "border-white/[0.07]"
          }`}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                👋 Bienvenido {profile?.full_name || "Usuario"}
              </h1>
              
              {isExpired ? (
                // ⚠️ Mensaje de plan expirado
                <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-400 font-bold">🟠 Tu plan ha finalizado</span>
                  </div>
                  <p className="text-sm text-orange-300/70 mt-1">
                    Renueva tu plan para que sigamos enviando solicitudes automáticamente.
                  </p>
                </div>
              ) : (
                // ✅ Plan activo
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Plan:</span>
                  <span className="text-sm font-bold text-primary">
                    🇲🇹 Malta {planName}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-sm text-muted-foreground">⏳ Quedan:</span>
                  <span className="text-sm font-bold text-yellow-400">
                    {daysRemaining} días
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-sm text-muted-foreground">📅 Finaliza:</span>
                  <span className="text-sm font-bold text-white">
                    {profile?.plan_end_date 
                      ? new Date(profile.plan_end_date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setLocation("/trabajo-malta")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                isExpired
                  ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30"
                  : "bg-primary/20 hover:bg-primary/30 text-primary"
              }`}
            >
              {isExpired ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Renovar plan
                </>
              ) : (
                "Gestionar plan"
              )}
            </button>
          </div>

          {/* 📊 Resumen rápido siempre visible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <div className="text-center">
              <FileText className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">CV</p>
              <p className="text-sm font-bold text-white">
                {profile?.cv_generated ? "✅" : "⏳"}
              </p>
            </div>
            <div className="text-center">
              <FileText className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Carta</p>
              <p className="text-sm font-bold text-white">
                {profile?.letter_generated ? "✅" : "⏳"}
              </p>
            </div>
            <div className="text-center">
              <Briefcase className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Empresas</p>
              <p className="text-sm font-bold text-white">{profile?.applications_sent || 0}</p>
            </div>
            <div className="text-center">
              <Award className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className={`text-sm font-bold ${isExpired ? 'text-orange-400' : 'text-white'}`}>
                {isExpired ? "⏸ Expirado" : `${daysRemaining} días`}
              </p>
            </div>
          </div>
        </motion.div>

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
          {/* TAB: INICIO */}
          {/* ============================================ */}
          {activeTab === "inicio" && (
            <div className="p-6 space-y-6">
              {/* 📄 Mis documentos */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">📄 Mis documentos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CV */}
                  <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-bold text-white">Curriculum Vitae</span>
                      </div>
                      <span className={`text-xs font-semibold ${profile?.cv_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                        {profile?.cv_generated ? "✅ Generado" : "⏳ Generando..."}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {profile?.cv_url ? (
                        <>
                          <button
                            onClick={() => window.open(profile.cv_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Ver PDF
                          </button>
                          <button
                            onClick={() => window.open(profile.cv_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Descargar
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Generando...</p>
                      )}
                    </div>
                  </div>

                  {/* Carta de motivación */}
                  <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-bold text-white">Carta de motivación</span>
                      </div>
                      <span className={`text-xs font-semibold ${profile?.letter_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                        {profile?.letter_generated ? "✅ Generada" : "⏳ Generando..."}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {profile?.letter_url ? (
                        <>
                          <button
                            onClick={() => window.open(profile.letter_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Ver PDF
                          </button>
                          <button
                            onClick={() => window.open(profile.letter_url || "", "_blank")}
                            className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Descargar
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Generando...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 💼 Estado del servicio */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">💼 Estado del servicio</h2>
                <div className={`glass-panel border rounded-xl p-4 ${isExpired ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/[0.07]'}`}>
                  {isExpired && (
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Lock className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-orange-400 font-semibold">
                        🔒 Envío automático pausado · Renueva para continuar
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">Empresas contactadas</span>
                    <span className="text-sm font-bold text-white">
                      {profile?.applications_sent || 0} / {profile?.applications_total || 300}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isExpired ? 'bg-orange-400' : 'bg-gradient-to-r from-primary to-green-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${applicationsProgress}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Enviadas hoy</p>
                      <p className="text-sm font-bold text-white">{isExpired ? '⏸' : (profile?.applications_daily || 0)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Total este mes</p>
                      <p className="text-sm font-bold text-white">{profile?.applications_sent || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Restantes</p>
                      <p className={`text-sm font-bold ${isExpired ? 'text-orange-400' : 'text-yellow-400'}`}>
                        {isExpired ? '⏸ Pausado' : ((profile?.applications_total || 300) - (profile?.applications_sent || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📬 Respuestas */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">📬 Respuestas</h2>
                <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">📩 Empresas interesadas</p>
                      <p className="text-2xl font-bold text-white">{profile?.responses || 0} respuestas</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                      <Bell className="w-4 h-4 text-yellow-400" />
                      <p className="text-[10px] text-yellow-400 font-semibold">Te avisaremos</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isExpired 
                      ? "🔒 Recibirás notificaciones cuando renueves tu plan."
                      : "Te avisaremos automáticamente por WhatsApp cuando una empresa se interese."
                    }
                  </p>
                </div>
              </div>

              {/* 📱 WhatsApp */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">📱 WhatsApp</h2>
                <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white">{profile?.whatsapp || "No configurado"}</p>
                        <p className="text-xs text-green-400">🟢 Verificado</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLocation("/trabajo-malta")}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    >
                      Cambiar número
                    </button>
                  </div>
                </div>
              </div>

              {/* ⏰ Próximo envío */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">⏰ Próximo envío</h2>
                <div className={`glass-panel border rounded-xl p-4 ${isExpired ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/[0.07]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">Próximo envío automático</p>
                      {isExpired ? (
                        <p className="text-lg font-bold text-orange-400">⏸ Pausado · Renueva para activar</p>
                      ) : (
                        <p className="text-lg font-bold text-white">Hoy · 20:00</p>
                      )}
                    </div>
                    <Clock className={`w-6 h-6 ${isExpired ? 'text-orange-400' : 'text-yellow-400'}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isExpired 
                      ? "🔒 No se enviarán nuevas candidaturas hasta que renueves tu plan."
                      : "Cada día enviamos nuevas solicitudes automáticamente."
                    }
                  </p>
                  {isExpired && (
                    <button
                      onClick={() => setLocation("/trabajo-malta")}
                      className="mt-3 w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Renovar plan ahora
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: DOCUMENTOS (idéntico pero con bloqueo si expirado) */}
          {/* ============================================ */}
          {activeTab === "documentos" && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">📄 Mis documentos</h2>
                {isExpired && (
                  <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Plan expirado
                  </span>
                )}
              </div>
              
              {/* CV */}
              <div className={`glass-panel border rounded-xl p-6 ${isExpired ? 'border-orange-500/20' : 'border-white/[0.07]'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">Curriculum Vitae</p>
                        <p className={`text-sm ${profile?.cv_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                          {profile?.cv_generated ? "✅ Generado" : "⏳ Generando..."}
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
                          <Eye className="w-4 h-4" /> Ver
                        </button>
                        <button
                          onClick={() => window.open(profile.cv_url || "", "_blank")}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Descargar
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Generando...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Carta de motivación */}
              <div className={`glass-panel border rounded-xl p-6 ${isExpired ? 'border-orange-500/20' : 'border-white/[0.07]'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">Carta de motivación</p>
                        <p className={`text-sm ${profile?.letter_generated ? 'text-green-400' : 'text-yellow-400'}`}>
                          {profile?.letter_generated ? "✅ Generada" : "⏳ Generando..."}
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
                          <Eye className="w-4 h-4" /> Ver
                        </button>
                        <button
                          onClick={() => window.open(profile.letter_url || "", "_blank")}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Descargar
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Generando...</p>
                    )}
                  </div>
                </div>
              </div>

              {isExpired && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center">
                  <p className="text-orange-400 font-semibold">🔒 Tus documentos están disponibles</p>
                  <p className="text-sm text-orange-300/70 mt-1">Renueva tu plan para seguir recibiendo nuevas oportunidades</p>
                  <button
                    onClick={() => setLocation("/trabajo-malta")}
                    className="mt-3 px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors"
                  >
                    Renovar plan
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
              <h2 className="text-sm font-bold text-white">📈 Progreso del servicio</h2>

              {isExpired && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-orange-400 font-semibold">Plan expirado</p>
                    <p className="text-sm text-orange-300/70">Renueva para continuar con el envío de solicitudes</p>
                  </div>
                  <button
                    onClick={() => setLocation("/trabajo-malta")}
                    className="ml-auto px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors"
                  >
                    Renovar
                  </button>
                </div>
              )}

              {/* Empresas contactadas */}
              <div className="glass-panel border border-white/[0.07] rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">Empresas contactadas</span>
                  <span className="text-sm font-bold text-white">
                    {profile?.applications_sent || 0} / {profile?.applications_total || 300}
                  </span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isExpired ? 'bg-orange-400' : 'bg-gradient-to-r from-primary to-green-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${applicationsProgress}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-2xl font-bold text-white">{isExpired ? '⏸' : (profile?.applications_daily || 0)}</p>
                    <p className="text-xs text-muted-foreground">Enviadas hoy</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-2xl font-bold text-white">{profile?.applications_sent || 0}</p>
                    <p className="text-xs text-muted-foreground">Total este mes</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className={`text-2xl font-bold ${isExpired ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {isExpired ? '⏸' : ((profile?.applications_total || 300) - (profile?.applications_sent || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Restantes</p>
                  </div>
                </div>
              </div>

              {/* Respuestas */}
              <div className="glass-panel border border-white/[0.07] rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">📩 Respuestas recibidas</p>
                    <p className="text-3xl font-bold text-white">{profile?.responses || 0}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <Bell className="w-5 h-5 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-semibold">Notificaciones WhatsApp</p>
                  </div>
                </div>
                {isExpired && (
                  <p className="text-xs text-orange-400 mt-3">🔒 Recibirás notificaciones al renovar tu plan</p>
                )}
              </div>

              {/* Próximo envío */}
              <div className={`glass-panel border rounded-xl p-6 ${isExpired ? 'border-orange-500/30' : 'border-white/[0.07]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">⏰ Próximo envío automático</p>
                    {isExpired ? (
                      <p className="text-2xl font-bold text-orange-400">⏸ Pausado</p>
                    ) : (
                      <p className="text-2xl font-bold text-white">Hoy · 20:00</p>
                    )}
                  </div>
                  <Clock className={`w-8 h-8 ${isExpired ? 'text-orange-400' : 'text-yellow-400'}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {isExpired 
                    ? "🔒 No se enviarán nuevas solicitudes hasta que renueves tu plan."
                    : "Cada día enviamos nuevas solicitudes automáticamente a empresas en Malta."
                  }
                </p>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TAB: CUENTA */}
          {/* ============================================ */}
          {activeTab === "cuenta" && (
            <div className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-white">⚙️ Cuenta</h2>

              <div className="glass-panel border border-white/[0.07] rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm font-semibold text-white">{profile?.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-semibold text-white">{profile?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="text-sm font-semibold text-white">{profile?.whatsapp || "No configurado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className={`text-sm font-semibold ${isExpired ? 'text-orange-400' : 'text-primary'}`}>
                    {isExpired ? '⏸ Expirado' : `🇲🇹 Malta ${planName}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className={`text-sm font-semibold ${isExpired ? 'text-orange-400' : 'text-green-400'}`}>
                    {isExpired ? '⏸ Inactivo · Renueva para activar' : '✅ Activo'}
                  </p>
                </div>
              </div>

              {isExpired && (
                <button
                  onClick={() => setLocation("/trabajo-malta")}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Renovar plan
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
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
