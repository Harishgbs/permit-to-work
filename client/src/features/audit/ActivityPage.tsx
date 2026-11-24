import { FileClock, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../lib/api';
import type { Permit } from '../../types/api';

async function loadActivity() {
  const first = await api.listPermits({ page: 1, pageSize: 50 });
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => index + 2).map(
      (page) => api.listPermits({ page, pageSize: 50 }),
    ),
  );

  return [...first.data, ...remaining.flatMap((page) => page.data)].filter(
    (permit) => permit._count.workLogs > 0,
  );
}

export default function ActivityPage() {
  const { data, error, isLoading, reload } = useAsyncData(loadActivity, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Activity & audit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Visibility into work execution and compliance records.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Audit history is available per permit</p>
            <p className="mt-1 leading-relaxed text-blue-800">
              Open any permit to view its chronological audit timeline. There is still no work-log
              list endpoint, so this screen shows real work-log counts from permit responses only.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card title="Permits with logged work" description="Counts come directly from the permit register.">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading activity…</p>
          ) : !data?.length ? (
            <div className="py-12 text-center">
              <FileClock className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-700">No work logs recorded yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Work logs are added while a permit is active.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {data.map((permit: Permit) => (
                <li key={permit.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <Link
                      to={`/permits/${permit.id}`}
                      className="font-semibold text-teal-800 hover:underline"
                    >
                      {permit.permitNumber}
                    </Link>
                    <p className="text-sm text-slate-500">{permit.workDescription}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {permit._count.workLogs} work log{permit._count.workLogs === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
