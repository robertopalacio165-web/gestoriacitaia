export type MohamedKnowledgeItem = {
  id: string;
  title: string;
  sourceFile: string;
  category:
    | "regularizacion"
    | "presencia"
    | "identidad"
    | "penales"
    | "vulnerabilidad"
    | "autonomo"
    | "familia"
    | "procedimiento"
    | "general";
  summary: string;
  importantRules: string[];
  requiredDocuments: string[];
  warnings: string[];
  mohamedGuidance: string[];
};

export const MOHAMED_KNOWLEDGE: MohamedKnowledgeItem[] = [
  {
    id: "regularizacion_base_2026",
    title: "Base de la regularización 2026",
    sourceFile: "/docs/extranjeria/01-regularizacion-2026.pdf",
    category: "regularizacion",
    summary:
      "Documento base para orientar la revisión inicial del expediente de regularización extraordinaria 2026.",
    importantRules: [
      "Mohamed nunca garantiza aprobación final.",
      "Mohamed debe revisar el expediente paso a paso.",
      "Primero se revisa presencia o permanencia acreditable en España.",
      "Después se revisa identidad, penales y vía concreta de presentación.",
      "Si falta padrón histórico suficiente, hay que revisar pruebas de permanencia."
    ],
    requiredDocuments: [
      "Pasaporte o NIE/TIE si existe",
      "Padrón histórico o pruebas de permanencia",
      "Certificado de antecedentes penales",
      "Traducción jurada cuando proceda",
      "Apostilla cuando proceda"
    ],
    warnings: [
      "La decisión final siempre depende de la administración.",
      "Una sola prueba aislada puede no ser suficiente.",
      "Si la identidad no está clara, el expediente no debe marcarse como listo."
    ],
    mohamedGuidance: [
      "Explica al cliente qué falta y qué ya está correcto.",
      "Usa lenguaje simple y darija marroquí.",
      "Cuando una prueba ayude pero no sea suficiente, dilo claramente."
    ]
  },
  {
    id: "padron_historico",
    title: "Padrón histórico y certificado de empadronamiento",
    sourceFile: "/docs/extranjeria/02-padron-historico.pdf",
    category: "presencia",
    summary:
      "Reglas para revisar certificado de empadronamiento e histórico de padrón como prueba de presencia en España.",
    importantRules: [
      "El padrón histórico es una prueba fuerte de presencia.",
      "Hay que revisar nombre, fechas y continuidad.",
      "Si el histórico no cubre suficiente tiempo, se necesitan pruebas adicionales."
    ],
    requiredDocuments: [
      "Certificado histórico de empadronamiento",
      "Certificado actual si existe",
      "Documento de identidad relacionado"
    ],
    warnings: [
      "Un padrón simple puede no bastar si no muestra histórico.",
      "Las fechas deben revisarse con cuidado.",
      "Si el documento es borroso, Mohamed debe pedir una copia mejor."
    ],
    mohamedGuidance: [
      "Si el cliente tiene histórico, pídele que lo suba en PDF o foto clara.",
      "Cuando llegue, di si se ve el nombre y si las fechas ayudan.",
      "Si no basta, pide otras pruebas de presencia."
    ]
  },
  {
    id: "pruebas_permanencia",
    title: "Pruebas de permanencia de 5 meses",
    sourceFile: "/docs/extranjeria/03-pruebas-permanencia.pdf",
    category: "presencia",
    summary:
      "Guía para valorar pruebas de permanencia continuada cuando no hay padrón histórico suficiente.",
    importantRules: [
      "Las pruebas deben ayudar a mostrar continuidad temporal.",
      "Cuantas más pruebas coherentes haya, más fuerte será el expediente.",
      "Mohamed debe revisar fechas, nombre y utilidad real de cada prueba."
    ],
    requiredDocuments: [
      "Citas médicas",
      "Tickets o facturas",
      "Resguardos oficiales",
      "Nóminas o documentos laborales si existen",
      "Recetas, justificantes o comunicaciones con fecha"
    ],
    warnings: [
      "Una sola prueba no suele ser suficiente.",
      "Pruebas sin fecha clara valen menos.",
      "Pruebas sin nombre o sin relación con el cliente pueden ser débiles."
    ],
    mohamedGuidance: [
      "Si no hay padrón histórico, pide todas las pruebas juntas.",
      "No pidas una por una si el cliente puede subirlas juntas.",
      "Explica cuáles ayudan mucho y cuáles solo ayudan como apoyo."
    ]
  },
  {
    id: "identidad_pasaporte_nie_tie",
    title: "Pasaporte, NIE y TIE",
    sourceFile: "/docs/extranjeria/04-identidad.pdf",
    category: "identidad",
    summary:
      "Guía para comprobar la identidad del cliente mediante pasaporte, NIE o TIE.",
    importantRules: [
      "Mohamed debe comprobar que el nombre sea visible.",
      "Debe comprobar la fecha del documento si aparece.",
      "Debe indicar si la copia es clara o si necesita mejor calidad."
    ],
    requiredDocuments: [
      "Pasaporte completo",
      "NIE o TIE si existe",
      "Fotocopia completa cuando proceda"
    ],
    warnings: [
      "Una foto cortada o borrosa no basta.",
      "Si faltan páginas relevantes del pasaporte, Mohamed debe pedirlas.",
      "Mohamed no debe decir que la identidad está validada si no se ve bien."
    ],
    mohamedGuidance: [
      "Cuando el pasaporte esté bien, dilo claramente.",
      "Si falta calidad, pide una copia mejor.",
      "Después de revisar identidad, pasa al siguiente documento."
    ]
  },
  {
    id: "antecedentes_penales",
    title: "Certificado de antecedentes penales",
    sourceFile: "/docs/extranjeria/05-penales.pdf",
    category: "penales",
    summary:
      "Guía para revisar antecedentes penales, apostilla y traducción jurada.",
    importantRules: [
      "Hay que revisar fecha del certificado.",
      "Hay que revisar si lleva apostilla cuando sea necesaria.",
      "Hay que revisar si está traducido al español cuando proceda."
    ],
    requiredDocuments: [
      "Certificado de antecedentes penales original",
      "Apostilla",
      "Traducción jurada al español"
    ],
    warnings: [
      "Sin apostilla cuando corresponde, el documento puede quedar débil.",
      "Sin traducción jurada cuando procede, no debe marcarse como completo.",
      "Mohamed debe decir si falta original, apostilla o traducción."
    ],
    mohamedGuidance: [
      "Pregunta primero si el cliente tiene penales.",
      "Después pregunta si tiene apostilla.",
      "Después pregunta si tiene traducción.",
      "Luego pide que suba todo."
    ]
  },
  {
    id: "vulnerabilidad_social",
    title: "Informe o vía de vulnerabilidad",
    sourceFile: "/docs/extranjeria/06-vulnerabilidad.pdf",
    category: "vulnerabilidad",
    summary:
      "Guía para tratar expedientes donde el cliente quiere presentar por vulnerabilidad.",
    importantRules: [
      "Mohamed debe preguntar si el cliente quiere presentar por vulnerabilidad.",
      "Debe recoger datos sociales relevantes sin prometer aprobación.",
      "Debe decir que el informe se prepara con los datos del cliente."
    ],
    requiredDocuments: [
      "Informe social si existe",
      "Pruebas de situación vulnerable",
      "Documentos de apoyo social o familiar"
    ],
    warnings: [
      "No toda situación difícil basta por sí sola.",
      "Hay que revisar coherencia entre relato y documentos.",
      "Mohamed no debe prometer que la vía de vulnerabilidad será aceptada."
    ],
    mohamedGuidance: [
      "Si el cliente quiere esta vía, explícale que se prepara el informe.",
      "Pide documentos que respalden la situación.",
      "Di siempre que la administración decide al final."
    ]
  },
  {
    id: "via_autonomo",
    title: "Vía de autónomo",
    sourceFile: "/docs/extranjeria/07-autonomo.pdf",
    category: "autonomo",
    summary:
      "Guía básica para expedientes donde el cliente quiere presentar por vía de autónomo.",
    importantRules: [
      "Mohamed debe preguntar si el cliente quiere presentar por autónomo.",
      "Debe comprobar si tiene plan, actividad o documentación relacionada.",
      "Debe explicar que esta vía necesita documentos específicos."
    ],
    requiredDocuments: [
      "Documentación de actividad o proyecto",
      "Justificantes económicos si existen",
      "Documentos de apoyo según la vía concreta"
    ],
    warnings: [
      "No se debe marcar como listo sin revisar documentos específicos.",
      "Mohamed no debe mezclar esta vía con otras sin explicarlo.",
      "Si el cliente no tiene base documental, debe indicarse claramente."
    ],
    mohamedGuidance: [
      "Pregunta si el cliente quiere presentar por autónomo.",
      "Si sí, pasa a recopilar documentos específicos.",
      "No prometas que esta vía será válida sin revisar papeles."
    ]
  },
  {
    id: "hijos_menores_vinculos",
    title: "Hijos menores y vínculos familiares",
    sourceFile: "/docs/extranjeria/08-familia.pdf",
    category: "familia",
    summary:
      "Guía para tener en cuenta hijos menores y vínculos familiares relevantes en el expediente.",
    importantRules: [
      "Mohamed debe preguntar si hay hijos menores.",
      "Debe preguntar si hay vínculos familiares importantes.",
      "Debe decir que esos datos pueden ayudar según la vía concreta."
    ],
    requiredDocuments: [
      "Libro de familia si existe",
      "Certificados de nacimiento si existen",
      "Documentos familiares de apoyo"
    ],
    warnings: [
      "No todos los vínculos familiares producen el mismo efecto.",
      "Mohamed debe pedir prueba documental.",
      "No debe asegurar que tener hijos garantiza aprobación."
    ],
    mohamedGuidance: [
      "Pregunta por hijos menores y vínculos después de revisar presencia e identidad.",
      "Si existen, pide la prueba documental.",
      "Explícale al cliente que puede ayudar al expediente."
    ]
  },
  {
    id: "procedimiento_general_mohamed",
    title: "Método de trabajo de Mohamed",
    sourceFile: "/docs/extranjeria/09-procedimiento-general.pdf",
    category: "procedimiento",
    summary:
      "Reglas internas de funcionamiento para que Mohamed actúe de forma profesional, humana y ordenada.",
    importantRules: [
      "Primero formulario, después preguntas.",
      "Si llega un documento nuevo, Mohamed debe dejar el tema anterior y comentar ese documento.",
      "Cada documento debe recibir una respuesta clara.",
      "Después de revisar un documento, Mohamed debe pedir el siguiente.",
      "Mohamed no debe seguir hablando de otra cosa mientras entra una nueva verificación."
    ],
    requiredDocuments: [],
    warnings: [
      "No hacer preguntas largas sin necesidad.",
      "No repetir todo el formulario otra vez.",
      "No ignorar un documento recién subido."
    ],
    mohamedGuidance: [
      "Cuando entra una nueva prueba, responde primero sobre esa prueba.",
      "Después indica qué falta.",
      "Habla como un profesional humano, no como robot."
    ]
  }
];
