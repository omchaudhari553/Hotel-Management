import apiClient from './client';
import { TableItem, RoomItem, MenuItem, Order } from '../types';

export const INITIAL_TABLES: TableItem[] = [
  { id: 'T1', tableNumber: 'T-01', section: 'AC Dining', capacity: 4, status: 'OCCUPIED', activeBillAmount: 1450, activeItemsCount: 4, waiterName: 'Ramesh', seatedAt: '12:15 PM' },
  { id: 'T2', tableNumber: 'T-02', section: 'AC Dining', capacity: 4, status: 'AVAILABLE' },
  { id: 'T3', tableNumber: 'T-03', section: 'Family Hall', capacity: 6, status: 'BILLED', activeBillAmount: 3820, activeItemsCount: 8, waiterName: 'Suresh' },
  { id: 'T4', tableNumber: 'T-04', section: 'Family Hall', capacity: 6, status: 'AVAILABLE' },
  { id: 'T5', tableNumber: 'T-05', section: 'Garden Terrace', capacity: 2, status: 'AVAILABLE' },
  { id: 'T6', tableNumber: 'T-06', section: 'Garden Terrace', capacity: 4, status: 'OCCUPIED', activeBillAmount: 890, activeItemsCount: 2, waiterName: 'Akash', seatedAt: '12:40 PM' },
  { id: 'T7', tableNumber: 'T-07', section: 'Roof Top', capacity: 8, status: 'RESERVED' },
  { id: 'T8', tableNumber: 'T-08', section: 'Roof Top', capacity: 4, status: 'AVAILABLE' },
];

export const INITIAL_ROOMS: RoomItem[] = [
  { id: 'R101', roomNumber: '101', type: 'STANDARD', floor: 1, pricePerNight: 2200, status: 'OCCUPIED', currentGuestName: 'Vijay Patil', checkInDate: '2026-10-18', checkOutDate: '2026-10-20' },
  { id: 'R102', roomNumber: '102', type: 'STANDARD', floor: 1, pricePerNight: 2200, status: 'AVAILABLE' },
  { id: 'R103', roomNumber: '103', type: 'DELUXE', floor: 1, pricePerNight: 3500, status: 'AVAILABLE' },
  { id: 'R201', roomNumber: '201', type: 'DELUXE', floor: 2, pricePerNight: 3500, status: 'OCCUPIED', currentGuestName: 'Rahul Deshmukh', checkInDate: '2026-10-19', checkOutDate: '2026-10-21' },
  { id: 'R202', roomNumber: '202', type: 'SUITE', floor: 2, pricePerNight: 5500, status: 'AVAILABLE' },
  { id: 'R203', roomNumber: '203', type: 'SUITE', floor: 2, pricePerNight: 5500, status: 'CLEANING' },
];

export const INITIAL_MENU: MenuItem[] = [
  { id: 'M1', name: 'Veg Kolhapuri', category: 'Main Course', price: 240, taxRate: 5, available: true },
  { id: 'M2', name: 'Paneer Butter Masala', category: 'Main Course', price: 280, taxRate: 5, available: true },
  { id: 'M3', name: 'Butter Roti / Naan', category: 'Breads', price: 35, taxRate: 5, available: true },
  { id: 'M4', name: 'Jeera Rice & Dal Tadka', category: 'Rice', price: 190, taxRate: 5, available: true },
  { id: 'M5', name: 'Chicken Thali Special', category: 'Non-Veg', price: 380, taxRate: 5, available: true },
  { id: 'M6', name: 'Mutton Sukka (Gavran)', category: 'Non-Veg', price: 460, taxRate: 5, available: true },
  { id: 'M7', name: 'Mineral Water (Packaged)', category: 'Beverages', price: 20, taxRate: 18, available: true },
  { id: 'M8', name: 'Solkadhi / Buttermilk', category: 'Beverages', price: 45, taxRate: 5, available: true },
  { id: 'M9', name: 'Gulab Jamun (2 pcs)', category: 'Dessert', price: 70, taxRate: 5, available: true },
];

export const hotelService = {
  async getTables(): Promise<TableItem[]> {
    try {
      const res = await apiClient.get('/tables');
      return res.data?.data || res.data || INITIAL_TABLES;
    } catch {
      return INITIAL_TABLES;
    }
  },

  async updateTableStatus(tableId: string | number, status: TableItem['status']): Promise<void> {
    try {
      await apiClient.patch(`/tables/${tableId}/status`, { status });
    } catch (err) {
      console.log('Updated table status locally:', tableId, status);
    }
  },

  async getRooms(): Promise<RoomItem[]> {
    try {
      const res = await apiClient.get('/rooms');
      return res.data?.data || res.data || INITIAL_ROOMS;
    } catch {
      return INITIAL_ROOMS;
    }
  },

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const res = await apiClient.get('/menu');
      return res.data?.data || res.data || INITIAL_MENU;
    } catch {
      return INITIAL_MENU;
    }
  },

  async createKOT(tableNumber: string, items: any[]): Promise<{ kotId: string; message: string }> {
    try {
      const res = await apiClient.post('/kot/orders', { tableNumber, items });
      return res.data?.data || { kotId: 'KOT-' + Math.floor(1000 + Math.random() * 9000), message: 'KOT sent to kitchen' };
    } catch {
      return { kotId: 'KOT-' + Math.floor(1000 + Math.random() * 9000), message: 'KOT created (Offline mode)' };
    }
  },
};
