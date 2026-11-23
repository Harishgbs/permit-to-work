import { ClipboardCheck, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/permits', label: 'Permits', icon: ClipboardCheck, end: false },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <ShieldCheck className="h-7 w-7 text-teal-600" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold leading-tight">Permit to Work</p>
            <p className="text-xs text-slate-500">CMMS safety management module</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row">
        <nav aria-label="Main navigation" className="md:w-48 md:shrink-0">
          <ul className="flex gap-2 md:flex-col">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <li key={to} className="flex-1 md:flex-none">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
