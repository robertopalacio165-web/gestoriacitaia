import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error en sesión:", error);
        setLocation("/");
        return;
      }

      if (data.session) {
        setLocation("/panel");
      } else {
        setLocation("/");
      }
    };

    handleAuth();
  }, [setLocation]);

  return <p>Entrando...</p>;
}
