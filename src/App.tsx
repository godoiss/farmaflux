import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { NotFound } from './components/layout/NotFound';
import { WelcomePage } from './features/welcome/WelcomePage';
import { HomePage } from './features/home/HomePage';
import { PrescriptionsPage } from './features/prescriptions/PrescriptionsPage';
import { IntakePage } from './features/prescriptions/IntakePage';
import { PrescriptionDetailPage } from './features/prescriptions/PrescriptionDetailPage';
import { ReviewPage } from './features/prescriptions/ReviewPage';
import { UnitsPage } from './features/units/UnitsPage';
import { UnitDetailPage } from './features/units/UnitDetailPage';
import { PlanFormPage } from './features/plans/PlanFormPage';
import { PlanDetailPage } from './features/plans/PlanDetailPage';
import { RemindersPage } from './features/reminders/RemindersPage';
import { PharmacistsPage } from './features/network/PharmacistsPage';
import { SourcesPage } from './features/network/SourcesPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { HelpPage } from './features/help/HelpPage';

const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/inicio', element: <HomePage /> },
      { path: '/receitas', element: <PrescriptionsPage /> },
      { path: '/receitas/nova', element: <IntakePage mode="new" /> },
      { path: '/receitas/:id', element: <PrescriptionDetailPage /> },
      { path: '/receitas/:id/conferir', element: <ReviewPage /> },
      { path: '/receitas/:id/corrigir', element: <IntakePage mode="correction" /> },
      { path: '/unidades', element: <UnitsPage /> },
      { path: '/unidades/:id', element: <UnitDetailPage /> },
      { path: '/planos/novo', element: <PlanFormPage mode="new" /> },
      { path: '/planos/:id', element: <PlanDetailPage /> },
      { path: '/planos/:id/editar', element: <PlanFormPage mode="edit" /> },
      { path: '/lembretes', element: <RemindersPage /> },
      { path: '/farmaceuticos', element: <PharmacistsPage /> },
      { path: '/fontes', element: <SourcesPage /> },
      { path: '/perfil', element: <ProfilePage /> },
      { path: '/ajuda', element: <HelpPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
