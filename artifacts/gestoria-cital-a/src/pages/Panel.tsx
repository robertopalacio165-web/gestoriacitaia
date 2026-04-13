import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { PaymentModal } from "@/components/PaymentModal";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Bell,
  Shield,
  Upload,
  Download,
  Globe,
  Clock,
  Calendar,
  CreditCard,
  Star,
  Search,
  MessageSquare,
  ArrowRight,
  User,
  TrendingUp,
  Gift,
  Copy,
  Share2,
  Heart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";
import { uploadDocument } from "@/lib/uploadDocument";
import { supabase } from "@/lib/supabaseClient";
import {
  fileToDataUrl,
  getDocumentLabel,
  verifyDocument,
  type VerifyDocumentLang,
} from "@/lib/verifyDocument";

const CITAS = [
  {
    date: "24 Mar 2026",
    time: "10:30",
    labelKey: "appointment_tie_renewal",
    ref: "ESP-2026-034821",
    status: "proxima",
    lugarKey: "appointment_place_madrid_center",
  },
  {
    date: "15 Ene 2026",
    time: "09:15",
    labelKey: "appointment_empadronamiento",
    ref: "MAD-2026-001234",
    status: "completada",
    lugarKey: "appointment_place_madrid_townhall",
  },
  {
    date: "03 Nov 2025",
    time: "11:00",
    labelKey: "appointment_nie_assignment",
    ref: "ESP-2025-099812",
    status: "completada",
    lugarKey: "appointment_place_madrid_north",
  },
];

const REFERRAL_CODE = "AHMED-GCX26";
const REFERRALS_USED = 1;
const REFERRALS_NEEDED = 3;

type TabKey = "resumen" | "tramites" | "citas" | "documentos";

type UserDocumentRow = {
  id: string;
  title: string | null;
  original_name: string | null;
  document_type: string;
  file_path: string;
  storage_bucket?: string | null;
  verification_status: string | null;
  verification_notes?: string | null;
  expires_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  extracted_data?: Record<string, any> | null;
  created_at?: string;
};

type RequiredDoc = {
  name: string;
  type: string;
  date: string;
};

type RequiredDocWithStatus = RequiredDoc & {
  status: "subido" | "pendiente";
  extra: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  nie: string | null;
  dni: string | null;
  passport_number: string | null;
  nationality: string | null;
  birth_date: string | null;
  preferred_language: string | null;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

type UserFormRow = {
  id: string;
  form_type: string;
  title: string;
  auto_fill_status: string | null;
  auto_fill_notes: string | null;
  created_at: string;
  extracted_profile_data?: Record<string, any> | null;
};

type UploadingDocState = {
  type: string;
  title: string;
} | null;

export default function Panel() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [showPayment, setShowPayment] = useState(false);
  const [planActivo, setPlanActivo] = useState("plan_standard");
  const [codeCopied, setCodeCopied] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [userDocuments, setUserDocuments] = useState<UserDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [, setCurrentUserId] = useState<string | null>(null);
  const [userForms, setUserForms] = useState<UserFormRow[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<UploadingDocState>(null);

  const { toast } = useToast();
  const { t } = useLang();

  const tr = (key: string, fallback: string) => {
    const value = t(key as never);
    return value && value !== key ? value : fallback;
  };

  const trf = (
    key: string,
    fallback: string,
    vars?: Record<string, string | number>
  ) => {
    let value = tr(key, fallback);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return value;
  };

  const goWithGoogleAuth = async (targetPath: string) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth.getUser error:", userError);
      }

      if (user) {
        setLocation(targetPath);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${targetPath}`,
        },
      });

      if (error) {
        console.error("Google login error:", error);
        toast({
          title: tr("access_error_title", "Error de acceso"),
          description: tr(
            "access_error_desc",
            "No se pudo iniciar sesión con Google"
          ),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("goWithGoogleAuth error:", error);
      toast({
        title: tr("access_error_title", "Error de acceso"),
        description:
          error?.message ||
          tr("access_error_desc", "No se pudo iniciar sesión con Google"),
        variant: "destructive",
      });
    }
  };

  const getPlanLabel = (plan: string) => {
    const normalized = plan.trim().toLowerCase();

    if (
      normalized === "estándar" ||
      normalized === "estandar" ||
      normalized === "standard" ||
      normalized === "plan_standard"
    ) {
      return tr("plan_standard", "Estándar");
    }

    if (normalized === "premium" || normalized === "plan_premium") {
      return tr("plan_premium", "Premium");
    }

    if (normalized === "pro" || normalized === "plan_pro") {
      return tr("plan_pro", "Pro");
    }

    return plan;
  };

  const REQUIRED_DOCS: RequiredDoc[] = [
    {
      name: t("doc_passport" as never),
      type: "passport",
      date: t("doc_required" as never),
    },
    {
      name: t("doc_dni_nie" as never),
      type: "nie",
      date: t("doc_if_available" as never),
    },
    {
      name: t("doc_empadronamiento" as never),
      type: "empadronamiento",
      date: t("doc_important" as never),
    },
    {
      name: t("doc_pruebas_espana" as never),
      type: "pruebas_espana",
      date: t("doc_very_important" as never),
    },
    {
      name: t("doc_fotografias" as never),
      type: "photo",
      date: t("doc_required" as never),
    },
    {
      name: t("doc_formulario_oficial" as never),
      type: "official_form",
      date: t("doc_pending_fill" as never),
    },
    {
      name: t("doc_tasa_pagada" as never),
      type: "tasa_pagada",
      date: t("doc_pending" as never),
    },
  ];

  const loadCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("loadCurrentUser error:", error);
      throw error;
    }

    setCurrentUserId(user?.id ?? null);
    return user;
  };

  const loadProfile = async () => {
    try {
      const user = await loadCurrentUser();

      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,phone,nie,dni,passport_number,nationality,birth_date,preferred_language"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("loadProfile error:", error);
        throw error;
      }

      setProfile((data as ProfileRow | null) ?? null);
    } catch (error) {
      console.error("loadProfile fatal error:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      const user = await loadCurrentUser();

      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("loadNotifications error:", error);
        throw error;
      }

      setNotifications((data as NotificationRow[]) || []);
    } catch (error) {
      console.error("loadNotifications fatal error:", error);
      setNotifications([]);
    }
  };

  const loadUserDocuments = async () => {
    try {
      setDocsLoading(true);

      const user = await loadCurrentUser();

      if (!user) {
        setUserDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from("user_documents")
        .select(
          "id,title,original_name,document_type,file_path,storage_bucket,verification_status,verification_notes,expires_at,reviewed_at,reviewed_by,extracted_data,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("load user_documents error:", error);
        throw error;
      }

      setUserDocuments((data || []) as UserDocumentRow[]);
    } catch (error: any) {
      toast({
        title: tr("error_loading_documents_title", "Error al cargar documentos"),
        description:
          error?.message ||
          tr(
            "error_loading_documents_desc",
            "No se pudieron cargar los documentos"
          ),
        variant: "destructive",
      });
    } finally {
      setDocsLoading(false);
    }
  };

  const loadUserForms = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setUserForms([]);
        return;
      }

      const { data, error } = await supabase
        .from("user_forms")
        .select(
          "id,form_type,title,auto_fill_status,auto_fill_notes,created_at,extracted_profile_data"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUserForms((data as UserFormRow[]) || []);
    } catch (error) {
      console.error("loadUserForms error:", error);
      setUserForms([]);
    }
  };

  const getVerifyLang = (): VerifyDocumentLang => {
    const lang = (profile?.preferred_language || "").toLowerCase();

    if (lang === "darija" || lang === "ar") return "darija";
    if (lang === "en" || lang === "english") return "en";
    return "es";
  };

 const mapExpectedTypeForIA = (documentType: string): string => {
  const normalized = documentType.trim().toLowerCase();

  if (normalized === "passport") return "passport";
  if (normalized === "nie") return "nie";
  if (normalized === "tie") return "tie";
  if (normalized === "empadronamiento") return "empadronamiento";
  if (normalized === "photo" || normalized === "fotografias" || normalized === "foto") {
    return "photo";
  }
  if (normalized === "official_form" || normalized === "formulario_oficial") {
    return "official_form";
  }
  if (normalized === "criminal_record" || normalized === "antecedentes") {
    return "criminal_record";
  }

  return "auto";
};

  const mapStoredDocumentType = (
    originalType: string,
    detectedType?: string | null
  ): string => {
    const original = originalType.trim().toLowerCase();
    const detected = (detectedType || "").trim().toLowerCase();

    if (original === "general" || original === "auto") {
      return detected || "general";
    }

    if (original === "formulario_oficial") return "official_form";
    if (original === "fotografias") return "photo";
    if (original === "dni_nie") return detected === "tie" ? "tie" : "nie";

    return original;
  };

  const buildVerificationStatus = (result: {
    status: "valid" | "review" | "invalid";
    match_expected_type: boolean | null;
  }): "verified" | "needs_review" | "rejected" => {
    if (result.status === "invalid") return "rejected";
    if (result.match_expected_type === false) return "rejected";
    if (result.status === "valid") return "verified";
    return "needs_review";
  };

  const buildVerificationNote = (
    title: string,
    expectedType: string,
    result: {
      status: "valid" | "review" | "invalid";
      document_type: string;
      match_expected_type: boolean | null;
      summary: string;
      warnings: string[];
    }
  ) => {
    const detectedLabel = getDocumentLabel(result.document_type);
    const expectedLabel =
      expectedType && expectedType !== "auto"
        ? getDocumentLabel(expectedType)
        : tr("document", "Documento");

    const parts: string[] = [];

    if (result.match_expected_type === false) {
      parts.push(
        trf(
          "verification_wrong_type",
          "El archivo no coincide con el tipo esperado ({expected}). Detectado: {detected}.",
          {
            expected: expectedLabel,
            detected: detectedLabel,
          }
        )
      );
    } else if (result.status === "valid") {
      parts.push(
        trf(
          "verification_valid_named",
          "{title} verificado correctamente como {detected}.",
          {
            title,
            detected: detectedLabel,
          }
        )
      );
    } else if (result.status === "review") {
      parts.push(
        trf(
          "verification_review_named",
          "{title} necesita revisión manual. Detectado: {detected}.",
          {
            title,
            detected: detectedLabel,
          }
        )
      );
    } else {
      parts.push(
        trf(
          "verification_invalid_named",
          "{title} no es válido o no se puede leer bien. Detectado: {detected}.",
          {
            title,
            detected: detectedLabel,
          }
        )
      );
    }

    if (result.summary) {
      parts.push(result.summary);
    }

    if (Array.isArray(result.warnings) && result.warnings.length > 0) {
      parts.push(result.warnings.join(" · "));
    }

    return parts.join(" ");
  };

  const buildUploadSuccessText = (
    title: string,
    verificationStatus: "verified" | "needs_review" | "rejected",
    resultSummary?: string
  ) => {
    if (verificationStatus === "verified") {
      return trf(
        "document_uploaded_verified_named",
        "✅ {title} subido y verificado correctamente",
        { title }
      );
    }

    if (verificationStatus === "rejected") {
      return (
        trf(
          "document_uploaded_rejected_named",
          "⚠️ {title} subido pero no válido o no coincide con lo esperado",
          { title }
        ) + (resultSummary ? ` · ${resultSummary}` : "")
      );
    }

    return (
      trf(
        "document_uploaded_review_named",
        "🟡 {title} subido. Necesita revisión",
        { title }
      ) + (resultSummary ? ` · ${resultSummary}` : "")
    );
  };

  const handleDocumentUpload = async (
    file: File,
    documentType: string,
    title: string
  ) => {
    try {
      setUploadingDoc({ type: documentType, title });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Usuario no autenticado");

      const emailFromAuth = user.email?.trim() || "";
      const emailFromProfile = profile?.email?.trim() || "";
      const fullNameFromProfile = profile?.full_name?.trim() || "";
      const phoneFromProfile = profile?.phone?.trim() || "";
      const nieFromProfile = profile?.nie?.trim() || "";

      const expectedType = mapExpectedTypeForIA(documentType);

      const imageBase64 = await fileToDataUrl(file);

      const verificationResult = await verifyDocument({
        imageBase64,
        expectedDocumentType: expectedType,
        lang: getVerifyLang(),
      });

      const verificationStatus = buildVerificationStatus(verificationResult);
      const finalDocumentType = mapStoredDocumentType(
        documentType,
        verificationResult.document_type
      );

      const verificationNotes = buildVerificationNote(
        title,
        expectedType,
        verificationResult
      );

      await uploadDocument({
        file,
        documentType: finalDocumentType,
        title,
        verification_status: verificationStatus,
        verification_notes: verificationNotes,
        extracted_data: {
          user_email: emailFromAuth || emailFromProfile || "no-email@error.com",
          user_full_name: fullNameFromProfile,
          user_phone: phoneFromProfile,
          user_nie: nieFromProfile,
          upload_source: "panel",
          ai_result: verificationResult.status,
          ai_document_type: verificationResult.document_type,
          ai_expected_document_type: verificationResult.expected_document_type,
          ai_match_expected_type: verificationResult.match_expected_type,
          ai_summary: verificationResult.summary,
          ai_warnings: verificationResult.warnings,
          ai_visible_fields: verificationResult.visible_fields,
          ai_missing_or_unclear_fields: verificationResult.missing_or_unclear_fields,
          ai_image_quality: verificationResult.image_quality,
          extracted_full_name: verificationResult.full_name,
          extracted_document_number: verificationResult.document_number,
          extracted_nie: verificationResult.nie,
          extracted_passport_number: verificationResult.passport_number,
          extracted_birth_date: verificationResult.birth_date,
          extracted_expiry_date: verificationResult.expiry_date,
          extracted_issue_date: verificationResult.issue_date,
          extracted_nationality: verificationResult.nationality,
          extracted_sex: verificationResult.sex,
          extracted_country: verificationResult.country,
          is_valid: verificationStatus === "verified",
          review_required: verificationStatus !== "verified",
          review_status:
            verificationStatus === "verified"
              ? "auto_verified"
              : verificationStatus === "rejected"
              ? "auto_rejected"
              : "pending_manual_review",
          detected_from_name: verificationResult.document_type,
          match_reason: verificationResult.summary,
        },
      });

      const successText = buildUploadSuccessText(
        title,
        verificationStatus,
        verificationResult.summary
      );

      setUploadMessage(successText);

      toast({
        title: tr("document_uploaded_title", "Documento subido"),
        description:
          verificationStatus === "verified"
            ? trf(
                "document_uploaded_verified_desc_named",
                "{title} se ha verificado automáticamente.",
                { title }
              )
            : verificationStatus === "rejected"
            ? trf(
                "document_uploaded_rejected_desc_named",
                "{title} no parece válido o no coincide con el documento esperado.",
                { title }
              )
            : trf(
                "document_uploaded_review_desc_named",
                "{title} fue recibido y necesita revisión.",
                { title }
              ),
        variant: verificationStatus === "rejected" ? "destructive" : "default",
      });

      await Promise.all([loadUserDocuments(), loadNotifications()]);

      setTimeout(() => {
        setUploadMessage("");
      }, 8000);
    } catch (error: any) {
      console.error("handleDocumentUpload error:", error);
      toast({
        title: tr("error_upload_title", "Error al subir"),
        description:
          error?.message ||
          tr("error_upload_desc", "No se pudo subir el documento"),
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const createBaseFormFromProfile = async (
    formType: string,
    formTitle: string
  ) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,phone,nie,dni,passport_number,nationality,birth_date,preferred_language"
        )
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const extractedProfileData = {
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        nie: profileData.nie || "",
        dni: profileData.dni || "",
        passport_number: profileData.passport_number || "",
        nationality: profileData.nationality || "",
        birth_date: profileData.birth_date || "",
        preferred_language: profileData.preferred_language || "es",
      };

      const formData = {
        form_type: formType,
        applicant: extractedProfileData,
        created_from: "profile",
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("user_forms").insert([
        {
          user_id: user.id,
          form_type: formType,
          title: formTitle,
          form_data: formData,
          extracted_profile_data: extractedProfileData,
          auto_fill_status: "ready",
          auto_fill_notes:
            "Formulario base creado automáticamente desde el perfil del cliente",
          source_document_ids: [],
          status: "draft",
        },
      ]);

      if (insertError) throw insertError;

      await loadUserForms();

      toast({
        title: tr("form_created_title", "Formulario creado"),
        description: tr(
          "form_created_desc",
          `${formTitle} preparado automáticamente con los datos del perfil.`
        ),
      });
    } catch (error: any) {
      console.error("createBaseFormFromProfile error:", error);
      toast({
        title: tr("form_create_error_title", "Error al crear formulario"),
        description:
          error?.message ||
          tr("form_create_error_desc", "No se pudo crear el formulario automático"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const boot = async () => {
      await Promise.all([
        loadProfile(),
        loadNotifications(),
        loadUserDocuments(),
        loadUserForms(),
      ]);
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      boot();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === "documentos") {
      loadUserDocuments();
    }

    if (showNotif) {
      loadNotifications();
    }
  }, [activeTab, showNotif]);

  const uploadedTypeSet = useMemo(
    () => new Set(userDocuments.map((d) => d.document_type)),
    [userDocuments]
  );

  const requiredDocsWithStatus = useMemo<RequiredDocWithStatus[]>(() => {
    return REQUIRED_DOCS.map((doc) => {
      if (doc.type === "pruebas_espana") {
        const pruebas = userDocuments.filter(
          (d) => d.document_type === "pruebas_espana"
        );

        const total = pruebas.length;
        const minimo = 5;

        return {
          ...doc,
          status: total >= minimo ? "subido" : "pendiente",
          extra:
            total >= minimo
              ? trf(
                  "proofs_complete_counter",
                  "✔ {total}/{min} pruebas completas",
                  { total, min: minimo }
                )
              : trf("proofs_counter", "{total}/{min} pruebas", {
                  total,
                  min: minimo,
                }),
        };
      }

      if (doc.type === "nie") {
        const isUploaded =
          uploadedTypeSet.has("nie") || uploadedTypeSet.has("tie");

        return {
          ...doc,
          status: isUploaded ? "subido" : "pendiente",
          extra: "",
        };
      }

      const isUploaded = uploadedTypeSet.has(doc.type);

      return {
        ...doc,
        status: isUploaded ? "subido" : "pendiente",
        extra: "",
      };
    });
  }, [uploadedTypeSet, userDocuments]);

  const docsOk = requiredDocsWithStatus.filter((d) => d.status === "subido").length;
  const docsPct = Math.round((docsOk / requiredDocsWithStatus.length) * 100);

  const TRAMITES_ACTIVOS = [
    {
      icon: FileText,
      label: tr("procedure_tie_renewal", "Renovación TIE"),
      color: "text-blue-400",
      pct: 35,
      status: t("panel_tramite_curso" as never),
      pasos: [
        t("panel_tramite_s1" as never),
        t("panel_tramite_s2" as never),
        t("panel_tramite_s3" as never),
        t("panel_tramite_s4" as never),
      ],
      paso: 2,
    },
    {
      icon: Heart,
      label: tr("procedure_arraigo_social", "Arraigo Social"),
      color: "text-red-400",
      pct: 10,
      status: t("panel_tramite_pending" as never),
      pasos: [
        t("panel_tramite_s1" as never),
        t("panel_tramite_s2" as never),
        t("panel_tramite_s3" as never),
        t("panel_tramite_s4" as never),
      ],
      paso: 1,
    },
  ];

  const TABS: { key: TabKey; label: string }[] = [
    { key: "resumen", label: t("panel_tab_resumen" as never) },
    { key: "tramites", label: t("panel_tab_tramites" as never) },
    { key: "citas", label: t("panel_tab_citas" as never) },
    { key: "documentos", label: t("panel_tab_docs" as never) },
  ];

  const QUICK_ACTIONS = [
    {
      icon: Search,
      label: t("panel_action_cita" as never),
      sub: t("panel_action_cita_sub" as never),
      color: "text-primary",
      onClick: () => goWithGoogleAuth("/buscar-citas"),
    },
    {
      icon: Globe,
      label: t("panel_action_reg" as never),
      sub: t("panel_action_reg_sub" as never),
      color: "text-amber-400",
      onClick: () => goWithGoogleAuth("/regularizacion-2026"),
    },
    {
      icon: Upload,
      label: t("panel_action_upload" as never),
      sub: t("panel_action_upload_sub" as never),
      color: "text-blue-400",
      onClick: () => setActiveTab("documentos"),
    },
    {
      icon: MessageSquare,
      label: t("panel_action_ia" as never),
      sub: t("panel_action_ia_sub" as never),
      color: "text-secondary",
      onClick: () => {},
    },
  ];

  const STAT_CARDS = [
    {
      label: t("panel_plan_active" as never),
      value: getPlanLabel(planActivo),
      sub: t("panel_stat_up_to" as never),
      icon: Star,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: t("panel_stat_tramites" as never),
      value: "2",
      sub: tr("panel_stat_tramites_sub", "1 en curso · 1 pendiente"),
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
    },
    {
      label: t("panel_stat_cita_next" as never),
      value: "24 Mar",
      sub: tr("panel_stat_next_appt_sub", "Renovación TIE · 10:30"),
      icon: Calendar,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
    },
    {
      label: t("panel_stat_docs" as never),
      value: `${docsOk}/${requiredDocsWithStatus.length}`,
      sub: `${docsPct}% ${t("panel_completed_pct" as never)}`,
      icon: Shield,
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20",
    },
  ];

  const copyCode = () => {
    navigator.clipboard.writeText(REFERRAL_CODE).catch(() => {});
    setCodeCopied(true);

    toast({
      title: t("panel_copied" as never),
      description: trf(
        "referral_code_copied_desc",
        "{code} copiado al portapapeles.",
        { code: REFERRAL_CODE }
      ),
    });

    setTimeout(() => setCodeCopied(false), 2500);
  };

  const clientName =
    profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Cliente";
  const clientEmail = profile?.email?.trim() || "—";
  const clientNie = profile?.nie?.trim() || "—";
  const clientNationality = profile?.nationality?.trim() || "—";
  const clientBirthDate = profile?.birth_date || "—";
  const clientPhone = profile?.phone?.trim() || "—";
  const clientDni = profile?.dni?.trim() || "—";
  const clientPassport = profile?.passport_number?.trim() || "—";

  const CLIENT_FIELDS = [
    [t("panel_full_name" as never), clientName],
    ["NIE", clientNie],
    [t("panel_nationality" as never), clientNationality],
    [t("panel_birthdate" as never), clientBirthDate],
    [tr("panel_phone", "Tel."), clientPhone],
    [tr("panel_email", "Email"), clientEmail],
    ["DNI", clientDni],
    [tr("passport", "Pasaporte"), clientPassport],
  ];

  const mappedNotifications = notifications.map((n) => {
    let icon = Bell;
    let color = "text-primary";
    let bg = "bg-primary/10";

    if (n.type === "document_uploaded") {
      icon = CheckCircle2;
      color = "text-green-400";
      bg = "bg-green-400/10";
    } else if (n.type === "warning" || n.type === "document_warning") {
      icon = AlertCircle;
      color = "text-amber-400";
      bg = "bg-amber-400/10";
    } else if (n.type === "message" || n.type === "info") {
      icon = MessageSquare;
      color = "text-secondary";
      bg = "bg-secondary/10";
    }

    return {
      ...n,
      icon,
      color,
      bg,
      dot: n.status !== "read",
    };
  });

  const getVerificationLabel = (status?: string | null) => {
    switch (status) {
      case "verified":
        return tr("verified", "Verificado");
      case "needs_review":
        return tr("in_review", "En revisión");
      case "rejected":
        return tr("rejected", "Rechazado");
      case "expired":
        return tr("expired", "Caducado");
      default:
        return tr("pending", "Pendiente");
    }
  };

  const getVerificationClass = (status?: string | null) => {
    switch (status) {
      case "verified":
        return "text-green-400";
      case "needs_review":
        return "text-amber-400";
      case "rejected":
        return "text-red-400";
      case "expired":
        return "text-orange-400";
      default:
        return "text-yellow-400";
    }
  };

  const getResultLabel = (doc: UserDocumentRow) => {
    if (doc.verification_status === "verified") return tr("apt", "Apto");
    if (doc.verification_status === "needs_review") return tr("pending", "Pendiente");
    if (doc.verification_status === "rejected") return tr("not_apt", "No apto");
    if (doc.verification_status === "expired") return tr("expired", "Caducado");
    return tr("pending", "Pendiente");
  };

  const getResultClass = (doc: UserDocumentRow) => {
    if (doc.verification_status === "verified") return "text-green-400";
    if (doc.verification_status === "needs_review") return "text-amber-400";
    if (doc.verification_status === "rejected") return "text-red-400";
    if (doc.verification_status === "expired") return "text-orange-400";
    return "text-yellow-400";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
  };

  const handleDownloadDocument = async (doc: UserDocumentRow) => {
    try {
      const bucket = doc.storage_bucket || "user-documents";

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(doc.file_path, 60, { download: true });

      if (error) throw error;
      if (!data?.signedUrl) {
        throw new Error("No se pudo generar el enlace de descarga");
      }

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("handleDownloadDocument error:", error);
      toast({
        title: tr("error_download_title", "Error al descargar"),
        description:
          error?.message ||
          tr("error_download_desc", "No se pudo descargar el documento"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(34,197,94,0.12), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59,130,246,0.08), transparent)",
        }}
      />
      <Navbar />

      <main className="flex-1 relative z-10 pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/40 overflow-hidden shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}images/avatar-khalid.png`}
                className="w-full h-full object-cover object-top"
                alt=""
              />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">
                {t("panel_header" as never)}
              </h1>
              <p className="text-xs text-muted-foreground">
                {clientName} ·{" "}
                <span className="text-primary font-semibold">
                  {t("panel_plan_active" as never)} {getPlanLabel(planActivo)}
                </span>{" "}
                · NIE: {clientNie}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-200 hover:text-amber-100 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              {t("panel_notif_btn" as never)}
              <span className="w-4 h-4 rounded-full bg-destructive text-white text-[9px] flex items-center justify-center font-bold">
                {mappedNotifications.filter((n) => n.dot).length}
              </span>
            </button>

            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full right-0 mt-2 w-80 glass-panel-heavy border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <span className="text-sm font-bold text-white">
                    {t("panel_notif_btn" as never)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotif(false)}
                    className="text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    {tr("close", "Cerrar")}
                  </button>
                </div>

                <div className="divide-y divide-white/[0.05]">
                  {mappedNotifications.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-muted-foreground">
                      {tr("no_notifications", "No hay notificaciones todavía")}
                    </div>
                  ) : (
                    mappedNotifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <n.icon className={`w-4 h-4 ${n.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{n.title}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {n.dot && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map((card, i) => (
            <motion.button
              type="button"
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => {
                if (i === 0) setShowPayment(true);
                if (i === 1) setActiveTab("tramites");
                if (i === 2) setActiveTab("citas");
                if (i === 3) setActiveTab("documentos");
              }}
              className={`glass-panel border ${card.border} rounded-2xl p-4 flex flex-col gap-2 text-left hover:border-white/20 transition-all`}
            >
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-none">{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{card.sub}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="glass-panel border border-white/[0.07] rounded-2xl overflow-hidden mb-4">
          <div className="flex border-b border-white/[0.06] overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold capitalize transition-colors whitespace-nowrap px-2 ${
                  activeTab === tab.key
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "resumen" && (
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-r from-primary/10 to-blue-900/20 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {t("panel_plan_active" as never)}
                    </p>
                    <p className="text-base font-black text-white">
                      {getPlanLabel(planActivo)} · 19.99€
                      <span className="text-xs font-normal text-muted-foreground">
                        /{tr("per_month", "mes")}
                      </span>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold">
                    {t("panel_active" as never)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[
                    [t("panel_plan_used" as never), "1 / 3"],
                    [t("panel_procedures" as never), "2 / 3"],
                    [t("panel_next_invoice" as never), "01 Abr 2026"],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">{l}</p>
                      <p className="text-xs font-bold text-white mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPayment(true)}
                      className="flex-1 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <CreditCard className="w-3 h-3" />
                      {t("panel_manage_plan" as never)}
                    </button>
                    <button
                      onClick={() => goWithGoogleAuth("/buscar-citas")}
                      className="flex-1 py-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      {t("panel_new_appt" as never)}
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      createBaseFormFromProfile("ex17", "Formulario EX-17")
                    }
                    className="w-full py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {tr("create_auto_form", "Crear formulario automático")}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-white mb-2">
                  {t("panel_tramites_curso" as never)}
                </p>
                <div className="space-y-2">
                  {TRAMITES_ACTIVOS.map((trm, i) => (
                    <div
                      key={i}
                      className="glass-panel border border-white/[0.07] rounded-xl p-3"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <trm.icon className={`w-4 h-4 ${trm.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{trm.label}</p>
                          <p className="text-[10px] text-muted-foreground">{trm.status}</p>
                        </div>
                        <span className="text-xs font-bold text-primary">{trm.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${trm.pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel border border-white/[0.07] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white">
                    {tr("automatic_forms", "Formularios automáticos")}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {userForms.length} {tr("created", "creados")}
                  </span>
                </div>

                {userForms.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {tr("no_automatic_forms", "Aún no has creado formularios automáticos.")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userForms.slice(0, 3).map((form) => (
                      <div
                        key={form.id}
                        className="rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-white">{form.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {tr("type", "Tipo")}: {form.form_type}
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            form.auto_fill_status === "ready"
                              ? "text-green-400"
                              : form.auto_fill_status === "review"
                              ? "text-amber-400"
                              : form.auto_fill_status === "failed"
                              ? "text-red-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {tr("status", "Estado")}: {form.auto_fill_status}
                        </p>
                        {form.auto_fill_notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {form.auto_fill_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-white mb-2">
                  {t("panel_quick_actions" as never)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((a, i) => (
                    <button
                      key={i}
                      onClick={a.onClick}
                      className="glass-panel border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 hover:border-white/15 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                        <a.icon className={`w-4 h-4 ${a.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">{a.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl border border-primary/30 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))",
                }}
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-white">
                      {t("panel_referral_title" as never)}
                    </span>
                    <span className="ml-auto text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                      {t("panel_referral_reward" as never)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    {t("panel_referral_desc" as never)}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-black text-primary tracking-widest">
                        {REFERRAL_CODE}
                      </span>
                      <button
                        onClick={copyCode}
                        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-white transition-colors"
                      >
                        {codeCopied ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {codeCopied ? t("panel_copied" as never) : t("panel_copy" as never)}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: "GestoriaCitaIA",
                            text: trf(
                              "share_referral_text",
                              "Usa mi código {code} y consigue tu primer mes con descuento",
                              { code: REFERRAL_CODE }
                            ),
                            url: "https://gestoriacitaia.com",
                          });
                        }
                      }}
                      className="w-9 h-9 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5 text-white/70" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">
                        {t("panel_referrals_bought" as never)}
                      </span>
                      <span className="text-[10px] font-bold text-white">
                        {REFERRALS_USED}/{REFERRALS_NEEDED}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(REFERRALS_USED / REFERRALS_NEEDED) * 100}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>

                    <div className="flex justify-between">
                      {Array.from({ length: REFERRALS_NEEDED }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-1 text-[9px] font-semibold ${
                            i < REFERRALS_USED ? "text-primary" : "text-white/30"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] ${
                              i < REFERRALS_USED
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-white/5 border-white/20"
                            }`}
                          >
                            {i < REFERRALS_USED ? "✓" : i + 1}
                          </span>
                          {i === 0
                            ? "Ahmed M."
                            : i === 1
                            ? "Karim B."
                            : tr("pending", "Pendiente")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 border-t border-primary/20 px-4 py-2">
                  <p className="text-[10px] text-primary/80">
                    🎯 {t("panel_referral_left" as never)}{" "}
                    <strong className="text-primary">
                      {REFERRALS_NEEDED - REFERRALS_USED}
                    </strong>{" "}
                    {t("panel_referral_more" as never)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-600/20 rounded-xl p-3">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  <strong className="text-amber-400">{t("panel_legal_aviso" as never)}</strong>{" "}
                  {t("panel_legal_panel" as never)}
                </p>
              </div>
            </div>
          )}

          {activeTab === "tramites" && (
            <div className="p-4 space-y-4">
              {TRAMITES_ACTIVOS.map((trm, i) => (
                <div
                  key={i}
                  className="glass-panel border border-white/[0.07] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <trm.icon className={`w-5 h-5 ${trm.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{trm.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {trm.status} · {trm.pct}% {t("panel_completed_pct" as never)}
                      </p>
                    </div>
                    <button
                      onClick={() => goWithGoogleAuth("/buscar-citas")}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {t("panel_continue" as never)}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${trm.pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>

                  <div className="flex justify-between relative">
                    <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-white/10" />
                    <div
                      className="absolute top-3.5 left-4 h-0.5 bg-primary"
                      style={{
                        width: `${(trm.paso / (trm.pasos.length - 1)) * 90}%`,
                      }}
                    />
                    {trm.pasos.map((p, pi) => (
                      <div
                        key={pi}
                        className="flex flex-col items-center gap-1 relative z-10"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                            pi < trm.paso
                              ? "bg-primary border-primary"
                              : "bg-background border-white/20"
                          }`}
                        >
                          {pi < trm.paso ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              {pi + 1}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[9px] leading-tight text-center max-w-[50px] ${
                            pi < trm.paso ? "text-primary font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {p}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="text-center">
                <button
                  onClick={() => goWithGoogleAuth("/buscar-citas")}
                  className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  {t("panel_search_agent" as never)}
                </button>
              </div>
            </div>
          )}

          {activeTab === "citas" && (
            <div className="p-4 space-y-3">
              {CITAS.map((cita, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 border ${
                    cita.status === "proxima"
                      ? "bg-primary/10 border-primary/25"
                      : "glass-panel border-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          cita.status === "proxima" ? "bg-primary/20" : "bg-white/5"
                        }`}
                      >
                        <Calendar
                          className={`w-4 h-4 ${
                            cita.status === "proxima"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {tr(cita.labelKey, cita.labelKey)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {cita.date} · {cita.time}
                        </p>
                        <p className="text-[10px] text-white/50">
                          {tr(cita.lugarKey, cita.lugarKey)}
                        </p>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">
                          Ref: {cita.ref}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        cita.status === "proxima"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-primary/10 text-primary/70 border border-primary/15"
                      }`}
                    >
                      {cita.status === "proxima"
                        ? t("panel_cita_proxima" as never)
                        : t("panel_cita_done" as never)}
                    </span>
                  </div>

                  {cita.status === "proxima" && (
                    <div className="mt-2 pt-2 border-t border-primary/15 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <p className="text-[10px] text-primary/80">
                        {t("panel_wa_confirmed" as never)}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => goWithGoogleAuth("/buscar-citas")}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <Search className="w-4 h-4" />
                {t("panel_new_appt_agent" as never)}
              </button>
            </div>
          )}

          {activeTab === "documentos" && (
            <div className="p-4 space-y-3">
              {uploadMessage && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  {uploadMessage}
                </div>
              )}

              {uploadingDoc && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
                  {trf(
                    "uploading_document_named",
                    "Procesando {title}...",
                    { title: uploadingDoc.title }
                  )}
                </div>
              )}

              <div className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-white">
                    {t("docs_required_title" as never)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {docsOk}/{requiredDocsWithStatus.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {requiredDocsWithStatus.map((doc, i) => {
                    const isUploading = uploadingDoc?.type === doc.type;

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                      >
                        <div>
                          <p className="text-white text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.date}
                            {!!doc.extra && (
                              <span className="ml-2 text-primary font-semibold">
                                · {doc.extra}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-semibold ${
                              doc.status === "subido" ? "text-green-400" : "text-amber-400"
                            }`}
                          >
                            {doc.status === "subido"
                              ? t("doc_uploaded" as never)
                              : t("doc_pending" as never)}
                          </span>

                          <label
                            className={`cursor-pointer text-xs flex items-center gap-1 ${
                              isUploading
                                ? "text-muted-foreground pointer-events-none opacity-60"
                                : "text-primary"
                            }`}
                          >
                            <Upload className="w-3 h-3" />
                            {isUploading
                              ? tr("processing", "Procesando")
                              : doc.status === "subido"
                              ? t("doc_replace" as never)
                              : t("doc_upload" as never)}
                            <input
                              type="file"
                              className="hidden"
                              disabled={isUploading}
                              accept="image/*,.pdf"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await handleDocumentUpload(file, doc.type, doc.name);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <input
                type="file"
                className="hidden"
                id="upload-new-document"
                accept="image/*,.pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
                  await handleDocumentUpload(file, "general", cleanTitle);
                  e.currentTarget.value = "";
                }}
              />

              <label
                htmlFor="upload-new-document"
                className="w-full mt-2 py-2.5 text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1.5 border border-dashed border-primary/25 rounded-xl hover:border-primary/40 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {t("panel_upload_new" as never)}
              </label>

              <div className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-white">
                    {t("my_uploaded_docs" as never)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {docsLoading
                      ? t("loading" as never)
                      : `${userDocuments.length} ${t("documents_count" as never)}`}
                  </span>
                </div>

                {docsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    {t("loading_documents" as never)}
                  </p>
                ) : userDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("no_documents_uploaded" as never)}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white/5 rounded-xl flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate font-semibold">
                            {doc.title || doc.original_name || doc.document_type}
                          </p>

                          <div className="mt-1 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {tr("type", "Tipo")}: {doc.document_type}
                            </p>

                            <p
                              className={`text-xs font-semibold ${getVerificationClass(
                                doc.verification_status
                              )}`}
                            >
                              {tr("status", "Estado")}:{" "}
                              {getVerificationLabel(doc.verification_status)}
                            </p>

                            <p className={`text-xs font-semibold ${getResultClass(doc)}`}>
                              {tr("result", "Resultado")}: {getResultLabel(doc)}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {tr("reviewed_by", "Revisado por")}:{" "}
                              {doc.reviewed_by || tr("system", "Sistema")}
                            </p>

                            {doc.reviewed_at && (
                              <p className="text-xs text-muted-foreground">
                                {tr("reviewed_on", "Revisado el")}: {formatDate(doc.reviewed_at)}
                              </p>
                            )}

                            {doc.expires_at && (
                              <p className="text-xs text-muted-foreground">
                                {tr("expires_on", "Caduca el")}: {formatDate(doc.expires_at)}
                              </p>
                            )}

                            <p className="text-xs text-amber-300 break-words">
                              {tr("note", "Nota")}:{" "}
                              {doc.verification_notes &&
                              doc.verification_notes !== "EMPTY"
                                ? doc.verification_notes
                                : tr(
                                    "document_pending_review",
                                    "Documento recibido. Pendiente de revisión."
                                  )}
                            </p>

                            {doc.extracted_data?.ai_summary && (
                              <p className="text-xs text-muted-foreground break-words">
                                IA: {String(doc.extracted_data.ai_summary)}
                              </p>
                            )}

                            {doc.extracted_data?.ai_document_type &&
                              doc.extracted_data.ai_document_type !== "unknown" && (
                                <p className="text-xs text-muted-foreground">
                                  {tr("detected_as", "Detectado como")}:{" "}
                                  {String(doc.extracted_data.ai_document_type)}
                                </p>
                              )}

                            {doc.extracted_data?.extracted_full_name && (
                              <p className="text-xs text-muted-foreground">
                                {tr("name", "Nombre")}:{" "}
                                {String(doc.extracted_data.extracted_full_name)}
                              </p>
                            )}

                            {doc.extracted_data?.extracted_nie && (
                              <p className="text-xs text-muted-foreground">
                                NIE: {String(doc.extracted_data.extracted_nie)}
                              </p>
                            )}

                            {doc.extracted_data?.extracted_passport_number && (
                              <p className="text-xs text-muted-foreground">
                                {tr("passport", "Pasaporte")}:{" "}
                                {String(doc.extracted_data.extracted_passport_number)}
                              </p>
                            )}

                            {doc.extracted_data?.extracted_expiry_date && (
                              <p className="text-xs text-muted-foreground">
                                {tr("expires_on", "Caduca el")}:{" "}
                                {String(doc.extracted_data.extracted_expiry_date)}
                              </p>
                            )}

                            {Array.isArray(doc.extracted_data?.ai_warnings) &&
                              doc.extracted_data.ai_warnings.length > 0 && (
                                <p className="text-xs text-amber-300 break-words">
                                  {tr("warnings", "Avisos")}:{" "}
                                  {doc.extracted_data.ai_warnings.join(" · ")}
                                </p>
                              )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(doc)}
                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {t("download" as never)}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" />
            {t("panel_client_data" as never)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {CLIENT_FIELDS.map(([k, v]) => (
              <div key={String(k)} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">{k}</span>
                <span className="text-xs text-white font-medium truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <LegalDisclaimer />

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSelectPlan={(p) => {
          setPlanActivo(p);
          setShowPayment(false);
        }}
        agentMessage={t("panel_plan_active" as never)}
      />

      <nav className="fixed bottom-0 w-full z-50 glass-panel-heavy border-t border-white/[0.07] sm:hidden">
        <div className="flex justify-around items-center h-14 px-2">
          {[
            { icon: TrendingUp, label: t("panel_nav_resumen" as never), tab: "resumen" },
            { icon: FileText, label: t("panel_nav_tramites" as never), tab: "tramites" },
            { icon: Clock, label: t("panel_nav_citas" as never), tab: "citas" },
            { icon: Shield, label: t("panel_nav_docs" as never), tab: "documentos" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(item.tab as TabKey)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${
                activeTab === item.tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
