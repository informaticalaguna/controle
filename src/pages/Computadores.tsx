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
  local: string;
  marca_id: number;
  equipamento_id: number;
  ativo: boolean;
  garantia_ativa: boolean;
  usuario: string | null;
  observacao: string | null;
  secretarias?: { nome: string };
  marcas?: { nome: string };
  equipamentos?: { nome: string };
}

interface LookupTable {
  id: number;
  nome: string;
}

export const Computadores: React.FC = () => {
  const { isAdmin } = useAuth();

  // Data States
  const [computers, setComputers] = useState<Computer[]>([]);
  const [secretarias, setSecretarias] = useState<LookupTable[]>([]);
  const [marcas, setMarcas] = useState<LookupTable[]>([]);
  const [equipamentos, setEquipamentos] = useState<LookupTable[]>([]);

  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSecretaria, setSelectedSecretaria] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // History States
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [idLegado, setIdLegado] = useState('');
  const [patrimonio, setPatrimonio] = useState<number | ''>('');
  const [secretariaId, setSecretariaId] = useState<number | ''>('');
  const [local, setLocal] = useState('');
  const [marcaId, setMarcaId] = useState<number | ''>('');
  const [equipamentoId, setEquipamentoId] = useState<number | ''>('');
  const [ativo, setAtivo] = useState(true);
  const [garantiaAtiva, setGarantiaAtiva] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [observacao, setObservacao] = useState('');

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

      setSecretarias(secData || []);
      setMarcas(marData || []);
      setEquipamentos(eqData || []);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSecretaria]);

  const fetchHistory = async (compId: number) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('historico_computadores')
        .select(`
          *,
          sec_anterior:secretaria_anterior_id(nome),
          sec_nova:secretaria_nova_id(nome)
        `)
        .eq('computador_id', compId)
        .order('data_alteracao', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setIdLegado('');
    setPatrimonio('');
    setSecretariaId('');
    setLocal('');
    setMarcaId(marcas[0]?.id || '');
    setEquipamentoId(equipamentos[0]?.id || '');
    setAtivo(true);
    setGarantiaAtiva(false);
    setUsuario('');
    setObservacao('');
    setErrorMsg('');
    setSuccessMsg('');
    setHistory([]);
    setModalOpen(true);
  };

  const openEditModal = (comp: Computer) => {
    setIsEditing(true);
    setEditingId(comp.id);
    setIdLegado(comp.id_legado || '');
    setPatrimonio(comp.patrimonio || '');
    setSecretariaId(comp.secretaria_id);
    setLocal(comp.local || '');
    setMarcaId(comp.marca_id);
    setEquipamentoId(comp.equipamento_id);
    setAtivo(comp.ativo);
    setGarantiaAtiva(comp.garantia_ativa);
    setUsuario(comp.usuario || '');
    setObservacao(comp.observacao || '');
    setErrorMsg('');
    setSuccessMsg('');
    setHistory([]);
    setModalOpen(true);
    fetchHistory(comp.id);
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
    if (!local.trim()) {
      setErrorMsg('O campo Local/Setor é obrigatório.');
      setSubmitting(false);
      return;
    }

    const payload = {
      id_legado: idLegado.trim().toUpperCase() || null,
      patrimonio: patrimonio === '' ? null : Number(patrimonio),
      secretaria_id: Number(secretariaId),
      local: local.trim().toUpperCase(),
      marca_id: Number(marcaId),
      equipamento_id: Number(equipamentoId),
      ativo,
      garantia_ativa: garantiaAtiva,
      usuario: usuario.trim().toUpperCase() || null,
      observacao: observacao.trim().toUpperCase() || null
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

  const itemsPerPage = 50;
  const totalItems = filteredComputers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedComputers = filteredComputers.slice(startIndex, startIndex + itemsPerPage);


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
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">ID / Legado</th>
                  <th className="py-4 px-6">Patrimônio</th>
                  <th className="py-4 px-6">Equipamento / Marca</th>
                  <th className="py-4 px-6">Secretaria / Local</th>
                  <th className="py-4 px-6 text-center">Ativo</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedComputers.map((comp) => (
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
                      {comp.patrimonio || <span className="text-slate-400 font-normal">---</span>}
                    </td>

                    {/* Equipamento / Marca */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">
                        {comp.equipamentos?.nome || 'Desktop'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {comp.marcas?.nome || 'Não Especificado'}
                      </p>
                    </td>

                    {/* Secretaria / Local */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{comp.secretarias?.nome}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{comp.local}</p>
                      {comp.usuario && (
                        <p className="text-[10px] text-blue-600 font-medium mt-0.5">Usuário: {comp.usuario}</p>
                      )}
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

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/30">
            <p className="text-2xs text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : startIndex + 1}</span> a{' '}
              <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de{' '}
              <span className="font-semibold text-slate-700">{totalItems}</span> computadores
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-2xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(page => {
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-2 text-2xs text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`inline-flex items-center justify-center rounded-lg w-8 h-8 text-2xs font-semibold border transition-colors cursor-pointer ${
                            currentPage === page
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-2xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Main Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className={`w-full rounded-2xl bg-white p-6 shadow-xl animate-fade-in border border-slate-100 max-h-[90vh] overflow-y-auto transition-all ${isEditing ? 'max-w-4xl' : 'max-w-lg'}`}>

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

            <div className={`mt-4 ${isEditing ? 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start' : ''}`}>
              <form onSubmit={handleSubmit} className="space-y-4">

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
                    <label htmlFor="secretaria" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Secretaria *</label>
                    <select
                      id="secretaria"
                      required
                      value={secretariaId}
                      onChange={(e) => setSecretariaId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                    >
                      <option value="" disabled>— Selecione —</option>
                      {secretarias.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="local" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Local/Setor *</label>
                    <input
                      id="local"
                      type="text"
                      required
                      placeholder="Ex: Financeiro, Recepção..."
                      value={local}
                      onChange={(e) => setLocal(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
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

                {/* Usuário do Computador */}
                <div>
                  <label htmlFor="usuario" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Usuário do Computador</label>
                  <input
                    id="usuario"
                    type="text"
                    placeholder="Ex: João Silva, Recepção principal..."
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
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

              {isEditing && (
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6 max-h-[70vh] overflow-y-auto pr-2">
                  <h4 className="font-bold text-slate-800 text-sm">Histórico de Movimentações</h4>
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-2xs text-slate-400 py-6 text-center">Nenhuma movimentação registrada.</p>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {history.map((item) => (
                        <div key={item.id} className="relative pl-6 text-2xs space-y-1">
                          {/* Timeline dot */}
                          <div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 border border-white shadow-sm" />
                          
                          <p className="font-semibold text-slate-700">
                            {new Date(item.data_alteracao).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(item.data_alteracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1.5 text-slate-600">
                            {item.secretaria_anterior_id !== item.secretaria_nova_id && (
                              <p className="leading-relaxed">
                                <span className="font-semibold text-slate-400 block mb-0.5 text-3xs uppercase tracking-wide">Secretaria</span>
                                <span className="line-through text-slate-400/80 mr-1.5">{item.sec_anterior?.nome || 'N/A'}</span>
                                <span className="text-slate-400 mr-1.5">➔</span>
                                <span className="font-bold text-slate-800">{item.sec_nova?.nome || 'N/A'}</span>
                              </p>
                            )}
                            {item.local_anterior !== item.local_novo && (
                              <p className="leading-relaxed">
                                <span className="font-semibold text-slate-400 block mb-0.5 text-3xs uppercase tracking-wide">Local/Setor</span>
                                <span className="line-through text-slate-400/80 mr-1.5">{item.local_anterior || 'N/A'}</span>
                                <span className="text-slate-400 mr-1.5">➔</span>
                                <span className="font-bold text-slate-800">{item.local_novo || 'N/A'}</span>
                              </p>
                            )}
                            {item.usuario_anterior !== item.usuario_novo && (
                              <p className="leading-relaxed">
                                <span className="font-semibold text-slate-400 block mb-0.5 text-3xs uppercase tracking-wide">Usuário/Dono</span>
                                <span className="line-through text-slate-400/80 mr-1.5">{item.usuario_anterior || 'N/A'}</span>
                                <span className="text-slate-400 mr-1.5">➔</span>
                                <span className="font-bold text-slate-800">{item.usuario_novo || 'N/A'}</span>
                              </p>
                            )}
                          </div>
                          <p className="text-3xs text-slate-400">
                            Alterado por: <span className="font-medium text-slate-600">{item.alterado_por}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
