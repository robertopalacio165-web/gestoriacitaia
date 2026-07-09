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
  Bell,
  CheckCircle2,
  Briefcase,
  Award,
  Zap,
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

type MaltaFormData = {
  fullName: string;
  whatsapp: string;
  email: string;
  nacionalidad: string;
  paisResidencia: string;
  fechaNacimiento: string;
  nivelIngles: "Básico" | "Intermedio" | "Avanzado" | "Nativo";
  otrosIdiomas: string;
  profesion: string;
  añosExperiencia: string;
  estudios: string;
  carnetConducir: "Sí" | "No";
  puestoBusca: string;
  disponibilidadViajar: "Sí" | "No";
  fechaDisponible: string;
  plan: "weekly" | "monthly";
};

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
  onFormChange: (field: keyof MaltaFormData, value: string) => void;
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

  const formIntro = isMa
    ? "خدمة البحث عن عمل في مالطا باستخدام الذكاء الاصطناعي. عبّي الفورم ونحن نبحث عن العمل المناسب لك."
    : isEn
    ? "Job search service in Malta using Artificial Intelligence. Fill in the form and we will find the right job for you."
    : "Servicio de búsqueda de empleo en Malta con Inteligencia Artificial. Rellena el formulario y nosotros buscamos el trabajo adecuado para ti.";

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
                  src="https://upload.wikimedia.org/wikipedia/commons/1/16/Flag_of_Andorra.svg"
                  alt="Andorra"
                  className="h-5 w-8 rounded-[3px] object-cover shadow-[0_0_10px_rgba(255,255,255,0.20)]"
                />
              </div>
              <p className="text-white/80 text-[13px] leading-relaxed mb-5">
                {formIntro}
              </p>
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                  {/* Nombre completo */}
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الاسم الكامل" : isEn ? "Full name" : "Nombre completo"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "دخل سميتك" : isEn ? "Your name" : "Escribe tu nombre"}
                      value={formData.fullName}
                      onChange={(e) => onFormChange("fullName", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "واتساب" : isEn ? "WhatsApp" : "WhatsApp"}
                    </label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        className="w-[92px] shrink-0 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-2 text-center text-white"
                        value={formData.whatsapp.split(" ")[0] || "+34"}
                        onChange={(e) => {
                          const currentNumber = formData.whatsapp.replace(/^\+\d+\s*/, "");
                          onFormChange("whatsapp", e.target.value + " " + currentNumber);
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
                        <option value="+376">🇦🇩 +376</option>
                      </select>
                      <input
                        type="text"
                        placeholder="644403748"
                        value={formData.whatsapp.replace(/^\+\d+\s*/, "")}
                        onChange={(e) => {
                          const prefix = formData.whatsapp.split(" ")[0] || "+34";
                          onFormChange("whatsapp", prefix + " " + e.target.value);
                        }}
                        className="min-w-0 flex-1 h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => onFormChange("email", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  {/* Nacionalidad */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الجنسية" : isEn ? "Nationality" : "Nacionalidad"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "المغربية" : isEn ? "Moroccan" : "Marroquí"}
                      value={formData.nacionalidad}
                      onChange={(e) => onFormChange("nacionalidad", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* País de residencia */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "بلد الإقامة" : isEn ? "Country of residence" : "País de residencia"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "إسبانيا" : isEn ? "Spain" : "España"}
                      value={formData.paisResidencia}
                      onChange={(e) => onFormChange("paisResidencia", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
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

                  {/* Nivel de inglés */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "مستوى الإنجليزية" : isEn ? "English level" : "Nivel de inglés"}
                    </label>
                    <select
                      value={formData.nivelIngles}
                      onChange={(e) => onFormChange("nivelIngles", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">{isMa ? "اختر المستوى" : isEn ? "Select level" : "Selecciona nivel"}</option>
                      <option value="Básico">{isMa ? "أساسي" : isEn ? "Basic" : "Básico"}</option>
                      <option value="Intermedio">{isMa ? "متوسط" : isEn ? "Intermediate" : "Intermedio"}</option>
                      <option value="Avanzado">{isMa ? "متقدم" : isEn ? "Advanced" : "Avanzado"}</option>
                      <option value="Nativo">{isMa ? "لغة أم" : isEn ? "Native" : "Nativo"}</option>
                    </select>
                  </div>

                  {/* Otros idiomas */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "لغات أخرى" : isEn ? "Other languages" : "Otros idiomas"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "الفرنسية، الألمانية..." : isEn ? "French, German..." : "Francés, Alemán..."}
                      value={formData.otrosIdiomas}
                      onChange={(e) => onFormChange("otrosIdiomas", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Profesión */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المهنة" : isEn ? "Profession" : "Profesión"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "المبرمج" : isEn ? "Programmer" : "Programador"}
                      value={formData.profesion}
                      onChange={(e) => onFormChange("profesion", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Años de experiencia */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "سنوات الخبرة" : isEn ? "Years of experience" : "Años de experiencia"}
                    </label>
                    <input
                      type="number"
                      placeholder="3"
                      value={formData.añosExperiencia}
                      onChange={(e) => onFormChange("añosExperiencia", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Estudios */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الدراسات" : isEn ? "Education" : "Estudios"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "بكالوريوس في..." : isEn ? "Bachelor's in..." : "Grado en..."}
                      value={formData.estudios}
                      onChange={(e) => onFormChange("estudios", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Carnet de conducir */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "رخصة السياقة" : isEn ? "Driver's license" : "Carnet de conducir"}
                    </label>
                    <select
                      value={formData.carnetConducir}
                      onChange={(e) => onFormChange("carnetConducir", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="Sí">{isMa ? "نعم" : isEn ? "Yes" : "Sí"}</option>
                      <option value="No">{isMa ? "لا" : isEn ? "No" : "No"}</option>
                    </select>
                  </div>

                  {/* Puesto que buscas */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "المنصب الذي تبحث عنه" : isEn ? "Position you are looking for" : "Puesto que buscas"}
                    </label>
                    <input
                      type="text"
                      placeholder={isMa ? "مبرمج جافا" : isEn ? "Java Developer" : "Desarrollador Java"}
                      value={formData.puestoBusca}
                      onChange={(e) => onFormChange("puestoBusca", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white"
                    />
                  </div>

                  {/* Disponibilidad para viajar */}
                  <div>
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "الاستعداد للسفر" : isEn ? "Willingness to travel" : "Disponibilidad para viajar"}
                    </label>
                    <select
                      value={formData.disponibilidadViajar}
                      onChange={(e) => onFormChange("disponibilidadViajar", e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="Sí">{isMa ? "نعم" : isEn ? "Yes" : "Sí"}</option>
                      <option value="No">{isMa ? "لا" : isEn ? "No" : "No"}</option>
                    </select>
                  </div>

                  {/* Fecha disponible para empezar */}
                  <div className="min-w-0">
                    <label className="block text-white text-[13px] mb-2">
                      {isMa ? "تاريخ التوفر للبدء" : isEn ? "Available to start" : "Fecha disponible para empezar"}
                    </label>
                    <input
                      type="date"
                      value={formData.fechaDisponible}
                      onChange={(e) => onFormChange("fechaDisponible", e.target.value)}
                      className="block w-full max-w-full min-w-0 h-[52px] box-border appearance-none rounded-2xl border border-white/10 bg-[#060b16] px-4 text-white [color-scheme:dark]"
                    />
                  </div>

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
                          19,99€
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
                          29,99€
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

                  {/* Checkbox de aceptación - VERSIÓN CORTA PARA MÓVIL */}
                  <div className="col-span-1 lg:col-span-2 mt-4">
                    <div className="flex items-start gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-[#060b16] text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 shrink-0"
                      />
                      <label htmlFor="acceptTerms" className="text-white/70 text-[11px] sm:text-[12px] leading-relaxed">
                        {isMa
                          ? "☑️ نوافق على أن تستخدم GestoriaCitaIA بياناتي وتشارك سيرتي الذاتية مع شركات ووكالات التوظيف في مالطا لإدارة بحثي عن عمل، وفقاً لسياسة الخصوصية."
                          : isEn
                          ? "☑️ I agree that GestoriaCitaIA may use my data and share my CV with companies and employment agencies in Malta to manage my job search, in accordance with the Privacy Policy."
                          : "☑️ Acepto que GestoriaCitaIA utilice mis datos y comparta mi CV con empresas y agencias de empleo en Malta para gestionar mi búsqueda de trabajo, de acuerdo con la Política de Privacidad."}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => onPay(selectedPlan)}
                      className="w-full min-h-[56px] rounded-[20px] bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 px-4 py-2 text-[15px] leading-tight font-black text-black shadow-[0_0_30px_rgba(255,215,0,0.35)] transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!acceptTerms}
                    >
                      {isMa
                        ? `🔐 خلص وابدأ البحث (${selectedPlan === "weekly" ? "19,99€" : "29,99€"})`
                        : isEn
                        ? `🔐 Pay and start search (${selectedPlan === "weekly" ? "19,99€" : "29,99€"})`
                        : `🔐 Pagar y empezar búsqueda (${selectedPlan === "weekly" ? "19,99€" : "29,99€"})`}
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
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">PayPal</span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black">G Pay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                  ? "مبروك 🎉 بدأنا البحث عن عمل لك في مالطا"
                  : isEn
                  ? "Congratulations 🎉 We have started searching for jobs for you in Malta"
                  : "Felicidades 🎉 Hemos empezado a buscar trabajo para ti en Malta"}
              </h3>
              <p className="text-center text-white/70 text-[14px] leading-relaxed">
                {isMa
                  ? "سنتواصل معك عبر واتساب عند العثور على فرصة عمل مناسبة."
                  : isEn
                  ? "We will contact you via WhatsApp when we find a suitable job opportunity."
                  : "Te contactaremos por WhatsApp cuando encontremos una oportunidad laboral adecuada."}
              </p>

              <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-yellow-300 font-bold text-sm">
                    {isMa
                      ? "نبحث عن عمل لك 24/7"
                      : isEn
                      ? "Searching for jobs for you 24/7"
                      : "Buscando empleo para ti 24/7"}
                  </p>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  {isMa
                    ? "نبحث يومياً في منصات التوظيف في مالطا. عند العثور على فرصة مناسبة، نرسل طلب التوظيف ونتواصل معك عبر واتساب."
                    : isEn
                    ? "We search daily on Maltese job platforms. When we find a suitable opportunity, we send the application and contact you via WhatsApp."
                    : "Buscamos diariamente en plataformas de empleo en Malta. Cuando encontramos una oportunidad adecuada, enviamos la candidatura y te contactamos por WhatsApp."}
                </p>
              </div>
            </div>

            <div className="rounded-[30px] overflow-hidden border border-yellow-500/30 bg-[#050816] shadow-[0_0_40px_rgba(255,200,0,0.10)]">
              <div className="px-6 py-8 bg-[radial-gradient(circle_at_top,rgba(255,200,0,0.12),transparent_60%)]">
                <div className="flex justify-center mb-5">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/7/73/Flag_of_Malta.svg"
                    alt="Malta"
                    className="w-20 h-14 object-cover rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/20"
                  />
                </div>

                <h2 className="text-center text-[#f6d06f] text-[32px] sm:text-[36px] leading-[42px] font-black mb-5">
                  {isMa
                    ? "ابحث عن عمل في مالطا بثقة"
                    : isEn
                    ? "Find a Job in Malta with Confidence"
                    : "Encuentra trabajo en Malta con confianza"}
                </h2>

                <p className="text-center text-white/75 text-[15px] leading-relaxed mb-8">
                  {isMa
                    ? "نساعدك في العثور على وظيفة في مالطا باستخدام الذكاء الاصطناعي. نبحث عن الفرص ونرسل طلبات التوظيف نيابة عنك."
                    : isEn
                    ? "We help you find a job in Malta using Artificial Intelligence. We search for opportunities and send applications on your behalf."
                    : "Te ayudamos a encontrar empleo en Malta con Inteligencia Artificial. Buscamos oportunidades y enviamos candidaturas en tu nombre."}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Briefcase className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "فرص عمل يومية" : isEn ? "Daily opportunities" : "Oportunidades diarias"}
                    </p>
                  </div>
                  <div>
                    <Award className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "CV احترافي" : isEn ? "Professional CV" : "CV profesional"}
                    </p>
                  </div>
                  <div>
                    <Zap className="w-8 h-8 text-[#f6d06f] mx-auto mb-3" />
                    <p className="text-white/80 text-[13px] leading-snug">
                      {isMa ? "توظيف سريع" : isEn ? "Fast recruitment" : "Contratación rápida"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center text-[#f6d06f] text-[20px] sm:text-[24px] font-bold">
                  {isMa
                    ? "« مستقبلك المهني يبدأ هنا. »"
                    : isEn
                    ? "\" Your professional future starts here. \""
                    : "\" Tu futuro profesional empieza aquí. \""}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function TrabajoMalta() {
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
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("monthly");
  const [formData, setFormData] = useState<MaltaFormData>({
    fullName: "",
    whatsapp: "+34 ",
    email: "",
    nacionalidad: "",
    paisResidencia: "",
    fechaNacimiento: "",
    nivelIngles: "Intermedio",
    otrosIdiomas: "",
    profesion: "",
    añosExperiencia: "",
    estudios: "",
    carnetConducir: "Sí",
    puestoBusca: "",
    disponibilidadViajar: "Sí",
    fechaDisponible: "",
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

  // Validation completa antes del pago
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.fullName.trim()) {
      errors.push(isMa ? "الاسم الكامل مطلوب" : isEn ? "Full name is required" : "Nombre completo es requerido");
    }
    if (!formData.whatsapp.replace(/\D/g, "").trim()) {
      errors.push(isMa ? "رقم واتساب مطلوب" : isEn ? "WhatsApp number is required" : "WhatsApp es requerido");
    }
    if (!formData.email.trim()) {
      errors.push(isMa ? "البريد الإلكتروني مطلوب" : isEn ? "Email is required" : "Email es requerido");
    }
    if (!formData.nacionalidad.trim()) {
      errors.push(isMa ? "الجنسية مطلوبة" : isEn ? "Nationality is required" : "Nacionalidad es requerida");
    }
    if (!formData.paisResidencia.trim()) {
      errors.push(isMa ? "بلد الإقامة مطلوب" : isEn ? "Country of residence is required" : "País de residencia es requerido");
    }
    if (!formData.profesion.trim()) {
      errors.push(isMa ? "المهنة مطلوبة" : isEn ? "Profession is required" : "Profesión es requerida");
    }
    if (!formData.puestoBusca.trim()) {
      errors.push(isMa ? "المنصب المطلوب مطلوب" : isEn ? "Position is required" : "Puesto es requerido");
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

  const handlePay = async (plan: "weekly" | "monthly") => {
    // Validación antes del pago
    if (!validateForm()) {
      return;
    }

    try {
      const res = await fetch("/api/create-checkout-malta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          fullName: formData.fullName,
          whatsapp: formData.whatsapp,
          email: formData.email,
          nacionalidad: formData.nacionalidad,
          paisResidencia: formData.paisResidencia,
          fechaNacimiento: formData.fechaNacimiento,
          nivelIngles: formData.nivelIngles,
          otrosIdiomas: formData.otrosIdiomas,
          profesion: formData.profesion,
          añosExperiencia: formData.añosExperiencia,
          estudios: formData.estudios,
          carnetConducir: formData.carnetConducir,
          puestoBusca: formData.puestoBusca,
          disponibilidadViajar: formData.disponibilidadViajar,
          fechaDisponible: formData.fechaDisponible,
        }),
      });

      const data = await res.json();
      if (data.url) {
        localStorage.setItem("maltaPaid", "1");
        window.location.href = data.url;
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

  const handleFormChange = (field: keyof MaltaFormData, value: string) => {
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
                  preload="metadata"
                  poster="/images/malta-poster.png"
                  className="w-full h-full object-cover object-top"
                  onPlay={() => {
                    const btn = document.getElementById("play-button-malta");
                    if (btn) btn.style.display = "none";
                  }}
                >
                  <source src="/malta-presentacion.mp4" type="video/mp4" />
                </video>

                <button
                  id="play-button-malta"
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
                <p className="text-white font-bold text-sm drop-shadow-lg">Sara</p>
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
