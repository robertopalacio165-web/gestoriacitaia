import { lazy, Suspense } from "react";
import { PageSeo } from "@/components/PageSeo";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";






const Panel = lazy(() => import("@/pages/Panel"));
const BuscarCitas = lazy(() => import("@/pages/BuscarCitas"));
const VerificarDecretoFlussi = lazy(() => import("@/pages/VerificarDecretoFlussi"));
const DecretoFlussi2027 = lazy(() => import("@/pages/DecretoFlussi2027"));
const AvisoLegal = lazy(() => import("@/pages/AvisoLegal"));
const Privacidad = lazy(() => import("@/pages/Privacidad"));
const CookiesPage = lazy(() => import("@/pages/Cookies"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("@/pages/CheckoutCancel"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Confirmar = lazy(() => import("@/pages/Confirmar"));
const TrabajoMalta = lazy(() => import("@/pages/TrabajoMalta"));
const EstudiarMalta2027 = lazy(() => import("@/pages/EstudiarMalta2027"));
const Contacto = lazy(() => import("@/pages/Contacto"));

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

      {/* ======================================== */}
      {/* LANDING */}
      {/* ======================================== */}

      <Route
        path="/"
        component={Landing}
      />


      {/* ======================================== */}
      {/* AUTENTICACIÓN */}
      {/* ======================================== */}

      <Route
        path="/auth/callback"
        component={AuthCallback}
      />


      {/* ======================================== */}
      {/* PANEL */}
      {/* ======================================== */}

      <Route
        path="/panel"
        component={Panel}
      />


      {/* ======================================== */}
      {/* CITAS */}
      {/* ======================================== */}

      <Route
        path="/buscar-citas"
        component={BuscarCitas}
      />


      {/* ======================================== */}
      {/* DECRETO FLUSSI - VERIFICACIÓN */}
      {/* ======================================== */}

      <Route
        path="/verificar-decreto-flussi"
        component={VerificarDecretoFlussi}
      />


      {/* ======================================== */}
      {/* DECRETO FLUSSI 2027 */}
      {/* NUEVA PÁGINA */}
      {/* ======================================== */}

      <Route
        path="/decreto-flussi-2027"
        component={DecretoFlussi2027}
      />


      {/* ======================================== */}
      {/* TRABAJO EN MALTA */}
      {/* ======================================== */}

      <Route
        path="/trabajo-malta"
        component={TrabajoMalta}
      />


      {/* ======================================== */}
      {/* ESTUDIAR EN MALTA 2027 */}
      {/* RUTA PRINCIPAL */}
      {/* ======================================== */}

      <Route
        path="/estudiar-en-malta-2027"
        component={EstudiarMalta2027}
      />


      {/* ======================================== */}
      {/* ESTUDIAR EN MALTA 2027 */}
      {/* RETORNO DESPUÉS DE STRIPE */}
      {/* ======================================== */}

      <Route
        path="/estudiar-malta-2027"
        component={EstudiarMalta2027}
      />


      {/* ======================================== */}
      {/* PÁGINAS LEGALES */}
      {/* ======================================== */}

      <Route
        path="/aviso-legal"
        component={AvisoLegal}
      />

      <Route
        path="/privacidad"
        component={Privacidad}
      />

      <Route
        path="/cookies"
        component={CookiesPage}
      />


      {/* ======================================== */}
      {/* CONTACTO */}
      {/* ======================================== */}

      <Route
        path="/contacto"
        component={Contacto}
      />


      {/* ======================================== */}
      {/* CHECKOUT */}
      {/* ======================================== */}

      <Route
        path="/checkout/success"
        component={CheckoutSuccess}
      />

      <Route
        path="/checkout/cancelado"
        component={CheckoutCancel}
      />


      {/* ======================================== */}
      {/* CONFIRMAR CITA */}
      {/* ======================================== */}

      <Route
        path="/confirmar-cita"
        component={Confirmar}
      />


      {/* ======================================== */}
      {/* 404 */}
      {/* ======================================== */}

      <Route
        component={NotFound}
      />

    </Switch>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>

      <LanguageProvider>

        <div
          translate="no"
          className="notranslate"
        >

          <WouterRouter
            base={import.meta.env.BASE_URL.replace(/\/$/, "")}
          >

            <PageSeo />
            <Suspense fallback={<div role="status" className="min-h-screen flex items-center justify-center text-foreground">GestoriaCitaIA…</div>}>
              <Router />
            </Suspense>

          </WouterRouter>


          <Toaster />

        </div>

      </LanguageProvider>

    </QueryClientProvider>
  );
}


export default App;
