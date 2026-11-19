import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';

export * from '../types/api';

export const DEFAULT_CENTRAL_HOST = 'localhost';

const STALE_IPS = ['192.168.1.35', '192.168.1.44', '192.168.1.51', 'undefined', 'null', '0.0.0.0'];

const isStaleHost = (val?: string | null): boolean => {
  if (!val) return false;
  return STALE_IPS.some(s => val.includes(s));
};

export const getCentralServerHost = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check custom saved host in localStorage
    const saved = localStorage.getItem('ajalkar_server_host');
    if (saved && isStaleHost(saved.trim())) {
      // Clear obsolete hardcoded stale IP
      localStorage.removeItem('ajalkar_server_host');
    } else if (saved && saved.trim()) {
      return saved.trim();
    }

    // 2. Use current browser hostname (e.g. localhost, 10.173.104.1, etc.)
    const hn = window.location?.hostname;
    if (hn) {
      return hn;
    }
  }

  // 3. Fallback to env or default
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.hostname && !isStaleHost(parsed.hostname)) {
        return parsed.hostname;
      }
    } catch {
      // ignore
    }
  }

  return DEFAULT_CENTRAL_HOST;
};

export const setCentralServerHost = (host: string): void => {
  if (typeof window !== 'undefined') {
    if (host && host.trim()) {
      localStorage.setItem('ajalkar_server_host', host.trim());
    } else {
      localStorage.removeItem('ajalkar_server_host');
    }
  }
};

export const resolveBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check custom saved host
    const saved = localStorage.getItem('ajalkar_server_host');
    if (saved && isStaleHost(saved.trim())) {
      localStorage.removeItem('ajalkar_server_host');
    } else if (saved && saved.trim()) {
      const trimmed = saved.trim();
      return trimmed.startsWith('http') ? trimmed : `http://${trimmed}:8080/api/v1`;
    }

    // 2. If loaded over network IP/hostname or localhost
    const hn = window.location?.hostname;
    if (hn) {
      return `http://${hn}:8080/api/v1`;
    }
  }

  // 3. Check environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !isStaleHost(envUrl)) {
    return envUrl;
  }

  // 4. Default to localhost
  return `http://${DEFAULT_CENTRAL_HOST}:8080/api/v1`;
};

export const testServerConnection = async (
  customHost?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> => {
  const host = customHost?.trim() || getCentralServerHost();
  const targetUrl = host.startsWith('http') ? `${host}/actuator/health` : `http://${host}:8080/actuator/health`;
  const startTime = Date.now();
  try {
    const res = await axios.get(targetUrl, { timeout: 3500 });
    const latencyMs = Date.now() - startTime;
    if (res.status === 200 && res.data?.status === 'UP') {
      return { success: true, message: `Connected to Central Hotel Server (${host}:8080)`, latencyMs };
    }
    return { success: true, message: `Server responded from ${host}`, latencyMs };
  } catch (err: any) {
    const altUrl = host.startsWith('http') ? `${host}/api/v1/industries` : `http://${host}:8080/api/v1/industries`;
    try {
      const altRes = await axios.get(altUrl, { timeout: 3500 });
      const latencyMs = Date.now() - startTime;
      if (altRes.status === 200) {
        return { success: true, message: `Connected to Central Hotel Server (${host}:8080)`, latencyMs };
      }
    } catch (_) {
      // ignore
    }
    return {
      success: false,
      message: err.message || `Cannot connect to server at ${host}:8080`,
      latencyMs: 0,
    };
  }
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const isJwtExpired = (token?: string | null): boolean => {
  if (!token || typeof token !== 'string' || !token.startsWith('ey')) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed.exp && Date.now() >= parsed.exp * 1000 - 15000) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
};

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token') || localStorage.getItem('ajalkar_token');
  if (!token) return null;
  if (isJwtExpired(token)) {
    const refresh = getRefreshToken();
    if (!refresh || isJwtExpired(refresh)) {
      clearAuthTokens();
      return null;
    }
  }
  return token;
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setAuthTokens = (token: string, refreshToken?: string): void => {
  localStorage.setItem('token', token);
  localStorage.setItem('ajalkar_token', token);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('ajalkar_token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('ajalkar_user');
  localStorage.removeItem('ajalkar_business');
};

// Request interceptor to attach JWT token and ensure dynamic baseURL
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = resolveBaseUrl();
    // Normalize url if it redundantly starts with /api/v1
    if (config.url && config.url.startsWith('/api/v1/')) {
      config.url = config.url.substring('/api/v1'.length);
    }
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and common errors
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const responseData = error.response?.data as any;

    // Build user-friendly backend error message
    let errorMessage =
      responseData?.message ||
      responseData?.error ||
      error.message ||
      'An unexpected error occurred';

    if (responseData?.errors && typeof responseData.errors === 'object') {
      const fieldErrors = Object.entries(responseData.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      if (fieldErrors) {
        errorMessage = `${errorMessage} (${fieldErrors})`;
      }
    }

    // Attach custom sanitized message for easy display in components
    (error as any).userFriendlyMessage = errorMessage;

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register');

    // Handle 402 Payment Required when free trial expires and paid features are restricted
    if (status === 402 || responseData?.errorCode === 'SUBSCRIPTION_EXPIRED') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('open-subscription-modal', {
            detail: { mode: 'upgrade' },
          })
        );
      }
      return Promise.reject(error);
    }

    // 403 Forbidden: User is authenticated but lacks required permission/role for this resource
    if (status === 403 && !isAuthEndpoint) {
      console.warn('Access Forbidden (403): Insufficient permissions for', originalRequest.url);
      (error as any).userFriendlyMessage = errorMessage || 'Access denied: You do not have permissions for this resource';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app-access-denied', {
            detail: { message: (error as any).userFriendlyMessage, url: originalRequest.url },
          })
        );
      }
      return Promise.reject(error);
    }

    // 409 Conflict: Duplicate record or concurrent update collision
    if (status === 409) {
      const conflictMsg = responseData?.message || responseData?.error || errorMessage || 'A record with this identifier already exists (Conflict).';
      (error as any).userFriendlyMessage = conflictMsg;
      console.warn('Resource Conflict (409):', conflictMsg, 'URL:', originalRequest.url);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('app-conflict-error', {
            detail: { message: conflictMsg, url: originalRequest.url },
          })
        );
      }
      return Promise.reject(error);
    }

    // 401 Unauthorized handling with token refresh
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // Immediate logout if branch has been deactivated from Admin Panel
      if (responseData?.errorCode === 'BRANCH_DEACTIVATED' || responseData?.message?.includes('branch is deactivated')) {
        clearAuthTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearAuthTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          // Redirect to login when authentication credentials expire or are missing
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<ApiResponse<{ token: string; refreshToken?: string }>>(
          `${resolveBaseUrl()}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const data = refreshResponse.data.data;
        const newToken = data.token;
        const newRefreshToken = data.refreshToken || refreshToken;

        setAuthTokens(newToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // 400 Bad Request
    if (status === 400) {
      console.warn('Bad Request:', errorMessage);
    }

    // 404 Not Found
    if (status === 404) {
      console.warn('Resource not found:', originalRequest.url);
    }

    // 501 Not Implemented
    if (status === 501) {
      console.warn('Not Implemented (501):', originalRequest.url);
      (error as any).userFriendlyMessage = 'This feature is not supported in the current version.';
    }

    // 503 Service Unavailable
    if (status === 503) {
      console.error('Service Unavailable (503):', originalRequest.url);
      (error as any).userFriendlyMessage =
        'Database or backend service is temporarily unavailable. Please retry in a few moments.';
    }

    // 500 Internal Server Error
    if (status === 500) {
      console.error('Backend Server Error (500):', errorMessage);
      (error as any).userFriendlyMessage =
        errorMessage && !errorMessage.includes('Exception')
          ? errorMessage
          : 'A server error occurred. Please try again or contact support.';
    }

    // Network error (no response)
    if (!error.response && error.request) {
      const currentBaseUrl = resolveBaseUrl();
      console.error('Network Error: Unable to reach backend at ' + currentBaseUrl);
      (error as any).userFriendlyMessage =
        'Unable to connect to the central server. Please ensure the central backend is running at ' +
        currentBaseUrl;
    }

    return Promise.reject(error);
  }
);

// Backward-compatibility no-op helper if imported anywhere
export const delay = (ms = 0): Promise<void> => Promise.resolve();

export default api;
