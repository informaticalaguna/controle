import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Search, Monitor, Calendar, AlertCircle, ShieldCheck, LogIn, Clock, CheckCircle, Package, RotateCw } from 'lucide-react';

interface ComputerResult {
  id: number;
  id_legado: string | null;
  patrimonio: number | null;
  ativo: boolean;
  garantia_ativa: boolean;
  secretarias: { nome: string } | null;
  local: string | null;
  marcas: { nome: string } | null;
  equipamentos: { nome: string } | null;
}

interface OSResult {
  id: number;
  data_abertura: string;
  status: 'Em andamento' | 'Aguardando peças' | 'Pronto para retirada' | 'Concluído' | 'Entregue';
  solucao_encontrada: string | null;
}

export const PublicSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'id' | 'id_legado' | 'patrimonio'>('id');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [computer, setComputer] = useState<ComputerResult | null>(null);
  const [osList, setOsList] = useState<OSResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // CAPTCHA States and Ref
  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const generateCaptchaText = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let text = '';
    for (let i = 0; i < 5; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0b1329'; // Dark Slate matching theme
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Noise lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 + Math.random() * 0.15})`; // blue-500 opacity
      ctx.lineWidth = 1.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + Math.random() * 0.15})`; // emerald-500 opacity
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distorted Text
    ctx.textBaseline = 'middle';
    const charWidth = canvas.width / text.length;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      ctx.font = `bold ${20 + Math.random() * 6}px monospace`;
      ctx.fillStyle = i % 2 === 0 ? '#3b82f6' : '#10b981'; // Alternating blue and emerald

      ctx.save();
      const x = charWidth * i + charWidth / 2;
      const y = canvas.height / 2 + (Math.random() - 0.5) * 8;
      ctx.translate(x, y);

      const angle = (Math.random() - 0.5) * 0.4; // random angle in radians
      ctx.rotate(angle);

      ctx.fillText(char, -8, 0);
      ctx.restore();
    }
  };

  const refreshCaptcha = () => {
    setCaptchaText(generateCaptchaText());
    setCaptchaInput('');
  };

  // Initialize and draw captcha
  React.useEffect(() => {
    setCaptchaText(generateCaptchaText());
  }, []);

  React.useEffect(() => {
    if (captchaText) {
      drawCaptcha(captchaText);
    }
  }, [captchaText]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    // Validate CAPTCHA
    if (captchaInput.trim().toLowerCase() !== captchaText.toLowerCase()) {
      setErrorMsg('Código de verificação de segurança incorreto. Tente novamente.');
      refreshCaptcha();
      return;
    }

    // Validação dependendo do tipo de busca
    const hasLetters = /[a-zA-Z]/.test(term);
    const hasDigits = /\d/.test(term);

    if (searchType === 'id') {
      if (!/^\d+$/.test(term)) {
        setErrorMsg('Para buscar por ID Interno, insira apenas números.');
        setComputer(null);
        setOsList([]);
        setSearched(false);
        refreshCaptcha();
        return;
      }
    } else if (searchType === 'patrimonio') {
      if (!/^\d+$/.test(term)) {
        setErrorMsg('Para buscar por Patrimônio, insira apenas números.');
        setComputer(null);
        setOsList([]);
        setSearched(false);
        refreshCaptcha();
        return;
      }
    } else if (searchType === 'id_legado') {
      if (hasLetters && !hasDigits) {
        setErrorMsg('Para buscar por código legado, insira a identificação completa com letras e números (Ex: ADM03).');
        setComputer(null);
        setOsList([]);
        setSearched(false);
        refreshCaptcha();
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setComputer(null);
    setOsList([]);
    setSearched(true);

    try {

      // Call the DB RPC function
      const { data, error } = await supabase.rpc('buscar_computador_publico', {
        search_text: term,
        search_type: searchType
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorMsg('Nenhum computador encontrado com o código, patrimônio ou legado informado.');
        setLoading(false);
        return;
      }

      // Map the DB return layout to frontend ComputerResult layout
      const dbRow = data[0];
      const foundComputer: ComputerResult = {
        id: dbRow.id,
        id_legado: dbRow.id_legado,
        patrimonio: dbRow.patrimonio,
        ativo: dbRow.ativo,
        garantia_ativa: dbRow.garantia_ativa,
        secretarias: dbRow.secretaria_nome ? { nome: dbRow.secretaria_nome } : null,
        local: dbRow.local_nome || null,
        marcas: dbRow.marca_nome ? { nome: dbRow.marca_nome } : null,
        equipamentos: dbRow.equipamento_nome ? { nome: dbRow.equipamento_nome } : null
      };

      setComputer(foundComputer);

      if (foundComputer.ativo) {
        // Fetch all OS
        const { data: osData, error: osError } = await supabase
          .from('ordens_servico')
          .select('id, data_abertura, status, solucao_encontrada')
          .eq('computador_id', foundComputer.id)
          .order('id', { ascending: false });

        if (osError) throw osError;
        setOsList(osData as OSResult[] || []);
      } else {
        setOsList([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocorreu um erro ao realizar a busca. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
      refreshCaptcha();
    }
  };

  const getStatusBadgeClass = (status: OSResult['status']) => {
    switch (status) {
      case 'Em andamento':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Aguardando peças':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Pronto para retirada':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'Entregue':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Concluído':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: OSResult['status']) => {
    switch (status) {
      case 'Em andamento':
        return <Clock size={16} className="text-blue-600" />;
      case 'Aguardando peças':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'Pronto para retirada':
        return <AlertCircle size={16} className="text-amber-600" />;
      case 'Entregue':
        return <Package size={16} className="text-indigo-600" />;
      case 'Concluído':
        return <CheckCircle size={16} className="text-emerald-600" />;
    }
  };

  // Convert Date string to DD/MM/AAAA
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-900 text-slate-100 font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600/5 blur-3xl"></div>

      {/* Navigation */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            TI
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-200 text-xs sm:text-sm leading-tight">DEPARTAMENTO DE INFORMÁTICA - SEFAZ</span>
            <span className="text-[10px] text-slate-400 font-semibold leading-tight">Prefeitura Municipal de Laguna</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogIn size={14} />
          Área do Técnico
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center mb-8">
          <span className="inline-flex items-center rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-3">
            Consulta Pública Externa
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Acompanhe sua Ordem de Serviço
          </h2>
          <p className="mt-2.5 text-base text-slate-400 max-w-lg mx-auto">
            Insira o código interno, patrimônio ou legado da máquina para ver o status em tempo real.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="w-full max-w-xl bg-slate-950/40 border border-slate-800/60 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Seletor do Tipo de Busca */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setSearchType('id');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${searchType === 'id'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchType('id_legado');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${searchType === 'id_legado'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
              >
                ID Legado
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchType('patrimonio');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${searchType === 'patrimonio'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
              >
                Patrimônio
              </button>
            </div>

            <div className="relative">
              <label htmlFor="search-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Identificação do Equipamento
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Search size={18} />
                </span>
                <input
                  id="search-input"
                  type="text"
                  required
                  placeholder={
                    searchType === 'id'
                      ? "Ex: 1045..."
                      : searchType === 'id_legado'
                        ? "Ex: ADM052, EDU014..."
                        : "Ex: Número da etiqueta de patrimônio"
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-all focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Captcha Section */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
              <label htmlFor="captcha-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Verificação de Segurança
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Canvas container */}
                <div className="relative flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-1">
                  <canvas
                    ref={canvasRef}
                    width={130}
                    height={40}
                    className="rounded bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    title="Atualizar código"
                    className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>

                {/* Input for captcha */}
                <input
                  id="captcha-input"
                  type="text"
                  required
                  maxLength={5}
                  placeholder="Código de 5 dígitos"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="flex-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 text-center uppercase tracking-widest font-mono transition-all focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Buscando...
                </>
              ) : (
                'Buscar Equipamento'
              )}
            </button>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-sm text-rose-400">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Card */}
          {searched && !loading && computer && (
            !computer.ativo ? (
              <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 shadow-xl backdrop-blur-sm text-center max-w-xl mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="font-bold text-white text-lg">Computador Inativo</h3>
                <p className="text-xs text-slate-400 mt-2">
                  O equipamento buscado (ID #{computer.id}) consta como inativo no sistema.
                </p>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/10">
                      <Monitor size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">
                        {computer.equipamentos?.nome || 'Computador'} {computer.marcas?.nome ? `- ${computer.marcas.nome}` : ''}
                      </h3>
                      <p className="text-xs text-slate-500">
                        ID: #{computer.id} {computer.id_legado ? `| Legado: ${computer.id_legado}` : ''} {computer.patrimonio ? `| Patrimônio: ${computer.patrimonio}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    Ativo
                  </span>
                </div>

                {/* Status Section */}
                <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Histórico de Ordens de Serviço
                  </p>

                  {osList.length > 0 ? (
                    <div className="space-y-6 divide-y divide-slate-800/60">
                      {osList.map((os, idx) => (
                        <div key={os.id} className={`${idx > 0 ? 'pt-6' : ''} space-y-3`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(os.status)}
                              <span className="text-sm font-semibold text-slate-200">OS #{os.id}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border uppercase tracking-wider ${getStatusBadgeClass(os.status)}`}>
                              {os.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar size={14} />
                            <span>Data de Abertura: {formatDate(os.data_abertura)}</span>
                          </div>

                          {/* Explanatory Message based on status */}
                          <p className="text-xs text-slate-400">
                            {os.status === 'Em andamento' && '🔧 Sua máquina está em reparo.'}
                            {os.status === 'Aguardando peças' && '⏳ Aguardando a chegada de peças para continuar o reparo.'}
                            {os.status === 'Pronto para retirada' && '🎉 Reparo concluído! Você já pode retirar sua máquina no Departamento de Informática.'}
                            {os.status === 'Entregue' && '📦 Equipamento entregue ao setor correspondente.'}
                            {os.status === 'Concluído' && '✅ Serviço concluído com sucesso e equipamento devolvido.'}
                          </p>

                          {os.solucao_encontrada && (
                            <div className="text-xs text-emerald-400 mt-2 bg-emerald-950/20 border border-emerald-500/10 p-2.5 rounded-lg">
                              <span className="font-bold block mb-0.5 text-emerald-300">Solução Resolvida:</span>
                              {os.solucao_encontrada}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-slate-400 py-2">
                      <ShieldCheck size={18} className="text-emerald-500" />
                      <span>Nenhuma Ordem de Serviço pendente para esta máquina.</span>
                    </div>
                  )}
                </div>

                {/* Other Specs */}
                <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-lg bg-slate-900/20 p-3 border border-slate-800/40">
                    <p className="font-semibold text-slate-500">Secretaria</p>
                    <p className="mt-1 font-bold text-slate-300">{computer.secretarias?.nome || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/20 p-3 border border-slate-800/40">
                    <p className="font-semibold text-slate-500">Setor/Local</p>
                    <p className="mt-1 font-bold text-slate-300">{computer.local || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Prefeitura Municipal de Laguna - Departamento de Informática - SEFAZ</p>
      </footer>
    </div>
  );
};
