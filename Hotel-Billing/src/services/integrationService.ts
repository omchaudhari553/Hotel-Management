import api, { ApiResponse } from './api';

export type IntegrationPlatform = 'ZOMATO' | 'SWIGGY' | 'ONDC' | 'MAGICPIN';
export const INTEGRATION_PLATFORMS: IntegrationPlatform[] = ['ZOMATO', 'SWIGGY', 'ONDC', 'MAGICPIN'];
export const platformLabel = (p: string) => ({ ZOMATO: 'Zomato', SWIGGY: 'Swiggy', ONDC: 'ONDC', MAGICPIN: 'Magicpin' } as Record<string,string>)[p] || p;

export interface IntegrationConnection {
  id: number; platform: string; status: string; businessId: number; branchId: number; branchName?: string;
  externalAccountId?: string; externalOutletId?: string; externalOutletName?: string; apiBaseUrl?: string; authType?: string;
  testEndpoint?: string; confirmEndpoint?: string; readyEndpoint?: string; statusEndpoint?: string; hasCredentials?: boolean;
  lastSyncAt?: string; lastTestedAt?: string; lastError?: string;
}
export interface IntegrationPayload {
  platform: IntegrationPlatform; branchId: number; externalAccountId?: string; externalOutletId?: string; externalOutletName?: string;
  apiBaseUrl?: string; testEndpoint?: string; confirmEndpoint?: string; readyEndpoint?: string; statusEndpoint?: string;
  authType?: string; apiKey?: string; apiSecret?: string; scopes?: string;
}
const connect = async (payload: IntegrationPayload): Promise<IntegrationConnection> => {
  const r = await api.post<ApiResponse<IntegrationConnection>>('/integrations/connect', payload); return r.data.data;
};
const webhookPath = (p: string) => p.toLowerCase();
export const integrationService = {
  createTestOrder: async (payload: { platform: string; branchId: number; customerName?: string; customerPhone?: string; address?: string; itemName?: string; quantity?: number; unitPrice?: number }) => {
    const response = await api.post<ApiResponse<any>>('/integrations/test-orders', payload);
    return response.data.data;
  },

  getConnections: async (): Promise<IntegrationConnection[]> => (await api.get<ApiResponse<IntegrationConnection[]>>('/integrations')).data.data || [],
  connect,
  connectZomato: (payload: Omit<IntegrationPayload,'platform'>) => connect({ ...payload, platform: 'ZOMATO' }),
  connectSwiggy: (payload: Omit<IntegrationPayload,'platform'>) => connect({ ...payload, platform: 'SWIGGY' }),
  connectOndc: (payload: Omit<IntegrationPayload,'platform'>) => connect({ ...payload, platform: 'ONDC' }),
  connectMagicpin: (payload: Omit<IntegrationPayload,'platform'>) => connect({ ...payload, platform: 'MAGICPIN' }),
  test: async (id: number): Promise<IntegrationConnection> => (await api.post<ApiResponse<IntegrationConnection>>(`/integrations/${id}/test`)).data.data,
  activate: async (id: number): Promise<IntegrationConnection> => (await api.post<ApiResponse<IntegrationConnection>>(`/integrations/${id}/activate`)).data.data,
  disconnect: async (id: number): Promise<IntegrationConnection> => (await api.post<ApiResponse<IntegrationConnection>>(`/integrations/${id}/disconnect`)).data.data,
  reconnect: async (id: number): Promise<IntegrationConnection> => (await api.post<ApiResponse<IntegrationConnection>>(`/integrations/${id}/reconnect`)).data.data,
  syncMenu: async (id: number): Promise<any> => (await api.post<ApiResponse<any>>(`/integrations/${id}/sync-menu`)).data.data,
  getMenuMappings: async (id: number): Promise<any[]> => (await api.get<ApiResponse<any[]>>(`/integrations/${id}/menu-mappings`)).data.data || [],
  saveMenuMapping: async (id: number, payload: { menuItemId: number; externalItemId: string; externalItemName?: string }): Promise<any> => (await api.post<ApiResponse<any>>(`/integrations/${id}/menu-mappings`, payload)).data.data,
  getWebhookLogs: async (platform: IntegrationPlatform = 'ZOMATO'): Promise<any[]> => (await api.get<ApiResponse<any[]>>(`/integrations/webhook-logs?platform=${platform}`)).data.data || [],
  sendOrderStatus: async (orderId: number, action: 'CONFIRM'|'READY'|'STATUS'): Promise<any> => (await api.post<ApiResponse<any>>(`/integrations/orders/${orderId}/${action}`)).data.data,
  webhookPath
};
export default integrationService;
