import api, { ApiResponse } from './api';

export interface ExpenseItem {
  id: number;
  branchId?: number;
  name: string;
  category: string;
  amount: number;
  date: string;
  paymentMode?: string;
  description?: string;
  branchCode?: string;
  createdAt?: string;
}

export interface ExpensePayload {
  branchId?: number;
  name: string;
  category: string;
  amount: number;
  date?: string;
  paymentMode?: string;
  description?: string;
  branchCode?: string;
}

export const expenseService = {
  getExpenses: async (branchId?: number): Promise<ExpenseItem[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<ApiResponse<ExpenseItem[]>>('/hotel/expenses', { params });
    return response.data.data || [];
  },

  getExpenseById: async (id: number): Promise<ExpenseItem> => {
    const response = await api.get<ApiResponse<ExpenseItem>>(`/hotel/expenses/${id}`);
    return response.data.data;
  },

  createExpense: async (payload: ExpensePayload): Promise<ExpenseItem> => {
    const body = {
      branchId: payload.branchId,
      name: payload.name,
      category: payload.category || 'GENERAL',
      amount: Number(payload.amount) || 0,
      date: payload.date || new Date().toISOString().split('T')[0],
      paymentMode: payload.paymentMode || 'CASH',
      description: payload.description || '',
      branchCode: payload.branchCode,
    };

    const response = await api.post<ApiResponse<ExpenseItem>>('/hotel/expenses', body);
    return response.data.data;
  },

  updateExpense: async (id: number, payload: ExpensePayload): Promise<ExpenseItem> => {
    const body = {
      branchId: payload.branchId,
      name: payload.name,
      category: payload.category || 'GENERAL',
      amount: Number(payload.amount) || 0,
      date: payload.date || new Date().toISOString().split('T')[0],
      paymentMode: payload.paymentMode || 'CASH',
      description: payload.description || '',
      branchCode: payload.branchCode,
    };

    const response = await api.put<ApiResponse<ExpenseItem>>(`/hotel/expenses/${id}`, body);
    return response.data.data;
  },

  deleteExpense: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/expenses/${id}`);
  },
};

export default expenseService;
