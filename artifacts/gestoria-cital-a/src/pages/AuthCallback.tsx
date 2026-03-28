import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error obteniendo sesión:", error);
        return;
      }

      if (data.session) {
        // ✅ Usuario logueado
        setLocation("/panel");
      } else {
        // ❌ Fallo
        setLocation("/");
      }
    };

    handleAuth();
  }, []);

  return <p>Cargando...</p>;
}
