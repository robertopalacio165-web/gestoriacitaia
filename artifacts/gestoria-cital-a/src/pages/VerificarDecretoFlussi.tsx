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
  Clock,
  Upload,
  X,
  File,
  Image,
  Download,
  ChevronDown,
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
  apellidos: string;
  phone: string;
  email: string;
  pais: string;
  tipoDocumento: string;
  documentos: string;
  empleadorNombre: string;
  empleadorCiudad: string;
  empleadorFechaNacimiento: string;
  buscarSoloPersona: boolean;
  documentosUrls: string;
  preferredOffice: string;
};

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  type: string;
};

// Generar ID de sesión único para visitantes
const generateSessionId = () => {
  let sessionId = sessionStorage.getItem('flussi_session_id');
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('flussi_session_id', sessionId);
  }
  return sessionId;
};

// ============================================================
// PENDING FLUSSI FILES
// Los documentos se quedan en el navegador hasta que Stripe
// confirme el pago. Solo después se suben a Supabase Storage.
// ============================================================
const FLUSSI_PENDING_DB = "gestoriacitaia-flussi-pending";
const FLUSSI_PENDING_STORE = "files";

type PendingFlussiFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  file: Blob;
};

function openFlussiDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FLUSSI_PENDING_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FLUSSI_PENDING_STORE)) {
        db.createObjectStore(FLUSSI_PENDING_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir el almacenamiento local"));
  });
}

async function savePendingFlussiFiles(files: File[]): Promise<PendingFlussiFile[]> {
  const db = await openFlussiDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FLUSSI_PENDING_STORE, "readwrite");
    const store = tx.objectStore(FLUSSI_PENDING_STORE);
    const saved: PendingFlussiFile[] = [];
    for (const file of files) {
      const item: PendingFlussiFile = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file,
      };
      store.put(item);
      saved.push(item);
    }
    tx.oncomplete = () => { db.close(); resolve(saved); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("No se pudieron guardar los documentos")); };
  });
}

async function getPendingFlussiFiles(): Promise<PendingFlussiFile[]> {
  const db = await openFlussiDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FLUSSI_PENDING_STORE, "readonly");
    const request = tx.objectStore(FLUSSI_PENDING_STORE).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error || new Error("No se pudieron recuperar los documentos")); };
  });
}

async function clearPendingFlussiFiles(): Promise<void> {
  const db = await openFlussiDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FLUSSI_PENDING_STORE, "readwrite");
    tx.objectStore(FLUSSI_PENDING_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("No se pudieron limpiar los documentos")); };
  });
}

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
  uploadedFiles,
  setUploadedFiles,
  isUploading,
  setIsUploading,
  verificationStatus,
  verificationProgress,
  onDownloadReport,
  isReportReady,
  errorField,
  errorRefs,
  setErrorField,
}: {
  language: string;
  avatarImage: string;
  title: string;
  url: string;
  profileLoading: boolean;
  ui: any;
  confirmed: boolean;
  formData: ClientFormData;
  onFormChange: (field: keyof ClientFormData, value: string | boolean) => void;
  onFormSubmit: () => void;
  formReady: boolean;
  onPay: () => void;
  acceptTerms: boolean;
  setAcceptTerms: (value: boolean) => void;
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  verificationStatus: string;
  verificationProgress: number;
  onDownloadReport: () => void;
  isReportReady: boolean;
  errorField: string | null;
  errorRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  setErrorField: (field: string | null) => void;
}) {
  const isMa = language === "ma";
  const isEn = language === "en";
  const { toast } = useToast();

  const MAX_FILES = 5;

  const formIntro = isMa
    ? "للتحقق من عقد عملك أو وثائق Decreto Flussi، املأ النموذج وسنرسل لك التقرير خلال 24 ساعة."
    : isEn
    ? "To verify your employment contract or Decreto Flussi documents, fill in the form and we will send you the report within 24 hours."
    : "Para verificar tu contrato de trabajo o documentos del Decreto Flussi, completa el formulario y te enviaremos el informe en 24 horas.";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.buscarSoloPersona) {
      e.target.value = "";
      return;
    }

    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast({
        title: isMa ? "❌ خطأ" : isEn ? "❌ Error" : "❌ Error",
        description: isMa ? `يمكنك رفع ${MAX_FILES} ملفات كحد أقصى` : isEn ? `You can upload a maximum of ${MAX_FILES} files` : `Puedes subir un máximo de ${MAX_FILES} archivos`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const selectedFiles = Array.from(files);
      const allowedTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);

      for (const file of selectedFiles) {
        if (!allowedTypes.has(file.type)) {
          throw new Error(
            isMa
              ? "مسموح غير PDF أو JPG أو PNG أو WEBP"
              : isEn
              ? "Only PDF, JPG, PNG or WEBP files are allowed"
              : "Solo se permiten archivos PDF, JPG, PNG o WEBP"
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            isMa
              ? `${file.name} كيتجاوز 10MB`
              : isEn
              ? `${file.name} exceeds 10MB`
              : `${file.name} supera los 10MB`
          );
        }
      }

      // IMPORTANTE: antes del pago no se usa Supabase Storage.
      await savePendingFlussiFiles(selectedFiles);

      const newUploadedFiles: UploadedFile[] = [
        ...uploadedFiles,
        ...selectedFiles.map((file) => ({ name: file.name, path: "", size: file.size, type: file.type })),
      ];
      setUploadedFiles(newUploadedFiles);
      onFormChange("documentos", newUploadedFiles.map((file) => file.name).join(", "));
      onFormChange("documentosUrls", "[]");
      if (errorField === "documents") setErrorField(null);

      toast({
        title: isMa ? "✅ تم اختيار الملفات" : isEn ? "✅ Files selected" : "✅ Archivos seleccionados",
        description: isMa ? "الملفات باقين غير فالمتصفح حتى يتأكد الأداء." : isEn ? "Files stay in your browser until payment is confirmed." : "Los archivos permanecen en tu navegador hasta confirmar el pago.",
      });
    } catch (error: any) {
      console.error("Error seleccionando documentos:", error);
      toast({ title: isMa ? "❌ خطأ" : isEn ? "❌ Error" : "❌ Error", description: error?.message || "No se pudieron seleccionar los documentos", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = async (index: number) => {
    try {
      const pendingFiles = await getPendingFlussiFiles();
      const fileToRemove = uploadedFiles[index];
      if (fileToRemove) {
        await clearPendingFlussiFiles();
        const remaining = pendingFiles.filter((file) => file.name !== fileToRemove.name || file.size !== fileToRemove.size);
        if (remaining.length > 0) {
          const db = await openFlussiDB();
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(FLUSSI_PENDING_STORE, "readwrite");
            const store = tx.objectStore(FLUSSI_PENDING_STORE);
            for (const file of remaining) store.put(file);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
          });
        }
      }
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(newFiles);
      onFormChange("documentos", newFiles.map((file) => file.name).join(", "));
      onFormChange("documentosUrls", "[]");
    } catch (error) {
      console.error("Error eliminando documento pendiente:", error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <Image className="w-4 h-4 text-blue-400" />;
    }
    return <File className="w-4 h-4 text-red-400" />;
  };

  // Componente de estado de verificación
  const VerificationStatusComponent = () => {
    const statusMessages: Record<string, { label: string; icon: string }> = {
      pending: { 
        label: isMa ? "في الانتظار..." : isEn ? "Pending..." : "En espera...",
        icon: "⏳"
      },
      downloading_documents: { 
        label: isMa ? "جاري تحميل المستندات..." : isEn ? "Downloading documents..." : "Descargando documentos...",
        icon: "📥"
      },
      extracting_text: { 
        label: isMa ? "استخراج النص (OCR)..." : isEn ? "Extracting text (OCR)..." : "Extrayendo texto (OCR)...",
        icon: "📄"
      },
      analyzing_with_ai: { 
        label: isMa ? "تحليل بالذكاء الاصطناعي..." : isEn ? "Analyzing with AI..." : "Analizando con IA...",
        icon: "🧠"
      },
      verifying_company: { 
        label: isMa ? "التحقق من الشركة..." : isEn ? "Verifying company..." : "Verificando empresa...",
        icon: "🏢"
      },
      generating_report: { 
        label: isMa ? "إنشاء التقرير..." : isEn ? "Generating report..." : "Generando informe...",
        icon: "📊"
      },
      report_ready: { 
        label: isMa ? "✅ التقرير جاهز" : isEn ? "✅ Report ready" : "✅ Informe listo",
        icon: "✅"
      },
      error: { 
        label: isMa ? "❌ حدث خطأ" : isEn ? "❌ Error occurred" : "❌ Error en el proceso",
        icon: "❌"
      },
    };

    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#050816] p-4">
        <h3 className="text-white font-bold mb-3 text-sm">
          {isMa ? 'حالة التحقق' : isEn ? 'Verification Status' : 'Estado de verificación'}
        </h3>
        
        <div className="space-y-2">
          {Object.entries(statusMessages).map(([key, value]) => {
            const isActive = key === verificationStatus;
            const isCompleted = verificationStatus !== 'pending' && 
                              Object.keys(statusMessages).indexOf(key) < 
                              Object.keys(statusMessages).indexOf(verificationStatus) &&
                              verificationStatus !== 'error';
            
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                  ${isActive ? 'bg-yellow-500/20 text-yellow-400' : 
                    isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 
                    'bg-white/5 text-white/30'}`}>
                  {isActive ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <span className="text-xs">{value.icon}</span>
                  )}
                </div>
                <span className={`text-xs ${isActive ? 'text-yellow-400 font-medium' : 
                  isCompleted ? 'text-emerald-400' : 'text-white/40'}`}>
                  {value.label}
                </span>
              </div>
            );
          })}
        </div>

        {isReportReady && (
          <button 
            onClick={onDownloadReport}
            className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Download className="w-4 h-4" />
            {isMa ? "📥 تحميل التقرير" : isEn ? "📥 Download Report" : "📥 Descargar Informe"}
          </button>
        )}
      </div>
    );
  };

  // ✅ Handlers con limpieza de errores
  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    onFormChange(field, value);
    if (errorField === field) {
      setErrorField(null);
    }
  };

  const handleAcceptTermsChange = (checked: boolean) => {
    setAcceptTerms(checked);
    if (checked && errorField === "acceptTerms") {
      setErrorField(null);
    }
  };

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
                ? "🎉 مبروك! تم التحقق"
                : isEn
                ? "🎉 VERIFICATION COMPLETED!"
                : "🎉 ¡VERIFICACIÓN COMPLETADA!"}
            </h2>
            <p className="text-white text-lg font-bold mb-4">
              {isMa
                ? "شكراً على ثقتك في GestoriaCitaIA."
                : isEn
                ? "Thank you for trusting GestoriaCitaIA."
                : "Gracias por confiar en GestoriaCitaIA."}
            </p>
            <p className="text-white/80">
              {isMa
                ? "تم التحقق من وثائقك بنجاح."
                : isEn
                ? "Your documents have been successfully verified."
                : "Tus documentos han sido verificados correctamente."}
            </p>
            <p className="text-white/80 mt-2">
              {isMa
                ? "ستتلقى التقرير المفصل عبر البريد الإلكتروني."
                : isEn
                ? "You will receive the detailed report by email."
                : "Recibirás el informe detallado por correo electrónico."}
            </p>
            <p className="text-yellow-400 font-bold mt-4">
              {isMa
                ? "✅ اكتملت العملية"
                : isEn
                ? "✅ Process completed"
                : "✅ Proceso completado"}
            </p>
            <p className="text-white/70 mt-6">
              {isMa
                ? "نتمنى لك التوفيق."
                : isEn
                ? "We wish you the best of luck."
                : "Te deseamos mucha suerte."}
            </p>
          </div>
        ) : !confirmed && !formReady ? (
          <>
            <div className="mt-3 mx-[-4px] rounded-[24px] border-2 border-yellow-500/60 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-3 py-3 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
              <div className="mb-3 grid grid-cols-[32px_1fr_32px] items-center gap-2">
                <span />
                <h2 className="text-center text-yellow-400 text-[18px] sm:text-[20px] font-black leading-tight">
                  {isMa 
                    ? "التحقق من عقود العمل ومرسوم Decreto Flussi الإيطالي" 
                    : isEn 
                    ? "Italian Employment Contract & Decreto Flussi Verification" 
                    : "Verificación de Contratos y Decreto Flussi"}
                </h2>
                <img
                  src="https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg"
                  alt="Italia"
                  className="h-5 w-8 rounded-[3px] object-cover shadow-[0_0_10px_rgba(255,255,255,0.20)]"
                />
              </div>
              <p className="text-white/80 text-[13px] leading-relaxed mb-5">
                {isMa 
                  ? "نحلل عقد عملك أو إيصال التسجيل أو وثائق Decreto Flussi عبر الذكاء الاصطناعي ونتحقق من الشركة الإيطالية للكشف عن المخاطر المحتملة."
                  : isEn 
                  ? "We analyze your employment contract, registration receipt or Decreto Flussi documentation using AI and verify the Italian company to detect potential risks or irregularities."
                  : "Analizamos tu contrato de trabajo, resguardo o documentación del Decreto Flussi mediante IA y verificamos la empresa italiana para detectar posibles riesgos o irregularidades."}
              </p>
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                  {/* Nombre */}
                  <div 
                    ref={el => errorRefs.current["fullName"] = el}
                    className="col-span-1 md:col-span-1"
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الاسم" : isEn ? "First Name" : "Nombre"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "دخل اسمك" : isEn ? "Your name" : "Tu nombre"}
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      className={`w-full h-[52px] rounded-2xl border ${errorField === "fullName" ? "border-red-500" : "border-white/10"} bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400`}
                    />
                    {errorField === "fullName" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "الاسم مطلوب" : isEn ? "Name is required" : "Nombre es requerido"}
                      </p>
                    )}
                  </div>

                  {/* Apellidos */}
                  <div 
                    ref={el => errorRefs.current["apellidos"] = el}
                    className="col-span-1 md:col-span-1"
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "اللقب" : isEn ? "Last Name" : "Apellidos"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "دخل لقبك" : isEn ? "Your surname" : "Tus apellidos"}
                      value={formData.apellidos || ""}
                      onChange={(e) => handleInputChange("apellidos", e.target.value)}
                      className={`w-full h-[52px] rounded-2xl border ${errorField === "apellidos" ? "border-red-500" : "border-white/10"} bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400`}
                    />
                    {errorField === "apellidos" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "اللقب مطلوب" : isEn ? "Last name is required" : "Apellidos son requeridos"}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div 
                    ref={el => errorRefs.current["phone"] = el}
                    className="col-span-1 lg:col-span-2"
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "واتساب" : isEn ? "WhatsApp" : "WhatsApp"}
                    </label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        className="w-[92px] shrink-0 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-2 text-center text-white"
                        value={formData.preferredOffice}
                        onChange={(e) => handleInputChange("preferredOffice", e.target.value)}
                      >
                        <option value="+39">🇮🇹 +39</option>
                        <option value="+212">🇲🇦 +212</option>
                        <option value="+31">🇳🇱 +31</option>
                        <option value="+32">🇧🇪 +32</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+49">🇩🇪 +49</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+1">🇺🇸 +1</option>
                      </select>
                      <input
                        type="text"
                        placeholder={isMa ? "رقم الهاتف" : isEn ? "Phone number" : "Número de teléfono"}
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={`min-w-0 flex-1 h-[52px] rounded-2xl border ${errorField === "phone" ? "border-red-500" : "border-white/10"} bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400`}
                      />
                    </div>
                    {errorField === "phone" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "رقم الهاتف مطلوب" : isEn ? "Phone number is required" : "Teléfono es requerido"}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div 
                    ref={el => errorRefs.current["email"] = el}
                    className="col-span-1 lg:col-span-2"
                  >
                    <label className="block text-white text-[13px] mb-2">
                      Gmail
                    </label>
                    <input
                      type="email"
                      placeholder="tuemail@gmail.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={`w-full h-[52px] rounded-2xl border ${errorField === "email" ? "border-red-500" : "border-white/10"} bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400`}
                    />
                    {errorField === "email" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "الإيميل مطلوب" : isEn ? "Email is required" : "Email es requerido"}
                      </p>
                    )}
                  </div>

                  {/* ✅ PAÍS - DOS BOTONES UNO AL LADO DEL OTRO CON BANDERAS REALES */}
                  <div 
                    ref={el => errorRefs.current["pais"] = el}
                    className="col-span-1 lg:col-span-2"
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الدولة" : isEn ? "Country" : "País"}
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Marruecos */}
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange("pais", "🇲🇦 Marruecos");
                          if (errorField === "pais") setErrorField(null);
                        }}
                        className={`h-[52px] rounded-2xl border-2 transition-all duration-200 flex items-center justify-center gap-3 px-3 ${
                          formData.pais === "🇲🇦 Marruecos" 
                            ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20" 
                            : "border-white/10 bg-[#060b16] hover:border-white/30"
                        }`}
                      >
                        <img
                          src="https://flagcdn.com/w40/ma.png"
                          alt="Marruecos"
                          className="w-6 h-4 rounded object-cover"
                        />
                        <span className={`font-medium text-sm ${formData.pais === "🇲🇦 Marruecos" ? "text-emerald-400" : "text-white/70"}`}>
                          {isMa ? "المغرب" : isEn ? "Morocco" : "Marruecos"}
                        </span>
                        {formData.pais === "🇲🇦 Marruecos" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
                        )}
                      </button>

                      {/* Italia */}
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange("pais", "🇮🇹 Italia");
                          if (errorField === "pais") setErrorField(null);
                        }}
                        className={`h-[52px] rounded-2xl border-2 transition-all duration-200 flex items-center justify-center gap-3 px-3 ${
                          formData.pais === "🇮🇹 Italia" 
                            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20" 
                            : "border-white/10 bg-[#060b16] hover:border-white/30"
                        }`}
                      >
                        <img
                          src="https://flagcdn.com/w40/it.png"
                          alt="Italia"
                          className="w-6 h-4 rounded object-cover"
                        />
                        <span className={`font-medium text-sm ${formData.pais === "🇮🇹 Italia" ? "text-blue-400" : "text-white/70"}`}>
                          {isMa ? "إيطاليا" : isEn ? "Italy" : "Italia"}
                        </span>
                        {formData.pais === "🇮🇹 Italia" && (
                          <CheckCircle2 className="w-4 h-4 text-blue-400 ml-auto" />
                        )}
                      </button>
                    </div>
                    
                    {errorField === "pais" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "الدولة مطلوبة" : isEn ? "Country is required" : "País es requerido"}
                      </p>
                    )}
                  </div>

                  {/* 🔥 TIPO DE DOCUMENTO - SOLO 3 OPCIONES (REEMPLAZADO) */}
                  <div 
                    ref={el => errorRefs.current["tipoDocumento"] = el}
                    className="col-span-1 lg:col-span-2"
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "نوع الوثيقة" : isEn ? "Document type" : "Tipo de documento"}
                    </label>
                    <select
                      className={`w-full h-[52px] rounded-2xl border ${errorField === "tipoDocumento" ? "border-red-500" : "border-white/10"} bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400`}
                      value={formData.tipoDocumento || ""}
                      onChange={(e) => handleInputChange("tipoDocumento", e.target.value)}
                    >
                      <option value="">
                        {isMa ? "اختر النوع" : isEn ? "Select type" : "Selecciona tipo"}
                      </option>
                      <option value="contrato">
                        {isMa ? "عقد العمل (مرسوم فلوسي)" : isEn ? "Employment contract (Decreto Flussi)" : "Contrato de trabajo (Decreto Flussi)"}
                      </option>
                      <option value="nulla_osta">
                        {isMa ? "تصريح العمل (Nulla Osta)" : isEn ? "Nulla Osta" : "Nulla Osta"}
                      </option>
                      <option value="otro">
                        {isMa ? "وثيقة أخرى / لا أعرف نوعها" : isEn ? "Other / I don't know what it is" : "Otro / No sé qué es"}
                      </option>
                    </select>

                    {/* EXPLICACIÓN PARA EL CLIENTE */}
                    <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                      <p className="text-white/75 text-[12px] leading-relaxed">
                        {isMa ? (
                          <>
                            <span className="text-yellow-400 font-bold">
                              📌 إلا كانت الوثيقة ديالك هي عقد العمل باش تجي تخدم فإيطاليا،
                            </span>{" "}
                            اختار الاختيار الأول. إلا كانت الوثيقة هي{" "}
                            <span className="text-yellow-400 font-semibold">
                              Nulla Osta
                            </span>
                            ، اختار الثاني. إلا ما كنتيش متأكد شنو هي الوثيقة، اختار{" "}
                            <span className="text-yellow-400 font-semibold">
                              "أخرى"
                            </span>{" "}
                            وحنا نحللوها ليك.
                          </>
                        ) : isEn ? (
                          <>
                            <span className="text-yellow-400 font-bold">
                              📌 If your document is the employment contract to come and work in Italy,
                            </span>{" "}
                            select the first option. If it is the{" "}
                            <span className="text-yellow-400 font-semibold">
                              Nulla Osta
                            </span>
                            , select the second. If you are not sure what the document is,
                            select{" "}
                            <span className="text-yellow-400 font-semibold">
                              "Other"
                            </span>{" "}
                            and we will analyze it for you.
                          </>
                        ) : (
                          <>
                            <span className="text-yellow-400 font-bold">
                              📌 Si tu documento es el contrato para venir a trabajar a Italia, selecciona la primera opción.
                            </span>{" "}
                            Si es la autorización{" "}
                            <span className="text-yellow-400 font-semibold">
                              Nulla Osta
                            </span>
                            , selecciona la segunda. Si no estás seguro de qué documento es, selecciona{" "}
                            <span className="text-yellow-400 font-semibold">
                              "Otro"
                            </span>{" "}
                            y lo analizamos igualmente.
                          </>
                        )}
                      </p>
                    </div>

                    {errorField === "tipoDocumento" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "نوع الوثيقة مطلوب" : isEn ? "Document type is required" : "Debes seleccionar el tipo de documento"}
                      </p>
                    )}
                  </div>

                  {/* 🟢 PERSONA / EMPLEADOR A COMPROBAR */}
                  <div
                    ref={el => errorRefs.current["empleadorNombre"] = el}
                    className="col-span-1 lg:col-span-2 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-emerald-400 font-black text-[14px]">
                          {isMa ? "👤 معلومات المشغّل أو الشخص المراد التحقق منه" : isEn ? "👤 Employer / person to verify" : "👤 Persona / empleador a comprobar"}
                        </h3>
                        <p className="text-white/60 text-[11px] leading-relaxed mt-1">
                          {isMa
                            ? "دخل الاسم والنسب ديال الشخص. المدينة وتاريخ الازدياد اختياريين."
                            : isEn
                            ? "Enter the person's full name. City and date of birth are optional."
                            : "Introduce el nombre y apellidos de la persona. La ciudad y la fecha de nacimiento son opcionales."}
                        </p>
                      </div>
                    </div>

                    <label className="block text-white text-[12px] mb-2">
                      {isMa ? "الاسم الكامل" : isEn ? "Full name" : "Nombre y apellidos"}
                      <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.empleadorNombre}
                      onChange={(e) => handleInputChange("empleadorNombre", e.target.value)}
                      placeholder={isMa ? "مثال: Mario Rossi" : isEn ? "e.g. Mario Rossi" : "Ej. Mario Rossi"}
                      className={`w-full h-[52px] rounded-2xl border ${errorField === "empleadorNombre" ? "border-red-500" : "border-emerald-500/25"} bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400`}
                    />
                    {errorField === "empleadorNombre" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "الاسم الكامل مطلوب" : isEn ? "Full name is required" : "El nombre y apellidos son obligatorios"}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-white text-[12px] mb-2">
                          {isMa ? "المدينة في إيطاليا (اختياري)" : isEn ? "City in Italy (optional)" : "Ciudad en Italia (opcional)"}
                        </label>
                        <input
                          type="text"
                          value={formData.empleadorCiudad}
                          onChange={(e) => handleInputChange("empleadorCiudad", e.target.value)}
                          placeholder={isMa ? "مثال: Roma" : isEn ? "e.g. Rome" : "Ej. Roma"}
                          className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-[12px] mb-2">
                          {isMa ? "تاريخ الازدياد (اختياري)" : isEn ? "Date of birth (optional)" : "Fecha de nacimiento (opcional)"}
                        </label>
                        <input
                          type="date"
                          value={formData.empleadorFechaNacimiento}
                          onChange={(e) => handleInputChange("empleadorFechaNacimiento", e.target.value)}
                          className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <label className="mt-4 flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.buscarSoloPersona}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleInputChange("buscarSoloPersona", checked);
                          if (checked) {
                            // Si ya había documentos subidos, eliminarlos porque esta modalidad no necesita PDF.
                            if (uploadedFiles.length > 0) {
                              void clearPendingFlussiFiles();
                              setUploadedFiles([]);
                              onFormChange("documentos", "");
                              onFormChange("documentosUrls", "[]");
                            }
                            setErrorField(null);
                          }
                        }}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060b16] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                      />
                      <span className="text-white/70 text-[12px] leading-relaxed">
                        {isMa
                          ? "ما عنديش عقد ولا Nulla Osta. بغيت غير نقلبو على هاد الشخص أو المشغّل في المصادر العمومية المتاحة."
                          : isEn
                          ? "I do not have a contract or Nulla Osta. I only want to search for this person/employer using available public sources."
                          : "No tengo contrato ni Nulla Osta. Solo quiero buscar a esta persona o empleador en las fuentes públicas disponibles."}
                      </span>
                    </label>
                  </div>

                  {/* ✅ SUBIR DOCUMENTOS - SOLO SI HAY DOCUMENTO */}
                  <div 
                    ref={el => errorRefs.current["documents"] = el}
                    className={`col-span-1 lg:col-span-2 ${formData.buscarSoloPersona ? "opacity-60" : ""}`}
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {formData.buscarSoloPersona
                        ? (isMa ? "📄 لا حاجة لرفع وثيقة" : isEn ? "📄 No document upload needed" : "📄 No necesitas subir un documento")
                        : (isMa ? "رفع المستندات (PDF)" : isEn ? "Upload documents (PDF)" : "Subir documento(s) (PDF)")}
                      <span className="text-white/40 text-[11px] ml-2">
                        {isMa ? `(حد أقصى ${MAX_FILES} ملفات)` : isEn ? `(max ${MAX_FILES} files)` : `(máx ${MAX_FILES} archivos)`}
                      </span>
                    </label>
                    <div className={`relative w-full min-h-[52px] rounded-2xl border-2 border-dashed ${formData.buscarSoloPersona ? "border-emerald-500/30 bg-emerald-500/5" : errorField === "documents" ? "border-red-500 bg-red-500/5" : uploadedFiles.length > 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/20 bg-[#060b16]'} flex flex-col items-center justify-center hover:border-yellow-400 transition-colors p-3`}>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={formData.buscarSoloPersona || isUploading || uploadedFiles.length >= MAX_FILES}
                      />
                      {formData.buscarSoloPersona ? (
                        <div className="text-center py-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                          <p className="text-emerald-400 text-sm font-medium">
                            {isMa ? "لا تحتاج ترفع وثيقة" : isEn ? "No document required" : "No necesitas subir un documento"}
                          </p>
                          <p className="text-white/40 text-[10px] mt-1">
                            {isMa ? "غادي نعتمدو على المعلومات ديال الشخص والمصادر العمومية." : isEn ? "We will use the person's information and available public sources." : "Trabajaremos con los datos de la persona y las fuentes públicas disponibles."}
                          </p>
                        </div>
                      ) : isUploading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                          <p className="text-yellow-400 text-sm">
                            {isMa ? "جاري الرفع..." : isEn ? "Uploading..." : "Subiendo..."}
                          </p>
                        </div>
                      ) : uploadedFiles.length === 0 ? (
                        <div className="text-center">
                          <Upload className="w-6 h-6 text-white/30 mx-auto mb-1" />
                          <p className="text-white/40 text-sm">
                            {isMa ? "📎 اختر PDF أو صورة" : isEn ? "📎 Choose PDF or image" : "📎 Seleccionar PDF o imagen"}
                          </p>
                          <p className="text-white/20 text-[10px] mt-1">
                            {isMa ? `الحد الأقصى ${MAX_FILES} ملفات · 10MB لكل ملف · PDF/JPG/PNG/WEBP` : isEn ? `Max ${MAX_FILES} files · 10MB each · PDF/JPG/PNG/WEBP` : `Máximo ${MAX_FILES} archivos · 10MB cada uno · PDF/JPG/PNG/WEBP`}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-emerald-400 text-sm font-medium">
                            {isMa ? `✅ تم اختيار ${uploadedFiles.length}/${MAX_FILES} ملفات` : isEn ? `✅ ${uploadedFiles.length}/${MAX_FILES} files selected` : `✅ ${uploadedFiles.length}/${MAX_FILES} archivos seleccionados`}
                          </p>
                          {uploadedFiles.length < MAX_FILES && (
                            <p className="text-white/30 text-[10px] mt-1">
                              {isMa ? "📎 أضف المزيد (اختر ملفات إضافية)" : isEn ? "📎 Add more (select additional files)" : "📎 Añadir más (selecciona archivos adicionales)"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {errorField === "documents" && (
                      <p className="text-red-400 text-xs mt-1">
                        {isMa ? "يجب رفع مستند واحد على الأقل" : isEn ? "You must upload at least one document" : "Debes subir al menos un documento"}
                      </p>
                    )}
                    {!formData.buscarSoloPersona && (
                      <p className="mt-2 text-[10px] leading-relaxed text-white/40">
                        {isMa
                          ? "🔒 الملفات كيبقاو غير فالمتصفح حتى يتأكد الأداء. من بعد الأداء فقط كيتحفظو في التخزين الخاص."
                          : isEn
                          ? "🔒 Files remain only in your browser until payment is confirmed. They are stored privately only after payment."
                          : "🔒 Los archivos permanecen solo en tu navegador hasta confirmar el pago. Solo después del pago se guardan en almacenamiento privado."}
                      </p>
                    )}
                    
                    {/* Lista de archivos subidos */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                            {getFileIcon(file.type)}
                            <span className="text-white/80 text-xs flex-1 truncate">{file.name}</span>
                            <span className="text-white/30 text-[10px]">{(file.size / 1024).toFixed(0)}KB</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-white/30 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Caja de pago con Checkbox */}
                  <div className="col-span-1 lg:col-span-2 mt-4 rounded-[28px] border-2 border-yellow-500 bg-gradient-to-b from-[#0b0b0b] to-[#050505] p-4 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
                    <div className="flex items-start justify-between mb-4 pt-2">
                      <div>
                        <p className="text-white text-[15px] font-bold">
                          {isMa
                            ? "التحقق من العقد ومرسوم فلوسي"
                            : isEn
                            ? "Contract & Decreto Flussi Verification"
                            : "Verificación de Contrato y Decreto Flussi"}
                        </p>
                        <span className="inline-flex mt-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]">
                          Premium
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 text-[34px] font-black leading-none drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
                          21,99€
                        </p>
                        <p className="text-yellow-300 text-[11px] font-semibold">
                          {isMa ? "خلاص مرة وحدة" : isEn ? "One-time payment" : "Pago único"}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-300 text-[13px] mb-5 leading-relaxed">
                      {isMa
                        ? "نظامنا يحلل عقدك أو وثائق Decreto Flussi باستخدام الذكاء الاصطناعي. نتحقق من تماسك الوثائق ونتحقق من الشركة باستخدام المصادر العامة المتاحة. ستتلقى تقريراً مفصلاً عبر البريد الإلكتروني."
                        : isEn
                        ? "Our system analyzes your contract or Decreto Flussi documents using artificial intelligence. We check document consistency and verify the company using available public sources. You will receive a detailed report by email."
                        : "Nuestro sistema analiza tu contrato o documento del Decreto Flussi mediante inteligencia artificial. Comprobamos la coherencia documental y verificamos la empresa utilizando fuentes públicas disponibles. Recibirás un informe detallado por correo electrónico."}
                    </p>

                    {/* CONTADOR DE VERIFICACIÓN */}
                    <div className="mb-5 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-white/80 text-[11px] font-medium">
                          {isMa ? "تحليل العقد" : isEn ? "Contract analyzed" : "Contrato analizado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-white/80 text-[11px] font-medium">
                          {isMa ? "التحقق من الشركة" : isEn ? "Company verified" : "Empresa verificada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-white/80 text-[11px] font-medium">
                          {isMa ? "مراجعة الوثائق" : isEn ? "Document reviewed" : "Documento revisado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-white/80 text-[11px] font-medium">
                          {isMa ? "تقرير PDF" : isEn ? "PDF Report" : "Informe PDF"}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 bg-yellow-500/10 rounded-xl px-3 py-2 border border-yellow-500/30">
                        <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
                        <span className="text-yellow-300 text-[11px] font-medium">
                          {isMa ? "النتيجة في أقل من 24 ساعة" : isEn ? "Result in less than 24 hours" : "Resultado en menos de 24 horas"}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox de aceptación */}
                    <div 
                      ref={el => errorRefs.current["acceptTerms"] = el}
                      className="flex items-start gap-3 mb-3"
                    >
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptTerms}
                        onChange={(e) => handleAcceptTermsChange(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060b16] text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0"
                      />
                      <label htmlFor="acceptTerms" className={`text-[12px] leading-relaxed ${errorField === "acceptTerms" ? "text-red-400" : "text-white/70"}`}>
                        {isMa
                          ? "☑️ أوافق على أن تقوم GestoriaCitaIA بتحليل وثائقي والتحقق من السجلات العامة الإيطالية."
                          : isEn
                          ? "☑️ I agree that GestoriaCitaIA analyzes my documents and checks Italian public records."
                          : "☑️ Acepto que GestoriaCitaIA analice mis documentos y consulte registros públicos italianos."}
                      </label>
                    </div>
                    {errorField === "acceptTerms" && (
                      <p className="text-red-400 text-xs mt-0 mb-2">
                        {isMa ? "يجب الموافقة على الشروط" : isEn ? "You must accept the terms" : "Debes aceptar los términos"}
                      </p>
                    )}

                    {/* ✅ BOTÓN - SIN DISABLED */}
                    <button
                      type="button"
                      onClick={onPay}
                      className="w-full min-h-[56px] rounded-[20px] bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 px-4 py-2 text-[15px] leading-tight font-black text-black shadow-[0_0_30px_rgba(255,215,0,0.35)] transition-all duration-300 hover:scale-[1.01]"
                    >
                      {isMa 
                        ? "🔐 تحقق الآن مقابل 21.99€" 
                        : isEn 
                        ? "🔐 Verify now for only €21.99" 
                        : "🔐 Verificar ahora por solo 21,99 €"}
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
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">Pay</span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">G Pay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mostrar estado de verificación si está en progreso */}
            {formReady && verificationStatus !== 'pending' && (
              <VerificationStatusComponent />
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
                  ? "مبروك 🎉 بدأنا مراجعة وثائقك. ستتلقى التقرير خلال 24 ساعة."
                  : isEn
                  ? "Congratulations 🎉 We have started reviewing your documents. You will receive the verification report within 24 hours."
                  : "Felicidades 🎉 Hemos empezado a revisar tus documentos. Recibirás el informe de verificación en 24 horas."}
              </h3>
              <p className="text-center text-white/70 text-[14px] leading-relaxed">
                {isMa
                  ? "سنخبرك هنا عندما يكون هناك جديد بشأن وثائقك."
                  : isEn
                  ? "We will notify you here when there is news about your documents."
                  : "Te avisaremos aquí cuando haya novedades sobre tus documentos."}
              </p>

              <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-yellow-300 font-bold text-sm">
                    {isMa
                      ? "النظام يحلل وثائقك"
                      : isEn
                      ? "System analyzing your documents"
                      : "Sistema analizando tus documentos"}
                  </p>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  {isMa
                    ? "نظامنا يحلل عقدك أو وثائق Decreto Flussi باستخدام الذكاء الاصطناعي. نتحقق من تماسك الوثائق ونتحقق من الشركة باستخدام المصادر العامة المتاحة. ستتلقى تقريراً مفصلاً عبر البريد الإلكتروني."
                    : isEn
                    ? "Our system analyzes your contract or Decreto Flussi documents using artificial intelligence. We check document consistency and verify the company using available public sources. You will receive a detailed report by email."
                    : "Nuestro sistema analiza tu contrato o documento del Decreto Flussi mediante inteligencia artificial. Comprobamos la coherencia documental y verificamos la empresa utilizando fuentes públicas disponibles. Recibirás un informe detallado por correo electrónico."}
                </p>
              </div>

              {/* Mostrar estado de verificación si está en progreso */}
              {verificationStatus !== 'pending' && (
                <VerificationStatusComponent />
              )}
            </div>

            <div className="rounded-[30px] overflow-hidden border border-yellow-500/30 bg-[#050816] shadow-[0_0_40px_rgba(255,200,0,0.10)]">
              <div className="px-6 py-8 bg-[radial-gradient(circle_at_top,rgba(255,200,0,0.12),transparent_60%)]">
                <div className="flex justify-center mb-5">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg"
                    alt="Italia"
                    className="w-20 h-14 object-cover rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/20"
                  />
                </div>

                <h2 className="text-center text-[#f6d06f] text-[36px] leading-[42px] font-black mb-5">
                  {isMa
                    ? "التحقق من العقود بثقة"
                    : isEn
                    ? "Contract Verification with Confidence"
                    : "Verificación de contratos con confianza"}
                </h2>

                <p className="text-center text-white/75 text-[15px] leading-relaxed mb-8">
                  {isMa
                    ? "نساعدك في التحقق من عقود العمل ووثائق Decreto Flussi بطريقة آمنة."
                    : isEn
                    ? "We help you verify employment contracts and Decreto Flussi documents securely."
                    : "Te ayudamos a verificar contratos de trabajo y documentos del Decreto Flussi de forma segura."}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Shield className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "تحليل ذكي" : isEn ? "Smart analysis" : "Análisis inteligente"}
                    </p>
                  </div>
                  <div>
                    <Bell className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "تقرير مفصل" : isEn ? "Detailed report" : "Informe detallado"}
                    </p>
                  </div>
                  <div>
                    <CheckCircle2 className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "نتائج موثوقة" : isEn ? "Reliable results" : "Resultados fiables"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center text-[#f6d06f] text-[24px] font-bold">
                  {isMa
                    ? "« التحقق من وثائقك يبدأ هنا. »"
                    : isEn
                    ? "\" Your document verification starts here. \""
                    : "\" Tu verificación de documentos empieza aquí. \""}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function VerificarDecretoFlussi() {
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isReportReady, setIsReportReady] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    fullName: "",
    apellidos: "",
    phone: "",
    email: "",
    pais: "",
    tipoDocumento: "",
    documentos: "",
    empleadorNombre: "",
    empleadorCiudad: "",
    empleadorFechaNacimiento: "",
    buscarSoloPersona: false,
    documentosUrls: "[]",
    preferredOffice: "+39",
  });
  
  // ✅ Estado para el campo con error
  const [errorField, setErrorField] = useState<string | null>(null);
  const errorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const [formReady, setFormReady] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  
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
        "السلام عليكم مرحبا بك في هيستوريا إي آي أنا سارة غادي نعاونك باش تتحقق من عقد العمل أو وثائق Decreto Flussi. املأ ليا الفورمولار وغادي نبداو التحليل.",
      savedLeadReply:
        "مزيان دابا توصلنا بالمعلومات ديالك غادي نبداو نحلل وثائقك 24/24.",
      confirmMsg:
        "مبروك عليك تأكدات الوثائق ديالك شكرا على الثقة ديالك في هيستوريا إي آي",
    }),
    []
  );

  const ui = useMemo(() => {
    return {
      docsByTramite: {
        tie: [
          { nombre: "Contrato de trabajo o Decreto Flussi", estado: "ok" as DocState },
          { nombre: "Documento de identidad vigente", estado: "ok" as DocState },
        ],
      } as Record<string, DocItem[]>,

      formsByTramite: {
        tie: [
          { nombre: "Formulario Decreto Flussi", codigo: "FLUSSI-01", url: "https://example.com" },
        ],
      } as Record<string, FormItem[]>,

      online: isMa ? "أونلاين" : isEn ? "Online" : "En línea",

      agentRole: isMa
        ? "التحقق من العقود"
        : isEn
        ? "Contract Verification Assistant"
        : "Asesora de Verificación de Contratos",

      loadingUserData: isMa
        ? "جاري تحميل المعلومات..."
        : isEn
        ? "Loading user data..."
        : "Cargando datos del usuario...",

      govSmall: "verificación:",
      govTitle: "CONTRATO · DECRETO FLUSSI · NULLA OST",
      govLine1: "VERIFICACIÓN DE DOCUMENTOS",
      govLine2: "AUTOMÁTICA 24/24",
      govLine3: "INFORME POR EMAIL",

      confirmTitle: isMa ? "تم تأكيد الوثائق!" : isEn ? "DOCUMENTS CONFIRMED!" : "¡DOCUMENTOS CONFIRMADOS!",

      date: isMa ? "التاريخ" : isEn ? "Date" : "Fecha",
      time: isMa ? "الوقت" : isEn ? "Time" : "Hora",
      office: isMa ? "المكتب" : isEn ? "Office" : "Oficina",
      appointmentNumber: isMa ? "رقم الملف" : isEn ? "File Number" : "Nº Expediente",

      reservationSaved: isMa
        ? "تم حفظ الوثائق"
        : isEn
        ? "Documents saved"
        : "Documentos guardados correctamente",

      sourceLabel: isMa ? "المصدر الرسمي" : isEn ? "Official source" : "Fuente oficial",

      voiceButton: isMa
        ? "تكلم مع سارة حول وثائقك"
        : isEn
        ? "Talk with Sara about your documents"
        : "Hablar con Sara sobre tus documentos",
      stopButton: isMa ? "وقف الميكرو" : isEn ? "Stop microphone" : "Parar micrófono",

      latestReply: isMa ? "آخر رد من سارة" : isEn ? "Latest Sara reply" : "Última respuesta de Sara",
      yourVoice: isMa ? "آخر كلام ديالك" : isEn ? "Your latest voice" : "Tu última respuesta por voz",
      listening: isMa ? "سارة كتسمع ليك..." : isEn ? "Sara is listening..." : "Sara te está escuchando ahora...",

      saveTitle: isMa ? "تم حفظ المعلومات" : isEn ? "Data saved" : "Datos guardados",
      saveDesc: isMa ? "سارة غادي تكمل معاك" : isEn ? "Sara can continue now." : "Sara ya puede continuar contigo.",

      missingTitle: isMa ? "معلومات ناقصة" : isEn ? "Missing data" : "Faltan datos",
      missingDesc: isMa
        ? "دخل الاسم والهاتف والإيميل"
        : isEn
        ? "Fill name, phone and email."
        : "Rellena nombre, teléfono y email.",

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
        ? "التحقق من العقود ومرسوم فلوسي"
        : isEn
        ? "Contract & Decreto Flussi Verification"
        : "Verificación de Contratos y Decreto Flussi",

      agentSavedMsg: isMa
        ? "مزيان. دابا غادي نبداو نحلل وثائقك. غادي توصلك التقرير على الإيميل في أقل من 24 ساعة."
        : isEn
        ? "Perfect. We are already analyzing your documents. You will receive the report by email within 24 hours."
        : "Perfecto. Ya estamos analizando tus documentos. Recibirás el informe por email en menos de 24h.",

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
    return `gestoriacitaia_flussi_voice_${userId}`;
  }, [profile?.id]);

  // ✅ Scroll automático al campo con error
  useEffect(() => {
    if (!errorField) return;

    const element = errorRefs.current[errorField];
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [errorField]);

  // ✅ Suscribirse a cambios de estado de verificación
  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;

    const subscription = supabase
      .channel('verification_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'verificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setVerificationStatus(payload.new.status || 'pending');
          setVerificationProgress(payload.new.progress || 0);
          if (payload.new.payment_status === 'paid') {
            setPaymentConfirmed(true);
            setFormReady(true);
          }
          
          if (payload.new.status === 'report_ready') {
            setIsReportReady(true);
            toast({
              title: isMa ? "✅ التقرير جاهز" : isEn ? "✅ Report ready" : "✅ Informe listo",
              description: isMa 
                ? "يمكنك تحميل التقرير من لوحة التحكم"
                : isEn 
                ? "You can download the report from the dashboard"
                : "Puedes descargar el informe desde el panel",
            });
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [profile?.id, isMa, isEn, toast]);

  // ✅ Función para descargar el informe (con URL firmada)
  const handleDownloadReport = async () => {
    try {
      const userId = profile?.id;
      if (!userId) {
        toast({
          title: isMa ? "❌ خطأ" : isEn ? "❌ Error" : "❌ Error",
          description: isMa ? "يجب تسجيل الدخول أولاً" : isEn ? "Please login first" : "Debes iniciar sesión primero",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('verificaciones')
        .select('report_path')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data?.report_path) {
        throw new Error('No se encontró el informe');
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('informes-flussi-privado')
        .createSignedUrl(data.report_path, 3600);

      if (signedUrlError) throw signedUrlError;

      window.open(signedUrlData.signedUrl, '_blank');

    } catch (error: any) {
      toast({
        title: isMa ? "❌ خطأ في التحميل" : isEn ? "❌ Download error" : "❌ Error al descargar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
          
          const { data: verificationData } = await supabase
            .from('verificaciones')
            .select('payment_status, status, report_path')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (verificationData?.payment_status === 'paid') {
            setPaymentConfirmed(true);
            setFormReady(true);
            
            if (verificationData?.report_path) {
              setIsReportReady(true);
              setVerificationStatus('report_ready');
            }
          }
          
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
    }));
  }, [profile?.full_name, profile?.phone]);

  // Después de que el servidor confirme payment_status=paid, subimos los PDF
  // que seguían únicamente en IndexedDB y guardamos sus rutas en verificaciones.
  useEffect(() => {
    if (!profile?.id || !paymentConfirmed || formData.buscarSoloPersona) return;

    const uploadPaidFiles = async () => {
      try {
        const pending = await getPendingFlussiFiles();
        if (pending.length === 0) return;

        const uploaded: UploadedFile[] = [];
        for (const item of pending) {
          const extension = item.name.includes(".")
            ? item.name.split(".").pop()?.toLowerCase() || "bin"
            : item.type === "application/pdf"
            ? "pdf"
            : item.type === "image/jpeg"
            ? "jpg"
            : item.type === "image/png"
            ? "png"
            : item.type === "image/webp"
            ? "webp"
            : "bin";

          const fileName = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
          const file = item.file instanceof File
            ? item.file
            : new File([item.file], item.name, { type: item.type || "application/octet-stream" });

          const { error } = await supabase.storage
            .from("documentos-flussi-privado")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: item.type || "application/octet-stream",
            });
          if (error) throw error;
          uploaded.push({ name: item.name, path: fileName, size: item.size, type: item.type || "application/pdf" });
        }

        const paths = uploaded.map((file) => file.path);
        const names = uploaded.map((file) => file.name).join(", ");
        const { error: updateError } = await supabase
          .from("verificaciones")
          .update({ documentos: names, documentos_paths: paths })
          .eq("user_id", profile.id)
          .eq("payment_status", "paid");

        if (updateError) throw updateError;
        await clearPendingFlussiFiles();
        setUploadedFiles(uploaded);
        onFormChange("documentos", names);
        onFormChange("documentosUrls", JSON.stringify(paths));
      } catch (error) {
        console.error("Error subiendo documentos después del pago:", error);
      }
    };

    void uploadPaidFiles();
  }, [profile?.id, paymentConfirmed, formData.buscarSoloPersona]);

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

  // ✅ VALIDACIÓN - TODOS LOS CAMPOS OBLIGATORIOS EN ORDEN
  const validateForm = (): boolean => {
    // 1. Nombre
    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      setErrorField("fullName");
      return false;
    }

    // 2. Apellidos
    if (!formData.apellidos.trim() || formData.apellidos.length < 2) {
      setErrorField("apellidos");
      return false;
    }

    // 3. WhatsApp
    const phoneClean = formData.phone.replace(/\s/g, '');
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneClean || !phoneRegex.test(phoneClean)) {
      setErrorField("phone");
      return false;
    }

    // 4. Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setErrorField("email");
      return false;
    }

    // 5. País
    if (!formData.pais.trim()) {
      setErrorField("pais");
      return false;
    }

    // 6. Nombre completo del empleador/persona a comprobar
    if (!formData.empleadorNombre.trim() || formData.empleadorNombre.trim().length < 2) {
      setErrorField("empleadorNombre");
      return false;
    }

    // 7. Tipo de documento: solo es obligatorio si NO se busca únicamente a la persona
    if (!formData.buscarSoloPersona && !formData.tipoDocumento.trim()) {
      setErrorField("tipoDocumento");
      return false;
    }

    // 8. Documento: obligatorio solo cuando el cliente ha elegido una comprobación documental
    if (!formData.buscarSoloPersona && uploadedFiles.length === 0) {
      setErrorField("documents");
      return false;
    }

    // 9. Aceptación de términos
    if (!acceptTerms) {
      setErrorField("acceptTerms");
      return false;
    }

    // ✅ Todos los campos están correctos
    setErrorField(null);
    return true;
  };

  // ✅ HANDLE PAY - ejecuta validate y luego payStripe
  const handlePay = () => {
    if (!validateForm()) {
      return;
    }
    payStripe();
  };

  // ✅ Función que llama a Stripe
  const payStripe = async () => {
    try {
      if (!formData.buscarSoloPersona) {
        const pendingFiles = await getPendingFlussiFiles();
        if (pendingFiles.length === 0) {
          throw new Error(isMa ? "خاصك تختار الوثائق أولا" : isEn ? "Please select your documents first" : "Primero debes seleccionar los documentos");
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || generateSessionId();

      const res = await fetch("/api/create-checkout-flussi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          fullName: formData.fullName,
          apellidos: formData.apellidos,
          phone: formData.phone,
          email: formData.email,
          pais: formData.pais,
          tipoDocumento: formData.tipoDocumento || null,
          documentos: formData.documentos,
          // Nunca enviamos rutas de Supabase antes de confirmar el pago.
          documentosPaths: "[]",
          preferredOffice: formData.preferredOffice,
          empleadorNombre: formData.empleadorNombre,
          empleadorCiudad: formData.empleadorCiudad || null,
          empleadorFechaNacimiento: formData.empleadorFechaNacimiento || null,
          buscarSoloPersona: formData.buscarSoloPersona,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Error al crear el checkout');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: ui.stripeErrorTitle,
        description: error.message || ui.stripeErrorDesc,
        variant: "destructive",
      });
    }
  };

  const handleFormChange = (field: keyof ClientFormData, value: string | boolean) => {
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
               <img
  src="/images/sara.png"
  alt="Sara"
  className="w-full h-full object-cover object-top"
/>

               
          
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
            url="verifica.italia.it"
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
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            verificationStatus={verificationStatus}
            verificationProgress={verificationProgress}
            onDownloadReport={handleDownloadReport}
            isReportReady={isReportReady}
            errorField={errorField}
            errorRefs={errorRefs}
            setErrorField={setErrorField}
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
