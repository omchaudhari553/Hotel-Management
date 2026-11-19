import api, { ApiResponse } from './api';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  branchId?: number | null;
  branchName?: string | null;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (date?: string): Promise<AppNotification[]> => {
    try {
      const url = date && date !== 'ALL' ? `/hotel/notifications?date=${encodeURIComponent(date)}` : '/hotel/notifications';
      const response = await api.get<ApiResponse<AppNotification[]>>(url);
      return response.data?.data || [];
    } catch (err) {
      console.warn('Failed to fetch notifications from backend:', err);
      return [];
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>('/hotel/notifications/unread-count');
      return Number(response.data?.data?.count || 0);
    } catch {
      return 0;
    }
  },

  markAsRead: async (id: number): Promise<void> => {
    try {
      await api.patch<ApiResponse<any>>(`/hotel/notifications/${id}/read`);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await api.patch<ApiResponse<any>>('/hotel/notifications/read-all');
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  },

  createNotification: async (payload: {
    type: string;
    title: string;
    message: string;
    branchId?: number;
  }): Promise<AppNotification | null> => {
    try {
      const response = await api.post<ApiResponse<AppNotification>>('/hotel/notifications', payload);
      return response.data?.data || null;
    } catch (err) {
      console.warn('Failed to create notification:', err);
      return null;
    }
  },
};

export default notificationService;
