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

  const formIntro = isMa
    ? "إلى كنتي باغي موعد عمر المعلومات ديالك واختار نوع الموعد ومن بعد سارة غادي تكمل معاك وتعلمك فاش يكون الموعد."
    : isEn
    ? "Fill in your information and choose the appointment type. Sara will continue with you and notify you on WhatsApp when an appointment appears."
    : "Si necesitas una cita, rellena tus datos y elige el tipo de cita. Después Sara continuará contigo y te avisará por WhatsApp cuando exista una cita real.";

  const panelTitle = isMa
    ? "اللوحة الرسمية"
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
    ? "🎉 مبروك! تأكد الموعد ديالك"
    : isEn
    ? "🎉 APPOINTMENT CONFIRMED!"
    : "🎉 ¡CITA CONFIRMADA!"}
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
    ? "تم تأكيد الموعد ديالك بنجاح."
    : isEn
    ? "Your appointment has been successfully confirmed."
    : "Tu cita ha sido confirmada correctamente."}
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
    ? "✅ Reservation completed"
    : "✅ Reserva completada"}
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

  <div className="flex gap-2">

    <select
      className="w-[110px] h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-2 text-white"
      defaultValue="+34"
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
      placeholder="644403748"
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

                  {/* NIE / Pasaporte */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                {isMa ? "NIE / جواز السفر" : isEn ? "NIE / Passport" : "NIE / Pasaporte"}
                    </label>
                    <input
                      type="text"
                      placeholder="Y1234567X"
                      value={formData.nie}
                      onChange={(e) => onFormChange("nie", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* Ciudad */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المدينة" : isEn ? "City" : "Ciudad"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "المدينة" : isEn ? "City" : "Tu ciudad"}
                      value={formData.city}
                      onChange={(e) => onFormChange("city", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* Provincia */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المقاطعة" : isEn ? "Province" : "Provincia"}
                    </label>
                    <select
                      value={formData.province}
                      onChange={(e) => onFormChange("province", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">
                        {isMa ? "اختار" : isEn ? "Select" : "Selecciona"}
                      </option>
                      <option value="Madrid">Madrid</option>
                      <option value="Barcelona">Barcelona</option>
                      <option value="Valencia">Valencia</option>
                      <option value="Málaga">Málaga</option>
                    </select>
                  </div>

                  {/* Tipo de cita */}
             <div className="col-span-1 lg:col-span-2">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "نوع الموعد" : isEn ? "Appointment type" : "Tipo de cita"}
                    </label>
                    <select
                      value={selectedTramite}
                      onChange={(e) => onSelectTramite(e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white focus:outline-none focus:border-yellow-400"
                    >
                      {tramites.map((tramite) => (
                        <option
                          key={tramite.value}
                          value={tramite.value}
                          className="bg-[#060b16] text-white"
                        >
                          {tramite.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Caja de reserva */}
              <div className="mt-4 rounded-[28px] border-2 border-yellow-500 bg-gradient-to-b from-[#0b0b0b] to-[#050505] p-4 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
                <div className="flex items-start justify-between mb-4 pt-2">
                  <div>
                    <p className="text-white text-[15px] font-bold">
                      {isMa ? "حجز الموعد" : isEn ? "Reserve your appointment" : "Reserva tu cita"}
                    </p>
                    <span className="inline-flex mt-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]">
                      Premium
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 text-[34px] font-black leading-none drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
                      10€
                    </p>
                    <p className="text-yellow-300 text-[11px] font-semibold">
                      {isMa ? "الحجز الأول" : isEn ? "Initial reservation" : "Reserva inicial"}
                    </p>
                  </div>
                </div>

                <p className="text-gray-300 text-[13px] mb-5 leading-relaxed">
                  {isMa
                    ? "سارة غادي تبدا تقلب ليك على الموعد أوتوماتيكيا"
                    : isEn
                    ? "Sara will automatically start searching for your appointment"
                    : "Sara empezará a buscar tu cita automáticamente"}
                </p>

                <button
                  type="button"
              onClick={async () => {

  if (
    !formData.fullName.trim() ||
    !formData.phone.trim() ||
    !formData.city.trim() ||
    !formData.province.trim()
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

    nie: formData.nie,

    city: formData.city,

    province: formData.province,

    tramite: selectedTramite,
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
                    ? "🔐 حجز وبدء البحث"
                    : isEn
                    ? "🔐 Reserve and start search"
                    : "🔐 Reservar y empezar búsqueda"}
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

            {hasRealAppointment && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">
                  {isMa ? "لقينا الموعد الحقيقي" : isEn ? "Real appointment found" : "Cita real encontrada"}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {isMa ? "النوع" : isEn ? "Procedure" : "Trámite"}: {appointmentData?.tramite || selectedTramiteLabel}
                </p>
                <p className="text-sm text-gray-700">{isMa ? "التاريخ" : isEn ? "Date" : "Fecha"}: {finalDate}</p>
                <p className="text-sm text-gray-700">{isMa ? "الوقت" : isEn ? "Time" : "Hora"}: {finalTime}</p>
                <p className="text-sm text-gray-700">{isMa ? "المكتب" : isEn ? "Office" : "Oficina"}: {finalOffice}</p>
                <p className="text-sm text-gray-700">{isMa ? "رقم الموعد" : isEn ? "Locator" : "Localizador"}: {finalLocator}</p>
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
  ? "مبروك 🎉 بدينا نقلبو ليك على الموعد ديالك. إلى لقيناه غادي نعلموك فواتساب بشكل مستعجل خلال 24 ساعة."
  : isEn
  ? "Congratulations 🎉 We have started searching for your appointment. As soon as we find it, we will urgently notify you on WhatsApp within 24 hours."
  : "Felicidades 🎉 Hemos empezado a buscar tu cita. En cuanto la tengamos te avisaremos urgentemente por WhatsApp en menos de 24 horas."}
              </h3>
              <p className="text-center text-white/70 text-[14px] leading-relaxed">
                {isMa
                  ? "غادي نخبروك هنا ملي يكون جديد على الموعد ديالك."
                  : isEn
                  ? "We will notify you here when there is news about your appointment."
                  : "Te avisaremos aquí cuando haya novedades sobre tu cita."}
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
      ? "سارة دابا كتقلب ليك على موعد حقيقي وغادي توصلك رسالة فواتساب مباشرة ملي يبان الموعد."
      : isEn
      ? "Sara is now searching for a real appointment and you will receive a WhatsApp notification immediately when it appears."
      : "Sara está buscando una cita real ahora mismo y recibirás una notificación por WhatsApp en cuanto aparezca una disponibilidad."}

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
                    ? "مواعيد الأجانب بثقة"
                    : isEn
                    ? "Immigration Appointments with Confidence"
                    : "Citas de Extranjería con Confianza"}
                </h2>

                <p className="text-center text-white/75 text-[15px] leading-relaxed mb-8">
                  {isMa
                    ? "كنعاونوك تدير موعد الأجانب بطريقة سريعة وآمنة 100% أونلاين."
                    : isEn
                    ? "We help you manage your immigration appointment quickly, securely and 100% online."
                    : "Te ayudamos a gestionar tu cita de extranjería de forma rápida, segura y 100% online."}
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
                      {isMa ? "مواعيد مضمونة" : isEn ? "Guaranteed appointments" : "Citas garantizadas"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center text-[#f6d06f] text-[24px] font-bold">
                  {isMa
                    ? "« مستقبلك كيبدا بموعد. »"
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
        )}
      </div>
    </motion.div>
  );
}

export default function BuscarCitas() {
  // ✅ CORRECCIÓN PRINCIPAL: usamos lang del contexto y mapeamos a "ma" para la lógica interna
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
    nie: "",
    passport: "",
    nationality: "",
    birthYear: "",
    city: "",
    province: "",
    preferredOffice: "",
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
        "السلام عليكم مرحبا بك في هيستوريا إي آي أنا سارة غادي نعاونك باش تلقا موعد في أقرب وقت عمر ليا الفورمولار ومن بعد كليك على confirm",
      savedLeadReply:
        "مزيان دابا توصلنا بالمعلومة ديالك غادي نبدأ نقلب لك على موعد 24 ساعة على 24 وغادي نصيفط لك واتساب إلا بان الموعد",
      foundMsg:
        "لقينا لك السيطا ديالك دابا دخل بسرعة وكليكي على confirm باش ما تطيرش عليك",
      confirmMsg:
        "مبروك عليك تأكدات السيطا ديالك شكرا على الثقة ديالك في هيستوريا إي آي",
    }),
    []
  );

  const ui = useMemo(() => {
    return {
    tramites: [
  {
    value: "primera_tie",
    label: isMa
      ? "أول بطاقة TIE - البصمات"
      : isEn
      ? "First TIE - Fingerprints"
      : "Primera TIE (Toma de huellas)",
  },
  {
    value: "renovacion_tie",
    label: isMa
      ? "تجديد TIE - البصمات"
      : isEn
      ? "TIE Renewal - Fingerprints"
      : "Renovación TIE (Toma de huellas)",
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

      online: isMa ? "أونلاين" : isEn ? "Online" : "En línea",

      agentRole: isMa ? "مساعدة المواعيد" : isEn ? "Appointments Assistant" : "Asesora de Citas",

      procedurePlaceholder: isMa
        ? "اختار نوع السيتا"
        : isEn
        ? "Select appointment type"
        : "Seleccione el trámite entre los relacionados",

      loadingUserData: isMa
        ? "جاري تحميل المعلومات..."
        : isEn
        ? "Loading user data..."
        : "Cargando datos del usuario...",

      govSmall: "extranjería:",
      govTitle: "CITA PREVIA",
      govLine1: "COMISARÍA GENERAL",
      govLine2: "DE EXTRANJERÍA",
      govLine3: "E INMIGRACIÓN",

      confirmTitle: isMa ? "تم تأكيد الموعد!" : isEn ? "APPOINTMENT CONFIRMED!" : "¡CITA CONFIRMADA!",

      date: isMa ? "التاريخ" : isEn ? "Date" : "Fecha",
      time: isMa ? "الوقت" : isEn ? "Time" : "Hora",
      office: isMa ? "المكتب" : isEn ? "Office" : "Oficina",
      appointmentNumber: isMa ? "رقم الموعد" : isEn ? "Appointment Number" : "Nº Cita",

      reservationSaved: isMa
        ? "تم حفظ الحجز"
        : isEn
        ? "Reservation saved"
        : "Reserva guardada correctamente",

      sourceLabel: isMa ? "المصدر الرسمي" : isEn ? "Official source" : "Fuente oficial",

      foundSuccessTitle: isMa ? "لقينا الموعد!" : isEn ? "Appointment found!" : "¡Cita encontrada!",
      foundSuccessDesc: isMa ? "أكد الموعد دابا" : isEn ? "Confirm now to continue." : "Ahora confirma para continuar.",
      foundErrorTitle: isMa ? "خطأ" : isEn ? "Error" : "Error al buscar cita",
      foundErrorDesc: isMa ? "ما قدرناش نلقاو الموعد" : isEn ? "Could not search appointment." : "No se pudo buscar la cita en este momento.",

      confirmSuccessTitle: isMa ? "تم تأكيد الموعد" : isEn ? "Appointment confirmed!" : "¡Cita confirmada!",
      confirmSuccessDesc: isMa
        ? "تم حفظ الحجز"
        : isEn
        ? "Reservation saved correctly."
        : "La reserva ha quedado registrada correctamente.",

      procedureShort: isMa ? "النوع" : isEn ? "Procedure" : "Trámite",

      openOfficialSite: isMa ? "فتح الموقع الرسمي" : isEn ? "Open official website" : "Abrir sede oficial",
      downloadPdf: isMa ? "تحميل PDF" : isEn ? "Download PDF" : "Descargar PDF",

      voiceButton: isMa ? "تكلم مع سارة" : isEn ? "Talk with Sara" : "Hablar con Sara",
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

      // Textos del footer / barra de abajo
      docsButton: isMa ? "الوثائق" : isEn ? "Documents" : "Documentos",
      formsButton: isMa ? "الاستمارات" : isEn ? "Forms" : "Formularios",
      docsRequiredTitle: isMa ? "الوثائق المطلوبة" : isEn ? "Required documents" : "Documentos requeridos",
      formsOfficialTitle: isMa ? "الاستمارات الرسمية" : isEn ? "Official forms" : "Formularios oficiales",

      // Título página
      pageTitle: isMa ? "البحث على المواعيد" : isEn ? "Find appointments" : "Buscar citas",
      pageTitleConfirm: isMa ? "سارة: تأكيد الموعد" : isEn ? "Sara: appointment confirmation" : "Sara: confirmación de cita",

      // Mensaje Sara al guardar lead
      agentSavedMsg: isMa
        ? "مزيان. دابا كنقلبو على الموعد ديالك. غادي نخبروك فالواتساب في أقل من 24 ساعة."
        : isEn
        ? "Perfect. We are already looking for your appointment. We will notify you on WhatsApp within 24 hours."
        : "Perfecto. Ya estamos buscando tu cita. Te avisaremos por WhatsApp en menos de 24h.",

      // Confirmar cita botón
      confirmBtn: isMa ? "تأكيد الموعد" : isEn ? "Confirm appointment" : "Confirmar cita",

      // Errores varios
      noRealAppointmentTitle: isMa ? "ما كاين حتى موعد حقيقي" : isEn ? "No real appointment" : "No hay cita real",
      noRealAppointmentDesc: isMa
        ? "ما تقدرش تأكد موعد ناقص"
        : isEn
        ? "You cannot confirm an incomplete appointment."
        : "No puedes confirmar una cita inventada o incompleta.",

      stripeErrorTitle: isMa ? "خطأ في الدفع" : isEn ? "Payment error" : "Error Stripe",
      stripeErrorDesc: isMa ? "ما قدرناش نفتحو الدفع" : isEn ? "Could not open payment." : "No se pudo abrir el pago",

      saveErrorTitle: isMa ? "خطأ" : isEn ? "Error" : "Error",
      saveErrorDesc: isMa ? "ما قدرناش نحفظو المعلومات" : isEn ? "Could not save data." : "No se pudo guardar el cliente",

      panelUpdated: isMa ? "تحدث اللوحة" : isEn ? "Panel updated" : "Panel actualizado",

      selectTramiteTitle: isMa ? "اختار نوع الموعد" : isEn ? "Select procedure" : "Selecciona trámite",
      selectTramiteDesc: isMa
        ? "اختار نوع الموعد قبل تكمل"
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

      // ✅ Mensaje de Sara traducido
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
        {/* ✅ Título de página traducido */}
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
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                alt="Sara"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                <img
                  src={`${import.meta.env.BASE_URL}images/spain-gov.png`}
                  alt="España"
                  className="absolute top-3 right-20 w-10 h-7 object-cover rounded-[4px] border border-white/20 shadow-lg"
                />
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-white">{ui.online}</span>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                </div>
                <button
                  onClick={() => setMuted(!muted)}
                  className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center"
                  type="button"
                >
                  {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
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

              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${
                    isListening
                      ? "bg-destructive/80 border-destructive"
                      : "bg-black/50 border-white/20 hover:bg-black/70"
                  }`}
                  type="button"
                >
                  {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                </button>
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
