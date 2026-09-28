import React from 'react';
import AppShell from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { StoreProvider } from './store/StoreProvider';
import { ROUTES, useRoute } from './router/routes';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import MaterialsPage from './pages/MaterialsPage';
import PrintersPage from './pages/PrintersPage';
import QuotesPage from './pages/QuotesPage';
import SettingsPage from './pages/SettingsPage';
import { Button, Card, EmptyState } from './components/ui/primitives';

const PAGES = {
  [ROUTES.DASHBOARD]: DashboardPage,
  [ROUTES.PRICING]: PricingPage,
  [ROUTES.MATERIALS]: MaterialsPage,
  [ROUTES.PRINTERS]: PrintersPage,
  [ROUTES.QUOTES]: QuotesPage,
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

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Router />
      </StoreProvider>
    </ToastProvider>
  );
}
