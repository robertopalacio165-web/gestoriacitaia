import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const url = new URL(window.location.href);

    const token = url.searchParams.get("token");
    const appointmentId = url.searchParams.get("appointment_id");

    // دابا غير نرجعو للconfirm (Step 2 غنزيدو logic)
    setTimeout(() => {
      setLocation(`/confirmar?token=${token}&appointment_id=${appointmentId}`);
    }, 2000);
  }, []);

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold">Pago completado ✅</h1>
      <p>Redirigiendo...</p>
    </div>
  );
}
