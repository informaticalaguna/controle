import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Users, Shield, ShieldAlert, Loader2, Edit2, X } from 'lucide-react';

interface Profile {
  id: string;
  nome_completo: string;
  cargo: string;
  permissao: 'Administrador' | 'Usuário Nível 1';
  email: string | null;
  created_at: string;
}

export const Tecnicos: React.FC = () => {
  const { isAdmin, profile: currentProfile, refreshProfile } = useAuth();
  
  // List states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNomeCompleto('');
    setCargo('');
    setPermissao('Usuário Nível 1');
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = (p: Profile) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(true);
    setEditingId(p.id);
    setNomeCompleto(p.nome_completo);
    setCargo(p.cargo);
    setPermissao(p.permissao);
    setEmail(p.email || '');
    setPassword(''); // Passwords should be set blank for editing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!nomeCompleto || !cargo) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      setSubmitting(false);
      return;
    }

    if (!isEditing && (!email || !password)) {
      setErrorMsg('Por favor, insira o e-mail e a senha do novo técnico.');
      setSubmitting(false);
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      setSubmitting(false);
      return;
    }

    try {
      if (isEditing && editingId) {
        // Use RPC function to update name, cargo, permission and optionally password
        const { error } = await supabase.rpc('admin_update_tecnico', {
          user_id: editingId,
          new_nome: nomeCompleto,
          new_cargo: cargo,
          new_permissao: permissao,
          new_password: password || null
        });

        if (error) throw error;

        // If the edited user is the logged-in administrator, update local profile context
        if (editingId === currentProfile?.id) {
          await refreshProfile();
        }

        setSuccessMsg(`Técnico ${nomeCompleto} atualizado com sucesso!`);
        resetForm();
        fetchProfiles();
      } else {
        // 1. Create a non-persist session Supabase client
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
        resetForm();
        fetchProfiles();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar a operação.');
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
      
      {/* Col 1: Add/Edit technician form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm h-fit">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isEditing ? 'Editar Técnico' : 'Cadastrar Novo Técnico'}
            </h3>
          </div>
          {isEditing && (
            <button 
              onClick={resetForm}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              title="Cancelar edição"
            >
              <X size={16} />
            </button>
          )}
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label htmlFor="email" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              E-mail {isEditing ? '(Não editável)' : '*'}
            </label>
            <input
              id="email"
              type="email"
              required={!isEditing}
              disabled={isEditing}
              placeholder="Ex: joao@laguna.sc.gov.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`
                block w-full rounded-xl border py-2 px-3 text-xs focus:outline-none
                ${isEditing 
                  ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 focus:border-blue-500 focus:bg-white'}
              `}
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {isEditing ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha de Acesso *'}
            </label>
            <input
              id="senha"
              type="password"
              required={!isEditing}
              placeholder={isEditing ? '•••••• (opcional)' : 'Mínimo de 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Técnico'}
            </button>
          </div>
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
                  <th className="py-3 px-4">Cargo / E-mail</th>
                  <th className="py-3 px-4">Permissão</th>
                  <th className="py-3 px-4">Criado em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{p.nome_completo}</td>
                    <td className="py-3.5 px-4 font-medium">
                      <p className="font-semibold text-slate-700">{p.cargo}</p>
                      <p className="text-3xs text-slate-400 mt-0.5">{p.email || 'Sem e-mail'}</p>
                    </td>
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
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleEditClick(p)}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Editar Técnico"
                      >
                        <Edit2 size={14} />
                      </button>
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
