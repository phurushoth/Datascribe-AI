import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DriveConnectPage from './pages/DriveConnectPage';
import SetupCompletePage from './pages/SetupCompletePage';
import DashboardPage from './pages/DashboardPage';
import ExtractPage from './pages/ExtractPage';
import FormFillPage from './pages/FormFillPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailsPage from './pages/DocumentDetailsPage';
import ExportsPage from './pages/ExportsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/connect-drive" element={<DriveConnectPage />} />
    <Route path="/setup-complete" element={<SetupCompletePage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/extract" element={<ExtractPage />} />
        <Route path="/form-fill" element={<FormFillPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentDetailsPage />} />
        <Route path="/exports" element={<ExportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
