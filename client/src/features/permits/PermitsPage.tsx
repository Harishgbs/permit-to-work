import { Filter, Plus, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { api } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { PermitQuery, PermitStatus, PermitType } from '../../types/api';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useAuth } from '../auth/AuthProvider';
import PermitTable from './PermitTable';

const statuses: PermitStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'REJECTED',
  'EXPIRED',
  'CLOSED',
  'CLOSED_VERIFIED',
  'CANCELLED',
];

const types: PermitType[] = [
  'HOT_WORK',
  'CONFINED_SPACE',
  'WORKING_AT_HEIGHT',
  'ELECTRICAL_LOTO',
];

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20';

export default function PermitsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = 10;
  const query: PermitQuery = {
    page,
    pageSize,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as PermitStatus | null) ?? undefined,
    type: (searchParams.get('type') as PermitType | null) ?? undefined,
  };

  const { data, error, isLoading, reload } = useAsyncData(
    () => api.listPermits(query),
    [searchParams.toString()],
  );

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setStatus(searchParams.get('status') ?? '');
    setType(searchParams.get('type') ?? '');
  }, [searchParams]);

  const updateFilters = (next: { search?: string; status?: string; type?: string; page?: number }) => {
    const params = new URLSearchParams();

    const values = {
      search: next.search ?? searchParams.get('search') ?? '',
      status: next.status ?? searchParams.get('status') ?? '',
      type: next.type ?? searchParams.get('type') ?? '',
      page: next.page ?? 1,
    };

    if (values.search) params.set('search', values.search);
    if (values.status) params.set('status', values.status);
    if (values.type) params.set('type', values.type);
    if (values.page > 1) params.set('page', String(values.page));

    setSearchParams(params);
  };

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters({ search: search.trim(), status, type });
  };

  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Permit register</h2>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter and open any permit in the plant.
          </p>
        </div>
        {hasPermission(user, 'permit:create') && (
          <Link to="/permits/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create permit
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <form onSubmit={handleFilterSubmit} className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="permit-search" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="permit-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Permit no., description or contractor"
                className={`${selectClass} pl-9`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="permit-status" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              id="permit-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`${selectClass} mt-1`}
            >
              <option value="">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="permit-type" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Type
            </label>
            <select
              id="permit-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={`${selectClass} mt-1`}
            >
              <option value="">All types</option>
              {types.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" icon={<Filter className="h-4 w-4" aria-hidden="true" />}>
            Apply
          </Button>
        </form>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : isLoading ? (
        <Card>
          <p className="py-12 text-center text-sm text-slate-500">Loading permits…</p>
        </Card>
      ) : !data?.data.length ? (
        <EmptyState
          title="No permits found"
          message="Adjust the filters or create a new permit to get started."
          icon={<Filter className="h-5 w-5" aria-hidden="true" />}
        />
      ) : (
        <Card>
          <PermitTable permits={data.data} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
            <p>
              Showing <strong className="text-slate-900">{data.data.length}</strong> of{' '}
              <strong className="text-slate-900">{meta?.total ?? 0}</strong> permits
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: page - 1 })}
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateFilters({ page: page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
