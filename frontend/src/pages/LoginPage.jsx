import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Lock, Mail, Activity, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { checkHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [apiStatus, setApiStatus] = useState({ checking: true, connected: false });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    checkHealth()
      .then((data) => {
        if (data.status === 'ok') {
          setApiStatus({ checking: false, connected: true });
        } else {
          setApiStatus({ checking: false, connected: false });
        }
      })
      .catch(() => {
        setApiStatus({ checking: false, connected: false });
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.detail) {
        setErrorMessage(err.response.data.detail);
      } else if (err.response?.status === 401) {
        setErrorMessage('E-mail ou senha incorretos.');
      } else {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('admin@clinica.com');
    setPassword('admin123456');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      {/* Indicador de Status da API no topo */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-xs shadow-sm">
        <Activity className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500">API Back-end:</span>
        {apiStatus.checking ? (
          <span className="text-amber-500 font-medium">Verificando...</span>
        ) : apiStatus.connected ? (
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Conectado
          </span>
        ) : (
          <span className="text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Desconectado
          </span>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center shadow-md">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-800">
          Sistema de Apoio à Clínica
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Acesso seguro e controle por perfis
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-100 sm:px-10">
          {errorMessage && (
            <div className="mb-5 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Endereço de E-mail
              </label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@clinica.com"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Senha de Acesso
              </label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Autenticando...
                  </span>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </div>
          </form>

          {/* Dica para acesso rápido de desenvolvimento com admin pré-configurado */}
          <div className="mt-6 p-3 bg-teal-50/60 border border-teal-100 rounded-lg text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Administrador Pré-criado</span>
              </div>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline"
              >
                Preencher
              </button>
            </div>
            <p className="mt-1 text-slate-500">
              admin@clinica.com • admin123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
