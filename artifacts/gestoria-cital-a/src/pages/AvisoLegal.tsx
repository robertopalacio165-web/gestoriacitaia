import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function AvisoLegal() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Aviso Legal</h1>
            <p className="text-xs text-muted-foreground">Última actualización: enero 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-white/80 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-white mb-3">1. Identificación del titular</h2>
            <p>En cumplimiento con la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se informa de los siguientes datos identificativos:</p>
            <div className="mt-3 glass-panel border border-white/[0.07] rounded-xl p-4 space-y-1.5 text-xs">
              <p><span className="text-muted-foreground">Denominación social:</span> <span className="text-white font-medium">GestoriaCitaIA S.L. (en constitución)</span></p>
              <p><span className="text-muted-foreground">Actividad:</span> <span className="text-white font-medium">Asistente IA para organización documental e información sobre extranjería</span></p>
              <p><span className="text-muted-foreground">Email de contacto:</span> <span className="text-white font-medium">legal@gestoriacitaia.com</span></p>
              <p><span className="text-muted-foreground">País:</span> <span className="text-white font-medium">España</span></p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">2. Objeto y naturaleza del servicio</h2>
            <div className="bg-amber-950/40 border border-amber-600/30 rounded-xl p-4 mb-4">
              <p className="text-amber-200 font-medium text-xs mb-2">⚠️ AVISO IMPORTANTE — LEER CON ATENCIÓN</p>
              <p className="text-amber-200/80 text-xs leading-relaxed">
                GestoriaCitaIA <strong>NO es una gestoría administrativa, NO es un despacho de abogados, NO es un servicio de asesoría jurídica</strong> y NO está sujeta a ningún colegio profesional de gestores o abogados. Los servicios prestados consisten exclusivamente en:
              </p>
            </div>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Asistencia mediante inteligencia artificial para <strong>organizar y revisar documentos</strong> de cara a trámites de extranjería.</li>
              <li>Información y explicación sobre los <strong>requisitos generales</strong> de los trámites de extranjería en España.</li>
              <li>Ayuda para <strong>buscar disponibilidad de citas previas</strong> en organismos oficiales a través de medios públicos.</li>
              <li>Orientación general de carácter <strong>no vinculante y sin valor jurídico</strong>.</li>
            </ul>
            <p className="mt-3 text-white/60">GestoriaCitaIA <strong>no realiza trámites en nombre del usuario</strong>, no le representa ante ninguna administración pública, no actúa como intermediaria oficial y no sustituye en ningún caso la actuación de un gestor administrativo colegiado o un abogado especialista en extranjería.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">3. Limitación de responsabilidad</h2>
            <p>La información proporcionada por el asistente IA tiene carácter meramente orientativo. GestoriaCitaIA no garantiza la exactitud, completitud ni vigencia de la información facilitada. El usuario es el único responsable de las decisiones que tome basándose en la información proporcionada.</p>
            <p className="mt-2">GestoriaCitaIA no se hace responsable de:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Errores u omisiones en la información ofrecida.</li>
              <li>Cambios en la normativa de extranjería que no hayan sido actualizados en el sistema.</li>
              <li>Resultado de ningún trámite administrativo.</li>
              <li>Pérdida de datos del usuario por causas ajenas a la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">4. Propiedad intelectual</h2>
            <p>Todos los contenidos del sitio web (textos, imágenes, logotipos, diseño, código fuente) son propiedad de GestoriaCitaIA o de sus licenciantes, estando protegidos por la legislación española e internacional sobre propiedad intelectual e industrial. Queda prohibida su reproducción, distribución o comunicación pública sin autorización expresa.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">5. Legislación aplicable y jurisdicción</h2>
            <p>El presente aviso legal se rige por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales de España, salvo que la normativa aplicable establezca un fuero diferente.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">6. Contacto</h2>
            <p>Para cualquier consulta legal: <a href="mailto:legal@gestoriacitaia.com" className="text-primary hover:underline">legal@gestoriacitaia.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
