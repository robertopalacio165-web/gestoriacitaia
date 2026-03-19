import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, CreditCard, Shield, Lock, ChevronRight } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  priceNum: string;
  features: string[];
  highlighted?: boolean;
}

const MODAL_PLANS: Plan[] = [
  {
    name: "BÁSICO",
    price: "$12.99/mes",
    priceNum: "12.99",
    features: ["1 cita al mes", "Agente IA 24/7", "PDF + WhatsApp"],
  },
  {
    name: "ESTÁNDAR",
    price: "$19.99/mes",
    priceNum: "19.99",
    features: ["3 citas al mes", "3 trámites", "Videollamada", "Aviso WhatsApp"],
    highlighted: true,
  },
  {
    name: "PRO",
    price: "$27.99/mes",
    priceNum: "27.99",
    features: ["Citas ilimitadas", "Agente dedicado", "Soporte urgente", "20% dto."],
  },
];

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  agentMessage?: string;
}

export function PaymentModal({ open, onClose, onSelectPlan, agentMessage }: PaymentModalProps) {
  const [selected, setSelected] = useState<string>("ESTÁNDAR");
  const [paying, setPaying] = useState(false);

  const selectedPlan = MODAL_PLANS.find(p => p.name === selected)!;

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      onSelectPlan(selected);
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
          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          {/* Modal — full-width bottom sheet on mobile, centered card on desktop */}
          <motion.div
            className="relative z-10 w-full sm:max-w-lg glass-panel-heavy border border-white/10 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[92dvh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header with agent bubble */}
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
                  <p className="text-xs font-bold text-primary mb-0.5">Sara · Asistente de Citas</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-2.5">
                    <p className="text-xs text-white/90 leading-relaxed">
                      {agentMessage || "Para continuar con tu trámite y reservar tu cita, activa un plan. ¡Elige el que mejor se adapta a ti!"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">

              {/* Plans — horizontal scroll on mobile */}
              <div>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Elige tu plan</p>
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
                  {MODAL_PLANS.map((plan) => (
                    <button
                      key={plan.name}
                      onClick={() => setSelected(plan.name)}
                      className={`snap-center shrink-0 w-[140px] rounded-xl p-3 flex flex-col border transition-all text-left ${
                        selected === plan.name
                          ? plan.highlighted
                            ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/20"
                            : "bg-secondary/10 border-secondary/40"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {plan.highlighted && (
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">⭐ Recomendado</span>
                      )}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{plan.name}</p>
                      <p className={`text-base font-black mb-2 leading-tight ${plan.highlighted ? "text-primary" : "text-white"}`}>
                        ${plan.priceNum}<span className="text-[10px] font-normal text-muted-foreground">/mes</span>
                      </p>
                      <ul className="space-y-1 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/70 leading-tight">
                            <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {selected === plan.name && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary">
                          <CheckCircle2 className="w-3 h-3" /> Seleccionado
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Pago seguro con Stripe
                </p>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Nombre completo"
                    />
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Email"
                    />
                  </div>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Número de tarjeta · · · ·"
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
                  Pago 100% seguro · SSL cifrado · Powered by Stripe
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
                    Procesando pago...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Pagar {selectedPlan?.price} — Activar {selected}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-muted-foreground">
                Puedes cancelar en cualquier momento · Sin permanencia
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
