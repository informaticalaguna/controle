import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Users, Shield, ShieldAlert, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  nome_completo: string;
  cargo: string;
  permissao: 'Administrador' | 'Usuário Nível 1';
  created_at: string;
}

export const Tecnicos: React.FC = () => {
  const { isAdmin } = useAuth();
  
  // List states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cargo, setCargo] = useState('');
  const [permissao, setPermissao] = useState<'Administrador' | 'Usuário Nível 1'>('Usuário Nível 1');

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome_completo');
      if (error) throw error;
      setProfiles(data as Profile[]);
    } catch (err) {
      console.error('Erro ao buscar perfis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!nomeCompleto || !cargo || !email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Instantiate a temp client with persistSession: false
      // to avoid signing out the administrator.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 2. Sign up the new user
      const { error } = await tempClient.auth.signUp({
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

      setSuccessMsg(`Técnico ${nomeCompleto} cadastrado com sucesso!`);
      
      // Clear fields
      setEmail('');
      setPassword('');
      setNomeCompleto('');
      setCargo('');
      setPermissao('Usuário Nível 1');
      
      // Refresh list
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao cadastrar técnico.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold">Acesso Restrito</h3>
        <p className="text-sm mt-1">Apenas administradores têm permissão para acessar esta seção de gerenciamento de usuários.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      
      {/* Col 1: Add new technician form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm h-fit">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <UserPlus size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">Cadastrar Novo Técnico</h3>
        </div>

        {successMsg && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-2xs font-semibold text-emerald-700 mb-4">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-2xs font-semibold text-rose-700 mb-4 flex items-center gap-1.5">
            <ShieldAlert size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome Completo *</label>
            <input
              id="nome"
              type="text"
              required
              placeholder="Ex: João da Silva"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cargo" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Cargo *</label>
            <input
              id="cargo"
              type="text"
              required
              placeholder="Ex: Técnico de Suporte"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="permissao" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nível de Permissão</label>
            <select
              id="permissao"
              value={permissao}
              onChange={(e) => setPermissao(e.target.value as any)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="Usuário Nível 1">Usuário Nível 1 (Sem poder de excluir)</option>
              <option value="Administrador">Administrador (Acesso total)</option>
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">E-mail *</label>
            <input
              id="email"
              type="email"
              required
              placeholder="Ex: joao@laguna.sc.gov.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Senha de Acesso *</label>
            <input
              id="senha"
              type="password"
              required
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors disabled:opacity-50 mt-2"
          >
            {submitting ? 'Cadastrando...' : 'Cadastrar Técnico'}
          </button>
        </form>
      </div>

      {/* Col 2 & 3: Technicians List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <Users size={18} className="text-slate-600" />
          <h3 className="font-bold text-slate-800 text-sm">Técnicos Cadastrados</h3>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-3xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Cargo</th>
                  <th className="py-3 px-4">Permissão</th>
                  <th className="py-3 px-4">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{p.nome_completo}</td>
                    <td className="py-3.5 px-4 font-medium">{p.cargo}</td>
                    <td className="py-3.5 px-4">
                      <span className={`
                        inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-bold border uppercase tracking-wider
                        ${p.permissao === 'Administrador' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}
                      `}>
                        <Shield size={10} />
                        {p.permissao === 'Administrador' ? 'Admin' : 'Nível 1'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
