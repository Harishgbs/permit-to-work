import { describe, expect, it } from 'vitest';
import {
  emptyPermitFilters,
  filtersFromSearchParams,
  isValidDateRange,
  permitQueryFromFilters,
  searchParamsFromFilters,
} from './permitFilters';

describe('permit filter interactions', () => {
  it('reads all active filters from query parameters', () => {
    const params = new URLSearchParams(
      'search=pump&status=ACTIVE&type=HOT_WORK&areaId=area-1&startDate=2026-11-01&endDate=2026-11-30&myApprovalsPending=true&page=2',
    );

    expect(filtersFromSearchParams(params)).toEqual({
      search: 'pump',
      status: 'ACTIVE',
      type: 'HOT_WORK',
      areaId: 'area-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      myApprovalsPending: true,
    });
  });

  it('writes all filters to query parameters and resets pagination', () => {
    const params = searchParamsFromFilters({
      search: 'pump',
      status: 'ACTIVE',
      type: 'HOT_WORK',
      areaId: 'area-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      myApprovalsPending: true,
    });

    expect(params.get('search')).toBe('pump');
    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('type')).toBe('HOT_WORK');
    expect(params.get('areaId')).toBe('area-1');
    expect(params.get('startDate')).toBe('2026-11-01');
    expect(params.get('endDate')).toBe('2026-11-30');
    expect(params.get('myApprovalsPending')).toBe('true');
    expect(params.has('page')).toBe(false);
  });

  it('omits empty filters when building the API query', () => {
    expect(permitQueryFromFilters(emptyPermitFilters, 3, 10)).toEqual({ page: 3, pageSize: 10 });
  });

  it('builds a combined API query from filter values', () => {
    expect(
      permitQueryFromFilters(
        {
          search: 'pump',
          status: 'ACTIVE',
          type: 'HOT_WORK',
          areaId: 'area-1',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          myApprovalsPending: true,
        },
        2,
        10,
      ),
    ).toEqual({
      page: 2,
      pageSize: 10,
      search: 'pump',
      status: 'ACTIVE',
      type: 'HOT_WORK',
      areaId: 'area-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      myApprovalsPending: true,
    });
  });

  it('enables and disables the approval filter while preserving other filters', () => {
    const enabled = searchParamsFromFilters({
      ...emptyPermitFilters,
      status: 'PENDING_APPROVAL',
      myApprovalsPending: true,
    });
    expect(filtersFromSearchParams(enabled).myApprovalsPending).toBe(true);

    const disabled = searchParamsFromFilters({
      ...filtersFromSearchParams(enabled),
      myApprovalsPending: false,
    });
    expect(disabled.has('myApprovalsPending')).toBe(false);
    expect(disabled.get('status')).toBe('PENDING_APPROVAL');
    expect(filtersFromSearchParams(disabled).myApprovalsPending).toBe(false);
  });

  it('validates the date range before applying filters', () => {
    expect(isValidDateRange({ ...emptyPermitFilters, startDate: '2026-11-30', endDate: '2026-11-01' })).toBe(
      false,
    );
    expect(isValidDateRange({ ...emptyPermitFilters, startDate: '2026-11-01', endDate: '2026-11-01' })).toBe(
      true,
    );
    expect(isValidDateRange({ ...emptyPermitFilters, startDate: '2026-11-01' })).toBe(true);
  });
});
