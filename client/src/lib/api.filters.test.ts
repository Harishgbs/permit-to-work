import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

const fetchMock = vi.fn();

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [], meta: {} }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('permit filter API requests', () => {
  it('serializes combined filters into query parameters', async () => {
    await api.listPermits({
      page: 2,
      pageSize: 10,
      status: 'ACTIVE',
      type: 'HOT_WORK',
      areaId: 'area-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      search: 'pump',
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost');
    expect(url.pathname).toBe('/api/permits');
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      page: '2',
      pageSize: '10',
      status: 'ACTIVE',
      type: 'HOT_WORK',
      areaId: 'area-1',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      search: 'pump',
    });
  });

  it('loads area options from the API', async () => {
    await api.listAreas();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/references/areas');
  });
});
