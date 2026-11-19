import React, { useState, useEffect } from 'react';
import { messService } from '../services/messService';
import { MessCustomer, MessOrder } from '../types';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Truck, Check, Navigation, MapPin, Phone } from 'lucide-react';

export const TiffinDispatch: React.FC = () => {
  const [tiffinCustomers, setTiffinCustomers] = useState<MessCustomer[]>([]);
  const [orders, setOrders] = useState<MessOrder[]>([]);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [custData, ordersData] = await Promise.all([
        messService.getCustomers(1, 'ACTIVE', true),
        messService.getOrders(1),
      ]);
      setTiffinCustomers(Array.isArray(custData) ? custData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch {
      showToast('error', 'Failed to load tiffin dispatch details');
      setTiffinCustomers([]);
      setOrders([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateDelivery = async (orderId: number, status: string) => {
    try {
      await messService.updateOrderStatus(orderId, status);
      showToast('success', `Tiffin marked as ${status}`);
      loadData();
    } catch {
      showToast('error', 'Failed to update delivery status');
    }
  };

  const columns = [
    {
      header: 'Customer',
      render: (row: MessCustomer) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.fullName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Phone size={11} /> {row.phone}
          </div>
        </div>
      ),
    },
    {
      header: 'Meal Slot',
      render: (row: MessCustomer) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: '#F7FEE7',
            color: '#4D7C0F',
            border: '1px solid #E7E5E4',
          }}
        >
          {row.tiffinSlot || 'LUNCH_ONLY'}
        </span>
      ),
    },
    {
      header: 'Delivery Address & Route',
      render: (row: MessCustomer) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.84rem' }}>
          <MapPin size={14} color="#4D7C0F" style={{ marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontWeight: 500, color: '#1C1917' }}>{row.deliveryAddress || 'Address on file'}</span>
        </div>
      ),
    },
    {
      header: 'Meals Left',
      render: (row: MessCustomer) => (
        <span style={{ fontWeight: 700, color: row.remainingMeals < 5 ? '#DC2626' : '#16A34A' }}>{row.remainingMeals}</span>
      ),
    },
    {
      header: 'Status',
      render: (row: MessCustomer) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917' }}>Tiffin Dispatch & Delivery Route</h1>
          <p style={{ color: '#57534E', fontSize: '0.9rem', marginTop: '2px' }}>
            Daily lunchbox deliveries to IT parks, colleges, and residential addresses
          </p>
        </div>
      </div>

      {/* Route Summary */}
      <div className="grid-3">
        <div className="card" style={{ borderLeft: '4px solid #4D7C0F', border: '1px solid #E7E5E4', borderLeftWidth: '4px', backgroundColor: '#FFFFFF' }}>
          <span style={{ fontSize: '0.75rem', color: '#57534E', fontWeight: 700, textTransform: 'uppercase' }}>Active Tiffin Members</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#4D7C0F' }}>{tiffinCustomers.length}</h3>
          <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>Daily packaging active</span>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #4D7C0F', border: '1px solid #E7E5E4', borderLeftWidth: '4px', backgroundColor: '#FFFFFF' }}>
          <span style={{ fontSize: '0.75rem', color: '#57534E', fontWeight: 700, textTransform: 'uppercase' }}>Morning Dispatch Window</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#4D7C0F' }}>11:30 AM - 1:00 PM</h3>
          <span style={{ fontSize: '0.8rem', color: '#57534E', fontWeight: 500 }}>Corporate Lunch Routes</span>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #16A34A', border: '1px solid #E7E5E4', borderLeftWidth: '4px', backgroundColor: '#FFFFFF' }}>
          <span style={{ fontSize: '0.75rem', color: '#57534E', fontWeight: 700, textTransform: 'uppercase' }}>Evening Dispatch Window</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#1C1917' }}>7:30 PM - 9:00 PM</h3>
          <span style={{ fontSize: '0.8rem', color: '#57534E', fontWeight: 500 }}>Residential Dinner Routes</span>
        </div>
      </div>

      <div className="card" style={{ border: '1px solid #E7E5E4', backgroundColor: '#FFFFFF' }}>
        <DataTable
          columns={columns}
          data={tiffinCustomers}
          searchKey="fullName"
          searchPlaceholder="Search delivery customer..."
        />
      </div>
    </div>
  );
};
