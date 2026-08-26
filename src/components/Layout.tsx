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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        relative overflow-hidden fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Background Laptop Watermark Effect */}
        <div className="pointer-events-none absolute -right-8 bottom-24 select-none text-blue-400 opacity-[0.06] rotate-[-10deg] transition-opacity duration-300">
          <Laptop size={220} strokeWidth={1} />
        </div>
        <div className="pointer-events-none absolute -right-6 bottom-32 h-36 w-36 rounded-full bg-blue-500/5 blur-3xl" />

        {/* Sidebar Header */}
        <div className="relative z-10 flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-sm text-white">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="h-7 w-7 rounded-lg object-cover" 
              onError={(e) => {
                // Fallback if logo not found
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="truncate">Informática - PML</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="relative z-10 flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon size={18} className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Summary */}
        <div className="relative z-10 border-t border-slate-800 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-800/50 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-400">
              <UserIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-slate-200">{profile?.nome_completo || 'Carregando...'}</p>
              <p className="truncate text-[11px] text-slate-400">{profile?.cargo || 'TI'}</p>
            </div>
            <span className={`
              inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider
              ${profile?.permissao === 'Administrador' ? 'bg-amber-400/15 text-amber-400' : 'bg-slate-400/15 text-slate-400'}
            `}>
              {profile?.permissao === 'Administrador' ? 'Admin' : 'Nível 1'}
            </span>
          </div>

          <button 
            onClick={signOut}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-950/30"
          >
            <LogOut size={15} />
            Sair
          </button>

          {/* Credits / Footer */}
          <div className="mt-2.5 border-t border-slate-800/60 pt-2 text-center select-none">
            <p className="text-[9px] text-slate-500/75 leading-tight">
              © 2026 Desenvolvido por:
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5 leading-tight font-normal">
              Informática - PML (SEFAZ)
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-white tracking-wide capitalize">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Painel'}
            </h1>
          </div>

          {/* Quick link to public search */}
          <div className="flex items-center gap-4">
            <Link 
              to="/consulta" 
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/90 px-4 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition-all duration-200 hover:bg-blue-600 hover:text-white hover:border-blue-500"
            >
              <Search size={14} className="text-slate-400 group-hover:text-white" />
              Consulta Pública
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
