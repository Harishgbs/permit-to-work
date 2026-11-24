import { Filter, Plus, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { api } from '../../lib/api';
import {
  emptyPermitFilters,
  filtersFromSearchParams,
  isValidDateRange,
  permitQueryFromFilters,
  searchParamsFromFilters,
  type PermitFilterValues,
} from '../../lib/permitFilters';
import { hasPermission } from '../../lib/permissions';
import type { PermitStatus, PermitType } from '../../types/api';
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
  const activeFilters = filtersFromSearchParams(searchParams);
  const [filters, setFilters] = useState(activeFilters);
  const [filterError, setFilterError] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = 10;
  const query = permitQueryFromFilters(activeFilters, page, pageSize);

  const { data, error, isLoading, reload } = useAsyncData(
    () => api.listPermits(query),
    [searchParams.toString()],
  );
  const { data: areas, error: areasError } = useAsyncData(() => api.listAreas(), []);

  useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams));
    setFilterError(null);
  }, [searchParams]);

  const setField = (field: keyof PermitFilterValues, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    if (field === 'startDate' || field === 'endDate') setFilterError(null);
  };

  const applyFilters = (values: PermitFilterValues) => {
    if (!isValidDateRange(values)) {
      setFilterError('Start date must be on or before end date.');
      return;
    }

    setFilterError(null);
    setSearchParams(searchParamsFromFilters(values));
  };

  const changePage = (nextPage: number) => {
    setSearchParams(searchParamsFromFilters(activeFilters, nextPage));
  };

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters({ ...filters, search: filters.search.trim() });
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
        <form onSubmit={handleFilterSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="sm:col-span-2">
            <label htmlFor="permit-search" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="permit-search"
                value={filters.search}
                onChange={(event) => setField('search', event.target.value)}
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
              value={filters.status}
              onChange={(event) => setField('status', event.target.value)}
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
              value={filters.type}
              onChange={(event) => setField('type', event.target.value)}
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
          <div>
            <label htmlFor="permit-area" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Area
            </label>
            <select
              id="permit-area"
              value={filters.areaId}
              onChange={(event) => setField('areaId', event.target.value)}
              className={`${selectClass} mt-1`}
            >
              <option value="">All areas</option>
              {filters.areaId && !areas?.some((area) => area.id === filters.areaId) && (
                <option value={filters.areaId}>Selected area</option>
              )}
              {areas?.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} · {area.plantName}
                </option>
              ))}
            </select>
            {areasError && (
              <p className="mt-1 text-xs text-red-600">Area list unavailable. Retry to load areas.</p>
            )}
          </div>
          <div>
            <label htmlFor="permit-start-date" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Planned start from
            </label>
            <input
              id="permit-start-date"
              type="date"
              value={filters.startDate}
              onChange={(event) => setField('startDate', event.target.value)}
              className={`${selectClass} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="permit-end-date" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Planned start to
            </label>
            <input
              id="permit-end-date"
              type="date"
              value={filters.endDate}
              onChange={(event) => setField('endDate', event.target.value)}
              className={`${selectClass} mt-1`}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-4 lg:justify-end">
            {filterError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {filterError}
              </p>
            )}
            <Button type="submit" variant="secondary" icon={<Filter className="h-4 w-4" aria-hidden="true" />}>
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => applyFilters(emptyPermitFilters)}
              disabled={!searchParams.toString()}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
            Date filters match each permit's planned start date, inclusive of both selected days.
          </p>
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
                onClick={() => changePage(page - 1)}
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
                onClick={() => changePage(page + 1)}
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
