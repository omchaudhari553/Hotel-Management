import React, { useState, useEffect } from 'react';
import { messService } from '../services/messService';
import { deliveryService } from '../services/deliveryService';
import { MessCustomer, MessMenu } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../common/Modal';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';
import {
  Users,
  UtensilsCrossed,
  Wallet,
  Clock,
  FileText,
  Calendar,
  Plus,
  ArrowDownLeft,
  UserPlus,
  ShoppingCart,
  Receipt,
  Check,
  Truck,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MessDashboard: React.FC = () => {
  const [customers, setCustomers] = useState<MessCustomer[]>([]);
  const [menu, setMenu] = useState<MessMenu[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddTiffinOpen, setIsAddTiffinOpen] = useState(false);

  // New member form
  const [newMember, setNewMember] = useState({
    fullName: '',
    phone: '',
    email: '',
    planId: 1,
    tiffinEnabled: false,
    deliveryAddress: '',
  });

  // Tiffin entry form
  const [tiffinEntry, setTiffinEntry] = useState({
    memberCount: 12,
    slot: 'LUNCH',
    route: 'Tech Park IT Hub Route',
  });

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [custData, menuData] = await Promise.all([
        messService.getCustomers(1),
        messService.getWeeklyMenu(1),
      ]);
      setCustomers(Array.isArray(custData) ? custData : []);
      setMenu(Array.isArray(menuData) ? menuData : []);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to load mess data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMobile(newMember.phone)) {
      showToast('error', 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9');
      return;
    }
    try {
      await messService.subscribe({
        businessId: 1,
        fullName: newMember.fullName,
        phone: newMember.phone,
        email: newMember.email,
        planId: Number(newMember.planId),
        tiffinEnabled: newMember.tiffinEnabled,
        deliveryAddress: newMember.deliveryAddress,
        startDate: new Date().toISOString().split('T')[0],
      });
      showToast('success', `Member ${newMember.fullName} enrolled successfully!`);
      setIsAddMemberOpen(false);
      setNewMember({ fullName: '', phone: '', email: '', planId: 1, tiffinEnabled: false, deliveryAddress: '' });
      loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to enroll member');
    }
  };

  const handleAddTiffin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await deliveryService.createDelivery({
        customerName: `Tiffin Route - ${tiffinEntry.route}`,
        customerPhone: '9876543210',
        address: `${tiffinEntry.route} (${tiffinEntry.slot})`,
        instructions: `${tiffinEntry.memberCount} lunch tiffins dispatched`,
        deliveryCharge: 0,
        paymentStatus: 'PAID',
      });
      showToast('success', `Tiffin entry logged for ${tiffinEntry.memberCount} members on ${tiffinEntry.route}!`);
      setIsAddTiffinOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to dispatch tiffins');
    }
  };

  const displayName = user?.fullName || 'Ajay';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '30px' }}>
      {/* 1. Top Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917', margin: 0, letterSpacing: '-0.02em' }}>
            Good Morning, {displayName}! 👋
          </h1>
          <p style={{ color: '#78716C', fontSize: '0.92rem', marginTop: '3px', margin: 0 }}>
            Here's what's happening with your mess today.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setIsAddMemberOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0A381E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(10, 56, 30, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Member</span>
          </button>

          <button
            onClick={() => setIsAddTiffinOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#4D7C0F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(77, 124, 15, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Tiffin Entry</span>
          </button>
        </div>
      </div>

      {/* 2. Top 6 Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Members */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F7FEE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#4D7C0F" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#78716C', fontWeight: 600 }}>Total Members</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>128</div>
            <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600, marginTop: '6px' }}>↑ 8 this month</div>
          </div>
        </div>

        {/* Card 2: Today's Tiffin */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#EBF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UtensilsCrossed size={18} color="#16A34A" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#78716C', fontWeight: 600 }}>Today's Tiffin</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>112</div>
            <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600, marginTop: '6px' }}>↑ 5% vs yesterday</div>
          </div>
        </div>

        {/* Card 3: Today's Collection */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F7FEE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color="#4D7C0F" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#78716C', fontWeight: 600 }}>Today's Collection</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>₹ 18,450</div>
            <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600, marginTop: '6px' }}>↑ 12% vs yesterday</div>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FDEBEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#DC2626" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#78716C', fontWeight: 600 }}>Pending Payments</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>₹ 8,650</div>
            <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '6px' }}>↓ 3% vs yesterday</div>
          </div>
        </div>

        {/* Card 5: Total Outstanding */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FEF7EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#D97706" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#78716C', fontWeight: 600 }}>Total Outstanding</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>₹ 45,230</div>
            <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '6px' }}>↓ 2% vs last month</div>
          </div>
        </div>

        {/* Card 6: Active Plans */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#EBF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#16A34A" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#78716C', fontWeight: 600 }}>Active Plans</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>6</div>
            <div
              onClick={() => navigate('/mess/plans')}
              style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 700, marginTop: '6px', cursor: 'pointer' }}
            >
              View all plans
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Row: Collection Overview, Tiffin Overview, Recent Activities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '18px' }}>
        {/* Collection Overview Area Chart */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Collection Overview</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#78716C', background: '#F8F6F0', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #EFECE6' }}>
                <span>This Month</span>
                <ChevronDown size={14} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.55rem', fontWeight: 900, color: '#1C1917' }}>₹ 2,45,680</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A', background: '#EBF7EE', padding: '2px 8px', borderRadius: '4px' }}>
                ↑ 15% vs last month
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#78716C', marginBottom: '12px' }}>Total Collection</div>
          </div>

          {/* SVG Area Line Chart */}
          <div style={{ width: '100%', height: '140px' }}>
            <svg viewBox="0 0 350 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="oliveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4D7C0F" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4D7C0F" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="350" y2="30" stroke="#F0ECE1" strokeDasharray="3 3" />
              <line x1="0" y1="65" x2="350" y2="65" stroke="#F0ECE1" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="350" y2="100" stroke="#F0ECE1" strokeDasharray="3 3" />

              {/* Area */}
              <polygon points="10,110 55,85 105,95 155,65 205,75 255,45 305,50 340,25 340,115 10,115" fill="url(#oliveGrad)" />
              {/* Line */}
              <polyline points="10,110 55,85 105,95 155,65 205,75 255,45 305,50 340,25" fill="none" stroke="#4D7C0F" strokeWidth="2.5" strokeLinecap="round" />
              {/* Dots */}
              {[[10, 110], [55, 85], [105, 95], [155, 65], [205, 75], [255, 45], [305, 50], [340, 25]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.5" fill="#FFFFFF" stroke="#4D7C0F" strokeWidth="2" />
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#A8A29E', marginTop: '6px' }}>
            <span>1 May</span>
            <span>5 May</span>
            <span>10 May</span>
            <span>15 May</span>
            <span>20 May</span>
            <span>25 May</span>
            <span>31 May</span>
          </div>
        </div>

        {/* Tiffin Overview Area Chart */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Tiffin Overview</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#78716C', background: '#F8F6F0', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #EFECE6' }}>
                <span>This Week</span>
                <ChevronDown size={14} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.55rem', fontWeight: 900, color: '#1C1917' }}>778</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A', background: '#EBF7EE', padding: '2px 8px', borderRadius: '4px' }}>
                ↑ 6% vs last week
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#78716C', marginBottom: '12px' }}>Total Tiffin Served</div>
          </div>

          {/* SVG Area Line Chart */}
          <div style={{ width: '100%', height: '140px' }}>
            <svg viewBox="0 0 350 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="350" y2="30" stroke="#F0ECE1" strokeDasharray="3 3" />
              <line x1="0" y1="65" x2="350" y2="65" stroke="#F0ECE1" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="350" y2="100" stroke="#F0ECE1" strokeDasharray="3 3" />

              {/* Area */}
              <polygon points="10,115 60,90 110,85 160,50 210,40 260,55 310,30 340,20 340,115 10,115" fill="url(#greenGrad)" />
              {/* Line */}
              <polyline points="10,115 60,90 110,85 160,50 210,40 260,55 310,30 340,20" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
              {/* Dots */}
              {[[10, 115], [60, 90], [110, 85], [160, 50], [210, 40], [260, 55], [310, 30], [340, 20]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#A8A29E', marginTop: '6px' }}>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '12px', border: '1px solid #EFECE6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', marginBottom: '14px' }}>Recent Activities</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Payment */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#EBF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowDownLeft size={15} color="#16A34A" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>Payment received from Ravi Sharma</div>
                    <div style={{ fontSize: '0.72rem', color: '#A8A29E' }}>10 min ago</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917' }}>₹ 3,500</span>
              </div>

              {/* 2. Tiffin */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F7FEE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UtensilsCrossed size={15} color="#4D7C0F" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>Tiffin entry added for 12 members</div>
                    <div style={{ fontSize: '0.72rem', color: '#A8A29E' }}>11:30 AM</div>
                  </div>
                </div>
              </div>

              {/* 3. New Member */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#EBF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserPlus size={15} color="#16A34A" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>New member added - Rohit Verma</div>
                    <div style={{ fontSize: '0.72rem', color: '#A8A29E' }}>10:15 AM</div>
                  </div>
                </div>
              </div>

              {/* 4. Purchase */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F7FEE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={15} color="#4D7C0F" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>Purchase entry added</div>
                    <div style={{ fontSize: '0.72rem', color: '#A8A29E' }}>Yesterday</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917' }}>₹ 2,450</span>
              </div>

              {/* 5. Expense */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#FDEBEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={15} color="#DC2626" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>Expense entry added</div>
                    <div style={{ fontSize: '0.72rem', color: '#A8A29E' }}>Yesterday</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917' }}>₹ 850</span>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/billing')}
            style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#4D7C0F', marginTop: '16px', cursor: 'pointer' }}
          >
            View all activities
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Outstanding Summary, Top 5 Members, Plan Expiry Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '18px' }}>
        {/* Outstanding Summary Donut Chart */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '12px', border: '1px solid #EFECE6' }}>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>Outstanding Summary</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {/* SVG Donut Chart */}
            <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F8F6F0" strokeWidth="5" />
                {/* Slice 1: Olive Green 1-30 Days (41%) */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#4D7C0F" strokeWidth="5" strokeDasharray="36 64" strokeDashoffset="0" />
                {/* Slice 2: Amber 31-60 Days (32%) */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#F59E0B" strokeWidth="5" strokeDasharray="28 72" strokeDashoffset="-36" />
                {/* Slice 3: Green 61-90 Days (19%) */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#16A34A" strokeWidth="5" strokeDasharray="16 84" strokeDashoffset="-64" />
                {/* Slice 4: Red 90+ Days (8%) */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#DC2626" strokeWidth="5" strokeDasharray="8 92" strokeDashoffset="-80" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#78716C', display: 'block' }}>Total</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1C1917' }}>₹ 45,230</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4D7C0F' }}></span>
                  <span style={{ color: '#78716C' }}>1-30 Days</span>
                </div>
                <span style={{ fontWeight: 700, color: '#1C1917' }}>₹ 18,650</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></span>
                  <span style={{ color: '#78716C' }}>31-60 Days</span>
                </div>
                <span style={{ fontWeight: 700, color: '#1C1917' }}>₹ 14,320</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }}></span>
                  <span style={{ color: '#78716C' }}>61-90 Days</span>
                </div>
                <span style={{ fontWeight: 700, color: '#1C1917' }}>₹ 8,450</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }}></span>
                  <span style={{ color: '#78716C' }}>90+ Days</span>
                </div>
                <span style={{ fontWeight: 700, color: '#1C1917' }}>₹ 3,810</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Members (Outstanding) */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '12px', border: '1px solid #EFECE6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Top 5 Members (Outstanding)</h3>
            <span onClick={() => navigate('/customers')} style={{ fontSize: '0.78rem', color: '#4D7C0F', fontWeight: 700, cursor: 'pointer' }}>
              View All
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { rank: 1, name: 'Amit Patel', amount: '₹ 5,650' },
              { rank: 2, name: 'Suresh Kumar', amount: '₹ 4,200' },
              { rank: 3, name: 'Ravi Sharma', amount: '₹ 3,850' },
              { rank: 4, name: 'Neha Singh', amount: '₹ 2,900' },
              { rank: 5, name: 'Deepak Verma', amount: '₹ 2,450' },
            ].map((m) => (
              <div key={m.rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#A8A29E', width: '12px' }}>{m.rank}</span>
                  <span style={{ fontWeight: 700, color: '#1C1917' }}>{m.name}</span>
                </div>
                <span style={{ fontWeight: 800, color: '#DC2626' }}>{m.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Expiry Alerts */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '12px', border: '1px solid #EFECE6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Plan Expiry Alerts</h3>
            <span onClick={() => navigate('/mess/plans')} style={{ fontSize: '0.78rem', color: '#4D7C0F', fontWeight: 700, cursor: 'pointer' }}>
              View All
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { plan: 'Gold Plan - 3 Members', expiry: 'Expires in 3 days' },
              { plan: 'Silver Plan - 5 Members', expiry: 'Expires in 7 days' },
              { plan: 'Basic Plan - 2 Members', expiry: 'Expires in 15 days' },
            ].map((p, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF7EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={16} color="#D97706" />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>{p.plan}</div>
                  <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{p.expiry}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #EFECE6', fontSize: '0.8rem', color: '#A8A29E', flexWrap: 'wrap', gap: '10px' }}>
        <div>© 2025 Ajalkar Mess Management. All rights reserved.</div>
        <div>Made with ❤️ in India</div>
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Add New Mess Member">
        <form onSubmit={handleAddMember}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Rahul Patil"
              value={newMember.fullName}
              onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Mobile Phone *</label>
              <input
                type="tel"
                required
                className="input"
                placeholder="10 digit mobile (starts with 6-9)"
                maxLength={10}
                inputMode="numeric"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: sanitizeMobileInput(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="member@email.com"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Subscription Plan</label>
            <select
              className="select"
              value={newMember.planId}
              onChange={(e) => setNewMember({ ...newMember, planId: Number(e.target.value) })}
            >
              <option value={1}>Monthly Executive (Lunch + Dinner) - ₹3,500</option>
              <option value={2}>Standard Student (Lunch Only) - ₹2,000</option>
              <option value={3}>Daily Tiffin Package - ₹4,200</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="tiffinCheck"
              checked={newMember.tiffinEnabled}
              onChange={(e) => setNewMember({ ...newMember, tiffinEnabled: e.target.checked })}
            />
            <label htmlFor="tiffinCheck" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
              Enable Daily Tiffin Delivery Dispatch
            </label>
          </div>
          {newMember.tiffinEnabled && (
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Tech Park Phase 2, Tower 4, Flat 402"
                value={newMember.deliveryAddress}
                onChange={(e) => setNewMember({ ...newMember, deliveryAddress: e.target.value })}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsAddMemberOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn" style={{ backgroundColor: '#0A381E', color: '#FFFFFF', fontWeight: 700 }}>
              Add Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Tiffin Entry Modal */}
      <Modal isOpen={isAddTiffinOpen} onClose={() => setIsAddTiffinOpen(false)} title="Add Tiffin Dispatch Entry">
        <form onSubmit={handleAddTiffin}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Member Count</label>
              <input
                type="number"
                required
                className="input"
                value={tiffinEntry.memberCount}
                onChange={(e) => setTiffinEntry({ ...tiffinEntry, memberCount: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Meal Slot</label>
              <select
                className="select"
                value={tiffinEntry.slot}
                onChange={(e) => setTiffinEntry({ ...tiffinEntry, slot: e.target.value })}
              >
                <option value="LUNCH">Lunch Window (11:30 AM - 1:00 PM)</option>
                <option value="DINNER">Dinner Window (7:30 PM - 9:00 PM)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Route / IT Park Zone</label>
            <input
              type="text"
              required
              className="input"
              value={tiffinEntry.route}
              onChange={(e) => setTiffinEntry({ ...tiffinEntry, route: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsAddTiffinOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn" style={{ backgroundColor: '#4D7C0F', color: '#FFFFFF', fontWeight: 700 }}>
              Confirm Tiffin Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
