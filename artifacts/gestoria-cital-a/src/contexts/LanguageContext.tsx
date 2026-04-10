import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "es" | "ar" | "fr";

const translations: Record<Lang, Record<string, string>> = {
  es: {
    hero_badge: "IA para Extranjería en España",
    hero_title_1: "Haz tus trámites",
    hero_title_2: "más rápido con IA",
    hero_sub:
      "Automatiza citas, documentos y procesos de extranjería sin errores ni estrés.",
    hero_btn1: "Empezar Regularización",
    hero_btn2: "Ir al Panel",
    hero_btn_citas: "Buscar Citas",
    hero_trust: "Miles de usuarios confían en nosotros",

    feat1: "Sin errores",
    feat2: "100% automático",
    feat3: "Ahorra tiempo",
    feat4: "Soporte IA 24/7",

    plans_title: "Planes disponibles",
    plans_sub: "Elige el plan que mejor se adapte a ti",

    tramites_title: "Trámites disponibles",
    tramites_sub: "Todo lo que puedes hacer con GestoriaCitaIA",

    tr_tie: "Renovación TIE",
    tr_visado_nac: "Visado Nacional",
    tr_nie: "Asignación NIE",
    tr_empadron: "Empadronamiento",
    tr_trabajo: "Permiso de Trabajo",
    tr_familiar: "Reagrupación Familiar",
    tr_estudiante: "Estudiante",
    tr_arraigo: "Arraigo Social",
    tr_conducir: "Carnet de Conducir",
    tr_larga: "Residencia Larga Duración",
    tr_regreso: "Autorización de Regreso",
    tr_ue: "Certificado UE",
  },

  ar: {
    hero_badge: "ذكاء اصطناعي للهجرة في إسبانيا",
    hero_title_1: "قم بإجراءاتك",
    hero_title_2: "بسرعة مع الذكاء الاصطناعي",
    hero_sub:
      "نظم مواعيدك ووثائقك بدون أخطاء أو توتر.",
    hero_btn1: "ابدأ التسوية",
    hero_btn2: "لوحة التحكم",
    hero_btn_citas: "احجز موعد",
    hero_trust: "آلاف المستخدمين يثقون بنا",

    feat1: "بدون أخطاء",
    feat2: "تلقائي 100%",
    feat3: "وفر الوقت",
    feat4: "دعم 24/7",

    plans_title: "الخطط",
    plans_sub: "اختر الخطة المناسبة",

    tramites_title: "الخدمات",
    tramites_sub: "كل ما يمكنك القيام به",

    tr_tie: "تجديد الإقامة",
    tr_visado_nac: "فيزا وطنية",
    tr_nie: "رقم NIE",
    tr_empadron: "السكن",
    tr_trabajo: "العمل",
    tr_familiar: "التجمع العائلي",
    tr_estudiante: "الدراسة",
    tr_arraigo: "الاستقرار",
    tr_conducir: "رخصة السياقة",
    tr_larga: "إقامة طويلة",
    tr_regreso: "العودة",
    tr_ue: "أوروبا",
  },

  fr: {
    hero_badge: "IA pour l'immigration en Espagne",
    hero_title_1: "Fais tes démarches",
    hero_title_2: "plus rapidement avec l'IA",
    hero_sub:
      "Automatise tes rendez-vous et documents sans stress.",
    hero_btn1: "Commencer",
    hero_btn2: "Panel",
    hero_btn_citas: "Rendez-vous",
    hero_trust: "Des milliers d'utilisateurs nous font confiance",

    feat1: "Sans erreurs",
    feat2: "100% automatique",
    feat3: "Gain de temps",
    feat4: "Support IA 24/7",

    plans_title: "Plans",
    plans_sub: "Choisis ton plan",

    tramites_title: "Procédures",
    tramites_sub: "Tout ce que tu peux faire",

    tr_tie: "Renouvellement TIE",
    tr_visado_nac: "Visa national",
    tr_nie: "NIE",
    tr_empadron: "Adresse",
    tr_trabajo: "Travail",
    tr_familiar: "Famille",
    tr_estudiante: "Étudiant",
    tr_arraigo: "Régularisation",
    tr_conducir: "Permis",
    tr_larga: "Longue durée",
    tr_regreso: "Retour",
    tr_ue: "UE",
  },
};

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  const t = (key: string) => {
    return translations[lang][key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
