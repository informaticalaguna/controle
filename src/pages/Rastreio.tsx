import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Search,
  Monitor,
  Route,
  ClipboardList,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PackageCheck,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  User,
  MapPin,
  Building2,
  Laptop,
  History,
  Info,
  Wrench,
  Check,
  X,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface ComputerResult {
  id: number;
  id_legado: string | null;
  patrimonio: number | null;
  data_cadastro: string;
  local: string;
  ativo: boolean;
  garantia_ativa: boolean;
  disponivel: boolean;
  usuario: string | null;
  observacao: string | null;
  secretarias?: { nome: string } | null;
  marcas?: { nome: string } | null;
  equipamentos?: { nome: string } | null;
}

interface WorkOrder {
  id: number;
  computador_id: number;
  data_abertura: string;
  defeito_id: number;
  status: string;
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
  solicitante: string | null;
  telefone_contato: string | null;
  computador_inativo?: boolean;
  defeitos?: { nome: string } | null;
}

export const Rastreio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ComputerResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Machine & OS States
  const [selectedComputer, setSelectedComputer] = useState<ComputerResult | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sorting state for work orders
  // Default: 'asc' (chronological: 1st OS -> Last OS) as requested
  const [chronologicalOrder, setChronologicalOrder] = useState<'asc' | 'desc'>('asc');

  // Format date helper (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '---';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Load OS for a chosen computer
  const handleSelectComputer = useCallback(async (comp: ComputerResult) => {
    setSelectedComputer(comp);
    setLoadingOrders(true);

    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          defeitos (nome)
        `)
        .eq('computador_id', comp.id)
        .order('data_abertura', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;

      setWorkOrders((data || []) as unknown as WorkOrder[]);
    } catch (err: any) {
      console.error('Erro ao carregar Ordens de Serviço:', err);
      setErrorMessage('Não foi possível carregar as Ordens de Serviço deste computador.');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Perform search for computers by id, patrimonio or id_legado
  const handleSearch = useCallback(async (termToSearch?: string, targetCompId?: number) => {
    const term = (termToSearch !== undefined ? termToSearch : searchTerm).trim();
    if (!term) return;

    setIsSearching(true);
    setErrorMessage('');
    setHasSearched(true);
    setSelectedComputer(null);
    setWorkOrders([]);

    try {
      const isNumeric = /^\d+$/.test(term);

      let query = supabase
        .from('computadores')
        .select(`
          id,
          id_legado,
          patrimonio,
          data_cadastro,
          local,
          ativo,
          garantia_ativa,
          disponivel,
          usuario,
          observacao,
          secretarias(nome),
          marcas(nome),
          equipamentos(nome)
        `);

      if (isNumeric) {
        const numVal = parseInt(term, 10);
        // Match by exact ID, exact patrimônio, or legacy code matching
        query = query.or(`id.eq.${numVal},patrimonio.eq.${numVal},id_legado.ilike.%${term}%`);
      } else {
        // String search: legacy code
        query = query.ilike('id_legado', `%${term}%`);
      }

      const { data, error } = await query.order('id', { ascending: false }).limit(20);

      if (error) throw error;

      const results = (data || []) as unknown as ComputerResult[];
      setSearchResults(results);

      // If targetCompId is provided, auto-select that specific computer
      if (targetCompId) {
        const found = results.find(c => c.id === targetCompId);
        if (found) {
          handleSelectComputer(found);
          return;
        }
      }

      // If exactly 1 result found, auto-select it immediately
      if (results.length === 1) {
        handleSelectComputer(results[0]);
      }
    } catch (err: any) {
      console.error('Erro na busca de computadores:', err);
      setErrorMessage('Erro ao realizar a busca. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, handleSelectComputer]);

  // Initial load if query param or state exists
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('q') || (location.state as any)?.searchCode;
    const targetCompId = (location.state as any)?.selectedCompId;
    if (codeParam) {
      setSearchTerm(codeParam);
      handleSearch(codeParam, targetCompId);
    }
  }, [location.search, location.state, handleSearch]);

  // Derived metrics from work orders (chronological basis)
  // Note: workOrders is originally ordered ascending (1st to last)
  const totalOSCount = workOrders.length;
  const firstOS = workOrders.length > 0 ? workOrders[0] : null;
  const lastOS = workOrders.length > 0 ? workOrders[workOrders.length - 1] : null;

  // Ordered list according to user toggle preference
  const displayedWorkOrders = React.useMemo(() => {
    if (chronologicalOrder === 'asc') {
      return workOrders.map((os, index) => ({
        ...os,
        orderIndex: index + 1,
        isFirst: index === 0,
        isLast: index === workOrders.length - 1
      }));
    } else {
      const reversed = [...workOrders].reverse();
      return reversed.map((os, reverseIdx) => {
        const originalIndex = workOrders.length - reverseIdx;
        return {
          ...os,
          orderIndex: originalIndex,
          isFirst: originalIndex === 1,
          isLast: originalIndex === workOrders.length
        };
      });
    }
  }, [workOrders, chronologicalOrder]);

  // Status visual badge styling helper
  const getStatusBadge = (status: string, computadorInativo?: boolean) => {
    if (computadorInativo || status === 'Cancelada') {
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        icon: XCircle,
        text: 'Cancelada (Inativo)'
      };
    }
    switch (status) {
      case 'Entregue':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: PackageCheck,
          text: 'Entregue'
        };
      case 'Concluído':
        return {
          bg: 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
          icon: CheckCircle2,
          text: 'Concluído'
        };
      case 'Aguardando peças':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          icon: AlertTriangle,
          text: 'Aguardando peças'
        };
      case 'Pronto para retirada':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          icon: CheckCircle2,
          text: 'Pronto p/ retirada'
        };
      case 'Em andamento':
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          icon: Clock,
          text: 'Em andamento'
        };
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedComputer(null);
    setWorkOrders([]);
    setHasSearched(false);
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Route size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Rastreio de Computadores
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte o ciclo de vida completo, histórico sequencial de Ordens de Serviço e situação atual.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Help Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Info size={14} className="text-blue-500 shrink-0" />
          <span>Busque por <strong>Código</strong>, <strong>Código Legado</strong> ou <strong>Patrimônio</strong></span>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o Código (ex: 45), Código Legado (ex: ADM-04) ou Patrimônio (ex: 12345)..."
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Limpar campo"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isSearching ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Rastrear</span>
                </>
              )}
            </button>

            {hasSearched && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </form>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Multiple Results Selector (if search returned > 1 computer) */}
        {!selectedComputer && searchResults.length > 1 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-3">
              Encontramos <strong>{searchResults.length}</strong> computadores correspondentes. Escolha qual deseja rastrear:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => handleSelectComputer(comp)}
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Monitor size={14} className="text-blue-600" />
                      Código #{comp.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        comp.ativo
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-rose-100 text-rose-700 border-rose-200'
                      }`}
                    >
                      {comp.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5">
                    {comp.patrimonio && (
                      <p>
                        <strong className="text-slate-700">Patrimônio:</strong> {comp.patrimonio}
                      </p>
                    )}
                    {comp.id_legado && (
                      <p>
                        <strong className="text-slate-700">Cód. Legado:</strong> {comp.id_legado}
                      </p>
                    )}
                    <p className="truncate">
                      <strong className="text-slate-700">Setor:</strong> {comp.secretarias?.nome || comp.local || '---'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Selecionar este</span>
                    <ChevronRight size={13} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Not found message */}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <div className="mt-6 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Monitor size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum computador encontrado</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não localizamos nenhuma máquina com o termo informado. Verifique se o Código, Código Legado ou Patrimônio foram digitados corretamente.
            </p>
          </div>
        )}
      </div>

      {/* Selected Computer Details & History */}
      {selectedComputer && (
        <div className="space-y-6">
          {/* Main Computer Card & Shortcut */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            {/* Top Bar with Status and Direct Shortcut Button */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  <Laptop size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      Computador #{selectedComputer.id}
                    </h2>
                    {/* Active / Inactive Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        selectedComputer.ativo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedComputer.ativo ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {selectedComputer.ativo ? 'Equipamento Ativo' : 'Inativo (Descarte)'}
                    </span>

                    {/* Disponível Badge */}
                    {selectedComputer.disponivel && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        Disponível
                      </span>
                    )}

                    {/* Garantia Badge */}
                    {selectedComputer.garantia_ativa && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <ShieldCheck size={12} />
                        Garantia Ativa
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Cadastrado no sistema em {formatDate(selectedComputer.data_cadastro)}
                  </p>
                </div>
              </div>

              {/* Shortcut Button to Edit/View Computer Registration */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate('/computadores', {
                      state: {
                        editCompId: selectedComputer.id,
                        returnToRastreioTerm: searchTerm.trim() || selectedComputer.id.toString(),
                        returnToRastreioCompId: selectedComputer.id
                      }
                    })
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow-md hover:shadow-blue-600/25 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Acessar Cadastro do Computador</span>
                </button>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 text-xs bg-white">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Patrimônio</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedComputer.patrimonio || 'Não informado'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Código Legado</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedComputer.id_legado || 'Nenhum'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium flex items-center gap-1">
                  <Building2 size={12} /> Secretaria / Setor
                </span>
                <span className="font-bold text-slate-800 truncate block mt-0.5" title={selectedComputer.secretarias?.nome}>
                  {selectedComputer.secretarias?.nome || '---'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium flex items-center gap-1">
                  <MapPin size={12} /> Localização
                </span>
                <span className="font-bold text-slate-800 truncate block mt-0.5" title={selectedComputer.local}>
                  {selectedComputer.local || '---'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Equipamento / Marca</span>
                <span className="font-bold text-slate-800 truncate block mt-0.5">
                  {selectedComputer.equipamentos?.nome || 'Desktop'} - {selectedComputer.marcas?.nome || '---'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium flex items-center gap-1">
                  <User size={12} /> Usuário Atual
                </span>
                <span className="font-bold text-slate-800 truncate block mt-0.5" title={selectedComputer.usuario || ''}>
                  {selectedComputer.usuario || 'Não atribuído'}
                </span>
              </div>
            </div>

            {selectedComputer.observacao && (
              <div className="px-5 pb-4 text-xs text-slate-600 bg-white">
                <span className="font-semibold text-slate-700">Observações da Máquina:</span>{' '}
                <span className="italic">{selectedComputer.observacao}</span>
              </div>
            )}
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total de OS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <ClipboardList size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total de OS
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{totalOSCount}</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {totalOSCount === 1 ? 'ordem de serviço' : 'ordens registradas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 2: Primeira OS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Calendar size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Primeira OS (Origem)
                </span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {firstOS ? formatDate(firstOS.data_abertura) : '---'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {firstOS ? `OS #${firstOS.id} inicial` : 'Sem registros'}
                </p>
              </div>
            </div>

            {/* Metric 3: Última OS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <CalendarCheck size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Última OS (Recente)
                </span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {lastOS ? formatDate(lastOS.data_abertura) : '---'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lastOS ? `OS #${lastOS.id}` : 'Sem registros'}
                </p>
              </div>
            </div>

            {/* Metric 4: Situação da Última OS / Equipamento */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
              {!selectedComputer.ativo ? (
                <>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-rose-50 text-rose-700 border-rose-200">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Situação Atual
                    </span>
                    <p className="text-base font-extrabold text-rose-700 truncate mt-0.5">
                      Inativo (Descarte)
                    </p>
                    <p className="text-[11px] text-rose-500 truncate">
                      {lastOS?.computador_inativo ? 'OS cancelada por inativação' : 'Computador desativado'}
                    </p>
                  </div>
                </>
              ) : lastOS ? (
                <>
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                      getStatusBadge(lastOS.status, lastOS.computador_inativo).bg
                    }`}
                  >
                    {React.createElement(getStatusBadge(lastOS.status, lastOS.computador_inativo).icon, { size: 24 })}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Situação da Última OS
                    </span>
                    <p
                      className={`text-base font-extrabold truncate mt-0.5 ${
                        lastOS.computador_inativo || lastOS.status === 'Cancelada'
                          ? 'text-rose-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {lastOS.computador_inativo ? 'Cancelada (Inativo)' : lastOS.status}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {lastOS.computador_inativo
                        ? 'OS cancelada com comp. inativo'
                        : lastOS.entregue
                        ? `Entregue ${lastOS.data_entrega ? `em ${formatDate(lastOS.data_entrega)}` : ''}`
                        : lastOS.aguardando_pecas
                        ? 'Aguardando chegada de peças'
                        : lastOS.status}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Situação da Última OS
                    </span>
                    <p className="text-base font-bold text-slate-700 mt-0.5">Nenhuma OS</p>
                    <p className="text-[11px] text-slate-400">Sem manutenções</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Current Status Highlight Banner */}
          {selectedComputer && (
            !selectedComputer.ativo ? (
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-rose-50/90 border-rose-300 text-rose-900 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="mt-0.5 sm:mt-0 p-2 rounded-xl bg-white/80 text-rose-600 shadow-xs shrink-0 border border-rose-200">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      Diagnóstico da Situação Atual • Inativo (Descarte)
                      {lastOS && <span className="font-medium text-rose-600">• Última OS (#{lastOS.id})</span>}
                    </h3>
                    <p className="text-sm font-semibold mt-0.5 text-rose-950">
                      Inativo (Descarte) — O computador encontra-se desmarcado como ativo no cadastro de inventário (equipamento inativado para descarte).
                      {lastOS?.computador_inativo && ' A última Ordem de Serviço foi encerrada/cancelada com motivo de computador inativo.'}
                    </p>
                  </div>
                </div>

                {lastOS && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/ordens', {
                        state: {
                          editOSId: lastOS.id,
                          returnToRastreioTerm: searchTerm.trim() || selectedComputer.id.toString(),
                          returnToRastreioCompId: selectedComputer.id
                        }
                      })
                    }
                    className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <span>Ver Detalhes da Última OS</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ) : lastOS ? (
              lastOS.computador_inativo || lastOS.status === 'Cancelada' ? (
                <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-rose-50/90 border-rose-300 text-rose-900 shadow-xs">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="mt-0.5 sm:mt-0 p-2 rounded-xl bg-white/80 text-rose-600 shadow-xs shrink-0 border border-rose-200">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                        Diagnóstico da Situação Atual • Última OS Cancelada (#{lastOS.id})
                      </h3>
                      <p className="text-sm font-semibold mt-0.5 text-rose-950">
                        Cancelada — A última Ordem de Serviço registrada foi cancelada com motivo de computador inativo.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/ordens', {
                        state: {
                          editOSId: lastOS.id,
                          returnToRastreioTerm: searchTerm.trim() || selectedComputer.id.toString(),
                          returnToRastreioCompId: selectedComputer.id
                        }
                      })
                    }
                    className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <span>Ver Detalhes da Última OS</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    lastOS.status === 'Aguardando peças'
                      ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                      : lastOS.status === 'Entregue' || lastOS.status === 'Concluído'
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                      : 'bg-blue-50/80 border-blue-300 text-blue-900'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="mt-0.5 sm:mt-0 p-2 rounded-xl bg-white/70 shadow-xs shrink-0">
                      {React.createElement(getStatusBadge(lastOS.status, lastOS.computador_inativo).icon, { size: 20 })}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        Diagnóstico da Situação Atual • Última OS (#{lastOS.id})
                      </h3>
                      <p className="text-sm font-semibold mt-0.5">
                        {lastOS.status === 'Aguardando peças' && (
                          <span>O computador aguarda a reposição de peças para continuidade da manutenção.</span>
                        )}
                        {lastOS.status === 'Entregue' && (
                          <span>
                            Equipamento entregue {lastOS.entregue_para ? `para ${lastOS.entregue_para}` : ''}{' '}
                            {lastOS.data_entrega ? `em ${formatDate(lastOS.data_entrega)}` : ''}.
                          </span>
                        )}
                        {lastOS.status === 'Concluído' && (
                          <span>Manutenção finalizada com sucesso. Pronto ou em fase de entrega.</span>
                        )}
                        {lastOS.status === 'Pronto para retirada' && (
                          <span>Serviço concluído na bancada. Pronto para retirada pelo setor solicitante.</span>
                        )}
                        {lastOS.status === 'Em andamento' && (
                          <span>Atendimento técnico em andamento no laboratório de informática.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/ordens', {
                        state: {
                          editOSId: lastOS.id,
                          returnToRastreioTerm: searchTerm.trim() || selectedComputer.id.toString(),
                          returnToRastreioCompId: selectedComputer.id
                        }
                      })
                    }
                    className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-bold rounded-xl shadow-xs border border-black/5 hover:border-black/10 transition-all cursor-pointer shrink-0"
                  >
                    <span>Ver Detalhes da Última OS</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )
            ) : null
          )}

          {/* Chronological Work Orders Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-5">
            {/* Header with Ordering Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Histórico Cronológico das Ordens de Serviço
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe a sequência histórica desde a primeira OS aberta até a última manutenção registrada.
                  </p>
                </div>
              </div>

              {/* Order Direction Toggle */}
              {workOrders.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setChronologicalOrder('asc')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      chronologicalOrder === 'asc'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1ª OS ➔ Última (Cronológica)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChronologicalOrder('desc')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      chronologicalOrder === 'desc'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Última ➔ 1ª OS (Mais recente)
                  </button>
                </div>
              )}
            </div>

            {/* Timeline / OS Cards List */}
            {loadingOrders ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Carregando histórico de Ordens de Serviço...</span>
              </div>
            ) : workOrders.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ClipboardList size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma Ordem de Serviço registrada
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Este computador ainda não passou por nenhuma manutenção registrada no sistema.
                </p>
              </div>
            ) : (
              <div className="relative pl-4 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {displayedWorkOrders.map((os) => {
                  const isCanceled = os.computador_inativo || os.status === 'Cancelada';
                  const statusInfo = getStatusBadge(os.status, os.computador_inativo);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div key={os.id} className="relative group">
                      {/* Timeline Bullet Node */}
                      <div
                        className={`absolute -left-4 sm:-left-8 top-4 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 bg-white transition-all shadow-xs ${
                          os.isLast && isCanceled
                            ? 'border-rose-600 text-rose-600 ring-4 ring-rose-100'
                            : os.isLast
                            ? 'border-blue-600 text-blue-600 ring-4 ring-blue-100'
                            : isCanceled
                            ? 'border-rose-500 text-rose-600 ring-2 ring-rose-50'
                            : os.isFirst
                            ? 'border-emerald-500 text-emerald-600 ring-2 ring-emerald-50'
                            : 'border-slate-300 text-slate-500'
                        }`}
                      >
                        <span className="text-[10px] sm:text-xs font-black">
                          {os.orderIndex}
                        </span>
                      </div>

                      {/* OS Card */}
                      <div
                        className={`rounded-2xl border transition-all p-4 sm:p-5 shadow-xs hover:shadow-md ${
                          os.isLast && isCanceled
                            ? 'bg-gradient-to-br from-white via-rose-50/40 to-white border-rose-400 ring-1 ring-rose-200'
                            : os.isLast
                            ? 'bg-gradient-to-br from-white via-blue-50/20 to-white border-blue-300'
                            : isCanceled
                            ? 'bg-rose-50/15 border-rose-200'
                            : 'bg-white border-slate-200/90'
                        }`}
                      >
                        {/* OS Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Ordinal Tag */}
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                os.isLast && isCanceled
                                  ? 'bg-rose-600 text-white'
                                  : os.isLast
                                  ? 'bg-blue-600 text-white'
                                  : isCanceled
                                  ? 'bg-rose-600 text-white'
                                  : os.isFirst
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {os.orderIndex}ª OS
                              {os.isLast && isCanceled && ' (Última • Cancelada)'}
                              {os.isLast && !isCanceled && ' (Última / Situação Atual)'}
                              {os.isFirst && !os.isLast && !isCanceled && ' (Primeira OS)'}
                              {os.isFirst && !os.isLast && isCanceled && ' (Primeira OS • Cancelada)'}
                              {!os.isFirst && !os.isLast && isCanceled && ' (Cancelada)'}
                            </span>

                            <span className="text-sm font-extrabold text-slate-900">
                              OS #{os.id}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bg}`}
                            >
                              <StatusIcon size={13} />
                              {statusInfo.text}
                            </span>
                          </div>

                          {/* Dates & Direct Shortcut Button */}
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right text-xs">
                              <span className="text-slate-400 block text-[10px]">Data de Abertura</span>
                              <span className="font-bold text-slate-700">
                                {formatDate(os.data_abertura)}
                              </span>
                            </div>

                            {os.data_entrega && (
                              <div className="text-right text-xs pl-3 border-l border-slate-200">
                                <span className="text-slate-400 block text-[10px]">Data de Entrega</span>
                                <span className="font-bold text-emerald-700">
                                  {formatDate(os.data_entrega)}
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                navigate('/ordens', {
                                  state: {
                                    editOSId: os.id,
                                    returnToRastreioTerm: searchTerm.trim() || selectedComputer.id.toString(),
                                    returnToRastreioCompId: selectedComputer.id
                                  }
                                })
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                                os.isLast && isCanceled
                                  ? 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 hover:!bg-blue-600 hover:!text-white'
                              }`}
                              title={`Acessar Ordens de Serviço e abrir OS #${os.id}`}
                            >
                              <span>Acessar OS</span>
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Mini-resumos: Defeito e Solução */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* Defeito Box */}
                          <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100">
                            <div className="flex items-center gap-1.5 text-rose-700 mb-1.5">
                              <AlertTriangle size={15} />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Miniresumo do Defeito
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800">
                              {os.defeitos?.nome || 'Defeito não informado'}
                            </p>
                            {os.observacao && (
                              <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">
                                &ldquo;{os.observacao}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Solução Box */}
                          <div
                            className={`p-3.5 rounded-xl border ${
                              isCanceled
                                ? 'bg-rose-50/50 border-rose-100'
                                : 'bg-emerald-50/50 border-emerald-100'
                            }`}
                          >
                            <div
                              className={`flex items-center gap-1.5 mb-1.5 ${
                                isCanceled ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {isCanceled ? <XCircle size={15} /> : <Wrench size={15} />}
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {isCanceled ? 'Encerramento / Cancelamento' : 'Miniresumo da Solução'}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-800">
                              {isCanceled ? (
                                os.solucao_encontrada || 'OS cancelada com assinalamento de computador inativo (descarte).'
                              ) : os.solucao_encontrada ? (
                                os.solucao_encontrada
                              ) : os.entregue || os.reparo_concluido ? (
                                <span className="text-slate-600">Reparo executado e finalizado pela equipe técnica.</span>
                              ) : (
                                <span className="text-slate-400 italic">Em avaliação / Solução ainda não preenchida.</span>
                              )}
                            </p>

                            {/* Procedure Tags (Formatado, Backup, etc.) */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {os.computador_inativo && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-rose-700 border border-rose-200">
                                  <XCircle size={11} /> Computador Inativo (Cancelada)
                                </span>
                              )}
                              {os.formatado && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                                  <Check size={11} /> Formatado
                                </span>
                              )}
                              {os.backup_realizado && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                                  <Check size={11} /> Backup Realizado
                                </span>
                              )}
                              {os.reparo_concluido && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                                  <Check size={11} /> Reparo Concluído
                                </span>
                              )}
                              {os.aguardando_pecas && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-amber-700 border border-amber-200">
                                  <AlertTriangle size={11} /> Aguardando Peças
                                </span>
                              )}
                              {os.entregue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-teal-700 border border-teal-200">
                                  <PackageCheck size={11} /> Entregue {os.entregue_para ? `(${os.entregue_para})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Extra metadata footer (Solicitante, Técnico) */}
                        {(os.solicitante || os.criado_por || os.telefone_contato) && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                            <div className="flex items-center gap-3">
                              {os.solicitante && (
                                <span>
                                  <strong>Solicitante:</strong> {os.solicitante}{' '}
                                  {os.telefone_contato && `(${os.telefone_contato})`}
                                </span>
                              )}
                            </div>
                            {os.criado_por && (
                              <span>
                                <strong>Técnico / Responsável:</strong> {os.criado_por}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
