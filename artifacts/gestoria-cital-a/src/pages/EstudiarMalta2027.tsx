import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Shield, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface StudyMaltaFormData {
  fullName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  address: string;
  whatsapp: string;
  email: string;
  hasBac: "" | "yes" | "no";
  bacYear: string;
  lastDiploma: string;
  specialty: string;
  diplomaYear: string;
  institution: string;
  grade: string;
  otherDiplomas: "" | "yes" | "no";
  otherDiplomasDetails: string;
  isWorking: "" | "yes" | "no";
  company: string;
  jobTitle: string;
  isStudent: "" | "yes" | "no";
  hasFinancialSponsor: "" | "yes" | "no";
  sponsorName: string;
  sponsorRelation: string;
  sponsorProfession: string;
  sponsorIncome: string;
  sponsorCountry: string;
  hasAccommodation: "" | "yes" | "no";
  hostName: string;
  hostRelation: string;
  hostAddress: string;
  previouslyAppliedVisa: "" | "yes" | "no";
  previousVisaCountry: string;
  previousVisaType: string;
  previousVisaDate: string;
  visaRefused: "" | "yes" | "no";
  refusalCountry: string;
  refusalDate: string;
  refusalReason: string;
  previouslyObtainedVisa: "" | "yes" | "no";
  previousObtainedVisaDetails: string;
  travelledAbroad: "" | "yes" | "no";
  stayedInStudyCountry: "" | "yes" | "no";
  studyCountry: string;
  studyField: string;
  studyReason: string;
  careerGoal: string;
  returnAfterStudies: "" | "yes" | "no" | "unknown";
}

const initialForm: StudyMaltaFormData = {
  fullName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  nationality: "",
  passportNumber: "",
  passportExpiry: "",
  address: "",
  whatsapp: "",
  email: "",
  hasBac: "",
  bacYear: "",
  lastDiploma: "",
  specialty: "",
  diplomaYear: "",
  institution: "",
  grade: "",
  otherDiplomas: "",
  otherDiplomasDetails: "",
  isWorking: "",
  company: "",
  jobTitle: "",
  isStudent: "",
  hasFinancialSponsor: "",
  sponsorName: "",
  sponsorRelation: "",
  sponsorProfession: "",
  sponsorIncome: "",
  sponsorCountry: "",
  hasAccommodation: "",
  hostName: "",
  hostRelation: "",
  hostAddress: "",
  previouslyAppliedVisa: "",
  previousVisaCountry: "",
  previousVisaType: "",
  previousVisaDate: "",
  visaRefused: "",
  refusalCountry: "",
  refusalDate: "",
  refusalReason: "",
  previouslyObtainedVisa: "",
  previousObtainedVisaDetails: "",
  travelledAbroad: "",
  stayedInStudyCountry: "",
  studyCountry: "Malta",
  studyField: "",
  studyReason: "",
  careerGoal: "",
  returnAfterStudies: "",
};

export default function EstudiarMalta2027() {
  const { lang } = useLang();
  const { toast } = useToast();

  const language = lang === "darija" ? "ma" : lang;
  const isMa = language === "ma";
  const isEn = language === "en";

  const [formData, setFormData] =
    useState<StudyMaltaFormData>(initialForm);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const ui = useMemo(
    () => ({
      title: isMa
        ? "الدراسة في مالطا 2027"
        : isEn
        ? "Study in Malta 2027"
        : "Estudiar en Malta 2027",

      intro: isMa
        ? "عمر الفورم ديالك بالمعلومات الصحيحة، ومن بعد الأداء غادي توصلك رسالة فالإيميل فيها التعليمات ديال المرحلة الموالية وكيفاش تكمل التسجيل عن طريق مكالمة."
        : isEn
        ? "Complete the form with your information. After payment, you will receive an email with the next instructions and how to continue the enrolment process by phone call."
        : "Rellena el formulario con tus datos. Después del pago recibirás un email con las instrucciones del siguiente paso y cómo continuar el proceso de inscripción mediante una llamada.",

      pay: isMa
        ? "💳 خلص 19,99€"
        : isEn
        ? "💳 Pay €19.99"
        : "💳 Pagar 19,99 €",

      success: isMa
        ? "✅ توصلنا بالطلب ديالك"
        : isEn
        ? "✅ Application received"
        : "✅ Solicitud recibida",
    }),
    [isMa, isEn]
  );

  const set = (
    field: keyof StudyMaltaFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errorField === field) {
      setErrorField(null);
    }
  };

  const text = (
    es: string,
    en: string,
    ma: string
  ) => (isMa ? ma : isEn ? en : es);

  const validate = () => {
    const required: Array<keyof StudyMaltaFormData> = [
      "fullName",
      "dateOfBirth",
      "placeOfBirth",
      "nationality",
      "passportNumber",
      "passportExpiry",
      "address",
      "whatsapp",
      "email",
      "hasBac",
      "lastDiploma",
      "isWorking",
      "isStudent",
      "hasFinancialSponsor",
      "previouslyAppliedVisa",
      "visaRefused",
      "previouslyObtainedVisa",
      "travelledAbroad",
      "stayedInStudyCountry",
      "studyField",
      "studyReason",
      "careerGoal",
      "returnAfterStudies",
    ];

    for (const field of required) {
      if (!String(formData[field]).trim()) {
        setErrorField(field);

        refs.current[field]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        toast({
          title: text(
            "Faltan datos",
            "Missing information",
            "كاينين معلومات ناقصة"
          ),
          description: text(
            "Completa el campo indicado.",
            "Complete the highlighted field.",
            "عمر الخانة اللي باينة ليك."
          ),
          variant: "destructive",
        });

        return false;
      }
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setErrorField("email");

      refs.current.email?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      toast({
        title: "Email",
        description: text(
          "Email inválido.",
          "Invalid email.",
          "الإيميل ماشي صحيح."
        ),
        variant: "destructive",
      });

      return false;
    }

    const age = Math.floor(
      (Date.now() -
        new Date(formData.dateOfBirth).getTime()) /
        31557600000
    );

    if (age < 18 || age > 30) {
      setErrorField("dateOfBirth");

      refs.current.dateOfBirth?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      toast({
        title: text(
          "Edad no válida",
          "Age not eligible",
          "السن ما مناسبش"
        ),
        description: text(
          "El servicio está dirigido a personas de 18 a 30 años.",
          "This service is for applicants aged 18 to 30.",
          "هاد الخدمة موجهة للي بين 18 و30 عام."
        ),
        variant: "destructive",
      });

      return false;
    }

    if (!acceptTerms) {
      setErrorField("terms");

      toast({
        title: text(
          "Aceptación necesaria",
          "Acceptance required",
          "خاص الموافقة"
        ),
        description: text(
          "Debes aceptar el uso de tus datos para gestionar tu solicitud.",
          "You must accept the data-use terms.",
          "خاصك توافق على استعمال المعطيات ديالك باش نعالجو الطلب."
        ),
        variant: "destructive",
      });

      return false;
    }

    return true;
  };

  const startPayment = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email =
        user?.email?.trim().toLowerCase() ||
        formData.email?.trim().toLowerCase() ||
        "";

      const isTestUser =
        email === "robertopalacio165@gmail.com";

      const payload = {
        service: "study_malta_2027",
        price: 19.99,
        userId: user?.id || null,
        ...formData,
        email,
      };

      if (isTestUser) {
        console.log(
          "🧪 MODO PRUEBA — ESTUDIAR MALTA 2027 — SIN STRIPE"
        );

        const res = await fetch(
          "/api/test-estudia-malta-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "No se pudo enviar el email de prueba."
          );
        }

        setShowPayment(false);

        toast({
          title: text(
            "✅ Prueba enviada",
            "✅ Test email sent",
            "✅ تصيفط الإيميل بنجاح"
          ),
          description: text(
            "Revisa robertopalacio165@gmail.com. Se ha enviado el email con el PDF.",
            "Check robertopalacio165@gmail.com. The email with the PDF has been sent.",
            "شوف robertopalacio165@gmail.com، تصيفط ليك الإيميل ومعاه الـ PDF."
          ),
        });

        return;
      }

      const res = await fetch(
        "/api/create-checkout-study-malta",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(
          data.error || "Payment URL not received"
        );
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);

      toast({
        title: text(
          "Error de pago",
          "Payment error",
          "خطأ فالأداء"
        ),
        description: text(
          "No se pudo abrir el pago.",
          "Could not open payment.",
          "ما قدرناش نفتحو الأداء."
        ),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get("success") === "true") {
      setPaid(true);

      window.history.replaceState(
        {},
        document.title,
        "/estudiar-malta-2027"
      );
    }
  }, []);

  const Field = ({
    name,
    label,
    children,
  }: {
    name: string;
    label: string;
    children: React.ReactNode;
  }) => (
    <div
      ref={(el) => {
        refs.current[name] = el;
      }}
    >
      <label className="block text-white text-[13px] mb-2">
        {label}
      </label>

      {children}
    </div>
  );

  const input = (
    name: keyof StudyMaltaFormData,
    placeholder = ""
  ) => (
    <input
      value={String(formData[name])}
      onChange={(e) => set(name, e.target.value)}
      placeholder={placeholder}
      className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400 ${
        errorField === name
          ? "border-red-500"
          : "border-white/10"
      }`}
    />
  );

  const select = (
    name: keyof StudyMaltaFormData,
    options: Array<[string, string]>
  ) => (
    <select
      value={String(formData[name])}
      onChange={(e) => set(name, e.target.value)}
      className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400 ${
        errorField === name
          ? "border-red-500"
          : "border-white/10"
      }`}
    >
      <option value="">
        {text("Selecciona", "Select", "اختار")}
      </option>

      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  const yesNo = (
    name: keyof StudyMaltaFormData
  ) =>
    select(name, [
      ["yes", text("Sí", "Yes", "نعم")],
      ["no", text("No", "No", "لا")],
    ]);

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

      <main className="flex-1 relative z-10 pt-16 pb-10">

        <h1 className="text-xl font-display font-bold px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">
          {ui.title}
        </h1>

        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* FOTO SIN TEXTO ENCIMA */}
          <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] bg-black h-[250px] sm:h-[330px] mb-5">
      <img
 src="/images/malta-estudiar-2027.png"
  alt="Study in Malta 2027"
  className="w-full h-full object-cover"
/>
          </div>

          {paid ? (
            <div className="rounded-[26px] border border-emerald-500/40 bg-[#07111f] px-6 py-10 text-center">

              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />

              <h2 className="text-emerald-400 text-2xl sm:text-3xl font-black mb-3">
                {ui.success}
              </h2>

              <p className="text-white/80 max-w-xl mx-auto">
                {text(
                  "El pago se ha recibido correctamente. Revisa tu email: allí recibirás las instrucciones para el siguiente paso y cómo continuar la inscripción mediante una llamada.",
                  "Your payment has been received. Check your email for the next instructions and how to continue enrolment by phone call.",
                  "الأداء توصلنا بيه بنجاح. شوف الإيميل ديالك، غادي تلقى فيه التعليمات ديال المرحلة الجاية وكيفاش تكمل التسجيل عن طريق مكالمة."
                )}
              </p>

            </div>
          ) : (

            <div className="rounded-[24px] border-2 border-yellow-500/60 bg-gradient-to-b from-[#0b0b0b] to-[#050505] p-4 sm:p-6 shadow-[0_0_35px_rgba(255,200,0,0.14)]">

              {/* TÍTULO + BANDERA DE MALTA */}
              <div className="flex items-center justify-between gap-3 mb-5">

                <h2 className="text-yellow-400 text-xl sm:text-2xl font-black">
                  {ui.title}
                </h2>

                <span
                  className="text-xl sm:text-2xl shrink-0"
                  aria-label="Malta"
                >
                  🇲🇹
                </span>

              </div>

              <p className="text-white/80 text-[13px] leading-relaxed mb-6">
                {ui.intro}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black">
                  1.{" "}
                  {text(
                    "Datos personales",
                    "Personal information",
                    "المعلومات الشخصية"
                  )}
                </h2>

                <Field
                  name="fullName"
                  label={text(
                    "Nombre y apellidos",
                    "Full name",
                    "الاسم الكامل"
                  )}
                >
                  {input("fullName")}
                </Field>

                <Field
                  name="dateOfBirth"
                  label={text(
                    "Fecha de nacimiento",
                    "Date of birth",
                    "تاريخ الازدياد"
                  )}
                >
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      set("dateOfBirth", e.target.value)
                    }
                    className={`w-full h-[52px] rounded-2xl border bg-[#060b16] px-4 text-white [color-scheme:dark] ${
                      errorField === "dateOfBirth"
                        ? "border-red-500"
                        : "border-white/10"
                    }`}
                  />
                </Field>

                <Field
                  name="placeOfBirth"
                  label={text(
                    "Lugar de nacimiento",
                    "Place of birth",
                    "مكان الازدياد"
                  )}
                >
                  {input("placeOfBirth")}
                </Field>

                <Field
                  name="nationality"
                  label={text(
                    "Nacionalidad",
                    "Nationality",
                    "الجنسية"
                  )}
                >
                  {input("nationality")}
                </Field>

                <Field
                  name="passportNumber"
                  label={text(
                    "Número de pasaporte",
                    "Passport number",
                    "رقم الباسبور"
                  )}
                >
                  {input("passportNumber")}
                </Field>

                <Field
                  name="passportExpiry"
                  label={text(
                    "Caducidad del pasaporte",
                    "Passport expiry",
                    "تاريخ انتهاء الباسبور"
                  )}
                >
                  <input
                    type="date"
                    value={formData.passportExpiry}
                    onChange={(e) =>
                      set(
                        "passportExpiry",
                        e.target.value
                      )
                    }
                    className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white [color-scheme:dark]"
                  />
                </Field>

                <Field
                  name="address"
                  label={text(
                    "Dirección",
                    "Address",
                    "العنوان"
                  )}
                >
                  {input("address")}
                </Field>

                <Field
                  name="whatsapp"
                  label="WhatsApp"
                >
                  {input("whatsapp", "+212...")}
                </Field>

                <Field
                  name="email"
                  label="Email"
                >
                  {input("email", "tu@email.com")}
                </Field>

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black mt-5">
                  2.{" "}
                  {text(
                    "Estudios",
                    "Academic background",
                    "المسار الدراسي"
                  )}
                </h2>

                <Field
                  name="hasBac"
                  label={text(
                    "¿Tienes Bachillerato?",
                    "Do you have a high school diploma?",
                    "واش عندك الباك؟"
                  )}
                >
                  {yesNo("hasBac")}
                </Field>

                {formData.hasBac === "yes" && (
                  <Field
                    name="bacYear"
                    label={text(
                      "Año del Bachillerato",
                      "Baccalaureate year",
                      "العام اللي خديتي فيه الباك"
                    )}
                  >
                    {input("bacYear", "2024")}
                  </Field>
                )}

                <Field
                  name="lastDiploma"
                  label={text(
                    "Último diploma obtenido",
                    "Last diploma obtained",
                    "آخر دبلوم خديتي"
                  )}
                >
                  {select("lastDiploma", [
                    ["bac", "Baccalaureate"],
                    ["bachelor", "Licence / Bachelor"],
                    ["master", "Master"],
                    ["other", "Other"],
                  ])}
                </Field>

                <Field
                  name="specialty"
                  label={text(
                    "Especialidad / rama",
                    "Specialty / field",
                    "التخصص / الشعبة"
                  )}
                >
                  {input("specialty")}
                </Field>

                <Field
                  name="diplomaYear"
                  label={text(
                    "Año de obtención",
                    "Year obtained",
                    "عام الحصول عليه"
                  )}
                >
                  {input("diplomaYear")}
                </Field>

                <Field
                  name="institution"
                  label={text(
                    "Centro educativo",
                    "Institution",
                    "المؤسسة التعليمية"
                  )}
                >
                  {input("institution")}
                </Field>

                <Field
                  name="grade"
                  label={text(
                    "Nota / mención",
                    "Grade / distinction",
                    "النقطة / الميزة"
                  )}
                >
                  {input("grade")}
                </Field>

                <Field
                  name="otherDiplomas"
                  label={text(
                    "¿Tienes otros diplomas?",
                    "Do you have other diplomas?",
                    "واش عندك دبلومات خرين؟"
                  )}
                >
                  {yesNo("otherDiplomas")}
                </Field>

                {formData.otherDiplomas === "yes" && (
                  <div className="lg:col-span-2">
                    <Field
                      name="otherDiplomasDetails"
                      label={text(
                        "Indica los diplomas",
                        "List your diplomas",
                        "كتب الدبلومات"
                      )}
                    >
                      {input("otherDiplomasDetails")}
                    </Field>
                  </div>
                )}

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black mt-5">
                  3.{" "}
                  {text(
                    "Situación actual",
                    "Current situation",
                    "الوضعية الحالية"
                  )}
                </h2>

                <Field
                  name="isWorking"
                  label={text(
                    "¿Trabajas actualmente?",
                    "Are you currently employed?",
                    "واش خدام دابا؟"
                  )}
                >
                  {yesNo("isWorking")}
                </Field>

                {formData.isWorking === "yes" && (
                  <>
                    <Field
                      name="company"
                      label={text(
                        "Empresa",
                        "Company",
                        "الشركة"
                      )}
                    >
                      {input("company")}
                    </Field>

                    <Field
                      name="jobTitle"
                      label={text(
                        "Puesto",
                        "Job title",
                        "الخدمة"
                      )}
                    >
                      {input("jobTitle")}
                    </Field>
                  </>
                )}

                <Field
                  name="isStudent"
                  label={text(
                    "¿Estudias actualmente?",
                    "Are you currently a student?",
                    "واش كتقرا دابا؟"
                  )}
                >
                  {yesNo("isStudent")}
                </Field>

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black mt-5">
                  4.{" "}
                  {text(
                    "Financiación / garante",
                    "Financial sponsor",
                    "الضامن / التمويل"
                  )}
                </h2>

                <Field
                  name="hasFinancialSponsor"
                  label={text(
                    "¿Tienes un garante financiero?",
                    "Do you have a financial sponsor?",
                    "واش عندك شي واحد غادي يضمنك مادياً؟"
                  )}
                >
                  {yesNo("hasFinancialSponsor")}
                </Field>

                {formData.hasFinancialSponsor === "yes" && (
                  <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">

                    <Field
                      name="sponsorName"
                      label={text(
                        "Nombre y apellidos",
                        "Full name",
                        "الاسم الكامل"
                      )}
                    >
                      {input("sponsorName")}
                    </Field>

                    <Field
                      name="sponsorRelation"
                      label={text(
                        "Relación familiar",
                        "Relationship",
                        "صلة القرابة"
                      )}
                    >
                      {input("sponsorRelation")}
                    </Field>

                    <Field
                      name="sponsorProfession"
                      label={text(
                        "Profesión",
                        "Profession",
                        "المهنة"
                      )}
                    >
                      {input("sponsorProfession")}
                    </Field>

                    <Field
                      name="sponsorIncome"
                      label={text(
                        "Ingresos mensuales aproximados",
                        "Approx. monthly income",
                        "الدخل الشهري التقريبي"
                      )}
                    >
                      {input("sponsorIncome")}
                    </Field>

                    <Field
                      name="sponsorCountry"
                      label={text(
                        "País de residencia",
                        "Country of residence",
                        "بلد الإقامة"
                      )}
                    >
                      {input("sponsorCountry")}
                    </Field>

                  </div>
                )}

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black mt-5">
                  5.{" "}
                  {text(
                    "Historial de visados",
                    "Visa history",
                    "تاريخ الفيزا"
                  )}
                </h2>

                <Field
                  name="previouslyAppliedVisa"
                  label={text(
                    "¿Has solicitado un visado anteriormente?",
                    "Have you previously applied for a visa?",
                    "واش سبق ليك طلبتي فيزا؟"
                  )}
                >
                  {yesNo("previouslyAppliedVisa")}
                </Field>

                {formData.previouslyAppliedVisa === "yes" && (
                  <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">

                    <Field
                      name="previousVisaCountry"
                      label={text(
                        "País",
                        "Country",
                        "البلد"
                      )}
                    >
                      {input("previousVisaCountry")}
                    </Field>

                    <Field
                      name="previousVisaType"
                      label={text(
                        "Tipo de visado",
                        "Visa type",
                        "نوع الفيزا"
                      )}
                    >
                      {input("previousVisaType")}
                    </Field>

                    <Field
                      name="previousVisaDate"
                      label={text(
                        "Fecha de solicitud",
                        "Application date",
                        "تاريخ الطلب"
                      )}
                    >
                      {input("previousVisaDate")}
                    </Field>

                  </div>
                )}

                <Field
                  name="visaRefused"
                  label={text(
                    "¿Te han rechazado alguna vez un visado en Europa?",
                    "Have you ever been refused a European visa?",
                    "واش سبق ترفضات ليك شي فيزا ف أوروبا؟"
                  )}
                >
                  {yesNo("visaRefused")}
                </Field>

                {formData.visaRefused === "yes" && (
                  <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">

                    <Field
                      name="refusalCountry"
                      label={text(
                        "País que rechazó",
                        "Refusing country",
                        "البلد اللي رفض"
                      )}
                    >
                      {input("refusalCountry")}
                    </Field>

                    <Field
                      name="refusalDate"
                      label={text(
                        "Fecha del rechazo",
                        "Refusal date",
                        "تاريخ الرفض"
                      )}
                    >
                      {input("refusalDate")}
                    </Field>

                    <div className="lg:col-span-2">
                      <Field
                        name="refusalReason"
                        label={text(
                          "Motivo del rechazo (si lo sabes)",
                          "Reason for refusal (if known)",
                          "سبب الرفض إلا كنت عارف"
                        )}
                      >
                        {input("refusalReason")}
                      </Field>
                    </div>

                  </div>
                )}

                <Field
                  name="previouslyObtainedVisa"
                  label={text(
                    "¿Has obtenido un visado anteriormente?",
                    "Have you previously obtained a visa?",
                    "واش سبق ليك خديتي فيزا؟"
                  )}
                >
                  {yesNo("previouslyObtainedVisa")}
                </Field>

                {formData.previouslyObtainedVisa === "yes" && (
                  <div className="lg:col-span-2">
                    <Field
                      name="previousObtainedVisaDetails"
                      label={text(
                        "País y tipo de visado",
                        "Country and visa type",
                        "البلد ونوع الفيزا"
                      )}
                    >
                      {input(
                        "previousObtainedVisaDetails"
                      )}
                    </Field>
                  </div>
                )}

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black mt-5">
                  6.{" "}
                  {text(
                    "Viajes y alojamiento",
                    "Travel and accommodation",
                    "السفر والسكن"
                  )}
                </h2>

                <Field
                  name="travelledAbroad"
                  label={text(
                    "¿Has viajado anteriormente al extranjero?",
                    "Have you travelled abroad before?",
                    "واش سبق ليك سافرت لبرّا؟"
                  )}
                >
                  {yesNo("travelledAbroad")}
                </Field>

                <Field
                  name="stayedInStudyCountry"
                  label={text(
                    "¿Has estado anteriormente en el país donde quieres estudiar?",
                    "Have you stayed before in the country where you want to study?",
                    "واش سبق ليك مشيتي للبلد اللي بغيتي تقرا فيه؟"
                  )}
                >
                  {yesNo("stayedInStudyCountry")}
                </Field>

                <Field
                  name="hasAccommodation"
                  label={text(
                    "¿Tienes alojamiento en Malta?",
                    "Do you already have accommodation in Malta?",
                    "واش عندك السكن ف مالطا؟"
                  )}
                >
                  {yesNo("hasAccommodation")}
                </Field>

                {formData.hasAccommodation === "yes" && (
                  <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">

                    <Field
                      name="hostName"
                      label={text(
                        "Nombre del anfitrión",
                        "Host name",
                        "اسم اللي غادي تسكن عندو"
                      )}
                    >
                      {input("hostName")}
                    </Field>

                    <Field
                      name="hostRelation"
                      label={text(
                        "Relación",
                        "Relationship",
                        "صلة القرابة"
                      )}
                    >
                      {input("hostRelation")}
                    </Field>

                    <div className="lg:col-span-2">
                      <Field
                        name="hostAddress"
                        label={text(
                          "Dirección",
                          "Address",
                          "العنوان"
                        )}
                      >
                        {input("hostAddress")}
                      </Field>
                    </div>

                  </div>
                )}

                <h2 className="lg:col-span-2 text-yellow-400 text-lg font-black mt-5">
                  7.{" "}
                  {text(
                    "Proyecto de estudios",
                    "Study project",
                    "مشروع الدراسة"
                  )}
                </h2>

                <Field
                  name="studyCountry"
                  label={text(
                    "País de estudios",
                    "Study country",
                    "بلد الدراسة"
                  )}
                >
                  {input("studyCountry")}
                </Field>

                <Field
                  name="studyField"
                  label={text(
                    "¿Qué quieres estudiar?",
                    "What do you want to study?",
                    "شنو بغيتي تقرا؟"
                  )}
                >
                  {input("studyField")}
                </Field>

                <div className="lg:col-span-2">
                  <Field
                    name="studyReason"
                    label={text(
                      "¿Por qué quieres estudiar en Malta?",
                      "Why do you want to study in Malta?",
                      "علاش بغيتي تقرا ف مالطا؟"
                    )}
                  >
                    <textarea
                      value={formData.studyReason}
                      onChange={(e) =>
                        set(
                          "studyReason",
                          e.target.value
                        )
                      }
                      rows={4}
                      className={`w-full rounded-2xl border bg-[#060b16] p-4 text-white focus:outline-none focus:border-yellow-400 ${
                        errorField === "studyReason"
                          ? "border-red-500"
                          : "border-white/10"
                      }`}
                    />
                  </Field>
                </div>

                <div className="lg:col-span-2">
                  <Field
                    name="careerGoal"
                    label={text(
                      "¿Cuál es tu objetivo profesional después de los estudios?",
                      "What is your professional goal after your studies?",
                      "شنو هو الهدف المهني ديالك من بعد الدراسة؟"
                    )}
                  >
                    <textarea
                      value={formData.careerGoal}
                      onChange={(e) =>
                        set(
                          "careerGoal",
                          e.target.value
                        )
                      }
                      rows={4}
                      className={`w-full rounded-2xl border bg-[#060b16] p-4 text-white focus:outline-none focus:border-yellow-400 ${
                        errorField === "careerGoal"
                          ? "border-red-500"
                          : "border-white/10"
                      }`}
                    />
                  </Field>
                </div>

                <Field
                  name="returnAfterStudies"
                  label={text(
                    "¿Tienes intención de regresar a tu país después de estudiar?",
                    "Do you intend to return to your country after your studies?",
                    "واش ناوي ترجع لبلادك من بعد الدراسة؟"
                  )}
                >
                  {select("returnAfterStudies", [
                    [
                      "yes",
                      text("Sí", "Yes", "نعم"),
                    ],
                    [
                      "no",
                      text("No", "No", "لا"),
                    ],
                    [
                      "unknown",
                      text(
                        "Todavía no lo sé",
                        "I don't know yet",
                        "مازال ما عرفت"
                      ),
                    ],
                  ])}
                </Field>

                <div
                  className={`lg:col-span-2 mt-5 rounded-2xl border p-4 ${
                    errorField === "terms"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(
                          e.target.checked
                        );
                        setErrorField(null);
                      }}
                      className="mt-1 h-5 w-5 accent-green-500"
                    />

                    <span className="text-sm text-white/80 leading-relaxed">
                      {text(
                        "Acepto que GestoriaCitaIA utilice los datos proporcionados para gestionar mi solicitud de orientación y contacto sobre estudios en Malta. La información no garantiza admisión, visado ni resultado favorable.",
                        "I agree that GestoriaCitaIA may use the information provided to manage my study guidance request and contact me about studying in Malta. This does not guarantee admission, a visa or a positive outcome.",
                        "كنوافق GestoriaCitaIA تستعمل المعطيات اللي عطيت باش تعالج طلب التوجيه والتواصل معايا بخصوص الدراسة ف مالطا. هاد الخدمة ما كتضمنش القبول ولا الفيزا ولا نتيجة إيجابية."
                      )}
                    </span>

                  </label>
                </div>

                <div className="lg:col-span-2 mt-2 rounded-[28px] border-2 border-yellow-500/50 bg-[#080808] p-5 text-center">

                  <p className="text-white text-lg font-black">
                    🇲🇹 {ui.title}
                  </p>

                  <p className="text-yellow-400 text-4xl font-black my-2">
                    19,99€
                  </p>

                  <p className="text-white/50 text-xs">
                    {text(
                      "Pago único",
                      "One-time payment",
                      "أداء مرة وحدة"
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (validate()) {
                        setShowPayment(true);
                      }
                    }}
                    className="w-full min-h-[58px] mt-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-black font-black text-base shadow-[0_0_30px_rgba(255,215,0,.30)] hover:scale-[1.01] transition disabled:opacity-50"
                    disabled={!acceptTerms}
                  >
                    {ui.pay}
                  </button>

                  <div className="mt-3 flex justify-center items-center gap-2 text-[11px] text-white/60">
                    <Shield className="w-3 h-3 text-yellow-400" />

                    {text(
                      "Pago seguro mediante Stripe",
                      "Secure payment via Stripe",
                      "أداء آمن عبر Stripe"
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {showPayment && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-[380px] rounded-3xl border border-yellow-400/50 bg-[#111827] shadow-2xl p-5">

            <div className="flex items-center justify-between mb-5">

              <h2 className="text-white text-lg font-black">
                {text(
                  "Confirmar pago",
                  "Confirm payment",
                  "أكد الأداء"
                )}
              </h2>

              <button
                onClick={() => setShowPayment(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white/70 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="rounded-2xl border border-yellow-500/40 bg-black/30 p-4 mb-4 text-center">

              <p className="text-white/60 text-xs">
                {ui.title}
              </p>

              <p className="text-yellow-400 text-3xl font-black">
                19,99€
              </p>

            </div>

            <button
              disabled={submitting}
              onClick={startPayment}
              className="w-full rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CreditCard className="w-5 h-5" />

              {submitting
                ? text(
                    "Abriendo pago...",
                    "Opening payment...",
                    "كنفتحو الأداء..."
                  )
                : text(
                    "Pagar con tarjeta",
                    "Pay by card",
                    "خلص بالكارت"
                  )}
            </button>

            <p className="text-white/40 text-[10px] text-center mt-3">
              Stripe · Visa · Mastercard · Apple Pay · Google Pay
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
