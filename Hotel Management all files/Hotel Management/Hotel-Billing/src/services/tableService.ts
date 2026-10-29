import api, { ApiResponse } from './api';
import { CafeTable } from '../types';

export interface TableItem {
  id: number;
  businessId?: number;
  branchId?: number;
  name: string;
  capacity: number;
  area: string;
  floorName?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | string;
  guest?: string;
  guestCount?: number;
  note?: string;
  activeOrder?: any;
}

export const tableService = {
  getTables: async (params?: { branchId?: number } | number): Promise<TableItem[]> => {
    const branchId = typeof params === 'number' ? params : params?.branchId;
    const response = await api.get<ApiResponse<TableItem[]>>('/hotel/tables', {
      params: branchId != null ? { branchId } : undefined
    });
    return response.data.data || [];
  },

  getTableById: async (id: number): Promise<TableItem> => {
    const response = await api.get<ApiResponse<TableItem>>(`/hotel/tables/${id}`);
    return response.data.data;
  },

  createTable: async (payload: {
    branchId?: number;
    name: string;
    capacity: number;
    area: string;
    note?: string;
  }): Promise<TableItem> => {
    const body = {
      ...(payload.branchId != null ? { branchId: payload.branchId } : {}),
      name: payload.name,
      capacity: Number(payload.capacity) || 4,
      area: payload.area || 'MAIN_HALL',
      note: payload.note || '',
    };
    const response = await api.post<ApiResponse<TableItem>>('/hotel/tables', body);
    return response.data.data;
  },

  updateTable: async (
    id: number,
    payload: {
      branchId?: number;
      name: string;
      capacity: number;
      area: string;
      note?: string;
    }
  ): Promise<TableItem> => {
    const body = {
      ...(payload.branchId != null ? { branchId: payload.branchId } : {}),
      name: payload.name,
      capacity: Number(payload.capacity) || 4,
      area: payload.area || 'MAIN_HALL',
      note: payload.note || '',
    };
    const response = await api.put<ApiResponse<TableItem>>(`/hotel/tables/${id}`, body);
    return response.data.data;
  },

  updateTableStatus: async (id: number, status: string): Promise<TableItem> => {
    const response = await api.patch<ApiResponse<TableItem>>(`/hotel/tables/${id}/status`, { status });
    return response.data.data;
  },

  deleteTable: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/tables/${id}`);
  },
};

export default tableService;
