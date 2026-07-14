import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  MapPin, 
  ShieldAlert, 
  Loader2 
} from 'lucide-react';

interface Sector {
  id: number;
  nome: string;
  secretaria_id: number;
  secretarias?: {
    nome: string;
  };
}

interface Secretariat {
  id: number;
  nome: string;
}

export const Setores: React.FC = () => {
  const { isAdmin } = useAuth();

  // Data States
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [secretariats, setSecretariats] = useState<Secretariat[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [secretariaId, setSecretariaId] = useState<number | ''>('');

  // UI Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSecretariat, setSelectedSecretariat] = useState('');

  // Feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sectors (locais) with secretariats joined
      const { data: secData, error: secErr } = await supabase
        .from('locais')
        .select(`
          id,
          nome,
          secretaria_id,
          secretarias ( nome )
        `)
        .order('nome');

      if (secErr) throw secErr;
      setSectors(secData as unknown as Sector[]);

      // Fetch secretariats
      const { data: secretariatData, error: secretariatErr } = await supabase
        .from('secretarias')
        .select('id, nome')
        .order('nome');

      if (secretariatErr) throw secretariatErr;
      setSecretariats(secretariatData || []);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao buscar setores e secretarias do banco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNome('');
    setSecretariaId(secretariats[0]?.id || '');
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const openEditModal = (sector: Sector) => {
    setIsEditing(true);
    setEditingId(sector.id);
    setNome(sector.nome);
    setSecretariaId(sector.secretaria_id);
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!nome.trim() || !secretariaId) {
      setErrorMsg('Preencha o nome do setor e selecione a secretaria correspondente.');
      setSubmitting(false);
      return;
    }

    const payload = {
      nome: nome.trim().toUpperCase(),
      secretaria_id: Number(secretariaId)
    };

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('locais')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        setSuccessMsg('Setor atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('locais')
          .insert(payload);

        if (error) throw error;
        setSuccessMsg('Setor cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar o setor. Lembre-se que o nome do setor deve ser único dentro da mesma secretaria.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      alert('Ação proibida: Apenas administradores podem excluir setores.');
      return;
    }

    if (window.confirm('Tem certeza de que deseja excluir este setor? Computadores vinculados a ele ficarão sem setor definido.')) {
      try {
        const { error } = await supabase
          .from('locais')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSuccessMsg('Setor excluído com sucesso!');
        fetchData();
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Erro ao excluir o setor.');
      }
    }
  };

  const filteredSectors = sectors.filter(s => {
    const textMatch = s.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const secretariatMatch = selectedSecretariat === '' || s.secretaria_id.toString() === selectedSecretariat;
    return textMatch && secretariatMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Setores da Prefeitura</h2>
          <p className="text-xs text-slate-500 mt-1">Gerencie os setores/locais físicos vinculados a cada secretaria.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
          Cadastrar Setor
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-700">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700 flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome do setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Secretariat Filter */}
        <select
          value={selectedSecretariat}
          onChange={(e) => setSelectedSecretariat(e.target.value)}
          className="block w-full md:w-56 rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs text-slate-700 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          <option value="">Todas as Secretarias</option>
          {secretariats.map(sec => (
            <option key={sec.id} value={sec.id}>{sec.nome}</option>
          ))}
        </select>

      </div>

      {/* Sectors Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredSectors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200/60 rounded-2xl">
          <MapPin size={48} className="text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-500">Nenhum setor encontrado.</p>
          <p className="text-xs text-slate-400">Crie um novo setor vinculado a uma secretaria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Setor</th>
                <th className="py-4 px-6">Secretaria Vinculada</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSectors.map((sector) => (
                <tr key={sector.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-800">#{sector.id}</td>
                  <td className="py-4 px-6 font-semibold text-slate-800">{sector.nome}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-lg bg-blue-50 text-blue-700 px-2 py-1 text-2xs font-semibold uppercase">
                      {sector.secretarias?.nome || 'Sem Secretaria'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(sector)}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Editar Setor"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(sector.id)}
                        disabled={!isAdmin}
                        className={`
                          rounded-lg p-1.5 transition-colors
                          ${isAdmin 
                            ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' 
                            : 'text-slate-300 cursor-not-allowed'}
                        `}
                        title={isAdmin ? 'Excluir Setor' : 'Apenas administradores podem excluir'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-in border border-slate-100">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {isEditing ? 'Editar Setor' : 'Cadastrar Novo Setor'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="nome-setor" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome do Setor *</label>
                <input
                  id="nome-setor"
                  type="text"
                  required
                  placeholder="Ex: PROTOCOLO, FINANCEIRO..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="select-secretaria" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Secretaria Vinculada *</label>
                <select
                  id="select-secretaria"
                  required
                  value={secretariaId}
                  onChange={(e) => setSecretariaId(Number(e.target.value))}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  {secretariats.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.nome}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Setor'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
