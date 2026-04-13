export type ProcedureDocumentType =
  | "auto"
  | "passport"
  | "nie"
  | "tie"
  | "empadronamiento"
  | "criminal_record"
  | "photo"
  | "official_form"
  | "supporting_proof"
  | "work_contract"
  | "appointment_receipt"
  | "payment_receipt"
  | "unknown";

export type ProcedureChannel =
  | "online"
  | "appointment"
  | "office"
  | "mixed"
  | "pending_official_rules";

export type ProcedureForm = {
  code: string;
  name: string;
  url: string;
  required: boolean;
};

export type ProcedureFee = {
  code: string;
  name: string;
  amount: string;
  notes?: string;
  required: boolean;
};

export type ProcedureDocument = {
  id: string;
  name: string;
  expectedType: ProcedureDocumentType;
  required: boolean;
  notes?: string;
};

export type ExtranjeriaProcedure = {
  key: string;
  family:
    | "regularizacion_2026"
    | "arraigo"
    | "renovacion"
    | "estancia"
    | "nacionalidad"
    | "citas"
    | "otros";
  name: string;
  shortName: string;
  description: string;
  channel: ProcedureChannel;
  officialSiteUrl: string;
  appointmentUrl?: string;
  forms: ProcedureForm[];
  fees: ProcedureFee[];
  requiredDocuments: ProcedureDocument[];
  nextStepText: string;
};

export const EXTRANJERIA_PROCEDURES: ExtranjeriaProcedure[] = [
  {
    key: "regularizacion_2026_laboral",
    family: "regularizacion_2026",
    name: "Regularización 2026 · vía laboral",
    shortName: "Regularización 2026",
    description:
      "Preparación de expediente para regularización por vía laboral, con revisión documental y formularios asociados.",
    channel: "pending_official_rules",
    officialSiteUrl: "https://sede.administracionespublicas.gob.es/procedimientoini/",
    forms: [
      {
        code: "EX-10",
        name: "Solicitud principal de arraigo / regularización",
        url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
        required: true,
      },
    ],
    fees: [
      {
        code: "TASA-790",
        name: "Tasa administrativa",
        amount: "Pendiente de confirmar",
        required: false,
        notes: "Dejar como pendiente hasta confirmación oficial final.",
      },
    ],
    requiredDocuments: [
      {
        id: "passport_nie",
        name: "Pasaporte o NIE vigente",
        expectedType: "auto",
        required: true,
      },
      {
        id: "empadronamiento",
        name: "Empadronamiento o prueba de permanencia",
        expectedType: "empadronamiento",
        required: true,
      },
      {
        id: "work_contract",
        name: "Contrato de trabajo firmado",
        expectedType: "work_contract",
        required: true,
      },
      {
        id: "criminal_record",
        name: "Certificado de antecedentes penales",
        expectedType: "criminal_record",
        required: true,
      },
      {
        id: "photo",
        name: "Fotografía reciente",
        expectedType: "photo",
        required: true,
      },
    ],
    nextStepText:
      "Completar revisión documental y dejar preparado el formulario principal en cuanto la vía oficial esté cerrada.",
  },
  {
    key: "arraigo_social",
    family: "arraigo",
    name: "Arraigo social",
    shortName: "Arraigo social",
    description:
      "Expediente de arraigo social con revisión de documentación, formulario y preparación de presentación.",
    channel: "mixed",
    officialSiteUrl: "https://sede.administracionespublicas.gob.es/procedimientoini/",
    forms: [
      {
        code: "EX-10",
        name: "Solicitud de arraigo social",
        url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/10-Arraigo_social_laboral.pdf",
        required: true,
      },
    ],
    fees: [
      {
        code: "790-052",
        name: "Tasa autorización de residencia temporal",
        amount: "Según sede oficial",
        required: true,
      },
    ],
    requiredDocuments: [
      {
        id: "passport_nie",
        name: "Pasaporte o NIE vigente",
        expectedType: "auto",
        required: true,
      },
      {
        id: "empadronamiento",
        name: "Empadronamiento",
        expectedType: "empadronamiento",
        required: true,
      },
      {
        id: "criminal_record",
        name: "Antecedentes penales",
        expectedType: "criminal_record",
        required: true,
      },
      {
        id: "supporting_proof",
        name: "Pruebas de permanencia / arraigo",
        expectedType: "supporting_proof",
        required: true,
      },
      {
        id: "work_contract",
        name: "Contrato o medios económicos",
        expectedType: "work_contract",
        required: false,
      },
      {
        id: "photo",
        name: "Fotografía reciente",
        expectedType: "photo",
        required: true,
      },
    ],
    nextStepText:
      "Revisar documentación, completar EX-10 y preparar tasa antes de presentación.",
  },
  {
    key: "arraigo_familiar",
    family: "arraigo",
    name: "Arraigo familiar",
    shortName: "Arraigo familiar",
    description:
      "Preparación de arraigo familiar con revisión documental y formulario correspondiente.",
    channel: "mixed",
    officialSiteUrl: "https://sede.administracionespublicas.gob.es/procedimientoini/",
    forms: [
      {
        code: "EX-11",
        name: "Solicitud de arraigo familiar",
        url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/11-Arraigo_familiar.pdf",
        required: true,
      },
    ],
    fees: [
      {
        code: "790-052",
        name: "Tasa autorización de residencia temporal",
        amount: "Según sede oficial",
        required: true,
      },
    ],
    requiredDocuments: [
      {
        id: "passport_nie",
        name: "Pasaporte o NIE vigente",
        expectedType: "auto",
        required: true,
      },
      {
        id: "family_link",
        name: "Documento del vínculo familiar",
        expectedType: "supporting_proof",
        required: true,
      },
      {
        id: "criminal_record",
        name: "Antecedentes penales",
        expectedType: "criminal_record",
        required: true,
      },
      {
        id: "empadronamiento",
        name: "Empadronamiento",
        expectedType: "empadronamiento",
        required: false,
      },
      {
        id: "photo",
        name: "Fotografía reciente",
        expectedType: "photo",
        required: true,
      },
    ],
    nextStepText:
      "Validar vínculo familiar, completar EX-11 y dejar preparada la tasa.",
  },
  {
    key: "renovacion_tie",
    family: "renovacion",
    name: "Renovación TIE",
    shortName: "Renovación TIE",
    description:
      "Renovación de TIE con preparación documental, cita y justificantes.",
    channel: "appointment",
    officialSiteUrl: "https://sede.administracionespublicas.gob.es/procedimientoini/",
    appointmentUrl: "https://icp.administracionelectronica.gob.es/icpplus/index.html",
    forms: [
      {
        code: "EX-17",
        name: "Solicitud de TIE",
        url: "https://extranjeros.inclusion.gob.es/ficheros/Modelos_solicitudes/mod_solicitudes2/17-TIE.pdf",
        required: true,
      },
    ],
    fees: [
      {
        code: "790-012",
        name: "Tasa TIE",
        amount: "Según sede oficial",
        required: true,
      },
    ],
    requiredDocuments: [
      {
        id: "passport_nie",
        name: "Pasaporte / NIE / resolución",
        expectedType: "auto",
        required: true,
      },
      {
        id: "photo",
        name: "Fotografía reciente",
        expectedType: "photo",
        required: true,
      },
      {
        id: "payment_receipt",
        name: "Justificante de tasa pagada",
        expectedType: "payment_receipt",
        required: true,
      },
      {
        id: "appointment_receipt",
        name: "Resguardo de cita",
        expectedType: "appointment_receipt",
        required: false,
      },
    ],
    nextStepText:
      "Rellenar EX-17, preparar tasa y después gestionar cita de huellas.",
  },
  {
    key: "cita_huellas",
    family: "citas",
    name: "Cita de huellas",
    shortName: "Cita huellas",
    description:
      "Reserva y preparación de documentación para cita de huellas.",
    channel: "appointment",
    officialSiteUrl: "https://icp.administracionelectronica.gob.es/icpplus/index.html",
    appointmentUrl: "https://icp.administracionelectronica.gob.es/icpplus/index.html",
    forms: [],
    fees: [
      {
        code: "790-012",
        name: "Tasa TIE / huellas",
        amount: "Según sede oficial",
        required: true,
      },
    ],
    requiredDocuments: [
      {
        id: "passport_nie",
        name: "Pasaporte / NIE / resolución favorable",
        expectedType: "auto",
        required: true,
      },
      {
        id: "photo",
        name: "Fotografía reciente",
        expectedType: "photo",
        required: true,
      },
      {
        id: "payment_receipt",
        name: "Justificante de tasa pagada",
        expectedType: "payment_receipt",
        required: true,
      },
    ],
    nextStepText:
      "Confirmar documentación, tasa y entrar a buscar cita disponible.",
  },
];

export function getProcedureByKey(
  key?: string | null
): ExtranjeriaProcedure | null {
  if (!key) return null;
  return EXTRANJERIA_PROCEDURES.find((item) => item.key === key) || null;
}

export function getProcedureKeys(): string[] {
  return EXTRANJERIA_PROCEDURES.map((item) => item.key);
}
