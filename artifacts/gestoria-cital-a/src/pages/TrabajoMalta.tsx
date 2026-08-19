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

// ✅ Tipo final - Eliminados: preferred_position
type MaltaFormData = {
  // Datos personales
  fullName: string;
  whatsapp: string;
  email: string;
  nationality: string;
  currentCity: string;
  fechaNacimiento: string;
  
  // Idiomas con niveles
  idiomas: string;
  ingles_nivel: string;
  frances_nivel: string;
  italiano_nivel: string;
  espanol_nivel: string;
  arabe_nivel: string;
  aleman_nivel: string;
  
  // Experiencia
  trabajo_busca: string; // Lo que busca (máx 2)
  experiencia_previa: string; // Experiencia previa (máx 2)
  anos_experiencia: string;
  education_level: string;
  
  // Carnet de conducir
  carnetConducir: "None" | "A" | "B" | "C" | "D" | "B+C" | "B+C+E";
  
  // Documentos opcionales
  photoFile: File | null;
  photoUrl: string;
  pdfFile: File | null;
  pdfUrl: string;
  
  // Plan
  plan: "weekly" | "monthly";
};

// ✅ Componente de barra de progreso
function ProgressBar({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="w-full space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            index < currentStep 
              ? "bg-emerald-500 text-white" 
              : index === currentStep 
                ? "bg-yellow-500 text-black animate-pulse" 
                : "bg-white/10 text-white/30"
          }`}>
            {index < currentStep ? "✓" : index === currentStep ? "⏳" : (index + 1)}
          </div>
          <span className={`text-sm ${
            index < currentStep 
              ? "text-emerald-400" 
              : index === currentStep 
                ? "text-yellow-400 font-semibold" 
                : "text-white/30"
          }`}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
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
  selectedPlan,
  setSelectedPlan,
}: {
  language: string;
  avatarImage: string;
  title: string;
  url: string;
  profileLoading: boolean;
  ui: any;
  confirmed: boolean;
  formData: MaltaFormData;
  onFormChange: (field: keyof MaltaFormData, value: string | File | null) => void;
  onFormSubmit: () => void;
  formReady: boolean;
  onPay: (plan: "weekly" | "monthly") => void;
  acceptTerms: boolean;
  setAcceptTerms: (value: boolean) => void;
  selectedPlan: "weekly" | "monthly";
  setSelectedPlan: (plan: "weekly" | "monthly") => void;
}) {
  const isMa = language === "ma";
  const isEn = language === "en";
  const { toast } = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [progressSteps] = useState([
    isMa ? "✅ تم الدفع" : isEn ? "✅ Payment received" : "✅ Pago recibido",
    isMa ? "⏳ إنشاء السيرة الذاتية" : isEn ? "⏳ Creating CV" : "⏳ Creando CV",
    isMa ? "⏳ إنشاء الرسالة" : isEn ? "⏳ Creating cover letter" : "⏳ Creando carta",
    isMa ? "⏳ البحث عن الشركات" : isEn ? "⏳ Searching companies" : "⏳ Buscando empresas",
    isMa ? "⏳ إرسال الطلبات" : isEn ? "⏳ Sending applications" : "⏳ Enviando candidaturas",
    isMa ? "⏳ انتظار الردود" : isEn ? "⏳ Waiting for responses" : "⏳ Esperando respuestas",
  ]);
  const [progressStep, setProgressStep] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // 🆕 Estados para la validación visual y el scroll automático
  const [errorField, setErrorField] = useState<keyof MaltaFormData | "acceptTerms" | null>(null);
  const errorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 🆕 Efecto para hacer scroll automático al campo con error
  useEffect(() => {
    if (errorField) {
      const element = errorRefs.current[errorField];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [errorField]);

  // ✅ Función unificada de pago
  const handlePay = async (method: "stripe" | "paypal" | "transfer", plan: "weekly" | "monthly") => {
    if (method === "stripe") {
      // ✅ Llama al flujo existente de Stripe
      onPay(plan);
    } else if (method === "paypal") {
      try {
        let photoUrl = "";
        let pdfUrl = "";

        // ============================
        // SUBIR FOTO
        // ============================
        if (formData.photoFile) {
          const photoPath = `photos/${crypto.randomUUID()}-${formData.photoFile.name}`;
          const { error } = await supabase.storage
            .from("malta-temp")
            .upload(photoPath, formData.photoFile);

          if (error) throw error;

          const { data } = supabase.storage
            .from("malta-temp")
            .getPublicUrl(photoPath);

          photoUrl = data.publicUrl;
        }

        // ============================
        // SUBIR PDF
        // ============================
        if (formData.pdfFile) {
          const pdfPath = `pdfs/${crypto.randomUUID()}-${formData.pdfFile.name}`;

          const { error } = await supabase.storage
            .from("malta-temp")
            .upload(pdfPath, formData.pdfFile);

          if (error) throw error;

          const { data } = supabase.storage
            .from("malta-temp")
            .getPublicUrl(pdfPath);

          pdfUrl = data.publicUrl;
        }

        // ============================
        // CREAR PEDIDO PAYPAL
        // ============================
        const response = await fetch("/api/crear-pedido-de-paypal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            photoUrl,
            pdfUrl,
            plan,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error creando la orden PayPal");
        }

        window.location.href = data.approvalUrl;
        return;
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "No se pudo iniciar el pago con PayPal.",
          variant: "destructive",
        });
      }
    }
  };

  // ✅ NACIONALIDADES
  const nationalityOptions = [
    { id: "Morocco", label: isMa ? "المغرب" : isEn ? "Morocco" : "Marruecos" },
    { id: "Algeria", label: isMa ? "الجزائر" : isEn ? "Algeria" : "Argelia" },
    { id: "Tunisia", label: isMa ? "تونس" : isEn ? "Tunisia" : "Túnez" },
    { id: "Libya", label: isMa ? "ليبيا" : isEn ? "Libya" : "Libia" },
    { id: "Mauritania", label: isMa ? "موريتانيا" : isEn ? "Mauritania" : "Mauritania" },
    { id: "Egypt", label: isMa ? "مصر" : isEn ? "Egypt" : "Egipto" },
    { id: "Other", label: isMa ? "أخرى" : isEn ? "Other" : "Otro" },
  ];

  // ✅ CIUDADES
  const cityOptions = [
    { id: "Casablanca", label: "Casablanca" },
    { id: "Rabat", label: "Rabat" },
    { id: "Tangier", label: "Tangier" },
    { id: "Agadir", label: "Agadir" },
    { id: "Marrakech", label: "Marrakech" },
    { id: "Fes", label: "Fes" },
    { id: "Oujda", label: "Oujda" },
    { id: "Nador", label: "Nador" },
    { id: "Tetouan", label: "Tetouan" },
    { id: "Meknes", label: "Meknes" },
    { id: "Kenitra", label: "Kenitra" },
    { id: "Algiers", label: "Algiers" },
    { id: "Tunis", label: "Tunis" },
    { id: "Tripoli", label: "Tripoli" },
    { id: "Nouakchott", label: "Nouakchott" },
    { id: "Cairo", label: "Cairo" },
    { id: "Other", label: isMa ? "أخرى" : isEn ? "Other" : "Otro" },
  ];

  // ✅ CATEGORÍAS DE TRABAJO (se usan para ambos campos)
  const categoriaOptions = [
    { id: "Kitchen", label: isMa ? "🍽️ المطبخ" : isEn ? "🍽️ Kitchen" : "🍽️ Cocina" },
    { id: "Restaurant", label: isMa ? "🍺 المطعم" : isEn ? "🍺 Restaurant" : "🍺 Restaurante" },
    { id: "Cleaning", label: isMa ? "🧹 التنظيف" : isEn ? "🧹 Cleaning" : "🧹 Limpieza" },
    { id: "Hotel", label: isMa ? "🏨 الفندق" : isEn ? "🏨 Hotel" : "🏨 Hotel" },
    { id: "Construction", label: isMa ? "🏗️ البناء" : isEn ? "🏗️ Construction" : "🏗️ Construcción" },
    { id: "Factory", label: isMa ? "🏭 المصنع" : isEn ? "🏭 Factory" : "🏭 Fábrica" },
    { id: "Warehouse", label: isMa ? "📦 المستودع" : isEn ? "📦 Warehouse" : "📦 Almacén" },
    { id: "Delivery", label: isMa ? "🚚 التوصيل" : isEn ? "🚚 Delivery" : "🚚 Reparto" },
    { id: "Care", label: isMa ? "👵 رعاية" : isEn ? "👵 Care" : "👵 Cuidado de personas" },
    { id: "Agriculture", label: isMa ? "🚜 الزراعة" : isEn ? "🚜 Agriculture" : "🚜 Agricultura" },
    { id: "Other", label: isMa ? "أخرى" : isEn ? "Other" : "Otro" },
  ];

  // ✅ OPCIONES DE CARNET
  const carnetOptions = [
    { id: "None", label: isMa ? "لا" : isEn ? "None" : "Ninguno" },
    { id: "A", label: "A" },
    { id: "B", label: "B" },
    { id: "C", label: "C" },
    { id: "D", label: "D" },
    { id: "B+C", label: "B + C" },
    { id: "B+C+E", label: "B + C + E" },
  ];

  // ✅ NIVEL EDUCATIVO
  const educationLevelOptions = [
    { id: "Primary", label: isMa ? "ابتدائي" : isEn ? "Primary" : "Primaria" },
    { id: "Secondary", label: isMa ? "ثانوي" : isEn ? "Secondary" : "Secundaria" },
    { id: "High School", label: isMa ? "ثانوية عامة" : isEn ? "High School" : "Bachillerato" },
    { id: "Vocational", label: isMa ? "تكوين مهني" : isEn ? "Vocational" : "Formación Profesional" },
    { id: "University", label: isMa ? "جامعة" : isEn ? "University" : "Universidad" },
    { id: "Other", label: isMa ? "أخرى" : isEn ? "Other" : "Otro" },
  ];

  // ✅ AÑOS DE EXPERIENCIA
  const anosExperienciaOptions = [
    { id: "Less than 1 year", label: isMa ? "أقل من سنة" : isEn ? "Less than 1 year" : "Menos de 1 año" },
    { id: "1-2 years", label: isMa ? "1-2 سنة" : isEn ? "1-2 years" : "1-2 años" },
    { id: "3-5 years", label: isMa ? "3-5 سنوات" : isEn ? "3-5 years" : "3-5 años" },
    { id: "5+ years", label: isMa ? "أكثر من 5 سنوات" : isEn ? "5+ years" : "Más de 5 años" },
  ];

  // ✅ IDIOMAS
  const idiomasDisponibles = [
    { id: "English", label: isMa ? "الإنجليزية" : isEn ? "English" : "Inglés" },
    { id: "French", label: isMa ? "الفرنسية" : isEn ? "French" : "Francés" },
    { id: "Arabic", label: isMa ? "العربية" : isEn ? "Arabic" : "Árabe" },
    { id: "Spanish", label: isMa ? "الإسبانية" : isEn ? "Spanish" : "Español" },
    { id: "German", label: isMa ? "الألمانية" : isEn ? "German" : "Alemán" },
    { id: "Italian", label: isMa ? "الإيطالية" : isEn ? "Italian" : "Italiano" },
  ];

  // ✅ NIVELES DE IDIOMAS
  const nivelesIdiomas = [
    { id: "Basic", label: isMa ? "أساسي" : isEn ? "Basic" : "Básico" },
    { id: "Intermediate", label: isMa ? "متوسط" : isEn ? "Intermediate" : "Intermedio" },
    { id: "Advanced", label: isMa ? "متقدم" : isEn ? "Advanced" : "Avanzado" },
    { id: "Fluent", label: isMa ? "طلاقة" : isEn ? "Fluent" : "Fluido" },
    { id: "Native", label: isMa ? "لغة أم" : isEn ? "Native" : "Nativo" },
  ];

  // ✅ Mapeo de idiomas a nombres de campos correctos
  const languageFieldMap: Record<string, keyof MaltaFormData> = {
    "English": "ingles_nivel",
    "French": "frances_nivel",
    "Arabic": "arabe_nivel",
    "Spanish": "espanol_nivel",
    "German": "aleman_nivel",
    "Italian": "italiano_nivel",
  };

  // ✅ handlePhotoUpload - SOLO guarda en memoria, NO sube a Supabase
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: isMa ? "خطأ" : isEn ? "Error" : "Error",
        description: isMa ? "يرجى رفع صورة بصيغة JPG, PNG أو WEBP" : isEn ? "Please upload a JPG, PNG or WEBP image" : "Por favor sube una imagen JPG, PNG o WEBP",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: isMa ? "خطأ" : isEn ? "Error" : "Error",
        description: isMa ? "الصورة كبيرة جداً (الحد الأقصى 5 ميجابايت)" : isEn ? "Image too large (max 5MB)" : "Imagen demasiado grande (máx 5MB)",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingPhoto(true);
    try {
      // ✅ SOLO guardar en memoria - NO subir a Supabase
      onFormChange("photoFile", file);
      
      toast({
        title: isMa ? "✅ تم الرفع" : isEn ? "✅ Uploaded" : "✅ Subida",
        description: isMa ? "تم رفع الصورة بنجاح" : isEn ? "Photo uploaded successfully" : "Foto subida correctamente",
      });
    } catch (error) {
      console.error("Error loading photo:", error);
      toast({
        title: isMa ? "خطأ" : isEn ? "Error" : "Error",
        description: isMa ? "حدث خطأ أثناء رفع الصورة" : isEn ? "Error loading photo" : "Error al cargar la foto",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // handlePdfUpload - Solo guarda el archivo
  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast({
        title: isMa ? "خطأ" : isEn ? "Error" : "Error",
        description: isMa ? "يرجى رفع ملف PDF" : isEn ? "Please upload a PDF file" : "Por favor sube un archivo PDF",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: isMa ? "خطأ" : isEn ? "Error" : "Error",
        description: isMa ? "الملف كبير جداً (الحد الأقصى 10 ميجابايت)" : isEn ? "File too large (max 10MB)" : "Archivo demasiado grande (máx 10MB)",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingPdf(true);
    try {
      onFormChange("pdfFile", file);
      
      toast({
        title: isMa ? "✅ تم التحميل" : isEn ? "✅ File ready" : "✅ Archivo listo",
        description: isMa ? "تم تحميل الملف" : isEn ? "File loaded" : "Archivo cargado",
      });
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: isMa ? "خطأ" : isEn ? "Error" : "Error",
        description: isMa ? "حدث خطأ أثناء تحميل الملف" : isEn ? "Error loading file" : "Error al cargar el archivo",
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  // Simular progreso después del pago
  useEffect(() => {
    if (confirmed) {
      let step = 0;
      const interval = setInterval(() => {
        if (step < progressSteps.length - 1) {
          step++;
          setProgressStep(step);
        } else {
          clearInterval(interval);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [confirmed]);

  const formIntro = isMa
    ? "خدمة البحث عن عمل في مالطا باستخدام الذكاء الاصطناعي. عبّي الفورم ونحن نبحث عن العمل المناسب لك."
    : isEn
    ? "Job search service in Malta using Artificial Intelligence. Fill in the form and we will find the right job for you."
    : "Servicio de búsqueda de empleo en Malta con Inteligencia Artificial. Rellena el formulario y nosotros buscamos el trabajo adecuado para ti.";

  // Componente reutilizable para selección de categorías (máx 2)
  const CategoriaSelector = ({ 
    field, 
    label, 
    description 
  }: { 
    field: keyof MaltaFormData; 
    label: string; 
    description: string;
  }) => {
    const selected = (formData[field] as string)?.split(",").filter(Boolean) || [];
    
    return (
      <div 
        className="col-span-1 lg:col-span-2"
        ref={(el) => { errorRefs.current[field] = el; }} // 🆕 Referencia para el scroll
      >
        <label className="block text-white text-[13px] mb-2">
          {label}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categoriaOptions.map((opt) => {
            const isSelected = selected.includes(opt.id);
            const isDisabled = !isSelected && selected.length >= 2;
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? "border-yellow-500 bg-yellow-500/10"
                    : isDisabled
                    ? "border-white/5 bg-[#060b16] opacity-40 cursor-not-allowed"
                    : errorField === field // 🆕 Lógica del borde rojo
                    ? "border-red-500 bg-[#060b16]"
                    : "border-white/10 bg-[#060b16] hover:border-yellow-500/50"
                }`}
              >
                <input
                  type="checkbox"
                  value={opt.id}
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={(e) => {
                    // 🆕 Al cambiar, borramos el error de este campo
                    if (errorField === field) setErrorField(null);
                    
                    let newSelected: string[];
                    if (e.target.checked) {
                      if (selected.length >= 2) return;
                      newSelected = [...selected, opt.id];
                    } else {
                      newSelected = selected.filter((s) => s !== opt.id);
                    }
                    onFormChange(field, newSelected.join(","));
                  }}
                  className="w-4 h-4 rounded border-white/20 bg-[#060b16] text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 shrink-0"
                />
                <span className="text-white/80 text-[11px] sm:text-[12px]">{opt.label}</span>
              </label>
            );
          })}
        </div>
        <p className="text-white/40 text-[10px] mt-1">
          {description}
        </p>
      </div>
    );
  };

  // 🆕 Función de validación con resaltado visual
  const validateForm = (): boolean => {
    let firstError: keyof MaltaFormData | "acceptTerms" | null = null;

    if (!formData.fullName.trim()) firstError = "fullName";
    else {
      const whatsappNumber = formData.whatsapp.replace(/\D/g, "");
      if (whatsappNumber.length < 8 || whatsappNumber.length > 15) firstError = "whatsapp";
      else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) firstError = "email";
        else if (!formData.nationality) firstError = "nationality";
        else if (!formData.currentCity) firstError = "currentCity";
          else if (!formData.fechaNacimiento) firstError = "fechaNacimiento";
else if (!formData.idiomas.trim()) firstError = "idiomas";
else if (!formData.anos_experiencia) firstError = "anos_experiencia";
else if (!formData.education_level) firstError = "education_level";
else if (!formData.carnetConducir) firstError = "carnetConducir";
        else if (!formData.trabajo_busca.trim()) firstError = "trabajo_busca";
        else if (!formData.experiencia_previa.trim()) firstError = "experiencia_previa";
        else if (!acceptTerms) firstError = "acceptTerms";
      }
    }

    if (firstError) {
      setErrorField(firstError);
      
      // Mostramos un único Toast con el primer error
      const errorMessages: Record<string, string> = {
        fullName: isMa ? "الاسم الكامل مطلوب" : isEn ? "Full name is required" : "Nombre completo es requerido",
        whatsapp: isMa ? "رقم واتساب يجب أن يكون entre 8 y 15 رقم" : isEn ? "WhatsApp must be between 8 and 15 digits" : "WhatsApp debe tener entre 8 y 15 dígitos",
        email: isMa ? "البريد الإلكتروني غير صحيح" : isEn ? "Invalid email" : "Email inválido",
        nationality: isMa ? "الجنسية مطلوبة" : isEn ? "Nationality is required" : "Nacionalidad es requerida",
        currentCity: isMa ? "المدينة الحالية مطلوبة" : isEn ? "Current city is required" : "Ciudad actual es requerida",
        fechaNacimiento: isMa ? "تاريخ الميلاد مطلوب" : isEn ? "Birth date is required" : "La fecha de nacimiento es requerida",
idiomas: isMa ? "اختر اللغات" : isEn ? "Select languages" : "Selecciona los idiomas",
anos_experiencia: isMa ? "اختر سنوات الخبرة" : isEn ? "Select years of experience" : "Selecciona los años de experiencia",
education_level: isMa ? "اختر المستوى الدراسي" : isEn ? "Select education level" : "Selecciona el nivel educativo",
carnetConducir: isMa ? "اختر رخصة القيادة" : isEn ? "Select driving licence" : "Selecciona el carnet de conducir",
        trabajo_busca: isMa ? "اختر العمل الذي تبحث عنه" : isEn ? "Select the job you are looking for" : "Selecciona el trabajo que buscas",
        experiencia_previa: isMa ? "اختر تجربتك السابقة" : isEn ? "Select your previous experience" : "Selecciona tu experiencia previa",
        acceptTerms: isMa ? "خاصك توافق على الشروط" : isEn ? "You must accept the terms" : "Debes aceptar los términos",
      };

      toast({
        title: ui.missingTitle,
        description: errorMessages[firstError] || "Faltan datos",
        variant: "destructive",
      });
      return false;
    }

    return true;
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
                ? "🎉 مبروك! بدأنا البحث عن عمل لك"
                : isEn
                ? "🎉 SEARCH STARTED!"
                : "🎉 ¡BÚSQUEDA INICIADA!"}
            </h2>
            
            <div className="bg-[#0a0f1a] rounded-xl p-4 mb-4 text-left">
              <ProgressBar steps={progressSteps} currentStep={progressStep} />
            </div>
            
            <p className="text-white text-lg font-bold mb-4">
              {isMa
                ? "شكراً بزاف على الثقة ديالك في GestoriaCitaIA."
                : isEn
                ? "Thank you for trusting GestoriaCitaIA."
                : "Muchas gracias por confiar en GestoriaCitaIA."}
            </p>
            <p className="text-white/80">
              {isMa
                ? "بدأنا البحث عن فرص عمل في مالطا."
                : isEn
                ? "We have started searching for job opportunities in Malta."
                : "Hemos comenzado la búsqueda de oportunidades laborales en Malta."}
            </p>
            <p className="text-white/80 mt-2">
              {isMa
                ? "سنتواصل معك عبر WhatsApp عند العثور على فرصة."
                : isEn
                ? "We will contact you via WhatsApp when we find an opportunity."
                : "Te contactaremos por WhatsApp cuando encontremos una oportunidad."}
            </p>
            <p className="text-yellow-400 font-bold mt-4">
              {isMa
                ? "✅ عملية البحث بدأت بنجاح"
                : isEn
                ? "✅ Search process started"
                : "✅ Proceso de búsqueda iniciado"}
            </p>
            <p className="text-white/70 mt-6">
              {isMa
                ? "نتمنّاو ليك التوفيق في البحث عن عمل."
                : isEn
                ? "We wish you the best of luck in your job search."
                : "Te deseamos mucha suerte en tu búsqueda de empleo."}
            </p>
          </div>
        ) : !confirmed && !formReady ? (
          <>
            <div className="mt-3 mx-[-4px] rounded-[24px] border-2 border-yellow-500/60 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-3 py-3 shadow-[0_0_35px_rgba(255,200,0,0.18)]">
              <div className="mb-3 grid grid-cols-[32px_1fr_32px] items-center gap-2">
                <span />
                <h2 className="text-center text-yellow-400 text-[18px] sm:text-[20px] font-black leading-tight">
                  {isMa ? "عمر الفورم للبحث عن عمل" : isEn ? "Job Search Form" : "Formulario de Búsqueda de Empleo"}
                </h2>
                <img
                  src="https://flagcdn.com/w80/mt.png"
                  alt="Malta"
                  className="h-5 w-8 rounded-[3px] object-cover shadow-[0_0_10px_rgba(255,255,255,0.20)]"
                />
              </div>
              <p className="text-white/80 text-[13px] leading-relaxed mb-5">
                {formIntro}
              </p>
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                  
                  {/* ============================================ */}
                  {/* 1. DATOS PERSONALES */}
                  {/* ============================================ */}
                  
                  {/* Nombre completo */}
                  <div 
                    className="col-span-1 md:col-span-1"
                    ref={(el) => { errorRefs.current["fullName"] = el; }} // 🆕 Referencia
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الاسم الكامل" : isEn ? "Full name" : "Nombre completo"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "دخل سميتك" : isEn ? "Your name" : "Escribe tu nombre"}
                      value={formData.fullName}
                      onChange={(e) => {
                        if (errorField === "fullName") setErrorField(null); // 🆕 Limpiar error al escribir
                        onFormChange("fullName", e.target.value);
                      }}
                      className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400 ${
                        errorField === "fullName" ? "border-red-500" : "border-white/10"
                      }`} // 🆕 Borde rojo condicional
                    />
                  </div>

                  {/* WhatsApp */}
                  <div 
                    className="col-span-1 md:col-span-1"
                    ref={(el) => { errorRefs.current["whatsapp"] = el; }} // 🆕 Referencia
                  >
                    <label className="block text-white text-[13px] mb-2">
                      WhatsApp
                    </label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        className="w-[92px] shrink-0 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-2 text-center text-white"
                        value={formData.whatsapp.split(" ")[0] || ""}
                        onChange={(e) => {
                          const currentNumber = formData.whatsapp.replace(/^\+\d+\s*/, "");
                          onFormChange("whatsapp", currentNumber ? e.target.value + " " + currentNumber : "");
                        }}
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
                        <option value="+356">🇲🇹 +356</option>
                        
{/* 🌍 GOLFO */}
<option value="+971">🇦🇪 +971</option>
<option value="+974">🇶🇦 +974</option>
<option value="+966">🇸🇦 +966</option>
<option value="+965">🇰🇼 +965</option>
<option value="+973">🇧🇭 +973</option>
<option value="+968">🇴🇲 +968</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Número de WhatsApp"
                        value={formData.whatsapp.replace(/^\+\d+\s*/, "")}
                        onChange={(e) => {
                          if (errorField === "whatsapp") setErrorField(null); // 🆕 Limpiar error
                          const prefix = formData.whatsapp.split(" ")[0] || "";
                          const number = e.target.value.replace(/\D/g, "");
                          if (number.length <= 15) {
                            onFormChange("whatsapp", prefix + " " + number);
                          }
                        }}
                        className={`min-w-0 flex-1 h-[52px] rounded-2xl border bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400 ${
                          errorField === "whatsapp" ? "border-red-500" : "border-white/10"
                        }`} // 🆕 Borde rojo condicional
                      />
                    </div>
                    <p className="text-white/30 text-[10px] mt-1">
                      {isMa ? "8-15 رقم" : isEn ? "8-15 digits" : "8-15 dígitos"}
                    </p>
                  </div>

                  {/* Email */}
                  <div
                    ref={(el) => { errorRefs.current["email"] = el; }} // 🆕 Referencia
                  >
                    <label className="block text-white text-[13px] mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => {
                        if (errorField === "email") setErrorField(null); // 🆕 Limpiar error
                        onFormChange("email", e.target.value);
                      }}
                      className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400 ${
                        errorField === "email" ? "border-red-500" : "border-white/10"
                      }`} // 🆕 Borde rojo condicional
                    />
                  </div>

                  {/* Nacionalidad */}
                  <div
                    ref={(el) => { errorRefs.current["nationality"] = el; }} // 🆕 Referencia
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الجنسية" : isEn ? "Nationality" : "Nacionalidad"}
                    </label>
                    <select
                      value={formData.nationality}
                      onChange={(e) => {
                        if (errorField === "nationality") setErrorField(null); // 🆕 Limpiar error
                        onFormChange("nationality", e.target.value);
                      }}
                      className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400 ${
                        errorField === "nationality" ? "border-red-500" : "border-white/10"
                      }`} // 🆕 Borde rojo condicional
                    >
                      <option value="">{isMa ? "اختر الجنسية" : isEn ? "Select nationality" : "Selecciona nacionalidad"}</option>
                      {nationalityOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ciudad actual */}
                  <div
                    ref={(el) => { errorRefs.current["currentCity"] = el; }} // 🆕 Referencia
                  >
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المدينة الحالية" : isEn ? "Current City" : "Ciudad actual"}
                    </label>
                    <select
                      value={formData.currentCity}
                      onChange={(e) => {
                        if (errorField === "currentCity") setErrorField(null); // 🆕 Limpiar error
                        onFormChange("currentCity", e.target.value);
                      }}
                      className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400 ${
                        errorField === "currentCity" ? "border-red-500" : "border-white/10"
                      }`} // 🆕 Borde rojo condicional
                    >
                      <option value="">{isMa ? "اختر المدينة" : isEn ? "Select city" : "Selecciona ciudad"}</option>
                      {cityOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha nacimiento */}
                  <div className="min-w-0">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "تاريخ الميلاد" : isEn ? "Birth date" : "Fecha nacimiento"}
                    </label>
                    <input
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => onFormChange("fechaNacimiento", e.target.value)}
                      className="block w-full max-w-full min-w-0 h-[52px] box-border appearance-none rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white [color-scheme:dark]"
                    />
                  </div>

                  {/* ============================================ */}
                  {/* 2. TRABAJO QUE BUSCA (máx 2) */}
                  {/* ============================================ */}
                  
                  <CategoriaSelector
                    field="trabajo_busca"
                    label={isMa ? "🔍 فين كاتبحث على خدمة؟ (اختر 2 كحد أقصى)" : isEn ? "🔍 What job are you looking for? (Max 2)" : "🔍 ¿Qué trabajo buscas? (Máx 2)"}
                    description={isMa ? "اختر المجالات التي تبحث عن عمل فيها" : isEn ? "Select the fields you are looking for work in" : "Selecciona los campos en los que buscas trabajo"}
                  />

                  {/* ============================================ */}
                  {/* 3. EXPERIENCIA PREVIA (máx 2) */}
                  {/* ============================================ */}
                  
                  <CategoriaSelector
                    field="experiencia_previa"
                    label={isMa ? "💼 في ماذا اشتغلت قبل؟ (اختر 2 كحد أقصى)" : isEn ? "💼 What have you worked in before? (Max 2)" : "💼 ¿En qué has trabajado antes? (Máx 2)"}
                    description={isMa ? "اختر المجالات التي لديك خبرة فيها" : isEn ? "Select the fields you have experience in" : "Selecciona los campos en los que tienes experiencia"}
                  />

                  {/* ============================================ */}
                  {/* 4. IDIOMAS */}
                  {/* ============================================ */}
                  
                  <div className="col-span-1 lg:col-span-2">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "ما هي اللغات التي تتحدثها؟" : isEn ? "What languages do you speak?" : "¿Qué idiomas hablas?"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {idiomasDisponibles.map((idioma) => {
                        const fieldName = languageFieldMap[idioma.id];
                        return (
                          <div key={idioma.id} className="rounded-xl border border-white/10 bg-[#060b16] p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                id={`idioma_${idioma.id}`}
                                checked={formData.idiomas?.includes(idioma.id) || false}
                                onChange={(e) => {
                                  const currentIdiomas = formData.idiomas?.split(",").filter(Boolean) || [];
                                  let newIdiomas: string[];
                                  if (e.target.checked) {
                                    newIdiomas = [...currentIdiomas, idioma.id];
                                  } else {
                                    newIdiomas = currentIdiomas.filter((s) => s !== idioma.id);
                                  }
                                  onFormChange("idiomas", newIdiomas.join(","));
                                }}
                                className="w-4 h-4 rounded border-white/20 bg-[#060b16] text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 shrink-0"
                              />
                              <label htmlFor={`idioma_${idioma.id}`} className="text-white text-[13px] font-medium">
                                {idioma.label}
                              </label>
                            </div>
                            {formData.idiomas?.includes(idioma.id) && fieldName && (
                              <select
                                value={(formData[fieldName] as string) || ""}
                                onChange={(e) => onFormChange(fieldName, e.target.value)}
                                className="w-full h-[36px] rounded-lg border border-white/10 bg-[#0a0f1a] px-3 text-[12px] text-white focus:outline-none focus:border-yellow-400"
                              >
                                <option value="">{isMa ? "اختر المستوى" : isEn ? "Select level" : "Selecciona nivel"}</option>
                                {nivelesIdiomas.map((nivel) => (
                                  <option key={nivel.id} value={nivel.id}>{nivel.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-white/40 text-[10px] mt-1">
                      {isMa ? "اختر اللغات التي تتحدثها ومستوى كل منها" : isEn ? "Select the languages you speak and their level" : "Selecciona los idiomas que hablas y su nivel"}
                    </p>
                  </div>

                  {/* ============================================ */}
                  {/* 5. AÑOS DE EXPERIENCIA Y EDUCACIÓN */}
                  {/* ============================================ */}
                  
                  {/* Años de experiencia */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "سنوات الخبرة" : isEn ? "Years of experience" : "Años de experiencia"}
                    </label>
                    <select
                      value={formData.anos_experiencia}
                      onChange={(e) => onFormChange("anos_experiencia", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">{isMa ? "اختر المدة" : isEn ? "Select" : "Selecciona"}</option>
                      {anosExperienciaOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nivel educativo */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المستوى التعليمي" : isEn ? "Education Level" : "Nivel educativo"}
                    </label>
                    <select
                      value={formData.education_level}
                      onChange={(e) => onFormChange("education_level", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">{isMa ? "اختر المستوى" : isEn ? "Select level" : "Selecciona nivel"}</option>
                      {educationLevelOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* ============================================ */}
                  {/* 6. CARNET DE CONDUCIR */}
                  {/* ============================================ */}
                  
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "رخصة السياقة" : isEn ? "Driver's license" : "Carnet de conducir"}
                    </label>
                    <select
                      value={formData.carnetConducir}
                      onChange={(e) => onFormChange("carnetConducir", e.target.value as "None" | "A" | "B" | "C" | "D" | "B+C" | "B+C+E")}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400"
                    >
                      {carnetOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* ============================================ */}
                  {/* 7. DOCUMENTOS OPCIONALES */}
                  {/* ============================================ */}
                  
                  <div className="col-span-1 lg:col-span-2 mt-2 rounded-2xl border border-white/10 bg-[#060b16] p-4">
                    <p className="text-white/70 text-[13px] font-medium mb-3 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-yellow-400" />
                      {isMa ? "📎 وثائق إضافية (اختياري)" : isEn ? "📎 Optional Documents" : "📎 Documentos Opcionales"}
                    </p>
                    <p className="text-white/40 text-[11px] mb-3">
                      {isMa 
                        ? "يمكنك إضافة صورة شخصية أو ملف PDF إضافي (مثل شهادات، دورات، إلخ). هذه الوثائق ستُرفق مع طلبات التوظيف." 
                        : isEn 
                        ? "You can add a profile photo or an additional PDF (certificates, courses, etc.). These documents will be attached to your job applications."
                        : "Puedes añadir una foto de perfil o un PDF adicional (certificados, cursos, etc.). Estos documentos se adjuntarán a tus solicitudes de empleo."}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Foto opcional */}
                      <div className="rounded-xl border border-white/10 bg-[#0a0f1a] p-3">
                        <label className="block text-white/80 text-[12px] font-medium mb-2">
                          {isMa ? "📷 صورة شخصية (اختياري)" : isEn ? "📷 Profile Photo (optional)" : "📷 Foto de perfil (opcional)"}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full text-[11px] text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-yellow-500/20 file:text-yellow-400 file:text-xs file:font-semibold hover:file:bg-yellow-500/30"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(file);
                          }}
                          disabled={uploadingPhoto}
                        />
                        {uploadingPhoto && (
                          <div className="mt-2 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                            <span className="text-yellow-400 text-[10px]">{isMa ? "جاري التحميل..." : isEn ? "Loading..." : "Cargando..."}</span>
                          </div>
                        )}
                        {formData.photoFile && (
                          <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-emerald-400 text-[10px] font-semibold truncate">
                              ✅ {isMa ? "تم التحميل" : isEn ? "Loaded" : "Cargada"}
                            </p>
                          </div>
                        )}
                        <p className="text-white/30 text-[9px] mt-1">
                          {isMa ? "JPG, PNG أو WEBP - حد أقصى 5 ميجابايت" : isEn ? "JPG, PNG or WEBP - max 5MB" : "JPG, PNG o WEBP - máx 5MB"}
                        </p>
                      </div>
                      
                      {/* PDF opcional */}
                      <div className="rounded-xl border border-white/10 bg-[#0a0f1a] p-3">
                        <label className="block text-white/80 text-[12px] font-medium mb-2">
                          {isMa ? "📄 ملف PDF إضافي (اختياري)" : isEn ? "📄 Additional PDF (optional)" : "📄 PDF adicional (opcional)"}
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          className="w-full text-[11px] text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-yellow-500/20 file:text-yellow-400 file:text-xs file:font-semibold hover:file:bg-yellow-500/30"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePdfUpload(file);
                          }}
                          disabled={uploadingPdf}
                        />
                        {uploadingPdf && (
                          <div className="mt-2 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                            <span className="text-yellow-400 text-[10px]">{isMa ? "جاري التحميل..." : isEn ? "Loading..." : "Cargando..."}</span>
                          </div>
                        )}
                        {formData.pdfFile && (
                          <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-emerald-400 text-[10px] font-semibold truncate">
                              ✅ {isMa ? "تم التحميل" : isEn ? "Loaded" : "Cargado"}
                            </p>
                          </div>
                        )}
                        <p className="text-white/30 text-[9px] mt-1">
                          {isMa ? "PDF - حد أقصى 10 ميجابايت" : isEn ? "PDF - max 10MB" : "PDF - máx 10MB"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ============================================ */}
                  {/* 8. PLANES */}
                  {/* ============================================ */}
                  
                  {/* Plan Semanal */}
                  <div 
                    className={`col-span-1 lg:col-span-1 mt-2 rounded-[28px] border-2 p-4 shadow-[0_0_35px_rgba(59,130,246,0.15)] cursor-pointer transition-all ${
                      selectedPlan === "weekly" 
                        ? "border-blue-500 bg-gradient-to-b from-[#0b0b0b] to-[#0a1628]" 
                        : "border-blue-500/30 bg-gradient-to-b from-[#0b0b0b] to-[#050505] hover:border-blue-500/60"
                    }`}
                    onClick={() => setSelectedPlan("weekly")}
                  >
                    <div className="flex items-start justify-between mb-4 pt-2">
                      <div>
                        <p className="text-white text-[15px] font-bold">
                          {isMa ? "بحث عمل - أسبوع" : isEn ? "Job Search - Weekly" : "Búsqueda - Semanal"}
                        </p>
                        <span className="inline-flex mt-1 rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-400">
                          {isMa ? "أسبوع" : "Weekly"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 text-[28px] sm:text-[34px] font-black leading-none drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]">
                          9,99€
                        </p>
                        <p className="text-blue-300 text-[11px] font-semibold">
                          {isMa ? "7 أيام" : "7 days"}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-gray-300 text-[12px] sm:text-[13px]">
                      <li>✅ {isMa ? "سيرة ذاتية احترافية بالذكاء الاصطناعي" : isEn ? "Professional AI CV" : "CV profesional con IA"}</li>
                      <li>✅ {isMa ? "رسالة تحفيزية بالانجليزية" : isEn ? "Motivation letter in English" : "Carta de motivación en inglés"}</li>
                      <li>✅ {isMa ? "حتى 70 طلب توظيف (10 في اليوم)" : isEn ? "Up to 70 applications (10/day)" : "Hasta 70 candidaturas (10/día)"}</li>
                      <li>✅ {isMa ? "إشعارات واتساب" : isEn ? "WhatsApp notifications" : "Notificaciones WhatsApp"}</li>
                    </ul>
                    {selectedPlan === "weekly" && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-blue-400 text-[10px] font-bold uppercase">Seleccionado</span>
                      </div>
                    )}
                  </div>

                  {/* Plan Mensual (Recomendado) */}
                  <div 
                    className={`col-span-1 lg:col-span-1 mt-2 rounded-[28px] border-2 p-4 shadow-[0_0_35px_rgba(255,200,0,0.18)] cursor-pointer transition-all ${
                      selectedPlan === "monthly" 
                        ? "border-yellow-500 bg-gradient-to-b from-[#0b0b0b] to-[#1a1508]" 
                        : "border-yellow-500/30 bg-gradient-to-b from-[#0b0b0b] to-[#050505] hover:border-yellow-500/60"
                    }`}
                    onClick={() => setSelectedPlan("monthly")}
                  >
                    <div className="flex items-start justify-between mb-4 pt-2">
                      <div>
                        <p className="text-white text-[15px] font-bold">
                          {isMa ? "بحث عمل - شهري" : isEn ? "Job Search - Monthly" : "Búsqueda - Mensual"}
                        </p>
                        <span className="inline-flex mt-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]">
                          ⭐ {isMa ? "الأفضل" : "Best Value"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 text-[28px] sm:text-[34px] font-black leading-none drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
                          19,99€
                        </p>
                        <p className="text-yellow-300 text-[11px] font-semibold">
                          {isMa ? "30 يوم" : "30 days"}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-gray-300 text-[12px] sm:text-[13px]">
                      <li>✅ {isMa ? "كل ما في الخطة الأسبوعية" : isEn ? "All weekly plan features" : "Todo lo del plan semanal"}</li>
                      <li>✅ {isMa ? "30 يوم من البحث" : isEn ? "30 days of searching" : "30 días de búsqueda"}</li>
                      <li>✅ {isMa ? "حتى 300 طلب توظيف" : isEn ? "Up to 300 applications" : "Hasta 300 candidaturas"}</li>
                      <li>✅ {isMa ? "احتمالية أكبر للمقابلات" : isEn ? "Higher chance of interviews" : "Mayor probabilidad de entrevistas"}</li>
                      <li>✅ {isMa ? "دعم أولوية عبر واتساب" : isEn ? "Priority WhatsApp support" : "Soporte prioritario WhatsApp"}</li>
                    </ul>
                    {selectedPlan === "monthly" && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-yellow-400 text-[10px] font-bold uppercase">Seleccionado</span>
                      </div>
                    )}
                  </div>

                          {/* ============================================ */}
                  {/* 9. CHECKBOX + BOTÓN DE PAGO */}
                  {/* ============================================ */}
                  
                  <div 
                    className="col-span-1 lg:col-span-2 mt-2"
                    ref={(el) => { errorRefs.current["acceptTerms"] = el; }}
                  >
                    {/* ✅ FRASE PROMOCIONAL ENCIMA DEL CHECKBOX */}
                    <div className="mb-4 text-center">
                      <p className="text-sm sm:text-base font-semibold text-white">
                        {isMa 
                          ? "🚀 نتا غادي تاخد السيرة الذاتية والرسالة جاهزين."
                          : isEn
                          ? "🚀 You receive the CV and the letter prepared."
                          : "🚀 Tú recibes el CV y la carta preparados."}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {isMa
                          ? "حنا كنلقاو الشركات والفرص. نتا كاتختار فين ترسل طلبك."
                          : isEn
                          ? "We search for companies and opportunities. You choose where to send your application."
                          : "Nosotros buscamos las empresas y oportunidades. Tú eliges dónde enviar tu candidatura."}
                      </p>
                    </div>

                    {/* ✅ CHECKBOX CON TEXTO COLAPSABLE */}
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => {
                            if (errorField === "acceptTerms") setErrorField(null);
                            setAcceptTerms(e.target.checked);
                          }}
                          className={`mt-1 h-5 w-5 shrink-0 rounded border-white/30 bg-white/10 accent-green-500 ${
                            errorField === "acceptTerms" ? "border-red-500" : "border-white/20"
                          }`}
                        />

                        <span className="text-sm leading-relaxed text-white/80">
                          {/* 🔹 TEXTO CORTO SIEMPRE VISIBLE */}
                          <span>
                            {isMa ? (
                              <>
                                <strong className="text-white">
                                  كنوافق أن GestoriaCitaIA تستخدم المعطيات اللي دخلتهم باش تولد لي السيرة الذاتية ورسالة التحفيز.
                                </strong>
                              </>
                            ) : isEn ? (
                              <>
                                <strong className="text-white">
                                  I agree that GestoriaCitaIA uses the data I have provided to generate my CV and motivation letter.
                                </strong>
                              </>
                            ) : (
                              <>
                                <strong className="text-white">
                                  Acepto que GestoriaCitaIA utilice los datos que he proporcionado para generar mi CV y carta de motivación.
                                </strong>
                              </>
                            )}
                          </span>

                          {/* 🔹 BOTÓN "LEER MÁS" - Toggle con estado local */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const content = document.getElementById('termsFullText');
                              const btn = document.getElementById('termsToggleBtn');
                              if (content && btn) {
                                const isHidden = content.classList.contains('hidden');
                                if (isHidden) {
                                  content.classList.remove('hidden');
                                  btn.textContent = isMa ? '🔺 إقرأ أقل' : isEn ? '🔺 Read less' : '🔺 Leer menos';
                                } else {
                                  content.classList.add('hidden');
                                  btn.textContent = isMa ? '🔽 إقرأ المزيد' : isEn ? '🔽 Read more' : '🔽 Leer más';
                                }
                              }
                            }}
                            id="termsToggleBtn"
                            className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold underline ml-1 cursor-pointer"
                          >
                            {isMa ? '🔽 إقرأ المزيد' : isEn ? '🔽 Read more' : '🔽 Leer más'}
                          </button>

                          {/* 🔹 TEXTO COMPLETO - OCULTO POR DEFECTO */}
                          <div id="termsFullText" className="hidden mt-2 space-y-2">
                            {isMa ? (
                              <>
                                <br />
                                غادي ناخد <strong className="text-white">السيرة الذاتية ورسالة التحفيز</strong>
                                ديالي باش نستعملهم كيفما بغيت، مع معلومات على الشركات وفرص
                                الشغل، بما في ذلك <strong className="text-white">
                                  المواقع، الإيميلات وأرقام الهواتف المهنية المنشورة بشكل عام
                                </strong>.

                                <br />
                                <br />

                                <strong className="text-white">
                                  GestoriaCitaIA ما كتبعثش السيرة الذاتية ديالي للشركات، ما كتتواصلش مع
                                  أرباب العمل بإسمي وما كتقدمش طلبات الشغل نيابة عني.
                                </strong>
                                أنا لي كاتقرر مع أي شركة نتواصل و أنا لي كتبعث طلباتي بنفسي.

                                <br />
                                <br />

                                <span className="text-green-400">
                                  🔒 المعطيات الشخصية ديالي ما كتنباعش ولا كتتبعت للشركات كجزء
                                  من هاد الخدمة.
                                </span>

                                <br />
                                <br />

                                <span className="text-white/60 text-xs">
                                  ℹ️ GestoriaCitaIA ما هياش المشغلة، ما كتضمنش المقابلات ولا
                                  التوظيف وما كتضمنش الحصول على منصب شغل.
                                </span>
                              </>
                            ) : isEn ? (
                              <>
                                <br />
                                I will receive my <strong className="text-white">CV and motivation letter</strong>
                                for my own use, along with information about companies and job
                                opportunities, including <strong className="text-white">
                                  publicly published professional websites, emails and phone numbers
                                </strong>.

                                <br />
                                <br />

                                <strong className="text-white">
                                  GestoriaCitaIA does not send my CV to companies, does not contact
                                  employers on my behalf and does not submit applications for me.
                                </strong>
                                I decide which companies to contact and I personally submit my application.

                                <br />
                                <br />

                                <span className="text-green-400">
                                  🔒 My personal data is not sold or sent to companies as
                                  part of this service.
                                </span>

                                <br />
                                <br />

                                <span className="text-white/60 text-xs">
                                  ℹ️ GestoriaCitaIA is not the employer, does not guarantee
                                  interviews or hiring and does not guarantee obtaining a job position.
                                </span>
                              </>
                            ) : (
                              <>
                                <br />
                                Recibiré mi <strong className="text-white">CV y carta de motivación</strong>
                                para mi propio uso, junto con información de empresas y oportunidades
                                de empleo, incluyendo <strong className="text-white">
                                  webs, emails y teléfonos profesionales publicados públicamente
                                </strong>.

                                <br />
                                <br />

                                <strong className="text-white">
                                  GestoriaCitaIA no envía mi CV a empresas, no contacta con empleadores
                                  en mi nombre y no presenta candidaturas por mí.
                                </strong>
                                Yo decido a qué empresas contactar y envío personalmente mi candidatura.

                                <br />
                                <br />

                                <span className="text-green-400">
                                  🔒 Mis datos personales no se venden ni se envían a empresas como
                                  parte de este servicio.
                                </span>

                                <br />
                                <br />

                                <span className="text-white/60 text-xs">
                                  ℹ️ GestoriaCitaIA no es el empleador, no garantiza entrevistas ni
                                  contratación y no garantiza la obtención de un puesto de trabajo.
                                </span>
                              </>
                            )}
                          </div>
                        </span>
                      </label>
                    </div>

                    {/* ✅ BOTÓN AMARILLO - ABRE EL POPUP */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!validateForm()) return;
                        setShowPaymentModal(true);
                      }}
                      disabled={!acceptTerms}
                      className="w-full min-h-[56px] rounded-[20px] bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 px-4 py-2 text-[15px] font-black text-black shadow-[0_0_30px_rgba(255,215,0,.35)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition mt-4"
                    >
                      {isMa ? "🚀 ابدأ البحث الآن" : isEn ? "🚀 Start search now" : "🚀 Empezar búsqueda ahora"}
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
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[26px] border border-emerald-500/40 bg-[#07111f] px-5 py-7 mb-5 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full border-2 border-emerald-400 bg-emerald-500/15 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-center text-white text-[18px] font-semibold leading-tight mb-3">
              {isMa
                ? "مبروك 🎉 بدأنا البحث عن عمل لك في مالطا"
                : isEn
                ? "Congratulations 🎉 We have started searching for jobs for you in Malta"
                : "Felicidades 🎉 Hemos empezado a buscar trabajo para ti en Malta"}
            </h3>
            
            <div className="bg-[#0a0f1a] rounded-xl p-4 mb-4">
              <ProgressBar steps={progressSteps} currentStep={progressStep} />
            </div>
            
            <p className="text-center text-white/70 text-[14px] leading-relaxed">
              {isMa
                ? "سنتواصل معك عبر واتساب عند العثور على فرصة عمل مناسبة."
                : isEn
                ? "We will contact you via WhatsApp when we find a suitable job opportunity."
                : "Te contactaremos por WhatsApp cuando encontremos una oportunidad laboral adecuada."}
            </p>
          </div>
        )}
      </div>

      {/* ✅ POPUP PROFESIONAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2336] via-[#121827] to-[#0b1120] border border-yellow-400/60 shadow-[0_25px_80px_rgba(0,0,0,.65),0_0_40px_rgba(255,215,0,.15)]">
            
            {/* HEADER */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-black tracking-tight text-white">
                  {isMa ? "اختر طريقة الدفع" : isEn ? "Select payment method" : "Selecciona tu método de pago"}
                </h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition shrink-0 text-white/60 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-white/50 text-[12px] mt-0.5">
                {isMa ? "اختر كيف تفضل الدفع بأمان" : isEn ? "Choose how you prefer to pay securely" : "Elige cómo prefieres pagar de forma segura"}
              </p>
            </div>

            {/* OPCIONES DE PAGO */}
            <div className="space-y-2 px-3 pb-4 mt-2">
              
              {/* ✅ STRIPE - TARJETA (FLUJO ORIGINAL, NO TOCADO) */}
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  onPay(selectedPlan);
                }}
                className="w-full rounded-xl border-2 border-yellow-500/80 bg-[#1a1a1a] p-2.5 hover:bg-[#222] transition hover:shadow-[0_0_25px_rgba(255,215,0,.12)] group relative"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-yellow-500 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-white font-bold text-[14px]">
                      {isMa ? "بطاقة (Stripe)" : isEn ? "Card (Stripe)" : "Tarjeta (Stripe)"}
                    </div>
                    <div className="text-white/50 text-[10px]">
                      {isMa ? "ادفع بأمان ببطاقتك" : isEn ? "Pay securely with your card" : "Pago 100% seguro con tu tarjeta"}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <img src="https://img.icons8.com/color/48/visa.png" className="h-4 w-auto" alt="Visa" />
                      <img src="https://img.icons8.com/color/48/mastercard-logo.png" className="h-4 w-auto" alt="Mastercard" />
                      <img src="https://img.icons8.com/color/48/apple-pay.png" className="h-4 w-auto" alt="Apple Pay" />
                      <img src="https://img.icons8.com/color/48/google-pay.png" className="h-4 w-auto" alt="Google Pay" />
                    </div>
                  </div>
                </div>
              </button>

              {/* ✅ PAYPAL - ACTIVO (Solo ejecuta el flujo, la validación ya se hizo antes) */}
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  handlePay("paypal", selectedPlan);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#111827] p-2.5 hover:bg-[#222] transition hover:border-yellow-500/40 group relative"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0 group-hover:border-yellow-500/50">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.112 1.267 1.363 2.877 1.015 4.556-.335 1.598-1.17 2.926-2.268 3.787-.814.635-1.819 1.045-2.872 1.107-.334.019-.673.028-1.014.028h-3.19c-.435 0-.826.308-.932.731l-.43 1.873-.168.733-.164.717a.641.641 0 0 1-.633.74h-2.09l.467-2.064Z"/>
                    </svg>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-white font-bold text-[14px]">PayPal</div>
                    <div className="text-white/50 text-[10px]">
                      {isMa ? "ادفع بأمان" : isEn ? "Pay securely" : "Pago 100% seguro"}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <img src="https://img.icons8.com/color/48/paypal.png" className="h-4 w-auto" alt="PayPal" />
                      <img src="https://img.icons8.com/color/48/visa.png" className="h-4 w-auto" alt="Visa" />
                      <img src="https://img.icons8.com/color/48/mastercard-logo.png" className="h-4 w-auto" alt="Mastercard" />
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
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-white font-bold text-[14px]">
                      {isMa ? "تحويل بنكي" : isEn ? "Bank Transfer" : "Transferencia bancaria"}
                    </div>
                    <div className="text-white/50 text-[10px]">
                      {isMa ? "ادفع مباشرة من بنكك" : isEn ? "Pay directly from your bank" : "Realiza el pago directamente desde tu banco"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">SEPA</span>
                      <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">IBAN</span>
                      <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">BIC/SWIFT</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* FOOTER SEGURIDAD */}
            <div className="border-t border-white/5 px-3 py-2.5 mt-0.5">
              <div className="flex items-center justify-center gap-2 text-[10px] text-green-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isMa ? "دفع آمن 100% - مشفر SSL" : isEn ? "100% secure - SSL encrypted" : "Pago 100% seguro - Cifrado SSL"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[8px] text-white/30">
                  {isMa ? "معالج بأمان بواسطة" : isEn ? "Processed securely by" : "Procesado de forma segura por"}
                </span>
                <span className="text-[9px] font-bold text-yellow-400/70">Stripe</span>
                <span className="text-white/20">•</span>
                <span className="text-[9px] font-bold text-gray-500">PayPal</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function TrabajoMalta() {
  const { lang } = useLang();
  const language = lang === "darija" ? "ma" : lang;

  const [location] = useLocation();
  const [muted, setMuted] = useState(false);
  
  // ✅ ESTADO INICIAL CORREGIDO - SIEMPRE false
  const [confirmed, setConfirmed] = useState(false);
  
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("monthly");
  
  // ✅ useEffect CORREGIDO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      // Pagó correctamente
      setConfirmed(true);

      const timer = setTimeout(() => {
        localStorage.removeItem("maltaPaid");
        localStorage.removeItem("malta_form");

        window.history.replaceState(
          {},
          document.title,
          "/trabajo-malta"
        );

        setConfirmed(false);
        window.location.reload();
      }, 6000);

      return () => clearTimeout(timer);
    }

    // Si no pagó o canceló Stripe
    setConfirmed(false);

    localStorage.removeItem("maltaPaid");

    window.history.replaceState(
      {},
      document.title,
      "/trabajo-malta"
    );
  }, []);

  // ✅ FormData actualizado - snake_case
  const [formData, setFormData] = useState<MaltaFormData>({
    fullName: "",
    whatsapp: "",
    email: "",
    nationality: "",
    currentCity: "",
    fechaNacimiento: "",
    
    // Idiomas
    idiomas: "",
    ingles_nivel: "",
    frances_nivel: "",
    italiano_nivel: "",
    espanol_nivel: "",
    arabe_nivel: "",
    aleman_nivel: "",
    
    trabajo_busca: "",
    experiencia_previa: "",
    anos_experiencia: "",
    education_level: "",
    
    carnetConducir: "None",
    
    // Documentos opcionales
    photoFile: null,
    photoUrl: "",
    pdfFile: null,
    pdfUrl: "",
    
    plan: "monthly",
  });
  
  const [formReady, setFormReady] = useState(
    localStorage.getItem("maltaPaid") === "1"
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
        "السلام عليكم مرحبا بك في خدمة البحث عن عمل في مالطا. أنا سارة، غادي نعاونك باش تلاقي خدمة مناسبة في مالطا. عبّي الفورم وغادي نبداو البحث.",
      savedLeadReply:
        "مزيان، وصلنا المعلومات ديالك. غادي نبداو البحث عن فرص عمل مناسبة ليك في مالطا.",
      confirmMsg:
        "مبروك عليك، بدأنا البحث عن عمل ليك في مالطا. شكرا على الثقة ديالك في هيستوريا إي آي",
    }),
    []
  );

  const ui = useMemo(() => {
    return {
      docsByTramite: {
        malta: [
          { nombre: isMa ? "السيرة الذاتية" : isEn ? "CV" : "Currículum Vitae", estado: "ok" as DocState },
          { nombre: isMa ? "رسالة التحفيز" : isEn ? "Motivation letter" : "Carta de motivación", estado: "ok" as DocState },
        ],
      } as Record<string, DocItem[]>,

      formsByTramite: {
        malta: [
          { nombre: isMa ? "نموذج التقديم" : isEn ? "Application Form" : "Formulario de solicitud", codigo: "JOB-APP", url: "https://example.com" },
        ],
      } as Record<string, FormItem[]>,

      online: isMa ? "أونلاين" : isEn ? "Online" : "En línea",

      agentRole: isMa
        ? "البحث عن عمل"
        : isEn
        ? "Job Search Assistant"
        : "Asesora de Empleo",

      loadingUserData: isMa
        ? "جاري تحميل المعلومات..."
        : isEn
        ? "Loading user data..."
        : "Cargando datos del usuario...",

      govSmall: "empleo:",
      govTitle: "TRABAJO EN MALTA · IA · AUTOMÁTICO",
      govLine1: "BÚSQUEDA DE EMPLEO",
      govLine2: "AUTOMÁTICA 24/7",
      govLine3: "NOTIFICACIÓN WHATSAPP",

      confirmTitle: isMa ? "تم تأكيد البحث!" : isEn ? "SEARCH CONFIRMED!" : "¡BÚSQUEDA CONFIRMADA!",

      date: isMa ? "التاريخ" : isEn ? "Date" : "Fecha",
      time: isMa ? "الوقت" : isEn ? "Time" : "Hora",
      office: isMa ? "المكتب" : isEn ? "Office" : "Oficina",
      appointmentNumber: isMa ? "رقم الطلب" : isEn ? "Application Number" : "Nº Solicitud",

      reservationSaved: isMa
        ? "تم حفظ الطلب"
        : isEn
        ? "Application saved"
        : "Solicitud guardada correctamente",

      sourceLabel: isMa ? "المصدر الرسمي" : isEn ? "Official source" : "Fuente oficial",

      voiceButton: isMa
        ? "تكلم مع سارة حول البحث"
        : isEn
        ? "Talk with Sara about your job search"
        : "Hablar con Sara sobre tu búsqueda",
      stopButton: isMa ? "وقف الميكرو" : isEn ? "Stop microphone" : "Parar micrófono",

      latestReply: isMa ? "آخر رد من سارة" : isEn ? "Latest Sara reply" : "Última respuesta de Sara",
      yourVoice: isMa ? "آخر كلام ديالك" : isEn ? "Your latest voice" : "Tu última respuesta por voz",
      listening: isMa ? "سارة كتسمع ليك..." : isEn ? "Sara is listening..." : "Sara te está escuchando ahora...",

      saveTitle: isMa ? "تم حفظ المعلومات" : isEn ? "Data saved" : "Datos guardados",
      saveDesc: isMa ? "سارة غادي تكمل معاك" : isEn ? "Sara can continue now." : "Sara ya puede continuar contigo.",

      missingTitle: isMa ? "معلومات ناقصة" : isEn ? "Missing data" : "Faltan datos",
      missingDesc: isMa
        ? "دخل الاسم والواتساب والإيميل"
        : isEn
        ? "Fill name, WhatsApp and email."
        : "Rellena nombre, WhatsApp y email.",

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
        ? "البحث عن عمل في مالطا"
        : isEn
        ? "Job Search in Malta"
        : "Búsqueda de Empleo en Malta",

      agentSavedMsg: isMa
        ? "مزيان. دابا غادي نبداو نبحثو على خدمة مناسبة ليك في مالطا."
        : isEn
        ? "Perfect. We are already searching for a suitable job for you in Malta."
        : "Perfecto. Ya estamos buscando un empleo adecuado para ti en Malta.",

      stripeErrorTitle: isMa ? "خطأ في الدفع" : isEn ? "Payment error" : "Error Stripe",
      stripeErrorDesc: isMa ? "ما قدرناش نفتحو الدفع" : isEn ? "Could not open payment." : "No se pudo abrir el pago",

      saveErrorTitle: isMa ? "خطأ" : isEn ? "Error" : "Error",
      saveErrorDesc: isMa ? "ما قدرناش نحفظو المعلومات" : isEn ? "Could not save data." : "No se pudo guardar el cliente",

      panelUpdated: isMa ? "تحدث اللوحة" : isEn ? "Panel updated" : "Panel actualizado",
    };
  }, [language]);

  const docsForSelectedTramite = ui.docsByTramite.malta;
  const formsForSelectedTramite = ui.formsByTramite.malta;

  const voiceStorageKey = useMemo(() => {
    const userId = profile?.id || "guest";
    return `gestoriacitaia_malta_voice_${userId}`;
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
    }));
  }, [profile?.full_name]);

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

  // ✅ Validación completa antes del pago - Actualizada con snake_case
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.fullName.trim()) {
      errors.push(isMa ? "الاسم الكامل مطلوب" : isEn ? "Full name is required" : "Nombre completo es requerido");
    }
    
    const whatsappNumber = formData.whatsapp.replace(/\D/g, "");
    if (whatsappNumber.length < 8 || whatsappNumber.length > 15) {
      errors.push(isMa ? "رقم واتساب يجب أن يكون بين 8 و 15 رقم" : isEn ? "WhatsApp must be between 8 and 15 digits" : "WhatsApp debe tener entre 8 y 15 dígitos");
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.push(isMa ? "البريد الإلكتروني غير صحيح" : isEn ? "Invalid email" : "Email inválido");
    }
    
    if (!formData.nationality) {
      errors.push(isMa ? "الجنسية مطلوبة" : isEn ? "Nationality is required" : "Nacionalidad es requerida");
    }
    if (!formData.currentCity) {
      errors.push(isMa ? "المدينة الحالية مطلوبة" : isEn ? "Current city is required" : "Ciudad actual es requerida");
    }
    if (!formData.trabajo_busca.trim()) {
      errors.push(isMa ? "اختر العمل الذي تبحث عنه" : isEn ? "Select the job you are looking for" : "Selecciona el trabajo que buscas");
    }
    if (!formData.experiencia_previa.trim()) {
      errors.push(isMa ? "اختر تجربتك السابقة" : isEn ? "Select your previous experience" : "Selecciona tu experiencia previa");
    }
    if (!acceptTerms) {
      errors.push(isMa ? "خاصك توافق على الشروط" : isEn ? "You must accept the terms" : "Debes aceptar los términos");
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

  // ✅ handlePay - Con detección de admin - Actualizado con snake_case
  const handlePay = async (plan: "weekly" | "monthly") => {
    // 🆕 Llamada a la validación visual
    if (!validateForm()) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isAdmin =
        user?.email?.toLowerCase() === "robertopalacio165@gmail.com";
      
      let photoUrl = "";
      let pdfUrl = "";
      
      // ✅ SUBIR FOTO Y OBTENER URL PÚBLICA
      if (formData.photoFile) {
        const photoPath = `photos/${crypto.randomUUID()}-${formData.photoFile.name}`;

        console.log("📸 SUBIENDO FOTO:");
        console.log("  - photoPath:", photoPath);
        console.log("  - file name:", formData.photoFile.name);
        console.log("  - file size:", formData.photoFile.size);
        console.log("  - file type:", formData.photoFile.type);

        const { data, error } = await supabase.storage
          .from("malta-temp")
          .upload(photoPath, formData.photoFile);

        console.log("📸 RESULTADO SUBIDA FOTO:");
        console.log("  - data:", data);
        console.log("  - error:", error);

        if (error) {
          console.error("❌ Error subiendo foto:", error);
          alert(`Error subiendo foto: ${error.message}`);
          throw error;
        }

        // ✅ OBTENER URL PÚBLICA
        const { data: publicUrlData } = supabase.storage
          .from("malta-temp")
          .getPublicUrl(photoPath);

        photoUrl = publicUrlData.publicUrl;
        console.log("✅ Foto subida correctamente:", photoUrl);
      }
      
      // ✅ SUBIR PDF Y OBTENER URL PÚBLICA
      if (formData.pdfFile) {
        const pdfPath = `pdfs/${crypto.randomUUID()}-${formData.pdfFile.name}`;

        console.log("📄 SUBIENDO PDF:");
        console.log("  - pdfPath:", pdfPath);
        console.log("  - file name:", formData.pdfFile.name);
        console.log("  - file size:", formData.pdfFile.size);
        console.log("  - file type:", formData.pdfFile.type);

        const { data, error } = await supabase.storage
          .from("malta-temp")
          .upload(pdfPath, formData.pdfFile);

        console.log("📄 RESULTADO SUBIDA PDF:");
        console.log("  - data:", data);
        console.log("  - error:", error);

        if (error) {
          console.error("❌ Error subiendo PDF:", error);
          alert(`Error subiendo PDF: ${error.message}`);
          throw error;
        }

        // ✅ OBTENER URL PÚBLICA
        const { data: publicUrlData } = supabase.storage
          .from("malta-temp")
          .getPublicUrl(pdfPath);

        pdfUrl = publicUrlData.publicUrl;
        console.log("✅ PDF subido correctamente:", pdfUrl);
      }
      
      // ✅ Payload actualizado - snake_case
      const payload = {
        plan,

        fullName: formData.fullName,
        whatsapp: formData.whatsapp,
        email: formData.email,

        nationality: formData.nationality,
        currentCity: formData.currentCity,
        fechaNacimiento: formData.fechaNacimiento,

        idiomas: formData.idiomas,
        ingles_nivel: formData.ingles_nivel,
        frances_nivel: formData.frances_nivel,
        italiano_nivel: formData.italiano_nivel,
        espanol_nivel: formData.espanol_nivel,
        arabe_nivel: formData.arabe_nivel,
        aleman_nivel: formData.aleman_nivel,

        trabajo_busca: formData.trabajo_busca,
        experiencia_previa: formData.experiencia_previa,
        anos_experiencia: formData.anos_experiencia,
        education_level: formData.education_level,

        carnetConducir: formData.carnetConducir,

        photoUrl,
        pdfUrl,
        
        willing_to_relocate: "Yes",
      };

      console.log("========== PAYLOAD ==========");
      console.log(JSON.stringify(payload, null, 2));
      console.log("==============================");

      const endpoint = isAdmin
        ? "/api/dev-create-application"
        : "/api/create-checkout-malta";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.url) {
        localStorage.setItem("maltaPaid", "1");
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No se recibió URL de pago");
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

  const handleFormChange = (field: keyof MaltaFormData, value: string | File | null) => {
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
  id="malta-video"
  playsInline
  preload="none"
  poster="/images/malta-poster.png"
  className="w-full h-full object-cover object-top"
>
  <source src="/malta-presentacion.mp4" type="video/mp4" />
</video>
             

             <button
  id="play-button-malta"
  disabled
                  type="button"
                  className="absolute inset-0 flex items-center justify-center"
                  onClick={() => {
                    const video = document.getElementById(
                      "malta-video"
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
                <p className="text-white/70 text-xs drop-shadow-lg">{ui.agentRole}</p>
              </div>
            </div>
          </motion.div>

          <OfficialBrowserBox
            language={language}
            avatarImage={`${import.meta.env.BASE_URL}images/avatar-sara.png`}
            title={ui.pageTitle}
            url="malta.gestoriacitaia.com"
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
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
          />
        </div>

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
