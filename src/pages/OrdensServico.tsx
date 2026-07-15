import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  ClipboardList, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Package, 
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';

interface OS {
  id: number;
  computador_id: number;
  data_abertura: string;
  defeito_id: number;
  status: 'Em andamento' | 'Pronto para retirada' | 'Concluído' | 'Entregue';
  solucao_encontrada: string | null;
  formatado: boolean;
  backup_realizado: boolean;
  aguardando_pecas: boolean;
  reparo_concluido: boolean;
  entregue: boolean;
  entregue_para: string | null;
  data_entrega: string | null;
  observacao: string | null;
  criado_por: string | null;
  computadores?: {
    id: number;
    id_legado: string | null;
    patrimonio: number | null;
    ativo?: boolean;
    secretarias?: { nome: string };
    marcas?: { nome: string };
    equipamentos?: { nome: string };
  };
  defeitos?: { nome: string };
}

interface LookupTable {
  id: number;
  nome: string;
}

interface ComputerSearchRow {
  id: number;
  id_legado: string | null;
  patrimonio: number | null;
  secretarias: { nome: string } | null;
  marcas: { nome: string } | null;
  ativo: boolean;
}

export const OrdensServico: React.FC = () => {
  const { isAdmin, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Data States
  const [orders, setOrders] = useState<OS[]>([]);
  const [defeitos, setDefeitos] = useState<LookupTable[]>([]);
  
  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [defeitoId, setDefeitoId] = useState<number | ''>('');
  const [solucaoEncontrada, setSolucaoEncontrada] = useState('');
  const [formatado, setFormatado] = useState(false);
  const [backupRealizado, setBackupRealizado] = useState(false);
  const [aguardandoPecas, setAguardandoPecas] = useState(false);
  const [reparoConcluido, setReparoConcluido] = useState(false);
  const [entregue, setEntregue] = useState(false);
  const [entreguePara, setEntreguePara] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [observacao, setObservacao] = useState('');
  const [criadoPor, setCriadoPor] = useState('');

  // Autocomplete search for Computer
  const [compSearch, setCompSearch] = useState('');
  const [compSearchResults, setCompSearchResults] = useState<ComputerSearchRow[]>([]);
  const [selectedComp, setSelectedComp] = useState<ComputerSearchRow | null>(null);
  const [searchingComp, setSearchingComp] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch OS
      const { data: osData, error: osErr } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          computadores (
            id,
            id_legado,
            patrimonio,
            ativo,
            secretarias(nome),
            marcas(nome),
            equipamentos(nome)
          ),
          defeitos (nome)
        `)
        .order('id', { ascending: false });

      if (osErr) throw osErr;
      setOrders(osData as unknown as OS[]);

      // Fetch defeitos lookup
      const { data: defData } = await supabase.from('defeitos').select('*').order('nome');
      setDefeitos(defData || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao buscar dados das Ordens de Serviço.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  useEffect(() => {
    if (location.state && (location.state as any).editOSId && orders.length > 0) {
      const osId = (location.state as any).editOSId;
      const found = orders.find(o => o.id === osId);
      if (found) {
        openEditModal(found);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, orders, navigate]);

  // Handle autocomplete query for computers
  useEffect(() => {
    const searchComputers = async () => {
      if (!compSearch.trim()) {
        setCompSearchResults([]);
        return;
      }

      setSearchingComp(true);
      try {
        const term = compSearch.trim();
        const isNum = /^\d+$/.test(term);
        
        let query = supabase
          .from('computadores')
          .select('id, id_legado, patrimonio, secretarias(nome), marcas(nome), ativo');

        if (isNum) {
          const num = parseInt(term, 10);
          query = query.or(`id.eq.${num},patrimonio.eq.${num},id_legado.ilike.%${term}%`);
        } else {
          query = query.ilike('id_legado', `%${term}%`);
        }

        const { data, error } = await query.limit(5);

        if (error) throw error;
        setCompSearchResults((data || []) as unknown as ComputerSearchRow[]);
      } catch (err) {
        console.error('Erro ao buscar computadores:', err);
      } finally {
        setSearchingComp(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchComputers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [compSearch]);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setDefeitoId('');
    setSolucaoEncontrada('');
    setFormatado(false);
    setBackupRealizado(false);
    setAguardandoPecas(false);
    setReparoConcluido(false);
    setEntregue(false);
    setEntreguePara('');
    setDataEntrega('');
    setObservacao('');
    setCriadoPor(profile?.nome_completo || '');
    
    setCompSearch('');
    setSelectedComp(null);
    setCompSearchResults([]);
    
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const openEditModal = (os: OS) => {
    setIsEditing(true);
    setEditingId(os.id);
    setDefeitoId(os.defeito_id);
    setSolucaoEncontrada(os.solucao_encontrada || '');
    setFormatado(os.formatado);
    setBackupRealizado(os.backup_realizado);
    setAguardandoPecas(os.aguardando_pecas);
    setReparoConcluido(os.reparo_concluido);
    setEntregue(os.entregue);
    setEntreguePara(os.entregue_para || '');
    setDataEntrega(os.data_entrega || '');
    setObservacao(os.observacao || '');
    setCriadoPor(os.criado_por || '');
    
    if (os.computadores) {
      setSelectedComp({
        id: os.computadores.id,
        id_legado: os.computadores.id_legado,
        patrimonio: os.computadores.patrimonio,
        ativo: os.computadores.ativo ?? true,
        secretarias: os.computadores.secretarias || null,
        marcas: os.computadores.marcas || null
      });
    }

    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!selectedComp) {
      setErrorMsg('Selecione um computador para esta OS.');
      setSubmitting(false);
      return;
    }

    if (!selectedComp.ativo) {
      setErrorMsg('Não é permitido abrir ou editar Ordens de Serviço para computadores inativos.');
      setSubmitting(false);
      return;
    }

    if (!defeitoId) {
      setErrorMsg('Selecione o defeito apresentado.');
      setSubmitting(false);
      return;
    }

    const payload = {
      computador_id: selectedComp.id,
      defeito_id: Number(defeitoId),
      solucao_encontrada: solucaoEncontrada || null,
      formatado,
      backup_realizado: backupRealizado,
      aguardando_pecas: aguardandoPecas,
      reparo_concluido: reparoConcluido,
      entregue,
      entregue_para: entreguePara || null,
      data_entrega: dataEntrega || null,
      observacao: observacao || null
    };

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ordens_servico')
          .insert(payload);

        if (error) throw error;
      }

      setModalOpen(false);
      fetchData();
      const msg = isEditing ? 'Ordem de Serviço atualizada com sucesso!' : 'Ordem de Serviço aberta com sucesso!';
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar a Ordem de Serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      alert('Ação proibida: Apenas administradores podem excluir Ordens de Serviço.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir permanentemente esta Ordem de Serviço?')) {
      try {
        const { error } = await supabase
          .from('ordens_servico')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSuccessMsg('Ordem de Serviço excluída com sucesso!');
        fetchData();
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Erro ao excluir o registro.');
      }
    }
  };

  const getStatusBadge = (status: OS['status']) => {
    switch (status) {
      case 'Em andamento':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pronto para retirada':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'Entregue':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Concluído':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusIcon = (status: OS['status']) => {
    switch (status) {
      case 'Em andamento':
        return <Clock size={12} />;
      case 'Pronto para retirada':
        return <AlertTriangle size={12} />;
      case 'Entregue':
        return <Package size={12} />;
      case 'Concluído':
        return <CheckCircle size={12} />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredOrders = orders.filter(o => {
    const textMatch = 
      o.id.toString().includes(searchTerm) ||
      (o.computadores?.patrimonio?.toString() || '').includes(searchTerm) ||
      (o.computadores?.id_legado?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (o.criado_por?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const statusMatch = selectedStatus === '' || o.status === selectedStatus;

    return textMatch && statusMatch;
  });

  const itemsPerPage = 50;
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Ordens de Serviço (OS)</h2>
          <p className="text-xs text-slate-500 mt-1">Gerencie a manutenção, reparo e entrega dos equipamentos da prefeitura.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
          Abrir Ordem de Serviço
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

      {/* Filter Options */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por ID da OS, Patrimônio, Técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="block w-full md:w-48 rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs text-slate-700 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          <option value="">Todos os Status</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Pronto para retirada">Pronto para retirada</option>
          <option value="Entregue">Entregue</option>
          <option value="Concluído">Concluído</option>
        </select>

      </div>

      {/* Table List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200/60 rounded-2xl">
          <ClipboardList size={48} className="text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-500">Nenhuma Ordem de Serviço encontrada.</p>
          <p className="text-xs text-slate-400">Abra uma nova Ordem de Serviço.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">ID da OS</th>
                  <th className="py-4 px-6">Computador (Patrimônio/Legado)</th>
                  <th className="py-4 px-6">Abertura</th>
                  <th className="py-4 px-6">Defeito Reclamado</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Técnico</th>
                  <th className="py-4 px-6">Entrega</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedOrders.map((os) => (
                  <tr 
                    key={os.id} 
                    onClick={() => openEditModal(os)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    
                    {/* OS ID */}
                    <td className="py-4 px-6 font-bold text-slate-800">
                      #{os.id}
                    </td>

                    {/* Computador */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">
                        {os.computadores?.equipamentos?.nome || 'Desktop'} {os.computadores?.marcas?.nome}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Patrimônio: {os.computadores?.patrimonio || '---'} 
                        {os.computadores?.id_legado && ` | Legado: ${os.computadores.id_legado}`}
                      </p>
                      <p className="text-[10px] text-slate-400/80">
                        Setor: {os.computadores?.secretarias?.nome}
                      </p>
                    </td>

                    {/* Data Abertura */}
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      {formatDate(os.data_abertura)}
                    </td>

                    {/* Defeito */}
                    <td className="py-4 px-6">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-2xs font-medium text-slate-700">
                        {os.defeitos?.nome}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span className={`
                        inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border uppercase tracking-wider
                        ${getStatusBadge(os.status)}
                      `}>
                        {getStatusIcon(os.status)}
                        {os.status}
                      </span>
                    </td>

                    {/* Técnico */}
                    <td className="py-4 px-6 text-slate-500 font-medium text-[11px]">
                      {os.criado_por || 'N/A'}
                    </td>

                    {/* Entrega */}
                    <td className="py-4 px-6">
                      {os.data_entrega ? (
                        <div>
                          <p className="font-semibold text-slate-700">{formatDate(os.data_entrega)}</p>
                          <p className="text-[10px] text-slate-400">Para: {os.entregue_para || 'Retirado'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(os);
                          }}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Ver / Editar OS"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(os.id);
                          }}
                          disabled={!isAdmin}
                          className={`
                            rounded-lg p-1.5 transition-colors
                            ${isAdmin 
                              ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' 
                              : 'text-slate-300 cursor-not-allowed'}
                          `}
                          title={isAdmin ? 'Excluir OS' : 'Apenas administradores podem excluir'}
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
              <span className="font-semibold text-slate-700">{totalItems}</span> ordens de serviço
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

      {/* Main OS Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-fade-in border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {isEditing ? `Editar OS #${editingId}` : 'Abrir Nova Ordem de Serviço'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              
              {/* ID da OS */}
              <div>
                <label className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  ID da OS
                </label>
                <input
                  type="text"
                  disabled
                  placeholder={isEditing && editingId ? `#${editingId}` : 'Gerado ao salvar'}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 px-3 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Computer Search & Select */}
              <div>
                <label className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Computador * {selectedComp && '(Selecionado)'}
                </label>

                {isEditing ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-700">
                        {selectedComp?.patrimonio ? `Patrimônio: ${selectedComp.patrimonio}` : 'Sem Patrimônio'} 
                        {selectedComp?.id_legado && ` | Legado: ${selectedComp.id_legado}`}
                      </p>
                      <p className="text-slate-500 text-3xs mt-0.5">
                        Secretaria: {selectedComp?.secretarias?.nome || 'N/A'} | ID Interno: #{selectedComp?.id}
                      </p>
                    </div>
                    <span className="text-2xs text-slate-400 font-semibold italic">Máquina Vinculada</span>
                  </div>
                ) : selectedComp ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-blue-900">
                        {selectedComp.patrimonio ? `Patrimônio: ${selectedComp.patrimonio}` : 'Sem Patrimônio'} 
                        {selectedComp.id_legado && ` | Legado: ${selectedComp.id_legado}`}
                      </p>
                      <p className="text-blue-700 text-3xs mt-0.5">
                        Secretaria: {selectedComp.secretarias?.nome || 'N/A'} | ID Interno: #{selectedComp.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedComp(null)}
                      className="rounded-lg p-1 text-blue-600 hover:bg-blue-100"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      {searchingComp ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </span>
                    <input
                      type="text"
                      placeholder="Pesquise por Patrimônio, Código ou Código Legado da máquina..."
                      value={compSearch}
                      onChange={(e) => setCompSearch(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                    />

                    {/* Autocomplete Dropdown */}
                    {compSearchResults.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-lg divide-y divide-slate-100 overflow-hidden">
                        {compSearchResults.map(comp => (
                          <div
                            key={comp.id}
                            onClick={() => {
                              if (!comp.ativo) {
                                alert('Atenção: Este computador está INATIVO no sistema e não pode receber novas Ordens de Serviço.');
                                return;
                              }
                              setSelectedComp(comp);
                              setCompSearchResults([]);
                              setCompSearch('');
                            }}
                            className="p-3 text-xs hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                {comp.patrimonio ? `Patrimônio: ${comp.patrimonio}` : 'Sem Patrimônio'}
                                {comp.id_legado && ` (Legado: ${comp.id_legado})`}
                                {!comp.ativo && (
                                  <span className="inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 border border-rose-100 uppercase tracking-wider">
                                    Inativo
                                  </span>
                                )}
                              </p>
                              <p className="text-3xs text-slate-400 mt-0.5">Secretaria: {comp.secretarias?.nome || 'N/A'}</p>
                            </div>
                            <span className="text-3xs text-slate-400">Interno: #{comp.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Defeito Apresentado */}
              <div>
                <label htmlFor="defeito" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Defeito Apresentado *</label>
                <select
                  id="defeito"
                  required
                  value={defeitoId}
                  onChange={(e) => setDefeitoId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="" disabled>Selecione o defeito...</option>
                  {defeitos.map(def => (
                    <option key={def.id} value={def.id}>{def.nome}</option>
                  ))}
                </select>
              </div>

              {/* Solução Encontrada */}
              <div>
                <label htmlFor="solucao" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Solução Encontrada</label>
                <textarea
                  id="solucao"
                  rows={3}
                  placeholder="Descreva a solução técnica aplicada ao equipamento..."
                  value={solucaoEncontrada}
                  onChange={(e) => setSolucaoEncontrada(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Checkboxes Técnicas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <label className="relative flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formatado}
                    onChange={(e) => setFormatado(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-700">Máquina Formatada</span>
                </label>

                <label className="relative flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupRealizado}
                    onChange={(e) => setBackupRealizado(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-700">Backup Realizado</span>
                </label>

                <label className="relative flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aguardandoPecas}
                    onChange={(e) => setAguardandoPecas(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-700">Aguardando Peças</span>
                </label>
              </div>

              {/* Status Automations section */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-4">
                
                <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                  <Info size={14} />
                  <span>Automatização de Status e Entrega</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Reparo Concluido Checkbox */}
                  <label className="relative flex items-start gap-2.5 cursor-pointer rounded-lg bg-white p-3 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={reparoConcluido}
                      onChange={(e) => {
                        setReparoConcluido(e.target.checked);
                        if (!e.target.checked) {
                          setEntregue(false);
                          setDataEntrega('');
                          setEntreguePara('');
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 mt-0.5"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-800">Reparo Concluído</span>
                      <span className="block text-3xs text-slate-400 mt-0.5">Define o status como "Pronto para retirada".</span>
                    </div>
                  </label>

                  {/* Entregue Checkbox */}
                  <label className={`
                    relative flex items-start gap-2.5 cursor-pointer rounded-lg p-3 border transition-all duration-200
                    ${reparoConcluido 
                      ? 'bg-white border-slate-100 hover:bg-slate-50' 
                      : 'bg-slate-50/50 border-slate-100 opacity-60 cursor-not-allowed'}
                  `}>
                    <input
                      type="checkbox"
                      disabled={!reparoConcluido}
                      checked={entregue}
                      onChange={(e) => {
                        setEntregue(e.target.checked);
                        if (e.target.checked) {
                          // Auto set current date if blank
                          if (!dataEntrega) {
                            setDataEntrega(new Date().toISOString().split('T')[0]);
                          }
                        } else {
                          setDataEntrega('');
                          setEntreguePara('');
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 mt-0.5"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-800">Entregue / Retirado</span>
                      <span className="block text-3xs text-slate-400 mt-0.5">Define o status como "Entregue". Requer reparo concluído.</span>
                    </div>
                  </label>
                </div>

                {/* Delivery details (visible if entregue is checked) */}
                {entregue && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-fade-in">
                    <div>
                      <label htmlFor="entregue-para" className="block text-3xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Entregue Para *</label>
                      <input
                        id="entregue-para"
                        type="text"
                        required={entregue}
                        placeholder="Nome de quem retirou"
                        value={entreguePara}
                        onChange={(e) => setEntreguePara(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="data-entrega" className="block text-3xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Data de Entrega *</label>
                      <input
                        id="data-entrega"
                        type="date"
                        required={entregue}
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-4xs text-slate-400 mt-1 block">Configurar data finaliza a OS como "Concluído".</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Observação Livre */}
              <div>
                <label htmlFor="observacao" className="block text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Observações Adicionais</label>
                <textarea
                  id="observacao"
                  rows={2}
                  placeholder="Informações adicionais relevantes sobre a máquina..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Created By Technician Info */}
              {isEditing && criadoPor && (
                <div className="text-3xs text-slate-400 font-medium">
                  Aberta pelo técnico: <span className="font-semibold text-slate-500">{criadoPor}</span>
                </div>
              )}

              {/* Submit Buttons */}
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
                  {submitting ? 'Salvando...' : 'Salvar Ordem de Serviço'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
