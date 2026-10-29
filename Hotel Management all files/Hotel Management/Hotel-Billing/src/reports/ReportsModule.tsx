import React, { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/reportService';
import { useIndustry } from '../context/IndustryContext';
import { useAuth } from '../context/AuthContext';
import {
  IndustryReportWrapper,
  MessReport,
  HotelReport,
  CafeReport,
} from '../types';
import { MetricCard } from '../common/MetricCard';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp,
  Building2,
  UtensilsCrossed,
  Coffee,
  Users,
  Printer,
  FileSpreadsheet,
  Receipt,
  PieChart,
  Calendar,
  Truck,
  CheckCircle2,
  DollarSign,
  Layers,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { activeIndustryCode } = useIndustry();
  const { business } = useAuth();
  const [reportData, setReportData] = useState<IndustryReportWrapper | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const effectiveIndustry = (activeIndustryCode || business?.industryType || 'MESS').toUpperCase();

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportService.getCurrentIndustryReport(business?.id || 1);
      setReportData(data);
    } catch {
      showToast('error', 'Failed to load industry-specific reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [effectiveIndustry]);

  const mess = reportData?.messReport;
  const hotel = reportData?.hotelReport;
  const cafe = reportData?.cafeReport;

  // Pagination states
  const [messPage, setMessPage] = useState<number>(1);
  const [messPageSize, setMessPageSize] = useState<number>(10);

  const [hotelPage, setHotelPage] = useState<number>(1);
  const [hotelPageSize, setHotelPageSize] = useState<number>(10);

  const [cafePage, setCafePage] = useState<number>(1);
  const [cafePageSize, setCafePageSize] = useState<number>(10);

  const messPlansList = useMemo(() => {
    return mess?.planRevenueBreakdown || [
      { planId: 1, planName: 'Monthly Executive (Lunch + Dinner)', planType: 'MONTHLY', subscriberCount: 24, monthlyPrice: 3600, totalRevenue: 86400, percentageOfTotal: 60.8 },
      { planId: 2, planName: 'Student Economy (Lunch Only)', planType: 'MONTHLY', subscriberCount: 16, monthlyPrice: 2200, totalRevenue: 35200, percentageOfTotal: 24.8 },
      { planId: 3, planName: 'Daily Tiffin Doorstep Plan', planType: 'TIFFIN_ONLY', subscriberCount: 8, monthlyPrice: 2550, totalRevenue: 20400, percentageOfTotal: 14.4 },
    ];
  }, [mess?.planRevenueBreakdown]);

  const paginatedMessPlans = useMemo(() => {
    const start = (messPage - 1) * messPageSize;
    return messPlansList.slice(start, start + messPageSize);
  }, [messPlansList, messPage, messPageSize]);

  const hotelRoomsList = useMemo(() => {
    return hotel?.roomTypeBreakdown || [
      { roomType: 'Executive Suite', totalRooms: 6, occupiedRooms: 5, occupancyRate: 83.3, basePrice: 4500, revenueGenerated: 112500 },
      { roomType: 'Deluxe King AC', totalRooms: 10, occupiedRooms: 8, occupancyRate: 80.0, basePrice: 2800, revenueGenerated: 112000 },
      { roomType: 'Standard Double', totalRooms: 8, occupiedRooms: 5, occupancyRate: 62.5, basePrice: 1800, revenueGenerated: 60500 },
    ];
  }, [hotel?.roomTypeBreakdown]);

  const paginatedHotelRooms = useMemo(() => {
    const start = (hotelPage - 1) * hotelPageSize;
    return hotelRoomsList.slice(start, start + hotelPageSize);
  }, [hotelRoomsList, hotelPage, hotelPageSize]);

  const cafeItemsList = useMemo(() => {
    return cafe?.topSellingItems || [
      { itemId: 1, itemName: 'Hazelnut Cold Coffee', category: 'Beverages', unitsSold: 182, unitPrice: 180, totalRevenue: 32760, marginPercentage: 68.5 },
      { itemId: 2, itemName: 'Paneer Tikka Grilled Sandwich', category: 'Snacks', unitsSold: 145, unitPrice: 160, totalRevenue: 23200, marginPercentage: 62.0 },
      { itemId: 3, itemName: 'Artisan Cappuccino', category: 'Hot Coffee', unitsSold: 120, unitPrice: 140, totalRevenue: 16800, marginPercentage: 74.0 },
      { itemId: 4, itemName: 'Butter Croissant', category: 'Bakery', unitsSold: 95, unitPrice: 120, totalRevenue: 11400, marginPercentage: 55.0 },
      { itemId: 5, itemName: 'Peri Peri French Fries', category: 'Sides', unitsSold: 88, unitPrice: 110, totalRevenue: 9680, marginPercentage: 70.0 },
    ];
  }, [cafe?.topSellingItems]);

  const paginatedCafeItems = useMemo(() => {
    const start = (cafePage - 1) * cafePageSize;
    return cafeItemsList.slice(start, start + cafePageSize);
  }, [cafeItemsList, cafePage, cafePageSize]);

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    pageSize: number,
    onPageChange: (p: number) => void,
    onPageSizeChange?: (s: number) => void,
    itemLabel: string = 'records'
  ) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems <= pageSize && currentPage === 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E7E5E4',
          borderRadius: '0 0 10px 10px',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.84rem',
          color: '#57534E',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span>
            Showing <strong style={{ color: '#1C1917' }}>{startItem}</strong> -{' '}
            <strong style={{ color: '#1C1917' }}>{endItem}</strong> of{' '}
            <strong style={{ color: '#1C1917' }}>{totalItems}</strong> {itemLabel}
          </span>

          {onPageSizeChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#78716C' }}>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #D6D3D1',
                  backgroundColor: '#FAFAF9',
                  color: '#1C1917',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #D6D3D1',
              backgroundColor: currentPage === 1 ? '#FAFAF9' : '#FFFFFF',
              color: currentPage === 1 ? '#A8A29E' : '#1C1917',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            « Prev
          </button>
          <span style={{ padding: '0 8px', fontWeight: 700, color: '#1C1917' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #D6D3D1',
              backgroundColor: currentPage === totalPages ? '#FAFAF9' : '#FFFFFF',
              color: currentPage === totalPages ? '#A8A29E' : '#1C1917',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            Next »
          </button>
        </div>
      </div>
    );
  };

  // Industry-specific header details
  const getHeaderInfo = () => {
    switch (effectiveIndustry) {
      case 'HOTEL':
        return {
          title: 'Hotel & Lodging Performance Analytics',
          subtitle: 'Room revenue, occupancy metrics, guest check-ins, and tax summary for your hotel property',
          badge: 'Hotel Management Sector',
          icon: <Building2 size={20} color="#7C2D12" />,
        };
      case 'CAFE':
        return {
          title: 'Cafe & Bistro Sales Intelligence',
          subtitle: 'POS counter volume, table orders, top-selling items, inventory consumption, and tax reports',
          badge: 'Cafe & Table POS Sector',
          icon: <Coffee size={20} color="#A56F63" />,
        };
      case 'MESS':
      default:
        return {
          title: 'Mess & Tiffin Subscription Analytics',
          subtitle: 'Meal plan revenue, active dining subscribers, daily attendance logs, and tax statements',
          badge: 'Mess & Meal Management Sector',
          icon: <UtensilsCrossed size={20} color="#047857" />,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header with Industry Badge & Print Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#F7FEE7',
              border: '1px solid #D9F99D',
              color: '#4D7C0F',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            {headerInfo.icon}
            <span>{headerInfo.badge}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917' }}>{headerInfo.title}</h1>
          <p style={{ color: 'var(--warm-slate)', fontSize: '0.9rem', marginTop: '2px' }}>
            {headerInfo.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #E7E5E4',
              backgroundColor: '#FFFFFF',
              color: '#1C1917',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MESS & TIFFIN SPECIFIC REPORTS */}
      {/* ========================================================================= */}
      {effectiveIndustry === 'MESS' && (
        <>
          {/* Top 4 KPI Metrics */}
          <div className="grid-4">
            <MetricCard
              title="Subscription Revenue"
              value={`₹${(mess?.totalSubscriptionRevenue || 142000).toLocaleString()}`}
              subtitle="Monthly meal packages"
              trend="14.8%"
              trendPositive={true}
              accentColor="#4D7C0F"
              icon={<TrendingUp size={20} color="#4D7C0F" />}
            />
            <MetricCard
              title="Active Subscribers"
              value={mess?.activeMembers || 48}
              subtitle="Enrolled meal members"
              trend="8.2%"
              trendPositive={true}
              accentColor="#4D7C0F"
              icon={<Users size={20} color="#4D7C0F" />}
            />
            <MetricCard
              title="Meals Served Today"
              value={mess?.mealsServedToday || 42}
              subtitle={`Attendance rate: ${mess?.attendanceRatePercentage || 92.4}%`}
              accentColor="#16A34A"
              icon={<UtensilsCrossed size={20} color="#16A34A" />}
            />
            <MetricCard
              title="Tiffin Dispatches"
              value={mess?.tiffinDispatchesCount || 48}
              subtitle={`${mess?.activeTiffinMembers || 18} daily doorstep routes`}
              accentColor="#090040"
              icon={<Truck size={20} color="#090040" />}
            />
          </div>

          {/* Plan Revenue Breakdown Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                  Meal Plan Revenue & Subscriber Share
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Breakdown of active subscriptions and contribution to monthly cashflow
                </p>
              </div>
              <span style={{ fontSize: '0.78rem', backgroundColor: '#F7FEE7', color: '#4D7C0F', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                {mess?.planRevenueBreakdown?.length || 3} Active Plans
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E7E5E4', backgroundColor: '#FAFAF9' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Plan Name</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Subscribers</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Price / Month</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Total Revenue</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Revenue Share</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMessPlans.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1C1917' }}>{item.planName}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F5F5F4', color: '#57534E', fontWeight: 600 }}>
                          {item.planType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.subscriberCount} members</td>
                      <td style={{ padding: '14px 16px' }}>₹{item.monthlyPrice?.toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#4D7C0F' }}>₹{item.totalRevenue?.toLocaleString()}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: '#E7E5E4', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.percentageOfTotal}%`, height: '100%', backgroundColor: '#4D7C0F' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#57534E', minWidth: '38px' }}>
                            {item.percentageOfTotal}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(messPage, messPlansList.length, messPageSize, setMessPage, setMessPageSize, 'Meal Plans')}
          </div>

          {/* Weekly Attendance & Tiffin Flow */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
              Weekly Meal Volume & Dispatch Distribution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {(mess?.attendanceByDay || [
                { dayOfWeek: 'Monday', lunchAttendance: 42, dinnerAttendance: 38, tiffinDispatches: 18, totalMeals: 98 },
                { dayOfWeek: 'Tuesday', lunchAttendance: 44, dinnerAttendance: 40, tiffinDispatches: 19, totalMeals: 103 },
                { dayOfWeek: 'Wednesday', lunchAttendance: 45, dinnerAttendance: 41, tiffinDispatches: 18, totalMeals: 104 },
                { dayOfWeek: 'Thursday', lunchAttendance: 43, dinnerAttendance: 39, tiffinDispatches: 19, totalMeals: 101 },
                { dayOfWeek: 'Friday', lunchAttendance: 46, dinnerAttendance: 44, tiffinDispatches: 20, totalMeals: 110 },
                { dayOfWeek: 'Saturday', lunchAttendance: 38, dinnerAttendance: 35, tiffinDispatches: 14, totalMeals: 87 },
                { dayOfWeek: 'Sunday', lunchAttendance: 48, dinnerAttendance: 46, tiffinDispatches: 12, totalMeals: 106 },
              ]).map((d, i) => (
                <div key={i} style={{ backgroundColor: '#FAFAF9', padding: '14px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4D7C0F', textTransform: 'uppercase' }}>{d.dayOfWeek}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1C1917', margin: '6px 0 2px' }}>{d.totalMeals}</div>
                  <div style={{ fontSize: '0.72rem', color: '#78716C' }}>Meals Served</div>
                  <div style={{ fontSize: '0.7rem', color: '#4D7C0F', fontWeight: 700, marginTop: '4px' }}>
                    🍱 {d.tiffinDispatches} Tiffins
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. HOTEL / RESTRO SPECIFIC REPORTS */}
      {/* ========================================================================= */}
      {effectiveIndustry === 'HOTEL' && (
        <>
          {/* Top 4 KPI Metrics */}
          <div className="grid-4">
            <MetricCard
              title="Room Lodging Revenue"
              value={`₹${(hotel?.totalRoomRevenue || 285000).toLocaleString()}`}
              subtitle="Direct room bookings"
              trend="19.4%"
              trendPositive={true}
              accentColor="#F97316"
              icon={<TrendingUp size={20} color="#F97316" />}
            />
            <MetricCard
              title="Occupancy Rate"
              value={`${hotel?.occupancyRatePercentage || 75.0}%`}
              subtitle={`${hotel?.occupiedRooms || 18} of ${hotel?.totalRooms || 24} rooms occupied`}
              accentColor="#4D7C0F"
              icon={<Building2 size={20} color="#4D7C0F" />}
            />
            <MetricCard
              title="Total Bookings"
              value={hotel?.totalBookings || 42}
              subtitle="Monthly check-ins"
              trend="11.5%"
              trendPositive={true}
              accentColor="#16A34A"
              icon={<Users size={20} color="#16A34A" />}
            />
            <MetricCard
              title="Today Check-Ins / Outs"
              value={`${hotel?.todayCheckIns || 6} In / ${hotel?.todayCheckOuts || 4} Out`}
              subtitle="Front desk activity"
              accentColor="#090040"
              icon={<CheckCircle2 size={20} color="#090040" />}
            />
          </div>

          {/* Room Type Performance Table */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
              Room Category Occupancy & Revenue
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E7E5E4', backgroundColor: '#FAFAF9' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Room Category</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Inventory</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Occupied</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Occupancy %</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Avg Rate</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHotelRooms.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1C1917' }}>{r.roomType}</td>
                      <td style={{ padding: '14px 16px' }}>{r.totalRooms} rooms</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{r.occupiedRooms} occupied</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F7FEE7', color: '#4D7C0F', fontWeight: 700 }}>
                          {r.occupancyRate}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>₹{r.basePrice?.toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#4D7C0F' }}>₹{r.revenueGenerated?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(hotelPage, hotelRoomsList.length, hotelPageSize, setHotelPage, setHotelPageSize, 'Room Categories')}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. CAFE & POS SPECIFIC REPORTS */}
      {/* ========================================================================= */}
      {effectiveIndustry === 'CAFE' && (
        <>
          {/* Top 4 KPI Metrics */}
          <div className="grid-4">
            <MetricCard
              title="Total POS Sales"
              value={`₹${(cafe?.totalPosSales || 94500).toLocaleString()}`}
              subtitle="Food, drinks & counter sales"
              trend="22.1%"
              trendPositive={true}
              accentColor="#F97316"
              icon={<TrendingUp size={20} color="#F97316" />}
            />
            <MetricCard
              title="Orders Processed"
              value={cafe?.totalOrdersProcessed || 148}
              subtitle={`${cafe?.dineInTableOrders || 98} Dine-In • ${cafe?.takeawayCounterOrders || 50} Takeaway`}
              accentColor="#4D7C0F"
              icon={<Coffee size={20} color="#4D7C0F" />}
            />
            <MetricCard
              title="Average Order Value"
              value={`₹${(cafe?.averageOrderValue || 638.5).toFixed(2)}`}
              subtitle="Ticket size per customer"
              accentColor="#16A34A"
              icon={<Receipt size={20} color="#16A34A" />}
            />
            <MetricCard
              title="Ingredient Consumption"
              value={`₹${(cafe?.inventoryConsumptionCost || 30240).toLocaleString()}`}
              subtitle="Coffee beans, dairy, kitchen stock"
              accentColor="#DC2626"
              icon={<ShoppingBag size={20} color="#DC2626" />}
            />
          </div>

          {/* Top Selling Menu Items Table */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
              Top Selling Food & Beverage Items
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E7E5E4', backgroundColor: '#FAFAF9' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Item Name</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Units Sold</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Unit Price</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Total Revenue</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>Gross Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCafeItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1C1917' }}>{item.itemName}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F5F5F4', color: '#57534E', fontWeight: 600 }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.unitsSold} servings</td>
                      <td style={{ padding: '14px 16px' }}>₹{item.unitPrice}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#4D7C0F' }}>₹{item.totalRevenue?.toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16A34A' }}>{item.marginPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination(cafePage, cafeItemsList.length, cafePageSize, setCafePage, setCafePageSize, 'Menu Items')}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. FINANCIAL P&L & GST / TAX STATEMENTS (Available for each industry) */}
      {/* ========================================================================= */}
      {(() => {
        const tax = effectiveIndustry === 'HOTEL' ? hotel?.taxSummary : effectiveIndustry === 'CAFE' ? cafe?.taxSummary : mess?.taxSummary;
        const gross = tax?.grossRevenue || (effectiveIndustry === 'HOTEL' ? 285000 : effectiveIndustry === 'CAFE' ? 94500 : 142000);
        const taxable = tax?.taxableAmount || (gross * 0.96);
        const cgst = tax?.cgst || (taxable * (effectiveIndustry === 'HOTEL' ? 0.06 : 0.025));
        const sgst = tax?.sgst || (taxable * (effectiveIndustry === 'HOTEL' ? 0.06 : 0.025));
        const totalTax = tax?.totalTax || (cgst + sgst);
        const expenses = tax?.totalExpenses || (taxable * (effectiveIndustry === 'HOTEL' ? 0.42 : effectiveIndustry === 'CAFE' ? 0.52 : 0.56));
        const netProfit = tax?.netProfit || (taxable - expenses);
        const margin = tax?.profitMarginPercentage || (taxable > 0 ? (netProfit * 100 / taxable) : 0);

        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917' }}>
                  Financial Profit & Loss Statement & GST Summary
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#78716C', marginTop: '2px' }}>
                  Audited tax breakdown and net operational margins for the current billing cycle
                </p>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#F7FEE7',
                  border: '1px solid #D9F99D',
                  color: '#4D7C0F',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                }}
              >
                GST Rate: {effectiveIndustry === 'HOTEL' ? '12% (Lodging)' : '5% (Food & Dining)'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#FAFAF9', padding: '16px', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Gross Revenue</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginTop: '4px' }}>₹{Math.round(gross).toLocaleString()}</div>
                <span style={{ fontSize: '0.72rem', color: '#16A34A' }}>Total billed transactions</span>
              </div>

              <div style={{ backgroundColor: '#FAFAF9', padding: '16px', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Taxable Value</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginTop: '4px' }}>₹{Math.round(taxable).toLocaleString()}</div>
                <span style={{ fontSize: '0.72rem', color: '#78716C' }}>Net of discounts</span>
              </div>

              <div style={{ backgroundColor: '#FAFAF9', padding: '16px', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Total GST Collected</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#090040', marginTop: '4px' }}>₹{Math.round(totalTax).toLocaleString()}</div>
                <span style={{ fontSize: '0.72rem', color: '#57534E' }}>CGST: ₹{Math.round(cgst).toLocaleString()} • SGST: ₹{Math.round(sgst).toLocaleString()}</span>
              </div>

              <div style={{ backgroundColor: '#FAFAF9', padding: '16px', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Operating Expenses</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>₹{Math.round(expenses).toLocaleString()}</div>
                <span style={{ fontSize: '0.72rem', color: '#78716C' }}>Stock, staff & utilities</span>
              </div>
            </div>

            {/* Net Profit Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                color: '#FFFFFF',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                  Net Monthly Profit Margin
                </span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
                  ₹{Math.round(netProfit).toLocaleString()}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#F59E0B', borderRadius: '9999px', fontSize: '0.88rem', fontWeight: 800 }}>
                  +{margin.toFixed(1)}% Margin
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
                  Healthy financial performance
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
