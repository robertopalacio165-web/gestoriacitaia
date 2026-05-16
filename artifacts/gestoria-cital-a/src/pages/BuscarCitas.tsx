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
  onFormChange: (
    field: keyof ClientFormData,
    value: string
  ) => void;
  onFormSubmit: () => void;
  formReady: boolean;
}) {

const formIntro =
  language === "ma"
    ? "إلى كنتي باغي موعد عمر المعلومات ديالك واختار نوع السيتا ومن بعد سارة غادي تكمل معاك وتعلمك فالواتساب ملي يبان الموعد."
    : language === "en"
    ? "Fill in your information and choose the appointment type. Sara will continue with you and notify you on WhatsApp when an appointment appears."
    : "Si necesitas una cita, rellena tus datos y elige el tipo de cita. Después Sara continuará contigo y te avisará por WhatsApp cuando exista una cita real.";

const confirmationIntro =
  language === "ma"
    ? "دخلتي من رابط تأكيد الموعد. راجع المعلومات وأكد غير إلا كان الموعد حقيقي."
    : language === "en"
    ? "You arrived from the appointment confirmation link. Review the details and confirm only if the appointment is real."
    : "Has llegado desde el enlace de confirmación. Revisa los datos y confirma solo si la cita es real.";

const savedText =
  language === "ma"
    ? "مزيان. دابا عندنا المعلومات ديالك. ملي يبان الموعد غادي نعلموك فالواتساب."
    : language === "en"
    ? "Perfect. We already have your information. When an appointment appears, we will notify you on WhatsApp."
    : "Perfecto. Ya tenemos tus datos. En cuanto aparezca una cita real, te avisaremos por WhatsApp.";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-300 shadow-2xl bg-white min-h-[400px]"
    >
      <div className="bg-[#f1f3f4] border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 flex-1 border border-gray-200 shadow-sm min-w-0">
          <Shield className="w-3 h-3 text-green-600 shrink-0" />
          <span className="text-xs text-gray-600 font-medium truncate">{url}</span>
        </div>

        <button
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded shrink-0"
          type="button"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary shrink-0">
          <img
            src={avatarImage}
            alt="Sara"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 text-black">
        {!confirmed ? (
          <>
            <div className="flex items-center justify-center gap-3 mb-5 pb-4 border-b border-yellow-500/30">

  <div className="text-center">
    <p className="text-[10px] uppercase tracking-wide text-gray-400">
      extranjería
    </p>

    <h2 className="text-[#003366] font-black text-[24px] leading-none">
      CITA PREVIA
    </h2>
  </div>

  <img
    src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg"
    alt="España"
    className="w-16 rounded-md border border-yellow-500/30 shadow-sm"
  />
</div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
              <p className="text-sm font-semibold text-[#003366] mb-2">{title}</p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {cameFromConfirmationLink ? confirmationIntro : formIntro}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
{/* FULL NAME */}
<div>
 <label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "الاسم الكامل"
    : language === "en"
    ? "Full name"
    : "Nombre completo"}
</label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.fullName}
    onChange={(e) => onFormChange("fullName", e.target.value)}
    placeholder="Mohamed Amrani"
  />
</div>

{/* PHONE */}
<div>
 <label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "رقم الهاتف"
    : language === "en"
    ? "Phone number"
    : "Teléfono"}
</label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.phone}
    onChange={(e) => onFormChange("phone", e.target.value)}
    placeholder="+34 600 000 000"
  />
</div>

{/* EMAIL */}
<div>
<label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "البريد الإلكتروني"
    : language === "en"
    ? "Email"
    : "Email"}
</label>

  <input
    type="email"
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.email}
    onChange={(e) => onFormChange("email", e.target.value)}
    placeholder="cliente@gmail.com"
  />
</div>

{/* NIE */}
<div>
  <label className="block text-xs font-bold text-gray-700 mb-1">
    NIE
  </label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.nie}
    onChange={(e) => onFormChange("nie", e.target.value)}
    placeholder="Y1234567X"
  />
</div>

{/* PASSPORT */}
<div>
<label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "الباسبور"
    : language === "en"
    ? "Passport"
    : "Pasaporte"}
</label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.passport}
    onChange={(e) => onFormChange("passport", e.target.value)}
    placeholder="AA123456"
  />
</div>

{/* NATIONALITY */}
<div>
<label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "الجنسية"
    : language === "en"
    ? "Nationality"
    : "Nacionalidad"}
</label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.nationality}
    onChange={(e) => onFormChange("nationality", e.target.value)}
    placeholder="Marruecos"
  />
</div>

{/* BIRTH YEAR */}
<div>
<label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "سنة الازدياد"
    : language === "en"
    ? "Birth year"
    : "Año nacimiento"}
</label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.birthYear}
    onChange={(e) => onFormChange("birthYear", e.target.value)}
    placeholder="1998"
  />
</div>

{/* PREFERRED OFFICE */}
<div>
<label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "المكتب لي بغيتي (اختياري)"
    : language === "en"
    ? "Preferred office (optional)"
    : "Oficina preferida (opcional)"}
</label>

  <input
    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
    value={formData.preferredOffice}
    onChange={(e) => onFormChange("preferredOffice", e.target.value)}
    placeholder="Aluche"
  />
</div>
  {/* CITY */}
  <div>
    <label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "المدينة"
    : language === "en"
    ? "City"
    : "Ciudad"}
</label>
    <input
      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
      value={formData.city}
      onChange={(e) => onFormChange("city", e.target.value)}
      placeholder="Madrid"
    />
  </div>

  {/* PROVINCE */}
  <div>
  <label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "المقاطعة"
    : language === "en"
    ? "Province"
    : "Provincia"}
</label>
    <input
      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
      value={formData.province}
      onChange={(e) => onFormChange("province", e.target.value)}
      placeholder="Madrid"
    />
  </div>

</div>

                <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
  {language === "ma"
    ? "نوع السيتا"
    : language === "en"
    ? "Appointment type"
    : "Tipo de cita"}
</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={selectedTramite}
                    onChange={(e) => onSelectTramite(e.target.value)}
                  >
                    <option value="">{ui.procedurePlaceholder}</option>
                    {tramites.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

    <div className="mt-4">
  <div className="w-full rounded-3xl border border-yellow-500/30 bg-black p-3 shadow-[0_0_20px_rgba(255,215,0,0.12)]">

    <div className="flex items-start justify-between mb-2">
      <div>
   <p className="text-white text-[15px] font-bold">
  {language === "ma"
    ? "حجز الموعد"
    : language === "en"
    ? "Reserve your appointment"
    : "Reserva tu cita"}
</p>

        <span className="inline-flex mt-1 rounded-full bg-yellow-500 px-2 py-0.5 text-[9px] font-bold uppercase text-black">
          Premium
        </span>
      </div>

      <div className="text-right">
        <p className="text-yellow-400 text-[20px] font-black leading-none">
          5€
        </p>

        <p className="text-yellow-300 text-[11px] font-semibold">
    {language === "ma"
  ? "الحجز الأول"
  : language === "en"
  ? "Initial reservation"
  : "Reserva inicial"}
        </p>
      </div>
    </div>

    <p className="text-gray-300 text-[12px] mb-3 leading-snug">
    {language === "ma"
  ? "سارة غادي تبدا تقلب ليك على الموعد أوتوماتيكيا"
  : language === "en"
  ? "Sara will automatically start searching for your appointment"
  : "Sara empezará a buscar tu cita automáticamente"}

    </p>

    <button
      type="button"
      onClick={onFormSubmit}
className="w-full rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 px-3 py-2.5 text-[13px] font-black shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all hover:scale-[1.01]"
    >
{language === "ma"
  ? "🔐 حجز وبدء البحث"
  : language === "en"
  ? "🔐 Reserve and start search"
  : "🔐 Reservar y empezar búsqueda"}

    </button>

    <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-gray-300">
      <Shield className="w-3 h-3 text-yellow-400" />

      <span>
        {language === "ma"
          ? "دفع آمن عبر Stripe"
          : language === "en"
          ? "Secure payment with Stripe"
          : "Pago seguro con Stripe"}
      </span>
    </div>

    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#1434CB]">
        VISA
      </span>

      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#EB001B]">
        Mastercard
      </span>

      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">
         Pay
      </span>

      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">
        G Pay
      </span>
    </div>

  </div>
</div>
  

            {hasRealAppointment && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">
                  Cita real encontrada
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  Trámite: {appointmentData?.tramite || selectedTramiteLabel}
                </p>
                <p className="text-sm text-gray-700">Fecha: {finalDate}</p>
                <p className="text-sm text-gray-700">Hora: {finalTime}</p>
                <p className="text-sm text-gray-700">Oficina: {finalOffice}</p>
                <p className="text-sm text-gray-700">Localizador: {finalLocator}</p>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-10 gap-5"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#003366] mb-1">
                {ui.confirmTitle}
              </h2>

              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm">
                  <span className="font-bold text-gray-500">
                    {ui.procedureShort}:
                  </span>{" "}
                  <span className="text-gray-800">
                    {appointmentData?.tramite || selectedTramiteLabel}
                  </span>
                </p>

                <p className="text-sm">
                  <span className="font-bold text-gray-500">{ui.date}:</span>{" "}
                  <span className="text-gray-800">{finalDate}</span>
                </p>

                <p className="text-sm">
                  <span className="font-bold text-gray-500">{ui.time}:</span>{" "}
                  <span className="text-gray-800">{finalTime}</span>
                </p>

                <p className="text-sm">
                  <span className="font-bold text-gray-500">{ui.office}:</span>{" "}
                  <span className="text-gray-800">{finalOffice}</span>
                </p>

                <p className="text-sm">
                  <span className="font-bold text-gray-500">
                    {ui.appointmentNumber}:
                  </span>{" "}
                  <span className="font-mono text-green-700">{finalLocator}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-sm text-primary font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {ui.reservationSaved}
              </div>

              {finalPdfUrl ? (
                <a
                  href={finalPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#003366] text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#002244] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {ui.downloadPdf}
                </a>
              ) : null}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function BuscarCitas() {
  const { language } = useLang();
  const [location] = useLocation();
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [appointmentData, setAppointmentData] =
    useState<AppointmentResult | null>(null);
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
  const [formReady, setFormReady] = useState(false);
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
  const isDarija = language === "ma";
  const isEnglish = language === "en";

return {
    tramites: [
      {
        value: "tie",
        label: isDarija
          ? "تجديد البطاقة"
          : isEnglish
          ? "TIE renewal"
          : "Renovación TIE",
      },

      {
        value: "regreso",
        label: isDarija
          ? "رخصة الرجوع"
          : isEnglish
          ? "Return authorization"
          : "Autorización de Regreso",
      },

      {
        value: "nie",
        label: isDarija
          ? "رقم NIE"
          : isEnglish
          ? "NIE Number"
          : "Certificados y Asignación NIE",
      },

      {
        value: "ue",
        label: isDarija
          ? "أوراق الاتحاد الأوروبي"
          : isEnglish
          ? "EU Certificates"
          : "Certificados UE",
      },

      {
        value: "estudiantes",
        label: isDarija
          ? "أوراق الطلبة"
          : isEnglish
          ? "Students"
          : "Estudiantes",
      },

      {
        value: "trabajo",
        label: isDarija
          ? "رخصة العمل"
          : isEnglish
          ? "Work permit"
          : "Autorización de Trabajo",
      },

      {
        value: "arraigo",
        label: isDarija
          ? "أوراق التسوية"
          : isEnglish
          ? "Regularization"
          : "Arraigo Social / Laboral / Familiar",
      },

      {
        value: "familiar",
        label: isDarija
          ? "التجمع العائلي"
          : isEnglish
          ? "Family reunification"
          : "Reagrupación Familiar",
      },

      {
        value: "regularizacion",
        label: isDarija
          ? "التسوية الجماعية"
          : isEnglish
          ? "Mass regularization"
          : "Regularización extraordinaria 2026",
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
        {
          nombre: "Formulario EX-17",
          codigo: "EX-17",
          url: "https://example.com",
        },
      ],
    } as Record<string, FormItem[]>,

    online: isDarija
      ? "أونلاين"
      : isEnglish
      ? "Online"
      : "En línea",

    agentRole: isDarija
      ? "مساعدة المواعيد"
      : isEnglish
      ? "Appointments Assistant"
      : "Asesora de Citas",

    procedurePlaceholder: isDarija
      ? "اختار نوع السيتا"
      : isEnglish
      ? "Select appointment type"
      : "Seleccione el trámite entre los relacionados",

    loadingUserData: isDarija
      ? "جاري تحميل المعلومات..."
      : isEnglish
      ? "Loading user data..."
      : "Cargando datos del usuario...",

    govSmall: "extranjería:",
    govTitle: "CITA PREVIA",
    govLine1: "COMISARÍA GENERAL",
    govLine2: "DE EXTRANJERÍA",
    govLine3: "E INMIGRACIÓN",

    confirmTitle: isDarija
      ? "تم تأكيد الموعد!"
      : isEnglish
      ? "APPOINTMENT CONFIRMED!"
      : "¡CITA CONFIRMADA!",

    date: isDarija
      ? "التاريخ"
      : isEnglish
      ? "Date"
      : "Fecha",

    time: isDarija
      ? "الوقت"
      : isEnglish
      ? "Time"
      : "Hora",

    office: isDarija
      ? "المكتب"
      : isEnglish
      ? "Office"
      : "Oficina",

    appointmentNumber: isDarija
      ? "رقم الموعد"
      : isEnglish
      ? "Appointment Number"
      : "Nº Cita",

    reservationSaved: isDarija
      ? "تم حفظ الحجز"
      : isEnglish
      ? "Reservation saved"
      : "Reserva guardada correctamente",

    sourceLabel: isDarija
      ? "المصدر الرسمي"
      : isEnglish
      ? "Official source"
      : "Fuente oficial",

    foundSuccessTitle: isDarija
      ? "لقينا الموعد!"
      : isEnglish
      ? "Appointment found!"
      : "¡Cita encontrada!",

    foundSuccessDesc: isDarija
      ? "أكد الموعد دابا"
      : isEnglish
      ? "Confirm now to continue."
      : "Ahora confirma para continuar.",

    foundErrorTitle: isDarija
      ? "خطأ"
      : isEnglish
      ? "Error"
      : "Error al buscar cita",

    foundErrorDesc: isDarija
      ? "ما قدرناش نلقاو الموعد"
      : isEnglish
      ? "Could not search appointment."
      : "No se pudo buscar la cita en este momento.",

    confirmSuccessTitle: isDarija
      ? "تم تأكيد الموعد"
      : isEnglish
      ? "Appointment confirmed!"
      : "¡Cita confirmada!",

    confirmSuccessDesc: isDarija
      ? "تم حفظ الحجز"
      : isEnglish
      ? "Reservation saved correctly."
      : "La reserva ha quedado registrada correctamente.",

    procedureShort: isDarija
      ? "النوع"
      : isEnglish
      ? "Procedure"
      : "Trámite",

    openOfficialSite: isDarija
      ? "فتح الموقع الرسمي"
      : isEnglish
      ? "Open official website"
      : "Abrir sede oficial",

    downloadPdf: isDarija
      ? "تحميل PDF"
      : isEnglish
      ? "Download PDF"
      : "Descargar PDF",

    voiceButton: isDarija
      ? "تكلم مع سارة"
      : isEnglish
      ? "Talk with Sara"
      : "Hablar con Sara",

    stopButton: isDarija
      ? "وقف الميكرو"
      : isEnglish
      ? "Stop microphone"
      : "Parar micrófono",

    latestReply: isDarija
      ? "آخر رد من سارة"
      : isEnglish
      ? "Latest Sara reply"
      : "Última respuesta de Sara",

    yourVoice: isDarija
      ? "آخر كلام ديالك"
      : isEnglish
      ? "Your latest voice"
      : "Tu última respuesta por voz",

    listening: isDarija
      ? "سارة كتسمع ليك..."
      : isEnglish
      ? "Sara is listening..."
      : "Sara te está escuchando ahora...",

    saveTitle: isDarija
      ? "تم حفظ المعلومات"
      : isEnglish
      ? "Data saved"
      : "Datos guardados",

    saveDesc: isDarija
      ? "سارة غادي تكمل معاك"
      : isEnglish
      ? "Sara can continue now."
      : "Sara ya puede continuar contigo.",

    missingTitle: isDarija
      ? "معلومات ناقصة"
      : isEnglish
      ? "Missing data"
      : "Faltan datos",

    missingDesc: isDarija
      ? "دخل الاسم والهاتف والمدينة"
      : isEnglish
      ? "Fill name, phone and city."
      : "Rellena nombre, teléfono y ciudad antes de continuar.",

    openRealtimeError: isDarija
      ? "المتصفح ما كيدعمش الصوت"
      : isEnglish
      ? "Browser does not support audio."
      : "Este navegador no soporta audio. Usa Chrome moderno.",
};
}, [language]);

  const TRAMITES = ui.tramites;

  const selectedTramiteLabel =
    TRAMITES.find((item) => item.value === selectedTramite)?.label ||
    TRAMITES[0].label;

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

      setVoiceHistory([
        {
          from: "agent",
          text: voiceTexts.initialVoice,
          ts: Date.now(),
        },
      ]);
    } catch {
      setVoiceHistory([
        {
          from: "agent",
          text: voiceTexts.initialVoice,
          ts: Date.now(),
        },
      ]);
    }
  }, [voiceStorageKey, voiceTexts.initialVoice]);

  useEffect(() => {
    if (!voiceStorageKey || voiceHistory.length === 0) return;
    localStorage.setItem(voiceStorageKey, JSON.stringify(voiceHistory));
  }, [voiceHistory, voiceStorageKey]);

  const pushAgentMessage = (text: string) => {
    if (!text?.trim()) return;

    setVoiceHistory((prev) => [
      ...prev,
      {
        from: "agent",
        text,
        ts: Date.now(),
      },
    ]);

    lastAssistantTextRef.current = text;
  };

  const pushUserMessage = (text: string) => {
    if (!text?.trim()) return;

    setVoiceHistory((prev) => [
      ...prev,
      {
        from: "user",
        text,
        ts: Date.now(),
      },
    ]);

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
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
        },
      })
    );
  };

  const kickoffSara = () => {
    setIsListening(true);
    setWaitingSara(true);
    setLastUserTranscript("");
    lastUserTranscriptRef.current = "";
    assistantTextBufferRef.current = "";

    const firstMessage = formReady
      ? voiceTexts.savedLeadReply
      : voiceTexts.initialVoice;

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
      toast({
        title: "Error",
        description: ui.openRealtimeError,
        variant: "destructive",
      });
      return;
    }

    try {
      stopListening();
      assistantTextBufferRef.current = "";
      setWaitingSara(true);

      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "sara",
        }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        throw new Error(sessionData?.error || "Error creando sesión realtime");
      }

const ephemeralKey =
  sessionData?.client_secret?.value || sessionData?.value || "";

      if (!ephemeralKey) {
        throw new Error("No llegó client secret desde /api/realtime-session");
      }

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

          remoteAudioRef.current.play().catch((err) => {
            console.error("Sara audio play error:", err);
          });
        }
      };

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      realtimeLocalStreamRef.current = localStream;

      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }

      const dc = pc.createDataChannel("oai-events");
      realtimeDcRef.current = dc;

      dc.onopen = () => {
        shouldKickoffSaraRef.current = true;
      };

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

          if (
            msg.type === "response.output_text.delta" &&
            typeof msg.delta === "string"
          ) {
            assistantTextBufferRef.current += msg.delta;
          }

          if (
            msg.type === "response.output_text.done" &&
            typeof msg.text === "string" &&
            msg.text.trim()
          ) {
            assistantTextBufferRef.current = msg.text.trim();
          }

          if (msg.type === "response.done") {
            finalizeAssistantBuffer();
            setWaitingSara(false);
          }

          if (msg.type === "response.created") {
            setWaitingSara(true);
          }
        } catch (err) {
          console.error("Realtime Sara parse error:", err);
        }
      };

      dc.onerror = (err) => {
        console.error("Realtime Sara data channel error:", err);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(errText || "Error negociando WebRTC con OpenAI");
      }

      const answerSdp = await sdpRes.text();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      if (shouldKickoffSaraRef.current) {
        shouldKickoffSaraRef.current = false;
        setTimeout(() => {
          kickoffSara();
        }, 150);
      }
    } catch (error: any) {
      console.error("Error iniciando realtime Sara:", error);
      stopListening();

      toast({
        title: "Error realtime",
        description: error?.message || "No se pudo iniciar Sara realtime",
        variant: "destructive",
      });
    }
  };

  const handleFormChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTramiteClick = (value: string) => {
    setSelectedTramite(value);
  };

  const handleFormSubmit = () => {
    if (
      !formData.fullName.trim() ||
      !formData.phone.trim() ||
      !formData.city.trim() || !formData.province.trim()
    ) {
      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }

    if (!selectedTramite) {
      toast({
        title: "Selecciona trámite",
        description: "Elige el tipo de cita antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setFormReady(true);
    setStep(1);
    pushAgentMessage(voiceTexts.savedLeadReply);

    toast({
      title: ui.saveTitle,
      description: ui.saveDesc,
    });

    setTimeout(() => {
      if (
        realtimeDcRef.current &&
        realtimeDcRef.current.readyState === "open" &&
        realtimePcRef.current?.remoteDescription
      ) {
        sendSaraSpokenMessage(voiceTexts.savedLeadReply);
      }
    }, 150);
  };

const handleAceptar = async () => {
  if (!selectedTramite) return;

  if (
    !formData.fullName.trim() ||
    !formData.phone.trim() ||
    !formData.city.trim()
  ) {
    toast({
      title: "Faltan datos",
      description: "Nombre, teléfono y ciudad obligatorios",
      variant: "destructive",
    });
    return;
  }

  try {
    // 🟢 1. ناخدو اليوزر
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    // 🟢 2. نسجلو الطلب فـ Supabase
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

    // 🟢 3. نصيفطو ل Make (Webhook)
    await fetch("https://PUT_YOUR_WEBHOOK_HERE", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.fullName,
        phone: formData.phone,
        tramite: selectedTramite,
        city: formData.city,
province: formData.province,
      }),
    });

    // 🟢 4. نخلي النظام القديم يخدم (search cita)
    scheduleMutation.mutate(
      { type: selectedTramite },
      {
        onSuccess: (result: unknown) => {
          const data = (result as AppointmentResult | null) ?? null;

          const hasReal =
            !!data?.locator &&
            !!data?.date &&
            !!data?.time &&
            !!data?.office;

          if (!hasReal) {
            toast({
              title: "Sin cita real todavía",
              description:
                "Estamos buscando tu cita. Te avisaremos por WhatsApp.",
            });
            return;
          }

          setAppointmentData(data);
          setStep(2);
          pushAgentMessage(voiceTexts.foundMsg);

          setTimeout(() => {
            if (
              realtimeDcRef.current &&
              realtimeDcRef.current.readyState === "open" &&
              realtimePcRef.current?.remoteDescription
            ) {
              sendSaraSpokenMessage(voiceTexts.foundMsg);
            }
          }, 150);

          toast({
            title: ui.foundSuccessTitle,
            description: ui.foundSuccessDesc,
          });
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : ui.foundErrorDesc;

          toast({
            title: ui.foundErrorTitle,
            description: message,
            variant: "destructive",
          });
        },
      }
    );

    // 🟢 5. رسالة Sara
    pushAgentMessage(
      "Perfecto. Ya estamos buscando tu cita. Te avisaremos por WhatsApp en menos de 24h."
    );

  } catch (error) {
    console.error(error);

    toast({
      title: "Error",
      description: "No se pudo guardar el cliente",
      variant: "destructive",
    });
  }
};

 const handleConfirm = async () => {

  if (
    !appointmentData?.locator ||
    !appointmentData?.date ||
    !appointmentData?.time ||
    !appointmentData?.office
  ) {
    toast({
      title: "No hay cita real",
      description: "No puedes confirmar una cita inventada o incompleta.",
      variant: "destructive",
    });

    return;
  }

  try {

    const res = await fetch(
      "/api/create-checkout-sara",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          appointment_id: urlParams.appointmentId,
          token: urlParams.token,
        }),
      }
    );

    const data = await res.json();

    if (data.url) {

      window.location.href = data.url;

    }

  } catch (err) {

    console.error(err);

    toast({
      title: "Error Stripe",
      description: "No se pudo abrir el pago",
      variant: "destructive",
    });

  }

};

  const finalLocator = appointmentData?.locator || "";
  const finalDate = appointmentData?.date || "";
  const finalTime = appointmentData?.time || "";
  const finalOffice = appointmentData?.office || "";
  const finalPdfUrl =
    appointmentData?.confirmation_pdf_url || appointmentData?.pdf_url || null;

  const hasRealAppointment =
    !!appointmentData?.locator &&
    !!appointmentData?.date &&
    !!appointmentData?.time &&
    !!appointmentData?.office;

  const officialUrl = "icp.administracionelectronica.gob.es";
  const cameFromConfirmationLink =
    !!urlParams.appointmentId || !!urlParams.token;

  const latestAgentMessage =
    [...voiceHistory].reverse().find((msg) => msg.from === "agent")?.text ||
    voiceTexts.initialVoice;

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
          {cameFromConfirmationLink
            ? "Sara: confirmación de cita"
            : "Buscar citas"}
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
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-white">
                  {ui.online}
                </span>
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
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>

              {!muted && (
                <div className="absolute bottom-14 left-4 flex items-end gap-0.5 h-5">
                  {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [`${h}px`, `${h * 2}px`, `${h}px`] }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.07,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="absolute bottom-14 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">
                  Sara
                </p>
                <p className="text-white/70 text-xs drop-shadow-lg">
                  {ui.agentRole}
                </p>
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
                  {isListening ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>

            <div className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={!voiceSupported}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm px-4 py-3 transition-colors"
                  type="button"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      {ui.stopButton}
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      {ui.voiceButton}
                    </>
                  )}
                </button>

                {!voiceSupported && (
                  <p className="mt-2 text-xs text-red-400 text-center">
                    {ui.openRealtimeError}
                  </p>
                )}

                {isListening && (
                  <p className="mt-2 text-xs text-primary text-center">
                    {ui.listening}
                  </p>
                )}
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[11px] text-white/50 mb-1">
                    {ui.latestReply}
                  </p>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white/90 leading-relaxed">
                    {latestAgentMessage}
                  </div>
                </div>

                {lastUserTranscript ? (
                  <div>
                    <p className="text-[11px] text-white/50 mb-1">
                      {ui.yourVoice}
                    </p>
                    <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-white leading-relaxed">
                      {lastUserTranscript}
                    </div>
                  </div>
                ) : null}

                {waitingSara && (
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white/70">
                    ...
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel-heavy border border-primary/25 rounded-2xl rounded-tl-sm p-3 flex gap-3 shadow-lg relative overflow-hidden">
              <div className="relative shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                  className="w-9 h-9 rounded-full object-cover object-top border border-primary/40"
                  alt="Sara"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/90 leading-relaxed">
                  {formReady
                    ? `Hola, soy Sara. Voy a ayudarte con «${selectedTramiteLabel}» paso a paso.`
                    : "Hola, soy Sara. Primero rellena tus datos y luego seguimos."}
                </p>
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
                Confirmar cita
              </motion.button>
            )}

            <div className="lg:hidden glass-panel-heavy border border-white/10 rounded-2xl py-2.5 px-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowDocs(true);
                  setShowForms(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  showDocs
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/10 text-white/80"
                }`}
                type="button"
              >
                <FileText className="w-4 h-4 text-primary" />
                Documentos
              </button>

              <button
                onClick={() => {
                  setShowForms(true);
                  setShowDocs(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  showForms
                    ? "bg-secondary/20 border-secondary/40 text-secondary"
                    : "bg-white/5 border-white/10 text-white/80"
                }`}
                type="button"
              >
                <Settings className="w-4 h-4 text-secondary" />
                Formularios
              </button>
            </div>
          </motion.div>
<div className="w-full max-w-[430px] mx-auto">
          <OfficialBrowserBox
            language={language}
            avatarImage={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            title={
              cameFromConfirmationLink
                ? "Confirmación de cita con Sara"
                : "Panel oficial integrado"
            }
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
            onRefresh={() => {
              toast({
                title: "Panel actualizado",
              });
            }}
            onOpenOfficial={() => {
              window.open(
                "https://icp.administracionelectronica.gob.es/icpplus/index.html",
                "_blank",
                "noopener,noreferrer"
              );
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

        <div className="hidden lg:block sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDocs(true);
                  setShowForms(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showDocs
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <FileText className="w-4 h-4 text-primary" />
                Documentos
              </button>

              <button
                onClick={() => {
                  setShowForms(true);
                  setShowDocs(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  showForms
                    ? "bg-secondary/20 border-secondary/40 text-secondary"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
                type="button"
              >
                <Settings className="w-4 h-4 text-secondary" />
                Formularios
              </button>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60">
              © 2026 GestoriaCitaIA
            </div>
          </div>
        </div>

      
          {showForms && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div
                className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
                style={{ background: "#1a2236" }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-sm text-white">
                      Formularios oficiales
                    </span>
                  </div>

                  <button
                    onClick={() => setShowForms(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {formsForSelectedTramite.map((form, i) => (
                    <a
                      key={i}
                      href={form.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary">
                          {form.codigo}
                        </p>
                        <p className="text-sm text-white/80 truncate">
                          {form.nombre}
                        </p>
                      </div>

                      <span className="text-[10px] font-semibold text-white/40 group-hover:text-primary transition-colors shrink-0">
                        PDF ↓
                      </span>
                    </a>
                  ))}

                  <p className="text-[10px] text-white/30 text-center pt-1">
                    {ui.sourceLabel}
                  </p>
                </div>
              </div>
            </motion.div>
   
      
</main>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />


  );
}
