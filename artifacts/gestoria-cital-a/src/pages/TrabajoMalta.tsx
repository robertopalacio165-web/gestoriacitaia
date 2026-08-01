{/* ============================================ */}
{/* 9. CHECKBOX + BOTÓN DE PAGO */}
{/* ============================================ */}

<div className="col-span-1 lg:col-span-2 mt-2">
  <div className="flex items-start gap-3 mb-4">
    <input
      type="checkbox"
      id="acceptTerms"
      checked={acceptTerms}
      onChange={(e) => setAcceptTerms(e.target.checked)}
      className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060b16] text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 shrink-0"
    />
    <label htmlFor="acceptTerms" className="text-white/70 text-[11px] sm:text-[12px] leading-relaxed">
      {isMa
        ? "☑️ كنوافق أن GestoriaCitaIA تستعمل معلوماتي وتشارك CV ديالي مع شركات ووكالات التوظيف فمالطا. كنفاهم أن الخدمة غير كتساعد فإرسال الترشيحات وما كتقدمش عقد عمل وما كتضمنش التوظيف."
        : isEn
        ? "☑️ I agree that GestoriaCitaIA may use my data and share my CV with companies and employment agencies in Malta. I understand that this service only submits applications and does not provide employment contracts or guarantee hiring."
        : "☑️ Acepto que GestoriaCitaIA utilice mis datos y comparta mi CV con empresas y agencias de empleo en Malta. Entiendo que este servicio solo envía candidaturas y no ofrece contratos de trabajo ni garantiza la contratación."}
    </label>
  </div>

  <p className="text-white/30 text-[10px] text-center mb-3">
    {isMa
      ? "🔒 سيتم مشاركة معلوماتك فقط مع الشركات ووكالات التوظيف في مالطا للبحث عن عمل."
      : isEn
      ? "🔒 Your information will only be shared with companies and employment agencies in Malta to find work."
      : "🔒 Tu información solo será compartida con empresas y agencias de empleo en Malta para buscar trabajo."}
  </p>

  {/* ✅ UN SOLO BOTÓN - FLUJO LIMPIO */}
  <button
    type="button"
    onClick={() => setShowPaymentModal(true)}
    disabled={!acceptTerms}
    className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 py-4 text-black font-bold shadow-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
  >
    🚀 Empezar búsqueda ahora ({selectedPlan === "weekly" ? "9,99€" : "19,99€"})
    <div className="text-xs mt-1 text-black/70">
      Elegir método de pago
    </div>
  </button>

  <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-300">
    <Shield className="w-3 h-3 text-yellow-400" />
    <span>
      {isMa
        ? "دفع آمن عبر Stripe"
        : isEn
        ? "Secure payment with Stripe"
        : "Pago seguro con Stripe"}
    </span>
  </div>

  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#1434CB]">VISA</span>
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#EB001B]">Mastercard</span>
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">PayPal</span>
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">G Pay</span>
  </div>
</div>

{/* ✅ POPUP - SE MANTIENE EXACTAMENTE IGUAL */}
{showPaymentModal && (
  <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
    <div className="w-full max-w-md rounded-3xl bg-[#10131d] border border-white/10 p-6">
      <h2 className="text-center text-2xl font-bold text-white">
        {isMa ? "اختر طريقة الدفع" : isEn ? "Select payment method" : "Selecciona método de pago"}
      </h2>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => {
            setShowPaymentModal(false);
            onPay(selectedPlan);
          }}
          className="w-full rounded-2xl bg-yellow-500 py-4 font-bold text-black hover:bg-yellow-400 transition"
        >
          💳 Tarjeta (Stripe)
        </button>

        <button
          className="w-full rounded-2xl bg-[#0070BA] py-4 font-bold text-white hover:bg-[#005a8c] transition"
        >
          🟦 PayPal
        </button>

        <button
          className="w-full rounded-2xl bg-neutral-900 border border-white/20 py-4 font-bold text-white hover:bg-neutral-800 transition"
        >
          🏦 Transferencia bancaria
        </button>
      </div>

      <button
        onClick={() => setShowPaymentModal(false)}
        className="mt-6 w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 transition"
      >
        {isMa ? "إلغاء" : isEn ? "Cancel" : "Cancelar"}
      </button>
    </div>
  </div>
)}
