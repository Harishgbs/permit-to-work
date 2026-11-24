import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileCheck2,
  Flame,
  Plus,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { hasPermission } from '../../lib/permissions';
import type { Permit } from '../../types/api';
import { useAsyncData } from '../../hooks/useAsyncData';
import PermitTable from '../permits/PermitTable';
import ExpiringSoonPanel from './ExpiringSoonPanel';

interface DashboardData {
  all: Permit[];
  recent: Permit[];
  total: number;
}

async function loadDashboard(): Promise<DashboardData> {
  const first = await api.listPermits({ page: 1, pageSize: 50 });
  const remainingPages = Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => index + 2);
  const remaining = await Promise.all(
    remainingPages.map((page) => api.listPermits({ page, pageSize: 50 })),
  );
  const all = [...first.data, ...remaining.flatMap((page) => page.data)];

  return { all, recent: first.data.slice(0, 6), total: first.meta.total };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsyncData(loadDashboard, [user?.id]);

  const permits = data?.all ?? [];
  const pending = permits.filter((permit) => permit.status === 'PENDING_APPROVAL');
  const active = permits.filter((permit) => permit.status === 'ACTIVE');
  const atRisk = permits.filter(
    (permit) => permit.status === 'SUSPENDED' || permit.status === 'EXPIRED',
  );
  const verified = permits.filter((permit) => permit.status === 'CLOSED_VERIFIED');
  const attention = [...atRisk, ...pending].slice(0, 5);

  const stats = [
    {
      label: 'Total permits',
      value: data?.total ?? 0,
      icon: ClipboardList,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Active now',
      value: active.length,
      icon: Flame,
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Awaiting approval',
      value: pending.length,
      icon: ShieldCheck,
      tone: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Needs attention',
      value: atRisk.length,
      icon: AlertTriangle,
      tone: 'bg-red-100 text-red-700',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(13,148,136,0.28),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
                Operations overview
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Good to see you, {user?.name.split(' ')[0]}.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Monitor live permits, approvals and safety-critical work across your plant.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {hasPermission(user, 'permit:create') && (
                <Link to="/permits/new">
                  <Button>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New permit
                  </Button>
                </Link>
              )}
              <Link to="/permits">
                <Button variant="secondary" className="border-slate-600 bg-white/10 text-white hover:bg-white/20">
                  View all permits
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-teal-700" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${stat.tone}`}>
                    <stat.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <ExpiringSoonPanel permits={permits} />

          <div className="grid gap-6 xl:grid-cols-3">
            <Card
              title="Requires attention"
              description="Pending approvals and suspended or expired work."
              className="xl:col-span-2"
              actions={
                <Link to="/approvals" className="text-sm font-semibold text-teal-800 hover:underline">
                  Review approvals →
                </Link>
              }
            >
              {attention.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Nothing urgent right now. All tracked permits are in a stable state.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {attention.map((permit) => (
                    <li key={permit.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div>
                        <Link
                          to={`/permits/${permit.id}`}
                          className="font-semibold text-slate-900 hover:text-teal-800"
                        >
                          {permit.permitNumber}
                        </Link>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {permit.workDescription} · {permit.area.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {permit.validUntil && (
                          <span className="hidden text-xs text-slate-500 sm:inline">
                            <Timer className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                            {formatDateTime(permit.validUntil)}
                          </span>
                        )}
                        <Link
                          to={`/permits/${permit.id}`}
                          className="text-sm font-semibold text-teal-800 hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Safety signal" description="Verification and closeout discipline.">
              <div className="rounded-xl bg-emerald-50 p-5">
                <FileCheck2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                <p className="mt-3 text-3xl font-bold text-emerald-900">{verified.length}</p>
                <p className="text-sm font-medium text-emerald-800">Verified closed permits</p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-700">
                  Verification is the final independent check that work was completed safely.
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                <strong className="font-semibold">Remember:</strong> approvals are required before
                activation. The backend enforces every transition and records each action.
              </div>
            </Card>
          </div>

          <Card
            title="Recent permits"
            description="Latest permit records across the plant."
            actions={
              <Link to="/permits" className="text-sm font-semibold text-teal-800 hover:underline">
                View all →
              </Link>
            }
          >
            <PermitTable permits={data?.recent ?? []} />
          </Card>
        </>
      )}
    </div>
  );
}
