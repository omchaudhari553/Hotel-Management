import api, { ApiResponse } from './api';

export interface Staff {
  id: number;
  name: string;
  phone: string;
  address: string;
  designation: string;
  department?: string;
  joiningDate: string;
  idProofType?: string;
  idProofNumber?: string;
  basicSalary: number;
  salaryFrequency: string;
  allowance?: number;
  deduction?: number;
  branchId?: number;
  outletId?: number;
  status?: string;
  active?: boolean;
}

export interface StaffAttendance {
  id?: number;
  staffId: number;
  staffName?: string;
  staffCode?: string;
  designation?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | string;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
  remarks?: string;
}

export interface AttendanceSummary {
  date: string;
  totalStaff: number;
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  unmarked: number;
}

export const staffService = {
  getStaff: async (branchId?: number): Promise<Staff[]> => {
    const response = await api.get<ApiResponse<Staff[]>>('/hotel/staff', {
      params: branchId != null ? { branchId } : undefined
    });
    return response.data.data || [];
  },

  getStaffById: async (id: number): Promise<Staff> => {
    const response = await api.get<ApiResponse<Staff>>(`/hotel/staff/${id}`);
    return response.data.data;
  },

  createStaff: async (staff: Partial<Staff>): Promise<Staff> => {
    let joiningDate = staff.joiningDate || new Date().toISOString().split('T')[0];
    if (typeof joiningDate === 'string' && /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(joiningDate.trim())) {
      const parts = joiningDate.trim().split(/[-/]/);
      joiningDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const body = {
      name: staff.name,
      phone: staff.phone,
      address: staff.address || 'Address',
      designation: staff.designation || 'Staff',
      joiningDate,
      idProofType: staff.idProofType || 'AADHAAR',
      idProofNumber: staff.idProofNumber || '',
      basicSalary: Number(staff.basicSalary) || 15000,
      salaryFrequency: staff.salaryFrequency || 'MONTHLY',
      allowance: Number(staff.allowance) || 0,
      deduction: Number(staff.deduction) || 0,
      branchId: staff.branchId || 1,
      outletId: staff.outletId || null,
      active: staff.active !== false,
    };

    const response = await api.post<ApiResponse<Staff>>('/hotel/staff', body);
    return response.data.data;
  },

  updateStaff: async (id: number, staff: Partial<Staff>): Promise<Staff> => {
    const body = {
      name: staff.name,
      phone: staff.phone,
      address: staff.address || 'Address',
      designation: staff.designation || 'Staff',
      joiningDate: staff.joiningDate || new Date().toISOString().split('T')[0],
      idProofType: staff.idProofType || 'AADHAAR',
      idProofNumber: staff.idProofNumber || '',
      basicSalary: Number(staff.basicSalary) || 15000,
      salaryFrequency: staff.salaryFrequency || 'MONTHLY',
      allowance: Number(staff.allowance) || 0,
      deduction: Number(staff.deduction) || 0,
      branchId: staff.branchId || 1,
      outletId: staff.outletId || null,
      active: staff.active !== false,
    };

    const response = await api.put<ApiResponse<Staff>>(`/hotel/staff/${id}`, body);
    return response.data.data;
  },

  deleteStaff: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/staff/${id}`);
  },

  // Attendance
  getAttendance: async (params?: { date?: string; staffId?: number; status?: string }): Promise<StaffAttendance[]> => {
    const response = await api.get<ApiResponse<StaffAttendance[]>>('/hotel/staff/attendance', { params });
    return response.data.data || [];
  },

  getAttendanceSummary: async (date?: string): Promise<AttendanceSummary> => {
    const response = await api.get<ApiResponse<AttendanceSummary>>('/hotel/staff/attendance/summary', {
      params: date ? { date } : undefined
    });
    return response.data.data;
  },

  saveAttendance: async (payload: {
    staffId: number;
    date: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    workingHours?: number;
    remarks?: string;
  }): Promise<StaffAttendance> => {
    const body = {
      staffId: Number(payload.staffId),
      date: payload.date || new Date().toISOString().split('T')[0],
      status: payload.status || 'PRESENT',
      checkInTime: payload.checkInTime || undefined,
      checkOutTime: payload.checkOutTime || undefined,
      workingHours: payload.workingHours != null ? Number(payload.workingHours) : undefined,
      remarks: payload.remarks || undefined,
    };
    const response = await api.post<ApiResponse<StaffAttendance>>('/hotel/staff/attendance', body);
    return response.data.data;
  },
};

export default staffService;
