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
        initialChat: "Hello, welcome to GestoriaCitaIA. How can I help you?",
        online: "Online",
        agentRole: "Appointments Advisor",
        procedureLabel: "PROCEDURE",
        procedurePlaceholder: "Select the procedure from the list",
        personalData: "PERSONAL DATA",
        fullName: "Name",
        phone: "Phone",
        loadingUserData: "Loading user data...",
        aiFilledData: "Data automatically filled by the AI agent",
        accept: "Accept",
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
        muteSimple: "Mute",
        foundSuccessTitle: "Appointment found!",
        foundSuccessDesc: "Now confirm to continue.",
        foundErrorTitle: "Error finding appointment",
        foundErrorDesc: "Could not search for an appointment right now.",
        confirmSuccessTitle: "Appointment confirmed!",
        confirmSuccessDesc: "The booking was saved successfully.",
        planActivated: "Plan activated",
        planContinue:
          "Perfect. Let's continue with your appointment step by step.",
        paymentMessage:
          "To book your appointment and continue the process, activate your plan. I’ll guide you step by step.",
        paymentTriggerMessage:
          "To continue with your case, activate the service and we continue with you step by step.",
        procedureShort: "Procedure",
        chatPlaceholder: "Type your question...",
        openOfficialSite: "Open official site",
        downloadPdf: "Download PDF",
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
      initialChat: "Hola, bienvenida a GestoriaCitaIA. ¿En qué te ayudo?",
      online: "En línea",
      agentRole: "Asesora de Citas",
      procedureLabel: "TRÁMITE",
      procedurePlaceholder: "Seleccione el trámite entre los relacionados",
      personalData: "DATOS PERSONALES",
      fullName: "Nombre",
      phone: "Teléfono",
      loadingUserData: "Cargando datos del usuario...",
      aiFilledData: "Datos rellenados automáticamente por el agente IA",
      accept: "Aceptar",
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
      muteSimple: "Mute",
      foundSuccessTitle: "¡Cita encontrada!",
      foundSuccessDesc: "Ahora confirma para continuar.",
      foundErrorTitle: "Error al buscar cita",
      foundErrorDesc: "No se pudo buscar la cita en este momento.",
      confirmSuccessTitle: "¡Cita confirmada!",
      confirmSuccessDesc: "La reserva ha quedado registrada correctamente.",
      planActivated: "Plan activado",
      planContinue: "Perfecto. Continuamos con tu cita paso a paso.",
      paymentMessage:
        "Para reservar tu cita y continuar con el proceso, activa tu plan. Yo te guío paso a paso.",
      paymentTriggerMessage:
        "Para continuar con tu trámite, activa el servicio y seguimos contigo paso a paso.",
      procedureShort: "Trámite",
      chatPlaceholder: "Escribe tu pregunta...",
      openOfficialSite: "Abrir sede oficial",
      downloadPdf: "Descargar PDF",
    };
  }, [lang]);

  const TRAMITES = ui.tramites;

  const selectedTramiteLabel =
    TRAMITES.find((item) => item.value === selectedTramite)?.label ||
    TRAMITES[0].label;

  const chatStorageKey = useMemo(() => {
    const userId = profile?.id || "guest";
    return `gestoriacitaia_sara_chat_${userId}_${lang}_${selectedTramite}`;
  }, [profile?.id, lang, selectedTramite]);

  const docsForSelectedTramite =
    ui.docsByTramite[selectedTramite] ?? ui.docsByTramite.tie;

  const formsForSelectedTramite =
    ui.formsByTramite[selectedTramite] ?? ui.formsByTramite.tie;

  const agentSteps = useMemo(() => {
    if (lang === "darija") {
      return [
        {
          text: `سلام، أنا سارة. اختار الإجراء ديالك وأنا نرشدك خطوة بخطوة. غادي نخدمو على «${selectedTramiteLabel}»`,
          highlight: selectedTramiteLabel,
        },
        {
          text: "مزيان. عمرت البيانات ديالك أوتوماتيكياً. دابا نقدر نكملو البحث على الموعد.",
          highlight: "البحث على الموعد",
        },
        {
          text: "إلى لقا النظام موعد، غادي نكملو التأكيد ونصيفطو ليك الإشعار.",
          highlight: "التأكيد",
        },
      ];
    }

    if (lang === "en") {
      return [
        {
          text: `Hi, I’m Sara. We are now working on “${selectedTramiteLabel}”.`,
          highlight: selectedTramiteLabel,
        },
        {
          text: "Perfect. Your data is already filled in automatically. Now we can continue searching for the appointment.",
          highlight: "searching for the appointment",
        },
        {
          text: "If the system finds an appointment, we will continue with confirmation and notification.",
          highlight: "confirmation",
        },
      ];
    }

    return [
      {
        text: `Hola, soy Sara. Vamos a trabajar ahora el trámite «${selectedTramiteLabel}».`,
        highlight: selectedTramiteLabel,
      },
      {
        text: "Perfecto. Tus datos ya están rellenados automáticamente. Ahora podemos continuar con la búsqueda de la cita.",
        highlight: "búsqueda de la cita",
      },
      {
        text: "Si el sistema encuentra una cita, continuaremos con la confirmación y el aviso.",
        highlight: "confirmación",
      },
    ];
  }, [lang, selectedTramiteLabel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sendingChat]);

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
    if (!chatStorageKey) return;

    try {
      const raw = localStorage.getItem(chatStorageKey);

      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);

          const userMsgs = parsed.filter((m) => m.from === "user").length;
          setUserMessageCount(userMsgs);

          const paymentAlreadyTriggered = parsed.some(
            (m) =>
              m.from === "agent" &&
              (m.text.includes("activar el servicio") ||
                m.text.includes("تفعل الخدمة") ||
                m.text.includes("activate the service"))
          );

          setPaymentTriggered(paymentAlreadyTriggered);
          setChatBootstrapped(true);
          return;
        }
      }

      const freshChat: ChatMsg[] = [
        {
          from: "agent",
          text: ui.initialChat,
          ts: Date.now(),
        },
      ];

      setChatMessages(freshChat);
      setUserMessageCount(0);
      setPaymentTriggered(false);
      setChatBootstrapped(true);
    } catch (error) {
      console.error("Error cargando historial de Sara:", error);
      setChatBootstrapped(true);
    }
  }, [chatStorageKey, ui.initialChat]);

  useEffect(() => {
    if (!chatBootstrapped || !chatStorageKey || chatMessages.length === 0) {
      return;
    }

    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
    } catch (error) {
      console.error("Error guardando historial de Sara:", error);
    }
  }, [chatMessages, chatBootstrapped, chatStorageKey]);

  const handleTramiteClick = (value: string) => {
    setSelectedTramite(value);

    if (step === 0 && planActivo) {
      setStep(1);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat || !chatBootstrapped) return;

    const rawText = chatInput.trim();
    const nextUserCount = userMessageCount + 1;
    const shouldTriggerPayment =
      !planActivo && !paymentTriggered && nextUserCount >= 2;

    const userMessage: ChatMsg = {
      from: "user",
      text: rawText,
      ts: Date.now(),
    };

    const historyToSend = chatMessages.slice(-8).map((msg) => ({
      from: msg.from,
      text: msg.text,
    }));

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setSendingChat(true);
    setUserMessageCount(nextUserCount);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant: "sara",
          context: "buscar_citas",
          message: rawText,
          lang,
          procedureKey: selectedTramite,
          procedureLabel: selectedTramiteLabel,
          sessionId: `sara-${profile?.id || "guest"}-${lang}`,
          userId: profile?.id || "",
          history: historyToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error en Sara");
      }

      const finalReply =
        data?.reply ||
        (lang === "darija"
          ? "سمح ليا، ما قدرتش نجاوب دابا."
          : lang === "en"
          ? "Sorry, I could not answer right now."
          : "Lo siento, no pude responder ahora mismo.");

      const agentReply: ChatMsg = {
        from: "agent",
        text: finalReply,
        ts: Date.now(),
      };

      if (shouldTriggerPayment) {
        const paymentMsg: ChatMsg = {
          from: "agent",
          text: ui.paymentTriggerMessage,
          ts: Date.now() + 1,
        };

        setChatMessages((prev) => [...prev, agentReply, paymentMsg]);
        setPaymentTriggered(true);

        setTimeout(() => {
          setShowPayment(true);
        }, 900);
      } else {
        setChatMessages((prev) => [...prev, agentReply]);
      }
    } catch (error) {
      console.error("Error conectando con Sara:", error);

      const errorReply: ChatMsg = {
        from: "agent",
        text:
          lang === "darija"
            ? "وقع مشكل فالاتصال مع سارة، عاود حاول."
            : lang === "en"
            ? "There was a connection error with Sara. Please try again."
            : "Error conectando con Sara, intenta otra vez.",
        ts: Date.now(),
      };

      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleSelectPlan = (plan: string) => {
    setPlanActivo(plan);
    setShowPayment(false);
    setStep(1);

    toast({
      title: ui.planActivated,
      description: ui.planContinue,
    });
  };

  const handleAceptar = () => {
    if (!selectedTramite) return;

    if (!planActivo) {
      setShowPayment(true);
      return;
    }

    scheduleMutation.mutate(
      { type: selectedTramite },
      {
        onSuccess: (result: unknown) => {
          const data = (result as AppointmentResult | null) ?? null;
          setAppointmentData(data);
          setStep(2);

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
    if (!planActivo) {
      setShowPayment(true);
      return;
    }

    setConfirmed(true);

    toast({
      title: ui.confirmSuccessTitle,
      description: ui.confirmSuccessDesc,
    });
  };

  const profileNie = profile?.nie?.trim() || "";
  const profileName = profile?.full_name?.trim() || "";
  const profilePhone = profile?.phone?.trim() || "";
  const profileEmail = profile?.email?.trim() || "";

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

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={handleSelectPlan}
        agentMessage={ui.paymentMessage}
      />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-0">
        <h1 className="text-xl font-display font-bold px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">
          {t("buscar_title")}
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

              <div className="absolute top-3 right-3 relative">
                <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                </div>
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

              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${
                    muted
                      ? "bg-destructive/80 border-destructive"
                      : "bg-black/50 border-white/20 hover:bg-black/70"
                  }`}
                  type="button"
                >
                  {muted ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>

              <div className="absolute bottom-14 right-3 text-right">
                <p className="text-white font-bold text-sm drop-shadow-lg">
                  Sara
                </p>
                <p className="text-white/70 text-xs drop-shadow-lg">
                  {ui.agentRole}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                showChat
                  ? "bg-secondary/20 border-secondary/40 text-secondary"
                  : "glass-panel border-white/10 text-white/70 hover:text-white hover:border-white/20"
              }`}
              type="button"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>

            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel-heavy border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                  style={{ maxHeight: "260px" }}
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={`${msg.ts || i}-${i}`}
                        className={`flex gap-2 ${
                          msg.from === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.from === "agent" && (
                          <img
                            src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                            className="w-6 h-6 rounded-full object-cover object-top shrink-0"
                            alt=""
                          />
                        )}

                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                            msg.from === "agent"
                              ? "bg-white/8 text-white/90 border border-white/10"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {sendingChat && (
                      <div className="flex gap-2 justify-start">
                        <img
                          src={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
                          className="w-6 h-6 rounded-full object-cover object-top shrink-0"
                          alt=""
                        />
                        <div className="px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed bg-white/8 text-white/90 border border-white/10">
                          ...
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  <div className="border-t border-white/10 p-2 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder={ui.chatPlaceholder}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={sendingChat}
                      className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-60"
                      type="button"
                    >
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                    {(() => {
                      const currentStep =
                        agentSteps[Math.min(step, agentSteps.length - 1)];
                      const parts = currentStep.text.split(currentStep.highlight);

                      if (!currentStep.highlight) return currentStep.text;

                      return parts.map((part, i, arr) =>
                        i < arr.length - 1 ? (
                          <span key={i}>
                            {part}
                            <span className="font-bold text-primary">
                              {currentStep.highlight}
                            </span>
                          </span>
                        ) : (
                          part
                        )
                      );
                    })()}
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
                onClick={() => setMuted(!muted)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  muted
                    ? "bg-destructive/20 border-destructive/40 text-destructive"
                    : "bg-white/5 border-white/10 text-white/80"
                }`}
                type="button"
              >
                {muted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {ui.muteSimple}
              </button>

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
            title="Panel oficial integrado"
            url={officialUrl}
            selectedTramiteLabel={selectedTramiteLabel}
            profileLoading={profileLoading}
            profileNie={profileNie}
            profileName={profileName}
            profilePhone={profilePhone}
            profileEmail={profileEmail}
            ui={ui}
            step={step}
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
          />
        </div>

        <div className="hidden lg:block sticky bottom-0 z-30 glass-panel-heavy border-t border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <button
              onClick={() => setMuted(!muted)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                muted
                  ? "bg-destructive/20 border-destructive/40 text-destructive"
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
              }`}
              type="button"
            >
              {muted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {t("buscar_sin_audio")}
            </button>

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

                      <span className="text-sm text-white/90">
                        {doc.nombre}
                      </span>

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
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
