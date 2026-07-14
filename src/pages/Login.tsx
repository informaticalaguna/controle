import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Key, Mail, Lock, User, Briefcase, ShieldAlert, Check } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cargo, setCargo] = useState('');
  const [permissao, setPermissao] = useState<'Administrador' | 'Usuário Nível 1'>('Usuário Nível 1');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // If already logged in, redirect to home/dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!nomeCompleto || !cargo) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nomeCompleto,
            cargo: cargo,
            permissao: permissao,
          },
        },
      });
      if (error) throw error;
      setSuccessMsg('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação se necessário.');
      // Auto toggle to login after delay
      setTimeout(() => {
        setIsSignUp(false);
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setSuccessMsg('E-mail de recuperação enviado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 overflow-hidden">
      {/* Decorative Blur Background circles */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 rounded-full bg-emerald-600/10 blur-3xl"></div>

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center pb-8 border-b border-slate-800/80">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-extrabold text-white text-2xl shadow-lg shadow-blue-600/30">
            OS
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Prefeitura de Laguna
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {recoveryMode 
              ? 'Recuperação de Senha - Departamento de Informática' 
              : isSignUp 
                ? 'Cadastro de Técnico - Área Interna' 
                : 'Painel de Ordens de Serviço - Área Interna'}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 p-3.5 text-sm text-rose-400">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-sm text-emerald-400">
            <Check size={18} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Forms */}
        {recoveryMode ? (
          <form onSubmit={handlePasswordRecovery} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email-recovery" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">E-mail</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Mail size={16} /></span>
                <input
                  id="email-recovery"
                  type="email"
                  required
                  placeholder="tecnico@laguna.sc.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:bg-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              <Key size={16} />
              {submitting ? 'Enviando...' : 'Enviar e-mail de recuperação'}
            </button>

            <button
              type="button"
              onClick={() => { setRecoveryMode(false); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Voltar para o Login
            </button>
          </form>
        ) : isSignUp ? (
          <form onSubmit={handleSignUp} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nome" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome Completo *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><User size={14} /></span>
                  <input
                    id="nome"
                    type="text"
                    required
                    placeholder="Dimas Eleutério"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cargo" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Cargo *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Briefcase size={14} /></span>
                  <input
                    id="cargo"
                    type="text"
                    required
                    placeholder="Diretor de TI"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="permissao" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nível de Permissão</label>
              <select
                id="permissao"
                value={permissao}
                onChange={(e) => setPermissao(e.target.value as any)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs text-white transition-colors focus:border-blue-500 focus:outline-none"
              >
                <option value="Usuário Nível 1" className="bg-slate-900">Usuário Nível 1 (Sem poder de excluir)</option>
                <option value="Administrador" className="bg-slate-900">Administrador (Acesso total)</option>
              </select>
            </div>

            <div>
              <label htmlFor="email-signup" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">E-mail *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Mail size={14} /></span>
                <input
                  id="email-signup"
                  type="email"
                  required
                  placeholder="dimas@laguna.sc.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-signup" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Senha *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Lock size={14} /></span>
                <input
                  id="password-signup"
                  type="password"
                  required
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:opacity-50 mt-2"
            >
              <UserPlus size={16} />
              {submitting ? 'Cadastrando...' : 'Cadastrar Técnico'}
            </button>

            <div className="pt-2 text-center text-xs font-medium text-slate-400">
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Faça login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email-login" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">E-mail</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Mail size={16} /></span>
                <input
                  id="email-login"
                  type="email"
                  required
                  placeholder="exemplo@laguna.sc.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password-login" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Senha</label>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode(true); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Lock size={16} /></span>
                <input
                  id="password-login"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:opacity-50 mt-2"
            >
              <LogIn size={16} />
              {submitting ? 'Entrando...' : 'Entrar no Painel'}
            </button>

            <div className="pt-2 text-center text-xs font-medium text-slate-400">
              Não tem uma conta técnica?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Cadastre-se
              </button>
            </div>
          </form>
        )}

        {/* Public view shortcut */}
        <div className="mt-8 border-t border-slate-800/80 pt-6 text-center">
          <p className="text-xs text-slate-500">Apenas deseja consultar o status de um conserto?</p>
          <button
            onClick={() => navigate('/consulta')}
            className="mt-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Acessar Consulta Pública Rápida &rarr;
          </button>
        </div>

      </div>
    </div>
  );
};
