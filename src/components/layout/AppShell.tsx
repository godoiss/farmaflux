import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Bell, Building2, ChevronRight, CircleHelp, FileText, House, ListChecks, MonitorPlay, UserRound, type LucideIcon } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { DemoBadge } from './DemoBadge';
import { StatusBanners } from './StatusBanners';
import { useStore } from '../../state/AppStore';
import { activePerson, unreadCount } from '../../state/selectors';
import { formatDateTime } from '../../domain/time';
import { USAGE_MODE_LABEL } from '../../domain/labels';
import { NotificationCenter } from '../../features/notifications/NotificationCenter';
import { PresentationPanel } from '../../features/presentation/PresentationPanel';

interface NavEntry {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

const PRIMARY_NAV: NavEntry[] = [
  { to: '/inicio', label: 'Início', short: 'Início', icon: House, match: (p) => p === '/inicio' },
  { to: '/receitas', label: 'Minhas receitas', short: 'Receitas', icon: FileText, match: (p) => p.startsWith('/receitas') },
  { to: '/unidades', label: 'Unidades', short: 'Unidades', icon: Building2, match: (p) => p.startsWith('/unidades') },
  { to: '/lembretes', label: 'Lembretes e planos', short: 'Lembretes', icon: ListChecks, match: (p) => p.startsWith('/lembretes') || p.startsWith('/planos') },
];

const SECONDARY_NAV: NavEntry[] = [
  { to: '/perfil', label: 'Perfil e acessibilidade', short: 'Perfil', icon: UserRound, match: (p) => p.startsWith('/perfil') },
  { to: '/ajuda', label: 'Ajuda', short: 'Ajuda', icon: CircleHelp, match: (p) => p.startsWith('/ajuda') },
];

interface ShellUi {
  openNotifications: () => void;
  openPresentation: () => void;
}
const ShellContext = createContext<ShellUi>({ openNotifications: () => undefined, openPresentation: () => undefined });
export const useShell = () => useContext(ShellContext);

function BellButton({ onClick }: { onClick: () => void }) {
  const { data } = useStore();
  const count = unreadCount(data);
  return (
    <button type="button" className="btn-icon relative" onClick={onClick} aria-label={count ? `Notificações: ${count} não lida${count > 1 ? 's' : ''}` : 'Notificações: nenhuma não lida'}>
      <Bell size={22} aria-hidden />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-ink px-1 text-[0.6875rem] leading-5 font-bold text-white" aria-hidden>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

export function AppShell() {
  const { data } = useStore();
  const { pathname } = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const firstRender = useRef(true);
  const person = activePerson(data);
  const currentPage = [...PRIMARY_NAV, ...SECONDARY_NAV].find((entry) => entry.match(pathname))?.label ?? 'Seu cuidado';

  // Em cada troca de rota: rola ao topo e leva o foco ao título da página.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const id = window.setTimeout(() => document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }), 40);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const ui: ShellUi = { openNotifications: () => setNotificationsOpen(true), openPresentation: () => setPresentationOpen(true) };

  return (
    <ShellContext.Provider value={ui}>
      <a href="#conteudo" className="sr-only z-50 rounded-xl bg-teal px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>

      <div className="app-layout min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        {/* Sidebar desktop */}
        <aside className="app-sidebar no-print sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-5 py-8 lg:flex">
          <Link to="/inicio" className="brand-link mb-12 rounded-xl px-2 py-1" aria-label="FarmaFlux, ir para o início">
            <Logo />
          </Link>
          <p className="nav-caption">Seu espaço</p>
          <nav aria-label="Principal" className="flex flex-col gap-1.5">
            {PRIMARY_NAV.map((n) => (
              <SideLink key={n.to} entry={n} active={n.match(pathname)} />
            ))}
          </nav>
          <div className="my-7 border-t border-line" />
          <p className="nav-caption">Preferências</p>
          <nav aria-label="Conta e ajuda" className="flex flex-col gap-1.5">
            {SECONDARY_NAV.map((n) => (
              <SideLink key={n.to} entry={n} active={n.match(pathname)} />
            ))}
          </nav>
          <div className="sidebar-bottom mt-8 space-y-5 border-t border-line pt-7">
            <Link to="/ajuda" className="sidebar-help"><CircleHelp size={22} strokeWidth={1.5} aria-hidden /><span><strong>Podemos ajudar?</strong><small>Entenda cada etapa do cuidado</small></span><ArrowUpRight size={16} aria-hidden /></Link>
            <button type="button" className="presentation-trigger w-full text-left" onClick={ui.openPresentation}>
              <MonitorPlay size={20} aria-hidden />
              <span className="flex flex-col leading-tight">
                <span>Modo apresentação</span>
                <span className="text-xs text-ink-faint">{formatDateTime(data.clock)}</span>
              </span>
            </button>
            <Link to="/perfil" className="sidebar-profile">
              <span className="person-avatar" aria-hidden>{data.profile.displayName.charAt(0)}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold">{data.profile.displayName}</strong><span className="block text-xs text-ink-soft">{USAGE_MODE_LABEL[data.profile.mode]}</span></span>
              <ChevronRight size={16} className="text-ink-faint" aria-hidden />
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          {/* Cabeçalho celular */}
          <header className="mobile-header no-print sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-2 px-3 pt-2">
              <Link to="/inicio" className="rounded-xl px-1 py-1" aria-label="FarmaFlux, ir para o início">
                <Logo compact />
              </Link>
              <div className="flex items-center">
                <BellButton onClick={ui.openNotifications} />
                <NavLink to="/ajuda" className="btn-icon" aria-label="Ajuda">
                  <CircleHelp size={22} aria-hidden />
                </NavLink>
                <NavLink to="/perfil" className="btn-icon" aria-label="Perfil e acessibilidade">
                  <UserRound size={22} aria-hidden />
                </NavLink>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 pt-1 pb-2 text-xs">
              <span className="truncate font-medium text-ink-soft">
                Para: <strong className="text-ink">{person.name}</strong>
              </span>
              <DemoBadge className="py-0.5" />
            </div>
          </header>

          {/* Barra superior desktop */}
          <div className="desktop-topbar no-print sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-line bg-canvas/90 px-10 py-3 backdrop-blur-xl lg:flex">
            <div className="flex items-center gap-3 text-sm"><span className="text-ink-faint">Meu espaço</span><ChevronRight size={14} className="text-ink-faint" aria-hidden /><span className="font-medium">{currentPage}</span></div>
            <div className="flex items-center gap-2">
              <DemoBadge className="mr-3" />
              <Link to="/perfil" className="btn btn-ghost min-h-11 px-3 text-sm">
                <span className="person-avatar person-avatar-small" aria-hidden>
                  {person.name.replace(/^Dona\s+/i, '').charAt(0).toUpperCase()}
                </span>
                <span className="font-medium">{person.name}</span>
              </Link>
              <BellButton onClick={ui.openNotifications} />
            </div>
          </div>

          <StatusBanners />

          <main id="conteudo" className="app-main mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-7 lg:px-10 lg:pt-9 lg:pb-12 xl:px-12">
            <div key={pathname} className="route-content"><Outlet /></div>
          </main>
        </div>
      </div>

      {/* Navegação inferior celular */}
      <nav aria-label="Principal" className="mobile-nav no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {PRIMARY_NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <li key={n.to}>
                <Link
                  to={n.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${active ? 'text-teal' : 'text-ink-soft hover:text-ink'}`}
                >
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active ? 'bg-mint' : ''}`}>
                    <n.icon size={21} aria-hidden />
                  </span>
                  {n.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <PresentationPanel open={presentationOpen} onClose={() => setPresentationOpen(false)} />
    </ShellContext.Provider>
  );
}

function SideLink({ entry, active }: { entry: NavEntry; active: boolean }) {
  return (
    <Link to={entry.to} className="nav-item" aria-current={active ? 'page' : undefined}>
      <entry.icon size={19} strokeWidth={1.7} aria-hidden />
      <span className="flex-1">{entry.label}</span>
      {active && <span className="nav-active-dot" aria-hidden />}
    </Link>
  );
}
