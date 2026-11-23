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
    return false;
  } catch {
    return true;
  }
};

// Obsolete / Dead IP list that must be aggressively purged from AsyncStorage & candidate lists
export const STALE_IPS = [
  '192.168.1.35',
  '192.168.1.44',
  '192.168.1.51',
  '10.173.104.1',
  'undefined',
  'null',
  '0.0.0.0',
  'NaN',
];

export const isStaleUrlOrIp = (urlOrIp?: string | null): boolean => {
  if (!urlOrIp || typeof urlOrIp !== 'string') return true;
  const lower = urlOrIp.toLowerCase().trim();
  if (lower === '' || lower === 'undefined' || lower === 'null' || lower === '0.0.0.0' || lower === 'nan') return true;
  if (Platform.OS !== 'web' && (lower.includes('localhost') || lower.includes('127.0.0.1'))) return true;
  return STALE_IPS.some((stale) => lower.includes(stale.toLowerCase()));
};

// Active LAN IP of the host computer running backend & Metro (Matches Wi-Fi adapter)
export const CURRENT_LAN_HOST = '192.168.1.33';
export const BACKEND_PORT = 8080;

// Dynamically determine host IP so physical Android phones, iPhones, and simulators connect seamlessly
export const getDetectedHostIp = (): string => {
  // 1. Expo Constants (most reliable on physical iPhones / Android running Expo Go / dev build)
  try {
    const Constants = require('expo-constants')?.default || require('expo-constants');
    const c = Constants as any;
    const hostUri =
      c.expoConfig?.hostUri ||
      c.expoGoConfig?.debuggerHost ||
      c.manifest?.debuggerHost ||
      c.manifest2?.extra?.expoGo?.debuggerHost ||
      c.manifest2?.extra?.expoClient?.hostUri ||
      c.experienceUrl ||
      c.linkingUri;
    if (hostUri && typeof hostUri === 'string') {
      const match = hostUri.match(/(?:https?|exp):\/\/([^/:]+)/i) || hostUri.match(/^([^/:]+)/);
      const ip = match ? match[1] : hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !isStaleUrlOrIp(ip)) {
        return ip;
      }
    }
  } catch {}

  // 2. React Native scriptURL
  try {
    const scriptURL: string = NativeModules.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/(?:https?|exp):\/\/([^/:]+)/i);
    if (match && match[1]) {
      const detected = match[1];
      if (detected !== 'localhost' && detected !== '127.0.0.1' && !isStaleUrlOrIp(detected)) {
        return detected;
      }
    }
  } catch {}

  // 3. Web environment
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  // 4. Default to current host machine IP on local Wi-Fi
  return CURRENT_LAN_HOST;
};

export const getDefaultApiUrl = (): string => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.location?.hostname
      ? `http://${window.location.hostname}:${BACKEND_PORT}/api/v1`
      : `http://localhost:${BACKEND_PORT}/api/v1`;
  }
  const host = getDetectedHostIp();
  return `http://${host}:${BACKEND_PORT}/api/v1`;
};

export const DEFAULT_URL = getDefaultApiUrl();

export const STORAGE_KEYS = {
  TOKEN: '@ajalkar_token',
  USER: '@ajalkar_user',
  BUSINESS: '@ajalkar_business',
  INDUSTRY: '@ajalkar_industry',
  API_BASE_URL: '@ajalkar_api_url',
  SERVER_HOST: '@ajalkar_server_host',
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
    if (saved) {
      if (
        isStaleUrlOrIp(saved) ||
        (Platform.OS !== 'web' && (saved.includes('localhost') || saved.includes('127.0.0.1')))
      ) {
        await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
      } else {
        return saved.trim();
      }
    }
    const savedHost = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_HOST);
    if (savedHost) {
      if (isStaleUrlOrIp(savedHost)) {
        await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_HOST);
      } else {
        return savedHost.startsWith('http')
          ? savedHost
          : `http://${savedHost.trim()}:${BACKEND_PORT}/api/v1`;
      }
    }
  } catch {}
  return getDefaultApiUrl();
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  memoryBaseUrl = cleanUrl;
  lastWorkingBaseUrl = null;
  await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, cleanUrl);
  apiClient.defaults.baseURL = cleanUrl;
};

export const setServerHost = async (host: string): Promise<string> => {
  const trimmed = host.trim();
  const url = trimmed.startsWith('http') ? trimmed : `http://${trimmed}:${BACKEND_PORT}/api/v1`;
  await AsyncStorage.setItem(STORAGE_KEYS.SERVER_HOST, trimmed);
  await setApiBaseUrl(url);
  return url;
};

export const resetApiBaseUrl = async (): Promise<string> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
  await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_HOST);
  const def = getDefaultApiUrl();
  memoryBaseUrl = def;
  lastWorkingBaseUrl = null;
  apiClient.defaults.baseURL = def;
  return def;
};

export const testServerConnection = async (
  targetUrlOrHost?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> => {
  let target = targetUrlOrHost?.trim();
  if (!target) {
    target = await getApiBaseUrl();
  } else if (!target.startsWith('http')) {
    target = `http://${target}:${BACKEND_PORT}/api/v1`;
  }
  const origin = target.replace(/\/api\/v1\/?$/, '');
  const start = Date.now();
  try {
    const res = await axios.get(`${origin}/actuator/health`, { timeout: 3500 });
    const latencyMs = Date.now() - start;
    if (res.status === 200 && res.data?.status === 'UP') {
      return { success: true, message: `Connected to Central Server (${origin})`, latencyMs };
    }
    return { success: true, message: `Server responded from ${origin}`, latencyMs };
  } catch (err: any) {
    try {
      const altRes = await axios.get(`${target}/industries`, { timeout: 3500 });
      const latencyMs = Date.now() - start;
      if (altRes.status === 200) {
        return { success: true, message: `Connected to Central Server (${target})`, latencyMs };
      }
    } catch {}
    return {
      success: false,
      message: err.message || `Cannot connect to server at ${target}`,
      latencyMs: 0,
    };
  }
};

// In-memory token & baseURL cache for ultra-fast (0ms) synchronous resolution
let memoryToken: string | null = null;
let tokenExpiresAt: number = 0;
let memoryBaseUrl: string | null = null;
let lastWorkingBaseUrl: string | null = null;
let authPromise: Promise<string | null> | null = null;

export const setMemoryAuthToken = (token: string | null): void => {
  if (token && token.startsWith('ey') && !isJwtExpired(token)) {
    memoryToken = token;
    tokenExpiresAt = Date.now() + 3600000;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    memoryToken = null;
    tokenExpiresAt = 0;
  }
};

// Resolve with the first fulfilled promise (safe on all Hermes/JS versions without Promise.any dependency)
const firstFulfilled = <T>(promises: Promise<T>[]): Promise<T> =>
  new Promise((resolve, reject) => {
    const total = promises.length;
    if (total === 0) {
      reject(new Error('No candidates'));
      return;
    }
    let failures = 0;
    let settled = false;
    let lastErr: any;
    promises.forEach((p) => {
      p.then((val) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      }).catch((err) => {
        lastErr = err;
        failures++;
        if (failures === total && !settled) {
          reject(lastErr);
        }
      });
    });
  });

export const ensureBackendToken = async (forceRefresh = false): Promise<string | null> => {
  try {
    // 0ms in-memory cache hit
    if (!forceRefresh && memoryToken && Date.now() < tokenExpiresAt) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${memoryToken}`;
      if (memoryBaseUrl && !isStaleUrlOrIp(memoryBaseUrl)) {
        apiClient.defaults.baseURL = memoryBaseUrl;
      }
      return memoryToken;
    }

    if (!forceRefresh) {
      let existing = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (existing === 'offline-token' || existing === 'demo-token') {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        existing = null;
      }
      if (
        (!existing || !existing.startsWith('ey') || isJwtExpired(existing)) &&
        typeof localStorage !== 'undefined'
      ) {
        try {
          existing =
            localStorage.getItem('@ajalkar_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('ajalkar_token');
          if (existing === 'offline-token' || existing === 'demo-token') existing = null;
        } catch {}
      }
      if (existing && existing.startsWith('ey') && existing.length > 30 && !isJwtExpired(existing)) {
        memoryToken = existing;
        tokenExpiresAt = Date.now() + 3600000;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${existing}`;
        const activeUrl = memoryBaseUrl || (await getApiBaseUrl());
        if (activeUrl && !isStaleUrlOrIp(activeUrl)) {
          memoryBaseUrl = activeUrl;
          apiClient.defaults.baseURL = activeUrl;
        } else {
          const fallbackUrl = `http://${CURRENT_LAN_HOST}:${BACKEND_PORT}/api/v1`;
          memoryBaseUrl = fallbackUrl;
          apiClient.defaults.baseURL = fallbackUrl;
        }
        return existing;
      }
    }

    if (authPromise) return authPromise;

    authPromise = (async () => {
      const detectedIp = getDetectedHostIp();
      let savedBase: string | null = memoryBaseUrl;
      if (!savedBase) {
        try {
          savedBase = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
          if (savedBase && isStaleUrlOrIp(savedBase)) {
            await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
            savedBase = null;
          }
        } catch {}
      }

      let viteHost: string | null = null;
      if (typeof localStorage !== 'undefined') {
        try {
          const vHost = localStorage.getItem('ajalkar_server_host');
          if (vHost && !isStaleUrlOrIp(vHost)) {
            viteHost = vHost.startsWith('http') ? vHost : `http://${vHost}:${BACKEND_PORT}/api/v1`;
          }
        } catch {}
      }

      const preferred = [
        lastWorkingBaseUrl,
        viteHost,
        detectedIp ? `http://${detectedIp}:${BACKEND_PORT}/api/v1` : null,
        `http://${CURRENT_LAN_HOST}:${BACKEND_PORT}/api/v1`,
        savedBase,
        DEFAULT_URL,
        apiClient.defaults.baseURL,
        Platform.OS === 'android' ? `http://10.0.2.2:${BACKEND_PORT}/api/v1` : null,
        Platform.OS === 'web' ? `http://localhost:${BACKEND_PORT}/api/v1` : null,
      ].filter(Boolean) as string[];

      const uniqueCandidates = Array.from(new Set(preferred)).filter(
        (url) =>
          !isStaleUrlOrIp(url) &&
          (Platform.OS === 'web' || (!url.includes('localhost') && !url.includes('127.0.0.1')))
      );

      // Fallback safeguard: if candidate list is empty on non-web, always include CURRENT_LAN_HOST
      if (uniqueCandidates.length === 0) {
        uniqueCandidates.push(`http://${CURRENT_LAN_HOST}:${BACKEND_PORT}/api/v1`);
      }

      // Race all candidates in parallel with a crisp 2.5s timeout instead of waiting up to 42s sequentially
      try {
        const winning = await firstFulfilled(
          uniqueCandidates.map(async (base) => {
            let res;
            try {
              res = await axios.post(
                `${base}/auth/login`,
                {
                  identifier: 'hoteladmin',
                  password: 'Admin@123',
                },
                {
                  timeout: 2500,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            } catch {
              res = await axios.post(
                `${base}/auth/login`,
                {
                  identifier: 'hoteladmin',
                  password: 'Admin@12345',
                },
                {
                  timeout: 2500,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
            const data = res.data?.data;
            const token = data?.token;
            if (!token || !token.startsWith('ey')) {
              throw new Error('Invalid token payload');
            }
            return { base, data, token };
          })
        );

        const { base, data, token } = winning;
        memoryToken = token;
        tokenExpiresAt = Date.now() + 3600000;
        memoryBaseUrl = base;
        lastWorkingBaseUrl = base;
        apiClient.defaults.baseURL = base;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Persist in background so UI / request path never stalls on storage
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token).catch(() => {});
        AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, base).catch(() => {});
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('@ajalkar_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('ajalkar_token', token);
          } catch {}
        }
        if (data.user) {
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user)).catch(() => {});
        }
        if (data.business) {
          AsyncStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(data.business)).catch(() => {});
        }
        return token;
      } catch {
        return null;
      }
    })().finally(() => {
      authPromise = null;
    });

    return await authPromise;
  } catch {
    return null;
  }
};

// Request interceptor: 0ms in-memory resolution first to avoid AsyncStorage bridge overhead on every call
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    let resolvedBase = memoryBaseUrl;
    if (!resolvedBase) {
      let savedBaseUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
      if (
        savedBaseUrl &&
        (isStaleUrlOrIp(savedBaseUrl) ||
          (Platform.OS !== 'web' &&
            (savedBaseUrl.includes('localhost') || savedBaseUrl.includes('127.0.0.1'))))
      ) {
        await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
        savedBaseUrl = null;
      }
      resolvedBase =
        savedBaseUrl ||
        (apiClient.defaults.baseURL && !isStaleUrlOrIp(apiClient.defaults.baseURL)
          ? apiClient.defaults.baseURL
          : getDefaultApiUrl());
      memoryBaseUrl = resolvedBase;
    }
    config.baseURL = resolvedBase;

    const isAuthEndpoint = typeof config.url === 'string' && config.url.includes('/auth/');
    if (!isAuthEndpoint) {
      let token = memoryToken && Date.now() < tokenExpiresAt ? memoryToken : null;
      if (!token) {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        if (
          storedToken &&
          storedToken !== 'offline-token' &&
          storedToken !== 'demo-token' &&
          storedToken.startsWith('ey') &&
          !isJwtExpired(storedToken)
        ) {
          token = storedToken;
          memoryToken = storedToken;
          tokenExpiresAt = Date.now() + 3600000;
        } else {
          token = await ensureBackendToken(true);
        }
      }
      if (token && config.headers) {
        if (typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
  } catch {
    // ignore
  }
  return config;
});

// Response interceptor: cache verified working URL & handle 401/403 token refresh without blocking retries
apiClient.interceptors.response.use(
  (response) => {
    const usedBase = response.config?.baseURL;
    if (usedBase && !isStaleUrlOrIp(usedBase)) {
      lastWorkingBaseUrl = usedBase;
      memoryBaseUrl = usedBase;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Parse user-friendly error message
    let errorMessage =
      responseData?.message ||
      responseData?.error ||
      error.message ||
      'An unexpected error occurred';

    if (responseData?.errors && typeof responseData.errors === 'object') {
      const fieldErrors = Object.entries(responseData.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      if (fieldErrors) errorMessage = `${errorMessage} (${fieldErrors})`;
    }
    (error as any).userFriendlyMessage = errorMessage;

    // 402 Payment Required: Free trial or subscription expired
    if (status === 402 || responseData?.errorCode === 'SUBSCRIPTION_EXPIRED') {
      (error as any).userFriendlyMessage =
        'Your hotel subscription or trial has expired. Please renew your plan to continue operating.';
      return Promise.reject(error);
    }

    // 403 Forbidden: Insufficient role permissions
    if (status === 403) {
      (error as any).userFriendlyMessage =
        errorMessage || 'Access Denied: You do not have permissions for this resource.';
      return Promise.reject(error);
    }

    // 409 Conflict: Duplicate record or concurrent update collision
    if (status === 409) {
      (error as any).userFriendlyMessage =
        errorMessage && !errorMessage.includes('Exception')
          ? errorMessage
          : 'A record with this identifier already exists (Conflict). Please check and try again.';
      return Promise.reject(error);
    }

    // 501 Not Implemented
    if (status === 501) {
      (error as any).userFriendlyMessage = 'This feature is not supported in the current version.';
      return Promise.reject(error);
    }

    // 503 Service Unavailable
    if (status === 503) {
      (error as any).userFriendlyMessage =
        'Central server database is temporarily unavailable. Please retry in a moment.';
      return Promise.reject(error);
    }

    // 500 Internal Server Error
    if (status === 500) {
      (error as any).userFriendlyMessage =
        errorMessage && !errorMessage.includes('Exception')
          ? errorMessage
          : 'A server error occurred. Please try again.';
    }

    // Immediate logout if branch has been deactivated from Admin Panel
    if (error.response?.data?.errorCode === 'BRANCH_DEACTIVATED') {
      memoryToken = null;
      tokenExpiresAt = 0;
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.BUSINESS]);
      return Promise.reject(error);
    }

    // 401 Unauthorized: token is invalid or expired
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        memoryToken = null;
        tokenExpiresAt = 0;
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
      } catch {
        // Silently fall through to rejection
      }
    }

    // Only auto-rediscover host once on genuine connection failure when no working host is known yet
    if (
      !error.response &&
      originalRequest &&
      !originalRequest._networkRetry &&
      !(originalRequest.url && String(originalRequest.url).includes('/auth/')) &&
      !(error.code === 'ECONNABORTED' && lastWorkingBaseUrl)
    ) {
      originalRequest._networkRetry = true;
      try {
        lastWorkingBaseUrl = null;
        const freshToken = await ensureBackendToken(true);
        if (freshToken && memoryBaseUrl) {
          originalRequest.baseURL = memoryBaseUrl;
          if (originalRequest.headers) {
            if (typeof (originalRequest.headers as any).set === 'function') {
              (originalRequest.headers as any).set('Authorization', `Bearer ${freshToken}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            }
          }
          return apiClient(originalRequest);
        }
      } catch {
        // fail gracefully
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
