import api, { ApiResponse } from './api';

export interface SubscriptionStatusResponse {
  id: number;
  businessId: number;
  planId: number;
  planCode: string;
  planName: string;
  industryCode: string;
  tier: string;
  billingCycle: 'TRIAL' | 'MONTHLY' | 'ANNUAL';
  status: 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'ACTIVE' | 'EXPIRED' | 'PAYMENT_PENDING' | 'PAYMENT_FAILED';
  isTrial: boolean;
  isEligibleForTrial: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  displayStatus: string;
  licenseStatus: 'Active' | 'Expired';
  canOperate: boolean;
  autoRenew: boolean;
  lastPaymentId?: number | null;
  features: string[];
  monthlyPrice: number;
  annualPricePerMonth: number;
}

export interface PlanDto {
  id: number;
  planCode: string;
  name: string;
  industryCode: string;
  tier: string;
  monthlyPrice: number;
  annualPricePerMonth: number;
  trialDurationDays: number;
  features: string[];
  description: string;
  isPopular: boolean;
  isActive: boolean;
  taxRatePercent: number;
  monthlyTax: number;
  monthlyTotal: number;
  annualBase: number;
  annualTax: number;
  annualTotal: number;
}

export interface CreateOrderRequest {
  planId?: number;
  planCode?: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  paymentMethod?: string;
}

export interface OrderResponse {
  orderId: string;
  planId: number;
  planName: string;
  billingCycle: string;
  currency: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  keyId: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  isTestMode: boolean;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature?: string;
  paymentMethod?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  subscription: SubscriptionStatusResponse;
  payment: any;
}

export const subscriptionService = {
  getCurrentSubscription: async (): Promise<SubscriptionStatusResponse> => {
    const res = await api.get<ApiResponse<SubscriptionStatusResponse>>('/subscriptions/current');
    return res.data.data;
  },

  getAllPlans: async (industry: string = 'HOTEL'): Promise<PlanDto[]> => {
    const res = await api.get<ApiResponse<PlanDto[]>>(`/subscriptions/plans?industry=${industry}`);
    return res.data.data || [];
  },

  startFreeTrial: async (): Promise<SubscriptionStatusResponse> => {
    const res = await api.post<ApiResponse<SubscriptionStatusResponse>>('/subscriptions/trial/start');
    return res.data.data;
  },

  createPaymentOrder: async (req: CreateOrderRequest): Promise<OrderResponse> => {
    const res = await api.post<ApiResponse<OrderResponse>>('/subscriptions/create-order', req);
    return res.data.data;
  },

  verifyPayment: async (req: VerifyPaymentRequest): Promise<VerifyPaymentResponse> => {
    const res = await api.post<ApiResponse<VerifyPaymentResponse>>('/subscriptions/verify-payment', req);
    return res.data.data;
  },

  getPaymentHistory: async (): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/subscriptions/payments/history');
    return res.data.data || [];
  },
};

export default subscriptionService;
