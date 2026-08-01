import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Settings,
  Shield,
  CheckCircle2,
  Upload,
  Loader2,
  CreditCard,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ... (todo el código intermedio igual, hasta el popup)

{/* ✅ POPUP PROFESIONAL - VERSIÓN FINAL CON RADIO BUTTONS */}
{showPaymentModal && (
  <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2336] via-[#121827] to-[#0b1120] border border-yellow-400/60 shadow-[0_25px_80px_rgba(0,0,0,.65),0_0_40px_rgba(255,215,0,.15)]">
      
      {/* HEADER */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-black tracking-tight text-white">
            {isMa ? "اختر طريقة الدفع" : isEn ? "Select payment method" : "Selecciona tu método de pago"}
          </h2>
          <button
            onClick={() => setShowPaymentModal(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition shrink-0 text-white/60 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
        <p className="text-white/50 text-[13px] mt-1">
          {isMa ? "اختر كيف تفضل الدفع بأمان" : isEn ? "Choose how you prefer to pay securely" : "Elige cómo prefieres pagar de forma segura"}
        </p>
      </div>

      {/* OPCIONES DE PAGO */}
      <div className="space-y-2 px-4 pb-4 mt-3">
        
        {/* ✅ STRIPE - TARJETA */}
        <button
          onClick={() => {
            setShowPaymentModal(false);
            handlePay("stripe", selectedPlan);
          }}
          className="w-full rounded-xl border-2 border-yellow-500/80 bg-[#1a1a1a] p-2.5 hover:bg-[#222] transition hover:shadow-[0_0_25px_rgba(255,215,0,.12)] group relative"
        >
          <div className="flex items-center gap-3">
            {/* Radio button */}
            <div className="w-4 h-4 rounded-full border-2 border-yellow-500/50 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-left flex-1">
              <div className="text-white font-bold text-[15px]">
                {isMa ? "بطاقة (Stripe)" : isEn ? "Card (Stripe)" : "Tarjeta (Stripe)"}
              </div>
              <div className="text-white/50 text-[11px]">
                {isMa ? "ادفع بأمان ببطاقتك" : isEn ? "Pay securely with your card" : "Pago 100% seguro con tu tarjeta"}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <img src="/payment/visa.png" className="h-4 w-auto" alt="Visa" />
                <img src="/payment/mastercard.png" className="h-4 w-auto" alt="Mastercard" />
                <img src="/payment/apple-pay.png" className="h-4 w-auto" alt="Apple Pay" />
                <img src="/payment/google-pay.png" className="h-4 w-auto" alt="Google Pay" />
              </div>
            </div>
          </div>
        </button>

        {/* ✅ PAYPAL */}
        <button
          onClick={() => {
            setShowPaymentModal(false);
            handlePay("paypal", selectedPlan);
          }}
          className="w-full rounded-xl border border-white/10 bg-[#111827] p-2.5 hover:bg-[#182233] transition hover:border-blue-500/40 group relative"
        >
          <div className="flex items-center gap-3">
            {/* Radio button */}
            <div className="w-4 h-4 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0 group-hover:border-blue-500/50">
              <div className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.112 1.267 1.363 2.877 1.015 4.556-.335 1.598-1.17 2.926-2.268 3.787-.814.635-1.819 1.045-2.872 1.107-.334.019-.673.028-1.014.028h-3.19c-.435 0-.826.308-.932.731l-.43 1.873-.168.733-.164.717a.641.641 0 0 1-.633.74h-2.09l.467-2.064Z"/>
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className="text-white font-bold text-[15px]">PayPal</div>
              <div className="text-white/50 text-[11px]">
                {isMa ? "ادفع بسرعة وأمان" : isEn ? "Pay quickly and securely" : "Paga rápida y seguramente"}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <img src="/payment/paypal.png" className="h-4 w-auto" alt="PayPal" />
                <img src="/payment/visa.png" className="h-4 w-auto" alt="Visa" />
                <img src="/payment/mastercard.png" className="h-4 w-auto" alt="Mastercard" />
                <img src="/payment/amex.png" className="h-4 w-auto" alt="American Express" />
              </div>
            </div>
          </div>
        </button>

        {/* ✅ TRANSFERENCIA BANCARIA */}
        <button
          onClick={() => {
            setShowPaymentModal(false);
            handlePay("transfer", selectedPlan);
          }}
          className="w-full rounded-xl border border-white/10 bg-[#111827] p-2.5 hover:bg-[#222] transition hover:border-emerald-500/40 group relative"
        >
          <div className="flex items-center gap-3">
            {/* Radio button */}
            <div className="w-4 h-4 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-left flex-1">
              <div className="text-white font-bold text-[15px]">
                {isMa ? "تحويل بنكي" : isEn ? "Bank Transfer" : "Transferencia bancaria"}
              </div>
              <div className="text-white/50 text-[11px]">
                {isMa ? "ادفع مباشرة من بنكك" : isEn ? "Pay directly from your bank" : "Realiza el pago directamente desde tu banco"}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">SEPA</span>
                <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">IBAN</span>
                <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">BIC/SWIFT</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* FOOTER SEGURIDAD */}
      <div className="border-t border-white/5 px-4 py-3 mt-1">
        <div className="flex items-center justify-center gap-2 text-[11px] text-green-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            {isMa ? "دفع آمن 100% - مشفر SSL" : isEn ? "100% secure - SSL encrypted" : "Pago 100% seguro - Cifrado SSL"}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="text-[9px] text-white/30">
            {isMa ? "معالج بأمان بواسطة" : isEn ? "Processed securely by" : "Procesado de forma segura por"}
          </span>
          <span className="text-[10px] font-bold text-yellow-400/70">Stripe</span>
          <span className="text-white/20">•</span>
          <span className="text-[10px] font-bold text-blue-400/70">PayPal</span>
        </div>
      </div>
    </div>
  </div>
)}
