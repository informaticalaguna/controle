import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Monitor, 
  Wrench, 
  CheckCircle, 
  Clock, 
  Inbox,
  ArrowUpDown,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface OSWithDetails {
  id: number;
  data_abertura: string;
  status: 'Em andamento' | 'Aguardando peças' | 'Pronto para retirada' | 'Concluído' | 'Entregue' | 'Disponível';
  defeitos: { nome: string } | null;
  computador_inativo?: boolean;
  computadores: {
    id: number;
    id_legado: string | null;
    patrimonio: number | null;
    marcas: { nome: string } | null;
    equipamentos: { nome: string } | null;
    secretarias: { nome: string } | null;
    local: string | null;
    ativo: boolean;
    disponivel: boolean;
  } | null;
}

type StatusFilterType = 'todos' | 'Em andamento' | 'Pronto para retirada' | 'Aguardando peças' | 'Disponível' | 'outros';
type SortOption = 'status_prioridade' | 'status_nome' | 'recentes' | 'antigos' | 'secretaria' | 'equipamento';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalComputers: 0,
    activeOS: 0,
    readyOS: 0,
    completedOS: 0
  });

  const [pendenciasList, setPendenciasList] = useState<OSWithDetails[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterType>('todos');
  const [sortBy, setSortBy] = useState<SortOption>('status_prioridade');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Total Computers Count
      const { count: compCount } = await supabase
        .from('computadores')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch OS lists with computer details
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          data_abertura,
          status,
          computador_inativo,
          defeitos(nome),
          computadores(
            id,
            id_legado,
            patrimonio,
            marcas(nome),
            equipamentos(nome),
            secretarias(nome),
            local,
            ativo,
            disponivel
          )
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      const allOS = (data || []) as unknown as OSWithDetails[];
      
      // Filter out OS with inactive computers or canceled OS
      const validOS = allOS.filter(os => !os.computador_inativo && os.computadores?.ativo !== false);

      const activeCount = validOS.filter(os => 
        os.status === 'Em andamento' || os.status === 'Aguardando peças' || os.status === 'Pronto para retirada'
      ).length;

      const readyCount = validOS.filter(os => os.status === 'Pronto para retirada').length;

      const completedCount = validOS.filter(os => 
        os.status === 'Concluído' || os.status === 'Entregue'
      ).length;

      setStats({
        totalComputers: compCount || 0,
        activeOS: activeCount,
        readyOS: readyCount,
        completedOS: completedCount
      });

      // Apenas pendências ativas de computadores ativos (Em andamento, Aguardando peças, Pronto para retirada)
      const activeOSList = validOS.filter(os => 
        os.status === 'Em andamento' || os.status === 'Aguardando peças' || os.status === 'Pronto para retirada'
      );

      // 3. Fetch Available and Active Computers
      const { data: compData, error: compErr } = await supabase
        .from('computadores')
        .select(`
          id,
          id_legado,
          patrimonio,
          data_cadastro,
          local,
          ativo,
          disponivel,
          marcas(nome),
          equipamentos(nome),
          secretarias(nome)
        `)
        .eq('disponivel', true)
        .eq('ativo', true);

      if (compErr) throw compErr;

      const availableCompList: OSWithDetails[] = (compData as any[] || [])
        .map(c => ({
          id: -c.id, // negative ID to avoid conflicts with OS IDs
          data_abertura: c.data_cadastro || '',
          status: 'Disponível',
          defeitos: null,
          computadores: {
            id: c.id,
            id_legado: c.id_legado,
            patrimonio: c.patrimonio,
            marcas: (Array.isArray(c.marcas) ? c.marcas[0] : c.marcas) || null,
            equipamentos: (Array.isArray(c.equipamentos) ? c.equipamentos[0] : c.equipamentos) || null,
            secretarias: (Array.isArray(c.secretarias) ? c.secretarias[0] : c.secretarias) || null,
            local: c.local || null,
            ativo: c.ativo,
            disponivel: c.disponivel
          }
        }));

      setPendenciasList([...activeOSList, ...availableCompList]);

    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCardClick = (osId: number) => {
    if (osId < 0) {
      navigate('/computadores', { state: { editCompId: -osId } });
    } else {
      navigate('/ordens', { state: { editOSId: osId } });
    }
  };

  // Contagem por status para os filtros rápidos
  const statusCounts = useMemo(() => {
    const counts = {
      todos: pendenciasList.length,
      'Em andamento': 0,
      'Pronto para retirada': 0,
      'Aguardando peças': 0,
      'Disponível': 0,
      outros: 0
    };

    pendenciasList.forEach(item => {
      if (item.status === 'Em andamento') counts['Em andamento']++;
      else if (item.status === 'Pronto para retirada') counts['Pronto para retirada']++;
      else if (item.status === 'Aguardando peças') counts['Aguardando peças']++;
      else if (item.status === 'Disponível') counts['Disponível']++;
      else counts.outros++;
    });

    return counts;
  }, [pendenciasList]);

  // Lista filtrada e ordenada
  const filteredAndSortedPendencias = useMemo(() => {
    let result = [...pendenciasList];

    // 1. Filtro por status
    if (selectedStatus !== 'todos') {
      if (selectedStatus === 'outros') {
        const standardStatuses = ['Em andamento', 'Pronto para retirada', 'Aguardando peças', 'Disponível'];
        result = result.filter(item => !standardStatuses.includes(item.status));
      } else {
        result = result.filter(item => item.status === selectedStatus);
      }
    }

    // 2. Filtro por termo de busca
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => {
        const id = item.computadores?.id?.toString() || '';
        const patr = item.computadores?.patrimonio?.toString() || '';
        const idLegado = item.computadores?.id_legado?.toLowerCase() || '';
        const marca = item.computadores?.marcas?.nome?.toLowerCase() || '';
        const equip = item.computadores?.equipamentos?.nome?.toLowerCase() || '';
        const sec = item.computadores?.secretarias?.nome?.toLowerCase() || '';
        const loc = item.computadores?.local?.toLowerCase() || '';
        const status = item.status.toLowerCase();
        const defeito = item.defeitos?.nome?.toLowerCase() || '';

        return id.includes(term) ||
          patr.includes(term) ||
          idLegado.includes(term) ||
          marca.includes(term) ||
          equip.includes(term) ||
          sec.includes(term) ||
          loc.includes(term) ||
          status.includes(term) ||
          defeito.includes(term);
      });
    }

    // 3. Ordenação
    const statusPriorityMap: Record<string, number> = {
      'Pronto para retirada': 1,
      'Em andamento': 2,
      'Aguardando peças': 3,
      'Disponível': 4
    };

    result.sort((a, b) => {
      switch (sortBy) {
        case 'status_prioridade': {
          const prioA = statusPriorityMap[a.status] || 99;
          const prioB = statusPriorityMap[b.status] || 99;
          if (prioA !== prioB) return prioA - prioB;
          return Math.abs(b.id) - Math.abs(a.id); // desempate por mais recente
        }
        case 'status_nome': {
          return a.status.localeCompare(b.status);
        }
        case 'recentes': {
          return Math.abs(b.id) - Math.abs(a.id);
        }
        case 'antigos': {
          return Math.abs(a.id) - Math.abs(b.id);
        }
        case 'secretaria': {
          const secA = a.computadores?.secretarias?.nome || '';
          const secB = b.computadores?.secretarias?.nome || '';
          return secA.localeCompare(secB);
        }
        case 'equipamento': {
          const eqA = `${a.computadores?.equipamentos?.nome || ''} ${a.computadores?.marcas?.nome || ''}`;
          const eqB = `${b.computadores?.equipamentos?.nome || ''} ${b.computadores?.marcas?.nome || ''}`;
          return eqA.localeCompare(eqB);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [pendenciasList, selectedStatus, searchTerm, sortBy]);

  const getStatusBadge = (status: string, computadorInativo?: boolean) => {
    if (computadorInativo) {
      return (
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-red-100 text-red-800 border-red-200">
          Cancelada (Inativo)
        </span>
      );
    }

    switch (status) {
      case 'Pronto para retirada':
        return (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-amber-100 text-amber-800 border-amber-300 animate-pulse flex items-center gap-1">
            <Clock size={11} className="shrink-0" />
            Pronto para retirada
          </span>
        );
      case 'Em andamento':
        return (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
            <Wrench size={11} className="shrink-0" />
            Em andamento
          </span>
        );
      case 'Aguardando peças':
        return (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
            <AlertCircle size={11} className="shrink-0" />
            Aguardando peças
          </span>
        );
      case 'Disponível':
        return (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
            <CheckCircle2 size={11} className="shrink-0" />
            Disponível
          </span>
        );
      default:
        return (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-slate-100 text-slate-800 border-slate-200 flex items-center gap-1">
            <HelpCircle size={11} className="shrink-0" />
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Welcome & Stats Row */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Visão Geral do Departamento</h2>
        <p className="text-xs text-slate-500 mt-0.5">Status em tempo real das máquinas e ordens de serviço da prefeitura.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Computers */}
        <div className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-100/60 via-blue-50/80 to-sky-50/70 px-4 py-3 shadow-sm shadow-blue-900/5 border border-blue-200/80 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/25 transition-transform duration-200 group-hover:scale-105">
            <Monitor size={17} className="shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/70">Total de Máquinas</p>
            <p className="text-xl font-black text-slate-800 leading-tight mt-0.5">{stats.totalComputers}</p>
          </div>
        </div>

        {/* Active OS */}
        <div className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-100/60 via-blue-50/80 to-sky-50/70 px-4 py-3 shadow-sm shadow-blue-900/5 border border-blue-200/80 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/20 transition-transform duration-200 group-hover:scale-105">
            <Wrench size={17} className="shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/70">Em Manutenção</p>
            <p className="text-xl font-black text-slate-800 leading-tight mt-0.5">{stats.activeOS}</p>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-100/60 via-blue-50/80 to-sky-50/70 px-4 py-3 shadow-sm shadow-blue-900/5 border border-blue-200/80 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
            <Clock size={17} className="shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/70">Prontos p/ Retirada</p>
            <p className="text-xl font-black text-slate-800 leading-tight mt-0.5">{stats.readyOS}</p>
          </div>
        </div>

        {/* Completed OS */}
        <div className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-100/60 via-blue-50/80 to-sky-50/70 px-4 py-3 shadow-sm shadow-blue-900/5 border border-blue-200/80 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 transition-transform duration-200 group-hover:scale-105">
            <CheckCircle size={17} className="shrink-0" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/70">Concluídos / Entregues</p>
            <p className="text-xl font-black text-slate-800 leading-tight mt-0.5">{stats.completedOS}</p>
          </div>
        </div>

      </div>

      {/* Quadro Principal: Pendências */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
        
        {/* Cabeçalho do Quadro */}
        <div className="flex flex-col gap-4 pb-5 border-b border-slate-100 lg:flex-row lg:items-center lg:justify-between">
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h3 className="font-bold text-slate-800 text-lg">Pendências</h3>
                <span className="rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  {filteredAndSortedPendencias.length} {filteredAndSortedPendencias.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Máquinas em manutenção, prontas para retirada ou disponíveis</p>
            </div>
          </div>

          {/* Ferramentas: Busca e Ordenação */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Campo de Busca */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por ID, patrimônio, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <ArrowUpDown size={14} className="text-slate-500" />
                  <span className="text-slate-500 font-normal">Ordenar por:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Ordenar por"
                    className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="status_prioridade">Status (Prioridade)</option>
                    <option value="status_nome">Status (A-Z)</option>
                    <option value="recentes">Mais Recentes</option>
                    <option value="antigos">Mais Antigos</option>
                    <option value="secretaria">Secretaria (A-Z)</option>
                    <option value="equipamento">Equipamento (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Filtros Rápidos de Status */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 border-b border-slate-100 no-scrollbar">
          <span className="text-xs font-medium text-slate-400 mr-1 shrink-0">Filtrar por Status:</span>
          
          <button
            onClick={() => setSelectedStatus('todos')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'todos'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedStatus === 'todos' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600'
            }`}>
              {statusCounts.todos}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('Em andamento')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'Em andamento'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Em andamento
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedStatus === 'Em andamento' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {statusCounts['Em andamento']}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('Pronto para retirada')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'Pronto para retirada'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping"></span>
            Pronto para retirada
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedStatus === 'Pronto para retirada' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {statusCounts['Pronto para retirada']}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('Aguardando peças')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'Aguardando peças'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Aguardando peças
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedStatus === 'Aguardando peças' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
            }`}>
              {statusCounts['Aguardando peças']}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('Disponível')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedStatus === 'Disponível'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Disponível
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedStatus === 'Disponível' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {statusCounts['Disponível']}
            </span>
          </button>

          {statusCounts.outros > 0 && (
            <button
              onClick={() => setSelectedStatus('outros')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedStatus === 'outros'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Outros
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'outros' ? 'bg-slate-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {statusCounts.outros}
              </span>
            </button>
          )}
        </div>

        {/* Lista de Itens */}
        <div className="mt-4 space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
          {filteredAndSortedPendencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={44} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Nenhuma pendência encontrada</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm || selectedStatus !== 'todos' 
                  ? 'Tente ajustar os filtros de status ou a busca.' 
                  : 'Não há máquinas pendentes ou na sala de TI no momento.'}
              </p>
              {(searchTerm || selectedStatus !== 'todos') && (
                <button
                  onClick={() => {
                    setSelectedStatus('todos');
                    setSearchTerm('');
                  }}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          ) : (
            filteredAndSortedPendencias.map((os) => (
              <div 
                key={os.id}
                onClick={() => handleCardClick(os.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3.5 transition-all duration-200 hover:bg-white hover:shadow-md hover:border-blue-200 cursor-pointer active:scale-[0.99]"
              >
                {/* Lado Esquerdo: Identificação & Local */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md text-[11px]">
                      #{os.computadores?.id || '---'}
                    </span>
                    {os.computadores?.patrimonio && (
                      <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md text-[11px]">
                        Patr: {os.computadores.patrimonio}
                      </span>
                    )}
                    {os.computadores?.id_legado && (
                      <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                        {os.computadores.id_legado}
                      </span>
                    )}
                  </div>

                  <span className="hidden sm:inline text-slate-300">•</span>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 uppercase text-xs">
                      {os.computadores?.equipamentos?.nome || 'Desktop'} {os.computadores?.marcas?.nome}
                    </span>
                  </div>

                  <span className="hidden sm:inline text-slate-300">•</span>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-medium">
                      {os.computadores?.secretarias?.nome || 'Sem secretaria'}
                    </span>
                    <span className="text-slate-400">
                      ({os.computadores?.local || 'Geral'})
                    </span>
                  </div>

                  {os.defeitos?.nome && (
                    <>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="text-slate-500 italic truncate max-w-xs text-[11px]">
                        Defeito: {os.defeitos.nome}
                      </span>
                    </>
                  )}
                </div>

                {/* Lado Direito: Status Badge */}
                <div className="flex items-center justify-end">
                  {getStatusBadge(os.status, os.computador_inativo)}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};

