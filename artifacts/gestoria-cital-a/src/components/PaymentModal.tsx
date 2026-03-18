import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, CreditCard, Shield } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

const MODAL_PLANS: Plan[] = [
  {
    name: "BÁSICO",
    price: "$12.99/mes",
    features: ["1 cita al mes", "Agente IA 24/7", "PDF + WhatsApp"],
  },
  {
    name: "ESTÁNDAR",
    price: "$19.99/mes",
    features: ["3 citas al mes", "3 trámites", "Videollamada", "Aviso WhatsApp"],
    highlighted: true,
  },
  {
    name: "PRO",
    price: "$27.99/mes",
    features: ["Ilimitado", "Agente dedicado", "Soporte urgente", "20% desc."],
  },
];

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  agentMessage?: string;
}

export function PaymentModal({ open, onClose, onSelectPlan, agentMessage }: PaymentModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-2xl glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Header with agent bubble */}
            <div className="bg-gradient-to-r from-green-900/40 to-blue-900/30 px-6 pt-6 pb-4 border-b border-white/10">
              <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shrink-0">
                  <img
                    src="images/avatar-sara.png"
                    alt="Sara"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-primary mb-0.5">Sara · Asistente de Citas</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-3">
                    <p className="text-sm text-white/90 leading-relaxed">
                      {agentMessage || "Para continuar con tu trámite y reservar tu cita, necesitas activar un plan. ¡Elige el que mejor se adapta a ti!"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plans */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-5">
                {MODAL_PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className={`rounded-xl p-4 flex flex-col border transition-all cursor-pointer hover:scale-[1.02] ${
                      plan.highlighted
                        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => onSelectPlan(plan.name)}
                  >
                    {plan.highlighted && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Recomendado</span>
                    )}
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{plan.name}</p>
                    <p className={`text-lg font-black mb-3 ${plan.highlighted ? "text-primary" : "text-white"}`}>{plan.price}</p>
                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-white/70">
                          <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => onSelectPlan(plan.name)}
                      className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                        plan.highlighted
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-white/10 hover:bg-white/15 text-white border border-white/15"
                      }`}
                    >
                      Elegir plan
                    </button>
                  </div>
                ))}
              </div>

              {/* Payment form preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Pago seguro con Stripe
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" placeholder="Nombre completo" />
                  <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" placeholder="Email" />
                  <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 col-span-2" placeholder="Número de tarjeta" />
                  <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" placeholder="MM/AA" />
                  <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" placeholder="CVV" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Shield className="w-3 h-3 text-primary" />
                  Pago 100% seguro · SSL cifrado · Powered by Stripe
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
