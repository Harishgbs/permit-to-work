import {
  ClipboardList,
  FileClock,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { getInitials, formatRole } from '../../lib/format';
import { isApprover } from '../../lib/permissions';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, allowed: true },
  { to: '/permits', label: 'Permits', icon: ClipboardList, end: false, allowed: true },
  { to: '/approvals', label: 'Approvals', icon: ShieldCheck, end: false, allowed: 'approver' as const },
  { to: '/activity', label: 'Activity', icon: FileClock, end: false, allowed: true },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/permits': 'Permits',
  '/approvals': 'Approvals',
  '/activity': 'Activity',
};

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const items = navItems.filter(
    (item) => item.allowed === true || (item.allowed === 'approver' && isApprover(user)),
  );

  const currentTitle =
    pageTitles[location.pathname] ??
    (location.pathname.startsWith('/permits/') ? 'Permit detail' : 'Workplace Safety');

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <HardHat className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">SAFEZONE</p>
          <p className="text-[11px] uppercase tracking-widest text-slate-400">Permit Control</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600/15 text-teal-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
            {user ? getInitials(user.name) : '??'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user ? formatRole(user.role) : ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-slate-950 lg:block">
        {sidebarContent}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-950 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">{currentTitle}</h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Industrial permit-to-work control system
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            PTW workspace
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
