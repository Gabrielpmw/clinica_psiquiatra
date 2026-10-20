import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
    <div className="min-h-screen flex" style={{ backgroundColor: '#F2F5EF' }}>
      {/* Lado esquerdo — verde escuro */}
      <div
        className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12 text-center"
        style={{ backgroundColor: '#17382A' }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg mb-6"
          style={{ backgroundColor: '#2B6A4F' }}
        >
          <Stethoscope className="w-11 h-11" style={{ color: '#F9FAF6' }} />
        </div>
        <h1
          className="text-3xl font-semibold tracking-tight mb-3"
          style={{ color: '#F9FAF6' }}
        >
          Sistema de Apoio à Clínica
        </h1>
        <p className="text-base leading-relaxed max-w-xs" style={{ color: '#CFE5D8' }}>
          Psiquiatria Infantojuvenil — acesso seguro, controlado por perfil de usuário.
        </p>
        <div
          className="mt-10 px-5 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#1F4D3A', color: '#CFE5D8' }}
        >
          Seus dados clínicos protegidos com conformidade LGPD.
        </div>
      </div>

      {/* Lado direito — branco esverdeado */}
      <div
        className="flex-1 flex flex-col justify-center items-center px-6 sm:px-8"
        style={{ backgroundColor: '#F2F5EF' }}
      >
        {/* Logo mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-3"
            style={{ backgroundColor: '#2B6A4F' }}
          >
            <Stethoscope className="w-8 h-8" style={{ color: '#F9FAF6' }} />
          </div>
          <h2 className="text-xl font-semibold text-center" style={{ color: '#1E2A24' }}>
            Sistema de Apoio à Clínica
          </h2>
        </div>

        {/* Cartão de login */}
        <div
          className="w-full max-w-md rounded-xl shadow-sm border p-8"
          style={{ backgroundColor: '#F9FAF6', borderColor: '#D5DED0' }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: '#1E2A24' }}>
              Entrar no sistema
            </h2>
            <p className="text-sm mt-1" style={{ color: '#4A5A52' }}>
              Acesso restrito a profissionais cadastrados.
            </p>
          </div>

          {errorMessage && (
            <div
              className="mb-5 flex items-center gap-2 p-3 rounded-lg text-xs border"
              style={{ backgroundColor: '#fff0ee', borderColor: '#f5c6c2', color: '#9b3028' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Campo E-mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#4A5A52' }}
              >
                Endereço de E-mail
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  style={{ color: '#7C8B83' }}
                >
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
                  className="block w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#F9FAF6',
                    borderColor: '#D5DED0',
                    color: '#1E2A24',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#4A9E7A'; e.target.style.boxShadow = '0 0 0 2px #4A9E7A33'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#D5DED0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#4A5A52' }}
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  style={{ color: '#7C8B83' }}
                >
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
                  className="block w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: '#F9FAF6',
                    borderColor: '#D5DED0',
                    color: '#1E2A24',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#4A9E7A'; e.target.style.boxShadow = '0 0 0 2px #4A9E7A33'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#D5DED0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Botão Entrar */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 min-h-[40px]"
                style={{ backgroundColor: '#2B6A4F', color: '#F9FAF6' }}
                onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#368262'; }}
                onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#2B6A4F'; }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: '#F9FAF6', borderTopColor: 'transparent' }}
                    ></span>
                    Autenticando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>

          {/* Dica acesso rápido admin */}
          <div
            className="mt-6 p-3 rounded-lg text-xs"
            style={{ backgroundColor: '#E3F0E8', borderColor: '#CFE5D8', border: '1px solid #CFE5D8' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium" style={{ color: '#2B6A4F' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: '#4A9E7A' }} />
                <span>Administrador Pré-criado</span>
              </div>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="text-xs font-semibold underline"
                style={{ color: '#2B6A4F' }}
                onMouseEnter={(e) => { e.target.style.color = '#1F4D3A'; }}
                onMouseLeave={(e) => { e.target.style.color = '#2B6A4F'; }}
              >
                Preencher
              </button>
            </div>
            <p className="mt-1" style={{ color: '#4A5A52' }}>
              admin@clinica.com • admin123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
