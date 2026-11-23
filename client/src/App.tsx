import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ActivityPage from './features/audit/ActivityPage';
import ApprovalsPage from './features/approvals/ApprovalsPage';
import LoginPage from './features/auth/LoginPage';
import ProtectedRoute from './features/auth/ProtectedRoute';
import DashboardPage from './features/dashboard/DashboardPage';
import EditPermitPage from './features/permits/EditPermitPage';
import NewPermitPage from './features/permits/NewPermitPage';
import PermitDetailPage from './features/permits/PermitDetailPage';
import PermitsPage from './features/permits/PermitsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="permits" element={<PermitsPage />} />
        <Route path="permits/new" element={<NewPermitPage />} />
        <Route path="permits/:id/edit" element={<EditPermitPage />} />
        <Route path="permits/:id" element={<PermitDetailPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
