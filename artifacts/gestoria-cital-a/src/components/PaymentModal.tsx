import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, CreditCard, Shield, Lock, ChevronRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  agentMessage?: string;
}

export function PaymentModal({ open, onClose, onSelectPlan, agentMessage }: PaymentModalProps) {
  const [selected, setSelected] = useState<"cita" | "reg" | "std">("std");
  const [paying, setPaying] = useState(false);
  const { t } = useLang();

  const MODAL_PLANS = [
    {
      id: "cita",
      name: t("plan_cita_name"),
      price: "9.99€/mes",
      priceNum: "9.99",
      highlighted: false,
      accentClass: "border-green-500/40 bg-green-900/10",
      features: [t("plan_cita_f1"), t("plan_cita_f2"), t("plan_cita_f3"), t("plan_cita_f4"), t("plan_cita_f5")],
    },
    {
      id: "reg",
      name: t("plan_reg_name"),
      price: "9.99€/mes",
      priceNum: "9.99",
      highlighted: false,
      accentClass: "border-orange-500/40 bg-orange-900/10",
      features: [t("plan_reg_f1"), t("plan_reg_f2"), t("plan_reg_f3"), t("plan_reg_f4"), t("plan_reg_f5")],
    },
    {
      id: "std",
      name: t("plan_std_name"),
      price: "19.99€/mes",
      priceNum: "19.99",
      highlighted: true,
      accentClass: "border-primary/50 bg-primary/15",
      features: [t("plan_std_f1"), t("plan_std_f2"), t("plan_std_f3"), t("plan_std_f4"), t("plan_std_f5"), t("plan_std_f6"), t("plan_std_f7")],
    },
  ];

  const selectedPlan = MODAL_PLANS.find(p => p.id === selected)!;

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      onSelectPlan(selectedPlan.name);
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full sm:max-w-lg glass-panel-heavy border border-white/10 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[92dvh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-900/40 to-blue-900/30 px-4 pt-5 pb-4 border-b border-white/10 sticky top-0 z-10 glass-panel-heavy">
              <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-3 items-start pr-8">
                <div className="w-9 h-9 rounded-full border-2 border-primary overflow-hidden shrink-0">
                  <img
                    src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                    alt="Sara"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary mb-0.5">Sara · {t("agent_sara_role")}</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-2.5">
                    <p className="text-xs text-white/90 leading-relaxed">
                      {agentMessage || t("payment_title")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">

              {/* Plans */}
              <div>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">{t("payment_choose")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {MODAL_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelected(plan.id as "cita" | "reg" | "std")}
                      className={`rounded-xl p-2.5 flex flex-col border transition-all text-left ${
                        selected === plan.id
                          ? `${plan.accentClass} shadow-lg`
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {plan.highlighted && (
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">⭐ {t("payment_rec")}</span>
                      )}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{plan.name}</p>
                      <p className={`text-xl font-black mb-2 leading-tight ${plan.highlighted ? "text-primary" : "text-white"}`}>
                        {plan.priceNum}€<span className="text-[10px] font-normal text-muted-foreground">/mes</span>
                      </p>
                      <ul className="space-y-1 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/70 leading-tight">
                            <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {selected === plan.id && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary">
                          <CheckCircle2 className="w-3 h-3" /> {t("payment_selected")}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> {t("payment_title")}
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder={t("panel_name")}
                    />
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Email"
                    />
                  </div>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="•••• •••• •••• ••••"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="MM/AA"
                    />
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="CVV"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Shield className="w-3 h-3 text-primary shrink-0" />
                  {t("payment_secure")}
                </div>
              </div>

              {/* PAY BUTTON */}
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.98]"
              >
                {paying ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    {t("payment_processing")}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {t("payment_pay")} {selectedPlan?.price} — {t("payment_activate")} {selectedPlan?.name}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-muted-foreground">
                {t("payment_cancel")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
