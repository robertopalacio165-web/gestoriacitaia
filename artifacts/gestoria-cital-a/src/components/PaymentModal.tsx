import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Bell, Shield, ChevronRight, PartyPopper } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  agentMessage?: string;
}

export function PaymentModal({ open, onClose, onSelectPlan, agentMessage }: PaymentModalProps) {
  const [selected, setSelected] = useState<"cita" | "reg" | "std">("std");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState(false);
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

  const handleSubmit = () => {
    if (!email.trim() || !email.includes("@")) {
      setEmailError(true);
      return;
    }
    setEmailError(false);

    try {
      const waitlist = JSON.parse(localStorage.getItem("gestoria_waitlist") ?? "[]") as string[];
      if (!waitlist.includes(email.trim())) {
        waitlist.push(email.trim());
        localStorage.setItem("gestoria_waitlist", JSON.stringify(waitlist));
        localStorage.setItem("gestoria_waitlist_plan", selected);
      }
    } catch {
    }

    onSelectPlan(selectedPlan.name);
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setEmail("");
    setEmailError(false);
    onClose();
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
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative z-10 w-full sm:max-w-lg glass-panel-heavy border border-white/10 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[92dvh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-900/40 to-blue-900/30 px-4 pt-5 pb-4 border-b border-white/10 sticky top-0 z-10 glass-panel-heavy">
              <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
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

              {submitted ? (
                /* Success state */
                <motion.div
                  className="py-8 flex flex-col items-center text-center gap-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  >
                    <PartyPopper className="w-8 h-8 text-primary" />
                  </motion.div>
                  <div>
                    <p className="text-white font-bold text-base mb-1">{t("payment_soon_done")}</p>
                    <p className="text-white/50 text-xs">{t("payment_soon_title")}</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 text-xs text-primary/80">
                    {selectedPlan.name} · {selectedPlan.price}
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/60 text-sm hover:border-white/30 transition-all"
                  >
                    Cerrar
                  </button>
                </motion.div>
              ) : (
                <>
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

                  {/* Waitlist form */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-300">{t("payment_soon_title")}</p>
                        <p className="text-[11px] text-amber-200/70 mt-0.5">{t("payment_soon_desc")}</p>
                      </div>
                    </div>
                    <input
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                      type="email"
                      placeholder={t("payment_soon_email")}
                      className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors ${
                        emailError ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-amber-500/50"
                      }`}
                    />
                    {emailError && (
                      <p className="text-[10px] text-red-400">Introduce un email válido.</p>
                    )}
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={handleSubmit}
                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.98]"
                  >
                    <Bell className="w-4 h-4" />
                    {t("payment_soon_btn")}
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
                    <Shield className="w-3 h-3 text-primary shrink-0" />
                    {t("payment_secure")}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
