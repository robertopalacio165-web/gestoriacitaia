import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Política de Privacidad</h1>
            <p className="text-xs text-muted-foreground">Última actualización: enero 2026 · Cumplimiento RGPD / LOPDGDD</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-white/80 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-white mb-3">1. Responsable del tratamiento</h2>
            <div className="glass-panel border border-white/[0.07] rounded-xl p-4 space-y-1.5 text-xs">
              <p><span className="text-muted-foreground">Responsable:</span> <span className="text-white font-medium">GestoriaCitaIA S.L.</span></p>
              <p><span className="text-muted-foreground">Finalidad principal:</span> <span className="text-white font-medium">Prestación del servicio de asistente IA para organización de documentos de extranjería</span></p>
              <p><span className="text-muted-foreground">DPO / Contacto privacidad:</span> <span className="text-white font-medium">privacidad@gestoriacitaia.com</span></p>
              <p><span className="text-muted-foreground">Base legal:</span> <span className="text-white font-medium">Ejecución de contrato (Art. 6.1.b RGPD) + Consentimiento (Art. 6.1.a RGPD)</span></p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes datos para prestar el servicio:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-2">
              <li><strong>Datos de registro:</strong> nombre, correo electrónico, número de teléfono.</li>
              <li><strong>Datos de identificación:</strong> NIE, número de pasaporte (solo para verificación interna).</li>
              <li><strong>Documentos:</strong> copias digitales de documentos de extranjería que el usuario carga voluntariamente.</li>
              <li><strong>Datos de uso:</strong> historial de consultas, citas gestionadas, trámites consultados.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, cookies técnicas.</li>
            </ul>
            <p className="mt-3 text-white/60">No recopilamos datos de categorías especiales (salud, raza, religión, etc.) sin consentimiento explícito.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">3. Finalidades del tratamiento</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Prestar el servicio de asistente IA y gestión documental.</li>
              <li>Envío de notificaciones sobre citas y trámites por WhatsApp o email (con consentimiento).</li>
              <li>Mejora del servicio y entrenamiento de modelos IA (datos anonimizados).</li>
              <li>Cumplimiento de obligaciones legales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">4. Derechos del usuario (RGPD)</h2>
            <p>En virtud del Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), tienes los siguientes derechos:</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                ["Acceso", "Conocer qué datos tenemos sobre ti"],
                ["Rectificación", "Corregir datos incorrectos"],
                ["Supresión", "Solicitar el borrado de tus datos"],
                ["Portabilidad", "Recibir tus datos en formato legible"],
                ["Limitación", "Restringir el uso de tus datos"],
                ["Oposición", "Oponerte a ciertos tratamientos"],
              ].map(([d, e]) => (
                <div key={d} className="glass-panel border border-white/[0.07] rounded-xl p-3">
                  <p className="text-xs font-bold text-primary mb-0.5">{d}</p>
                  <p className="text-[11px] text-muted-foreground">{e}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs">Puedes ejercer estos derechos en: <a href="mailto:privacidad@gestoriacitaia.com" className="text-primary hover:underline">privacidad@gestoriacitaia.com</a> o ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.aepd.es</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">5. Conservación de datos</h2>
            <p>Los datos se conservan durante el tiempo necesario para prestar el servicio y durante los plazos legalmente exigidos (máximo 5 años para documentación fiscal y contractual). Los documentos cargados por el usuario se eliminan a petición del mismo o a los 2 años de inactividad.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">6. Cesión de datos</h2>
            <p>No cedemos datos personales a terceros salvo:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Proveedores técnicos bajo contrato de encargado del tratamiento (servidores en la UE).</li>
              <li>Pasarela de pago Stripe (datos de pago, sujetos a su propia política).</li>
              <li>Obligación legal o requerimiento judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">7. Seguridad</h2>
            <p>Aplicamos medidas técnicas y organizativas adecuadas: cifrado SSL/TLS, control de acceso, copias de seguridad cifradas y auditorías periódicas de seguridad. Sin embargo, ningún sistema es 100% seguro; el usuario asume los riesgos residuales inherentes a internet.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
