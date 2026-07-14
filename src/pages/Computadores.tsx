import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Monitor, 
  ShieldAlert, 
  SlidersHorizontal,
  Loader2
} from 'lucide-react';

interface Computer {
  id: number;
  id_legado: string | null;
  patrimonio: number | null;
  data_cadastro: string;
  secretaria_id: number;
  local_id: number;
  marca_id: number;
  equipamento_id: number;
  ativo: boolean;
  garantia_ativa: boolean;
  observacao: string | null;
  secretarias?: { nome: string };
  locais?: { nome: string };
  marcas?: { nome: string };
  equipamentos?: { nome: string };
}

interface LookupTable {
  id: number;
  nome: string;
}

interface LocalLookup {
  id: number;
  nome: string;
  secretaria_id: number;
}

export const Computadores: React.FC = () => {
  const { isAdmin } = useAuth();
  
  // Data States
  const [computers, setComputers] = useState<Computer[]>([]);
  const [secretarias, setSecretarias] = useState<LookupTable[]>([]);
  const [marcas, setMarcas] = useState<LookupTable[]>([]);
  const [equipamentos, setEquipamentos] = useState<LookupTable[]>([]);
  const [locais, setLocais] = useState<LocalLookup[]>([]);
  
  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSecretaria, setSelectedSecretaria] = useState('');
  
  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [idLegado, setIdLegado] = useState('');
  const [patrimonio, setPatrimonio] = useState<number | ''>('');
  const [secretariaId, setSecretariaId] = useState<number | ''>('');
  const [localId, setLocalId] = useState<number | ''>('');
  const [marcaId, setMarcaId] = useState<number | ''>('');
  const [equipamentoId, setEquipamentoId] = useState<number | ''>('');
  const [ativo, setAtivo] = useState(true);
  const [garantiaAtiva, setGarantiaAtiva] = useState(false);
  const [observacao, setObservacao] = useState('');
  
  // Dynamic Local creation states
  const [newLocalName, setNewLocalName] = useState('');
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [submittingLocal, setSubmittingLocal] = useState(false);

  // Errors/Success feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch computers
      const { data: compData, error: compErr } = await supabase
        .from('computadores')
        .select(`
          *,
          secretarias(nome),
          locais(nome),
          marcas(nome),
          equipamentos(nome)
        `)
        .order('id', { ascending: false });

      if (compErr) throw compErr;
      setComputers(compData as unknown as Computer[]);

      // Fetch lookup tables
      const { data: secData } = await supabase.from('secretarias').select('*').order('nome');
      const { data: marData } = await supabase.from('marcas').select('*').order('nome');
      const { data: eqData } = await supabase.from('equipamentos').select('*').order('nome');
      const { data: locData } = await supabase.from('locais').select('id, nome, secretaria_id').order('nome');

      setSecretarias(secData || []);
      setMarcas(marData || []);
      setEquipamentos(eqData || []);
      setLocais((locData || []) as LocalLookup[]);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao carregar os dados. Recarregue a página.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dynamically update localId when secretariaId changes
  useEffect(() => {
    if (modalOpen && secretariaId !== '') {
      const filteredLocs = locais.filter(l => l.secretaria_id === Number(secretariaId));
      const isCurrentLocalValid = filteredLocs.some(l => l.id === Number(localId));
      if (!isCurrentLocalValid) {
        setLocalId(filteredLocs[0]?.id || '');
      }
    }
  }, [secretariaId, locais, modalOpen, localId]);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setIdLegado('');
    setPatrimonio('');
    
    const initialSecId = secretarias[0]?.id || '';
    setSecretariaId(initialSecId);
    
    const filteredLocs = locais.filter(l => l.secretaria_id === initialSecId);
    setLocalId(filteredLocs[0]?.id || '');
    
    setMarcaId(marcas[0]?.id || '');
    setEquipamentoId(equipamentos[0]?.id || '');
    setAtivo(true);
    setGarantiaAtiva(false);
    setObservacao('');
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const openEditModal = (comp: Computer) => {
    setIsEditing(true);
    setEditingId(comp.id);
    setIdLegado(comp.id_legado || '');
    setPatrimonio(comp.patrimonio || '');
    setSecretariaId(comp.secretaria_id);
    setLocalId(comp.local_id);
    setMarcaId(comp.marca_id);
    setEquipamentoId(comp.equipamento_id);
    setAtivo(comp.ativo);
    setGarantiaAtiva(comp.garantia_ativa);
    setObservacao(comp.observacao || '');
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleCreateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocalName.trim() || !secretariaId) return;

    setSubmittingLocal(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('locais')
        .insert({ 
          nome: newLocalName.trim().toUpperCase(),
          secretaria_id: Number(secretariaId)
        })
        .select()
        .single();

      if (error) throw error;

      setLocais(prev => [...prev, data as LocalLookup].sort((a, b) => a.nome.localeCompare(b.nome)));
      setLocalId(data.id);
      setNewLocalName('');
      setLocalModalOpen(false);
      setSuccessMsg('Local cadastrado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao criar local.');
    } finally {
      setSubmittingLocal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!equipamentoId) {
      setErrorMsg('O campo Computador (Tipo de Equipamento) é obrigatório.');
      setSubmitting(false);
      return;
    }
    if (!marcaId) {
      setErrorMsg('O campo Marca/Modelo é obrigatório.');
      setSubmitting(false);
      return;
    }
    if (!secretariaId) {
      setErrorMsg('O campo Secretaria é obrigatório.');
      setSubmitting(false);
      return;
    }
    if (!localId) {
      setErrorMsg('O campo Local/Setor é obrigatório.');
      setSubmitting(false);
      return;
    }

    const payload = {
      id_legado: idLegado || null,
      patrimonio: patrimonio === '' ? null : Number(patrimonio),
      secretaria_id: Number(secretariaId),
      local_id: Number(localId),
      marca_id: Number(marcaId),
      equipamento_id: Number(equipamentoId),
      ativo,
      garantia_ativa: garantiaAtiva,
      observacao: observacao || null
    };

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('computadores')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        setSuccessMsg('Computador atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('computadores')
          .insert(payload);

        if (error) throw error;
        setSuccessMsg('Computador adicionado com sucesso!');
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao salvar o registro.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      alert('Ação proibida: Apenas administradores podem excluir registros.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este computador? Todas as Ordens de Serviço vinculadas a ele também serão excluídas.')) {
      try {
        const { error } = await supabase
          .from('computadores')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSuccessMsg('Computador excluído com sucesso!');
        fetchData();
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Erro ao excluir o registro.');
      }
    }
  };

  const filteredComputers = computers.filter(c => {
    const textMatch = 
      c.id.toString().includes(searchTerm) ||
      (c.id_legado?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.patrimonio?.toString() || '').includes(searchTerm);

    const secMatch = selectedSecretaria === '' || c.secretaria_id.toString() === selectedSecretaria;

    return textMatch && secMatch;
  });


  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inventário de Computadores</h2>
          <p className="text-xs text-slate-500 mt-1">Gerenciamento completo das máquinas do município.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
          Cadastrar Máquina
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

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por ID, Legado ou Patrimônio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Secretaria Filter */}
        <div className="flex w-full md:w-auto items-center gap-3">
          <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedSecretaria}
            onChange={(e) => setSelectedSecretaria(e.target.value)}
            className="block w-full md:w-56 rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs text-slate-700 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            <option value="">Todas as Secretarias</option>
            {secretarias.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.nome}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredComputers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200/60 rounded-2xl">
          <Monitor size={48} className="text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-500">Nenhum computador encontrado.</p>
          <p className="text-xs text-slate-400">Limpe os filtros ou cadastre um novo computador.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">ID / Legado</th>
                <th className="py-4 px-6">Patrimônio</th>
                <th className="py-4 px-6">Equipamento / Marca</th>
                <th className="py-4 px-6">Secretaria / Local</th>
                <th className="py-4 px-6 text-center">Ativo / Garantia</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredComputers.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                  
                  {/* ID / Legado */}
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-800">#{comp.id}</p>
                    {comp.id_legado && (
                      <span className="inline-flex rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1 border border-slate-100">
                        Legado: {comp.id_legado}
                      </span>
                    )}
                  </td>

                  {/* Patrimonio */}
                  <td className="py-4 px-6 font-semibold text-slate-700">
                    {comp.patrimonio || '---'}
                  </td>

                  {/* Equipamento / Marca */}
                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-800">{comp.equipamentos?.nome}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{comp.marcas?.nome}</p>
                  </td>

                  {/* Secretaria / Local */}
                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-800">{comp.secretarias?.nome}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{comp.locais?.nome}</p>
                  </td>

                  {/* Status Badges */}
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <span className={`
                        inline-flex rounded-full px-2 py-0.5 text-3xs font-bold uppercase tracking-wider
                        ${comp.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}
                      `}>
                        {comp.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {comp.garantia_ativa && (
                        <span className="inline-flex rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider">
                          Garantia
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(comp)}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Editar Computador"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(comp.id)}
                        disabled={!isAdmin}
                        className={`
                          rounded-lg p-1.5 transition-colors
                          ${isAdmin 
                            ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' 
                            : 'text-slate-300 cursor-not-allowed'}
                        `}
                        title={isAdmin ? 'Excluir Computador' : 'Apenas administradores podem excluir'}
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

      {/* Dynamic Local Creation mini-modal */}
      {localModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-fade-in border border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm mb-4">Adicionar Novo Local/Setor</h4>
            <form onSubmit={handleCreateLocal} className="space-y-4">
              <div>
                <label className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome do Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TÉCNICO, GABINETE PREFEITO..."
                  value={newLocalName}
                  onChange={(e) => setNewLocalName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLocalModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingLocal}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {submittingLocal ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-fade-in border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {isEditing ? 'Editar Computador' : 'Cadastrar Novo Computador'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              
              {/* IDs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">ID (Automático)</label>
                  <input
                    type="text"
                    disabled
                    placeholder={isEditing && editingId ? `#${editingId}` : 'Gerado ao salvar'}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 px-3 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="id-legado" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">ID Legado</label>
                  <input
                    id="id-legado"
                    type="text"
                    placeholder="Ex: LENOVO-928"
                    value={idLegado}
                    onChange={(e) => setIdLegado(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Patrimonio */}
              <div>
                <label htmlFor="patrimonio" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nº de Patrimônio</label>
                <input
                  id="patrimonio"
                  type="number"
                  placeholder="Ex: 12093"
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(e.target.value === '' ? '' : Number(e.target.value))}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Lookup selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="equipamento" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Computador <span>*</span></label>
                  <select
                    id="equipamento"
                    required
                    value={equipamentoId}
                    onChange={(e) => setEquipamentoId(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {equipamentos.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="marca" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Marca/Modelo <span>*</span></label>
                  <select
                    id="marca"
                    required
                    value={marcaId}
                    onChange={(e) => setMarcaId(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {marcas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Secretaria & Local */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="secretaria" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Secretaria <span>*</span></label>
                  <select
                    id="secretaria"
                    required
                    value={secretariaId}
                    onChange={(e) => setSecretariaId(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {secretarias.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="local" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Local/Setor <span>*</span></label>
                  <select
                    id="local"
                    required
                    value={localId}
                    onChange={(e) => setLocalId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {locais.filter(loc => loc.secretaria_id === Number(secretariaId)).length === 0 ? (
                      <option value="">Nenhum setor cadastrado para esta secretaria</option>
                    ) : (
                      locais
                        .filter(loc => loc.secretaria_id === Number(secretariaId))
                        .map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.nome}</option>
                        ))
                    )}
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6 pt-2">
                <label className="relative flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-700">Computador Ativo</span>
                </label>

                <label className="relative flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={garantiaAtiva}
                    onChange={(e) => setGarantiaAtiva(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-700">Garantia Ativa</span>
                </label>
              </div>

              {/* Observações */}
              <div>
                <label htmlFor="obs-computador" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Observações</label>
                <textarea
                  id="obs-computador"
                  rows={2}
                  placeholder="Informações adicionais sobre hardware, peças ou licenças..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Buttons */}
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
                  {submitting ? 'Salvando...' : 'Salvar Computador'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
