import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Loader2, Mail, Phone, User, ChevronDown } from "lucide-react";
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

type PackageCode = "monthly" | "biweekly" | "single_category";

const CATEGORY_ICONS: Record<string, string> = {
  agriculture: "🌾",
  food: "🍝",
  textile: "👕",
  metal: "⚙️",
  other_industry: "🏭",
  construction: "🏗️",
  commerce: "🛒",
  hospitality: "🏨",
  tourism: "✈️",
  transport_logistics: "🚛",
  business_support: "🧹",
  health_social: "🏥",
  other_services: "💼",
  family_assistance: "👩‍👧",
};


const CATEGORY_LABELS: Record<string, { darija: string; es: string; en: string }> = {
  agriculture: { darija: "الفلاحة والغابات والصيد", es: "Agricultura, silvicultura y pesca", en: "Agriculture, forestry and fishing" },
  food: { darija: "الصناعات الغذائية", es: "Industria alimentaria", en: "Food industry" },
  textile: { darija: "النسيج والملابس والأحذية", es: "Textil, confección y calzado", en: "Textiles, clothing and footwear" },
  metal: { darija: "الصناعات المعدنية", es: "Industria metalúrgica", en: "Metallurgical industry" },
  other_industry: { darija: "صناعات أخرى", es: "Otras industrias", en: "Other industries" },
  construction: { darija: "البناء والأشغال", es: "Construcción", en: "Construction" },
  commerce: { darija: "التجارة", es: "Comercio", en: "Commerce" },
  hospitality: { darija: "الفنادق والمطاعم", es: "Alojamiento y restauración", en: "Accommodation and food service" },
  tourism: { darija: "السياحة والخدمات السياحية", es: "Turismo y servicios turísticos", en: "Tourism and tourist services" },
  transport_logistics: { darija: "النقل واللوجستيك والتخزين", es: "Transporte, logística y almacenamiento", en: "Transport, logistics and warehousing" },
  business_support: { darija: "خدمات الدعم", es: "Servicios de apoyo", en: "Support services" },
  health_social: { darija: "الصحة والرعاية الاجتماعية", es: "Sanidad y asistencia social", en: "Health and social care" },
  other_services: { darija: "خدمات أخرى", es: "Otros servicios", en: "Other services" },
  family_assistance: { darija: "المساعدة العائلية", es: "Asistencia familiar", en: "Family assistance" },
};

const PACKAGE_TEXT = {
  monthly: {
    darija: {
      title: "عروض الشهر",
      subtitle: "أداء واحد · 30 يوم",
      features: ["توصل بعروض الشهر", "اختار أكثر من فئة", "العروض مصنفة حسب المجال", "الإرسال عبر الإيميل"],
    },
    es: {
      title: "Ofertas del mes",
      subtitle: "Pago único · 30 días",
      features: ["Recibe las ofertas del mes", "Puedes seleccionar varias categorías", "Ofertas filtradas por sector", "Envío por email"],
    },
    en: {
      title: "Offers of the month",
      subtitle: "One payment · 30 days",
      features: ["Receive the month's offers", "Select multiple categories", "Offers filtered by sector", "Email delivery"],
    },
  },
  biweekly: {
    darija: {
      title: "عروض جديدة كل 15 يوم",
      subtitle: "أداء واحد · 30 يوم",
      features: ["العروض الحالية", "عروض جديدة كل 15 يوم", "اختار أكثر من فئة", "إرسال أوتوماتيكي بالإيميل"],
    },
    es: {
      title: "Nuevas ofertas cada 15 días",
      subtitle: "Pago único · 30 días",
      features: ["Ofertas iniciales", "Nuevas ofertas cada 15 días", "Puedes seleccionar varias categorías", "Envío automático por email"],
    },
    en: {
      title: "New offers every 15 days",
      subtitle: "One payment · 30 days",
      features: ["Initial offers", "New offers every 15 days", "Select multiple categories", "Automatic email delivery"],
    },
  },
  single_category: {
    darija: {
      title: "فئة وحدة فقط",
      subtitle: "أداء واحد · 30 يوم",
      features: ["اختار فئة مهنية وحدة", "غير عروض هاد الفئة", "عروض جديدة خلال المدة", "إرسال أوتوماتيكي بالإيميل"],
    },
    es: {
      title: "Una sola categoría",
      subtitle: "Pago único · 30 días",
      features: ["Una sola categoría profesional", "Solo ofertas de la categoría elegida", "Nuevas ofertas durante el periodo", "Envío automático por email"],
    },
    en: {
      title: "One category only",
      subtitle: "One payment · 30 days",
      features: ["One professional category", "Only offers from the chosen category", "New offers during the period", "Automatic email delivery"],
    },
  },
};

const PACKAGE_INFO = [
  {
    code: "monthly" as PackageCode,
    title: "Offerte del mese",
    price: "9,99€",
    subtitle: "Pagamento unico · 30 giorni",
    features: ["Ricevi le offerte del mese", "Più categorie selezionabili", "Offerte filtrate per settore", "Invio tramite email"],
  },
  {
    code: "biweekly" as PackageCode,
    title: "Aggiornamenti ogni 15 giorni",
    price: "19,99€",
    subtitle: "Pagamento unico · 30 giorni",
    features: ["Offerte iniziali", "Nuove offerte ogni 15 giorni", "Più categorie selezionabili", "Invio automatico tramite email"],
  },
  {
    code: "single_category" as PackageCode,
    title: "Una sola categoria",
    price: "24,99€",
    subtitle: "Pagamento unico · 30 giorni",
    features: ["Una sola categoria professionale", "Solo offerte della categoria scelta", "Nuove offerte durante il periodo", "Invio automatico tramite email"],
  },
];

export default function DecretoFlussi2027() {
  const { lang } = useLang();
  const { toast } = useToast();

  const language = lang === "darija" ? "darija" : lang === "en" ? "en" : "es";
  const isMa = language === "darija";
  const isEn = language === "en";

  const ui = {
    pageTitle: isMa ? "ديكريتو فلوسي 2027" : isEn ? "Decreto Flussi 2027" : "Decreto Flussi 2027",
    subtitle: isMa ? "عروض العمل فإيطاليا" : isEn ? "Job offers in Italy" : "Ofertas de trabajo en Italia",
    name: isMa ? "الاسم" : isEn ? "First name" : "Nombre",
    lastName: isMa ? "النسب" : isEn ? "Last name" : "Apellido",
    email: isMa ? "الإيميل" : isEn ? "Email address" : "Correo electrónico",
    phone: isMa ? "رقم الهاتف / واتساب" : isEn ? "Phone number / WhatsApp" : "Número de teléfono / WhatsApp",
    workType: isMa ? "نوع الخدمة" : isEn ? "Work type" : "Tipo de trabajo",
    nonSeasonal: isMa ? "خدمة غير موسمية" : isEn ? "Non-seasonal work" : "Trabajo no estacional",
    seasonal: isMa ? "خدمة موسمية" : isEn ? "Seasonal work" : "Trabajo estacional",
    packages: isMa ? "اختار الباكيج ديالك" : isEn ? "Choose your package" : "Elige tu paquete",
    chooseCategory: isMa ? "اختار الفئات" : isEn ? "Choose categories" : "Elige tus categorías",
    categoriesHint: isMa ? "اختار الفئات اللي باغي توصلك عروضها." : isEn ? "Choose the sectors you want to receive offers for." : "Selecciona los sectores de los que quieres recibir ofertas.",
    oneCategory: isMa ? "هاد الباكيج فيه فئة وحدة فقط" : isEn ? "This package allows one category only" : "Este paquete permite una sola categoría",
    seasonalLabel: isMa ? "موسمي" : isEn ? "Seasonal" : "Estacional",
    terms: isMa ? "كنأكد أنني قريت وفهمت شروط الخدمة وسياسة الخصوصية، وكنوافق على معالجة المعطيات الشخصية اللي قدمت باش يتدبر الطلب ديالي، ويتختارو ليا عروض العمل حسب الاختيارات ديالي، ويتصيفطو ليا العروض عبر القنوات اللي اخترتها خلال مدة الخدمة. المعطيات كتتعالج غير فإطار الأغراض المعلنة ووفق القوانين المعمول بها. الخدمة ما كتضمنش الحصول على عقد عمل، التوظيف أو الدخول لإيطاليا." : isEn ? "I confirm that I have read and understood the Terms of Service and Privacy Policy, and I agree to the processing of the personal data I provide to manage my request, match me with job offers according to my selections, and send me relevant offers through the channels I have chosen during the service period. Personal data will be processed only for the stated purposes and in accordance with applicable law. The service does not guarantee employment, a job contract or entry into Italy." : "Confirmo que he leído y comprendido los Términos del Servicio y la Política de Privacidad, y acepto el tratamiento de los datos personales que facilito para gestionar mi solicitud, seleccionar ofertas de trabajo de acuerdo con mis preferencias y enviarme ofertas relevantes a través de los canales que haya indicado durante el periodo de servicio. Los datos se tratarán únicamente para las finalidades informadas y conforme a la normativa aplicable. El servicio no garantiza la obtención de empleo, contrato de trabajo ni la entrada en Italia.",
    pay: isMa ? "كمل الأداء" : isEn ? "Continue to payment" : "Continuar al pago",
    secure: isMa ? "الأداء آمن. من بعد تأكيد الأداء غادي يتفعل الباكيج." : isEn ? "Secure payment. Your package will activate after payment confirmation." : "Pago seguro. El paquete se activará después de confirmar el pago.",
    loading: isMa ? "جاري تحميل الفئات..." : isEn ? "Loading categories..." : "Cargando categorías...",
    noCategories: isMa ? "ما قدرناش نحملو الفئات." : isEn ? "We could not load the categories." : "No se pudieron cargar las categorías.",
    missingData: isMa ? "دخل الاسم والنسب." : isEn ? "Enter your first and last name." : "Introduce nombre y apellido.",
    invalidEmail: isMa ? "دخل إيميل صحيح." : isEn ? "Enter a valid email address." : "Introduce un correo válido.",
    invalidPhone: isMa ? "دخل رقم هاتف صحيح." : isEn ? "Enter a valid phone number." : "Introduce un número de teléfono válido.",
    missingCategory: isMa ? "اختار على الأقل فئة وحدة." : isEn ? "Select at least one category." : "Selecciona al menos una categoría.",
    oneCategoryError: isMa ? "هاد الباكيج كيسمح بفئة وحدة فقط." : isEn ? "This package allows one category only." : "Este paquete permite una sola categoría.",
    termsRequired: isMa ? "خاصك توافق على الشروط." : isEn ? "You must accept the terms." : "Debes aceptar los términos.",
    legalTitle: isMa ? "معلومات مهمة حول حماية المعطيات" : isEn ? "Important data protection information" : "Información importante sobre protección de datos",
    legalBody: isMa ? "المعطيات اللي كتدخل غادي تستعمل لتدبير الخدمة، فلترة عروض العمل حسب الاختيارات ديالك وإرسال العروض ليك بانتظام خلال مدة الباكيج. يمكن استعمال مزودي خدمات تقنيين ضروريين لتقديم الخدمة، وفق سياسة الخصوصية والقوانين المعمول بها. عندك الحقوق اللي كيكفلها القانون بخصوص الولوج للمعطيات، التصحيح، الحذف وغيرها حسب الحالة. الخدمة غير خدمة معلومات وإرسال عروض وما كتضمنش التوظيف أو العقد أو الدخول لإيطاليا.": isEn ? "The data you provide will be used to manage the service, filter job offers according to your selections and send relevant offers regularly during the package period. Necessary technical service providers may process data to deliver the service, in accordance with the Privacy Policy and applicable law. You have the rights provided by law regarding access, rectification, erasure and other applicable rights. This is an information and job-offer service and does not guarantee employment, a contract or entry into Italy." : "Los datos que facilites se utilizarán para gestionar el servicio, filtrar ofertas de trabajo según tus preferencias y enviarte ofertas relevantes de forma periódica durante el periodo del paquete. Podrán intervenir proveedores tecnológicos necesarios para prestar el servicio, de acuerdo con la Política de Privacidad y la normativa aplicable. Puedes ejercer los derechos que reconoce la ley sobre tus datos, como acceso, rectificación, supresión y otros que correspondan. Este servicio es informativo y de envío de ofertas y no garantiza empleo, contrato de trabajo ni entrada en Italia.",
    paymentError: isMa ? "ما قدرناش نبداو الأداء." : isEn ? "Could not start payment." : "No se pudo iniciar el pago.",
    paymentConnecting: isMa ? "جاري تحويلك للأداء..." : isEn ? "Connecting to payment..." : "Conectando con el pago...",
  };

  const categoryName = (category: Category) => {
    const labels = CATEGORY_LABELS[category.code];
    return labels ? labels[language] : category.name_it;
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    workType: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageCode>("monthly");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Fallback locale: la pagina deve continuare a mostrare i lavori anche se
  // Supabase restituisce un errore, una lista vuota o valori booleani serializzati.
  const FALLBACK_CATEGORIES: Category[] = [
    { id: 1, code: "agriculture", name_it: "Agricoltura, silvicoltura e pesca", description_it: null, is_seasonal: true },
    { id: 2, code: "food", name_it: "Industria alimentare", description_it: null, is_seasonal: false },
    { id: 3, code: "textile", name_it: "Tessile, abbigliamento e calzature", description_it: null, is_seasonal: false },
    { id: 4, code: "metal", name_it: "Industria metallurgica", description_it: null, is_seasonal: false },
    { id: 5, code: "other_industry", name_it: "Altre industrie", description_it: null, is_seasonal: false },
    { id: 6, code: "construction", name_it: "Costruzione", description_it: null, is_seasonal: false },
    { id: 7, code: "commerce", name_it: "Commercio", description_it: null, is_seasonal: false },
    { id: 8, code: "hospitality", name_it: "Alberghi e ristorazione", description_it: null, is_seasonal: true },
    { id: 9, code: "tourism", name_it: "Turismo", description_it: null, is_seasonal: true },
    { id: 10, code: "transport_logistics", name_it: "Trasporto e logistica", description_it: null, is_seasonal: false },
    { id: 11, code: "business_support", name_it: "Servizi di supporto alle imprese", description_it: null, is_seasonal: false },
    { id: 12, code: "health_social", name_it: "Sanità e assistenza sociale", description_it: null, is_seasonal: false },
    { id: 13, code: "other_services", name_it: "Altri servizi", description_it: null, is_seasonal: false },
    { id: 14, code: "family_assistance", name_it: "Assistenza familiare", description_it: null, is_seasonal: false },
  ];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("flussi_categories")
          .select("id, code, name_it, description_it, is_seasonal")
          .eq("is_active", true)
          .order("id");

        if (error || !data || data.length === 0) {
          console.error("flussi_categories:", error || "empty result");
          setCategories(FALLBACK_CATEGORIES);
        } else {
          // Normalizza is_seasonal: Supabase/REST può restituirlo come booleano
          // oppure come stringa ("true"/"false").
          const normalized = (data as any[]).map((category) => ({
            ...category,
            id: Number(category.id),
            is_seasonal:
              category.is_seasonal === true ||
              category.is_seasonal === 1 ||
              String(category.is_seasonal).toLowerCase() === "true" ||
              String(category.is_seasonal).toLowerCase() === "1",
          })) as Category[];
          setCategories(normalized.length ? normalized : FALLBACK_CATEGORIES);
        }
      } catch (error) {
        console.error("Error loading flussi categories:", error);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  const selectedPackageInfo = useMemo(
    () => PACKAGE_INFO.find((item) => item.code === selectedPackage)!,
    [selectedPackage],
  );

  const visibleCategories = useMemo(() => {
    if (form.workType === "stagionale") {
      return categories.filter((category) =>
        category.is_seasonal === true || String(category.is_seasonal).toLowerCase() === "true" || String(category.is_seasonal) === "1"
      );
    }
    if (form.workType === "non_stagionale") {
      return categories.filter((category) =>
        !(category.is_seasonal === true || String(category.is_seasonal).toLowerCase() === "true" || String(category.is_seasonal) === "1")
      );
    }
    return categories;
  }, [categories, form.workType]);

  const updateField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCategory = (code: string) => {
    if (selectedPackage === "single_category") {
      setSelectedCategories((prev) => (prev.includes(code) ? [] : [code]));
      return;
    }
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  const selectPackage = (code: PackageCode) => {
    setSelectedPackage(code);
    if (code === "single_category" && selectedCategories.length > 1) {
      setSelectedCategories(selectedCategories.slice(0, 1));
    }
  };

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: "Dati mancanti", description: "Inserisci nome e cognome.", variant: "destructive" });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast({ title: "Email non valida", description: "Inserisci un indirizzo email valido.", variant: "destructive" });
      return false;
    }
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      toast({ title: "Numero non valido", description: "Inserisci un numero di telefono valido.", variant: "destructive" });
      return false;
    }
    if (!form.workType) {
      toast({ title: "Tipo di lavoro mancante", description: "Seleziona il tipo di lavoro.", variant: "destructive" });
      return false;
    }
    if (!selectedCategories.length) {
      toast({ title: "Categoria mancante", description: "Seleziona almeno una categoria.", variant: "destructive" });
      return false;
    }
    if (selectedPackage === "single_category" && selectedCategories.length !== 1) {
      toast({ title: "Una sola categoria", description: "Questo pacchetto consente una sola categoria.", variant: "destructive" });
      return false;
    }
    if (!acceptTerms) {
      toast({ title: "Accettazione richiesta", description: "Devi accettare i termini del servizio.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const priceCents =
        selectedPackage === "monthly" ? 999 :
        selectedPackage === "biweekly" ? 1999 : 2499;

      const response = await fetch("/api/create-checkout-flussi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          categories: selectedCategories,
          packageCode: selectedPackage,
          packagePriceCents: priceCents,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Impossibile avviare il pagamento.");
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Flussi checkout error:", error);
      toast({ title: "Errore pagamento", description: error?.message || "Impossibile avviare il pagamento.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col" dir={isMa ? "rtl" : "ltr"}>
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
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_30px_-5px_rgba(255,255,255,0.12)] bg-black">
              <div className="relative w-full h-full" style={{ height: "280px" }}>
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
                  <p className="text-white/70 text-xs uppercase tracking-[0.18em]">{ui.subtitle}</p>
                  <h2 className="text-white text-2xl sm:text-3xl font-black">DECRETO FLUSSI 2027</h2>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex-1 rounded-[24px] border-2 border-white/20 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-4 sm:px-6 py-5 shadow-[0_0_35px_rgba(0,0,0,0.25)]">
            <div className="mb-5 text-center">
              <div className="inline-flex h-7 overflow-hidden rounded-md shadow-[0_0_15px_rgba(255,255,255,0.12)]">
                <span className="w-2.5 bg-[#009246]" />
                <span className="w-2.5 bg-white" />
                <span className="w-2.5 bg-[#CE2B37]" />
              </div>
              <h2 className="mt-2 text-white text-[20px] sm:text-[24px] font-black">DECRETO FLUSSI 2027</h2>
              <p className="text-white/60 text-[12px]">{ui.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {[
                ["firstName", ui.name, isMa ? "دخل سميتك" : isEn ? "Your first name" : "Tu nombre", User],
                ["lastName", ui.lastName, isMa ? "دخل النسب ديالك" : isEn ? "Your last name" : "Tu apellido", User],
                ["email", ui.email, "nome@gmail.com", Mail],
                ["phone", ui.phone, "+212 6 00 00 00 00", Phone],
              ].map(([field, label, placeholder, Icon]) => (
                <label key={field as string} className={`block ${(field === "email" || field === "phone") ? "md:col-span-2" : ""}`}>
                  <span className="block text-white text-[13px] mb-2">{label as string}</span>
                  <div className="relative">
                    <Icon className={`absolute ${isMa ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 w-4 h-4 text-white/35`} />
                    <input
                      type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                      value={form[field as keyof typeof form]}
                      onChange={(e) => updateField(field as keyof typeof form, e.target.value)}
                      placeholder={placeholder as string}
                      className={`w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] ${isMa ? "pr-11 pl-4" : "pl-11 pr-4"} text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]`}
                    />
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-white text-[13px] mb-2">{ui.workType}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  ["non_stagionale", ui.nonSeasonal],
                  ["stagionale", ui.seasonal],
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => {
                    updateField("workType", value);
                    setSelectedCategories([]);
                  }}
                    className={form.workType === value
                      ? "rounded-xl border border-[#009246] bg-[#009246]/10 p-3 text-left text-xs text-white"
                      : "rounded-xl border border-white/10 bg-[#060b16] p-3 text-left text-xs text-white/70 hover:border-white/25"}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* TRABAJOS — APARECEN AL ELEGIR EL TIPO DE TRABAJO */}
            {form.workType ? (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-white text-[13px] font-semibold">{ui.chooseCategory}</p>
                <span className="text-[#D4AF37] text-[10px] font-semibold">
                  {form.workType === "stagionale" ? ui.seasonalLabel : ui.nonSeasonal}
                </span>
              </div>
              <p className="text-white/45 text-[10px] mb-3">{ui.categoriesHint}</p>

              {loadingCategories ? (
                <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#060b16] py-8 text-white/50 text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {ui.loading}
                </div>
              ) : visibleCategories.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#060b16] p-4 text-center text-white/50 text-xs">
                  {ui.noCategories}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleCategories.map((category) => {
                    const selectedCategory = selectedCategories.includes(category.code);
                    const disabled =
                      selectedPackage === "single_category" &&
                      !selectedCategory &&
                      selectedCategories.length >= 1;

                    return (
                      <button
                        key={category.code}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleCategory(category.code)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selectedCategory
                            ? "border-[#009246] bg-[#009246]/10 shadow-[0_0_12px_rgba(0,146,70,0.10)]"
                            : disabled
                              ? "border-white/5 bg-white/[0.02] opacity-30 cursor-not-allowed"
                              : "border-white/10 bg-[#060b16] hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/5"
                        }`}
                      >
                        <span className="text-lg shrink-0">
                          {CATEGORY_ICONS[category.code] || "💼"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-white/90 text-[11px] sm:text-[12px]">
                            {categoryName(category)}
                          </span>
                          {category.is_seasonal && (
                            <span className="text-[9px] text-white/35">
                              {ui.seasonalLabel}
                            </span>
                          )}
                        </span>
                        {selectedCategory && (
                          <CheckCircle2 className="ml-auto w-4 h-4 text-[#009246] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            ) : (
              <div className="mb-6 rounded-2xl border border-dashed border-[#D4AF37]/30 bg-[#D4AF37]/5 p-4 text-center text-white/45 text-xs">
                {isMa ? "اختار نوع الخدمة باش يبانولك الأشغال." : isEn ? "Choose a work type above to see the available jobs." : "Elige un tipo de trabajo arriba para ver los trabajos disponibles."}
              </div>
            )}

            {/* PAQUETES — SOLO SELECCIONA EL PLAN */}
            <div className="mb-5">
              <p className="text-white text-[13px] mb-2">{ui.packages}</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {PACKAGE_INFO.map((pkg) => {
                  const selected = selectedPackage === pkg.code;
                  const localized = PACKAGE_TEXT[pkg.code][language];

                  return (
                    <button
                      key={pkg.code}
                      type="button"
                      onClick={() => selectPackage(pkg.code)}
                      className={`rounded-[22px] border-2 transition-all overflow-hidden text-left p-4 ${
                        selected
                          ? "border-[#009246] bg-gradient-to-b from-[#0b160f] to-[#050505] shadow-[0_0_30px_rgba(0,146,70,0.14)]"
                          : "border-white/10 bg-[#060b16] hover:border-[#D4AF37]/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white text-[14px] font-bold">{localized.title}</p>
                          <p className="text-white/40 text-[10px] mt-1">{localized.subtitle}</p>
                        </div>
                        <p className="text-[#D4AF37] text-[25px] font-black leading-none whitespace-nowrap">
                          {pkg.price}
                        </p>
                      </div>

                      <ul className="mt-3 space-y-1.5 text-white/65 text-[11px]">
                        {localized.features.map((feature) => (
                          <li key={feature}>✓ {feature}</li>
                        ))}
                      </ul>

                      <div className="mt-3 flex items-center justify-between text-[10px]">
                        <span className={selected ? "text-[#D4AF37] font-semibold" : "text-white/35"}>
                          {selected ? "✓" : ""}
                        </span>
                        <span className="text-white/40">{pkg.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-[#060b16] p-4">
              <p className="text-white text-[11px] font-bold mb-2">{ui.legalTitle}</p>
              <p className="text-white/50 text-[9px] leading-relaxed">{ui.legalBody}</p>
            </div>

            <label className={`flex items-start gap-3 mb-4 rounded-2xl border p-3 cursor-pointer transition ${acceptTerms ? "border-[#009246]/60 bg-[#009246]/5" : "border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40"}`}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#009246] shrink-0"
              />
              <span className="text-white/70 text-[10px] leading-relaxed">
                {ui.terms}
              </span>
            </label>

            <button type="button" onClick={handlePay} disabled={submitting || !acceptTerms}
              className="w-full h-[56px] rounded-2xl p-[1px] disabled:opacity-60 bg-gradient-to-r from-[#8B6914] via-[#F5D76E] to-[#B8860B] shadow-[0_0_25px_rgba(212,175,55,0.18)]">
              <span className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#17130a] to-[#050505] text-[#F5D76E] font-black">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {ui.paymentConnecting}</> :
                  <><CreditCard className="w-5 h-5" /> {ui.pay} · {selectedPackageInfo.price}</>}
              </span>
            </button>

            <p className="text-center text-white/25 text-[9px] mt-3">
              {ui.secure}
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
