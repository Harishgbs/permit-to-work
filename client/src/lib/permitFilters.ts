import type { PermitQuery, PermitStatus, PermitType } from '../types/api';

export interface PermitFilterValues {
  search: string;
  status: string;
  type: string;
  areaId: string;
  startDate: string;
  endDate: string;
}

export const emptyPermitFilters: PermitFilterValues = {
  search: '',
  status: '',
  type: '',
  areaId: '',
  startDate: '',
  endDate: '',
};

export function filtersFromSearchParams(params: URLSearchParams): PermitFilterValues {
  return {
    search: params.get('search') ?? '',
    status: params.get('status') ?? '',
    type: params.get('type') ?? '',
    areaId: params.get('areaId') ?? '',
    startDate: params.get('startDate') ?? '',
    endDate: params.get('endDate') ?? '',
  };
}

export function isValidDateRange(filters: PermitFilterValues): boolean {
  if (!filters.startDate || !filters.endDate) return true;
  return filters.startDate <= filters.endDate;
}

export function permitQueryFromFilters(
  filters: PermitFilterValues,
  page = 1,
  pageSize = 10,
): PermitQuery {
  return {
    page,
    pageSize,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status as PermitStatus } : {}),
    ...(filters.type ? { type: filters.type as PermitType } : {}),
    ...(filters.areaId ? { areaId: filters.areaId } : {}),
    ...(filters.startDate ? { startDate: filters.startDate } : {}),
    ...(filters.endDate ? { endDate: filters.endDate } : {}),
  };
}

export function searchParamsFromFilters(
  filters: PermitFilterValues,
  page = 1,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.areaId) params.set('areaId', filters.areaId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (page > 1) params.set('page', String(page));

  return params;
}
