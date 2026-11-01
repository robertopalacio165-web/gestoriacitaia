import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ArrowUpRight, LogOut, UserRound } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLButtonElement>(null);
  const labels =
    lang === "darija"
      ? {
          services: "الخدمات",
          malta: "الخدمة فمالطا",
          italy: "الخدمة فإيطاليا",
          docs: "مراجعة الوثائق",
          study: "القراية فمالطا",
          menu: "القائمة",
          panel: "الحساب ديالي",
          contact: "التواصل",
          language: "اللغة",
          error: "ما قدرناش ندخلوك. عاود جرب.",
        }
      : lang === "en"
        ? {
            services: "Services",
            malta: "Work in Malta",
            italy: "Work in Italy",
            docs: "Document review",
            study: "Study in Malta",
            menu: "Menu",
            panel: "My account",
            contact: "Contact",
            language: "Language",
            error: "Could not sign in. Please try again.",
          }
        : {
            services: "Servicios",
            malta: "Trabajo en Malta",
            italy: "Trabajo en Italia",
            docs: "Revisar documentos",
            study: "Estudiar en Malta",
            menu: "Menú",
            panel: "Mi cuenta",
            contact: "Contacto",
            language: "Idioma",
            error: "No se pudo iniciar sesión. Inténtalo de nuevo.",
          };
  useEffect(() => {
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setOpen(false);
    setError("");
  }, [location]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  async function login() {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/panel` },
      });
      if (error) setError(labels.error);
    } catch {
      setError(labels.error);
    }
  }
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    setLocation("/");
  }
  const links = [
    { href: "/trabajo-malta", label: labels.malta },
    { href: "/decreto-flussi-2027", label: labels.italy },
    { href: "/verificar-decreto-flussi", label: labels.docs },
    { href: "/estudiar-en-malta-2027", label: labels.study },
  ];
  return (
    <>
      <a className="skip-navigation" href="#main-content">
        {lang === "darija"
          ? "دوز للمحتوى"
          : lang === "en"
            ? "Skip to content"
            : "Saltar al contenido"}
      </a>
      <header className="site-navigation">
        <div className="navigation-inner">
          <Link
            className="navigation-brand"
            href="/"
            dir="ltr"
            onClick={() => setOpen(false)}
          >
            <img src="/images/logo.png" alt="" width="34" height="34" />
            <span>
              Gestoria<span>Cita</span>IA
            </span>
          </Link>
          <nav className="desktop-navigation" aria-label={labels.services}>
            {links.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={location === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contacto"
              aria-current={location === "/contacto" ? "page" : undefined}
            >
              {labels.contact}
            </Link>
          </nav>
          <div className="navigation-actions">
            <select
              aria-label={labels.language}
              value={lang}
              onChange={(e) =>
                setLang(e.target.value as "es" | "en" | "darija")
              }
            >
              <option value="es">ES</option>
              <option value="darija">دارجة</option>
              <option value="en">EN</option>
            </select>
            {user ? (
              <Link className="account-action" href="/panel">
                <UserRound size={16} />
                <span>{labels.panel}</span>
              </Link>
            ) : (
              <button className="account-action" onClick={login}>
                <span>{t("nav_login")}</span>
                <ArrowUpRight size={16} />
              </button>
            )}
            <button
              ref={menuRef}
              className="navigation-toggle"
              onClick={() => setOpen(!open)}
              aria-label={labels.menu}
              aria-expanded={open}
              aria-controls="navigation-menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="navigation-error">
            {error}
          </p>
        )}
        {open && (
          <nav
            className="expanded-navigation"
            id="navigation-menu"
            aria-label={labels.menu}
          >
            <Link href="/" onClick={() => setOpen(false)}>
              {t("nav_inicio")}
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={location === link.href ? "page" : undefined}
              >
                {link.label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <Link href="/buscar-citas" onClick={() => setOpen(false)}>
              {t("nav_citas")}
            </Link>
            <Link href="/panel" onClick={() => setOpen(false)}>
              {labels.panel}
            </Link>
            <Link href="/contacto" onClick={() => setOpen(false)}>
              {labels.contact}
            </Link>
            {user && (
              <button onClick={logout}>
                {t("nav_logout")}
                <LogOut size={16} />
              </button>
            )}
          </nav>
        )}
      </header>
      {open && (
        <button
          className="navigation-backdrop"
          tabIndex={-1}
          aria-label={labels.menu}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
