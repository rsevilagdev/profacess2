import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import {
  Truck, LayoutDashboard, FileCheck, Users, Building2,
  UserPlus, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Liberações', icon: FileCheck, path: '/liberacoes' },
  { label: 'Colaboradores', icon: Users, path: '/colaboradores' },
  { label: 'Filiais', icon: Building2, path: '/filiais' },
  { label: 'Solicitações', icon: UserPlus, path: '/solicitacoes' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { colaborador, logout } = useProfarmaAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-[hsl(200,12%,11%)] border-r border-white/5 flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-[hsl(160,50%,40%)]/15 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-[hsl(160,50%,40%)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="font-bold text-white text-sm truncate">PROFARMA</h2>
            <p className="text-[10px] text-white/30 tracking-widest">LIBERAAUTO PRO</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-[hsl(160,50%,40%)]/15 text-[hsl(160,50%,50%)]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {!collapsed && colaborador && (
          <div className="px-3 py-2">
            <p className="text-xs text-white/70 font-medium truncate">{colaborador.nome}</p>
            <p className="text-[10px] text-white/30 capitalize">{colaborador.cargo?.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 text-white/20 hover:text-white/40 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}