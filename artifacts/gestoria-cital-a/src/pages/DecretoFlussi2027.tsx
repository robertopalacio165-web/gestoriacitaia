import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";

type Category = {
  id: number;
  code: string;
  name_it: string;
  description_it: string | null;
  is_seasonal: boolean;
};

type GenderCode = "male" | "both" | "female";

type PackageCode =
  | "all_offers"
  | "new_10_days";

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 1,
    code: "agriculture",
    name_it: "Agricoltura",
    description_it: null,
    is_seasonal: true,
  },
  {
    id: 2,
    code: "food",
    name_it: "Industria alimentare",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 3,
    code: "textile",
    name_it: "Tessile",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 4,
    code: "metal",
    name_it: "Metalmeccanica",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 5,
    code: "other_industry",
    name_it: "Altre industrie",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 6,
    code: "construction",
    name_it: "Edilizia",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 7,
    code: "commerce",
    name_it: "Commercio",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 8,
    code: "hospitality",
    name_it: "Ristorazione",
    description_it: null,
    is_seasonal: true,
  },
  {
    id: 9,
    code: "tourism",
    name_it: "Turismo",
    description_it: null,
    is_seasonal: true,
  },
  {
    id: 10,
    code: "transport_logistics",
    name_it: "Trasporto e logistica",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 11,
    code: "business_support",
    name_it: "Servizi di supporto",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 12,
    code: "health_social",
    name_it: "Sanità e assistenza sociale",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 13,
    code: "other_services",
    name_it: "Altri servizi",
    description_it: null,
    is_seasonal: false,
  },
  {
    id: 14,
    code: "family_assistance",
    name_it: "Assistenza familiare",
    description_it: null,
    is_seasonal: false,
  },
];

const PACKAGE_TEXT = {
  all_offers: {
    darija: {
      title: "جميع عروض العمل",
      subtitle: "دفع مرة وحدة · جميع العروض",
      features: [
        "جميع العروض المتاحة",
        "جميع المجالات",
        "العروض المفلترة",
        "الإرسال عبر الإيميل",
      ],
    },

    es: {
      title: "Todas las ofertas",
      subtitle: "Pago único · todas las ofertas",
      features: [
        "Todas las ofertas disponibles",
        "Todos los sectores",
        "Ofertas filtradas",
        "Envío por email",
      ],
    },

    en: {
      title: "All job offers",
      subtitle: "One payment · all offers",
      features: [
        "All available offers",
        "All sectors",
        "Filtered offers",
        "Email delivery",
      ],
    },
  },

  new_10_days: {
    darija: {
      title: "عروض جديدة كل 10 أيام",
      subtitle: "3 شهور · 6 إرساليات",
      features: [
        "عروض جديدة كل 10 أيام",
        "المدة 3 شهور",
        "6 إرساليات فالمجموع",
        "الإرسال أوتوماتيكي بالإيميل",
      ],
    },

    es: {
      title: "Nuevas ofertas cada 10 días",
      subtitle: "3 meses · 6 envíos",
      features: [
        "Nuevas ofertas cada 10 días",
        "Duración total de 3 meses",
        "6 envíos en total",
        "Envío automático por email",
      ],
    },

    en: {
      title: "New offers every 10 days",
      subtitle: "3 months · 6 deliveries",
      features: [
        "New offers every 10 days",
        "Total duration: 3 months",
        "6 deliveries in total",
        "Automatic email delivery",
      ],
    },
  },
};

const PACKAGE_INFO = [
  {
    code: "all_offers" as PackageCode,
price: "14,99€",
  },

  {
    code: "new_10_days" as PackageCode,
    price: "24,99€",
  },
];

function PaymentLogos() {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">

      <div className="h-8 min-w-[48px] px-2 rounded-lg bg-white flex items-center justify-center shadow-md">
        <span className="text-[#1434CB] font-black italic text-[12px]">
          VISA
        </span>
      </div>

      <div className="h-8 min-w-[62px] px-2 rounded-lg bg-white flex items-center justify-center shadow-md">

        <div className="flex items-center mr-1">

          <span className="w-4 h-4 rounded-full bg-[#EB001B] -mr-1" />

          <span className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90" />

        </div>

        <span className="text-[#222] text-[7px] font-bold">
          Mastercard
        </span>

      </div>

      <div className="h-8 min-w-[58px] px-2 rounded-lg bg-white flex items-center justify-center shadow-md">

        <span className="text-[#003087] font-black text-[10px]">
          PayPal
        </span>

      </div>

      <div className="h-8 min-w-[55px] px-2 rounded-lg bg-white flex items-center justify-center shadow-md">

        <span className="text-[#635BFF] font-black text-[10px]">
          stripe
        </span>

      </div>

    </div>
  );
}

export default function DecretoFlussi2027() {

  const { lang } = useLang();

  const { toast } = useToast();

  const rawLanguage =
    String(lang || "")
      .toLowerCase()
      .trim();

  const language =
    rawLanguage === "darija" ||
    rawLanguage === "ma" ||
    rawLanguage === "ar" ||
    rawLanguage === "arabic" ||
    rawLanguage === "maroc"
      ? "darija"
      : rawLanguage === "en" ||
          rawLanguage === "english"
        ? "en"
        : "es";

  const isMa =
    language === "darija";

  const isEn =
    language === "en";

  const ui = {

    pageTitle: isMa
      ? "ديكريتو فلوسي 2027"
      : isEn
        ? "Decreto Flussi 2027"
        : "Decreto Flussi 2027",

    subtitle: isMa
      ? "عروض العمل فإيطاليا"
      : isEn
        ? "Job offers in Italy"
        : "Ofertas de trabajo en Italia",

    name: isMa
      ? "الاسم"
      : isEn
        ? "First name"
        : "Nombre",

    lastName: isMa
      ? "النسب"
      : isEn
        ? "Last name"
        : "Apellido",

    email: isMa
      ? "الإيميل"
      : isEn
        ? "Email address"
        : "Correo electrónico",

    phone: isMa
      ? "رقم الهاتف / واتساب"
      : isEn
        ? "Phone number / WhatsApp"
        : "Número de teléfono / WhatsApp",

    gender: isMa
      ? "الجنس"
      : isEn
        ? "Gender"
        : "Género",

    male: isMa
      ? "رجال"
      : isEn
        ? "Men"
        : "Hombres",

    both: isMa
      ? "بجوج"
      : isEn
        ? "Both"
        : "Ambos",

    female: isMa
      ? "نساء"
      : isEn
        ? "Women"
        : "Mujeres",

    packages: isMa
      ? "اختار الباقة ديالك"
      : isEn
        ? "Choose your package"
        : "Elige tu paquete",

    promo: isMa
      ? "عرض الشهر"
      : isEn
        ? "SPECIAL OFFER"
        : "PROMOCIÓN",

    terms: isMa
      ? "كنأكد أنني قريت وفهمت شروط الخدمة وسياسة الخصوصية، وكنوافق على معالجة المعطيات الشخصية اللي قدمت باش يتدبر الطلب ديالي ويتصيفطو ليا عروض العمل حسب الاختيارات ديالي. الخدمة ما كتضمنش الحصول على عقد عمل، التوظيف أو الدخول لإيطاليا."
      : isEn
        ? "I confirm that I have read and understood the Terms of Service and Privacy Policy, and I agree to the processing of the personal data I provide to manage my request and send me relevant job offers. The service does not guarantee employment, a job contract or entry into Italy."
        : "Confirmo que he leído y comprendido los Términos del Servicio y la Política de Privacidad, y acepto el tratamiento de los datos personales que facilito para gestionar mi solicitud y enviarme ofertas de trabajo relevantes. El servicio no garantiza la obtención de empleo, contrato de trabajo ni la entrada en Italia.",

    pay: isMa
      ? "كمل للأداء"
      : isEn
        ? "Continue to payment"
        : "Continuar al pago",

    secure: isMa
      ? "الأداء آمن عبر Stripe · Visa · Mastercard · PayPal"
      : isEn
        ? "Secure payment via Stripe · Visa · Mastercard · PayPal"
        : "Pago seguro mediante Stripe · Visa · Mastercard · PayPal",

    legalTitle: isMa
      ? "معلومات مهمة حول الخدمة"
      : isEn
        ? "Important service information"
        : "Información importante sobre el servicio",

    legalBody: isMa
      ? "GestoriaCitaIA كتقدم خدمة معلوماتية والبحث وإرسال عروض العمل المتاحة ضمن Decreto Flussi. ما كنبيعوش عقود العمل وما كنضمنوش التوظيف أو العقد أو الدخول لإيطاليا."
      : isEn
        ? "GestoriaCitaIA provides an information, search and delivery service for available job offers within Decreto Flussi. We do not sell employment contracts and do not guarantee employment, a contract or entry into Italy."
        : "GestoriaCitaIA ofrece un servicio informativo de búsqueda y envío de ofertas de trabajo disponibles dentro del Decreto Flussi. No vendemos contratos de trabajo y no garantizamos empleo, contrato ni entrada en Italia.",

    paymentError: isMa
      ? "وقع مشكل فالأداء"
      : isEn
        ? "Payment error"
        : "Error en el pago",

    paymentConnecting: isMa
      ? "جاري تحويلك للأداء..."
      : isEn
        ? "Connecting to payment..."
        : "Conectando con el pago...",

    missingName: isMa
      ? "دخل الاسم والنسب"
      : isEn
        ? "Enter your first and last name"
        : "Introduce nombre y apellido",

    missingEmail: isMa
      ? "دخل إيميل صحيح"
      : isEn
        ? "Enter a valid email"
        : "Introduce un correo válido",

    missingPhone: isMa
      ? "دخل رقم هاتف صحيح"
      : isEn
        ? "Enter a valid phone number"
        : "Introduce un teléfono válido",

    termsRequired: isMa
      ? "وافق على الشروط قبل الأداء"
      : isEn
        ? "Accept the terms before payment"
        : "Acepta los términos antes de pagar",
  };

const [gender, setGender] =
  useState<GenderCode>("both");

const [submitting, setSubmitting] =
  useState(false);

const [form, setForm] =
  useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [selectedPackage, setSelectedPackage] =
    useState<PackageCode>(
      "all_offers",
    );

  const [acceptTerms, setAcceptTerms] =
    useState(false);
const [paymentSuccess, setPaymentSuccess] =
  useState(false);

useEffect(() => {
  const params = new URLSearchParams(
    window.location.search,
  );

  setPaymentSuccess(
    params.get("payment") === "success",
  );
}, []);
 

  const selectedPackageInfo =
    useMemo(
      () =>
        PACKAGE_INFO.find(
          (item) =>
            item.code ===
            selectedPackage,
        )!,
      [selectedPackage],
    );

  const updateField = (
    field: keyof typeof form,
    value: string,
  ) => {

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

  };

  /*
  ============================================================
  VALIDACIÓN + STRIPE
  ============================================================
  */

  const handlePay = async () => {

    if (!form.firstName.trim()) {

      toast({
        title:
          ui.missingName,
        variant:
          "destructive",
      });

      document
        .getElementById(
          "firstName-field",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      document
        .getElementById(
          "firstName-field",
        )
        ?.focus();

      return;
    }

    if (!form.lastName.trim()) {

      toast({
        title:
          ui.missingName,
        variant:
          "destructive",
      });

      document
        .getElementById(
          "lastName-field",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      document
        .getElementById(
          "lastName-field",
        )
        ?.focus();

      return;
    }

    if (
      !/^\S+@\S+\.\S+$/.test(
        form.email.trim(),
      )
    ) {

      toast({
        title:
          ui.missingEmail,
        variant:
          "destructive",
      });

      document
        .getElementById(
          "email-field",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      document
        .getElementById(
          "email-field",
        )
        ?.focus();

      return;
    }

    const phoneDigits =
      form.phone.replace(
        /\D/g,
        "",
      );

    if (
      phoneDigits.length < 8 ||
      phoneDigits.length > 15
    ) {

      toast({
        title:
          ui.missingPhone,
        variant:
          "destructive",
      });

      document
        .getElementById(
          "phone-field",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      document
        .getElementById(
          "phone-field",
        )
        ?.focus();

      return;
    }

    if (!acceptTerms) {

      toast({
        title:
          ui.termsRequired,
        variant:
          "destructive",
      });

      document
        .getElementById(
          "terms-field",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    setSubmitting(true);

    try {

      /*
      ========================================================
      ENDPOINT CORRECTO
      ========================================================
      */

      const response =
        await fetch(
          "/api/create-checkout-flussi-lavoro",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                firstName:
                  form.firstName.trim(),

                lastName:
                  form.lastName.trim(),

                email:
                  form.email
                    .trim()
                    .toLowerCase(),

                phone:
                  form.phone.trim(),

                gender,

                packageCode:
                  selectedPackage,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.url
      ) {

        throw new Error(
          data.error ||
            ui.paymentError,
        );

      }

      /*
      ========================================================
      REDIRECT STRIPE
      ========================================================
      */

      window.location.href =
        data.url;

    } catch (
      error: any
    ) {

      console.error(
        "Flussi checkout error:",
        error,
      );

      toast({
        title:
          ui.paymentError,

        description:
          error?.message ||
          ui.paymentError,

        variant:
          "destructive",
      });

      setSubmitting(false);
    }
  };

  return (

    <div
      className="min-h-screen bg-background text-foreground relative flex flex-col"
      dir={
        isMa
          ? "rtl"
          : "ltr"
      }
    >

      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,128,0,0.10), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(206,43,55,0.08), transparent)",
        }}
      />

      <Navbar />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-8">

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full">

          {/* =================================================
              FOTO
          ================================================= */}

          <motion.div
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3"
          >

            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_30px_-5px_rgba(255,255,255,0.12)] bg-black">

              <div
                className="relative w-full"
                style={{
                  height:
                    "280px",
                }}
              >

                <img
                  src="/images/decreto-flussi-2027.png"
                  alt={
                    ui.subtitle
                  }
                  className="w-full h-full object-cover object-top"
                />

                <div className="absolute top-4 left-4 flex h-8 overflow-hidden rounded-md shadow-lg">

                  <span className="w-3 bg-[#009246]" />

                  <span className="w-3 bg-white" />

                  <span className="w-3 bg-[#CE2B37]" />

                </div>

              </div>

            </div>

          </motion.div>




{/* =================================================
    PAGO REALIZADO
================================================= */}

{paymentSuccess && (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="w-full mt-4"
  >
    <div className="max-w-3xl mx-auto rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-r from-[#101a28] via-[#0b1724] to-[#101a28] p-5 text-center shadow-[0_0_30px_rgba(212,175,55,0.12)]">

      {isMa ? (
        <div dir="rtl">
          <div className="text-4xl mb-2">🎉</div>

          <h2 className="text-white text-xl font-black">
            تم الأداء بنجاح!
          </h2>

          <p className="text-[#F5D76E] text-base font-bold mt-2">
            مبروك! الخدمة ديالك تفعّلات.
          </p>

          <p className="text-white/75 text-sm mt-2 leading-7">
            فأقل من 24 ساعة غادي توصلك عروض العمل الجديدة
            مباشرة فالإيميل ديالك.
          </p>

          <p className="text-white/40 text-xs mt-2">
            تأكد من الإيميل ديالك وحتى مجلد Spam.
          </p>
        </div>

      ) : isEn ? (
        <div>
          <div className="text-4xl mb-2">🎉</div>

          <h2 className="text-white text-xl font-black">
            Payment completed successfully!
          </h2>

          <p className="text-[#F5D76E] text-base font-bold mt-2">
            Congratulations! Your service is now active.
          </p>

          <p className="text-white/75 text-sm mt-2 leading-7">
            Within 24 hours, we will send you the new job
            offers directly by email.
          </p>

          <p className="text-white/40 text-xs mt-2">
            Please also check your spam folder.
          </p>
        </div>

      ) : (
        <div>
          <div className="text-4xl mb-2">🎉</div>

          <h2 className="text-white text-xl font-black">
            ¡Pago realizado correctamente!
          </h2>

          <p className="text-[#F5D76E] text-base font-bold mt-2">
            ¡Felicidades! Tu servicio está activado.
          </p>

          <p className="text-white/75 text-sm mt-2 leading-7">
            En menos de 24 horas te enviaremos las nuevas
            ofertas de trabajo directamente por email.
          </p>

          <p className="text-white/40 text-xs mt-2">
            Revisa también tu carpeta de spam.
          </p>
        </div>
      )}

    </div>
  </motion.div>
)}


{/* =================================================
    FORMULARIO
================================================= */}
          {/* =================================================
              FORMULARIO
          ================================================= */}
{!paymentSuccess && (
          <motion.section
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            className="flex-1 rounded-[24px] border-2 border-white/20 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-4 sm:px-6 py-5 shadow-[0_0_35px_rgba(0,0,0,0.25)]"
          >

            <div className="mb-5 text-center">

              <div className="inline-flex h-7 overflow-hidden rounded-md">

                <span className="w-2.5 bg-[#009246]" />

                <span className="w-2.5 bg-white" />

                <span className="w-2.5 bg-[#CE2B37]" />

              </div>

              <h2 className="mt-2 text-white text-[20px] sm:text-[24px] font-black">

                {ui.pageTitle}

              </h2>

              <p className="text-white/60 text-[12px]">

                {ui.subtitle}

              </p>

            </div>


            {/* =================================================
                DATOS
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">

              <label>

                <span className="block text-white text-[13px] mb-2">
                  {ui.name}
                </span>

                <div className="relative">

                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />

                  <input
                    id="firstName-field"
                    type="text"
                    value={
                      form.firstName
                    }
                    onChange={(e) =>
                      updateField(
                        "firstName",
                        e.target.value,
                      )
                    }
                    placeholder={
                      isMa
                        ? "دخل سميتك"
                        : isEn
                          ? "Your first name"
                          : "Tu nombre"
                    }
                    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]"
                  />

                </div>

              </label>


              <label>

                <span className="block text-white text-[13px] mb-2">
                  {ui.lastName}
                </span>

                <div className="relative">

                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />

                  <input
                    id="lastName-field"
                    type="text"
                    value={
                      form.lastName
                    }
                    onChange={(e) =>
                      updateField(
                        "lastName",
                        e.target.value,
                      )
                    }
                    placeholder={
                      isMa
                        ? "دخل النسب"
                        : isEn
                          ? "Your last name"
                          : "Tu apellido"
                    }
                    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]"
                  />

                </div>

              </label>


              <label className="md:col-span-2">

                <span className="block text-white text-[13px] mb-2">
                  {ui.email}
                </span>

                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />

                  <input
                    id="email-field"
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(e) =>
                      updateField(
                        "email",
                        e.target.value,
                      )
                    }
                    placeholder="nome@gmail.com"
                    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]"
                  />

                </div>

              </label>


              <label className="md:col-span-2">

                <span className="block text-white text-[13px] mb-2">
                  {ui.phone}
                </span>

                <div className="relative">

                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />

                  <input
                    id="phone-field"
                    type="tel"
                    value={
                      form.phone
                    }
                    onChange={(e) =>
                      updateField(
                        "phone",
                        e.target.value,
                      )
                    }
                    placeholder="+212 6 00 00 00 00"
                    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]"
                  />

                </div>

              </label>

            </div>


            {/* =================================================
                HOMBRES / AMBOS / MUJERES
            ================================================= */}

            <div className="mb-5">

              <p className="text-white text-[13px] mb-2">
                {ui.gender}
              </p>

              <div className="grid grid-cols-3 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setGender(
                      "male",
                    )
                  }
                  className={`min-h-[82px] rounded-xl border p-2 text-center transition-all ${
                    gender ===
                    "male"
                      ? "border-[#009246] bg-[#009246]/10 shadow-[0_0_18px_rgba(0,146,70,0.18)]"
                      : "border-white/10 bg-[#060b16] hover:border-white/25"
                  }`}
                >

                  <div className="text-[28px] leading-none">
                    👨
                  </div>

                  <span className="block text-white text-[10px] sm:text-[12px] font-bold mt-2">
                    {ui.male}
                  </span>

                  {gender ===
                    "male" && (
                    <span className="block text-[#00d878] text-[10px] mt-1">
                      ✓
                    </span>
                  )}

                </button>


                <button
                  type="button"
                  onClick={() =>
                    setGender(
                      "both",
                    )
                  }
                  className={`min-h-[82px] rounded-xl border p-2 text-center transition-all ${
                    gender ===
                    "both"
                      ? "border-[#009246] bg-[#009246]/10 shadow-[0_0_18px_rgba(0,146,70,0.18)]"
                      : "border-white/10 bg-[#060b16] hover:border-white/25"
                  }`}
                >

                  <div className="text-[28px] leading-none">
                    👥
                  </div>

                  <span className="block text-white text-[10px] sm:text-[12px] font-bold mt-2">
                    {ui.both}
                  </span>

                  {gender ===
                    "both" && (
                    <span className="block text-[#00d878] text-[10px] mt-1">
                      ✓
                    </span>
                  )}

                </button>


                <button
                  type="button"
                  onClick={() =>
                    setGender(
                      "female",
                    )
                  }
                  className={`min-h-[82px] rounded-xl border p-2 text-center transition-all ${
                    gender ===
                    "female"
                      ? "border-[#009246] bg-[#009246]/10 shadow-[0_0_18px_rgba(0,146,70,0.18)]"
                      : "border-white/10 bg-[#060b16] hover:border-white/25"
                  }`}
                >

                  <div className="text-[28px] leading-none">
                    👩
                  </div>

                  <span className="block text-white text-[10px] sm:text-[12px] font-bold mt-2">
                    {ui.female}
                  </span>

                  {gender ===
                    "female" && (
                    <span className="block text-[#ff6b9a] text-[10px] mt-1">
                      ✓
                    </span>
                  )}

                </button>

              </div>

            </div>


            {/* =================================================
                PLANES
            ================================================= */}

            <div className="mb-5">

              <p className="text-white text-[13px] mb-2">
                {ui.packages}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {PACKAGE_INFO.map(
                  (pkg) => {

                    const selected =
                      selectedPackage ===
                      pkg.code;

                    const localized =
                      PACKAGE_TEXT[
                        pkg.code
                      ][language];

                    const promo =
                      pkg.code ===
                      "new_10_days";

                    return (

                      <button
                        key={
                          pkg.code
                        }
                        type="button"
                        onClick={() =>
                          setSelectedPackage(
                            pkg.code,
                          )
                        }
                        className={`relative text-left rounded-[18px] border-2 overflow-hidden p-3 transition-all ${
                          promo
                            ? selected
                              ? "border-[#D4AF37] bg-gradient-to-b from-[#241d00] to-[#090804] shadow-[0_0_30px_rgba(245,215,110,0.20)]"
                              : "border-[#8f741d] bg-gradient-to-b from-[#171303] to-[#070706]"
                            : selected
                              ? "border-[#009246] bg-[#07120c] shadow-[0_0_24px_rgba(0,146,70,0.12)]"
                              : "border-white/10 bg-[#060b16]"
                        }`}
                      >

                        {promo && (

                          <div className="absolute top-0 left-0 right-0 h-[26px] bg-gradient-to-r from-[#8B6914] via-[#F5D76E] to-[#8B6914] flex items-center justify-center gap-1">

                            <span className="text-[#241900] text-[11px]">
                              ⭐
                            </span>

                            <span className="text-[9px] font-black text-[#211800] uppercase">
                              {ui.promo}
                            </span>

                            <span className="text-[#241900] text-[11px]">
                              ⭐
                            </span>

                          </div>

                        )}

                        <div
                          className={
                            promo
                              ? "pt-6"
                              : ""
                          }
                        >

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0">

                              <p className="text-white text-[13px] font-bold leading-tight">
                                {
                                  localized.title
                                }
                              </p>

                              <p className="text-white/45 text-[9px] mt-1">
                                {
                                  localized.subtitle
                                }
                              </p>

                            </div>

                            <p
                              className={`text-[21px] font-black leading-none whitespace-nowrap ${
                                promo
                                  ? "text-[#F5D76E]"
                                  : "text-[#00d878]"
                              }`}
                            >
                              {
                                pkg.price
                              }
                            </p>

                          </div>

                          <ul className="mt-2 space-y-0.5 text-white/60 text-[9px] leading-relaxed">

                            {localized.features.map(
                              (
                                feature,
                              ) => (

                                <li
                                  key={
                                    feature
                                  }
                                  className="flex gap-1.5"
                                >

                                  <span
                                    className={
                                      promo
                                        ? "text-[#F5D76E]"
                                        : "text-[#00d878]"
                                    }
                                  >
                                    ✓
                                  </span>

                                  <span>
                                    {
                                      feature
                                    }
                                  </span>

                                </li>

                              ),
                            )}

                          </ul>

                          {promo && (

                            <div className="mt-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-1.5 text-center">

                              <span className="text-[#F5D76E] text-[8px] font-bold">

                                ⭐{" "}

                                {isMa
                                  ? "عرض خاص لمدة 3 شهور"
                                  : isEn
                                    ? "Special 3-month promotion"
                                    : "Promoción especial de 3 meses"}

                                {" "}⭐

                              </span>

                            </div>

                          )}

                        </div>

                      </button>

                    );

                  },
                )}

              </div>

            </div>


            {/* =================================================
                INFORMACIÓN LEGAL
            ================================================= */}

            <div className="mb-4 rounded-2xl border border-white/10 bg-[#060b16] p-4">

              <p className="text-white text-[11px] font-bold mb-2">
                {
                  ui.legalTitle
                }
              </p>

              <p className="text-white/50 text-[9px] leading-relaxed">
                {
                  ui.legalBody
                }
              </p>

            </div>


            {/* =================================================
                TÉRMINOS
            ================================================= */}

            <label
              id="terms-field"
              className={`flex items-start gap-3 mb-4 rounded-2xl border p-3 cursor-pointer transition ${
                acceptTerms
                  ? "border-[#009246]/60 bg-[#009246]/5"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >

              <input
                type="checkbox"
                checked={
                  acceptTerms
                }
                onChange={(e) =>
                  setAcceptTerms(
                    e.target.checked,
                  )
                }
                className="mt-1 w-4 h-4 accent-[#009246] shrink-0"
              />

              <span className="text-white/70 text-[10px] leading-relaxed">
                {ui.terms}
              </span>

            </label>


            {/* =================================================
                PAGO
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-[#060b16] p-3">

              <PaymentLogos />

              <p className="text-center text-white/35 text-[8px] mt-2 mb-3">
                {ui.secure}
              </p>

              <button
                type="button"
                onClick={
                  handlePay
                }
                disabled={
                  submitting ||
                  !acceptTerms
                }
                className={`w-full h-[54px] rounded-2xl transition-all ${
                  acceptTerms
                    ? "bg-gradient-to-r from-[#009246] via-[#00d878] to-[#009246] text-black shadow-[0_0_25px_rgba(0,216,120,0.20)]"
                    : "bg-[#161616] border border-white/10 text-white/30 cursor-not-allowed"
                }`}
              >

                <span className="flex h-full w-full items-center justify-center gap-2 font-black text-[12px]">

                  {submitting ? (

                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />

                      {
                        ui.paymentConnecting
                      }
                    </>

                  ) : (

                    <>
                      <CreditCard className="w-5 h-5" />

                      {ui.pay}

                      {" · "}

                      {
                        selectedPackageInfo.price
                      }
                    </>

                  )}

                </span>

              </button>

            </div>

          </motion.section>
)}
        </div>

      </main>

    </div>
  );
}
