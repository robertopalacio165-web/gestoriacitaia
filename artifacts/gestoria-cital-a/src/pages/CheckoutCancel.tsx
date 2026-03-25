import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";

export default function CheckoutCancel() {
  const { t } = useLang();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        className="glass-panel-heavy border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <XCircle className="w-10 h-10 text-orange-400" />
        </motion.div>

        <h1 className="text-2xl font-black text-white mb-2">
          {t("checkout_cancel_title") || "Pago cancelado"}
        </h1>
        <p className="text-white/60 text-sm mb-6">
          {t("checkout_cancel_desc") || "No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras."}
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/">
            <motion.button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              {t("checkout_retry") || "Volver a intentar"}
            </motion.button>
          </Link>
          <Link href="/">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white/70 text-sm transition-all">
              <ArrowLeft className="w-4 h-4" />
              {t("checkout_home") || "Inicio"}
            </button>
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-white/30">
          <img src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`} alt="Khalid" className="w-6 h-6 rounded-full border border-white/20 object-cover object-top" />
          <span>{t("checkout_khalid_msg") || "Khalid puede ayudarte a elegir el plan adecuado."}</span>
        </div>
      </motion.div>
    </div>
  );
}
