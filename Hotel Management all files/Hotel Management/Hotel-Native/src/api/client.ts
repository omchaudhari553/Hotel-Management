import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Safe Base64 decoder cross-platform (Web / Android / iOS)
const safeBase64Decode = (str: string): string => {
  try {
    if (typeof atob === 'function') {
      return atob(str);
    }
  } catch {}
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    str = String(str).replace(/=+$/, '');
    for (
      let bc = 0, bs = 0, buffer, idx = 0;
      (buffer = str.charAt(idx++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch {
    return '';
  }
};

// Check if JWT token is expired or invalid
export const isJwtExpired = (token: string): boolean => {
  try {
    if (!token || typeof token !== 'string' || !token.startsWith('ey')) return true;
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = safeBase64Decode(base64);
    if (!decoded) return true;
    const payload = JSON.parse(decoded);
    // If exp is present, check if current time is past exp (with 30s grace window)
    if (payload.exp && Date.now() >= payload.exp * 1000 - 30000) {
      return true;
    }
    // Must be for hoteladmin or admin@royalpalace.com
    if (payload.sub && payload.sub !== 'hoteladmin' && payload.sub !== 'admin@royalpalace.com') {
      return true;
    }
    return false;
  } catch {
    return true;
  }
};

// Dynamically determine host IP so physical Android phones, iPhones, and simulators connect seamlessly
const getHostIp = (): string => {
  try {
    const scriptURL: string = NativeModules.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/(?:https?|exp):\/\/([^/:]+)/i);
    if (match && match[1]) {
      const detected = match[1];
      if (detected !== 'localhost' && detected !== '127.0.0.1' && !detected.includes('83') && !detected.includes('.80')) {
        return detected;
      }
    }
  } catch {}
  // Default to actual host machine IP on local Wi-Fi (192.168.1.34)
  return '192.168.1.34';
};

const hostIp = getHostIp();
export const BACKEND_PORT = 8080;
export const DEFAULT_URL =
  Platform.OS === 'web'
    ? (typeof window !== 'undefined' && window.location?.hostname
        ? `http://${window.location.hostname}:8080/api/v1`
        : 'http://localhost:8080/api/v1')
    : `http://${hostIp}:8080/api/v1`;

export const STORAGE_KEYS = {
  TOKEN: '@ajalkar_token',
  USER: '@ajalkar_user',
  BUSINESS: '@ajalkar_business',
  INDUSTRY: '@ajalkar_industry',
  API_BASE_URL: '@ajalkar_api_url',
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
    if (saved && (saved.includes('192.168.1.83') || saved.includes('192.168.1.80') || saved.includes('undefined'))) {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
      return DEFAULT_URL;
    }
    return saved || DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, url);
  apiClient.defaults.baseURL = url;
};

// Ensure authenticated backend token for hoteladmin (Business ID 1)
let authPromise: Promise<string | null> | null = null;

export const ensureBackendToken = async (forceRefresh = false): Promise<string | null> => {
  try {
    if (!forceRefresh) {
      let existing = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if ((!existing || !existing.startsWith('ey') || isJwtExpired(existing)) && typeof localStorage !== 'undefined') {
        try {
          existing = localStorage.getItem('@ajalkar_token') || localStorage.getItem('token') || localStorage.getItem('ajalkar_token');
        } catch {}
      }
      if (existing && existing.startsWith('ey') && existing.length > 30 && !isJwtExpired(existing)) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${existing}`;
        return existing;
      }
    }

    if (authPromise) return authPromise;

    authPromise = (async () => {
      const detectedIp = getHostIp();
      const preferred = [
        'http://192.168.1.34:8080/api/v1',
        DEFAULT_URL,
        apiClient.defaults.baseURL,
        `http://${detectedIp}:8080/api/v1`,
        Platform.OS === 'web' ? 'http://localhost:8080/api/v1' : null,
        Platform.OS === 'web' ? 'http://127.0.0.1:8080/api/v1' : null,
        Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : null,
      ].filter(Boolean) as string[];

      const uniqueCandidates = Array.from(new Set(preferred)).filter(
        (url) => !url.includes('192.168.1.83') && !url.includes('192.168.1.80')
      );

      for (const base of uniqueCandidates) {
        try {
          const res = await axios.post(
            `${base}/auth/login`,
            {
              identifier: 'hoteladmin',
              password: 'Admin@12345',
            },
            {
              timeout: 8000,
              headers: { 'Content-Type': 'application/json' },
            }
          );

          const data = res.data?.data;
          const token = data?.token;
          if (token) {
            await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            if (typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem('@ajalkar_token', token);
                localStorage.setItem('token', token);
                localStorage.setItem('ajalkar_token', token);
              } catch {}
            }
            if (data.user) {
              await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            }
            if (data.business) {
              await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(data.business));
            }
            // Point apiClient to this responsive base URL & default auth header
            apiClient.defaults.baseURL = base;
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
          }
        } catch {
          // Continue to next candidate
        }
      }
      return null;
    })().finally(() => {
      authPromise = null;
    });

    return await authPromise;
  } catch {
    return null;
  }
};

// Request interceptor to attach JWT token & custom saved API URL
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    let savedBaseUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
    if (savedBaseUrl && (
      savedBaseUrl.includes('192.168.1.83') ||
      savedBaseUrl.includes('192.168.1.80') ||
      savedBaseUrl.includes('.80:') ||
      savedBaseUrl.includes('undefined') ||
      (Platform.OS !== 'web' && (savedBaseUrl.includes('localhost') || savedBaseUrl.includes('127.0.0.1')))
    )) {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
      savedBaseUrl = null;
    }
    if (savedBaseUrl) {
      config.baseURL = savedBaseUrl;
    } else {
      config.baseURL = DEFAULT_URL;
    }

    let token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token || token === 'offline-token' || token === 'demo-token' || !token.startsWith('ey') || isJwtExpired(token)) {
      token = await ensureBackendToken(true);
    }
    if (token && config.headers) {
      if (typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    // ignore
  }
  return config;
});

// Response interceptor: automatically refresh auth token on 401 OR 403 (Forbidden / Expired Token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Both 401 (Unauthorized) and 403 (Forbidden / Expired JWT) mean the token is invalid or expired
    if ((status === 401 || status === 403) && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        const newToken = await ensureBackendToken(true);
        if (newToken) {
          if (originalRequest.headers) {
            if (typeof (originalRequest.headers as any).set === 'function') {
              (originalRequest.headers as any).set('Authorization', `Bearer ${newToken}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            // Strip any conflicting database headers
            delete (originalRequest.headers as any)['X-Database-Context'];
            delete (originalRequest.headers as any)['X-Database-Id'];
          }
          return apiClient(originalRequest);
        }
      } catch (reAuthErr) {
        // Silently fall through to rejection
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
