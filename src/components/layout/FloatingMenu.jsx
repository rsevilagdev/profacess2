import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, ScanLine, ShieldAlert, Database, BarChart3, FileSpreadsheet, Clock, Bell, ScrollText, Building2, Settings, Lock, Download, LifeBuoy, FileText, User, LogOut, X, BellRing, Calendar, Activity } from 'lucide-react';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

const MENU_GROUPS = [
  {
    label: 'Operação',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/acessos', label: 'Acessos', icon: ScanLine },
      { path: '/painel-bloqueio', label: 'Painel de Bloqueio', icon: ShieldAlert },
      { path: '/monitor-filiais', label: 'Monitor de Filiais', icon: Activity },
      { path: '/editar-base', label: 'Editar Base de Dados', icon: Database },
    ]
  },
  {
    label: 'Relatórios',
    items: [
      { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
      { path: '/relatorio-personalizado', label: 'Relatório Personalizado', icon: FileSpreadsheet },
      { path: '/resumo-turnos', label: 'Resumo de Turnos', icon: Clock },
    ]
  },
  {
    label: 'Administração',
    items: [
      { path: '/notificacoes', label: 'Notificações', icon: Bell },
      { path: '/auditoria', label: 'Auditoria', icon: ScrollText },
      { path: '/gerenciamento-filiais', label: 'Gerenciamento de Filiais', icon: Building2 },
      { path: '/configuracoes', label: 'Configurações', icon: Settings },
      { path: '/configuracoes-seguranca', label: 'Configurações de Segurança', icon: Lock },
      { path: '/exportar-dados', label: 'Exportar/Importar', icon: Download },
      { path: '/auditoria-sistema', label: 'Auditoria do Sistema', icon: ScrollText },
      { path: '/configuracoes-notificacoes', label: 'Config. de Notificações', icon: BellRing },
    ]
  },
  {
    label: 'Ajuda',
    items: [
      { path: '/plano-trabalho', label: 'Plano de Trabalho', icon: Calendar },
      { path: '/suporte', label: 'Suporte & Manual', icon: LifeBuoy },
      { path: '/termos-uso', label: 'Termos de Uso', icon: FileText },
      { path: '/perfil', label: 'Perfil', icon: User },
    ]
  }
];

export default function FloatingMenu() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { colaborador, canAccessPage } = useProfarmaAuth();
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dataHora = now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const initials = colaborador?.nome?.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <>
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {open && (
            <div className="absolute top-14 left-0 w-72 max-h-[70vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border p-3 fade-in">
              <div className="px-3 py-2 mb-2 border-b border-border">
                <p className="brand-title text-sm text-primary">PROFARMA</p>
                <p className="text-xs text-muted-foreground">LIBERAAUTO PRO</p>
              </div>
              {MENU_GROUPS.map(group => (
                <div key={group.label} className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">{group.label}</p>
                  {group.items.map(item => {
                    if (!canAccessPage(item.path)) return null;
                    const active = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[48px] ${
                          active ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-accent text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
              <div className="border-t border-border mt-2 pt-2">
                <Link to="/" onClick={() => { localStorage.removeItem('profarma_colaborador'); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-destructive/10 text-destructive min-h-[48px]">
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sair (Logout)</span>
                </Link>
              </div>
            </div>
          )}
        </div>
        <Link to="/perfil" className="h-12 w-12 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center hover:shadow-md transition-shadow overflow-hidden">
          {colaborador?.foto_perfil ? (
            <img src={colaborador.foto_perfil} alt="Perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
          )}
        </Link>
        <div className="bg-card border border-border shadow-lg rounded-2xl px-3 py-1.5 hidden sm:flex flex-col items-center justify-center min-w-[120px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{dataHora.split(' ')[0]}</span>
          <span className="text-xs font-medium text-foreground leading-tight tabular-nums">{dataHora.split(' ')[1]}</span>
        </div>
      </div>
    </>
  );
}