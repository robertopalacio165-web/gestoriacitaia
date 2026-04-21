import { useState, useEffect, useRef, useMemo } from "react";
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
  nie: string;
  city: string;
};

function OfficialBrowserBox({
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
  onRefresh,
  onOpenOfficial,
  onSelectTramite,
  tramites,
  selectedTramite,
  onAceptar,
  isPending,
  lang,
  cameFromConfirmationLink,
  formData,
  onFormChange,
  onFormSubmit,
  formReady,
}: {
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
  onRefresh: () => void;
  onOpenOfficial: () => void;
  onSelectTramite: (value: string) => void;
  tramites: TramiteItem[];
  selectedTramite: string;
  onAceptar: () => void;
  isPending: boolean;
  lang: string;
  cameFromConfirmationLink: boolean;
  formData: ClientFormData;
  onFormChange: (field: keyof ClientFormData, value: string) => void;
  onFormSubmit: () => void;
  formReady: boolean;
}) {
  const formIntro =
    lang === "darija"
      ? "إلا بغيتي موعد، عمر المعطيات ديالك واختار نوع الموعد، ومن بعد سارة غادي تكمل معاك بالصوت وتعلمك عبر واتساب منين تلقى الموعد."
      : lang === "en"
      ? "If you need an appointment, fill in your details and choose the appointment type. Then Sara will continue with you by voice and notify you on WhatsApp as soon as an appointment is found."
      : "Si necesitas una cita, rellena tus datos y elige el tipo de cita. Después Sara continuará contigo por voz y te avisará por WhatsApp en cuanto encuentre una cita.";

  const confirmationIntro =
    lang === "darija"
      ? "جاك رابط التأكيد. سارة وجدات الملف باش تكمل غير التأكيد النهائي."
      : lang === "en"
      ? "You arrived from the confirmation link. Sara has prepared the file so only the final confirmation is left."
      : "Has llegado desde el enlace de confirmación. Sara ha dejado el expediente preparado para que solo falte la confirmación final.";

  const savedText =
    lang === "darija"
      ? "ممتاز. دابا غادي نبداو نقلبو ليك على موعد بأسرع وقت ممكن. منين نلقاو الموعد غادي نعلموك عبر واتساب."
      : lang === "en"
      ? "Perfect. We will now start searching for your appointment as fast as possible. As soon as we find one, we will notify you on WhatsApp."
      : "Perfecto. Ahora vamos a buscarte una cita lo más rápido posible. En cuanto la encontremos, te avisaremos por WhatsApp.";

  const searchButtonText =
    lang === "darija"
      ? "ابدأ البحث عن الموعد"
      : lang === "en"
      ? "Start appointment search"
      : "Empezar búsqueda de cita";

  const saveButtonText =
    lang === "darija"
      ? "حفظ البيانات والمتابعة مع سارة"
      : lang === "en"
      ? "Save details and continue with Sara"
      : "Guardar datos y continuar con Sara";

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
            <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
              <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                <div className="w-7 h-12 bg-red-600" />
                <div className="w-7 h-12 bg-yellow-400" />
                <div className="w-7 h-12 bg-red-600" />
              </div>

              <div className="text-[9px] leading-tight text-gray-600 font-medium uppercase shrink-0">
                <div>{ui.govLine1}</div>
                <div>{ui.govLine2}</div>
                <div>{ui.govLine3}</div>
              </div>

              <div className="ml-auto text-right shrink-0">
                <div className="text-[10px] text-gray-500">{ui.govSmall}</div>
                <div className="text-sm sm:text-base font-black text-[#003366]">
                  {ui.govTitle}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
              <p className="text-sm font-semibold text-[#003366] mb-2">{title}</p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {cameFromConfirmationLink ? confirmationIntro : formIntro}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {lang === "darija"
                      ? "الاسم الكامل"
                      : lang === "en"
                      ? "Full name"
                      : "Nombre completo"}
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={formData.fullName}
                    onChange={(e) => onFormChange("fullName", e.target.value)}
                    placeholder={
                      lang === "darija"
                        ? "مثال: Mourad Mouna"
                        : lang === "en"
                        ? "Example: Mourad Mouna"
                        : "Ejemplo: Mourad Mouna"
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {lang === "darija"
                      ? "الهاتف"
                      : lang === "en"
                      ? "Phone"
                      : "Teléfono"}
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={formData.phone}
                    onChange={(e) => onFormChange("phone", e.target.value)}
                    placeholder="+34644403748"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {lang === "darija"
                      ? "NIE / الباسبور"
                      : lang === "en"
                      ? "NIE / Passport"
                      : "NIE / Pasaporte"}
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={formData.nie}
                    onChange={(e) => onFormChange("nie", e.target.value)}
                    placeholder="X1234567A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {lang === "darija"
                      ? "المدينة"
                      : lang === "en"
                      ? "City"
                      : "Ciudad"}
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={formData.city}
                    onChange={(e) => onFormChange("city", e.target.value)}
                    placeholder={
                      lang === "darija"
                        ? "مثال: Madrid"
                        : lang === "en"
                        ? "Example: Madrid"
                        : "Madrid"
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {lang === "darija"
                      ? "نوع الموعد"
                      : lang === "en"
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

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onFormSubmit}
                  className="inline-flex items-center justify-center rounded-xl bg-[#003366] text-white px-5 py-3 text-sm font-bold hover:bg-[#002244] transition-colors"
                >
                  {saveButtonText}
                </button>

                <button
                  type="button"
                  onClick={onOpenOfficial}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {ui.openOfficialSite}
                </button>
              </div>

              {profileLoading && (
                <p className="mt-3 text-[11px] text-gray-400">{ui.loadingUserData}</p>
              )}

              {formReady && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800">{savedText}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="inline-flex items-center rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-gray-700">
                      {selectedTramiteLabel}
                    </div>

                    <button
                      onClick={onAceptar}
                      disabled={isPending || !selectedTramite}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      type="button"
                    >
                      {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                      {searchButtonText}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 bg-[#003366] text-white rounded-xl px-4 py-2 text-sm font-bold opacity-70 cursor-default"
                >
                  <FileText className="w-4 h-4" />
                  {ui.downloadPdf}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function BuscarCitas() {
  const [location] = useLocation();
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentResult | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [formData, setFormData] = useState<ClientFormData>({
    fullName: "",
    phone: "",
    nie: "",
    city: "",
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
  

  const urlParams = useMemo(() => {
    const url = new URL(window.location.href);
    return {
      token: url.searchParams.get("token") || "",
      appointmentId: url.searchParams.get("appointment_id") || "",
    };
  }, [location]);

  const { t, lang } = useLang();
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();

  const voiceTexts = useMemo(
    () => ({
      initialVoice:
        "السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نشدّو ليك الموعد ديالك، عمر ليا الفورمولار ومن بعد نكمل معاك.",
      savedLeadReply:
        "مزيان. دابا خديت المعطيات ديالك، وغادي نبدا نقلب ليك على الموعد. منين نلقاو شي موعد غادي نعلموك فالواتساب.",
      voiceBlocked:
        "عافاك عمر الفورمولار الأول ومن بعد ضغط على الميكروفون باش نكمل معاك.",
      realtimeError:
        "وقع مشكل فالاتصال المباشر مع سارة. عاود حاول.",
      confirmationLinkMsg:
        "حملت رابط التأكيد ديالك. دابا نكملو غير التأكيد النهائي.",
      foundMsg:
        "مزيان. لقينا ليك موعد. دابا خاصك تأكد الموعد باش نكملو.",
      confirmMsg:
        "مزيان. تم تأكيد الموعد ديالك. غادي توصلك التفاصيل وPDF عبر الواتساب.",
      realtimeIntro: (tramiteLabel: string, form: ClientFormData) =>
        [
          "جاوبي ديما غير بالدارجة المغربية وبالحروف العربية.",
          "أنتِ سارة من GestoriaCitaIA.",
          "مختصة غير فالمواعيد ديال extranjería فإسبانيا.",
          "الأسلوب ديالك طبيعي، بشري، مهني، ومختصر.",
          "سولي غير سؤال واحد فكل مرة.",
          "ما تبدليش اللغة حسب لغة الموقع. ديما جاوبي بالدارجة المغربية.",
          `نوع الموعد هو: ${tramiteLabel || "مازال ما تختارش"}.`,
          `الاسم: ${form.fullName || "ما متسجلش"}.`,
          `الهاتف: ${form.phone || "ما متسجلش"}.`,
          `الهوية: ${form.nie || "ما متسجلش"}.`,
          `المدينة: ${form.city || "ما متسجلش"}.`,
          "إلى كان الفورمولار واجد، رحبي بالعميل وقولي ليه بلي غادي تبداي تقلبي ليه على الموعد، ومن بعد سوليه غير سؤال واحد قصير ومفيد.",
          "ما تخترعيش موعد وهمي وما تواعديش بموعد مضمون.",
        ].join(" "),
    }),
    []
  );

  const ui = useMemo(() => {
    if (lang === "darija") {
      return {
        tramites: [
          { value: "tie", label: "تجديد بطاقة هوية الأجنبي (TIE)" },
          { value: "regreso", label: "رخصة الرجوع" },
          { value: "nie", label: "شواهد وتعيين NIE" },
          { value: "ue", label: "شواهد الاتحاد الأوروبي" },
          { value: "estudiantes", label: "الطلبة" },
          { value: "trabajo", label: "رخصة العمل" },
          { value: "arraigo", label: "أرايغو اجتماعي / مهني / عائلي" },
          { value: "familiar", label: "التجمع العائلي" },
        ] as TramiteItem[],
        docsByTramite: {
          tie: [
            { nombre: "الباسبور أو NIE صالح", estado: "ok" },
            { nombre: "شهادة السكن الحالية", estado: "ok" },
            { nombre: "بطاقة TIE منتهية أو قربات تسالي", estado: "ok" },
            { nombre: "تصاور حديثة (2)", estado: "ok" },
            { nombre: "استمارة EX-17", estado: "warn" },
          ],
          regreso: [
            { nombre: "الباسبور صالح", estado: "ok" },
            { nombre: "TIE صالح", estado: "ok" },
            { nombre: "مبرر السفر", estado: "warn" },
          ],
          nie: [
            { nombre: "الباسبور صالح", estado: "ok" },
            { nombre: "مبرر طلب NIE", estado: "warn" },
            { nombre: "استمارة EX-15", estado: "missing" },
            { nombre: "تصاور حديثة (2)", estado: "ok" },
          ],
          ue: [
            { nombre: "باسبور الاتحاد الأوروبي صالح", estado: "ok" },
            { nombre: "شهادة السكن", estado: "ok" },
            { nombre: "استمارة EU", estado: "warn" },
          ],
          estudiantes: [
            { nombre: "الباسبور صالح", estado: "ok" },
            { nombre: "رسالة القبول الجامعي", estado: "warn" },
            { nombre: "التأمين الصحي", estado: "ok" },
            { nombre: "إثبات الموارد المالية", estado: "missing" },
          ],
          trabajo: [
            { nombre: "الباسبور صالح", estado: "ok" },
            { nombre: "عقد العمل", estado: "warn" },
            { nombre: "التسجيل فالضمان الاجتماعي", estado: "missing" },
            { nombre: "استمارة EX-07", estado: "missing" },
          ],
          arraigo: [
            { nombre: "الباسبور صالح", estado: "ok" },
            { nombre: "شهادة السكن (3 سنين)", estado: "ok" },
            { nombre: "شهادة السوابق العدلية", estado: "warn" },
            { nombre: "استمارة EX-10", estado: "missing" },
          ],
          familiar: [
            { nombre: "الباسبور صالح", estado: "ok" },
            { nombre: "شهادة العائلة UE/إسباني", estado: "ok" },
            { nombre: "دفتر العائلة / عقد الزواج", estado: "warn" },
            { nombre: "استمارة EX-19", estado: "missing" },
          ],
        } as Record<string, DocItem[]>,
        formsByTramite: {
          tie: [
            {
              nombre: "تجديد بطاقة الهوية TIE",
              codigo: "EX-17",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/17-Formulario_TIE.pdf",
            },
          ],
          regreso: [
            {
              nombre: "رخصة الرجوع",
              codigo: "EX-13",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/13-Autorizacion_de_regreso.pdf",
            },
          ],
          nie: [
            {
              nombre: "طلب رقم هوية الأجنبي",
              codigo: "EX-15",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/15-Solicitud_NIE.pdf",
            },
          ],
          ue: [
            {
              nombre: "تسجيل مواطن الاتحاد الأوروبي",
              codigo: "EU",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/EU-Cert_registro_ciudadano_UE.pdf",
            },
          ],
          estudiantes: [
            {
              nombre: "الإقامة للدراسة",
              codigo: "EX-01",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Formulario_estancia_estudios.pdf",
            },
          ],
          trabajo: [
            {
              nombre: "رخصة العمل",
              codigo: "EX-07",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/07-Autorizacion_residencia_trabajo.pdf",
            },
          ],
          arraigo: [
            {
              nombre: "أرايغو اجتماعي / مهني",
              codigo: "EX-10",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
            },
          ],
          familiar: [
            {
              nombre: "التجمع العائلي",
              codigo: "EX-02",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/02-Reagrupacion_familiar.pdf",
            },
          ],
        } as Record<string, FormItem[]>,
        online: "متصلة الآن",
        agentRole: "مستشارة المواعيد",
        procedureLabel: "الإجراء",
        procedurePlaceholder: "اختار الإجراء من اللائحة",
        loadingUserData: "جاري تحميل معطيات المستخدم...",
        govSmall: "الهجرة:",
        govTitle: "الموعد المسبق",
        govLine1: "المديرية العامة",
        govLine2: "للهجرة",
        govLine3: "والأجانب",
        confirmTitle: "تم تأكيد الموعد!",
        date: "التاريخ",
        time: "الوقت",
        office: "المكتب",
        appointmentNumber: "رقم الموعد",
        reservationSaved: "تم حفظ الحجز بنجاح",
        sourceLabel: "المصدر الرسمي",
        foundSuccessTitle: "لقينا الموعد!",
        foundSuccessDesc: "دابا أكد باش تكمل.",
        foundErrorTitle: "خطأ فالبحث عن الموعد",
        foundErrorDesc: "ما قدرناش نقلبو على الموعد دابا.",
        confirmSuccessTitle: "تم تأكيد الموعد!",
        confirmSuccessDesc: "الحجز تسجل بنجاح.",
        procedureShort: "الإجراء",
        openOfficialSite: "فتح الموقع الرسمي",
        downloadPdf: "تحميل PDF",
        voiceButton: "تكلم مع سارة",
        stopButton: "وقف الميكروفون",
        latestReply: "آخر جواب ديال سارة",
        yourVoice: "آخر جواب ديالك بالصوت",
        listening: "سارة كاتسمع ليك دابا...",
        saveTitle: "تحفظات المعطيات",
        saveDesc: "سارة تقدر دابا تكمل معاك بالصوت.",
        missingTitle: "كاينين بيانات ناقصين",
        missingDesc: "عمر الاسم والهاتف والمدينة قبل ما تكمل.",
        openRealtimeError:
          "هاد المتصفح ما كيدعمش الصوت المباشر. استعمل Chrome حديث.",
      };
    }

    if (lang === "en") {
      return {
        tramites: [
          { value: "tie", label: "TIE Card Renewal" },
          { value: "regreso", label: "Return Authorization" },
          { value: "nie", label: "NIE Certificates and Assignment" },
          { value: "ue", label: "EU Certificates" },
          { value: "estudiantes", label: "Students" },
          { value: "trabajo", label: "Work Authorization" },
          { value: "arraigo", label: "Social / Work / Family Rootedness" },
          { value: "familiar", label: "Family Reunification" },
        ] as TramiteItem[],
        docsByTramite: {
          tie: [
            { nombre: "Valid passport or NIE", estado: "ok" },
            { nombre: "Current registration certificate", estado: "ok" },
            { nombre: "Expired or soon-to-expire TIE card", estado: "ok" },
            { nombre: "Recent photos (2)", estado: "ok" },
            { nombre: "EX-17 form", estado: "warn" },
          ],
          regreso: [
            { nombre: "Valid passport", estado: "ok" },
            { nombre: "Valid TIE", estado: "ok" },
            { nombre: "Travel justification", estado: "warn" },
          ],
          nie: [
            { nombre: "Valid passport", estado: "ok" },
            { nombre: "NIE request justification", estado: "warn" },
            { nombre: "EX-15 form", estado: "missing" },
            { nombre: "Recent photos (2)", estado: "ok" },
          ],
          ue: [
            { nombre: "Valid EU passport", estado: "ok" },
            { nombre: "Registration certificate", estado: "ok" },
            { nombre: "EU form", estado: "warn" },
          ],
          estudiantes: [
            { nombre: "Valid passport", estado: "ok" },
            { nombre: "University admission letter", estado: "warn" },
            { nombre: "Health insurance", estado: "ok" },
            { nombre: "Financial proof", estado: "missing" },
          ],
          trabajo: [
            { nombre: "Valid passport", estado: "ok" },
            { nombre: "Employment contract", estado: "warn" },
            { nombre: "Social Security registration", estado: "missing" },
            { nombre: "EX-07 form", estado: "missing" },
          ],
          arraigo: [
            { nombre: "Valid passport", estado: "ok" },
            { nombre: "Registration certificate (3 years)", estado: "ok" },
            { nombre: "Criminal record certificate", estado: "warn" },
            { nombre: "EX-10 form", estado: "missing" },
          ],
          familiar: [
            { nombre: "Valid passport", estado: "ok" },
            { nombre: "EU/Spanish family certificate", estado: "ok" },
            { nombre: "Family book / marriage certificate", estado: "warn" },
            { nombre: "EX-19 form", estado: "missing" },
          ],
        } as Record<string, DocItem[]>,
        formsByTramite: {
          tie: [
            {
              nombre: "TIE Card Renewal",
              codigo: "EX-17",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/17-Formulario_TIE.pdf",
            },
          ],
          regreso: [
            {
              nombre: "Return Authorization",
              codigo: "EX-13",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/13-Autorizacion_de_regreso.pdf",
            },
          ],
          nie: [
            {
              nombre: "Foreigner identity number request",
              codigo: "EX-15",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/15-Solicitud_NIE.pdf",
            },
          ],
          ue: [
            {
              nombre: "EU citizen registration",
              codigo: "EU",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/EU-Cert_registro_ciudadano_UE.pdf",
            },
          ],
          estudiantes: [
            {
              nombre: "Study stay",
              codigo: "EX-01",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Formulario_estancia_estudios.pdf",
            },
          ],
          trabajo: [
            {
              nombre: "Work authorization",
              codigo: "EX-07",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/07-Autorizacion_residencia_trabajo.pdf",
            },
          ],
          arraigo: [
            {
              nombre: "Social / Work Rootedness",
              codigo: "EX-10",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
            },
          ],
          familiar: [
            {
              nombre: "Family Reunification",
              codigo: "EX-02",
              url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/02-Reagrupacion_familiar.pdf",
            },
          ],
        } as Record<string, FormItem[]>,
        online: "Online",
        agentRole: "Appointments Advisor",
        procedureLabel: "PROCEDURE",
        procedurePlaceholder: "Select the procedure from the list",
        loadingUserData: "Loading user data...",
        govSmall: "immigration:",
        govTitle: "APPOINTMENT",
        govLine1: "GENERAL OFFICE",
        govLine2: "OF IMMIGRATION",
        govLine3: "AND FOREIGNERS",
        confirmTitle: "APPOINTMENT CONFIRMED!",
        date: "Date",
        time: "Time",
        office: "Office",
        appointmentNumber: "Appointment No.",
        reservationSaved: "Reservation saved successfully",
        sourceLabel: "Official source",
        foundSuccessTitle: "Appointment found!",
        foundSuccessDesc: "Now confirm to continue.",
        foundErrorTitle: "Error finding appointment",
        foundErrorDesc: "Could not search for an appointment right now.",
        confirmSuccessTitle: "Appointment confirmed!",
        confirmSuccessDesc: "The booking was saved successfully.",
        procedureShort: "Procedure",
        openOfficialSite: "Open official site",
        downloadPdf: "Download PDF",
        voiceButton: "Talk to Sara",
        stopButton: "Stop microphone",
        latestReply: "Sara's latest reply",
        yourVoice: "Your latest voice answer",
        listening: "Sara is listening to you now...",
        saveTitle: "Data saved",
        saveDesc: "Sara can now continue with you by voice.",
        missingTitle: "Missing data",
        missingDesc: "Fill in name, phone and city before continuing.",
        openRealtimeError:
          "This browser does not support realtime voice. Use modern Chrome.",
      };
    }

    return {
      tramites: [
        {
          value: "tie",
          label: "Renovación de Tarjeta de Identidad de Extranjero (TIE)",
        },
        { value: "regreso", label: "Autorización de Regreso" },
        { value: "nie", label: "Certificados y Asignación NIE" },
        { value: "ue", label: "Certificados UE" },
        { value: "estudiantes", label: "Estudiantes" },
        { value: "trabajo", label: "Autorización de Trabajo" },
        { value: "arraigo", label: "Arraigo Social / Laboral / Familiar" },
        { value: "familiar", label: "Reagrupación Familiar" },
      ] as TramiteItem[],
      docsByTramite: {
        tie: [
          { nombre: "Pasaporte o NIE vigente", estado: "ok" },
          { nombre: "Empadronamiento actual", estado: "ok" },
          { nombre: "Tarjeta TIE caducada o próxima a caducar", estado: "ok" },
          { nombre: "Fotografías recientes (2)", estado: "ok" },
          { nombre: "Formulario EX-17", estado: "warn" },
        ],
        regreso: [
          { nombre: "Pasaporte vigente", estado: "ok" },
          { nombre: "TIE vigente", estado: "ok" },
          { nombre: "Justificación del viaje", estado: "warn" },
        ],
        nie: [
          { nombre: "Pasaporte vigente", estado: "ok" },
          { nombre: "Justificación solicitud NIE", estado: "warn" },
          { nombre: "Formulario EX-15", estado: "missing" },
          { nombre: "Fotografías recientes (2)", estado: "ok" },
        ],
        ue: [
          { nombre: "Pasaporte UE vigente", estado: "ok" },
          { nombre: "Empadronamiento", estado: "ok" },
          { nombre: "Formulario EU", estado: "warn" },
        ],
        estudiantes: [
          { nombre: "Pasaporte vigente", estado: "ok" },
          { nombre: "Carta de admisión universitaria", estado: "warn" },
          { nombre: "Seguro médico", estado: "ok" },
          { nombre: "Justificante económico", estado: "missing" },
        ],
        trabajo: [
          { nombre: "Pasaporte vigente", estado: "ok" },
          { nombre: "Contrato de trabajo", estado: "warn" },
          { nombre: "Alta en Seguridad Social", estado: "missing" },
          { nombre: "Formulario EX-07", estado: "missing" },
        ],
        arraigo: [
          { nombre: "Pasaporte vigente", estado: "ok" },
          { nombre: "Empadronamiento (3 años)", estado: "ok" },
          { nombre: "Certificado antecedentes penales", estado: "warn" },
          { nombre: "Formulario EX-10", estado: "missing" },
        ],
        familiar: [
          { nombre: "Pasaporte vigente", estado: "ok" },
          { nombre: "Certificado familiar UE/español", estado: "ok" },
          { nombre: "Libro de familia / acta matrimonial", estado: "warn" },
          { nombre: "Formulario EX-19", estado: "missing" },
        ],
      } as Record<string, DocItem[]>,
      formsByTramite: {
        tie: [
          {
            nombre: "Renovación de Tarjeta de Identidad (TIE)",
            codigo: "EX-17",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/17-Formulario_TIE.pdf",
          },
        ],
        regreso: [
          {
            nombre: "Autorización de Regreso",
            codigo: "EX-13",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/13-Autorizacion_de_regreso.pdf",
          },
        ],
        nie: [
          {
            nombre: "Asignación número de identidad extranjero",
            codigo: "EX-15",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/15-Solicitud_NIE.pdf",
          },
        ],
        ue: [
          {
            nombre: "Registro de ciudadano UE",
            codigo: "EU",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/EU-Cert_registro_ciudadano_UE.pdf",
          },
        ],
        estudiantes: [
          {
            nombre: "Estancia por estudios",
            codigo: "EX-01",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/01-Formulario_estancia_estudios.pdf",
          },
        ],
        trabajo: [
          {
            nombre: "Autorización de trabajo",
            codigo: "EX-07",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/07-Autorizacion_residencia_trabajo.pdf",
          },
        ],
        arraigo: [
          {
            nombre: "Arraigo Social / Laboral",
            codigo: "EX-10",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
          },
        ],
        familiar: [
          {
            nombre: "Reagrupación Familiar",
            codigo: "EX-02",
            url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/02-Reagrupacion_familiar.pdf",
          },
        ],
      } as Record<string, FormItem[]>,
      online: "En línea",
      agentRole: "Asesora de Citas",
      procedureLabel: "TRÁMITE",
      procedurePlaceholder: "Seleccione el trámite entre los relacionados",
      loadingUserData: "Cargando datos del usuario...",
      govSmall: "extranjería:",
      govTitle: "CITA PREVIA",
      govLine1: "COMISARÍA GENERAL",
      govLine2: "DE EXTRANJERÍA",
      govLine3: "E INMIGRACIÓN",
      confirmTitle: "¡CITA CONFIRMADA!",
      date: "Fecha",
      time: "Hora",
      office: "Oficina",
      appointmentNumber: "Nº Cita",
      reservationSaved: "Reserva guardada correctamente",
      sourceLabel: "Fuente oficial",
      foundSuccessTitle: "¡Cita encontrada!",
      foundSuccessDesc: "Ahora confirma para continuar.",
      foundErrorTitle: "Error al buscar cita",
      foundErrorDesc: "No se pudo buscar la cita en este momento.",
      confirmSuccessTitle: "¡Cita confirmada!",
      confirmSuccessDesc: "La reserva ha quedado registrada correctamente.",
      procedureShort: "Trámite",
      openOfficialSite: "Abrir sede oficial",
      downloadPdf: "Descargar PDF",
      voiceButton: "Hablar con Sara",
      stopButton: "Parar micrófono",
      latestReply: "Última respuesta de Sara",
      yourVoice: "Tu última respuesta por voz",
      listening: "Sara te está escuchando ahora...",
      saveTitle: "Datos guardados",
      saveDesc: "Sara ya puede continuar contigo por voz.",
      missingTitle: "Faltan datos",
      missingDesc: "Rellena nombre, teléfono y ciudad antes de continuar.",
      openRealtimeError:
        "Este navegador no soporta voz en tiempo real. Usa Chrome moderno.",
    };
  }, [lang]);

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

  const agentSteps = useMemo(() => {
    return [
      {
        text: `السلام، أنا سارة. غادي نعاونك فـ «${selectedTramiteLabel}» خطوة بخطوة.`,
        highlight: selectedTramiteLabel,
      },
      {
        text: "مزيان. دابا نقدر نكملو البحث على الموعد ديالك ونشعروك فالواتساب منين يبان.",
        highlight: "البحث على الموعد",
      },
      {
        text: "إلى لقا النظام موعد، غادي نكملو التأكيد ونصيفطو ليك الإشعار النهائي.",
        highlight: "التأكيد",
      },
    ];
  }, [selectedTramiteLabel]);

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

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("auth.getUser error:", userError);
          setProfileLoading(false);
          return;
        }

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
          console.error("load profile error:", error);
          setProfile(null);
        } else {
          setProfile((data as ProfileRow | null) ?? null);
        }
      } catch (error) {
        console.error("load profile fatal error:", error);
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
    if (!urlParams.appointmentId && !urlParams.token) return;

    setStep(1);
    setFormReady(true);

    setVoiceHistory((prev) => {
      const alreadyExists = prev.some((msg) =>
        msg.text.includes("رابط التأكيد")
      );

      if (alreadyExists) return prev;

      return [
        ...prev,
        {
          from: "agent",
          text: voiceTexts.confirmationLinkMsg,
          ts: Date.now(),
        },
      ];
    });
  }, [urlParams.appointmentId, urlParams.token, voiceTexts.confirmationLinkMsg]);

  useEffect(() => {
    if (!voiceStorageKey) return;

    try {
      const raw = localStorage.getItem(voiceStorageKey);

      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setVoiceHistory((prev) => {
            if (prev.length > 0) return prev;
            return parsed;
          });
          return;
        }
      }

      const freshHistory: ChatMsg[] = [
        {
          from: "agent",
          text: voiceTexts.initialVoice,
          ts: Date.now(),
        },
      ];

      setVoiceHistory((prev) => {
        if (prev.length > 0) return prev;
        return freshHistory;
      });
    } catch (error) {
      console.error("Error cargando historial de Sara:", error);
    }
  }, [voiceStorageKey, voiceTexts.initialVoice]);

  useEffect(() => {
    if (!voiceStorageKey || voiceHistory.length === 0) return;

    try {
      localStorage.setItem(voiceStorageKey, JSON.stringify(voiceHistory));
    } catch (error) {
      console.error("Error guardando historial de Sara:", error);
    }
  }, [voiceHistory, voiceStorageKey]);

  const speakLocalText = (text: string) => {
    if (muted) return;
    if (!("speechSynthesis" in window)) return;
    if (!text?.trim()) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-MA";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error reproduciendo voz local Sara:", error);
    }
  };

  const pushAgentMessage = (text: string, speak = false) => {
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

    if (speak && !isListening) {
      setTimeout(() => {
        speakLocalText(text);
      }, 120);
    }
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

  const finalizeAssistantBuffer = () => {
    const text = assistantTextBufferRef.current.trim();
    if (!text) return;

    assistantTextBufferRef.current = "";

    if (text === "..." || text === "…") return;
    if (text === lastAssistantTextRef.current) return;

    pushAgentMessage(text, false);
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

  const startListening = async ({
    autoPrompt = "",
  }: {
    autoPrompt?: string;
  } = {}) => {
dc.onopen = () => {
  console.log("SARA dc.onopen OK");

  setIsListening(true);
  setWaitingSara(true);

  const firstPrompt = formReady
    ? [
        "ابدئي دابا أنتِ الأولى وما تستنايش العميل يهضر.",
        "رحبي بالعميل بالدارجة المغربية وبالحروف العربية.",
        "قولي ليه بالضبط: مزيان. دابا غادي نقلبو ليك على الموعد، ومنين يبان غادي نعلموك فـ WhatsApp باش تدخل وتأكد الموعد ديالك.",
        "خلي الجواب قصير، طبيعي، وبشري.",
      ].join(" ")
    : [
        "ابدئي دابا أنتِ الأولى وما تستنايش العميل يهضر.",
        "رحبي بالعميل بالدارجة المغربية وبالحروف العربية.",
        "قولي ليه بالضبط: السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نشدّو ليك موعد، عمر ليا الفورمولار، ومن بعد أنا غادي نكمل معاك الهضرة.",
        "خلي الجواب قصير، طبيعي، وبشري.",
      ].join(" ");

  dc.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: formReady
              ? "ابدئي دابا وتكلمي مع العميل على البحث عن الموعد."
              : "ابدئي دابا ورحبي بالعميل وطلبي منو يعمر الفورمولار الأول.",
          },
        ],
      },
    })
  );

  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: [voiceTexts.realtimeIntro, firstPrompt].join(" "),
      },
    })
  );
};

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

      const ephemeralKey = sessionData?.value || "";

      if (!ephemeralKey) {
        throw new Error("No llegó value desde realtime-session");
      }

      const pc = new RTCPeerConnection();
      realtimePcRef.current = pc;

pc.ontrack = (event) => {
  console.log("SARA ontrack OK", event.streams);

  const [remoteStream] = event.streams;

  if (remoteStream && remoteAudioRef.current) {
    remoteAudioRef.current.srcObject = remoteStream;
    remoteAudioRef.current.autoplay = true;
    remoteAudioRef.current.playsInline = true;
    remoteAudioRef.current.muted = false;
    remoteAudioRef.current.volume = 1;

    remoteAudioRef.current
      .play()
      .then(() => {
        console.log("SARA audio.play OK");
      })
      .catch((err) => {
        console.error("SARA audio.play ERROR", err);
      });
  } else {
    console.error("SARA remote stream o audio ref missing");
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
  console.log("SARA dc.onopen OK");

  setIsListening(true);
  setWaitingSara(true);

  const firstPrompt = formReady
    ? [
        "ابدئي دابا أنتِ الأولى وما تستنايش العميل يهضر.",
        "رحبي بالعميل بالدارجة المغربية وبالحروف العربية.",
        "قولي ليه بالضبط: مزيان. دابا غادي نقلبو ليك على الموعد، ومنين يبان غادي نعلموك فـ WhatsApp باش تدخل وتأكد الموعد ديالك.",
        "خلي الجواب قصير، طبيعي، وبشري.",
      ].join(" ")
    : [
        "ابدئي دابا أنتِ الأولى وما تستنايش العميل يهضر.",
        "رحبي بالعميل بالدارجة المغربية وبالحروف العربية.",
        "قولي ليه بالضبط: السلام، مرحبا بيك فـ GestoriaCitaIA. إلا بغيتي نشدّو ليك موعد، عمر ليا الفورمولار، ومن بعد أنا غادي نكمل معاك الهضرة.",
        "خلي الجواب قصير، طبيعي، وبشري.",
      ].join(" ");

  dc.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: formReady
              ? "ابدئي دابا وتكلمي مع العميل على البحث عن الموعد."
              : "ابدئي دابا ورحبي بالعميل وطلبي منو يعمر الفورمولار الأول.",
          },
        ],
      },
    })
  );

  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: [voiceTexts.realtimeIntro, firstPrompt].join(" "),
      },
    })
  );
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
              setLastUserTranscript(transcript);
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
    } catch (error: any) {
      console.error("Error iniciando realtime Sara:", error);
      stopListening();

      toast({
        title: "Error realtime",
        description: error?.message || voiceTexts.realtimeError,
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.city.trim()) {
      toast({
        title: ui.missingTitle,
        description: ui.missingDesc,
        variant: "destructive",
      });
      return;
    }

    if (!selectedTramite) {
      toast({
        title:
          lang === "en"
            ? "Select procedure"
            : lang === "darija"
            ? "اختار الإجراء"
            : "Selecciona trámite",
        description:
          lang === "en"
            ? "Choose the appointment type before continuing."
            : lang === "darija"
            ? "اختار نوع الموعد قبل ما تكمل."
            : "Elige el tipo de cita antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setFormReady(true);
    setStep(1);

    pushAgentMessage(voiceTexts.savedLeadReply, true);

    toast({
      title: ui.saveTitle,
      description: ui.saveDesc,
    });

    setTimeout(() => {
      startListening({
        autoPrompt: [
          "الفورمولار تكمل.",
          "رحبي دابا بالعميل بالدارجة المغربية.",
          "قولي ليه بلي غادي تبداي تقلبي ليه على الموعد.",
          "ومن بعد سوليه غير سؤال واحد قصير ومفيد.",
        ].join(" "),
      }).catch(() => {});
    }, 500);
  };

  const handleAceptar = () => {
    if (!selectedTramite) return;

    scheduleMutation.mutate(
      { type: selectedTramite },
      {
        onSuccess: (result: unknown) => {
          const data = (result as AppointmentResult | null) ?? null;
          setAppointmentData(data);
          setStep(2);

          pushAgentMessage(voiceTexts.foundMsg, true);

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
  };

  const handleConfirm = () => {
    setConfirmed(true);

    pushAgentMessage(voiceTexts.confirmMsg, true);

    toast({
      title: ui.confirmSuccessTitle,
      description: ui.confirmSuccessDesc,
    });
  };

  const finalLocator = appointmentData?.locator || "ESP-2026-034821";
  const finalDate =
    appointmentData?.date ||
    (lang === "en"
      ? "Tuesday, March 24, 2026"
      : lang === "darija"
      ? "الثلاثاء 24 مارس 2026"
      : "Martes, 24 de Marzo 2026");
  const finalTime = appointmentData?.time || "10:30";
  const finalOffice =
    appointmentData?.office ||
    (lang === "en"
      ? "Immigration Office - Madrid"
      : lang === "darija"
      ? "مكتب الهجرة - مدريد"
      : "Comisaría de Extranjería - Madrid");
  const finalPdfUrl =
    appointmentData?.confirmation_pdf_url || appointmentData?.pdf_url || null;

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
            ? lang === "darija"
              ? "سارة: تأكيد الموعد"
              : lang === "en"
              ? "Sara: Appointment confirmation"
              : "Sara: confirmación de cita"
            : t("buscar_title")}
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
                <p className="text-white font-bold text-sm drop-shadow-lg">Sara</p>
                <p className="text-white/70 text-xs drop-shadow-lg">{ui.agentRole}</p>
              </div>

              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                <button
                  onClick={isListening ? stopListening : () => startListening()}
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
                  onClick={isListening ? stopListening : () => startListening()}
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
                  <p className="text-[11px] text-white/50 mb-1">{ui.latestReply}</p>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white/90 leading-relaxed">
                    {latestAgentMessage}
                  </div>
                </div>

                {lastUserTranscript ? (
                  <div>
                    <p className="text-[11px] text-white/50 mb-1">{ui.yourVoice}</p>
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

            <AnimatePresence mode="wait">
              <motion.div
                key={`${step}-${selectedTramite}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel-heavy border border-primary/25 rounded-2xl rounded-tl-sm p-3 flex gap-3 shadow-lg relative overflow-hidden"
              >
                <div className="relative shrink-0">
                  <img
                    src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                    className="w-9 h-9 rounded-full object-cover object-top border border-primary/40"
                    alt="Sara"
                  />
                  {!muted && (
                    <motion.div
                      className="absolute -inset-1 rounded-full border border-primary/40"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/90 leading-relaxed">
                    {agentSteps[Math.min(step, agentSteps.length - 1)]?.text || ""}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {step === 2 && !confirmed && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleConfirm}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                  type="button"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {t("buscar_confirmar")}
                </motion.button>
              )}
            </AnimatePresence>

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
                {t("buscar_docs")}
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
                {t("buscar_forms")}
              </button>
            </div>
          </motion.div>

          <OfficialBrowserBox
            avatarImage={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            title={
              cameFromConfirmationLink
                ? lang === "darija"
                  ? "تأكيد الموعد مع سارة"
                  : lang === "en"
                  ? "Appointment confirmation with Sara"
                  : "Confirmación de cita con Sara"
                : lang === "darija"
                ? "لوحة رسمية مدمجة"
                : lang === "en"
                ? "Integrated official panel"
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
            onRefresh={() => {
              toast({
                title:
                  lang === "darija"
                    ? "تم تحديث اللوحة"
                    : lang === "en"
                    ? "Panel refreshed"
                    : "Panel actualizado",
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
            lang={lang}
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
                {t("buscar_docs")}
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
                {t("buscar_forms")}
              </button>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60">
              © 2026 GestoriaCitaIA
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showDocs && (
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
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-white">
                      {t("buscar_docs_required")}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowDocs(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-5 py-4 space-y-2.5 max-h-72 overflow-y-auto">
                  {docsForSelectedTramite.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          doc.estado === "ok"
                            ? "bg-green-500/20 text-green-400"
                            : doc.estado === "warn"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {doc.estado === "ok"
                          ? "✓"
                          : doc.estado === "warn"
                          ? "!"
                          : "✗"}
                      </span>

                      <span className="text-sm text-white/90">{doc.nombre}</span>

                      <span
                        className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          doc.estado === "ok"
                            ? "bg-green-500/15 text-green-400"
                            : doc.estado === "warn"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {doc.estado === "ok"
                          ? t("buscar_doc_ready")
                          : doc.estado === "warn"
                          ? t("buscar_doc_review")
                          : t("buscar_doc_missing")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
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
                      {t("buscar_forms_official")}
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
                        <p className="text-xs font-bold text-primary">{form.codigo}</p>
                        <p className="text-sm text-white/80 truncate">{form.nombre}</p>
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
          )}
        </AnimatePresence>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </main>
    </div>
  );
}
