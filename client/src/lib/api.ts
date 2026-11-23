import type {
  ActionResponse,
  ActivationResponse,
  LoginResponse,
  MeResponse,
  Permit,
  PermitListResponse,
  PermitPayload,
  PermitQuery,
  ReasonResponse,
  WorkLog,
  WorkLogResponse,
} from '../types/api';

export const TOKEN_STORAGE_KEY = 'ptw_token';
export const UNAUTHORIZED_EVENT = 'ptw:unauthorized';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function buildQuery(query: PermitQuery = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

async function request<T>(path: string, body?: unknown, method = 'GET'): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the API. Check that the server is running.', 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const errorBody = (await response.json()) as { error?: string };
      message = errorBody.error ?? message;
    } catch {}

    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { email, password }, 'POST'),
  me: () => request<MeResponse>('/auth/me'),
  listPermits: (query: PermitQuery = {}) =>
    request<PermitListResponse>(`/permits${buildQuery(query)}`),
  getPermit: (id: string) => request<Permit>(`/permits/${encodeURIComponent(id)}`),
  createPermit: (payload: PermitPayload) => request<Permit>('/permits', payload, 'POST'),
  updatePermit: (id: string, payload: PermitPayload) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}`, payload, 'PATCH'),
  submitPermit: (id: string) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/submit`, undefined, 'POST'),
  approvePermit: (id: string, body: ActionResponse = {}) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/approve`, body, 'POST'),
  rejectPermit: (id: string, body: ReasonResponse) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/reject`, body, 'POST'),
  activatePermit: (id: string, body: ActivationResponse = {}) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/activate`, body, 'POST'),
  suspendPermit: (id: string, body: ReasonResponse) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/suspend`, body, 'POST'),
  resumePermit: (id: string, body: ActionResponse = {}) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/resume`, body, 'POST'),
  closePermit: (id: string, body: ActionResponse = {}) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/close`, body, 'POST'),
  verifyPermit: (id: string, body: ActionResponse = {}) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/verify`, body, 'POST'),
  cancelPermit: (id: string, body: ReasonResponse) =>
    request<Permit>(`/permits/${encodeURIComponent(id)}/cancel`, body, 'POST'),
  addWorkLog: (id: string, body: WorkLogResponse) =>
    request<WorkLog>(`/permits/${encodeURIComponent(id)}/work-logs`, body, 'POST'),
};
