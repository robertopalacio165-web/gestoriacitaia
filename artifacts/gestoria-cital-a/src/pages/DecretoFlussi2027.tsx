import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

type Category = {
  id: number;
  code: string;
  name_it: string;
  description_it: string | null;
  is_seasonal: boolean;
};

type GenderCode = "men" | "both" | "women";

type PackageCode = "all_offers" | "ten_days";

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
    is_seasonal: false,
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
    name_it: "Trasporti e logistica",
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

const PACKAGE_INFO = [
  {
    code: "all_offers" as PackageCode,

    title: "Tutte le offerte",

    title_es: "Todas las ofertas",

    title_ar: "جميع عروض العمل",

    price: "14,99€",

    subtitle:
      "Pagamento unico · Accesso immediato",

    subtitle_es:
      "Pago único · Acceso inmediato",

    subtitle_ar:
      "دفع مرة واحدة · الدخول مباشرة",

    features: [
      "Ricevi tutte le offerte disponibili",
      "Todas las ofertas disponibles",
      "توصل بجميع عروض العمل المتاحة",
      "Tutte le offerte filtrate",
      "Ofertas filtradas",
      "عروض مفلترة حسب المعلومات ديالك",
      "Invio tramite email",
      "Envío por email",
      "الإرسال عبر الإيميل",
    ],

    promo: false,
  },

  {
    code: "ten_days" as PackageCode,

    title:
      "Nuove offerte ogni 10 giorni",

    title_es:
      "Nuevas ofertas cada 10 días",

    title_ar:
      "عروض جديدة كل 10 أيام",

    price: "24,99€",

    subtitle:
      "Promo · 3 mesi · 6 invii",

    subtitle_es:
      "Promoción · 3 meses · 6 envíos",

    subtitle_ar:
      "عرض خاص · 3 أشهر · 6 إرساليات",

    features: [
      "Nuove offerte ogni 10 giorni",
      "Nuevas ofertas cada 10 días",
      "عروض جديدة كل 10 أيام",
      "Durata totale 3 mesi",
      "Duración total de 3 meses",
      "المدة 3 أشهر",
      "Totale 6 invii",
      "Total de 6 envíos",
      "المجموع 6 إرساليات",
      "Invio automatico tramite email",
      "Envío automático por email",
      "الإرسال الأوتوماتيكي عبر الإيميل",
    ],

    promo: true,
  },
];

export default function DecretoFlussi2027() {
  const { toast } = useToast();

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "both" as GenderCode,
  });

  const [selectedPackage, setSelectedPackage] =
    useState<PackageCode>("all_offers");

  const [acceptTerms, setAcceptTerms] =
    useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } =
        await supabase
          .from("flussi_categories")
          .select(
            "id, code, name_it, description_it, is_seasonal",
          )
          .eq("is_active", true)
          .order("id");

      if (error) {
        console.error(
          "flussi_categories error:",
          error,
        );

        setCategories(
          FALLBACK_CATEGORIES,
        );
      } else if (
        !data ||
        data.length === 0
      ) {
        setCategories(
          FALLBACK_CATEGORIES,
        );
      } else {
        setCategories(
          (data || []) as Category[],
        );
      }

      setLoadingCategories(false);
    };

    loadCategories();
  }, [toast]);

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

  const selectPackage = (
    code: PackageCode,
  ) => {
    setSelectedPackage(code);
  };

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
      form.phone.replace(
        /\D/g,
        "",
      );

    if (
      digits.length < 8 ||
      digits.length > 15
    ) {
      toast({
        title:
          "Numero non valido",

        description:
          "Inserisci un numero di telefono valido.",

        variant:
          "destructive",
      });

      return false;
    }

    if (!acceptTerms) {
      toast({
        title:
          "Accettazione richiesta",

        description:
          "Devi accettare i termini del servizio.",

        variant:
          "destructive",
      });

      return false;
    }

    return true;
  };

  /*
   * PAGAMENTO:
   * LASCIATO DISATTIVATO DURANTE I TEST.
   */

  const handlePay = async () => {
    if (!validate()) return;

    setSubmitting(true);

    try {
      const priceCents =
        selectedPackage ===
        "all_offers"
          ? 1499
          : 2499;

      const response =
        await fetch(
          "/api/create-checkout-flussi-lavoro",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...form,

                email:
                  form.email
                    .trim()
                    .toLowerCase(),

                packageCode:
                  selectedPackage,

                packagePriceCents:
                  priceCents,
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
            "Impossibile avviare il pagamento.",
        );
      }

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
          "Errore pagamento",

        description:
          error?.message ||
          "Impossibile avviare il pagamento.",

        variant:
          "destructive",
      });

      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">

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
          Decreto Flussi 2027
        </h1>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full">

          {/* IMMAGINE — NON MODIFICATA */}

          <motion.div
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            className="lg:w-[280px] xl:w-[280px] shrink-0 flex flex-col gap-3"
          >

            <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_30px_-5px_rgba(255,255,255,0.12)] bg-black">

              <div className="relative w-full h-full">

                <img
                  src="/images/decreto-flussi-2027.png"
                  alt="Decreto Flussi 2027"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent" />

                <div className="absolute top-4 left-4 flex h-8 overflow-hidden rounded-md shadow-lg">

                  <span className="w-3 bg-[#009246]" />

                  <span className="w-3 bg-white" />

                  <span className="w-3 bg-[#CE2B37]" />

                </div>

                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/45 to-transparent">

                  <p className="text-white/70 text-[10px] uppercase tracking-[0.18em]">
                    Lavoro in Italia
                  </p>

                  <h2 className="text-white text-xl font-black">
                    DECRETO FLUSSI 2027
                  </h2>

                </div>

              </div>

            </div>

          </motion.div>


          {/* FORM */}

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

              <div className="inline-flex h-7 overflow-hidden rounded-md shadow-[0_0_15px_rgba(255,255,255,0.12)]">

                <span className="w-2.5 bg-[#009246]" />

                <span className="w-2.5 bg-white" />

                <span className="w-2.5 bg-[#CE2B37]" />

              </div>

              <h2 className="mt-2 text-white text-[20px] sm:text-[24px] font-black">
                DECRETO FLUSSI 2027
              </h2>

              <p className="text-white/60 text-[12px]">
                Ricevi offerte di lavoro in Italia
              </p>

              <p
                className="text-white/35 text-[10px] mt-1"
                dir="rtl"
              >
                توصلك عروض العمل فإيطاليا
              </p>

            </div>


            {/* DATI PERSONALI — NON MODIFICATI */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">

              {[
                [
                  "firstName",
                  "Nome",
                  "Nombre",
                  "الاسم",
                  "Nome",
                  User,
                ],

                [
                  "lastName",
                  "Cognome",
                  "Apellidos",
                  "النسب",
                  "Cognome",
                  User,
                ],

                [
                  "email",
                  "Indirizzo email",
                  "Correo electrónico",
                  "الإيميل",
                  "nome@gmail.com",
                  Mail,
                ],

                [
                  "phone",
                  "Numero di telefono / WhatsApp",
                  "Teléfono / WhatsApp",
                  "رقم الهاتف / واتساب",
                  "+212 6 00 00 00 00",
                  Phone,
                ],

              ].map(
                ([
                  field,
                  labelIT,
                  labelES,
                  labelAR,
                  placeholder,
                  Icon,
                ]) => (

                  <label
                    key={
                      field as string
                    }
                    className={`block ${
                      field === "email" ||
                      field === "phone"
                        ? "md:col-span-2"
                        : ""
                    }`}
                  >

                    <span className="block text-white text-[13px] mb-1">
                      {labelIT as string}
                    </span>

                    <span
                      dir={
                        "rtl"
                      }
                      className="block text-white/35 text-[9px] mb-2"
                    >
                      {labelES as string}
                      {" · "}
                      {labelAR as string}
                    </span>

                    <div className="relative">

                      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />

                      <input
                        type={
                          field ===
                          "email"
                            ? "email"
                            : field ===
                                "phone"
                              ? "tel"
                              : "text"
                        }
                        value={
                          form[
                            field as keyof typeof form
                          ]
                        }
                        onChange={(
                          e,
                        ) =>
                          updateField(
                            field as keyof typeof form,
                            e.target
                              .value,
                          )
                        }
                        placeholder={
                          placeholder as string
                        }
                        className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]"
                      />

                    </div>

                  </label>

                ),
              )}

            </div>


            {/* ==================================================
                SOLO 3 CAMPOS:
                HOMBRES / AMBOS / MUJERES
                3 IDIOMAS
                ================================================== */}

            <div className="mb-5">

              <div className="flex items-center justify-between mb-2">

                <div>

                  <p className="text-white text-[13px]">
                    Genere
                  </p>

                  <p className="text-white/35 text-[9px] mt-1">
                    Género · الجنس
                  </p>

                </div>

              </div>


              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

                {/* HOMBRES */}

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "gender",
                      "men",
                    )
                  }
                  className={
                    form.gender ===
                    "men"
                      ? "min-h-[76px] rounded-2xl border border-[#009246] bg-[#009246]/10 px-3 py-3 text-center shadow-[0_0_18px_rgba(0,146,70,0.10)]"
                      : "min-h-[76px] rounded-2xl border border-white/10 bg-[#060b16] px-3 py-3 text-center hover:border-white/25"
                  }
                >

                  <div className="flex items-center justify-center gap-2">

                    <User
                      className={
                        form.gender ===
                        "men"
                          ? "w-4 h-4 text-[#00d96f]"
                          : "w-4 h-4 text-white/40"
                      }
                    />

                    <span className="text-white text-[11px] font-bold">
                      Uomini
                    </span>

                  </div>

                  <div className="mt-1 text-white/45 text-[9px]">
                    Hombres
                  </div>

                  <div
                    dir="rtl"
                    className="text-white/45 text-[9px]"
                  >
                    رجال
                  </div>

                  {form.gender ===
                    "men" && (
                    <CheckCircle2 className="mx-auto mt-1 w-4 h-4 text-[#009246]" />
                  )}

                </button>


                {/* AMBOS */}

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "gender",
                      "both",
                    )
                  }
                  className={
                    form.gender ===
                    "both"
                      ? "min-h-[76px] rounded-2xl border border-[#009246] bg-[#009246]/10 px-3 py-3 text-center shadow-[0_0_18px_rgba(0,146,70,0.10)]"
                      : "min-h-[76px] rounded-2xl border border-white/10 bg-[#060b16] px-3 py-3 text-center hover:border-white/25"
                  }
                >

                  <div className="flex items-center justify-center gap-2">

                    <User className="w-4 h-4 text-[#00d96f]" />

                    <span className="text-white text-[11px] font-bold">
                      Entrambi
                    </span>

                  </div>

                  <div className="mt-1 text-white/45 text-[9px]">
                    Ambos
                  </div>

                  <div
                    dir="rtl"
                    className="text-white/45 text-[9px]"
                  >
                    بجوج
                  </div>

                  {form.gender ===
                    "both" && (
                    <CheckCircle2 className="mx-auto mt-1 w-4 h-4 text-[#009246]" />
                  )}

                </button>


                {/* MUJERES */}

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "gender",
                      "women",
                    )
                  }
                  className={
                    form.gender ===
                    "women"
                      ? "min-h-[76px] rounded-2xl border border-[#009246] bg-[#009246]/10 px-3 py-3 text-center shadow-[0_0_18px_rgba(0,146,70,0.10)]"
                      : "min-h-[76px] rounded-2xl border border-white/10 bg-[#060b16] px-3 py-3 text-center hover:border-white/25"
                  }
                >

                  <div className="flex items-center justify-center gap-2">

                    <User
                      className={
                        form.gender ===
                        "women"
                          ? "w-4 h-4 text-[#00d96f]"
                          : "w-4 h-4 text-white/40"
                      }
                    />

                    <span className="text-white text-[11px] font-bold">
                      Donne
                    </span>

                  </div>

                  <div className="mt-1 text-white/45 text-[9px]">
                    Mujeres
                  </div>

                  <div
                    dir="rtl"
                    className="text-white/45 text-[9px]"
                  >
                    نساء
                  </div>

                  {form.gender ===
                    "women" && (
                    <CheckCircle2 className="mx-auto mt-1 w-4 h-4 text-[#009246]" />
                  )}

                </button>

              </div>

            </div>


            {/* ==================================================
                PLANES — SOLO 2
                ================================================== */}

            <div className="mb-5">

              <div className="flex items-center justify-between mb-3">

                <div>

                  <p className="text-white text-[13px]">
                    Scegli il tuo piano
                  </p>

                  <p className="text-white/35 text-[9px] mt-1">
                    Elige tu plan · اختار الباقة ديالك
                  </p>

                </div>

              </div>


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                {PACKAGE_INFO.map(
                  (pkg) => {

                    const selected =
                      selectedPackage ===
                      pkg.code;

                    return (

                      <button
                        key={
                          pkg.code
                        }
                        type="button"
                        onClick={() =>
                          selectPackage(
                            pkg.code,
                          )
                        }
                        className={
                          pkg.promo
                            ? selected
                              ? "relative text-left rounded-[22px] border-2 border-yellow-400 bg-gradient-to-b from-[#241d00] via-[#151300] to-[#050505] p-4 shadow-[0_0_35px_rgba(250,204,21,0.16)]"
                              : "relative text-left rounded-[22px] border-2 border-yellow-500/60 bg-gradient-to-b from-[#171400] to-[#050505] p-4 hover:border-yellow-300"
                            : selected
                              ? "text-left rounded-[22px] border-2 border-[#009246] bg-gradient-to-b from-[#0b160f] to-[#050505] p-4 shadow-[0_0_30px_rgba(0,146,70,0.12)]"
                              : "text-left rounded-[22px] border border-white/10 bg-[#060b16] p-4 hover:border-white/25"
                        }
                      >

                        {pkg.promo && (

                          <div className="absolute -top-3 left-4 right-4 flex items-center justify-between">

                            <span className="rounded-full bg-yellow-400 px-3 py-1 text-[9px] font-black text-black shadow-lg">
                              ⭐ PROMO DEL MES
                            </span>

                            <span
                              dir="rtl"
                              className="rounded-full bg-yellow-400 px-3 py-1 text-[9px] font-black text-black shadow-lg"
                            >
                              عرض الشهر ⭐
                            </span>

                          </div>

                        )}


                        <div
                          className={
                            pkg.promo
                              ? "flex items-start justify-between gap-3 pt-2"
                              : "flex items-start justify-between gap-3"
                          }
                        >

                          <div>

                            <p className="text-white text-[14px] font-bold">
                              {pkg.title}
                            </p>

                            <p className="text-white/70 text-[10px] mt-1">
                              {pkg.title_es}
                            </p>

                            <p
                              dir="rtl"
                              className="text-white/55 text-[10px] mt-1"
                            >
                              {pkg.title_ar}
                            </p>

                            <p className="text-white/35 text-[9px] mt-2">
                              {pkg.subtitle}
                            </p>

                            <p className="text-white/30 text-[9px]">
                              {pkg.subtitle_es}
                            </p>

                            <p
                              dir="rtl"
                              className="text-white/25 text-[9px]"
                            >
                              {pkg.subtitle_ar}
                            </p>

                          </div>

                          <p
                            className={
                              pkg.promo
                                ? "text-yellow-300 text-[25px] font-black leading-none whitespace-nowrap"
                                : "text-[#00d96f] text-[25px] font-black leading-none whitespace-nowrap"
                            }
                          >
                            {pkg.price}
                          </p>

                        </div>


                        <ul className="mt-3 space-y-1.5 text-white/65 text-[10px]">

                          {pkg.features
                            .map(
                              (
                                feature,
                                index,
                              ) => (

                                <li
                                  key={
                                    `${pkg.code}-${index}`
                                  }
                                  className={
                                    "flex gap-2"
                                  }
                                >

                                  <span
                                    className={
                                      pkg.promo
                                        ? "text-yellow-400"
                                        : "text-[#00d96f]"
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


                        {pkg.promo && (

                          <div className="mt-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-2">

                            <p className="text-yellow-300 text-[10px] font-bold">
                              ⭐ Offerta speciale · 3 mesi · 6 invii
                            </p>

                            <p className="text-yellow-200/70 text-[9px] mt-1">
                              ⭐ Promoción especial · 3 meses · 6 envíos
                            </p>

                            <p
                              dir="rtl"
                              className="text-yellow-200/70 text-[9px] mt-1"
                            >
                              ⭐ عرض خاص · 3 أشهر · 6 إرساليات
                            </p>

                          </div>

                        )}

                      </button>

                    );

                  },
                )}

              </div>

            </div>


            {/* ==================================================
                TERMINI
                ================================================== */}

            <label className="flex items-start gap-3 mb-4 cursor-pointer">

              <input
                type="checkbox"
                checked={
                  acceptTerms
                }
                onChange={(
                  e,
                ) =>
                  setAcceptTerms(
                    e.target.checked,
                  )
                }
                className="mt-1 w-4 h-4 accent-[#009246]"
              />

              <span className="text-white/55 text-[10px] leading-relaxed">

                <span className="block">
                  Accetto i termini del servizio e l'informativa sulla privacy.
                </span>

                <span className="block">
                  Acepto los términos del servicio y la política de privacidad.
                </span>

                <span
                  dir="rtl"
                  className="block"
                >
                  أوافق على شروط الخدمة وسياسة الخصوصية.
                </span>

              </span>

            </label>


            {/* ==================================================
                PAYMENT — BLOQUEADO
                ================================================== */}

            <div className="rounded-2xl border border-white/10 bg-[#060b16] p-4 mb-3">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <p className="text-[#00d96f] text-[12px] font-bold">
                    🔒 Pagamento sicuro
                  </p>

                  <p className="text-white/40 text-[9px] mt-1">
                    Pago seguro · دفع آمن
                  </p>

                </div>

                <div className="flex items-center gap-2 text-[9px] font-bold">

                  <span className="rounded-md bg-white px-2 py-1 text-[#1434CB]">
                    VISA
                  </span>

                  <span className="rounded-md bg-white px-2 py-1 text-[#111]">
                    MC
                  </span>

                  <span className="rounded-md bg-white px-2 py-1 text-[#0070BA]">
                    PayPal
                  </span>

                  <span className="rounded-md bg-white px-2 py-1 text-[#635BFF]">
                    stripe
                  </span>

                </div>

              </div>

            </div>


            <button
              type="button"
              disabled={true}
              className="w-full h-[54px] rounded-2xl border border-red-500/50 bg-[#090b10] opacity-60 cursor-not-allowed"
            >

              <span className="flex h-full w-full items-center justify-center gap-2 rounded-2xl text-white/60 font-black">

                <CreditCard className="w-5 h-5" />

                <span>
                  Pagamento temporaneamente sospeso
                </span>

              </span>

            </button>


            <p className="text-center text-white/25 text-[9px] mt-3">

              Pagamento temporaneamente disattivato durante i test.

              <br />

              Pago temporalmente desactivado durante las pruebas.

              <br />

              الأداء موقف مؤقتاً دابا حيت مازال كنقومو بالتجارب.

            </p>

          </motion.section>

        </div>

      </main>

    </div>
  );
}
