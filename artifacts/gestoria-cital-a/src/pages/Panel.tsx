import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

export default function Panel() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setLocation("/");
        return;
      }

      setEmail(data.session.user.email || "");
      setLoading(false);
    };

    checkSession();
  }, [setLocation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#08122b", color: "white", padding: "40px" }}>
        Cargando panel...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #050b1a 0%, #08122b 100%)",
        color: "white",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>Panel personal</h1>
      <p style={{ color: "#aab4c8", marginBottom: "30px" }}>
        Has iniciado sesión correctamente.
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "700px",
        }}
      >
        <p style={{ marginBottom: "12px" }}>
          <strong>Email:</strong> {email || "Sin email"}
        </p>
        <p style={{ marginBottom: "12px" }}>
          <strong>Estado:</strong> Sesión activa
        </p>
        <p style={{ marginBottom: "24px" }}>
          <strong>Ruta:</strong> /panel
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => setLocation("/buscar-citas")}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Ir a buscar citas
          </button>

          <button
            onClick={() => setLocation("/regularizacion-2026")}
            style={{
              background: "#16a34a",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Ir a regularización 2026
          </button>

          <button
            onClick={handleLogout}
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
