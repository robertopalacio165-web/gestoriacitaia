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
import TrabajoMalta from "@/pages/TrabajoMalta";
import EstudiarMalta2027 from "@/pages/EstudiarMalta2027";
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
      {/* LANDING */}
      <Route path="/" component={Landing} />

      {/* AUTENTICACIÓN */}
      <Route path="/auth/callback" component={AuthCallback} />

      {/* PANEL */}
      <Route path="/panel" component={Panel} />

      {/* CITAS */}
      <Route path="/buscar-citas" component={BuscarCitas} />

      {/* DECRETO FLUSSI */}
      <Route
        path="/verificar-decreto-flussi"
        component={VerificarDecretoFlussi}
      />

      {/* TRABAJO EN MALTA */}
      <Route
        path="/trabajo-malta"
        component={TrabajoMalta}
      />

      {/* ESTUDIAR EN MALTA 2027 */}
      <Route
        path="/estudiar-en-malta-2027"
        component={EstudiarMalta2027}
      />

      {/* PÁGINAS LEGALES */}
      <Route path="/aviso-legal" component={AvisoLegal} />

      <Route path="/privacidad" component={Privacidad} />

      <Route path="/cookies" component={CookiesPage} />

      {/* CONTACTO */}
      <Route
        path="/contacto"
        component={Contacto}
      />

      {/* CHECKOUT */}
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
