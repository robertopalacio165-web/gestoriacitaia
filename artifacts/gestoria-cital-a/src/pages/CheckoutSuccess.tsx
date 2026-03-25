import { useEffect, useState } from "react";
import { CheckCircle2, ArrowRight, Home } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";

export default function CheckoutSuccess() {
  const { t } = useLang();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        className="glass-panel-heavy border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </motion.div>

        <h1 className="text-2xl font-black text-white mb-2">
          {t("checkout_success_title") || "¡Pago completado!"}
        </h1>
        <p className="text-white/60 text-sm mb-6">
          {t("checkout_success_desc") || "Tu suscripción está activa. Nuestros agentes IA ya están trabajando para ti."}
        </p>

        {sessionId && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 mb-6 text-xs text-white/40 break-all">
            Ref: {sessionId}
          </div>
        )}

        <div className="flex items-center gap-3 justify-center">
          <div className="flex gap-3">
            <Link href="/panel">
              <motion.button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t("checkout_go_panel") || "Ir a mi Panel"}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <Link href="/">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white/70 text-sm transition-all">
                <Home className="w-4 h-4" />
                {t("checkout_home") || "Inicio"}
              </button>
            </Link>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-white/30">
          <img src={`${import.meta.env.BASE_URL}images/avatar-sara.png`} alt="Sara" className="w-6 h-6 rounded-full border border-primary/30 object-cover object-top" />
          <span>{t("checkout_sara_msg") || "Sara te está buscando citas disponibles ahora mismo."}</span>
        </div>
      </motion.div>
    </div>
  );
}
