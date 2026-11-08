export const SITE_URL = 'https://www.gestoriacitaia.com';
export const publicPages: Record<string, {title: string; description: string}> = {
 '/': {title: 'GestoriaCitaIA | Extranjería, Decreto Flussi y trabajo en Malta', description: 'Información de extranjería en España, revisión de documentos, Decreto Flussi 2027 y trabajo y estudios en Malta. Atención en español, inglés y darija.'},
 '/decreto-flussi-2027': {title: 'Decreto Flussi 2027: ofertas y orientación | GestoriaCitaIA', description: 'Consulta ofertas relacionadas con Decreto Flussi 2027 y orientación sobre documentos. Información independiente; sin garantía de contrato ni visado.'},
 '/verificar-decreto-flussi': {title: 'Revisión de documentos Decreto Flussi | GestoriaCitaIA', description: 'Revisa tus documentos relacionados con Decreto Flussi y recibe un informe orientativo. No sustituye la validación de las autoridades italianas.'},
 '/trabajo-malta': {title: 'Trabajo en Malta: ofertas y preparación de CV | GestoriaCitaIA', description: 'Consulta ofertas de empleo en Malta y prepara tu CV y carta de presentación en inglés. Revisa los requisitos de cada empresa; sin garantía de contratación.'},
 '/estudiar-en-malta-2027': {title: 'Estudiar en Malta 2027: información y orientación | GestoriaCitaIA', description: 'Información y orientación para preparar tus estudios en Malta en 2027. Consulta los documentos y condiciones antes de comenzar tu solicitud.'},
 '/buscar-citas': {title: 'Expedientes de extranjería y documentos | GestoriaCitaIA', description: 'Herramientas de orientación y seguimiento de expedientes de extranjería en España. Plataforma independiente de la Administración.'},
 '/contacto': {title: 'Contacto | GestoriaCitaIA', description: 'Contacta con GestoriaCitaIA para consultar tus dudas sobre la plataforma y sus servicios digitales.'},
 '/aviso-legal': {title: 'Aviso legal | GestoriaCitaIA', description: 'Información legal, condiciones de uso y alcance de los servicios digitales de GestoriaCitaIA.'},
 '/privacidad': {title: 'Política de privacidad | GestoriaCitaIA', description: 'Consulta cómo GestoriaCitaIA trata los datos personales y cómo ejercer tus derechos de privacidad.'},
 '/cookies': {title: 'Política de cookies | GestoriaCitaIA', description: 'Información sobre el uso de cookies en GestoriaCitaIA.'},
};
export function canonicalPath(path: string) {
 const normalized = path.replace(/\/+$/, '') || '/';
 return normalized === '/estudiar-malta-2027' ? '/estudiar-en-malta-2027' : normalized;
}
