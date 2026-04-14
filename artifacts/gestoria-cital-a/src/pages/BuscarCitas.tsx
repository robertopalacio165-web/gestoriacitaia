import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PaymentModal } from "@/components/PaymentModal";
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
  MessageSquare,
  Send,
  ExternalLink,
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

function OfficialBrowserBox({
  avatarImage,
  title,
  url,
  selectedTramiteLabel,
  profileLoading,
  profileNie,
  profileName,
  profilePhone,
  profileEmail,
  ui,
  step,
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
}: {
  avatarImage: string;
  title: string;
  url: string;
  selectedTramiteLabel: string;
  profileLoading: boolean;
  profileNie: string;
  profileName: string;
  profilePhone: string;
  profileEmail: string;
  ui: any;
  step: number;
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
}) {
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
          <span className="text-xs text-gray-600 font-medium truncate">
            {url}
          </span>
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

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                {ui.procedureLabel}
              </p>

              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="border border-gray-200 rounded overflow-hidden divide-y divide-gray-100 mb-5">
              {tramites.map((item) => (
                <div
                  key={item.value}
                  onClick={() => onSelectTramite(item.value)}
                  className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    selectedTramite === item.value
                      ? "bg-yellow-300 font-semibold text-gray-900"
                      : "text-gray-700 hover:bg-blue-50"
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>

            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-5 space-y-3"
                >
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {ui.personalData}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                      value={profileNie}
                      readOnly
                      placeholder="NIE"
                    />
                    <input
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                      value={profileName}
                      readOnly
                      placeholder={ui.fullName}
                    />
                    <input
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                      value={profilePhone}
                      readOnly
                      placeholder={ui.phone}
                    />
                    <input
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50"
                      value={profileEmail}
                      readOnly
                      placeholder="Email"
                    />
                  </div>

                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-500" />
                    {profileLoading ? ui.loadingUserData : ui.aiFilledData}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
              <p className="text-sm font-semibold text-[#003366] mb-2">
                {title}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                La sede oficial no permite cargarse dentro de un iframe por
                seguridad. Sara te deja todo preparado aquí y abre la web
                oficial en una pestaña real para continuar.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenOfficial}
                  className="inline-flex items-center gap-2 bg-[#003366] text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#002244] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {ui.openOfficialSite}
                </button>

                <div className="inline-flex items-center rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-600 bg-white">
                  {selectedTramiteLabel}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onAceptar}
                disabled={isPending || !selectedTramite}
                className="bg-[#003366] text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-[#002244] transition-colors disabled:opacity-50 flex items-center gap-2"
                type="button"
              >
                {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                {ui.accept}
              </button>
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
  const [selectedTramite, setSelectedTramite] = useState("tie");
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [appointmentData, setAppointmentData] =
    useState<AppointmentResult | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sendingChat, setSendingChat] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [paymentTriggered, setPaymentTriggered] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatBootstrapped, setChatBootstrapped] = useState(false);

  const { t, lang } = useLang();
  const { toast } = useToast();
  const scheduleMutation = useScheduleAppointment();
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        initialChat:
          "وعليكم السلام، مرحبا بيك فـ GestoriaCitaIA. باش بغيتي نعاونك؟",
        online: "متصلة الآن",
        agentRole: "مستشارة المواعيد",
        procedureLabel: "الإجراء",
        procedurePlaceholder: "اختار الإجراء من اللائحة",
        personalData: "المعطيات الشخصية",
        fullName: "الاسم",
        phone: "الهاتف",
        loadingUserData: "جاري تحميل معطيات المستخدم...",
        aiFilledData: "المعطيات تعمرات أوتوماتيكياً من طرف الوكيل الذكي",
        accept: "موافق",
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
        muteSimple: "كتم",
        foundSuccessTitle: "لقينا الموعد!",
        foundSuccessDesc: "دابا أكد باش تكمل.",
        foundErrorTitle: "خطأ فالبحث عن الموعد",
        foundErrorDesc: "ما قدرناش نقلبو على الموعد دابا.",
        confirmSuccessTitle: "تم تأكيد الموعد!",
        confirmSuccessDesc: "الحجز تسجل بنجاح.",
        planActivated: "تفعلات الخطة",
        planContinue: "مزيان. نكملو دابا الموعد خطوة بخطوة.",
        paymentMessage:
          "باش تحجز الموعد وتكمل العملية، فعل الخطة ديالك. أنا نرشدك خطوة بخطوة.",
        paymentTriggerMessage:
          "باش نكملو ونخدمو على الملف ديالك، خاصك تفعل الخدمة. منين تخلص نكملو معاك مباشرة.",
        procedureShort: "الإجراء",
        chatPlaceholder: "كتب سؤالك...",
        openOfficialSite: "فتح الموقع الرسمي",
        downloadPdf: "تحميل PDF",
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
            { nombre: "Expired or soon-to-expire TIE card",
