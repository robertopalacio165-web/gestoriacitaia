import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Panel from "@/pages/Panel";
import BuscarCitas from "@/pages/BuscarCitas";
import VerificarDecretoFlussi from "@/pages/VerificarDecretoFlussi";
import AvisoLegal from "@/pages/AvisoLegal";
import Privacidad from "@/pages/Privacidad";
import CookiesPage from "@/pages/Cookies";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";
import AuthCallback from "@/pages/AuthCallback";
import Confirmar from "@/pages/Confirmar";
import KhalidExtranjeria from "@/pages/KhalidExtranjeria";
import TrabajoMalta from "@/pages/TrabajoMalta"; // ✅ NUEVA IMPORTACIÓN
import Contacto from "@/pages/Contacto";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />

      <Route path="/auth/callback" component={AuthCallback} />

      <Route path="/panel" component={Panel} />

      <Route path="/buscar-citas" component={BuscarCitas} />

    <Route
  path="/verificar-decreto-flussi"
  component={VerificarDecretoFlussi}
/>

      <Route
        path="/khalid-extranjeria"
        component={KhalidExtranjeria}
      />

      {/* ✅ NUEVA RUTA PARA TRABAJO MALTA */}
      <Route
        path="/trabajo-malta"
        component={TrabajoMalta}
      />

      <Route path="/aviso-legal" component={AvisoLegal} />

      <Route path="/privacidad" component={Privacidad} />

      <Route path="/cookies" component={CookiesPage} />
      <Route
  path="/contacto"
  component={Contacto}
/>

      <Route
        path="/checkout/success"
        component={CheckoutSuccess}
      />

      <Route
        path="/checkout/cancelado"
        component={CheckoutCancel}
      />

      {/* CONFIRMAR CITA */}
      <Route
        path="/confirmar-cita"
        component={Confirmar}
      />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <div translate="no" className="notranslate">
          <WouterRouter
            base={import.meta.env.BASE_URL.replace(/\/$/, "")}
          >
            <Router />
          </WouterRouter>

          <Toaster />
        </div>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
