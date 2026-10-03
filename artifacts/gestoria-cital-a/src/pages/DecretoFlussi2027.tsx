import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Mail, Phone, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";

type PackageCode = "all_offers" | "new_10_days";

const PACKAGE_TEXT = {
  all_offers: {
    darija: {
      title: "جميع عروض العمل",
      subtitle: "أداء واحد · وصول مباشر",
      features: [
        "جميع العروض المتاحة",
        "جميع المجالات",
        "العروض المفلترة",
        "الإرسال عبر الإيميل",
      ],
    },
    es: {
      title: "Todas las ofertas",
      subtitle: "Pago único · acceso inmediato",
      features: [
        "Todas las ofertas disponibles",
        "Todos los sectores",
        "Ofertas filtradas",
        "Envío por email",
      ],
    },
    en: {
      title: "All job offers",
      subtitle: "One payment · immediate access",
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
        "6 إرساليات إجمالاً",
        "إرسال أوتوماتيكي بالإيميل",
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

export default function DecretoFlussi2027() {
  const { lang } = useLang();
  const { toast } = useToast();

  const language =
    lang === "darija"
      ? "darija"
      : lang === "en"
        ? "en"
        : "es";

  const isMa = language === "darija";
  const isEn = language === "en";

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
      ? "رجل"
      : isEn
        ? "Male"
        : "Hombre",

    both: isMa
      ? "بجوج"
      : isEn
        ? "Both"
        : "Ambos",

    female: isMa
      ? "مرا"
      : isEn
        ? "Female"
        : "Mujer",

    packages: isMa
      ? "اختار الباكيج ديالك"
      : isEn
        ? "Choose your package"
        : "Elige tu paquete",

    promo: isMa
      ? "عرض خاص"
      : isEn
        ? "SPECIAL OFFER"
        : "PROMOCIÓN",

    terms: isMa
      ? "كنأكد أنني قريت وفهمت شروط الخدمة وسياسة الخصوصية، وكنوافق على معالجة المعطيات الشخصية اللي قدمت باش يتدبر الطلب ديالي ويتصيفطو ليا عروض العمل حسب الاختيارات ديالي. الخدمة ما كتضمنش الحصول على عقد عمل، التوظيف أو الدخول لإيطاليا."
      : isEn
        ? "I confirm that I have read and understood the Terms of Service and Privacy Policy, and I agree to the processing of the personal data I provide to manage my request and send me relevant job offers. The service does not guarantee employment, a job contract or entry into Italy."
        : "Confirmo que he leído y comprendido los Términos del Servicio y la Política de Privacidad, y acepto el tratamiento de los datos personales que facilito para gestionar mi solicitud y enviarme ofertas de trabajo relevantes. El servicio no garantiza la obtención de empleo, contrato de trabajo ni la entrada en Italia.",

    pay: isMa
      ? "الأداء غادي يتفعل قريباً"
      : isEn
        ? "Payment will be enabled soon"
        : "Pago próximamente",

    secure: isMa
      ? "الأداء الآمن عبر Stripe · Visa · Mastercard · PayPal"
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
  };

  const [gender, setGender] = useState<
    "male" | "both" | "female"
  >("both");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [selectedPackage, setSelectedPackage] =
    useState<PackageCode>("all_offers");

  const [acceptTerms, setAcceptTerms] =
    useState(false);

  const selectedPackageInfo = useMemo(
    () =>
      PACKAGE_INFO.find(
        (item) => item.code === selectedPackage,
      )!,
    [selectedPackage],
  );

  const updateField = (
    field: keyof typeof form,
    value: string,
  ) =>
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

  const validate = () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      toast({
        title: "Dati mancanti",
        description:
          "Inserisci nome e cognome.",
        variant: "destructive",
      });

      return false;
    }

    if (
      !/^\S+@\S+\.\S+$/.test(
        form.email.trim(),
      )
    ) {
      toast({
        title: "Email non valida",
        description:
          "Inserisci un indirizzo email valido.",
        variant: "destructive",
      });

      return false;
    }

    const digits =
      form.phone.replace(/\D/g, "");

    if (
      digits.length < 8 ||
      digits.length > 15
    ) {
      toast({
        title: "Numero non valido",
        description:
          "Inserisci un numero di telefono valido.",
        variant: "destructive",
      });

      return false;
    }

    if (!acceptTerms) {
      toast({
        title: "Accettazione richiesta",
        description:
          "Devi accettare i termini del servizio.",
        variant: "destructive",
      });

      return false;
    }

    return true;
  };

  /*
   * PAGAMENTO DISATTIVATO DURANTE LA FASE DI PROVA.
   *
   * NON avvia Stripe.
   */
  const handlePay = async () => {
    return;
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground relative flex flex-col"
      dir={isMa ? "rtl" : "ltr"}
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

        <h1 className="text-xl sm:text-2xl font-display font-bold px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full">
          {ui.pageTitle}
        </h1>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full">

          {/* =====================================================
              LEFT IMAGE
          ====================================================== */}

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
                className="relative w-full h-full"
                style={{
                  height: "280px",
                }}
              >

                <img
                  src="/images/decreto-flussi-2027.png"
                  alt="Decreto Flussi 2027"
                  className="w-full h-full object-cover object-top"
                />

                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent" />

                <div className="absolute top-4 left-4 flex h-8 overflow-hidden rounded-md shadow-lg">
                  <span className="w-3 bg-[#009246]" />
                  <span className="w-3 bg-white" />
                  <span className="w-3 bg-[#CE2B37]" />
                </div>

                <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 via-black/45 to-transparent">

                  <p className="text-white/70 text-xs uppercase tracking-[0.18em]">
                    {ui.subtitle}
                  </p>

                  <h2 className="text-white text-2xl sm:text-3xl font-black">
                    DECRETO FLUSSI 2027
                  </h2>

                </div>
              </div>
            </div>
          </motion.div>

          {/* =====================================================
              MAIN FORM
          ====================================================== */}

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

            {/* HEADER */}

            <div className="mb-5 text-center">

              <div className="inline-flex h-7 overflow-hidden rounded-md shadow-[0_0_15px_rgba(255,255,255,0.12)]">
                <span className="w-2.5 bg-[#009246]" />
                <span className="w-2.5 bg-white" />
                <span className="w-2.5 bg-[#CE2B37]" />
              </div>

              <h2 className="mt-2 text-white text-[20px] sm:text-[24px] font-black">
                DECRETO FLUSSI 2027
              </h2>

              <p className="text-white/60 text-[12px]">
                {ui.subtitle}
              </p>

            </div>

            {/* =================================================
                PERSONAL DATA
            ================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">

              {[
                [
                  "firstName",
                  ui.name,
                  isMa
                    ? "دخل سميتك"
                    : isEn
                      ? "Your first name"
                      : "Tu nombre",
                  User,
                ],

                [
                  "lastName",
                  ui.lastName,
                  isMa
                    ? "دخل النسب ديالك"
                    : isEn
                      ? "Your last name"
                      : "Tu apellido",
                  User,
                ],

                [
                  "email",
                  ui.email,
                  "nome@gmail.com",
                  Mail,
                ],

                [
                  "phone",
                  ui.phone,
                  "+212 6 00 00 00 00",
                  Phone,
                ],
              ].map(
                ([
                  field,
                  label,
                  placeholder,
                  Icon,
                ]) => (
                  <label
                    key={field as string}
                    className={`block ${
                      field === "email" ||
                      field === "phone"
                        ? "md:col-span-2"
                        : ""
                    }`}
                  >

                    <span className="block text-white text-[13px] mb-2">
                      {label as string}
                    </span>

                    <div className="relative">

                      <Icon
                        className={`absolute ${
                          isMa
                            ? "right-4"
                            : "left-4"
                        } top-1/2 -translate-y-1/2 w-4 h-4 text-white/35`}
                      />

                      <input
                        type={
                          field === "email"
                            ? "email"
                            : field === "phone"
                              ? "tel"
                              : "text"
                        }
                        value={
                          form[
                            field as keyof typeof form
                          ]
                        }
                        onChange={(e) =>
                          updateField(
                            field as keyof typeof form,
                            e.target.value,
                          )
                        }
                        placeholder={
                          placeholder as string
                        }
                        className={`w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] ${
                          isMa
                            ? "pr-11 pl-4"
                            : "pl-11 pr-4"
                        } text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]`}
                      />

                    </div>
                  </label>
                ),
              )}

            </div>

            {/* =================================================
                GENDER
                SOLO 3 CAMPOS
            ================================================== */}

            <div className="mb-5">

              <p className="text-white text-[13px] mb-2">
                {ui.gender}
              </p>

              <div className="grid grid-cols-3 gap-2">

                {[
                  ["male", ui.male],
                  ["both", ui.both],
                  ["female", ui.female],
                ].map(
                  ([value, label]) => (

                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setGender(
                          value as
                            | "male"
                            | "both"
                            | "female",
                        )
                      }
                      className={`min-h-[72px] rounded-xl border p-2 text-center transition ${
                        gender === value
                          ? "border-[#009246] bg-[#009246]/10 shadow-[0_0_14px_rgba(0,146,70,0.12)]"
                          : "border-white/10 bg-[#060b16] hover:border-white/25"
                      }`}
                    >

                      <span className="block text-white text-[12px] font-bold">
                        {label}
                      </span>

                      <span className="block text-white/40 text-[9px] mt-1">

                        {value === "male"
                          ? "♂"
                          : value === "female"
                            ? "♀"
                            : "♂ + ♀"}

                      </span>

                      {gender === value && (
                        <span className="block text-[#009246] text-[10px] mt-1">
                          ✓
                        </span>
                      )}

                    </button>

                  ),
                )}

              </div>

            </div>

            {/* =================================================
                PACKAGES
                ONLY TWO
            ================================================== */}

            <div className="mb-5">

              <p className="text-white text-[13px] mb-2">
                {ui.packages}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {PACKAGE_INFO.map((pkg) => {

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
                      key={pkg.code}
                      type="button"
                      onClick={() =>
                        setSelectedPackage(
                          pkg.code,
                        )
                      }
                      className={`relative rounded-[18px] border-2 transition-all overflow-hidden text-left p-4 ${
                        promo
                          ? selected
                            ? "border-[#D4AF37] bg-gradient-to-b from-[#211900] to-[#090804] shadow-[0_0_24px_rgba(212,175,55,0.16)]"
                            : "border-[#8f741d] bg-gradient-to-b from-[#171303] to-[#070706] hover:border-[#D4AF37]"
                          : selected
                            ? "border-[#009246] bg-gradient-to-b from-[#0b160f] to-[#050505] shadow-[0_0_24px_rgba(0,146,70,0.14)]"
                            : "border-white/10 bg-[#060b16] hover:border-[#009246]/50"
                      }`}
                    >

                      {/* PROMO BADGE */}

                      {promo && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px rounded-b-lg bg-[#F5D76E] px-3 py-1 text-[9px] font-black text-[#181205] whitespace-nowrap">

                          ⭐ {ui.promo} ⭐

                        </span>
                      )}

                      {/* PLAN HEADER */}

                      <div
                        className={`${
                          promo
                            ? "pt-3"
                            : ""
                        } flex items-start justify-between gap-3`}
                      >

                        <div className="min-w-0">

                          <p className="text-white text-[14px] font-bold leading-tight">
                            {localized.title}
                          </p>

                          <p className="text-white/45 text-[10px] mt-1">
                            {localized.subtitle}
                          </p>

                        </div>

                        <p
                          className={`${
                            promo
                              ? "text-[#F5D76E]"
                              : "text-[#00d878]"
                          } text-[23px] font-black leading-none whitespace-nowrap`}
                        >
                          {pkg.price}
                        </p>

                      </div>

                      {/* FEATURES */}

                      <ul className="mt-3 space-y-1 text-white/65 text-[10px] leading-relaxed">

                        {localized.features.map(
                          (feature) => (
                            <li key={feature}>
                              ✓ {feature}
                            </li>
                          ),
                        )}

                      </ul>

                      {/* SPECIAL BOTTOM BOX */}

                      <div
                        className={`mt-3 rounded-xl px-3 py-2 text-[9px] ${
                          promo
                            ? "bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#F5D76E]"
                            : "bg-[#009246]/5 border border-[#009246]/20 text-white/55"
                        }`}
                      >

                        {promo
                          ? isMa
                            ? "عرض ترويجي · 3 شهور · 6 إرساليات"
                            : isEn
                              ? "Special promotion · 3 months · 6 deliveries"
                              : "Promoción especial · 3 meses · 6 envíos"
                          : isMa
                            ? "جميع العروض المتاحة · إرسال مباشر"
                            : isEn
                              ? "All available offers · direct delivery"
                              : "Todas las ofertas disponibles · envío directo"}

                      </div>

                    </button>
                  );
                })}

              </div>

            </div>

            {/* =================================================
                LEGAL INFORMATION
            ================================================== */}

            <div className="mb-4 rounded-2xl border border-white/10 bg-[#060b16] p-4">

              <p className="text-white text-[11px] font-bold mb-2">
                {ui.legalTitle}
              </p>

              <p className="text-white/50 text-[9px] leading-relaxed">
                {ui.legalBody}
              </p>

            </div>

            {/* =================================================
                TERMS
            ================================================== */}

            <label
              className={`flex items-start gap-3 mb-4 rounded-2xl border p-3 cursor-pointer transition ${
                acceptTerms
                  ? "border-[#009246]/60 bg-[#009246]/5"
                  : "border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40"
              }`}
            >

              <input
                type="checkbox"
                checked={acceptTerms}
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
                PAYMENT
                DISABLED FOR TESTING
            ================================================== */}

            <div className="mt-1 rounded-2xl border border-white/10 bg-[#060b16] p-3">

              {/* PAYMENT METHODS */}

              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">

                {[
                  "VISA",
                  "Mastercard",
                  "PayPal",
                  "Stripe",
                ].map(
                  (brand) => (

                    <span
                      key={brand}
                      className="rounded-md bg-white px-2 py-1 text-[8px] font-black text-[#172033] shadow-sm"
                    >
                      {brand}
                    </span>

                  ),
                )}

              </div>

              {/* DISABLED BUTTON */}

              <button
                type="button"
                onClick={handlePay}
                disabled={true}
                className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-[#8B6914] via-[#F5D76E] to-[#B8860B] opacity-55 cursor-not-allowed shadow-[0_0_18px_rgba(212,175,55,0.10)]"
              >

                <span className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-[#11100b] text-[#F5D76E] font-black text-[12px]">

                  <CreditCard className="w-4 h-4" />

                  {ui.pay} ·{" "}
                  {selectedPackageInfo.price}

                </span>

              </button>

            </div>

            {/* SECURE PAYMENT */}

            <p className="text-center text-white/25 text-[9px] mt-3">
              {ui.secure}
            </p>

          </motion.section>

        </div>

      </main>
    </div>
  );
}
