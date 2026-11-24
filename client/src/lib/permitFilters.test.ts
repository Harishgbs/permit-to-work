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
      'search=pump&status=ACTIVE&type=HOT_WORK&areaId=area-1&startDate=2026-11-01&endDate=2026-11-30&page=2',
    );

    expect(filtersFromSearchParams(params)).toEqual({
      search: 'pump',
      status: 'ACTIVE',
      type: 'HOT_WORK',
      areaId: 'area-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
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
    });

    expect(params.get('search')).toBe('pump');
    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('type')).toBe('HOT_WORK');
    expect(params.get('areaId')).toBe('area-1');
    expect(params.get('startDate')).toBe('2026-11-01');
    expect(params.get('endDate')).toBe('2026-11-30');
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
    });
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
