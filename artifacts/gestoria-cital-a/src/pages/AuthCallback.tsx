import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const finishLogin = async () => {
      try {
        // Para OAuth con Supabase en navegador
        await supabase.auth.getSession();

        // Si quieres, aquí puedes comprobar si existe sesión
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          navigate("/login");
          return;
        }

        // Entra al panel personal
        navigate("/panel");
      } catch (err) {
        console.error("Error en callback OAuth:", err);
        navigate("/login");
      }
    };

    finishLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      Entrando a tu panel...
    </div>
  );
}
