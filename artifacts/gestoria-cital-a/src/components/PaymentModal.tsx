import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  X,
  Shield,
  ChevronRight,
  CreditCard,
} from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  agentMessage?: string;
}

type PlanId = "cita" | "reg" | "std";

export function PaymentModal({
  open,
  onClose,
  onSelectPlan,
  agentMessage,
}: PaymentModalProps) {
  const [selected, setSelected] = useState<PlanId>("std");

  const plans = [
    {
      id: "cita" as PlanId,
      name: "PLAN CITAS",
      price: "9.99€/mes",
      priceNum: "9.99",
      highlighted: false,
      accentClass: "border-green-500/40 bg-green-900/10",
      features: [
        "Búsqueda de citas 24/7",
        "Intentos automáticos continuos",
        "Aviso cuando aparezca cita",
        "Seguimiento prioritario",
        "Soporte del agente IA",
      ],
    },
    {
      id: "reg" as PlanId,
      name: "PLAN REGULARIZACIÓN",
      price: "9.99€/mes",
      priceNum: "9.99",
      highlighted: false,
      accentClass: "border-orange-500/40 bg-orange-900/10",
      features: [
        "Evaluación del caso",
        "Revisión de documentos",
        "Guía paso a paso",
        "Formularios orientativos",
        "Seguimiento del expediente",
      ],
    },
    {
      id: "std" as PlanId,
      name: "PLAN ESTÁNDAR",
      price: "19.99€/mes",
      priceNum: "19.99",
      highlighted: true,
      accentClass: "border-primary/50 bg-primary/15",
      features: [
        "Todo lo del plan citas",
        "Todo lo del plan regularización",
        "Más prioridad",
        "Soporte ampliado",
        "Gestión más rápida",
        "Acceso completo",
        "Mejor seguimiento",
      ],
    },
  ];

  const selectedPlan = plans.find((p) => p.id === selected) ?? plans[2];

  const handleActivate = () => {
    onSelectPlan(selectedPlan.name);
    onClose();
  };

  const handleClose = () => {
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
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            className="relative z-10 w-full sm:max-w-lg glass-panel-heavy border border-white/10 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[92dvh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="bg-gradient-to-r from-green-900/40 to-blue-900/30 px-4 pt-5 pb-4 border-b border-white/10 sticky top-0 z-10 glass-panel-heavy">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                type="button"
              >
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
                  <p className="text-xs font-bold text-primary mb-0.5">
                    Sara · Buscar Citas · 24/7
                  </p>

                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-2.5">
                    <p className="text-xs text-white/90 leading-relaxed">
                      {agentMessage ||
                        "Para reservar tu cita y continuar con el proceso, activa tu plan. Yo te guío paso a paso."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">
                  Elige tu plan
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      type="button"
                      className={`rounded-xl p-3 flex flex-col border transition-all text-left ${
                        selected === plan.id
                          ? `${plan.accentClass} shadow-lg`
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {plan.highlighted && (
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">
                          ⭐ RECOMENDADO
                        </span>
                      )}

                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        {plan.name}
                      </p>

                      <p
                        className={`text-xl font-black mb-2 leading-tight ${
                          plan.highlighted ? "text-primary" : "text-white"
                        }`}
                      >
                        {plan.priceNum}€
                        <span className="text-[10px] font-normal text-muted-foreground">
                          /mes
                        </span>
                      </p>

                      <ul className="space-y-1 flex-1">
                        {plan.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-1.5 text-[11px] text-white/70 leading-tight"
                          >
                            <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {selected === plan.id && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary">
                          <CheckCircle2 className="w-3 h-3" />
                          Seleccionado
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-400 font-semibold text-sm mb-1">
                  Activación del servicio
                </p>

                <p className="text-white/80 text-xs mb-3 leading-relaxed">
                  Para continuar con tu trámite, activa tu plan. Después del
                  pago seguimos contigo paso a paso hasta terminar el proceso.
                </p>
              </div>

              <button
                onClick={handleActivate}
                type="button"
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                Activar ahora
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
                <Shield className="w-3 h-3 text-primary shrink-0" />
                Pago seguro
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
