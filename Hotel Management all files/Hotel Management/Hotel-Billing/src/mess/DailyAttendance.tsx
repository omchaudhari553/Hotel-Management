import React, { useState, useEffect } from 'react';
import { messService } from '../services/messService';
import { MessCustomer, MessAttendance } from '../types';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Clock, Check, X, Truck, Calendar } from 'lucide-react';

export const DailyAttendance: React.FC = () => {
  const [customers, setCustomers] = useState<MessCustomer[]>([]);
  const [attendance, setAttendance] = useState<MessAttendance[]>([]);
  const [mealTime, setMealTime] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>('LUNCH');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [custData, attData] = await Promise.all([
        messService.getCustomers(1, 'ACTIVE'),
        messService.getAttendance(1, attendanceDate),
      ]);
      setCustomers(Array.isArray(custData) ? custData : []);
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch {
      showToast('error', 'Failed to load attendance logs');
      setCustomers([]);
      setAttendance([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [attendanceDate, mealTime]);

  const handleMark = async (customerId: number, status: 'PRESENT' | 'ABSENT' | 'PACKED_TIFFIN') => {
    try {
      await messService.markAttendance({
        customerId,
        mealTime,
        attendanceDate,
        status,
      });
      showToast('success', `Marked ${status} for ${mealTime}`);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const getAttendanceStatus = (customerId: number) => {
    const safeAtt = Array.isArray(attendance) ? attendance : [];
    const record = safeAtt.find(
      (a) => a && a.customerId === customerId && a.mealTime === mealTime
    );
    return record?.status;
  };

  const columns = [
    {
      header: 'Member / Student',
      render: (row: MessCustomer) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.fullName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.phone}</div>
        </div>
      ),
    },
    {
      header: 'Active Plan',
      accessor: 'planName' as keyof MessCustomer,
    },
    {
      header: 'Meals Remaining',
      render: (row: MessCustomer) => (
        <span style={{ fontWeight: 700, color: row.remainingMeals < 5 ? 'var(--danger)' : 'var(--text-main)' }}>
          {row.remainingMeals}
        </span>
      ),
    },
    {
      header: `Attendance (${mealTime})`,
      render: (row: MessCustomer) => {
        const st = getAttendanceStatus(row.id);
        return st ? <StatusBadge status={st} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not marked</span>;
      },
    },
    {
      header: 'Actions',
      render: (row: MessCustomer) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleMark(row.id, 'PRESENT')}
            className="btn btn-sm"
            style={{
              backgroundColor: '#F7FEE7',
              borderColor: '#E7E5E4',
              border: '1px solid #E7E5E4',
              color: '#4D7C0F',
              fontWeight: 700,
            }}
            title="Mark Dine-In Present"
          >
            <Check size={13} strokeWidth={3} color="#4D7C0F" />
            <span>Present</span>
          </button>
          <button
            onClick={() => handleMark(row.id, 'PACKED_TIFFIN')}
            className="btn btn-sm"
            style={{
              backgroundColor: '#F7FEE7',
              borderColor: '#E7E5E4',
              border: '1px solid #E7E5E4',
              color: '#4D7C0F',
              fontWeight: 700,
            }}
            title="Mark Tiffin Packed"
          >
            <Truck size={13} color="#4D7C0F" />
            <span>Tiffin</span>
          </button>
          <button
            onClick={() => handleMark(row.id, 'ABSENT')}
            className="btn btn-sm btn-outline"
            style={{ borderColor: '#FECACA', color: '#DC2626' }}
            title="Mark Absent"
          >
            <X size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917' }}>Daily Mess Meal Attendance</h1>
          <p style={{ color: '#57534E', fontSize: '0.9rem', marginTop: '2px' }}>
            Record biometric/card meal check-ins and debit remaining quota automatically
          </p>
        </div>

        {/* Date & Meal Selectors */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            className="input"
            style={{ width: 'auto', borderColor: '#E7E5E4', backgroundColor: '#FFFFFF', color: '#1C1917' }}
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />

          <div style={{ display: 'flex', background: '#F7FEE7', border: '1px solid #E7E5E4', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
            {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMealTime(m)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mealTime === m ? 'linear-gradient(135deg, #4D7C0F 0%, #65A30D 100%)' : 'transparent',
                  color: mealTime === m ? '#FFFFFF' : '#4D7C0F',
                  boxShadow: mealTime === m ? '0 2px 8px rgba(77, 124, 15, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ border: '1px solid #E7E5E4', backgroundColor: '#FFFFFF' }}>
        <DataTable
          columns={columns}
          data={customers}
          searchKey="fullName"
          searchPlaceholder="Search member name..."
        />
      </div>
    </div>
  );
};
