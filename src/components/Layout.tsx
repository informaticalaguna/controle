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
  Wifi
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
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-extrabold text-sm">
              TI
            </div>
            <span>TI Laguna</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Summary */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-400">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">{profile?.nome_completo || 'Carregando...'}</p>
              <p className="truncate text-xs text-slate-400">{profile?.cargo || 'TI'}</p>
            </div>
            <span className={`
              inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-medium uppercase tracking-wider
              ${profile?.permissao === 'Administrador' ? 'bg-amber-400/15 text-amber-400' : 'bg-slate-400/15 text-slate-400'}
            `}>
              {profile?.permissao === 'Administrador' ? 'Admin' : 'Nível 1'}
            </span>
          </div>

          <button 
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-950/30"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-slate-800 capitalize">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Painel'}
            </h1>
          </div>

          {/* Quick link to public search */}
          <div className="flex items-center gap-4">
            <Link 
              to="/consulta" 
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Search size={14} />
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
