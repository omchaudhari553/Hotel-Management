import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';

export * from '../types/api';

export const DEFAULT_CENTRAL_HOST = 'localhost';

export const getCentralServerHost = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check custom saved host in localStorage
    const saved = localStorage.getItem('ajalkar_server_host');
    if (saved && (saved.trim() === '192.168.1.51' || saved.trim() === 'http://192.168.1.51:8080/api/v1')) {
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
      if (parsed.hostname && parsed.hostname !== '192.168.1.51') {
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
    if (saved && (saved.trim() === '192.168.1.51' || saved.trim() === 'http://192.168.1.51:8080/api/v1')) {
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
  if (envUrl && !envUrl.includes('192.168.1.51')) {
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

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || localStorage.getItem('ajalkar_token');
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

    // 401 Unauthorized or 403 Forbidden (when session expired/invalid) handling with token refresh
    if ((status === 401 || status === 403) && !originalRequest._retry && !isAuthEndpoint) {
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

    // 500 Internal Server Error
    if (status && status >= 500) {
      console.error('Backend Server Error:', errorMessage);
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
