import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Monitor, 
  ClipboardList, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  Search,
  Users,
  Wifi,
  Laptop
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Computadores', path: '/computadores', icon: Monitor },
    { name: 'Ordens de Serviço', path: '/ordens', icon: ClipboardList },
  ];

  if (isAdmin) {
    menuItems.push({ name: 'Técnicos', path: '/tecnicos', icon: Users });
  }

  menuItems.push({ name: 'Redes Wi-Fi', path: '/wifi', icon: Wifi });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 border-r border-slate-800/80 shadow-lg overflow-hidden shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Background Laptop Watermark Effect */}
        <div className="pointer-events-none absolute -right-8 bottom-24 select-none text-blue-400 opacity-[0.05] rotate-[-10deg] transition-opacity duration-300">
          <Laptop size={220} strokeWidth={1} />
        </div>
        <div className="pointer-events-none absolute -right-6 bottom-32 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-6 top-20 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />

        {/* Sidebar Header */}
        <div className="relative z-10 flex h-16 items-center justify-between border-b border-slate-800 px-4 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-sm text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="h-5 w-5 object-contain" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <span className="truncate tracking-tight font-bold text-slate-100">Informática - PML</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="relative z-10 flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'}
                `}
              >
                <Icon size={17} className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Summary */}
        <div className="relative z-10 border-t border-slate-800 p-3 shrink-0">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 p-2.5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-slate-200">{profile?.nome_completo || 'Carregando...'}</p>
              <p className="truncate text-[10px] font-medium text-slate-400">{profile?.cargo || 'TI'}</p>
            </div>
            <span className={`
              inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border
              ${profile?.permissao === 'Administrador' ? 'bg-amber-400/15 text-amber-400 border-amber-400/30' : 'bg-slate-700 text-slate-300 border-slate-600'}
            `}>
              {profile?.permissao === 'Administrador' ? 'Admin' : 'Nível 1'}
            </span>
          </div>

          <button 
            onClick={signOut}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 py-2 text-xs font-semibold text-slate-400 shadow-sm transition-all hover:bg-rose-950/30 hover:text-rose-300 hover:border-rose-900/40 cursor-pointer"
          >
            <LogOut size={14} />
            Sair
          </button>

          {/* Credits / Footer */}
          <div className="mt-2 border-t border-slate-800/60 pt-2 text-center select-none">
            <p className="text-[9px] text-slate-500/80 leading-tight">
              © 2026 Desenvolvido por:
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight font-medium">
              Informática - PML (SEFAZ)
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 w-full">
        {/* Header - Dark theme with login screen ambient glow effect */}
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6 shadow-md overflow-hidden">
          {/* Glowing background blur orbs like login */}
          <div className="pointer-events-none absolute -top-12 left-1/4 h-32 w-80 rounded-full bg-blue-600/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-80 rounded-full bg-sky-500/10 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3 sm:gap-4 min-w-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden shrink-0 cursor-pointer"
              aria-label="Abrir Menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide capitalize truncate">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Painel'}
            </h1>
          </div>

          {/* Quick link to public search */}
          <div className="relative z-10 flex items-center gap-2 sm:gap-4 shrink-0">
            <Link 
              to="/consulta" 
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/90 px-3 sm:px-4 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition-all duration-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-md hover:shadow-blue-600/20"
            >
              <Search size={14} className="text-slate-400 group-hover:text-white shrink-0" />
              <span className="hidden sm:inline">Consulta Pública</span>
              <span className="inline sm:hidden">Consulta</span>
            </Link>
          </div>
        </header>

        {/* Page Content - Subtle light gray canvas background for crisp white cards contrast */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-100 min-w-0 w-full">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

