import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { Persister } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { OfflineProvider } from "@/lib/offline-context";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";
import { useEffect, ComponentType } from "react";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Stock from "@/pages/stock";
import Ventes from "@/pages/ventes";
import Partenaires from "@/pages/partenaires";
import Depenses from "@/pages/depenses";
import Mouvements from "@/pages/mouvements";
import Clients from "@/pages/clients";
import Statistiques from "@/pages/statistiques";
import Utilisateurs from "@/pages/utilisateurs";
import Vendeurs from "@/pages/vendeurs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Keep cached data long enough to survive offline reloads.
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
});

const idbPersister: Persister = {
  persistClient: async (client) => {
    await set("homies-rq-cache-v1", client);
  },
  restoreClient: async () => {
    return await get("homies-rq-cache-v1");
  },
  removeClient: async () => {
    await del("homies-rq-cache-v1");
  },
};

function ProtectedRoute({ component: Component, adminOnly = false }: { component: ComponentType, adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && !isAdmin) {
      setLocation("/");
    }
  }, [user, isLoading, isAdmin, adminOnly, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (adminOnly && !isAdmin)) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function DashboardRoute() { return <ProtectedRoute component={Dashboard} />; }
function StockRoute() { return <ProtectedRoute component={Stock} />; }
function VentesRoute() { return <ProtectedRoute component={Ventes} />; }
function PartenairesRoute() { return <ProtectedRoute component={Partenaires} />; }
function DepensesRoute() { return <ProtectedRoute component={Depenses} />; }
function MouvementsRoute() { return <ProtectedRoute component={Mouvements} />; }
function ClientsRoute() { return <ProtectedRoute component={Clients} adminOnly />; }
function StatistiquesRoute() { return <ProtectedRoute component={Statistiques} adminOnly />; }
function UtilisateursRoute() { return <ProtectedRoute component={Utilisateurs} adminOnly />; }
function VendeursRoute() { return <ProtectedRoute component={Vendeurs} adminOnly />; }

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={DashboardRoute} />
      <Route path="/stock" component={StockRoute} />
      <Route path="/ventes" component={VentesRoute} />
      <Route path="/partenaires" component={PartenairesRoute} />
      <Route path="/depenses" component={DepensesRoute} />
      <Route path="/mouvements" component={MouvementsRoute} />
      <Route path="/clients" component={ClientsRoute} />
      <Route path="/vendeurs" component={VendeursRoute} />
      <Route path="/statistiques" component={StatistiquesRoute} />
      <Route path="/utilisateurs" component={UtilisateursRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: "v1",
      }}
    >
      <OfflineProvider>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </OfflineProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
