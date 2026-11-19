import React, { useState, useMemo, useEffect } from 'react';
import { kotService } from '../services/kotService';
import {
  Clock,
  Volume2,
  VolumeX,
  Settings,
  Search,
  MoreVertical,
  CheckCircle,
  Utensils,
  Printer,
  ChevronDown,
  Flame,
  CheckCheck
} from 'lucide-react';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  variant?: string;
  image?: string;
}

export interface KOTCard {
  id: string;
  kotNo: string;
  table: string;
  type: 'Dine In' | 'Takeaway' | 'Delivery';
  time: string;
  minsAgo: number;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served';
  timer: string;
  priority?: 'High' | 'Medium' | 'Low';
  note?: string;
  items: OrderItem[];
  servedAt?: string;
  station?: string;
}

interface KitchenManagementProps {
  onNavigateSettings?: () => void;
}

const INITIAL_KOTS: KOTCard[] = [
  {
    id: '1',
    kotNo: '#K207',
    table: 'T4',
    type: 'Dine In',
    time: '11:42 AM',
    minsAgo: 2,
    status: 'Pending',
    priority: 'Medium',
    timer: '02:00',
    note: 'Note: No onion, extra cheese',
    station: 'Main Kitchen',
    items: [
      { id: 'i1', name: 'Paneer Tikka Sandwich', quantity: 1 },
      { id: 'i2', name: 'Hazelnut Cold Coffee', quantity: 1, variant: 'Medium, Less Sugar' }
    ]
  },
  {
    id: '2',
    kotNo: '#K208',
    table: 'T2',
    type: 'Dine In',
    time: '11:40 AM',
    minsAgo: 4,
    status: 'Pending',
    priority: 'High',
    timer: '04:00',
    station: 'Beverage Bar',
    items: [
      { id: 'i3', name: 'Cappuccino', quantity: 2, variant: '1- Regular, 1- Almond Milk' },
      { id: 'i4', name: 'Chocolate Brownie', quantity: 1 }
    ]
  },
  {
    id: '3',
    kotNo: '#K209',
    table: 'T6',
    type: 'Takeaway',
    time: '11:38 AM',
    minsAgo: 6,
    status: 'Pending',
    priority: 'Low',
    timer: '06:00',
    station: 'Beverage Bar',
    items: [
      { id: 'i5', name: 'Cold Brew', quantity: 1 },
      { id: 'i6', name: 'French Fries', quantity: 1 }
    ]
  },
  {
    id: '4',
    kotNo: '#K205',
    table: 'T1',
    type: 'Dine In',
    time: '11:36 AM',
    minsAgo: 8,
    status: 'Preparing',
    priority: 'Medium',
    timer: '08:00',
    station: 'Main Kitchen',
    items: [
      { id: 'i7', name: 'Masala Tea', quantity: 2 },
      { id: 'i8', name: 'Veg Burger', quantity: 1, variant: 'Extra Cheese' }
    ]
  },
  {
    id: '5',
    kotNo: '#K206',
    table: 'T3',
    type: 'Dine In',
    time: '11:34 AM',
    minsAgo: 10,
    status: 'Preparing',
    priority: 'High',
    timer: '10:00',
    station: 'Main Kitchen',
    items: [
      { id: 'i9', name: 'Club Sandwich', quantity: 1 },
      { id: 'i10', name: 'Iced Latte', quantity: 1, variant: 'Large' }
    ]
  },
  {
    id: '6',
    kotNo: '#K210',
    table: 'T8',
    type: 'Dine In',
    time: '11:32 AM',
    minsAgo: 12,
    status: 'Preparing',
    priority: 'Medium',
    timer: '12:00',
    station: 'Main Kitchen',
    items: [
      { id: 'i11', name: 'Chicken Pizza', quantity: 1, variant: 'Thin Crust' }
    ]
  },
  {
    id: '7',
    kotNo: '#K203',
    table: 'T5',
    type: 'Dine In',
    time: '11:29 AM',
    minsAgo: 15,
    status: 'Ready',
    priority: 'Low',
    timer: '15:00',
    station: 'Beverage Bar',
    items: [
      {
        id: 'i12',
        name: 'Hazelnut Cold Coffee',
        quantity: 1,
        variant: 'Large',
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=100&auto=format&fit=crop&q=60'
      },
      {
        id: 'i13',
        name: 'French Fries',
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=100&auto=format&fit=crop&q=60'
      }
    ]
  },
  {
    id: '8',
    kotNo: '#K204',
    table: 'T7',
    type: 'Dine In',
    time: '11:26 AM',
    minsAgo: 18,
    status: 'Ready',
    priority: 'Medium',
    timer: '18:00',
    station: 'Main Kitchen',
    items: [
      {
        id: 'i14',
        name: 'Cappuccino',
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=100&auto=format&fit=crop&q=60'
      },
      {
        id: 'i15',
        name: 'Donut',
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=100&auto=format&fit=crop&q=60'
      }
    ]
  },
  {
    id: '9',
    kotNo: '#K201',
    table: 'T9',
    type: 'Dine In',
    time: '11:19 AM',
    minsAgo: 25,
    status: 'Served',
    priority: 'Low',
    timer: '25:00',
    servedAt: '11:45 AM',
    station: 'Main Kitchen',
    items: [
      {
        id: 'i16',
        name: 'White Sauce Pasta',
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281288?w=100&auto=format&fit=crop&q=60'
      },
      {
        id: 'i17',
        name: 'Iced Latte',
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=100&auto=format&fit=crop&q=60'
      }
    ]
  }
];

export const KitchenManagement: React.FC<KitchenManagementProps> = ({ onNavigateSettings }) => {
  const [kots, setKots] = useState<KOTCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('All Stations');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('All Orders');
  
  // viewMode: 'card' by default (Image 1 layout), 'table' when clicking status cards
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedKOTModal, setSelectedKOTModal] = useState<KOTCard | null>(null);

  useEffect(() => {
    const loadKots = async () => {
      try {
        setLoading(true);
        const data = await kotService.getKots();
        if (data && data.length > 0) {
          setKots(
            data.map((k: any) => ({
              id: String(k.id),
              kotNo: k.kotNumber || `#K${k.id}`,
              table: k.tableName || (k.tableNumber ? `T${k.tableNumber}` : 'T1'),
              type: 'Dine In' as const,
              time: k.createdAt ? new Date(k.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
              minsAgo: 1,
              status: (k.status === 'READY' ? 'Ready' : k.status === 'PREPARING' ? 'Preparing' : k.status === 'SERVED' ? 'Served' : 'Pending') as any,
              timer: '02:00',
              priority: 'Medium' as const,
              note: k.instructions ? `Note: ${k.instructions}` : undefined,
              station: 'Main Kitchen',
              items: Array.isArray(k.items) ? k.items.map((it: any, idx: number) => ({
                id: String(it.id || idx),
                name: it.name || it.itemName || 'Item',
                quantity: it.qty || it.quantity || 1,
                variant: it.variant || it.customization,
              })) : [
                { id: '1', name: 'Order Items', quantity: 1 }
              ],
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load KOTs', err);
      } finally {
        setLoading(false);
      }
    };
    loadKots();
  }, []);

  // Status Lists
  const pendingList = useMemo(() => kots.filter(k => k.status === 'Pending'), [kots]);
  const preparingList = useMemo(() => kots.filter(k => k.status === 'Preparing'), [kots]);
  const readyList = useMemo(() => kots.filter(k => k.status === 'Ready'), [kots]);
  const servedList = useMemo(() => kots.filter(k => k.status === 'Served'), [kots]);

  // Action handlers
  const handleMoveStatus = async (id: string, nextStatus: KOTCard['status']) => {
    try {
      const backendStatus = nextStatus.toUpperCase();
      await kotService.updateKotStatus(Number(id), backendStatus);
    } catch (err) {
      console.error('Failed to update KOT status in backend', err);
    }
    setKots(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, status: nextStatus };
          if (nextStatus === 'Served') {
            const now = new Date();
            updated.servedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleStatusCardClick = (status: string) => {
    setStatusFilter(status);
    if (status === 'All') {
      setViewMode('card');
    } else {
      setViewMode('table');
    }
  };

  const handleSettingsClick = () => {
    if (onNavigateSettings) {
      onNavigateSettings();
    } else {
      window.location.href = '/settings';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter Logic
  const getFilteredKOTs = (list: KOTCard[]) => {
    return list.filter(kot => {
      const matchesSearch =
        kot.kotNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kot.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kot.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStation =
        selectedStation === 'All Stations' || kot.station === selectedStation;

      const matchesType =
        orderTypeFilter === 'All Orders' || kot.type === orderTypeFilter;

      const matchesStatus =
        statusFilter === 'All' || kot.status === statusFilter;

      return matchesSearch && matchesStation && matchesType && matchesStatus;
    });
  };

  const filteredData = getFilteredKOTs(kots);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px 28px',
        color: '#1e293b'
      }}
    >
      {/* HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
            KOT / Kitchen Display
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Live kitchen orders - prepare, update and track in real time
          </p>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Station Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedStation}
              onChange={e => setSelectedStation(e.target.value)}
              style={{
                appearance: 'none',
                padding: '8px 32px 8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Stations">All Stations</option>
              <option value="Main Kitchen">Main Kitchen</option>
              <option value="Beverage Bar">Beverage Bar</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#64748b'
              }}
            />
          </div>

          {/* Orders Type Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={orderTypeFilter}
              onChange={e => setOrderTypeFilter(e.target.value)}
              style={{
                appearance: 'none',
                padding: '8px 32px 8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All Orders">All Orders</option>
              <option value="Dine In">Dine In</option>
              <option value="Takeaway">Takeaway</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#64748b'
              }}
            />
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              placeholder="Search KOT, item, table..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* STATS CARDS & TOP ACTION BUTTONS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Total KOTs Card */}
          <div
            onClick={() => handleStatusCardClick('All')}
            style={{
              backgroundColor: statusFilter === 'All' ? '#eff6ff' : '#ffffff',
              border: statusFilter === 'All' ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              minWidth: '110px'
            }}
          >
            <div style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
              <Utensils size={18} color="#475569" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {kots.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Total KOTs</div>
            </div>
          </div>

          {/* Pending Card */}
          <div
            onClick={() => handleStatusCardClick('Pending')}
            style={{
              backgroundColor: statusFilter === 'Pending' ? '#fff1f2' : '#ffffff',
              border: statusFilter === 'Pending' ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              minWidth: '110px'
            }}
          >
            <div style={{ backgroundColor: '#ffe4e6', padding: '6px', borderRadius: '6px' }}>
              <Clock size={18} color="#e11d48" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {pendingList.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Pending</div>
            </div>
          </div>

          {/* Preparing Card */}
          <div
            onClick={() => handleStatusCardClick('Preparing')}
            style={{
              backgroundColor: statusFilter === 'Preparing' ? '#fffbeb' : '#ffffff',
              border: statusFilter === 'Preparing' ? '1.5px solid #d97706' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              minWidth: '110px'
            }}
          >
            <div style={{ backgroundColor: '#fef3c7', padding: '6px', borderRadius: '6px' }}>
              <Flame size={18} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {preparingList.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Preparing</div>
            </div>
          </div>

          {/* Ready Card */}
          <div
            onClick={() => handleStatusCardClick('Ready')}
            style={{
              backgroundColor: statusFilter === 'Ready' ? '#f0fdf4' : '#ffffff',
              border: statusFilter === 'Ready' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              minWidth: '110px'
            }}
          >
            <div style={{ backgroundColor: '#dcfce7', padding: '6px', borderRadius: '6px' }}>
              <CheckCircle size={18} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {readyList.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Ready</div>
            </div>
          </div>

          {/* Served Card */}
          <div
            onClick={() => handleStatusCardClick('Served')}
            style={{
              backgroundColor: statusFilter === 'Served' ? '#eff6ff' : '#ffffff',
              border: statusFilter === 'Served' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              minWidth: '110px'
            }}
          >
            <div style={{ backgroundColor: '#dbeafe', padding: '6px', borderRadius: '6px' }}>
              <CheckCheck size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {servedList.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Served</div>
            </div>
          </div>
        </div>

        {/* Header Right Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setSoundOn(!soundOn)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {soundOn ? <Volume2 size={16} color="#16a34a" /> : <VolumeX size={16} color="#ef4444" />}
            Sound {soundOn ? 'On' : 'Off'}
          </button>

          {/* Kitchen Settings Navigation */}
          <button
            onClick={handleSettingsClick}
            style={{
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Settings size={16} color="#64748b" />
            Kitchen Settings
          </button>
        </div>
      </div>

      {/* VIEW CONDITION: TABLE VIEW (WHEN CARD CLICKED) OR DEFAULT 4-COLUMN KANBAN CARD VIEW */}
      {viewMode === 'table' ? (
        /* TABLE VIEW MODULE */
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Table Header Info */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {statusFilter} Orders
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              Showing {filteredData.length} tickets
            </span>
          </div>

          {/* Data Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>#</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Ticket No.</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Table</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Order Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Items</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Priority</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontWeight: '600' }}>
                      No KOT orders found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((kot, index) => (
                    <tr key={kot.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0f172a' }}>{kot.kotNo}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>
                          {kot.table}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ backgroundColor: kot.type === 'Dine In' ? '#f0fdf4' : '#fef3c7', color: kot.type === 'Dine In' ? '#166534' : '#92400e', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                          {kot.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {kot.items.map(item => (
                          <div key={item.id} style={{ fontWeight: '600', color: '#334155' }}>
                            {item.name} <span style={{ fontWeight: '800', color: '#0f172a' }}>x{item.quantity}</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: kot.priority === 'High' ? '#ffe4e6' : kot.priority === 'Medium' ? '#fef3c7' : '#f1f5f9',
                          color: kot.priority === 'High' ? '#e11d48' : kot.priority === 'Medium' ? '#d97706' : '#475569',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '11px'
                        }}>
                          {kot.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: kot.status === 'Pending' ? '#fff1f2' : kot.status === 'Preparing' ? '#fffbeb' : kot.status === 'Ready' ? '#f0fdf4' : '#eff6ff',
                          color: kot.status === 'Pending' ? '#e11d48' : kot.status === 'Preparing' ? '#d97706' : kot.status === 'Ready' ? '#16a34a' : '#2563eb',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '12px'
                        }}>
                          {kot.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>
                        {kot.time}
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>({kot.minsAgo}m ago)</div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {kot.status === 'Pending' && (
                            <button
                              onClick={() => handleMoveStatus(kot.id, 'Preparing')}
                              style={{ backgroundColor: '#881337', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Start Prep
                            </button>
                          )}
                          {kot.status === 'Preparing' && (
                            <button
                              onClick={() => handleMoveStatus(kot.id, 'Ready')}
                              style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Mark Ready
                            </button>
                          )}
                          {kot.status === 'Ready' && (
                            <button
                              onClick={() => handleMoveStatus(kot.id, 'Served')}
                              style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Mark Served
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DEFAULT IMAGE 1: 4 COLUMNS KANBAN GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            alignItems: 'start'
          }}
        >
          {/* 1. PENDING COLUMN */}
          <div style={{ backgroundColor: '#fff5f5', borderRadius: '12px', padding: '14px', border: '1px solid #fee2e2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#e11d48" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#9f1239' }}>
                  Pending ({getFilteredKOTs(pendingList).length})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#881337', fontWeight: '600' }}>Oldest First</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getFilteredKOTs(pendingList).map(kot => (
                <div
                  key={kot.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #ffe4e6',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#e11d48' }}>{kot.kotNo}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{kot.minsAgo} min ago</span>
                      <MoreVertical size={14} color="#94a3b8" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '4px 0 12px 0' }}>
                    Table {kot.table} | {kot.type} | {kot.time}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {kot.items.map(item => (
                      <div key={item.id} style={{ fontSize: '13px', color: '#1e293b' }}>
                        <span style={{ fontWeight: '800', marginRight: '8px' }}>{item.quantity}</span>
                        <span style={{ fontWeight: '700' }}>{item.name}</span>
                        {item.variant && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginLeft: '16px', marginTop: '2px' }}>
                            {item.variant}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {kot.note && (
                    <div
                      style={{
                        backgroundColor: '#fff1f2',
                        color: '#9f1239',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        marginBottom: '14px'
                      }}
                    >
                      {kot.note}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #fecdd3',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#e11d48'
                      }}
                    >
                      <Clock size={12} /> {kot.timer}
                    </div>
                    <button
                      onClick={() => handleMoveStatus(kot.id, 'Preparing')}
                      style={{
                        flex: 1,
                        backgroundColor: '#881337',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(136, 19, 55, 0.2)'
                      }}
                    >
                      Start Preparing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. PREPARING COLUMN */}
          <div style={{ backgroundColor: '#fffbeb', borderRadius: '12px', padding: '14px', border: '1px solid #fef3c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={16} color="#d97706" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#92400e' }}>
                  Preparing ({getFilteredKOTs(preparingList).length})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#78350f', fontWeight: '600' }}>In Progress</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getFilteredKOTs(preparingList).map(kot => (
                <div
                  key={kot.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #fde68a',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#d97706' }}>{kot.kotNo}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{kot.minsAgo} min ago</span>
                      <MoreVertical size={14} color="#94a3b8" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '4px 0 12px 0' }}>
                    Table {kot.table} | {kot.type} | {kot.time}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {kot.items.map(item => (
                      <div key={item.id} style={{ fontSize: '13px', color: '#1e293b' }}>
                        <span style={{ fontWeight: '800', marginRight: '8px' }}>{item.quantity}</span>
                        <span style={{ fontWeight: '700' }}>{item.name}</span>
                        {item.variant && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginLeft: '16px', marginTop: '2px' }}>
                            {item.variant}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#d97706'
                      }}
                    >
                      <Clock size={12} /> {kot.timer}
                    </div>
                    <button
                      onClick={() => handleMoveStatus(kot.id, 'Ready')}
                      style={{
                        flex: 1,
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                      }}
                    >
                      Mark Ready
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. READY COLUMN */}
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '14px', border: '1px solid #dcfce7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#16a34a" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#14532d' }}>
                  Ready ({getFilteredKOTs(readyList).length})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600' }}>Ready to Serve</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getFilteredKOTs(readyList).map(kot => (
                <div
                  key={kot.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #bbf7d0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>{kot.kotNo}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{kot.minsAgo} min ago</span>
                      <MoreVertical size={14} color="#94a3b8" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '4px 0 12px 0' }}>
                    Table {kot.table} | {kot.type} | {kot.time}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {kot.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                          <span style={{ fontWeight: '800', marginRight: '8px' }}>{item.quantity}</span>
                          <span style={{ fontWeight: '700' }}>{item.name}</span>
                          {item.variant && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginLeft: '16px' }}>
                              {item.variant}
                            </div>
                          )}
                        </div>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#15803d', fontWeight: '600', marginBottom: '12px' }}>
                    <CheckCircle size={14} /> Items ready. Please serve to table.
                  </div>
                  <button
                    onClick={() => handleMoveStatus(kot.id, 'Served')}
                    style={{
                      width: '100%',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                    }}
                  >
                    Mark Served
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. SERVED COLUMN */}
          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '12px', padding: '14px', border: '1px solid #e0f2fe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCheck size={16} color="#0284c7" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1' }}>
                  Served ({getFilteredKOTs(servedList).length})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>Completed Today</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getFilteredKOTs(servedList).map(kot => (
                <div
                  key={kot.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #bae6fd',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7' }}>{kot.kotNo}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{kot.minsAgo} min ago</span>
                      <MoreVertical size={14} color="#94a3b8" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '4px 0 12px 0' }}>
                    Table {kot.table} | {kot.type} | {kot.time}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {kot.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                          <span style={{ fontWeight: '800', marginRight: '8px' }}>{item.quantity}</span>
                          <span style={{ fontWeight: '700' }}>{item.name}</span>
                        </div>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      backgroundColor: '#f0f9ff',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#0369a1',
                      fontWeight: '600'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <CheckCircle size={13} color="#0284c7" /> Order served. Thank you!
                    </div>
                    <div>Served at: {kot.servedAt || '11:45 AM'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL (FOR TABLE DETAILS IF NEEDED) */}
      {selectedKOTModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '450px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                KOT Details ({selectedKOTModal.kotNo})
              </h2>
              <button
                onClick={() => setSelectedKOTModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                X
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              Table: <b>{selectedKOTModal.table}</b> | Type: <b>{selectedKOTModal.type}</b> | Time: <b>{selectedKOTModal.time}</b>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Ordered Items:
              </span>
              {selectedKOTModal.items.map(item => (
                <div key={item.id} style={{ fontSize: '13px', margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.quantity}x {item.name}</span>
                  <span style={{ color: '#64748b' }}>{item.variant || '-'}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedKOTModal(null)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FLOATING PRINT BUTTON */}
      <div style={{ position: 'fixed', bottom: '24px', right: '28px', zIndex: 100 }}>
        <button
          onClick={handlePrint}
          style={{
            backgroundColor: '#ffffff',
            color: '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <Printer size={16} /> Print KOTs
        </button>
      </div>
    </div>
  );
};

export default KitchenManagement;