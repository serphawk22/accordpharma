export const DEFAULT_BACKEND_URL = 'https://accordpharma-production.up.railway.app';

export function getBackendUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BACKEND_URL;
  url = url.trim().replace(/\/+$/, '');
  // Normalize if user provided /api/v1 or /api suffix in environment variable
  url = url.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
  return url;
}

export function getApiBaseUrl(): string {
  return `${getBackendUrl()}/api/v1`;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = localStorage.getItem('accord_auth_token');
    if (fromStorage) return fromStorage;
    const cookieMatch = document.cookie.match(/(?:^|;\s*)accord_token=([^;]+)/);
    if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return null;
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function backendFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = cleanPath.startsWith('/api/') ? `${base}${cleanPath}` : `${base}/api/v1${cleanPath}`;

  const headers = getAuthHeaders((options.headers as Record<string, string>) || {});
  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

export interface BackendHealthResponse {
  status: 'online' | 'offline' | 'error';
  url: string;
  statusCode?: number;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  const base = getBackendUrl();
  const startTime = Date.now();
  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        status: 'online',
        url: base,
        statusCode: res.status,
        latencyMs,
        details: data,
      };
    }
    return {
      status: 'error',
      url: base,
      statusCode: res.status,
      latencyMs,
      message: `Backend returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    return {
      status: 'offline',
      url: base,
      latencyMs,
      message: err instanceof Error ? err.message : 'Failed to connect to backend',
    };
  }
}

export async function checkDatabaseHealth(): Promise<BackendHealthResponse> {
  const base = getBackendUrl();
  const startTime = Date.now();
  try {
    const res = await fetch(`${base}/api/v1/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const latencyMs = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        status: 'online',
        url: base,
        statusCode: res.status,
        latencyMs,
        details: data,
      };
    }
    return {
      status: 'error',
      url: base,
      statusCode: res.status,
      latencyMs,
      details: data,
      message: data.status || `Database check returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    return {
      status: 'offline',
      url: base,
      latencyMs: Date.now() - startTime,
      message: err instanceof Error ? err.message : 'Database check unreachable',
    };
  }
}
