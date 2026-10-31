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
