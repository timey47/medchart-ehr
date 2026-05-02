import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientChart from './pages/PatientChart';
import Kanban from './pages/Kanban';
import Notes from './pages/Notes';
import Billing from './pages/Billing';

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={<ProtectedLayout><Dashboard /></ProtectedLayout>}
          />
          <Route
            path="/patients"
            element={<ProtectedLayout><Patients /></ProtectedLayout>}
          />
          <Route
            path="/patients/:id"
            element={<ProtectedLayout><PatientChart /></ProtectedLayout>}
          />
          <Route
            path="/kanban"
            element={<ProtectedLayout><Kanban /></ProtectedLayout>}
          />
          <Route
            path="/notes"
            element={<ProtectedLayout><Notes /></ProtectedLayout>}
          />
          <Route
            path="/billing"
            element={<ProtectedLayout><Billing /></ProtectedLayout>}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
