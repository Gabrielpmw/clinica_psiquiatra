import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = 'success', title, message, duration = 4000 }) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const newNotification = { id, type, title, message };

      setNotifications((prev) => [...prev, newNotification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const notifySuccess = useCallback(
    (message, title = 'Sucesso') => notify({ type: 'success', title, message }),
    [notify]
  );

  const notifyError = useCallback(
    (message, title = 'Erro') => notify({ type: 'error', title, message }),
    [notify]
  );

  const notifyWarning = useCallback(
    (message, title = 'Aviso') => notify({ type: 'warning', title, message }),
    [notify]
  );

  const notifyInfo = useCallback(
    (message, title = 'Informação') => notify({ type: 'info', title, message }),
    [notify]
  );

  return (
    <NotificationContext.Provider
      value={{
        notify,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo,
        removeNotification,
      }}
    >
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-md transition-all duration-300 animate-slide-in ${
              n.type === 'success'
                ? 'bg-leaf-100 border-leaf-500 text-ink-900'
                : n.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : n.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-paper-50 border-paper-300 text-ink-900'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-leaf-700" />}
              {n.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {n.type === 'info' && <Info className="w-5 h-5 text-leaf-600" />}
            </div>
            <div className="flex-1 text-sm">
              {n.title && <p className="font-semibold">{n.title}</p>}
              {n.message && <p className="mt-0.5 text-xs opacity-90">{n.message}</p>}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-ink-400 hover:text-ink-900 p-0.5 rounded transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
