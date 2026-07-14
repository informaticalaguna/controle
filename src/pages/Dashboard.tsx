import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Monitor, 
  Wrench, 
  CheckCircle, 
  Clock, 
  Inbox
} from 'lucide-react';

interface OSWithDetails {
  id: number;
  data_abertura: string;
  status: 'Em andamento' | 'Pronto para retirada' | 'Concluído' | 'Entregue';
  defeitos: { nome: string } | null;
  computadores: {
    id: number;
    id_legado: string | null;
    patrimonio: number | null;
    marcas: { nome: string } | null;
    equipamentos: { nome: string } | null;
    secretarias: { nome: string } | null;
    locais: { nome: string } | null;
  } | null;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalComputers: 0,
    activeOS: 0,
    readyOS: 0,
    completedOS: 0
  });

  const [salaTIList, setSalaTIList] = useState<OSWithDetails[]>([]);
  const [entreguesList, setEntreguesList] = useState<OSWithDetails[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const { count: compCount } = await supabase
        .from('computadores')
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Em andamento', 'Pronto para retirada']);

      const { count: readyCount } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pronto para retirada');

      const { count: completedCount } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Concluído');

      setStats({
        totalComputers: compCount || 0,
        activeOS: activeCount || 0,
        readyOS: readyCount || 0,
        completedOS: completedCount || 0
      });

      // 2. Fetch OS lists
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          data_abertura,
          status,
          defeitos(nome),
          computadores(
            id,
            id_legado,
            patrimonio,
            marcas(nome),
            equipamentos(nome),
            secretarias(nome),
            locais(nome)
          )
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      const allOS = (data || []) as unknown as OSWithDetails[];
      
      // Coluna A: Sala de TI (Em andamento, Pronto para retirada)
      setSalaTIList(allOS.filter(os => os.status === 'Em andamento' || os.status === 'Pronto para retirada'));
      
      // Coluna B: Entregues (Entregue, Concluído)
      setEntreguesList(allOS.filter(os => os.status === 'Entregue' || os.status === 'Concluído'));

    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleCardClick = (osId: number) => {
    navigate('/ordens', { state: { editOSId: osId } });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome & Stats Row */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Visão Geral do Departamento</h2>
        <p className="text-xs text-slate-500 mt-1">Status em tempo real das máquinas e ordens de serviço da prefeitura.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Computers */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Monitor size={22} />
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Total de Máquinas</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalComputers}</p>
          </div>
        </div>

        {/* Active OS */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wrench size={22} />
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Em Manutenção</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.activeOS}</p>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Prontos p/ Retirada</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.readyOS}</p>
          </div>
        </div>

        {/* Completed OS */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Concluídos</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.completedOS}</p>
          </div>
        </div>

      </div>

      {/* Kanban / Visual separation board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Coluna A: Na sala de TI (Em andamento / Pronto para retirada) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="font-bold text-slate-800 text-base">Na Sala de TI</h3>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {salaTIList.length} Máquinas
            </span>
          </div>

          <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {salaTIList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Inbox size={36} className="text-slate-300 mb-2" />
                <p className="text-xs font-medium">Nenhum computador na sala de TI no momento.</p>
              </div>
            ) : (
              salaTIList.map((os) => (
                <div 
                  key={os.id}
                  onClick={() => handleCardClick(os.id)}
                  className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm hover:border-slate-200 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`
                        inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider border mb-2
                        ${os.status === 'Pronto para retirada' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}
                      `}>
                        {os.status}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800">
                        {os.computadores?.equipamentos?.nome || 'Desktop'} {os.computadores?.marcas?.nome}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Patrimônio: <span className="font-semibold text-slate-700">{os.computadores?.patrimonio || 'N/A'}</span> 
                        {os.computadores?.id_legado && ` | Legado: ${os.computadores.id_legado}`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Setor: <span className="font-semibold text-slate-700">{os.computadores?.secretarias?.nome} ({os.computadores?.locais?.nome || 'Geral'})</span>
                      </p>
                    </div>
                    <span className="text-3xs font-medium text-slate-400 shrink-0">OS #{os.id}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                    <p className="truncate max-w-[200px]">
                      Defeito: <span className="font-semibold text-slate-700">{os.defeitos?.nome || 'Outros'}</span>
                    </p>
                    <p>Aberta em: {formatDate(os.data_abertura)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna B: Já Entregues / Concluídas (Entregue / Concluído) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="font-bold text-slate-800 text-base">Entregues / Concluídas</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {entreguesList.length} Histórico
            </span>
          </div>

          <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {entreguesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Inbox size={36} className="text-slate-300 mb-2" />
                <p className="text-xs font-medium">Nenhum histórico de OS entregue.</p>
              </div>
            ) : (
              entreguesList.map((os) => (
                <div 
                  key={os.id}
                  onClick={() => handleCardClick(os.id)}
                  className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm hover:border-slate-200 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`
                        inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider border mb-2
                        ${os.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'}
                      `}>
                        {os.status}
                      </span>
                      <h4 className="font-bold text-xs text-slate-700">
                        {os.computadores?.equipamentos?.nome || 'Desktop'} {os.computadores?.marcas?.nome}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Patrimônio: <span className="font-semibold text-slate-600">{os.computadores?.patrimonio || 'N/A'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Setor: <span className="font-semibold text-slate-600">{os.computadores?.secretarias?.nome}</span>
                      </p>
                    </div>
                    <span className="text-3xs font-medium text-slate-400 shrink-0">OS #{os.id}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                    <p className="truncate max-w-[200px]">
                      Defeito: <span className="font-medium text-slate-600">{os.defeitos?.nome || 'Outros'}</span>
                    </p>
                    <p>Aberta em: {formatDate(os.data_abertura)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
