import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Wifi as WifiIcon, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Info,
  Server,
  Network
} from 'lucide-react';

interface WifiNetwork {
  id: number;
  local: string;
  nome_rede: string;
  roteador: string | null;
  ip: string | null;
  senha_wifi: string | null;
  usuario: string | null;
  senha_acesso: string | null;
  mac_lan: string | null;
  mac_wan: string | null;
  created_at: string;
}

export const Wifi: React.FC = () => {
  const { isAdmin } = useAuth();
  
  // Data States
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Reveal passwords maps
  const [revealWifi, setRevealWifi] = useState<Record<number, boolean>>({});
  const [revealAccess, setRevealAccess] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState<{ id: number; field: string } | null>(null);

  // Form Fields
  const [local, setLocal] = useState('');
  const [nomeRede, setNomeRede] = useState('');
  const [roteador, setRoteador] = useState('');
  const [ip, setIp] = useState('');
  const [senhaWifi, setSenhaWifi] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senhaAcesso, setSenhaAcesso] = useState('');
  const [macLan, setMacLan] = useState('');
  const [macWan, setMacWan] = useState('');

  // Feedback States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('redes_wifi').select('*').order('local');
      
      if (searchTerm.trim()) {
        const t = `%${searchTerm.trim()}%`;
        query = query.or(`local.ilike.${t},nome_rede.ilike.${t},roteador.ilike.${t},ip.ilike.${t}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setNetworks(data as WifiNetwork[]);
    } catch (err) {
      console.error('Erro ao buscar redes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const resetForm = () => {
    setLocal('');
    setNomeRede('');
    setRoteador('');
    setIp('');
    setSenhaWifi('');
    setUsuario('');
    setSenhaAcesso('');
    setMacLan('');
    setMacWan('');
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (net: WifiNetwork) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(true);
    setEditingId(net.id);
    setLocal(net.local);
    setNomeRede(net.nome_rede);
    setRoteador(net.roteador || '');
    setIp(net.ip || '');
    setSenhaWifi(net.senha_wifi || '');
    setUsuario(net.usuario || '');
    setSenhaAcesso(net.senha_acesso || '');
    setMacLan(net.mac_lan || '');
    setMacWan(net.mac_wan || '');
    setModalOpen(true);
  };

  const handleDelete = async (id: number, localName: string, ssid: string) => {
    if (!isAdmin) {
      alert('Erro: Apenas administradores podem excluir cadastros de rede.');
      return;
    }

    if (window.confirm(`Tem certeza de que deseja excluir permanentemente a rede "${ssid}" de "${localName}"?`)) {
      try {
        const { error } = await supabase.from('redes_wifi').delete().eq('id', id);
        if (error) throw error;
        
        setSuccessMsg('Rede Wi-Fi excluída com sucesso!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchData();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Erro ao excluir rede.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!local.trim() || !nomeRede.trim()) {
      setErrorMsg('Por favor, preencha os campos obrigatórios (Local e Nome da Rede).');
      setSubmitting(false);
      return;
    }

    const payload = {
      local: local.trim().toUpperCase(),
      nome_rede: nomeRede.trim(),
      roteador: roteador.trim() || null,
      ip: ip.trim() || null,
      senha_wifi: senhaWifi.trim() || null,
      usuario: usuario.trim() || null,
      senha_acesso: senhaAcesso.trim() || null,
      mac_lan: macLan.trim().toUpperCase() || null,
      mac_wan: macWan.trim().toUpperCase() || null
    };

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('redes_wifi')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        setSuccessMsg('Rede Wi-Fi atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('redes_wifi')
          .insert(payload);

        if (error) throw error;
        setSuccessMsg('Rede Wi-Fi cadastrada com sucesso!');
      }

      setModalOpen(false);
      resetForm();
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar a rede Wi-Fi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: number, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField({ id, field });
    setTimeout(() => setCopiedField(null), 1500);
  };

  const toggleRevealWifi = (id: number) => {
    setRevealWifi(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRevealAccess = (id: number) => {
    setRevealAccess(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <WifiIcon className="text-blue-600" size={24} />
            Redes Wi-Fi & Roteadores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento e consulta de acessos de Wi-Fi, roteadores e infraestrutura de rede nos setores.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
          Adicionar Rede
        </button>
      </div>

      {/* Success notification */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por Local, Rede, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
          Total: {networks.length} redes cadastradas
        </div>
      </div>

      {/* Grid or Table list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-6">Local / Rede</th>
                <th className="py-3.5 px-6">Dispositivo / IP</th>
                <th className="py-3.5 px-6">Senha Wifi</th>
                <th className="py-3.5 px-6">Acesso Roteador</th>
                <th className="py-3.5 px-6">MACs (LAN/WAN)</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={16} />
                      Carregando redes...
                    </div>
                  </td>
                </tr>
              ) : networks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma rede Wi-Fi cadastrada.
                  </td>
                </tr>
              ) : (
                networks.map((net) => (
                  <tr key={net.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Local / Rede */}
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{net.local}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                        <WifiIcon size={10} className="text-slate-400" />
                        SSID: {net.nome_rede}
                      </p>
                    </td>

                    {/* Dispositivo / IP */}
                    <td className="py-4 px-6">
                      <p className="text-slate-900">{net.roteador || '---'}</p>
                      {net.ip && (
                        <p className="text-[10px] font-mono text-blue-600 mt-0.5 flex items-center gap-0.5">
                          <Network size={9} />
                          {net.ip}
                        </p>
                      )}
                    </td>

                    {/* Senha Wifi */}
                    <td className="py-4 px-6">
                      {net.senha_wifi ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-semibold">
                            {revealWifi[net.id] ? net.senha_wifi : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleRevealWifi(net.id)}
                            className="text-slate-400 hover:text-slate-600"
                            title={revealWifi[net.id] ? 'Ocultar senha' : 'Exibir senha'}
                          >
                            {revealWifi[net.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => handleCopy(net.senha_wifi || '', net.id, 'wifi')}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copiar senha"
                          >
                            {copiedField?.id === net.id && copiedField?.field === 'wifi' ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">Sem senha</span>
                      )}
                    </td>

                    {/* Acesso Roteador */}
                    <td className="py-4 px-6">
                      {net.usuario || net.senha_acesso ? (
                        <div className="space-y-0.5">
                          {net.usuario && (
                            <p className="text-[10px] text-slate-500">
                              Usuário: <span className="font-semibold text-slate-700 bg-slate-50 px-1 py-0.2 rounded border border-slate-100">{net.usuario}</span>
                            </p>
                          )}
                          {net.senha_acesso && (
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-slate-500">Senha:</span>
                              <span className="font-mono text-slate-700 bg-slate-50 px-1 py-0.2 rounded border border-slate-100 font-semibold">
                                {revealAccess[net.id] ? net.senha_acesso : '••••••••'}
                              </span>
                              <button
                                onClick={() => toggleRevealAccess(net.id)}
                                className="text-slate-400 hover:text-slate-600 scale-90"
                              >
                                {revealAccess[net.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                              </button>
                              <button
                                onClick={() => handleCopy(net.senha_acesso || '', net.id, 'access')}
                                className="text-slate-400 hover:text-slate-600 scale-90"
                              >
                                {copiedField?.id === net.id && copiedField?.field === 'access' ? (
                                  <Check size={10} className="text-emerald-500" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">---</span>
                      )}
                    </td>

                    {/* MACs */}
                    <td className="py-4 px-6 font-mono text-[10px] space-y-0.5">
                      {net.mac_lan && (
                        <p className="text-slate-500">
                          LAN: <span className="text-slate-700 font-semibold">{net.mac_lan}</span>
                        </p>
                      )}
                      {net.mac_wan && (
                        <p className="text-slate-500">
                          WAN: <span className="text-slate-700 font-semibold">{net.mac_wan}</span>
                        </p>
                      )}
                      {!net.mac_lan && !net.mac_wan && <span className="text-slate-300">---</span>}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(net)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Editar Rede"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(net.id, net.local, net.nome_rede)}
                          disabled={!isAdmin}
                          className={`
                            rounded-lg p-1.5 transition-colors
                            ${isAdmin 
                              ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' 
                              : 'text-slate-300 cursor-not-allowed'}
                          `}
                          title={isAdmin ? 'Excluir Rede' : 'Apenas administradores podem excluir'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
                  <WifiIcon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isEditing ? 'Editar Rede Wi-Fi' : 'Cadastrar Nova Rede Wi-Fi'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Preencha os dados de conexão e infraestrutura do setor.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Error Notification */}
            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 flex items-center gap-1.5">
                <Info size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Local */}
                <div>
                  <label htmlFor="local" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Local / Setor *
                  </label>
                  <input
                    id="local"
                    type="text"
                    required
                    placeholder="Ex: ESCOLA LAGUNA"
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* Nome da Rede */}
                <div>
                  <label htmlFor="ssid" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Nome da Rede (SSID) *
                  </label>
                  <input
                    id="ssid"
                    type="text"
                    required
                    placeholder="Ex: WIFI_SEFAZ"
                    value={nomeRede}
                    onChange={(e) => setNomeRede(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Roteador */}
                <div>
                  <label htmlFor="router" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Roteador (Modelo)
                  </label>
                  <input
                    id="router"
                    type="text"
                    placeholder="Ex: Intelbras RG1200"
                    value={roteador}
                    onChange={(e) => setRoteador(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* IP */}
                <div>
                  <label htmlFor="ip" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Endereço IP
                  </label>
                  <input
                    id="ip"
                    type="text"
                    placeholder="Ex: 192.168.1.1"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Senha Wifi */}
              <div>
                <label htmlFor="wifi_pass" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Senha do Wi-Fi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Key size={14} />
                  </span>
                  <input
                    id="wifi_pass"
                    type="text"
                    placeholder="Senha para os usuários se conectarem"
                    value={senhaWifi}
                    onChange={(e) => setSenhaWifi(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Server size={11} />
                  Credenciais de Acesso ao Roteador
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Usuario Roteador */}
                  <div>
                    <label htmlFor="router_user" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Usuário de Acesso
                    </label>
                    <input
                      id="router_user"
                      type="text"
                      placeholder="Ex: admin"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
                    />
                  </div>

                  {/* Senha Acesso Roteador */}
                  <div>
                    <label htmlFor="router_pass" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Senha de Acesso
                    </label>
                    <input
                      id="router_pass"
                      type="text"
                      placeholder="Senha do painel"
                      value={senhaAcesso}
                      onChange={(e) => setSenhaAcesso(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* MAC LAN */}
                <div>
                  <label htmlFor="mac_lan" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    MAC LAN
                  </label>
                  <input
                    id="mac_lan"
                    type="text"
                    placeholder="Ex: 00:1A:2B:3C:4D:5E"
                    value={macLan}
                    onChange={(e) => setMacLan(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* MAC WAN */}
                <div>
                  <label htmlFor="mac_wan" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    MAC WAN
                  </label>
                  <input
                    id="mac_wan"
                    type="text"
                    placeholder="Ex: 00:1A:2B:3C:4D:5F"
                    value={macWan}
                    onChange={(e) => setMacWan(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Add standard Loader2 export if missing in list
const Loader2 = (props: any) => (
  <svg
    className={`animate-spin ${props.className || ''}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={props.size || 24}
    height={props.size || 24}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
