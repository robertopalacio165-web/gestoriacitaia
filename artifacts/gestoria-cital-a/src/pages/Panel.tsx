
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { PaymentModal } from "@/components/PaymentModal";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  FileText, CheckCircle2, XCircle, AlertCircle, Bell, Shield,
  Upload, Download, ChevronRight, Globe, Home, Briefcase, Users,
  GraduationCap, Heart, Car, Building2, Clock, Calendar,
  CreditCard, Star, Search, MessageSquare, ArrowRight, User, TrendingUp,
  Gift, Copy, Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";

const CITAS = [
  { date: "24 Mar 2026", time: "10:30", label: "Renovación TIE", ref: "ESP-2026-034821", status: "proxima", lugar: "Comisaría Madrid Centro" },
  { date: "15 Ene 2026", time: "09:15", label: "Empadronamiento", ref: "MAD-2026-001234", status: "completada", lugar: "Ayuntamiento Madrid" },
  { date: "03 Nov 2025", time: "11:00", label: "Asignación NIE", ref: "ESP-2025-099812", status: "completada", lugar: "Comisaría Madrid Norte" },
];

const CLIENT_NAME = "Ahmed Benali";
const REFERRAL_CODE = "AHMED-GCX26";
const REFERRALS_USED = 1;
const REFERRALS_NEEDED = 3;

export default function Panel() {
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
useEffect(() => {
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setLocation("/");
    } else {
      setLoading(false);
    }
  };

  checkUser();
}, [setLocation]);
if (loading) return null;
  const handleAction = async (action) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    alert("Debes iniciar sesión con Google");
    setLocation("/");
    return;
  }

  action();
};
  const [activeTab, setActiveTab] = useState<"resumen" | "tramites" | "citas" | "documentos">("resumen");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState("Estándar");
  const [codeCopied, setCodeCopied] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const { toast } = useToast();
  const { t } = useLang();

  const TRAMITES_ACTIVOS = [
    { icon: FileText, label: "Renovación TIE", color: "text-blue-400", pct: 35, status: t("panel_tramite_curso"), pasos: [t("panel_tramite_s1"), t("panel_tramite_s2"), t("panel_tramite_s3"), t("panel_tramite_s4")], paso: 2 },
    { icon: Heart, label: "Arraigo Social", color: "text-red-400", pct: 10, status: t("panel_tramite_pending"), pasos: [t("panel_tramite_s1"), t("panel_tramite_s2"), t("panel_tramite_s3"), t("panel_tramite_s4")], paso: 1 },
  ];

  const DOCS = [
    { name: "Pasaporte (vigente)", status: "ok", date: "Ene 2026", size: "2.4 MB" },
    { name: "Contrato de trabajo", status: "ok", date: "Feb 2026", size: "1.1 MB" },
    { name: "Empadronamiento", status: "ok", date: "Mar 2026", size: "0.8 MB" },
    { name: "Cert. antecedentes penales", status: "warn", date: "Por renovar", size: "—" },
    { name: "Fotografías carnet (4u)", status: "missing", date: "Falta", size: "—" },
    { name: "Formulario EX17", status: "ok", date: "Ene 2026", size: "0.5 MB" },
  ];

  const DOC_STATUS = {
    ok: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", label: t("panel_doc_ok") },
    warn: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10", label: t("panel_doc_warn") },
    missing: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: t("panel_doc_missing") },
  };

  const docsOk = DOCS.filter(d => d.status === "ok").length;
  const docsPct = Math.round((docsOk / DOCS.length) * 100);
const crearCita = () => {
  alert("CITA CREADA 🔥");
};
  const copyCode = () => {
    navigator.clipboard.writeText(REFERRAL_CODE).catch(() => {});
    setCodeCopied(true);
    toast({ title: t("panel_copied"), description: `${REFERRAL_CODE} copiado al portapapeles.` });
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const TABS: { key: "resumen" | "tramites" | "citas" | "documentos"; label: string }[] = [
    { key: "resumen", label: t("panel_tab_resumen") },
    { key: "tramites", label: t("panel_tab_tramites") },
    { key: "citas", label: t("panel_tab_citas") },
    { key: "documentos", label: t("panel_tab_docs") },
  ];

  const QUICK_ACTIONS = [
    { icon: Search, label: t("panel_action_cita"), sub: t("panel_action_cita_sub"), color: "text-primary", onClick: () => setLocation("/buscar-citas") },
    { icon: Globe, label: t("panel_action_reg"), sub: t("panel_action_reg_sub"), color: "text-amber-400", onClick: () => setLocation("/regularizacion-2026") },
    { icon: Upload, label: t("panel_action_upload"), sub: t("panel_action_upload_sub"), color: "text-blue-400", onClick: () => setActiveTab("documentos") },
    { icon: MessageSquare, label: t("panel_action_ia"), sub: t("panel_action_ia_sub"), color: "text-secondary", onClick: () => {} },
  ];

  const STAT_CARDS = [
    { label: t("panel_plan_active"), value: planActivo, sub: t("panel_stat_up_to"), icon: Star, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: t("panel_stat_tramites"), value: "2", sub: "1 en curso · 1 pendiente", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: t("panel_stat_cita_next"), value: "24 Mar", sub: "Renovación TIE · 10:30", icon: Calendar, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { label: t("panel_stat_docs"), value: `${docsOk}/${DOCS.length}`, sub: `${docsPct}% ${t("panel_completed_pct")}`, icon: Shield, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  ];

  const CLIENT_FIELDS = [
    [t("panel_full_name"), "Ahmed Benali"],
    ["NIE", "X-1234567-Z"],
    [t("panel_nationality"), "Marroquí 🇲🇦"],
    [t("panel_birthdate"), "15/03/1990"],
    ["Tel.", "+34 612 345 678"],
    ["Email", "ahmed@email.com"],
    [t("panel_situation"), "Residencia temporal"],
    [t("panel_tie_expiry"), "30/06/2026 ⚠️"],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(34,197,94,0.12), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.08), transparent)" }}
      />
      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/40 overflow-hidden shrink-0">
              <img src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`} className="w-full h-full object-cover object-top" alt="" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">{t("panel_header")}</h1>
              <p className="text-xs text-muted-foreground">{CLIENT_NAME} · <span className="text-primary font-semibold">{t("panel_plan_active")} {planActivo}</span> · NIE: X-1234567-Z</p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Notification button — solid amber background */}
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-200 hover:text-amber-100 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              {t("panel_notif_btn")}
              <span className="w-4 h-4 rounded-full bg-destructive text-white text-[9px] flex items-center justify-center font-bold">2</span>
            </button>

            {/* Notification dropdown */}
            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full right-0 mt-2 w-80 glass-panel-heavy border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <span className="text-sm font-bold text-white">{t("panel_notif_btn")}</span>
                  <button className="text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors">{t("panel_notif_mark_read")}</button>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {[
                    { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", title: "Cita confirmada", body: "Renovación TIE · 24 Mar 2026 · 10:30 — Comisaría Madrid", time: "hace 2h", dot: true },
                    { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10", title: "Documento por renovar", body: "Tu Cert. de antecedentes penales caduca pronto", time: "hace 1d", dot: true },
                    { icon: FileText, color: "text-secondary", bg: "bg-secondary/10", title: "Regularización 2026", body: "Nueva convocatoria disponible. Consulta tu elegibilidad.", time: "hace 3d", dot: false },
                  ].map((n, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <n.icon className={`w-4 h-4 ${n.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-white/30 mt-1">{n.time}</p>
                      </div>
                      {n.dot && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowNotif(false); }} className="w-full py-3 text-xs text-primary hover:text-primary/80 font-semibold transition-colors border-t border-white/[0.06] flex items-center justify-center gap-1">
                  {t("panel_notif_view")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`glass-panel border ${card.border} rounded-2xl p-4 flex flex-col gap-2`}>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-none">{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABS */}
        <div className="glass-panel border border-white/[0.07] rounded-2xl overflow-hidden mb-4">
          <div className="flex border-b border-white/[0.06] overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold capitalize transition-colors whitespace-nowrap px-2 ${activeTab === tab.key ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-white"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: Resumen */}
          {activeTab === "resumen" && (
            <div className="p-4 space-y-4">

              {/* Plan card */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-900/20 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("panel_plan_active")}</p>
                    <p className="text-base font-black text-white">{planActivo} · 19.99€<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold">{t("panel_active")}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[
                    [t("panel_plan_used"), "1 / 3"],
                    [t("panel_procedures"), "2 / 3"],
                    [t("panel_next_invoice"), "01 Abr 2026"],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">{l}</p>
                      <p className="text-xs font-bold text-white mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPayment(true)} className="flex-1 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                    <CreditCard className="w-3 h-3" /> {t("panel_manage_plan")}
                  </button>
                  <button onClick={crearCita} className="flex-1 py-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                    <Search className="w-3 h-3" /> {t("panel_new_appt")}
                  </button>
                </div>
              </div>

              {/* Active tramites summary */}
              <div>
                <p className="text-xs font-bold text-white mb-2">{t("panel_tramites_curso")}</p>
                <div className="space-y-2">
                  {TRAMITES_ACTIVOS.map((tr, i) => (
                    <div key={i} className="glass-panel border border-white/[0.07] rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <tr.icon className={`w-4 h-4 ${tr.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{tr.label}</p>
                          <p className="text-[10px] text-muted-foreground">{tr.status}</p>
                        </div>
                        <span className="text-xs font-bold text-primary">{tr.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${tr.pct}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-xs font-bold text-white mb-2">{t("panel_quick_actions")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((a, i) => (
                    <button key={i} onClick={a.onClick} className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-white/15 transition-all text-left group">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                        <a.icon className={`w-4 h-4 ${a.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">{a.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Referral code card */}
              <div className="rounded-xl border border-primary/30 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))" }}>
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-white">{t("panel_referral_title")}</span>
                    <span className="ml-auto text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">{t("panel_referral_reward")}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{t("panel_referral_desc")}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-black text-primary tracking-widest">{REFERRAL_CODE}</span>
                      <button onClick={copyCode} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-white transition-colors">
                        {codeCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                        {codeCopied ? t("panel_copied") : t("panel_copy")}
                      </button>
                    </div>
                    <button onClick={() => { if(navigator.share) navigator.share({ title: "GestoriaCitaIA", text: `Usa mi código ${REFERRAL_CODE} y consigue tu primer mes con descuento`, url: "https://gestoriacitaia.com" }); }}
                      className="w-9 h-9 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0">
                      <Share2 className="w-3.5 h-3.5 text-white/70" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">{t("panel_referrals_bought")}</span>
                      <span className="text-[10px] font-bold text-white">{REFERRALS_USED}/{REFERRALS_NEEDED}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${(REFERRALS_USED / REFERRALS_NEEDED) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                    </div>
                    <div className="flex justify-between">
                      {Array.from({ length: REFERRALS_NEEDED }).map((_, i) => (
                        <div key={i} className={`flex items-center gap-1 text-[9px] font-semibold ${i < REFERRALS_USED ? "text-primary" : "text-white/30"}`}>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] ${i < REFERRALS_USED ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/20"}`}>
                            {i < REFERRALS_USED ? "✓" : i + 1}
                          </span>
                          {i === 0 ? "Ahmed M." : i === 1 ? "Karim B." : "Pendiente"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-primary/10 border-t border-primary/20 px-4 py-2">
                  <p className="text-[10px] text-primary/80">🎯 {t("panel_referral_left")} <strong className="text-primary">{REFERRALS_NEEDED - REFERRALS_USED}</strong> {t("panel_referral_more")}</p>
                </div>
              </div>

              {/* Legal notice */}
              <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-600/20 rounded-xl p-3">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  <strong className="text-amber-400">{t("panel_legal_aviso")}</strong> {t("panel_legal_panel")}
                </p>
              </div>
            </div>
          )}

          {/* TAB: Trámites */}
          {activeTab === "tramites" && (
            <div className="p-4 space-y-4">
              {TRAMITES_ACTIVOS.map((tr, i) => (
                <div key={i} className="glass-panel border border-white/[0.07] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <tr.icon className={`w-5 h-5 ${tr.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{tr.label}</p>
                      <p className="text-xs text-muted-foreground">{tr.status} · {tr.pct}% {t("panel_completed_pct")}</p>
                    </div>
                    <button onClick={() => setLocation("/buscar-citas")} className="text-xs text-primary hover:underline flex items-center gap-1">
                      {t("panel_continue")} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${tr.pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                  </div>
                  <div className="flex justify-between relative">
                    <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-white/10"></div>
                    <div className="absolute top-3.5 left-4 h-0.5 bg-primary" style={{ width: `${(tr.paso / (tr.pasos.length - 1)) * 90}%` }}></div>
                    {tr.pasos.map((p, pi) => (
                      <div key={pi} className="flex flex-col items-center gap-1 relative z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${pi < tr.paso ? "bg-primary border-primary" : "bg-background border-white/20"}`}>
                          {pi < tr.paso ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <span className="text-[10px] text-muted-foreground">{pi + 1}</span>}
                        </div>
                        <p className={`text-[9px] leading-tight text-center max-w-[50px] ${pi < tr.paso ? "text-primary font-bold" : "text-muted-foreground"}`}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-center">
                <button onClick={() => setLocation("/buscar-citas")} className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                  <Search className="w-3.5 h-3.5" /> {t("panel_search_agent")}
                </button>
              </div>
            </div>
          )}

          {/* TAB: Citas */}
          {activeTab === "citas" && (
            <div className="p-4 space-y-3">
              {CITAS.map((cita, i) => (
                <div key={i} className={`rounded-xl p-3 border ${cita.status === "proxima" ? "bg-primary/10 border-primary/25" : "glass-panel border-white/[0.07]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cita.status === "proxima" ? "bg-primary/20" : "bg-white/5"}`}>
                        <Calendar className={`w-4 h-4 ${cita.status === "proxima" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{cita.label}</p>
                        <p className="text-[11px] text-muted-foreground">{cita.date} · {cita.time}</p>
                        <p className="text-[10px] text-white/50">{cita.lugar}</p>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">Ref: {cita.ref}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cita.status === "proxima" ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary/10 text-primary/70 border border-primary/15"}`}>
                      {cita.status === "proxima" ? t("panel_cita_proxima") : t("panel_cita_done")}
                    </span>
                  </div>
                  {cita.status === "proxima" && (
                    <div className="mt-2 pt-2 border-t border-primary/15 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <p className="text-[10px] text-primary/80">{t("panel_wa_confirmed")}</p>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setLocation("/buscar-citas")} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 mt-2">
                <Search className="w-4 h-4" /> {t("panel_new_appt_agent")}
              </button>
            </div>
          )}

          {/* TAB: Documentos */}
          {activeTab === "documentos" && (
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-white">{t("panel_docs_header")}</p>
                <span className="text-xs text-primary font-medium">{docsOk}/{DOCS.length} {t("panel_docs_completed")}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${docsPct}%` }} transition={{ duration: 0.8 }} />
              </div>
              {DOCS.map((doc, i) => {
                const s = DOC_STATUS[doc.status as keyof typeof DOC_STATUS];
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.date} {doc.size !== "—" && `· ${doc.size}`}</p>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 ${s.color}`}>{s.label}</span>
                    {doc.status === "ok" && <button className="text-muted-foreground hover:text-white transition-colors shrink-0"><Download className="w-3.5 h-3.5" /></button>}
                    {doc.status === "missing" && <button className="text-[10px] text-secondary hover:text-secondary/80 font-semibold flex items-center gap-1 shrink-0"><Upload className="w-3 h-3" /> {t("panel_doc_upload")}</button>}
                  </div>
                );
              })}
              <button className="w-full mt-2 py-2.5 text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1.5 border border-dashed border-primary/25 rounded-xl hover:border-primary/40 transition-colors">
                <Upload className="w-3.5 h-3.5" /> {t("panel_upload_new")}
              </button>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-white/[0.06]">
                <Shield className="w-3 h-3 shrink-0 text-primary" />
                {t("panel_docs_encrypted")}
              </div>
            </div>
          )}
        </div>

        {/* Client data card */}
        <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" /> {t("panel_client_data")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {CLIENT_FIELDS.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">{k}</span>
                <span className="text-xs text-white font-medium truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <LegalDisclaimer />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={(p) => { setPlanActivo(p); setShowPayment(false); }}
        agentMessage={t("panel_plan_active")}
      />

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/[0.07] sm:hidden">
        <div className="flex justify-around items-center h-14 px-2">
          {[
            { icon: TrendingUp, label: t("panel_nav_resumen"), tab: "resumen" },
            { icon: FileText, label: t("panel_nav_tramites"), tab: "tramites" },
            { icon: Clock, label: t("panel_nav_citas"), tab: "citas" },
            { icon: Shield, label: t("panel_nav_docs"), tab: "documentos" },
          ].map((item, i) => (
            <button key={i} onClick={() => setActiveTab(item.tab as any)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${activeTab === item.tab ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
