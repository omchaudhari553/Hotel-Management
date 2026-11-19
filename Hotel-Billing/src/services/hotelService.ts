import api, { ApiResponse } from './api';
import { HotelRoom, HotelBooking, HotelGuest, HotelServiceItem } from '../types';

export const hotelService = {
  // Rooms
  getRooms: async (businessId = 1, status?: string): Promise<HotelRoom[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (status && status !== 'ALL') params.status = status;

    const response = await api.get<ApiResponse<HotelRoom[]>>('/hotel/rooms', { params });
    return response.data.data || [];
  },

  getRoomById: async (id: number): Promise<HotelRoom> => {
    const response = await api.get<ApiResponse<HotelRoom>>(`/hotel/rooms/${id}`);
    return response.data.data;
  },

  createRoom: async (room: Partial<HotelRoom>): Promise<HotelRoom> => {
    const body = {
      branchId: (room as any).branchId || 1,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor || '1',
      basePricePerNight: Number(room.basePricePerNight) || 1000,
      maxOccupancy: Number(room.maxOccupancy) || 2,
      amenities: room.amenities || '',
    };

    const response = await api.post<ApiResponse<HotelRoom>>('/hotel/rooms', body);
    return response.data.data;
  },

  updateRoom: async (id: number, room: Partial<HotelRoom>): Promise<HotelRoom> => {
    const body = {
      branchId: (room as any).branchId || 1,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor || '1',
      basePricePerNight: Number(room.basePricePerNight) || 1000,
      maxOccupancy: Number(room.maxOccupancy) || 2,
      amenities: room.amenities || '',
    };

    const response = await api.put<ApiResponse<HotelRoom>>(`/hotel/rooms/${id}`, body);
    return response.data.data;
  },

  updateRoomStatus: async (id: number, status: string): Promise<HotelRoom> => {
    const response = await api.patch<ApiResponse<HotelRoom>>(`/hotel/rooms/${id}/status`, { status });
    return response.data.data;
  },

  deleteRoom: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/rooms/${id}`);
  },

  // Bookings
  getBookings: async (businessId = 1, status?: string): Promise<HotelBooking[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (status && status !== 'ALL') params.status = status;

    const response = await api.get<ApiResponse<HotelBooking[]>>('/hotel/bookings', { params });
    return response.data.data || [];
  },

  getBookingById: async (id: number): Promise<HotelBooking> => {
    const response = await api.get<ApiResponse<HotelBooking>>(`/hotel/bookings/${id}`);
    return response.data.data;
  },

  createBooking: async (bookingData: any): Promise<HotelBooking> => {
    const body = {
      branchId: bookingData.branchId || 1,
      roomId: Number(bookingData.roomId),
      guestId: bookingData.guestId || null,
      guestName: bookingData.guestName,
      guestPhone: bookingData.guestPhone,
      guestEmail: bookingData.guestEmail || '',
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      notes: bookingData.notes || '',
    };

    const response = await api.post<ApiResponse<HotelBooking>>('/hotel/bookings', body);
    return response.data.data;
  },

  updateBooking: async (id: number, bookingData: any): Promise<HotelBooking> => {
    const body = {
      branchId: bookingData.branchId || 1,
      roomId: Number(bookingData.roomId),
      guestId: bookingData.guestId || null,
      guestName: bookingData.guestName,
      guestPhone: bookingData.guestPhone,
      guestEmail: bookingData.guestEmail || '',
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      notes: bookingData.notes || '',
    };

    const response = await api.put<ApiResponse<HotelBooking>>(`/hotel/bookings/${id}`, body);
    return response.data.data;
  },

  updateBookingStatus: async (id: number, status: string): Promise<HotelBooking> => {
    const response = await api.patch<ApiResponse<HotelBooking>>(`/hotel/bookings/${id}/status`, { status });
    return response.data.data;
  },

  deleteBooking: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/bookings/${id}`);
  },

  addService: async (serviceData: Partial<HotelServiceItem>): Promise<HotelServiceItem> => {
    const bookingId = serviceData.bookingId;
    const body = {
      serviceName: serviceData.serviceName,
      quantity: Number(serviceData.quantity) || 1,
      unitPrice: Number(serviceData.unitPrice) || 0,
      serviceTime: serviceData.serviceTime || new Date().toISOString(),
      status: serviceData.status || 'CONFIRMED',
    };

    const response = await api.post<ApiResponse<HotelServiceItem>>(`/hotel/bookings/${bookingId}/services`, body);
    return response.data.data;
  },

  // Guests
  getGuests: async (businessId = 1): Promise<HotelGuest[]> => {
    const response = await api.get<ApiResponse<HotelGuest[]>>('/hotel/guests', {
      params: { businessId },
    });
    return response.data.data || [];
  },

  getGuestById: async (id: number): Promise<HotelGuest> => {
    const response = await api.get<ApiResponse<HotelGuest>>(`/hotel/guests/${id}`);
    return response.data.data;
  },

  createGuest: async (guest: Partial<HotelGuest>): Promise<HotelGuest> => {
    const body = {
      fullName: guest.fullName,
      phone: guest.phone,
      email: guest.email || '',
      idProofType: guest.idProofType || 'AADHAAR',
      idProofNumber: guest.idProofNumber || '',
      address: guest.address || '',
      branchId: (guest as any).branchId || 1,
    };

    const response = await api.post<ApiResponse<HotelGuest>>('/hotel/guests', body);
    return response.data.data;
  },

  updateGuest: async (id: number, guest: Partial<HotelGuest>): Promise<HotelGuest> => {
    const body = {
      fullName: guest.fullName,
      phone: guest.phone,
      email: guest.email || '',
      idProofType: guest.idProofType || 'AADHAAR',
      idProofNumber: guest.idProofNumber || '',
      address: guest.address || '',
      branchId: (guest as any).branchId || 1,
    };

    const response = await api.put<ApiResponse<HotelGuest>>(`/hotel/guests/${id}`, body);
    return response.data.data;
  },

  deleteGuest: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/guests/${id}`);
  },
};

export default hotelService;
