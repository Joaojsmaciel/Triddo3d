import React from 'react';
import AppShell from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { StoreProvider } from './store/StoreProvider';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import LoginPage from './pages/LoginPage';
import LoadingScreen from './components/ui/LoadingScreen';
import { ROUTES, useRoute } from './router/routes';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import MaterialsPage from './pages/MaterialsPage';
import PrintersPage from './pages/PrintersPage';
import QuotesPage from './pages/QuotesPage';
import CashFlowPage from './pages/CashFlowPage';
import SettingsPage from './pages/SettingsPage';
import { Button, Card, EmptyState } from './components/ui/primitives';

const PAGES = {
  [ROUTES.DASHBOARD]: DashboardPage,
  [ROUTES.PRICING]: PricingPage,
  [ROUTES.MATERIALS]: MaterialsPage,
  [ROUTES.PRINTERS]: PrintersPage,
  [ROUTES.QUOTES]: QuotesPage,
  [ROUTES.CASHFLOW]: CashFlowPage,
  [ROUTES.SETTINGS]: SettingsPage,
};

function Router() {
  const { path, params, navigate } = useRoute();
  const Page = PAGES[path];

  if (!Page) {
    return (
      <AppShell currentPath={path}>
        <Card>
          <EmptyState
            icon="search"
            title="Página não encontrada"
            description={`O endereço "${path}" não existe neste sistema.`}
            action={
              <Button variant="primary" icon="arrowLeft" onClick={() => navigate(ROUTES.DASHBOARD)}>
                Voltar ao dashboard
              </Button>
            }
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell currentPath={path}>
      <Page params={params} navigate={navigate} />
    </AppShell>
  );
}

/** Só libera o sistema para quem está logado; cada conta tem seus próprios materiais. */
function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen label="Verificando sua sessão..." />;
  if (!user) return <LoginPage />;

  return (
    // `key` recria o store ao trocar de conta, sem sobras do usuário anterior.
    <StoreProvider key={user.uid} uid={user.uid}>
      <Router />
    </StoreProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ToastProvider>
  );
}
