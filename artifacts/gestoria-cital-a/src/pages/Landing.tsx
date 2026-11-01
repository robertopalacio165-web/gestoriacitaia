import {
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  FileCheck2,
  GraduationCap,
  Globe2,
  Check,
  MessageCircle,
  Plus,
} from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import "@/styles/landing2027.css";

const copy = {
  es: {
    eyebrow: "TU PRÓXIMO PASO, MÁS CLARO",
    title: "Un nuevo destino.",
    accent: "Un buen comienzo.",
    intro:
      "Trabajo en Malta, oportunidades en Italia y revisión de documentos. Encuentra el servicio que necesitas y avanza con la información clara.",
    explore: "Explorar servicios",
    help: "Hablar con nosotros",
    languages: "En español, darija e inglés",
    online: "Gestión online",
    country: "ESPAÑA · ITALIA · MALTA",
    visual: "Tu próximo capítulo empieza aquí.",
    visualSub: "Información, documentos y oportunidades en un mismo lugar.",
    services: "ELIGE TU SIGUIENTE PASO",
    servicesTitle: "¿Qué quieres hacer?",
    servicesSub:
      "Cada objetivo tiene su camino. Descubre qué incluye cada servicio antes de empezar.",
    all: "Todos",
    work: "Trabajo",
    documents: "Documentos",
    study: "Estudios",
    details: "Ver servicio",
    from: "Desde",
    once: "Pago único",
    consult: "Consultar opciones",
    stepsLabel: "ASÍ DE SENCILLO",
    stepsTitle: "De la primera duda al siguiente paso.",
    steps: [
      [
        "Elige tu servicio",
        "Consulta la información, el precio y lo que incluye.",
      ],
      [
        "Prepara tus datos",
        "Completa el formulario y adjunta los documentos que se soliciten.",
      ],
      [
        "Sigue el proceso",
        "Revisa las indicaciones y el correo asociado a tu solicitud.",
      ],
    ],
    faqTitle: "Resolvemos tus dudas.",
    faqLabel: "ANTES DE EMPEZAR",
    faqs: [
      [
        "¿Puedo utilizar la web en darija?",
        "Sí. Puedes cambiar entre darija, español e inglés desde el selector de idioma. La versión en darija se muestra de derecha a izquierda.",
      ],
      [
        "¿El servicio garantiza un empleo o un visado?",
        "No. Consulta el alcance de cada servicio antes de contratar. Las decisiones de contratación y visados corresponden a las empresas y autoridades competentes.",
      ],
      [
        "¿Dónde veo el precio y las condiciones?",
        "En la página de cada servicio, antes del pago. Revisa el contenido incluido, los requisitos y las condiciones aplicables.",
      ],
      [
        "¿Cómo puedo contactar?",
        "Visita nuestra página de contacto o escribe a jobs@gestoriacitaia.com indicando el servicio sobre el que necesitas ayuda.",
      ],
    ],
    contactTitle: "El siguiente paso empieza con una pregunta.",
    contactText: "Cuéntanos qué necesitas y consulta las opciones disponibles.",
    footer: "Información clara para nuevos comienzos.",
    legal: "Aviso legal",
    privacy: "Privacidad",
    cookies: "Cookies",
    contact: "Contacto",
    notice:
      "Servicio privado e independiente. No somos una administración pública. La información es orientativa y no sustituye asesoramiento legal profesional.",
    cards: [
      [
        "Trabajo en Malta",
        "Accede a las ofertas disponibles y conoce los datos de las empresas para preparar tu candidatura.",
        "Ofertas y contactos",
      ],
      [
        "Decreto Flussi 2027",
        "Consulta los paquetes de ofertas de trabajo en Italia y elige la modalidad que encaja contigo.",
        "Oportunidades en Italia",
      ],
      [
        "Revisión de documentos",
        "Solicita la revisión de tus documentos de Decreto Flussi y consulta el alcance del informe.",
        "Documentación italiana",
      ],
      [
        "Estudiar en Malta",
        "Descubre el servicio de orientación para preparar tu próximo paso académico en Malta.",
        "Estudios · 2027",
      ],
    ],
  },
  en: {
    eyebrow: "YOUR NEXT STEP, MADE CLEAR",
    title: "A new destination.",
    accent: "A better beginning.",
    intro:
      "Work in Malta, opportunities in Italy and document reviews. Find the service you need and move forward with clear information.",
    explore: "Explore services",
    help: "Contact us",
    languages: "Spanish, Darija and English",
    online: "Online services",
    country: "SPAIN · ITALY · MALTA",
    visual: "Your next chapter starts here.",
    visualSub: "Information, documents and opportunities in one place.",
    services: "CHOOSE YOUR NEXT STEP",
    servicesTitle: "What would you like to do?",
    servicesSub:
      "Every goal has its own path. Explore what each service includes before you start.",
    all: "All",
    work: "Work",
    documents: "Documents",
    study: "Study",
    details: "View service",
    from: "From",
    once: "One-time payment",
    consult: "Explore options",
    stepsLabel: "HOW IT WORKS",
    stepsTitle: "From your first question to your next step.",
    steps: [
      [
        "Choose a service",
        "Check the information, price and what is included.",
      ],
      [
        "Prepare your details",
        "Complete the form and attach any requested documents.",
      ],
      [
        "Follow the process",
        "Check the instructions and the email associated with your request.",
      ],
    ],
    faqTitle: "Your questions, answered.",
    faqLabel: "BEFORE YOU START",
    faqs: [
      [
        "Can I use this website in Darija?",
        "Yes. Switch between Darija, Spanish and English using the language selector. Darija is displayed from right to left.",
      ],
      [
        "Does the service guarantee a job or a visa?",
        "No. Check each service’s scope before purchasing. Hiring and visa decisions are made by employers and the relevant authorities.",
      ],
      [
        "Where can I see prices and terms?",
        "On each service page, before payment. Review the included content, requirements and applicable terms.",
      ],
      [
        "How do I get in touch?",
        "Visit our contact page or email jobs@gestoriacitaia.com and tell us which service you need help with.",
      ],
    ],
    contactTitle: "Your next step starts with a question.",
    contactText: "Tell us what you need and explore the available options.",
    footer: "Clear information for new beginnings.",
    legal: "Legal notice",
    privacy: "Privacy",
    cookies: "Cookies",
    contact: "Contact",
    notice:
      "An independent private service, not a public authority. Information is for guidance and does not replace professional legal advice.",
    cards: [
      [
        "Work in Malta",
        "Access available opportunities and company details to prepare your application.",
        "Jobs and contacts",
      ],
      [
        "Decreto Flussi 2027",
        "Explore job offer packages in Italy and choose the option that suits you.",
        "Opportunities in Italy",
      ],
      [
        "Document review",
        "Request a review of your Decreto Flussi documents and check what the report covers.",
        "Italian documents",
      ],
      [
        "Study in Malta",
        "Explore the guidance service to prepare your next academic step in Malta.",
        "Study · 2027",
      ],
    ],
  },
  darija: {
    eyebrow: "الخطوة الجاية ديالك، بوضوح",
    title: "وجهة جديدة.",
    accent: "بداية مزيانة.",
    intro:
      "الخدمة فمالطا، فرص فإيطاليا ومراجعة الوثائق. لقى الخدمة اللي محتاج، وفهم التفاصيل قبل ما تبدا.",
    explore: "شوف الخدمات",
    help: "تواصل معانا",
    languages: "بالدارجة، الإسبانية والإنجليزية",
    online: "خدمات أونلاين",
    country: "إسبانيا · إيطاليا · مالطا",
    visual: "البداية الجديدة ديالك كتبدا من هنا.",
    visualSub: "المعلومات، الوثائق والفرص، مجموعين فبلاصة وحدة.",
    services: "اختار الخطوة الجاية ديالك",
    servicesTitle: "شنو باغي تدير؟",
    servicesSub: "كل هدف عندو طريق. شوف شنو داخل فكل خدمة قبل ما تبدا.",
    all: "الكل",
    work: "الخدمة",
    documents: "الوثائق",
    study: "القراية",
    details: "شوف التفاصيل",
    from: "ابتداءً من",
    once: "خلاص مرة وحدة",
    consult: "شوف الاختيارات",
    stepsLabel: "كيفاش كتبدا",
    stepsTitle: "من أول سؤال، للخطوة الجاية.",
    steps: [
      ["اختار الخدمة", "قرا المعلومات والثمن وشنو داخل فالخدمة."],
      ["وجد المعلومات ديالك", "عمر الفورميلير وزيد الوثائق اللي مطلوبين."],
      ["تبع المراحل", "شوف التعليمات وراقب الإيميل اللي سجلتي به."],
    ],
    faqTitle: "أجوبة على الأسئلة ديالك.",
    faqLabel: "قبل ما تبدا",
    faqs: [
      [
        "واش نقدر نستعمل الموقع بالدارجة؟",
        "إييه. تقدر تبدل بين الدارجة والإسبانية والإنجليزية من اختيار اللغة. الدارجة كتبان من اليمين لليسار.",
      ],
      [
        "واش الخدمة كتضمن ليا عقد ولا فيزا؟",
        "لا. قرا شنو كتقدم كل خدمة قبل ما تخلص. قرار التشغيل والفيزا كيبقى عند الشركات والجهات المختصة.",
      ],
      [
        "فين نشوف الثمن والشروط؟",
        "فصفحة كل خدمة، قبل الخلاص. شوف شنو داخل فالخدمة، الشروط والوثائق المطلوبة.",
      ],
      [
        "كيفاش نتواصل معاكم؟",
        "دخل لصفحة التواصل ولا صيفط ل jobs@gestoriacitaia.com ووضح لينا شنو هي الخدمة اللي محتاج فيها المساعدة.",
      ],
    ],
    contactTitle: "الخطوة الجاية كتبدا بسؤال.",
    contactText: "قول لينا شنو محتاج وشوف الاختيارات المتاحة.",
    footer: "معلومات واضحة لبداية جديدة.",
    legal: "إشعار قانوني",
    privacy: "الخصوصية",
    cookies: "الكوكيز",
    contact: "التواصل",
    notice:
      "خدمة خاصة ومستقلة، ماشي إدارة عمومية. المعلومات للتوجيه وما كتعوضش استشارة قانونية مهنية.",
    cards: [
      [
        "الخدمة فمالطا",
        "شوف عروض الخدمة المتاحة ومعلومات الشركات باش توجد الترشيح ديالك.",
        "عروض ومعلومات التواصل",
      ],
      [
        "Decreto Flussi 2027",
        "شوف باقات عروض الخدمة فإيطاليا واختار اللي مناسب ليك.",
        "فرص فإيطاليا",
      ],
      [
        "مراجعة الوثائق",
        "طلب مراجعة وثائق ديكريتو فلوسي ديالك وشوف شنو كيشمل التقرير.",
        "الوثائق الإيطالية",
      ],
      [
        "القراية فمالطا",
        "تعرف على خدمة التوجيه باش توجد الخطوة الجاية ديالك للقراية فمالطا.",
        "القراية · 2027",
      ],
    ],
  },
};
import { useState } from "react";
const services = [
  {
    href: "/trabajo-malta",
    flag: "🇲🇹",
    category: "work",
    price: "19,99 €",
    icon: BriefcaseBusiness,
    tone: "mint",
  },
  {
    href: "/decreto-flussi-2027",
    flag: "🇮🇹",
    category: "work",
    price: "14,99 €",
    icon: Globe2,
    tone: "blue",
  },
  {
    href: "/verificar-decreto-flussi",
    flag: "🇮🇹",
    category: "documents",
    price: null,
    icon: FileCheck2,
    tone: "sand",
  },
  {
    href: "/estudiar-en-malta-2027",
    flag: "🇲🇹",
    category: "study",
    price: "14,99 €",
    icon: GraduationCap,
    tone: "lilac",
  },
];
export default function Landing() {
  const { lang, isRTL } = useLang();
  const c = copy[lang];
  const [filter, setFilter] = useState("all");
  return (
    <div className="landing-2027" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      <main id="main-content">
        <section className="new-hero shell">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" />
              {c.eyebrow}
            </p>
            <h1>
              {c.title}
              <br />
              <span>{c.accent}</span>
            </h1>
            <p className="hero-intro">{c.intro}</p>
            <div className="hero-actions">
              <a className="action-primary" href="#services">
                {c.explore}
                <ArrowRight size={19} />
              </a>
              <Link className="action-text" href="/contacto">
                {c.help}
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="hero-meta">
              <span>
                <Globe2 size={16} />
                {c.languages}
              </span>
              <span>
                <Check size={16} />
                {c.online}
              </span>
            </div>
          </div>
          <div className="destination-art">
            <div className="art-top">
              <span>
                GESTORIA<span className="text-emerald-300">CITA</span>IA
              </span>
              <Globe2 size={23} />
            </div>
            <div className="orbital" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="globe-core">
                <Globe2 strokeWidth={0.65} />
              </div>
              <span className="country-pin pin-it">
                🇮🇹 <b>Italia</b>
              </span>
              <span className="country-pin pin-mt">
                🇲🇹 <b>Malta</b>
              </span>
              <span className="country-pin pin-es">
                🇪🇸 <b>España</b>
              </span>
              <span className="map-dot dot-one" />
              <span className="map-dot dot-two" />
            </div>
            <div className="art-caption">
              <p>{c.country}</p>
              <h2>{c.visual}</h2>
              <span>{c.visualSub}</span>
            </div>
            <div className="art-bottom">
              <span dir="ltr">ES / دارجة / EN</span>
              <span>→</span>
            </div>
          </div>
        </section>
        <section className="services-section" id="services">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{c.services}</p>
                <h2>{c.servicesTitle}</h2>
              </div>
              <p>{c.servicesSub}</p>
            </div>
            <div
              className="service-filters"
              role="group"
              aria-label={c.servicesTitle}
            >
              {(["all", "work", "documents", "study"] as const).map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {c[f]}
                </button>
              ))}
            </div>
            <div className="service-grid">
              {services.map(
                (s, i) =>
                  (filter === "all" || filter === s.category) && (
                    <article
                      key={s.href}
                      className={`service-card tone-${s.tone}`}
                    >
                      <div className="service-card-top">
                        <span className="service-icon">
                          <s.icon size={25} strokeWidth={1.6} />
                        </span>
                        <span className="service-flag" aria-hidden="true">
                          {s.flag}
                        </span>
                      </div>
                      <p className="service-kicker">{c.cards[i][2]}</p>
                      <h3>{c.cards[i][0]}</h3>
                      <p className="service-description">{c.cards[i][1]}</p>
                      <div className="service-card-bottom">
                        <div>
                          {s.price ? (
                            <>
                              <small>{i === 1 ? c.from : c.once}</small>
                              <strong dir="ltr">{s.price}</strong>
                            </>
                          ) : (
                            <small>{c.consult}</small>
                          )}
                        </div>
                        <Link
                          href={s.href}
                          aria-label={`${c.details}: ${c.cards[i][0]}`}
                          className="service-link"
                        >
                          <ArrowUpRight size={22} />
                        </Link>
                      </div>
                      <Link href={s.href} className="service-detail">
                        {c.details}
                        <ArrowRight size={15} />
                      </Link>
                    </article>
                  ),
              )}
            </div>
          </div>
        </section>
        <section className="steps-section shell">
          <div>
            <p className="eyebrow">{c.stepsLabel}</p>
            <h2>{c.stepsTitle}</h2>
            <Link href="/contacto" className="action-text">
              {c.help}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <ol>
            {c.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="step-number">0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <Check size={18} />
              </li>
            ))}
          </ol>
        </section>
        <section className="faq-section shell">
          <div>
            <p className="eyebrow">{c.faqLabel}</p>
            <h2>{c.faqTitle}</h2>
          </div>
          <div>
            {c.faqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={20} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="contact-banner shell">
          <div>
            <MessageCircle size={28} />
            <h2>{c.contactTitle}</h2>
            <p>{c.contactText}</p>
          </div>
          <Link className="action-primary" href="/contacto">
            {c.help}
            <ArrowUpRight size={19} />
          </Link>
        </section>
      </main>
      <footer className="new-footer shell">
        <div className="footer-top">
          <div>
            <Link href="/" className="brand-word" dir="ltr">
              Gestoria<span>Cita</span>IA
            </Link>
            <p>{c.footer}</p>
          </div>
          <nav aria-label={c.legal}>
            <Link href="/aviso-legal">{c.legal}</Link>
            <Link href="/privacidad">{c.privacy}</Link>
            <Link href="/cookies">{c.cookies}</Link>
            <Link href="/contacto">{c.contact}</Link>
          </nav>
        </div>
        <p className="footer-notice">{c.notice}</p>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} GestoriaCitaIA</span>
          <a href="mailto:jobs@gestoriacitaia.com">jobs@gestoriacitaia.com</a>
        </div>
      </footer>
    </div>
  );
}
