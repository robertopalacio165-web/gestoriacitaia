   ﻿import { useEffect, useMemo, useRef, useState } from "react";
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
import { useScheduleAppointment } from "@/hooks/use-appointments";
import { supabase } from "@/lib/supabaseClient";

interface ChatMsg {
  from: "agent" | "user";
  text: string;
  ts?: number;
}

type TramiteItem = {
  value: string;
  label: string;
};

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

type AppointmentResult = {
  tramite?: string | null;
  date?: string | null;
  time?: string | null;
  office?: string | null;
  locator?: string | null;
  pdf_url?: string | null;
  confirmation_pdf_url?: string | null;
};

type ClientFormData = {

  fullName: string;
  phone: string;
  email: string;

  expedienteNumero: string;
  identificadorSolicitud: string;
  fechaNacimiento: string;

  nie: string;
  passport: string;
  nationality: string;
  birthYear: string;
  city: string;
  province: string;
  preferredOffice: string;
};

function OfficialBrowserBox({
  language,
  avatarImage,
  title,
  url,
  selectedTramiteLabel,
  profileLoading,
  ui,
  confirmed,
  appointmentData,
  finalDate,
  finalTime,
  finalOffice,
  finalLocator,
  finalPdfUrl,
  hasRealAppointment,
  onRefresh,
  onOpenOfficial,
  onSelectTramite,
  tramites,
  selectedTramite,
  onAceptar,
  isPending,
  cameFromConfirmationLink,
  formData,
  onFormChange,
  onFormSubmit,
  formReady,
}: {
  language: string;
  avatarImage: string;
  title: string;
  url: string;
  selectedTramiteLabel: string;
  profileLoading: boolean;
  ui: any;
  confirmed: boolean;
  appointmentData: AppointmentResult | null;
  finalDate: string;
  finalTime: string;
  finalOffice: string;
  finalLocator: string;
  finalPdfUrl: string | null;
  hasRealAppointment: boolean;
  onRefresh: () => void;
  onOpenOfficial: () => void;
  onSelectTramite: (value: string) => void;
  tramites: TramiteItem[];
  selectedTramite: string;
  onAceptar: () => void;
  isPending: boolean;
  cameFromConfirmationLink: boolean;
  formData: ClientFormData;
  onFormChange: (field: keyof ClientFormData, value: string) => void;
  onFormSubmit: () => void;
  formReady: boolean;
}) {
  const isMa = language === "ma";
  const isEn = language === "en";
  const { toast } = useToast();

  const formIntro = isMa
    ? "Ø¥Ù„Ù‰ ÙƒÙ†ØªÙŠ Ø¨Ø§ØºÙŠ Ù…ÙˆØ¹Ø¯ Ø¹Ù…Ø± Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¯ÙŠØ§Ù„Ùƒ ÙˆØ§Ø®ØªØ§Ø± Ù†ÙˆØ¹ Ø§Ù„Ù…ÙˆØ¹Ø¯ ÙˆÙ…Ù† Ø¨Ø¹Ø¯ Ø³Ø§Ø±Ø© ØºØ§Ø¯ÙŠ ØªÙƒÙ…Ù„ Ù…Ø¹Ø§Ùƒ ÙˆØªØ¹Ù„Ù…Ùƒ ÙØ§Ø´ ÙŠÙƒÙˆÙ† Ø§Ù„Ù…ÙˆØ¹Ø¯."
    : isEn
    ? "Fill in your information and choose the appointment type. Sara will continue with you and notify you on WhatsApp when an appointment appears."
    : "Si necesitas una cita, rellena tus datos y elige el tipo de cita. DespuÃ©s Sara continuarÃ¡ contigo y te avisarÃ¡ por WhatsApp cuando exista una cita real.";

  const panelTitle = isMa
    ? "Ø§Ù„Ù„ÙˆØ­Ø© Ø§Ù„Ø±Ø³Ù…ÙŠØ©"
    : isEn
    ? "Official integrated panel"
    : "Panel oficial integrado";

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
    ? "ðŸŽ‰ Ù…Ø¨Ø±ÙˆÙƒ! ØªØ£ÙƒØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø¯ÙŠØ§Ù„Ùƒ"
    : isEn
    ? "ðŸŽ‰ APPOINTMENT CONFIRMED!"
    : "ðŸŽ‰ Â¡CITA CONFIRMADA!"}
</h2>

<p className="text-white text-lg font-bold mb-4">
  {isMa
    ? "Ø´ÙƒØ±Ø§Ù‹ Ø¨Ø²Ø§Ù Ø¹Ù„Ù‰ Ø§Ù„Ø«Ù‚Ø© Ø¯ÙŠØ§Ù„Ùƒ ÙÙŠ GestoriaCitaIA."
    : isEn
    ? "Thank you for trusting GestoriaCitaIA."
    : "Muchas gracias por confiar en GestoriaCitaIA."}
</p>

<p className="text-white/80">
  {isMa
    ? "ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø¯ÙŠØ§Ù„Ùƒ Ø¨Ù†Ø¬Ø§Ø­."
    : isEn
    ? "Your appointment has been successfully confirmed."
    : "Tu cita ha sido confirmada correctamente."}
</p>

<p className="text-white/80 mt-2">
  {isMa
    ? "Ø³Ø§Ø±Ø© Ø³Ø§Ù„Ø§Øª Ø§Ù„Ø®Ø¯Ù…Ø© Ø¯ÙŠØ§Ù„Ù‡Ø§ Ø¨Ù†Ø¬Ø§Ø­."
    : isEn
    ? "Sara has successfully completed her work."
    : "Sara ha finalizado su trabajo con Ã©xito."}
</p>

<p className="text-yellow-400 font-bold mt-4">
  {isMa
    ? "âœ… Ø§Ù„Ø¹Ù…Ù„ÙŠØ© ÙƒÙ…Ù„Øª Ø¨Ù†Ø¬Ø§Ø­"
    : isEn
    ? "âœ… Reservation completed"
    : "âœ… Reserva completada"}
</p>

<p className="text-white/70 mt-6">
  {isMa
    ? "Ù†ØªÙ…Ù†Ù‘Ø§Ùˆ Ù„ÙŠÙƒ Ø§Ù„ØªÙˆÙÙŠÙ‚ ÙØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø¯ÙŠØ§Ù„Ùƒ."
    : isEn
    ? "We wish you the best of luck with your procedure."
    : "Te deseamos mucha suerte en tu trÃ¡mite."}
</p>
</div>

) : !confirmed && !formReady ? (
          <>
            <div className="mt-3 mx-[-4px] rounded-[24px] border-2 border-yellow-500/60 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-3 py-3 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
              <h2 className="text-yellow-400 text-[18px] sm:text-[20px] font-black leading-tight mb-2">
                {panelTitle}
              </h2>
              <p className="text-white/80 text-[13px] leading-relaxed mb-5">
                {formIntro}
              </p>
              <div className="w-full">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                  {/* Nombre */}
       <div className="col-span-1 md:col-span-1">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„" : isEn ? "Full name" : "Nombre completo"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "Ø¯Ø®Ù„ Ø³Ù…ÙŠØªÙƒ" : isEn ? "Your name" : "Escribe tu nombre"}
                      value={formData.fullName}
                      onChange={(e) => onFormChange("fullName", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

{/* TelÃ©fono internacional */}
<div className="col-span-1 md:col-span-1">
  <label className="block text-white text-[13px] mb-2">
    {isMa ? "Ø§Ù„Ù‡Ø§ØªÙ" : isEn ? "Phone" : "TelÃ©fono"}
  </label>

  <div className="flex gap-2">

    <select
      className="w-[110px] h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-2 text-white"
value={formData.preferredOffice}
onChange={(e) =>
  onFormChange("preferredOffice", e.target.value)
}
      id="countryCode"
    >
      <option value="+34">ðŸ‡ªðŸ‡¸ +34</option>
      <option value="+212">ðŸ‡²ðŸ‡¦ +212</option>
      <option value="+31">ðŸ‡³ðŸ‡± +31</option>
      <option value="+32">ðŸ‡§ðŸ‡ª +32</option>
      <option value="+33">ðŸ‡«ðŸ‡· +33</option>
      <option value="+39">ðŸ‡®ðŸ‡¹ +39</option>
      <option value="+49">ðŸ‡©ðŸ‡ª +49</option>
      <option value="+44">ðŸ‡¬ðŸ‡§ +44</option>
      <option value="+1">ðŸ‡ºðŸ‡¸ +1</option>
    </select>

    <input
      type="text"
      placeholder="34644403748"
      value={formData.phone}
      onChange={(e) => onFormChange("phone", e.target.value)}
      className="flex-1 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
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

              {/* NÃºmero de expediente */}
<div>
  <label className="block text-white text-[13px] mb-2">
    NÃºmero de expediente
  </label>

  <input
    type="text"
    placeholder="467020260019841"
    value={formData.expedienteNumero || ""}
    onChange={(e) =>
      onFormChange("expedienteNumero", e.target.value)
    }
    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
  />
</div>

{/* Identificador solicitud */}
<div>
  <label className="block text-white text-[13px] mb-2">
    Identificador solicitud
  </label>

  <input
    type="text"
    placeholder="E46202600507573"
    value={formData.identificadorSolicitud || ""}
    onChange={(e) =>
      onFormChange("identificadorSolicitud", e.target.value)
    }
    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
  />
</div>

{/* Fecha nacimiento */}
<div>
  <label className="block text-white text-[13px] mb-2">
    Fecha nacimiento
  </label>

  <input
    type="date"
    value={formData.fechaNacimiento || ""}
    onChange={(e) =>
      onFormChange("fechaNacimiento", e.target.value)
    }
    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
  />
</div>

              {/* Caja de reserva */}
              <div className="mt-4 rounded-[28px] border-2 border-yellow-500 bg-gradient-to-b from-[#0b0b0b] to-[#050505] p-4 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
                <div className="flex items-start justify-between mb-4 pt-2">
                  <div>
                    <p className="text-white text-[15px] font-bold">
                      {isMa ? "Ø­Ø¬Ø² Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Reserve your appointment" : "Reserva tu cita"}
                    </p>
                    <span className="inline-flex mt-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]">
                      Premium
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 text-[34px] font-black leading-none drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
                      10â‚¬
                    </p>
                    <p className="text-yellow-300 text-[11px] font-semibold">
                      {isMa ? "Ø§Ù„Ø­Ø¬Ø² Ø§Ù„Ø£ÙˆÙ„" : isEn ? "Initial reservation" : "Reserva inicial"}
                    </p>
                  </div>
                </div>

                <p className="text-gray-300 text-[13px] mb-5 leading-relaxed">
                  {isMa
                    ? "Ø³Ø§Ø±Ø© ØºØ§Ø¯ÙŠ ØªØ¨Ø¯Ø§ ØªÙ‚Ù„Ø¨ Ù„ÙŠÙƒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠØ§"
                    : isEn
                    ? "Sara will automatically start searching for your appointment"
                    : "Sara empezarÃ¡ a buscar tu cita automÃ¡ticamente"}
                </p>

                <button
                  type="button"
              onClick={async () => {

  if (
!formData.fullName.trim() ||
!formData.phone.trim() ||
!formData.expedienteNumero.trim() ||
!formData.identificadorSolicitud.trim() ||
!formData.fechaNacimiento.trim()
  ) {
    toast({
      title: ui.missingTitle,
      description: ui.missingDesc,
      variant: "destructive",
    });

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

  expedienteNumero:
    formData.expedienteNumero,

  identificadorSolicitud:
    formData.identificadorSolicitud,

  fechaNacimiento:
    formData.fechaNacimiento,

}),
});

const data = await res.json();

  if (data.url) {
localStorage.setItem("saraPaid", "1");
window.location.href = data.url;

}
  } catch (error) {

    console.error(error);

 alert("Stripe error");

  }

}}
                  className="w-full min-h-[56px] rounded-[20px] bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 px-4 py-2 text-[15px] leading-tight font-black text-black shadow-[0_0_30px_rgba(255,215,0,0.35)] transition-all duration-300 hover:scale-[1.01]"
                >
                  {isMa
                    ? "ðŸ” Ø­Ø¬Ø² ÙˆØ¨Ø¯Ø¡ Ø§Ù„Ø¨Ø­Ø«"
                    : isEn
                    ? "ðŸ” Reserve and start search"
                    : "ðŸ” Reservar y empezar bÃºsqueda"}
                </button>

                <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-300">
                  <Shield className="w-3 h-3 text-yellow-400" />
                  <span>
                    {isMa
                      ? "Ø¯ÙØ¹ Ø¢Ù…Ù† Ø¹Ø¨Ø± Stripe"
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

            {hasRealAppointment && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">
                  {isMa ? "Ù„Ù‚ÙŠÙ†Ø§ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ" : isEn ? "Real appointment found" : "Cita real encontrada"}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {isMa ? "Ø§Ù„Ù†ÙˆØ¹" : isEn ? "Procedure" : "TrÃ¡mite"}: {appointmentData?.tramite || selectedTramiteLabel}
                </p>
                <p className="text-sm text-gray-700">{isMa ? "Ø§Ù„ØªØ§Ø±ÙŠØ®" : isEn ? "Date" : "Fecha"}: {finalDate}</p>
                <p className="text-sm text-gray-700">{isMa ? "Ø§Ù„ÙˆÙ‚Øª" : isEn ? "Time" : "Hora"}: {finalTime}</p>
                <p className="text-sm text-gray-700">{isMa ? "Ø§Ù„Ù…ÙƒØªØ¨" : isEn ? "Office" : "Oficina"}: {finalOffice}</p>
                <p className="text-sm text-gray-700">{isMa ? "Ø±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Locator" : "Localizador"}: {finalLocator}</p>
              </div>
            )}
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
  ? "Ù…Ø¨Ø±ÙˆÙƒ ðŸŽ‰ Ø¨Ø¯ÙŠÙ†Ø§ Ù†Ù‚Ù„Ø¨Ùˆ Ù„ÙŠÙƒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø¯ÙŠØ§Ù„Ùƒ. Ø¥Ù„Ù‰ Ù„Ù‚ÙŠÙ†Ø§Ù‡ ØºØ§Ø¯ÙŠ Ù†Ø¹Ù„Ù…ÙˆÙƒ ÙÙˆØ§ØªØ³Ø§Ø¨ Ø¨Ø´ÙƒÙ„ Ù…Ø³ØªØ¹Ø¬Ù„ Ø®Ù„Ø§Ù„ 24 Ø³Ø§Ø¹Ø©."
  : isEn
  ? "Congratulations ðŸŽ‰ We have started searching for your appointment. As soon as we find it, we will urgently notify you on WhatsApp within 24 hours."
  : "Felicidades ðŸŽ‰ Hemos empezado a buscar tu cita. En cuanto la tengamos te avisaremos urgentemente por WhatsApp en menos de 24 horas."}
              </h3>
              <p className="text-center text-white/70 text-[14px] leading-relaxed">
                {isMa
                  ? "ØºØ§Ø¯ÙŠ Ù†Ø®Ø¨Ø±ÙˆÙƒ Ù‡Ù†Ø§ Ù…Ù„ÙŠ ÙŠÙƒÙˆÙ† Ø¬Ø¯ÙŠØ¯ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø¯ÙŠØ§Ù„Ùƒ."
                  : isEn
                  ? "We will notify you here when there is news about your appointment."
                  : "Te avisaremos aquÃ­ cuando haya novedades sobre tu cita."}
              </p>
              

<div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">

  <div className="flex items-center gap-2 mb-2">

    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />

    <p className="text-yellow-300 font-bold text-sm">
      Sara buscando 24/24
    </p>

  </div>

  <p className="text-white/70 text-xs leading-relaxed">

    {isMa
      ? "Ø³Ø§Ø±Ø© Ø¯Ø§Ø¨Ø§ ÙƒØªÙ‚Ù„Ø¨ Ù„ÙŠÙƒ Ø¹Ù„Ù‰ Ù…ÙˆØ¹Ø¯ Ø­Ù‚ÙŠÙ‚ÙŠ ÙˆØºØ§Ø¯ÙŠ ØªÙˆØµÙ„Ùƒ Ø±Ø³Ø§Ù„Ø© ÙÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø¨Ø§Ø´Ø±Ø© Ù…Ù„ÙŠ ÙŠØ¨Ø§Ù† Ø§Ù„Ù…ÙˆØ¹Ø¯."
      : isEn
      ? "Sara is now searching for a real appointment and you will receive a WhatsApp notification immediately when it appears."
      : "Sara estÃ¡ buscando una cita real ahora mismo y recibirÃ¡s una notificaciÃ³n por WhatsApp en cuanto aparezca una disponibilidad."}

  </p>

</div>

</div>

            <div className="rounded-[30px] overflow-hidden border border-yellow-500/30 bg-[#050816] shadow-[0_0_40px_rgba(255,200,0,0.10)]">
              <div className="px-6 py-8 bg-[radial-gradient(circle_at_top,rgba(255,200,0,0.12),transparent_60%)]">
                <div className="flex justify-center mb-5">
                  <img
            src="https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg"
              alt="EspaÃ±a"
               className="w-20 h-14 object-cover rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/20"
                  />
                </div>

                <h2 className="text-center text-[#f6d06f] text-[36px] leading-[42px] font-black mb-5">
                  {isMa
                    ? "Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø£Ø¬Ø§Ù†Ø¨ Ø¨Ø«Ù‚Ø©"
                    : isEn
                    ? "Immigration Appointments with Confidence"
                    : "Citas de ExtranjerÃ­a con Confianza"}
                </h2>

                <p className="text-center text-white/75 text-[15px] leading-relaxed mb-8">
                  {isMa
                    ? "ÙƒÙ†Ø¹Ø§ÙˆÙ†ÙˆÙƒ ØªØ¯ÙŠØ± Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø£Ø¬Ø§Ù†Ø¨ Ø¨Ø·Ø±ÙŠÙ‚Ø© Ø³Ø±ÙŠØ¹Ø© ÙˆØ¢Ù…Ù†Ø© 100% Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†."
                    : isEn
                    ? "We help you manage your immigration appointment quickly, securely and 100% online."
                    : "Te ayudamos a gestionar tu cita de extranjerÃ­a de forma rÃ¡pida, segura y 100% online."}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Shield className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "Ø¹Ù…Ù„ÙŠØ© Ø¢Ù…Ù†Ø©" : isEn ? "Secure process" : "Proceso seguro"}
                    </p>
                  </div>
                  <div>
                    <Bell className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "Ù…Ø³Ø§Ø¹Ø¯Ø© Ù„Ù„Ù…Ù‡Ø§Ø¬Ø±ÙŠÙ†" : isEn ? "Immigration support" : "AtenciÃ³n a inmigrantes"}
                    </p>
                  </div>
                  <div>
                    <CheckCircle2 className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "Ù…ÙˆØ§Ø¹ÙŠØ¯ Ù…Ø¶Ù…ÙˆÙ†Ø©" : isEn ? "Guaranteed appointments" : "Citas garantizadas"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center text-[#f6d06f] text-[24px] font-bold">
                  {isMa
                    ? "Â« Ù…Ø³ØªÙ‚Ø¨Ù„Ùƒ ÙƒÙŠØ¨Ø¯Ø§ Ø¨Ù…ÙˆØ¹Ø¯. Â»"
                    : isEn
                    ? "\" Your future starts with an appointment. \""
                    : "\" Tu futuro comienza con una cita. \""}
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-10 gap-5"
     >
</motion.div>

</>

</div>
</motion.div>
);
}

export default function BuscarCitas() {
  // âœ… CORRECCIÃ“N PRINCIPAL: usamos lang del contexto y mapeamos a "ma" para la lÃ³gica interna
  const { lang } = useLang();
  const language = lang === "darija" ? "ma" : lang;

  const [location] = useLocation();
const [selectedTramite, setSelectedTramite] = useState("primera_tie");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
const [confirmed, setConfirmed] = useState(
  new URLSearchParams(window.location.search).get("success") === "true"
);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentResult | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
 const [formData, setFormData] = useState<ClientFormData>({
  fullName: "",
  phone: "",
  email: "",

  expedienteNumero: "",
  identificadorSolicitud: "",
  fechaNacimiento: "",

  preferredOffice: "+34",

  nie: "",
  passport: "",
  nationality: "",
  birthYear: "",
  city: "",
  province: "",
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

  const urlParams = useMemo(() => {
    const url = new URL(window.location.href);
    return {
      token: url.searchParams.get("token") || "",
      appointmentId: url.searchParams.get("appointment_id") || "",
    };
  }, [location]);

  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();

  const isMa = language === "ma";
  const isEn = language === "en";

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÙŠÙƒÙ… Ù…Ø±Ø­Ø¨Ø§ Ø¨Ùƒ ÙÙŠ Ù‡ÙŠØ³ØªÙˆØ±ÙŠØ§ Ø¥ÙŠ Ø¢ÙŠ Ø£Ù†Ø§ Ø³Ø§Ø±Ø© ØºØ§Ø¯ÙŠ Ù†Ø¹Ø§ÙˆÙ†Ùƒ Ø¨Ø§Ø´ ØªÙ„Ù‚Ø§ Ù…ÙˆØ¹Ø¯ ÙÙŠ Ø£Ù‚Ø±Ø¨ ÙˆÙ‚Øª Ø¹Ù…Ø± Ù„ÙŠØ§ Ø§Ù„ÙÙˆØ±Ù…ÙˆÙ„Ø§Ø± ÙˆÙ…Ù† Ø¨Ø¹Ø¯ ÙƒÙ„ÙŠÙƒ Ø¹Ù„Ù‰ confirm",
      savedLeadReply:
        "Ù…Ø²ÙŠØ§Ù† Ø¯Ø§Ø¨Ø§ ØªÙˆØµÙ„Ù†Ø§ Ø¨Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø© Ø¯ÙŠØ§Ù„Ùƒ ØºØ§Ø¯ÙŠ Ù†Ø¨Ø¯Ø£ Ù†Ù‚Ù„Ø¨ Ù„Ùƒ Ø¹Ù„Ù‰ Ù…ÙˆØ¹Ø¯ 24 Ø³Ø§Ø¹Ø© Ø¹Ù„Ù‰ 24 ÙˆØºØ§Ø¯ÙŠ Ù†ØµÙŠÙØ· Ù„Ùƒ ÙˆØ§ØªØ³Ø§Ø¨ Ø¥Ù„Ø§ Ø¨Ø§Ù† Ø§Ù„Ù…ÙˆØ¹Ø¯",
      foundMsg:
        "Ù„Ù‚ÙŠÙ†Ø§ Ù„Ùƒ Ø§Ù„Ø³ÙŠØ·Ø§ Ø¯ÙŠØ§Ù„Ùƒ Ø¯Ø§Ø¨Ø§ Ø¯Ø®Ù„ Ø¨Ø³Ø±Ø¹Ø© ÙˆÙƒÙ„ÙŠÙƒÙŠ Ø¹Ù„Ù‰ confirm Ø¨Ø§Ø´ Ù…Ø§ ØªØ·ÙŠØ±Ø´ Ø¹Ù„ÙŠÙƒ",
      confirmMsg:
        "Ù…Ø¨Ø±ÙˆÙƒ Ø¹Ù„ÙŠÙƒ ØªØ£ÙƒØ¯Ø§Øª Ø§Ù„Ø³ÙŠØ·Ø§ Ø¯ÙŠØ§Ù„Ùƒ Ø´ÙƒØ±Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ø«Ù‚Ø© Ø¯ÙŠØ§Ù„Ùƒ ÙÙŠ Ù‡ÙŠØ³ØªÙˆØ±ÙŠØ§ Ø¥ÙŠ Ø¢ÙŠ",
    }),
    []
  );

  const ui = useMemo(() => {
    return {
 tramites: [

{
  value: "primera_tie",
  label: isMa
    ? "Ø§Ù„Ø¨ØµÙ…Ø§Øª - Ø£ÙˆÙ„ TIE"
    : isEn
    ? "First TIE - Fingerprints"
    : "Primera TIE (Toma de huellas)",
},

{
  value: "renovacion_nie",
  label: isMa
    ? "ØªØ¬Ø¯ÙŠØ¯ NIE Ø£Ùˆ TIE"
    : isEn
    ? "NIE / TIE Renewal"
    : "RenovaciÃ³n NIE / TIE",
},

{
  value: "reagrupacion_familiar",
  label: isMa
    ? "Ø§Ù„ØªØ¬Ù…Ø¹ Ø§Ù„Ø¹Ø§Ø¦Ù„ÙŠ"
    : isEn
    ? "Family Reunification"
    : "ReagrupaciÃ³n Familiar",
},

{
  value: "arraigo",
  label: isMa
    ? "Ø§Ù„Ø§Ø³ØªÙ‚Ø±Ø§Ø± (Ø£Ø±Ø§ÙŠØºÙˆ)"
    : isEn
    ? "Arraigo Residence"
    : "Arraigo",
},

{
  value: "familiar_ue",
  label: isMa
    ? "ÙØ±Ø¯ Ù…Ù† Ø¹Ø§Ø¦Ù„Ø© Ù…ÙˆØ§Ø·Ù† Ø£ÙˆØ±ÙˆØ¨ÙŠ"
    : isEn
    ? "EU Family Member"
    : "Familiar de Ciudadano UE",
},

{
  value: "certificado_ue",
  label: isMa
    ? "Ø´Ù‡Ø§Ø¯Ø© Ù…ÙˆØ§Ø·Ù† Ø£ÙˆØ±ÙˆØ¨ÙŠ"
    : isEn
    ? "EU Registration Certificate"
    : "Certificado de Registro UE",
},

{
  value: "autorizacion_regreso",
  label: isMa
    ? "Ø±Ø®ØµØ© Ø§Ù„Ø±Ø¬ÙˆØ¹"
    : isEn
    ? "Return Authorization"
    : "AutorizaciÃ³n de Regreso",
},

{
  value: "larga_duracion",
  label: isMa
    ? "Ø§Ù„Ø¥Ù‚Ø§Ù…Ø© Ø·ÙˆÙŠÙ„Ø© Ø§Ù„Ù…Ø¯Ø©"
    : isEn
    ? "Long-Term Residence"
    : "Residencia de Larga DuraciÃ³n",
},

{
  value: "estudios",
  label: isMa
    ? "Ø¥Ù‚Ø§Ù…Ø© Ø§Ù„Ø¯Ø±Ø§Ø³Ø©"
    : isEn
    ? "Student Residence"
    : "Estancia por Estudios",
},

{
  value: "asilo",
  label: isMa
    ? "Ø§Ù„Ù„Ø¬ÙˆØ¡ ÙˆØ§Ù„Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¯ÙˆÙ„ÙŠØ©"
    : isEn
    ? "Asylum and International Protection"
    : "Asilo y ProtecciÃ³n Internacional",
},

] as TramiteItem[],

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

      online: isMa ? "Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†" : isEn ? "Online" : "En lÃ­nea",

      agentRole: isMa ? "Ù…Ø³Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯" : isEn ? "Appointments Assistant" : "Asesora de Citas",

      procedurePlaceholder: isMa
        ? "Ø§Ø®ØªØ§Ø± Ù†ÙˆØ¹ Ø§Ù„Ø³ÙŠØªØ§"
        : isEn
        ? "Select appointment type"
        : "Seleccione el trÃ¡mite entre los relacionados",

      loadingUserData: isMa
        ? "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª..."
        : isEn
        ? "Loading user data..."
        : "Cargando datos del usuario...",

      govSmall: "extranjerÃ­a:",
      govTitle: "CITA PREVIA",
      govLine1: "COMISARÃA GENERAL",
      govLine2: "DE EXTRANJERÃA",
      govLine3: "E INMIGRACIÃ“N",

      confirmTitle: isMa ? "ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯!" : isEn ? "APPOINTMENT CONFIRMED!" : "Â¡CITA CONFIRMADA!",

      date: isMa ? "Ø§Ù„ØªØ§Ø±ÙŠØ®" : isEn ? "Date" : "Fecha",
      time: isMa ? "Ø§Ù„ÙˆÙ‚Øª" : isEn ? "Time" : "Hora",
      office: isMa ? "Ø§Ù„Ù…ÙƒØªØ¨" : isEn ? "Office" : "Oficina",
      appointmentNumber: isMa ? "Ø±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Appointment Number" : "NÂº Cita",

      reservationSaved: isMa
        ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø­Ø¬Ø²"
        : isEn
        ? "Reservation saved"
        : "Reserva guardada correctamente",

      sourceLabel: isMa ? "Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ø±Ø³Ù…ÙŠ" : isEn ? "Official source" : "Fuente oficial",

      foundSuccessTitle: isMa ? "Ù„Ù‚ÙŠÙ†Ø§ Ø§Ù„Ù…ÙˆØ¹Ø¯!" : isEn ? "Appointment found!" : "Â¡Cita encontrada!",
      foundSuccessDesc: isMa ? "Ø£ÙƒØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø¯Ø§Ø¨Ø§" : isEn ? "Confirm now to continue." : "Ahora confirma para continuar.",
      foundErrorTitle: isMa ? "Ø®Ø·Ø£" : isEn ? "Error" : "Error al buscar cita",
      foundErrorDesc: isMa ? "Ù…Ø§ Ù‚Ø¯Ø±Ù†Ø§Ø´ Ù†Ù„Ù‚Ø§Ùˆ Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Could not search appointment." : "No se pudo buscar la cita en este momento.",

      confirmSuccessTitle: isMa ? "ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Appointment confirmed!" : "Â¡Cita confirmada!",
      confirmSuccessDesc: isMa
        ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø­Ø¬Ø²"
        : isEn
        ? "Reservation saved correctly."
        : "La reserva ha quedado registrada correctamente.",

      procedureShort: isMa ? "Ø§Ù„Ù†ÙˆØ¹" : isEn ? "Procedure" : "TrÃ¡mite",

      openOfficialSite: isMa ? "ÙØªØ­ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø±Ø³Ù…ÙŠ" : isEn ? "Open official website" : "Abrir sede oficial",
      downloadPdf: isMa ? "ØªØ­Ù…ÙŠÙ„ PDF" : isEn ? "Download PDF" : "Descargar PDF",

      voiceButton: isMa ? "ØªÙƒÙ„Ù… Ù…Ø¹ Ø³Ø§Ø±Ø©" : isEn ? "Talk with Sara" : "Hablar con Sara",
      stopButton: isMa ? "ÙˆÙ‚Ù Ø§Ù„Ù…ÙŠÙƒØ±Ùˆ" : isEn ? "Stop microphone" : "Parar micrÃ³fono",

      latestReply: isMa ? "Ø¢Ø®Ø± Ø±Ø¯ Ù…Ù† Ø³Ø§Ø±Ø©" : isEn ? "Latest Sara reply" : "Ãšltima respuesta de Sara",
      yourVoice: isMa ? "Ø¢Ø®Ø± ÙƒÙ„Ø§Ù… Ø¯ÙŠØ§Ù„Ùƒ" : isEn ? "Your latest voice" : "Tu Ãºltima respuesta por voz",
      listening: isMa ? "Ø³Ø§Ø±Ø© ÙƒØªØ³Ù…Ø¹ Ù„ÙŠÙƒ..." : isEn ? "Sara is listening..." : "Sara te estÃ¡ escuchando ahora...",

      saveTitle: isMa ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª" : isEn ? "Data saved" : "Datos guardados",
      saveDesc: isMa ? "Ø³Ø§Ø±Ø© ØºØ§Ø¯ÙŠ ØªÙƒÙ…Ù„ Ù…Ø¹Ø§Ùƒ" : isEn ? "Sara can continue now." : "Sara ya puede continuar contigo.",

      missingTitle: isMa ? "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ù†Ø§Ù‚ØµØ©" : isEn ? "Missing data" : "Faltan datos",
      missingDesc: isMa
        ? "Ø¯Ø®Ù„ Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„Ù‡Ø§ØªÙ ÙˆØ§Ù„Ù…Ø¯ÙŠÙ†Ø©"
        : isEn
        ? "Fill name, phone and city."
        : "Rellena nombre, telÃ©fono y ciudad antes de continuar.",

      openRealtimeError: isMa
        ? "Ø§Ù„Ù…ØªØµÙØ­ Ù…Ø§ ÙƒÙŠØ¯Ø¹Ù…Ø´ Ø§Ù„ØµÙˆØª"
        : isEn
        ? "Browser does not support audio."
        : "Este navegador no soporta audio. Usa Chrome moderno.",

      // Textos del footer / barra de abajo
      docsButton: isMa ? "Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚" : isEn ? "Documents" : "Documentos",
      formsButton: isMa ? "Ø§Ù„Ø§Ø³ØªÙ…Ø§Ø±Ø§Øª" : isEn ? "Forms" : "Formularios",
      docsRequiredTitle: isMa ? "Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©" : isEn ? "Required documents" : "Documentos requeridos",
      formsOfficialTitle: isMa ? "Ø§Ù„Ø§Ø³ØªÙ…Ø§Ø±Ø§Øª Ø§Ù„Ø±Ø³Ù…ÙŠØ©" : isEn ? "Official forms" : "Formularios oficiales",

      // TÃ­tulo pÃ¡gina
      pageTitle: isMa ? "Ø§Ù„Ø¨Ø­Ø« Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯" : isEn ? "Find appointments" : "Buscar citas",
      pageTitleConfirm: isMa ? "Ø³Ø§Ø±Ø©: ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Sara: appointment confirmation" : "Sara: confirmaciÃ³n de cita",

      // Mensaje Sara al guardar lead
      agentSavedMsg: isMa
        ? "Ù…Ø²ÙŠØ§Ù†. Ø¯Ø§Ø¨Ø§ ÙƒÙ†Ù‚Ù„Ø¨Ùˆ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø¯ÙŠØ§Ù„Ùƒ. ØºØ§Ø¯ÙŠ Ù†Ø®Ø¨Ø±ÙˆÙƒ ÙØ§Ù„ÙˆØ§ØªØ³Ø§Ø¨ ÙÙŠ Ø£Ù‚Ù„ Ù…Ù† 24 Ø³Ø§Ø¹Ø©."
        : isEn
        ? "Perfect. We are already looking for your appointment. We will notify you on WhatsApp within 24 hours."
        : "Perfecto. Ya estamos buscando tu cita. Te avisaremos por WhatsApp en menos de 24h.",

      // Confirmar cita botÃ³n
      confirmBtn: isMa ? "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Confirm appointment" : "Confirmar cita",

      // Errores varios
      noRealAppointmentTitle: isMa ? "Ù…Ø§ ÙƒØ§ÙŠÙ† Ø­ØªÙ‰ Ù…ÙˆØ¹Ø¯ Ø­Ù‚ÙŠÙ‚ÙŠ" : isEn ? "No real appointment" : "No hay cita real",
      noRealAppointmentDesc: isMa
        ? "Ù…Ø§ ØªÙ‚Ø¯Ø±Ø´ ØªØ£ÙƒØ¯ Ù…ÙˆØ¹Ø¯ Ù†Ø§Ù‚Øµ"
        : isEn
        ? "You cannot confirm an incomplete appointment."
        : "No puedes confirmar una cita inventada o incompleta.",

      stripeErrorTitle: isMa ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø¯ÙØ¹" : isEn ? "Payment error" : "Error Stripe",
      stripeErrorDesc: isMa ? "Ù…Ø§ Ù‚Ø¯Ø±Ù†Ø§Ø´ Ù†ÙØªØ­Ùˆ Ø§Ù„Ø¯ÙØ¹" : isEn ? "Could not open payment." : "No se pudo abrir el pago",

      saveErrorTitle: isMa ? "Ø®Ø·Ø£" : isEn ? "Error" : "Error",
      saveErrorDesc: isMa ? "Ù…Ø§ Ù‚Ø¯Ø±Ù†Ø§Ø´ Ù†Ø­ÙØ¸Ùˆ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª" : isEn ? "Could not save data." : "No se pudo guardar el cliente",

      panelUpdated: isMa ? "ØªØ­Ø¯Ø« Ø§Ù„Ù„ÙˆØ­Ø©" : isEn ? "Panel updated" : "Panel actualizado",

      selectTramiteTitle: isMa ? "Ø§Ø®ØªØ§Ø± Ù†ÙˆØ¹ Ø§Ù„Ù…ÙˆØ¹Ø¯" : isEn ? "Select procedure" : "Selecciona trÃ¡mite",
      selectTramiteDesc: isMa
        ? "Ø§Ø®ØªØ§Ø± Ù†ÙˆØ¹ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ù‚Ø¨Ù„ ØªÙƒÙ…Ù„"
        : isEn
        ? "Choose the appointment type before continuing."
        : "Elige el tipo de cita antes de continuar.",
    };
  }, [language]);

  const TRAMITES = ui.tramites;

  const selectedTramiteLabel =
    TRAMITES.find((item) => item.value === selectedTramite)?.label || TRAMITES[0].label;

  const voiceStorageKey = useMemo(() => {
    const userId = profile?.id || "guest";
    return `gestoriacitaia_sara_voice_${userId}`;
  }, [profile?.id]);

  const docsForSelectedTramite =
    ui.docsByTramite[selectedTramite] ?? ui.docsByTramite.tie;

  const formsForSelectedTramite =
    ui.formsByTramite[selectedTramite] ?? ui.formsByTramite.tie;

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
          setProfile((data as ProfileRow | null) ?? null);
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
      phone: profile?.phone?.trim() || prev.phone,
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
    if (text === "..." || text === "â€¦") return;
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
              text: `Ø§Ø¨Ø¯Ø¦ÙŠ Ø£Ù†ØªÙ Ø§Ù„ÙƒÙ„Ø§Ù… Ø§Ù„Ø¢Ù† Ù…Ø¨Ø§Ø´Ø±Ø©. Ù„Ø§ ØªÙ†ØªØ¸Ø±ÙŠ Ø§Ù„Ø¹Ù…ÙŠÙ„. Ù‚ÙˆÙ„ÙŠ Ø§Ù„Ø¢Ù† Ù‡Ø°Ø§ Ø§Ù„ÙƒÙ„Ø§Ù… Ø¨ØµÙˆØª Ø·Ø¨ÙŠØ¹ÙŠ ÙˆØ¨Ø´ÙƒÙ„ Ø¨Ø´Ø±ÙŠ: ${message}`,
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
      if (!sessionRes.ok) throw new Error(sessionData?.error || "Error creando sesiÃ³n realtime");
      const ephemeralKey = sessionData?.client_secret?.value || sessionData?.value || "";
      if (!ephemeralKey) throw new Error("No llegÃ³ client secret desde /api/realtime-session");

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

  const handleFormChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTramiteClick = (value: string) => setSelectedTramite(value);

  const handleFormSubmit = () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.city.trim() || !formData.province.trim()) {
      toast({ title: ui.missingTitle, description: ui.missingDesc, variant: "destructive" });
      return;
    }
    if (!selectedTramite) {
      toast({ title: ui.selectTramiteTitle, description: ui.selectTramiteDesc, variant: "destructive" });
      return;
    }
    setFormReady(true);
    setStep(1);
    pushAgentMessage(voiceTexts.savedLeadReply);
    toast({ title: ui.saveTitle, description: ui.saveDesc });
    setTimeout(() => {
      if (realtimeDcRef.current && realtimeDcRef.current.readyState === "open" && realtimePcRef.current?.remoteDescription) {
        sendSaraSpokenMessage(voiceTexts.savedLeadReply);
      }
    }, 150);
  };

  const handleAceptar = async () => {
    if (!selectedTramite) return;
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.city.trim()) {
      toast({ title: ui.missingTitle, description: ui.missingDesc, variant: "destructive" });
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      const { error } = await supabase.from("appointments").insert([
        {
          user_id: user?.id || null,
          appointment_type: selectedTramite,
          office_city: formData.city,
          office_province: formData.province,
          status: "searching",
          customer_name: formData.fullName,
          customer_phone: formData.phone,
          procedure_key: selectedTramite,
          notes: `Cliente: ${formData.fullName} - ${formData.phone}`,
        },
      ]);
      if (error) throw error;

      await fetch("https://PUT_YOUR_WEBHOOK_HERE", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          phone: formData.phone,
          tramite: selectedTramite,
          city: formData.city,
          province: formData.province,
        }),
      });

      scheduleMutation.mutate(
        { type: selectedTramite },
        {
          onSuccess: (result: unknown) => {
            const data = (result as AppointmentResult | null) ?? null;
            const hasReal = !!data?.locator && !!data?.date && !!data?.time && !!data?.office;
            if (!hasReal) {
              toast({ title: ui.panelUpdated, description: ui.agentSavedMsg });
              return;
            }
            setAppointmentData(data);
            setStep(2);
            pushAgentMessage(voiceTexts.foundMsg);
            setTimeout(() => {
              if (realtimeDcRef.current && realtimeDcRef.current.readyState === "open" && realtimePcRef.current?.remoteDescription) {
                sendSaraSpokenMessage(voiceTexts.foundMsg);
              }
            }, 150);
            toast({ title: ui.foundSuccessTitle, description: ui.foundSuccessDesc });
          },
          onError: (error: unknown) => {
            const message = error instanceof Error ? error.message : ui.foundErrorDesc;
            toast({ title: ui.foundErrorTitle, description: message, variant: "destructive" });
          },
        }
      );

      // âœ… Mensaje de Sara traducido
      pushAgentMessage(ui.agentSavedMsg);
    } catch (error) {
      console.error(error);
      toast({ title: ui.saveErrorTitle, description: ui.saveErrorDesc, variant: "destructive" });
    }
  };

  const handleConfirm = async () => {
    if (!appointmentData?.locator || !appointmentData?.date || !appointmentData?.time || !appointmentData?.office) {
      toast({ title: ui.noRealAppointmentTitle, description: ui.noRealAppointmentDesc, variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/create-checkout-sara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
  appointment_id: urlParams.appointmentId,
  token: urlParams.token,

  customer_name: formData.fullName,
  customer_phone: formData.phone,
  customer_email: formData.email,

  city: formData.city,

  office: appointmentData?.office || "",
  appointment_date: appointmentData?.date || "",
  appointment_hour: appointmentData?.time || "",

  tramite: selectedTramite,
}),
});
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast({ title: ui.stripeErrorTitle, description: ui.stripeErrorDesc, variant: "destructive" });
    }
  };

  const finalLocator = appointmentData?.locator || "";
  const finalDate = appointmentData?.date || "";
  const finalTime = appointmentData?.time || "";
  const finalOffice = appointmentData?.office || "";
  const finalPdfUrl = appointmentData?.confirmation_pdf_url || appointmentData?.pdf_url || null;
  const hasRealAppointment = !!appointmentData?.locator && !!appointmentData?.date && !!appointmentData?.time && !!appointmentData?.office;
  const officialUrl = "icp.administracionelectronica.gob.es";
  const cameFromConfirmationLink = !!urlParams.appointmentId || !!urlParams.token;

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
        {/* âœ… TÃ­tulo de pÃ¡gina traducido */}
        <h1 className="text-xl font-display font-bold px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">
          {cameFromConfirmationLink ? ui.pageTitleConfirm : ui.pageTitle}
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
    preload="metadata"
    poster="/images/sara.png"
    className="w-full h-full object-cover object-top"
    onPlay={() => {
      const btn = document.getElementById("play-button-sara");
      if (btn) btn.style.display = "none";
    }}
  >
    <source src="/sara-presentacion.mp4" type="video/mp4" />
  </video>

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
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="white"
      >
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
            {step === 2 && !confirmed && hasRealAppointment && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleConfirm}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                type="button"
              >
                <CheckCircle2 className="w-5 h-5" />
                {ui.confirmBtn}
              </motion.button>
            )}
          </motion.div>

          <OfficialBrowserBox
            language={language}
            avatarImage={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            title={cameFromConfirmationLink ? ui.pageTitleConfirm : ui.pageTitle}
            url={officialUrl}
            selectedTramiteLabel={selectedTramiteLabel}
            profileLoading={profileLoading}
            ui={ui}
            confirmed={confirmed}
            appointmentData={appointmentData}
            finalDate={finalDate}
            finalTime={finalTime}
            finalOffice={finalOffice}
            finalLocator={finalLocator}
            finalPdfUrl={finalPdfUrl}
            hasRealAppointment={hasRealAppointment}
            onRefresh={() => toast({ title: ui.panelUpdated })}
            onOpenOfficial={() => {
              window.open("https://icp.administracionelectronica.gob.es/icpplus/index.html", "_blank", "noopener,noreferrer");
            }}
            onSelectTramite={handleTramiteClick}
            tramites={TRAMITES}
            selectedTramite={selectedTramite}
            onAceptar={handleAceptar}
            isPending={scheduleMutation.isPending}
            cameFromConfirmationLink={cameFromConfirmationLink}
            formData={formData}
            onFormChange={handleFormChange}
            onFormSubmit={handleFormSubmit}
            formReady={formReady}
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
              Â© 2026 GestoriaCitaIA
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
                  <button onClick={() => setShowDocs(false)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs" type="button">âœ•</button>
                </div>
                <div className="px-5 py-4 space-y-2.5 max-h-72 overflow-y-auto">
                  {docsForSelectedTramite.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${doc.estado === "ok" ? "bg-green-500/20 text-green-400" : doc.estado === "warn" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {doc.estado === "ok" ? "âœ“" : doc.estado === "warn" ? "!" : "âœ—"}
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
                  <button onClick={() => setShowForms(false)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs" type="button">âœ•</button>
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
                      <span className="text-[10px] font-semibold text-white/40 group-hover:text-primary transition-colors shrink-0">PDF â†“</span>
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
