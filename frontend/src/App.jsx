import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AiGenerationProvider } from './context/AiGenerationContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AiGenerationProvider>
            <AppRoutes />
          </AiGenerationProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
