import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import PatientsPage from '../pages/PatientsPage';
import AgendaPage from '../pages/AgendaPage';
import ProntuarioPage from '../pages/ProntuarioPage';
import { ProtectedRoute, DoctorRoute, NonAdminRoute } from '../components/ProtectedRoute';
import { getPacientesApi } from '../services/api';

function ProntuarioRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    getPacientesApi({ status: true })
      .then((data) => {
        const lista = Array.isArray(data) ? data : data.results || [];
        if (lista.length > 0) {
          navigate(`/prontuario/${lista[0].id}`, { replace: true });
        } else {
          navigate('/pacientes', { replace: true });
        }
      })
      .catch(() => navigate('/pacientes', { replace: true }));
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-100 text-ink-600 text-sm">
      Carregando prontuário...
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes"
        element={
          <NonAdminRoute>
            <PatientsPage />
          </NonAdminRoute>
        }
      />
      <Route
        path="/agenda"
        element={
          <NonAdminRoute>
            <AgendaPage />
          </NonAdminRoute>
        }
      />
      <Route
        path="/prontuario"
        element={
          <DoctorRoute>
            <ProntuarioRedirect />
          </DoctorRoute>
        }
      />
      <Route
        path="/prontuario/:pacienteId"
        element={
          <DoctorRoute>
            <ProntuarioPage />
          </DoctorRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
