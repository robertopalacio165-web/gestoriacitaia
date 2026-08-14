import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Settings,
  Mic,
  MicOff,
  RefreshCw,
  Shield,
  Bell,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ChatMsg {
  from: "agent" | "user";
  text: string;
  ts?: number;
}

type DocState = "ok" | "warn" | "missing";

type DocItem = {
  nombre: string;
  estado: DocState;
};

type FormItem = {
  nombre: string;
  codigo: string;
  url: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  nie: string | null;
};

type ClientFormData = {
  fullName: string;
  phone: string;
  email: string;
  expedienteNumero: string;
  identificadorSolicitud: string;
  fechaPresentacion: string;
  fechaNacimiento: string;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  preferredOffice: string;
  nie: string;
};

function OfficialBrowserBox({
  language,
  avatarImage,
  title,
  url,
  profileLoading,
  ui,
  confirmed,
  formData,
  onFormChange,
  onFormSubmit,
  formReady,
  onPay,
  acceptTerms,
  setAcceptTerms,
}: {
  language: string;
  avatarImage: string;
  title: string;
  url: string;
  profileLoading: boolean;
  ui: any;
  confirmed: boolean;
  formData: ClientFormData;
  onFormChange: (field: keyof ClientFormData, value: string) => void;
  onFormSubmit: () => void;
  formReady: boolean;
  onPay: () => void;
  acceptTerms: boolean;
  setAcceptTerms: (value: boolean) => void;
}) {
  const isMa = language === "ma";
  const isEn = language === "en";
  const { toast } = useToast();

  const formIntro = isMa
    ? "إلى بغيتي تتابع الملف ديالك وتخرج رقم الضمان الاجتماعي وتدير فتح التسجيل، عمر الفورم وغادي نخبروك فالواتساب ملي يخرج ليك favorable."
    : isEn
    ? "If you need to follow your file, get your Social Security number and open registration, fill in the form. We will notify you on WhatsApp when your file is favorable."
    : "Si necesitas seguir tu expediente, sacar tu número de Seguridad Social y abrir alta, rellena el formulario. Te avisamos por WhatsApp cuando tengas favorable.";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className="flex-1 flex flex-col overflow-hidden bg-transparent"
    >
      <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 text-black">
        {confirmed ? (
          <div className="rounded-[26px] border border-emerald-500/40 bg-[#07111f] px-6 py-8 text-center">
            <h2 className="text-emerald-400 text-3xl font-black mb-4">
              {isMa
                ? "🎉 مبروك! تأكد الملف ديالك"
                : isEn
                ? "🎉 FILE CONFIRMED!"
                : "🎉 ¡EXPEDIENTE CONFIRMADO!"}
            </h2>
            <p className="text-white text-lg font-bold mb-4">
              {isMa
                ? "شكراً بزاف على الثقة ديالك في GestoriaCitaIA."
                : isEn
                ? "Thank you for trusting GestoriaCitaIA."
                : "Muchas gracias por confiar en GestoriaCitaIA."}
            </p>
            <p className="text-white/80">
              {isMa
                ? "تم تأكيد الملف ديالك بنجاح."
                : isEn
                ? "Your file has been successfully confirmed."
                : "Tu expediente ha sido confirmado correctamente."}
            </p>
            <p className="text-white/80 mt-2">
              {isMa
                ? "سارة سالات الخدمة ديالها بنجاح."
                : isEn
                ? "Sara has successfully completed her work."
                : "Sara ha finalizado su trabajo con éxito."}
            </p>
            <p className="text-yellow-400 font-bold mt-4">
              {isMa
                ? "✅ العملية كملت بنجاح"
                : isEn
                ? "✅ Process completed"
                : "✅ Proceso completado"}
            </p>
            <p className="text-white/70 mt-6">
              {isMa
                ? "نتمنّاو ليك التوفيق فالإجراء ديالك."
                : isEn
                ? "We wish you the best of luck with your procedure."
                : "Te deseamos mucha suerte en tu trámite."}
            </p>
          </div>
        ) : !confirmed && !formReady ? (
          <>
            <div className="mt-3 mx-[-4px] rounded-[24px] border-2 border-yellow-500/60 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-3 py-3 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
              <div className="mb-3 grid grid-cols-[32px_1fr_32px] items-center gap-2">
                <span />
                <h2 className="text-center text-yellow-400 text-[18px] sm:text-[20px] font-black leading-tight">
                  {isMa ? "عمر الفورم" : isEn ? "Fill in the form" : "Rellena el formulario"}
                </h2>
                <img
                  src="https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg"
                  alt="España"
                  className="h-5 w-8 rounded-[3px] object-cover shadow-[0_0_10px_rgba(255,255,255,0.20)]"
                />
              </div>
              <p className="text-white/80 text-[13px] leading-relaxed mb-5">
                {formIntro}
              </p>
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                  {/* Nombre */}
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الاسم الكامل" : isEn ? "Full name" : "Nombre completo"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "دخل سميتك" : isEn ? "Your name" : "Escribe tu nombre"}
                      value={formData.fullName}
                      onChange={(e) => onFormChange("fullName", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* Teléfono internacional */}
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الهاتف" : isEn ? "Phone" : "Teléfono"}
                    </label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        className="w-[92px] shrink-0 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-2 text-center text-white"
                        value={formData.preferredOffice}
                        onChange={(e) => onFormChange("preferredOffice", e.target.value)}
                        id="countryCode"
                      >
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+212">🇲🇦 +212</option>
                        <option value="+31">🇳🇱 +31</option>
                        <option value="+32">🇧🇪 +32</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+39">🇮🇹 +39</option>
                        <option value="+49">🇩🇪 +49</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+1">🇺🇸 +1</option>
                      </select>
                      <input
                        type="text"
               placeholder="Número de WhatsApp"
                        value={formData.phone}
                        onChange={(e) => onFormChange("phone", e.target.value)}
                        className="min-w-0 flex-1 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => onFormChange("email", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* Número de expediente */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "رقم الملف" : isEn ? "File number" : "Número de expediente"}
                    </label>
                    <input
                      type="text"
                      placeholder="467020260019841"
                      value={formData.expedienteNumero || ""}
                      onChange={(e) => onFormChange("expedienteNumero", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Identificador solicitud */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "محدد الطلب" : isEn ? "Request identifier" : "Identificador solicitud"}
                    </label>
                    <input
                      type="text"
                      placeholder="E46202600507573"
                      value={formData.identificadorSolicitud || ""}
                      onChange={(e) => onFormChange("identificadorSolicitud", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Fecha presentación solicitud */}
                  <div className="min-w-0">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "تاريخ تقديم الطلب" : isEn ? "Application date" : "Fecha presentación solicitud"}
                    </label>
                    <input
                      type="date"
                      value={formData.fechaPresentacion || ""}
                      onChange={(e) => onFormChange("fechaPresentacion", e.target.value)}
                      className="block w-full max-w-full min-w-0 h-[52px] box-border appearance-none rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white [color-scheme:dark]"
                    />
                  </div>

                  {/* Fecha nacimiento */}
                  <div className="min-w-0">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "تاريخ الميلاد" : isEn ? "Birth date" : "Fecha nacimiento"}
                    </label>
                    <input
                      type="date"
                      value={formData.fechaNacimiento || ""}
                      onChange={(e) => onFormChange("fechaNacimiento", e.target.value)}
                      className="block w-full max-w-full min-w-0 h-[52px] box-border appearance-none rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white [color-scheme:dark]"
                    />
                  </div>

                  {/* NIE */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      NIE
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "X1234567Z أو Y7654321X" : isEn ? "X1234567Z or Y7654321X" : "X1234567Z o Y7654321X"}
                      value={formData.nie || ""}
                      onChange={(e) => onFormChange("nie", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "العنوان الكامل" : isEn ? "Full address" : "Dirección completa"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "الشارع والرقم" : isEn ? "Street and number" : "Calle y número"}
                      value={formData.direccion || ""}
                      onChange={(e) => onFormChange("direccion", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Código Postal */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الرمز البريدي" : isEn ? "Postal code" : "Código Postal"}
                    </label>
                    <input
                      type="text"
                      placeholder="28001"
                      value={formData.codigoPostal || ""}
                      onChange={(e) => onFormChange("codigoPostal", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Ciudad */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المدينة" : isEn ? "City" : "Ciudad"}
                    </label>
                    <input
                      type="text"
                      placeholder="Madrid"
                      value={formData.ciudad || ""}
                      onChange={(e) => onFormChange("ciudad", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Provincia */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المقاطعة" : isEn ? "Province" : "Provincia"}
                    </label>
                    <input
                      type="text"
                      placeholder="Madrid"
                      value={formData.provincia || ""}
                      onChange={(e) => onFormChange("provincia", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Caja de pago con Checkbox */}
                  <div className="col-span-1 lg:col-span-2 mt-4 rounded-[28px] border-2 border-yellow-500 bg-gradient-to-b from-[#0b0b0b] to-[#050505] p-4 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
                    <div className="flex items-start justify-between mb-4 pt-2">
                      <div>
                        <p className="text-white text-[15px] font-bold">
                          {isMa
                            ? "متابعة الملف + NUSS + طاكسا 790"
                            : isEn
                            ? "File Tracking + NUSS + Fee 790"
                            : "Seguimiento Expediente + NUSS + Tasa 790"}
                        </p>
                        <span className="inline-flex mt-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]">
                          Premium
                        </span>
                      </div>
                      <div className="text-right">
                        {/* ✅ PRECIO ACTUALIZADO A 14,99€ */}
                        <p className="text-yellow-400 text-[34px] font-black leading-none drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
                          14,99€
                        </p>
                        {/* ✅ TEXTO ACTUALIZADO A "Pago único" */}
                        <p className="text-yellow-300 text-[11px] font-semibold">
                          {isMa ? "خلاص مرة وحدة" : isEn ? "One-time payment" : "Pago único"}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-300 text-[13px] mb-5 leading-relaxed">
                      {isMa
                        ? "سارة غادي تراقب الملف ديالك 24/24. ملي يخرج القبول غادي توصلك رسالة فواتساب. من بعد غادي نجيبو ليك NUSS ونصيفطو ليك طاكسا 790 معمرة وجاهزة للأداء."
                        : isEn
                        ? "Sara will monitor your file 24/7. When it becomes FAVORABLE you will receive a WhatsApp notification. Then we will obtain your NUSS and send you the completed Fee 790."
                        : "Sara vigilará tu expediente 24/24. Cuando salga FAVORABLE recibirás un aviso por WhatsApp. Después obtendremos tu NUSS y recibirás la tasa 790 lista para pagar."}
                    </p>

                    {/* Checkbox de aceptación */}
                    <div className="flex items-start gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060b16] text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0"
                      />
                      <label htmlFor="acceptTerms" className="text-white/70 text-[12px] leading-relaxed">
                        {isMa
                          ? "☑️ نوافق على أن تقوم GestoriaCitaIA بمتابعة ملفي بشكل تلقائي."
                          : isEn
                          ? "☑️ I agree that GestoriaCitaIA performs automatic monitoring of my file."
                          : "☑️ Acepto que GestoriaCitaIA realice el seguimiento automático de mi expediente."}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={onPay}
                      className="w-full min-h-[56px] rounded-[20px] bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 px-4 py-2 text-[15px] leading-tight font-black text-black shadow-[0_0_30px_rgba(255,215,0,0.35)] transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!acceptTerms}
                    >
                      {isMa
                        ? "🔐 خلص وبدأ التحقق"
                        : isEn
                        ? "🔐 Pay and start verification"
                        : "🔐 Pagar y empezar verificación"}
                    </button>

                    <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-300">
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
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black"> Pay</span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">G Pay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-[26px] border border-emerald-500/40 bg-[#07111f] px-5 py-7 mb-5 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full border-2 border-emerald-400 bg-emerald-500/15 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-center text-white text-[18px] font-semibold leading-tight mb-3">
                {isMa
                  ? "مبروك 🎉 بدينا نراجعو الملف ديالك. ملي يخرج favorable غادي نعلموك فالواتساب بشكل مستعجل."
                  : isEn
                  ? "Congratulations 🎉 We have started checking your file. As soon as it becomes favorable, we will urgently notify you on WhatsApp."
                  : "Felicidades 🎉 Hemos empezado a verificar tu expediente. En cuanto salga favorable te avisaremos urgentemente por WhatsApp."}
              </h3>
              <p className="text-center text-white/70 text-[14px] leading-relaxed">
                {isMa
                  ? "غادي نخبروك هنا ملي يكون جديد على الملف ديالك."
                  : isEn
                  ? "We will notify you here when there is news about your file."
                  : "Te avisaremos aquí cuando haya novedades sobre tu expediente."}
              </p>

              <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-yellow-300 font-bold text-sm">
                    {isMa
                      ? "سارة كتراقب الملف 24/24"
                      : isEn
                      ? "Sara monitoring file 24/7"
                      : "Sara verificando expediente 24/24"}
                  </p>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  {isMa
                    ? "سارة غادي تراقب الملف ديالك 24/24. ملي يخرج القبول غادي توصلك رسالة فواتساب. من بعد غادي نجيبو ليك NUSS ونصيفطو ليك طاكسا 790 معمرة وجاهزة للأداء."
                    : isEn
                    ? "Sara will monitor your file 24/7. When it becomes FAVORABLE you will receive a WhatsApp notification. Then we will obtain your NUSS and send you the completed Fee 790."
                    : "Sara vigilará tu expediente 24/24. Cuando salga FAVORABLE recibirás un aviso por WhatsApp. Después obtendremos tu NUSS y recibirás la tasa 790 lista para pagar."}
                </p>
              </div>
            </div>

            <div className="rounded-[30px] overflow-hidden border border-yellow-500/30 bg-[#050816] shadow-[0_0_40px_rgba(255,200,0,0.10)]">
              <div className="px-6 py-8 bg-[radial-gradient(circle_at_top,rgba(255,200,0,0.12),transparent_60%)]">
                <div className="flex justify-center mb-5">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg"
                    alt="España"
                    className="w-20 h-14 object-cover rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/20"
                  />
                </div>

                <h2 className="text-center text-[#f6d06f] text-[36px] leading-[42px] font-black mb-5">
                  {isMa
                    ? "متابعة الملف بثقة"
                    : isEn
                    ? "File Follow-up with Confidence"
                    : "Seguimiento de expediente con confianza"}
                </h2>

                <p className="text-center text-white/75 text-[15px] leading-relaxed mb-8">
                  {isMa
                    ? "كنعاونوك تتابع الملف ديالك وتخرج رقم الضمان الاجتماعي وتفتح alta بطريقة آمنة أونلاين."
                    : isEn
                    ? "We help you follow your file, get your Social Security number and open registration securely online."
                    : "Te ayudamos a seguir tu expediente, sacar tu número de Seguridad Social y abrir alta de forma segura online."}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Shield className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "عملية آمنة" : isEn ? "Secure process" : "Proceso seguro"}
                    </p>
                  </div>
                  <div>
                    <Bell className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "مساعدة للمهاجرين" : isEn ? "Immigration support" : "Atención a inmigrantes"}
                    </p>
                  </div>
                  <div>
                    <CheckCircle2 className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "متابعة مضمونة" : isEn ? "Guaranteed follow-up" : "Seguimiento garantizado"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center text-[#f6d06f] text-[24px] font-bold">
                  {isMa
                    ? "« خدمتك كتبدا بملف واضح. »"
                    : isEn
                    ? "\" Your process starts with a clear file. \""
                    : "\" Tu trámite empieza con un expediente claro. \""}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function BuscarCitas() {
  const { lang } = useLang();
  const language = lang === "darija" ? "ma" : lang;

  const [location] = useLocation();
  const [muted, setMuted] = useState(false);
  const [confirmed, setConfirmed] = useState(
    new URLSearchParams(window.location.search).get("success") === "true"
  );
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    fullName: "",
    phone: "",
    email: "",
    expedienteNumero: "",
    identificadorSolicitud: "",
    fechaPresentacion: "",
    fechaNacimiento: "",
    direccion: "",
    codigoPostal: "",
    ciudad: "",
    provincia: "",
    preferredOffice: "+34",
    nie: "",
  });
  const [formReady, setFormReady] = useState(
    localStorage.getItem("saraPaid") === "1"
  );
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [waitingSara, setWaitingSara] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<ChatMsg[]>([]);
  const [lastUserTranscript, setLastUserTranscript] = useState("");

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDcRef = useRef<RTCDataChannel | null>(null);
  const realtimeLocalStreamRef = useRef<MediaStream | null>(null);
  const assistantTextBufferRef = useRef("");
  const lastUserTranscriptRef = useRef("");
  const lastAssistantTextRef = useRef("");
  const shouldKickoffSaraRef = useRef(false);

  const { toast } = useToast();

  const isMa = language === "ma";
  const isEn = language === "en";

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "السلام عليكم مرحبا بك في هيستوريا إي آي أنا سارة غادي نعاونك باش تتابع الملف ديالك وتخرج رقم الضمان الاجتماعي وتفتح alta. عمر ليا الفورمولار وغادي نبداو.",
      savedLeadReply:
        "مزيان دابا توصلنا بالمعلومة ديالك غادي نبداو نتابعو الملف ديالك 24/24.",
      confirmMsg:
        "مبروك عليك تأكدات الملف ديالك شكرا على الثقة ديالك في هيستوريا إي آي",
    }),
    []
  );

  const ui = useMemo(() => {
    return {
      docsByTramite: {
        tie: [
          { nombre: "Pasaporte o NIE vigente", estado: "ok" as DocState },
          { nombre: "Empadronamiento actual", estado: "ok" as DocState },
        ],
      } as Record<string, DocItem[]>,

      formsByTramite: {
        tie: [
          { nombre: "Formulario EX-17", codigo: "EX-17", url: "https://example.com" },
        ],
      } as Record<string, FormItem[]>,

      online: isMa ? "أونلاين" : isEn ? "Online" : "En línea",

      agentRole: isMa
        ? "متابعة الملفات"
        : isEn
        ? "File Tracking Assistant"
        : "Asesora de Expedientes",

      loadingUserData: isMa
        ? "جاري تحميل المعلومات..."
        : isEn
        ? "Loading user data..."
        : "Cargando datos del usuario...",

      govSmall: "extranjería:",
      govTitle: "FAVORABLE · NUSS · TASA 790",
      govLine1: "SEGUIMIENTO EXPEDIENTE",
      govLine2: "AUTOMÁTICO 24/24",
      govLine3: "NOTIFICACIÓN WHATSAPP",

      confirmTitle: isMa ? "تم تأكيد الملف!" : isEn ? "FILE CONFIRMED!" : "¡EXPEDIENTE CONFIRMADO!",

      date: isMa ? "التاريخ" : isEn ? "Date" : "Fecha",
      time: isMa ? "الوقت" : isEn ? "Time" : "Hora",
      office: isMa ? "المكتب" : isEn ? "Office" : "Oficina",
      appointmentNumber: isMa ? "رقم الملف" : isEn ? "File Number" : "Nº Expediente",

      reservationSaved: isMa
        ? "تم حفظ الملف"
        : isEn
        ? "File saved"
        : "Expediente guardado correctamente",

      sourceLabel: isMa ? "المصدر الرسمي" : isEn ? "Official source" : "Fuente oficial",

      voiceButton: isMa
        ? "تكلم مع سارة حول الملف"
        : isEn
        ? "Talk with Sara about your file"
        : "Hablar con Sara sobre tu expediente",
      stopButton: isMa ? "وقف الميكرو" : isEn ? "Stop microphone" : "Parar micrófono",

      latestReply: isMa ? "آخر رد من سارة" : isEn ? "Latest Sara reply" : "Última respuesta de Sara",
      yourVoice: isMa ? "آخر كلام ديالك" : isEn ? "Your latest voice" : "Tu última respuesta por voz",
      listening: isMa ? "سارة كتسمع ليك..." : isEn ? "Sara is listening..." : "Sara te está escuchando ahora...",

      saveTitle: isMa ? "تم حفظ المعلومات" : isEn ? "Data saved" : "Datos guardados",
      saveDesc: isMa ? "سارة غادي تكمل معاك" : isEn ? "Sara can continue now." : "Sara ya puede continuar contigo.",

      missingTitle: isMa ? "معلومات ناقصة" : isEn ? "Missing data" : "Faltan datos",
      missingDesc: isMa
        ? "دخل الاسم والهاتف والمدينة"
        : isEn
        ? "Fill name, phone and city."
        : "Rellena nombre, teléfono y ciudad antes de continuar.",

      openRealtimeError: isMa
        ? "المتصفح ما كيدعمش الصوت"
        : isEn
        ? "Browser does not support audio."
        : "Este navegador no soporta audio. Usa Chrome moderno.",

      docsButton: isMa ? "الوثائق" : isEn ? "Documents" : "Documentos",
      formsButton: isMa ? "الاستمارات" : isEn ? "Forms" : "Formularios",
      docsRequiredTitle: isMa ? "الوثائق المطلوبة" : isEn ? "Required documents" : "Documentos requeridos",
      formsOfficialTitle: isMa ? "الاستمارات الرسمية" : isEn ? "Official forms" : "Formularios oficiales",

      pageTitle: isMa
        ? "تتبع الملف"
        : isEn
        ? "File Tracking"
        : "Seguimiento de Expediente",

      agentSavedMsg: isMa
        ? "مزيان. دابا غادي نبداو نتابعو الملف ديالك. غادي نخبروك فالواتساب في أقل من 24 ساعة."
        : isEn
        ? "Perfect. We are already tracking your file. We will notify you on WhatsApp within 24 hours."
        : "Perfecto. Ya estamos rastreando tu expediente. Te avisaremos por WhatsApp en menos de 24h.",

      stripeErrorTitle: isMa ? "خطأ في الدفع" : isEn ? "Payment error" : "Error Stripe",
      stripeErrorDesc: isMa ? "ما قدرناش نفتحو الدفع" : isEn ? "Could not open payment." : "No se pudo abrir el pago",

      saveErrorTitle: isMa ? "خطأ" : isEn ? "Error" : "Error",
      saveErrorDesc: isMa ? "ما قدرناش نحفظو المعلومات" : isEn ? "Could not save data." : "No se pudo guardar el cliente",

      panelUpdated: isMa ? "تحدث اللوحة" : isEn ? "Panel updated" : "Panel actualizado",
    };
  }, [language]);

  const docsForSelectedTramite = ui.docsByTramite.tie;
  const formsForSelectedTramite = ui.formsByTramite.tie;

  const voiceStorageKey = useMemo(() => {
    const userId = profile?.id || "guest";
    return `gestoriacitaia_sara_voice_${userId}`;
  }, [profile?.id]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      typeof window.RTCPeerConnection !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setVoiceSupported(Boolean(supported));
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user?.id) {
          setProfile(null);
          setProfileLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,full_name,phone,nie")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          setProfile(null);
        } else {
  const profileData = (data as ProfileRow | null) ?? null;

  setProfile(profileData);

  // Acceso administrador (sin pagar)
  if (
    profileData?.email?.toLowerCase() ===
    "robertopalacio165@gmail.com"
  ) {
    setFormReady(true);
  }
}
      } catch {
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: profile?.full_name?.trim() || prev.fullName,
    phone: "",
      nie: profile?.nie?.trim() || prev.nie,
    }));
  }, [profile?.full_name, profile?.phone, profile?.nie]);

  useEffect(() => {
    if (!voiceStorageKey) return;
    try {
      const raw = localStorage.getItem(voiceStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVoiceHistory(parsed);
          return;
        }
      }
      setVoiceHistory([{ from: "agent", text: voiceTexts.initialVoice, ts: Date.now() }]);
    } catch {
      setVoiceHistory([{ from: "agent", text: voiceTexts.initialVoice, ts: Date.now() }]);
    }
  }, [voiceStorageKey, voiceTexts.initialVoice]);

  useEffect(() => {
    if (!voiceStorageKey || voiceHistory.length === 0) return;
    localStorage.setItem(voiceStorageKey, JSON.stringify(voiceHistory));
  }, [voiceHistory, voiceStorageKey]);

  const pushAgentMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [...prev, { from: "agent", text, ts: Date.now() }]);
    lastAssistantTextRef.current = text;
  };

  const pushUserMessage = (text: string) => {
    if (!text?.trim()) return;
    setVoiceHistory((prev) => [...prev, { from: "user", text, ts: Date.now() }]);
    setLastUserTranscript(text);
  };

  const finalizeAssistantBuffer = () => {
    const text = assistantTextBufferRef.current.trim();
    if (!text) return;
    assistantTextBufferRef.current = "";
    if (text === "..." || text === "…") return;
    if (text === lastAssistantTextRef.current) return;
    pushAgentMessage(text);
  };

  const sendSaraSpokenMessage = (message: string) => {
    if (!message.trim()) return;
    if (!realtimeDcRef.current || realtimeDcRef.current.readyState !== "open") return;
    if (!realtimePcRef.current || !realtimePcRef.current.remoteDescription) return;
    setWaitingSara(true);
    assistantTextBufferRef.current = "";
    realtimeDcRef.current.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `ابدئي أنتِ الكلام الآن مباشرة. لا تنتظري العميل. قولي الآن هذا الكلام بصوت طبيعي وبشكل بشري: ${message}`,
            },
          ],
        },
      })
    );
    realtimeDcRef.current.send(
      JSON.stringify({ type: "response.create", response: { modalities: ["audio", "text"] } })
    );
  };

  const kickoffSara = () => {
    setIsListening(true);
    setWaitingSara(true);
    setLastUserTranscript("");
    lastUserTranscriptRef.current = "";
    assistantTextBufferRef.current = "";
    const firstMessage = formReady ? voiceTexts.savedLeadReply : voiceTexts.initialVoice;
    sendSaraSpokenMessage(firstMessage);
  };

  const stopListening = () => {
    try {
      realtimeDcRef.current?.close();
      realtimeDcRef.current = null;
      realtimePcRef.current?.close();
      realtimePcRef.current = null;
      if (realtimeLocalStreamRef.current) {
        realtimeLocalStreamRef.current.getTracks().forEach((track) => track.stop());
        realtimeLocalStreamRef.current = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
    } catch (error) {
      console.error("Error deteniendo realtime Sara:", error);
    } finally {
      setIsListening(false);
      setWaitingSara(false);
    }
  };

  const startListening = async () => {
    if (!voiceSupported) {
      toast({ title: "Error", description: ui.openRealtimeError, variant: "destructive" });
      return;
    }
    try {
      stopListening();
      assistantTextBufferRef.current = "";
      setWaitingSara(true);
      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: "sara" }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData?.error || "Error creando sesión realtime");
      const ephemeralKey = sessionData?.client_secret?.value || sessionData?.value || "";
      if (!ephemeralKey) throw new Error("No llegó client secret desde /api/realtime-session");

      const pc = new RTCPeerConnection();
      realtimePcRef.current = pc;
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.playsInline = true;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1;
          remoteAudioRef.current.play().catch((err) => console.error("Sara audio play error:", err));
        }
      };
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      realtimeLocalStreamRef.current = localStream;
      for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;
      dc.onopen = () => { shouldKickoffSaraRef.current = true; };
      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const userTranscript =
            msg?.transcript ||
            msg?.item?.transcript ||
            msg?.item?.content?.[0]?.transcript ||
            "";
          if (
            (msg.type === "conversation.item.input_audio_transcription.completed" ||
              msg.type === "input_audio_buffer.transcription.completed") &&
            typeof userTranscript === "string" &&
            userTranscript.trim()
          ) {
            const transcript = userTranscript.trim();
            if (transcript !== lastUserTranscriptRef.current) {
              lastUserTranscriptRef.current = transcript;
              pushUserMessage(transcript);
            }
          }
          if (msg.type === "response.output_text.delta" && typeof msg.delta === "string") {
            assistantTextBufferRef.current += msg.delta;
          }
          if (msg.type === "response.output_text.done" && typeof msg.text === "string" && msg.text.trim()) {
            assistantTextBufferRef.current = msg.text.trim();
          }
          if (msg.type === "response.done") { finalizeAssistantBuffer(); setWaitingSara(false); }
          if (msg.type === "response.created") { setWaitingSara(true); }
        } catch (err) {
          console.error("Realtime Sara parse error:", err);
        }
      };
      dc.onerror = (err) => console.error("Realtime Sara data channel error:", err);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(errText || "Error negociando WebRTC con OpenAI");
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      if (shouldKickoffSaraRef.current) {
        shouldKickoffSaraRef.current = false;
        setTimeout(() => kickoffSara(), 150);
      }
    } catch (error: any) {
      console.error("Error iniciando realtime Sara:", error);
      stopListening();
      toast({ title: "Error realtime", description: error?.message || "No se pudo iniciar Sara realtime", variant: "destructive" });
    }
  };

  // ✅ Validation completa antes del pago
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.fullName.trim()) {
      errors.push(isMa ? "الاسم الكامل مطلوب" : isEn ? "Full name is required" : "Nombre completo es requerido");
    }
    if (!formData.phone.trim()) {
      errors.push(isMa ? "رقم الهاتف مطلوب" : isEn ? "Phone number is required" : "Teléfono es requerido");
    }
    if (!formData.email.trim()) {
      errors.push(isMa ? "البريد الإلكتروني مطلوب" : isEn ? "Email is required" : "Email es requerido");
    }
    if (!formData.nie.trim()) {
      errors.push(isMa ? "NIE مطلوب" : isEn ? "NIE is required" : "NIE es requerido");
    }
    if (!formData.expedienteNumero.trim()) {
      errors.push(isMa ? "رقم الملف مطلوب" : isEn ? "File number is required" : "Número de expediente es requerido");
    }
    if (!formData.identificadorSolicitud.trim()) {
      errors.push(isMa ? "محدد الطلب مطلوب" : isEn ? "Request identifier is required" : "Identificador de solicitud es requerido");
    }
    if (!formData.ciudad.trim()) {
      errors.push(isMa ? "المدينة مطلوبة" : isEn ? "City is required" : "Ciudad es requerida");
    }
    if (!formData.provincia.trim()) {
      errors.push(isMa ? "المقاطعة مطلوبة" : isEn ? "Province is required" : "Provincia es requerida");
    }
    if (!formData.direccion.trim()) {
      errors.push(isMa ? "العنوان مطلوب" : isEn ? "Address is required" : "Dirección es requerida");
    }
    if (!formData.codigoPostal.trim()) {
      errors.push(isMa ? "الرمز البريدي مطلوب" : isEn ? "Postal code is required" : "Código postal es requerido");
    }
    if (!formData.fechaPresentacion.trim()) {
      errors.push(isMa ? "تاريخ التقديم مطلوب" : isEn ? "Application date is required" : "Fecha de presentación es requerida");
    }
    if (!formData.fechaNacimiento.trim()) {
      errors.push(isMa ? "تاريخ الميلاد مطلوب" : isEn ? "Birth date is required" : "Fecha de nacimiento es requerida");
    }
    if (!acceptTerms) {
      errors.push(isMa ? "خاصك توافق على شروط المتابعة" : isEn ? "You must accept the terms" : "Debes aceptar los términos");
    }

    if (errors.length > 0) {
      errors.forEach((err) => {
        toast({
          title: ui.missingTitle,
          description: err,
          variant: "destructive",
        });
      });
      return false;
    }

    return true;
  };

  const handlePay = async () => {
    // ✅ Validación antes del pago
    if (!validateForm()) {
      return;
    }

    try {
      const res = await fetch("/api/create-checkout-sara-inicial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          expedienteNumero: formData.expedienteNumero,
          identificadorSolicitud: formData.identificadorSolicitud,
          fechaPresentacion: formData.fechaPresentacion,
          fechaNacimiento: formData.fechaNacimiento,
          direccion: formData.direccion,
          codigoPostal: formData.codigoPostal,
          ciudad: formData.ciudad,
          provincia: formData.provincia,
          preferredOffice: formData.preferredOffice,
          nie: formData.nie,
        }),
      });

      const data = await res.json();
      if (data.url) {
        localStorage.setItem("saraPaid", "1");
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: ui.stripeErrorTitle,
        description: ui.stripeErrorDesc,
        variant: "destructive",
      });
    }
  };

  const handleFormChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div
        className="fixed inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,197,94,0.08), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.07), transparent)",
        }}
      />

      <Navbar />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-0">
        <h1 className="text-xl font-display font-bold px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">
          {ui.pageTitle}
        </h1>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full pb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3"
          >
            <div
              className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] bg-black"
              style={{ height: "280px" }}
            >
              <div className="relative w-full h-full">
  <video
    id="sara-video"
    playsInline
    preload="none"
    poster="/images/sara.png"
    controls={false}
    className="w-full h-full object-cover object-top"
    onPlay={(e) => {
      e.currentTarget.pause();
      e.currentTarget.currentTime = 0;
    }}
  >
    <source src="/sara-presentacion.mp4" type="video/mp4" />
  </video>
</div>

                <button
                  id="play-button-sara"
                  type="button"
                  className="absolute inset-0 flex items-center justify-center"
                  onClick={() => {
                    const video = document.getElementById(
                      "sara-video"
                    ) as HTMLVideoElement;
                    if (video) {
                      video.play();
                    }
                  }}
                >
                  <div className="bg-black/10 backdrop-blur-[1px] rounded-full w-12 h-12 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              </div>

              {!muted && (
                <div className="absolute bottom-14 left-4 flex items-end gap-0.5 h-5">
                  {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [`${h}px`, `${h * 2}px`, `${h}px`] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
                    />
                  ))}
                </div>
              )}

              <div className="absolute bottom-14 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">Sara</p>
                <p className="text-white/70 text-xs drop-shadow-lg">{ui.agentRole}</p>
              </div>
            </div>
          </motion.div>

          <OfficialBrowserBox
            language={language}
            avatarImage={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            title={ui.pageTitle}
            url="icp.administracionelectronica.gob.es"
            profileLoading={profileLoading}
            ui={ui}
            confirmed={confirmed}
            formData={formData}
            onFormChange={handleFormChange}
            onFormSubmit={() => {}}
            formReady={formReady}
            onPay={handlePay}
            acceptTerms={acceptTerms}
            setAcceptTerms={setAcceptTerms}
          />
        </div>

        {/* Barra inferior */}
        <div className="hidden lg:block sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDocs(true); setShowForms(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showDocs ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <FileText className="w-4 h-4 text-primary" />
                {ui.docsButton}
              </button>
              <button
                onClick={() => { setShowForms(true); setShowDocs(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showForms ? "bg-secondary/20 border-secondary/40 text-secondary" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <Settings className="w-4 h-4 text-secondary" />
                {ui.formsButton}
              </button>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60">
              © 2026 GestoriaCitaIA
            </div>
          </div>
        </div>

        {/* Panel documentos */}
        <AnimatePresence>
          {showDocs && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden" style={{ background: "#1a2236" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-white">{ui.docsRequiredTitle}</span>
                  </div>
                  <button onClick={() => setShowDocs(false)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs" type="button">✕</button>
                </div>
                <div className="px-5 py-4 space-y-2.5 max-h-72 overflow-y-auto">
                  {docsForSelectedTramite.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${doc.estado === "ok" ? "bg-green-500/20 text-green-400" : doc.estado === "warn" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {doc.estado === "ok" ? "✓" : doc.estado === "warn" ? "!" : "✗"}
                      </span>
                      <span className="text-sm text-white/90">{doc.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel formularios */}
        <AnimatePresence>
          {showForms && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden" style={{ background: "#1a2236" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-sm text-white">{ui.formsOfficialTitle}</span>
                  </div>
                  <button onClick={() => setShowForms(false)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs" type="button">✕</button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {formsForSelectedTramite.map((form, i) => (
                    <a key={i} href={form.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary">{form.codigo}</p>
                        <p className="text-sm text-white/80 truncate">{form.nombre}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-white/40 group-hover:text-primary transition-colors shrink-0">PDF ↓</span>
                    </a>
                  ))}
                  <p className="text-[10px] text-white/30 text-center pt-1">{ui.sourceLabel}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </main>
    </div>
  );
}
