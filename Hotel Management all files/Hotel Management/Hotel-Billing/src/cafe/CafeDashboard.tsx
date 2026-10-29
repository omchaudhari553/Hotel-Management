import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { kotService } from '../services/kotService';
import { reportService } from '../services/reportService';
import { FileText, Plus, X, ShoppingBag, Utensils, Clock, LayoutGrid, BarChart2, Settings } from 'lucide-react';

interface TopItem {
  id: number;
  name: string;
  count: number;
}

interface OrderItem {
  id: string;
  time: string;
  table: string;
  items: string;
  amount: string;
  status: 'Paid' | 'Preparing' | 'Served';
}

interface KOTItem {
  id: string;
  table: string;
  items: string;
  time: string;
  status: 'Preparing' | 'Pending';
}

export const CafeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [salesTimeframe, setSalesTimeframe] = useState<'today' | 'weekly' | 'monthly' | 'yearly'>('today');
  const [activePopup, setActivePopup] = useState<string | null>(null);

  // Timeframe Data mapping with precise graph coordinates and labels
  const salesDataMap: Record<string, {
    total: string;
    percent: string;
    path: string;
    yLabels: string[];
    xLabels: string[];
    points: { cx: number; cy: number; val: string }[];
  }> = {
    today: {
      total: '₹12,480',
      percent: '↑ 18% vs yesterday',
      path: 'M 40,110 L 85,85 L 130,80 L 175,55 L 220,60 L 265,30 L 310,40 L 355,15',
      yLabels: ['₹6K', '₹4K', '₹2K', '₹0'],
      xLabels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'],
      points: [
        { cx: 40, cy: 110, val: '₹800' },
        { cx: 85, cy: 85, val: '₹1.8K' },
        { cx: 130, cy: 80, val: '₹2.1K' },
        { cx: 175, cy: 55, val: '₹3.4K' },
        { cx: 220, cy: 60, val: '₹3.1K' },
        { cx: 265, cy: 30, val: '₹4.8K' },
        { cx: 310, cy: 40, val: '₹4.3K' },
        { cx: 355, cy: 15, val: '₹5.6K' }
      ]
    },
    weekly: {
      total: '₹84,500',
      percent: '↑ 12% vs last week',
      path: 'M 40,100 L 92,70 L 144,50 L 196,65 L 248,30 L 300,20 L 355,40',
      yLabels: ['₹20K', '₹15K', '₹10K', '₹0'],
      xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      points: [
        { cx: 40, cy: 100, val: '₹11K' },
        { cx: 92, cy: 70, val: '₹10.5K' },
        { cx: 144, cy: 50, val: '₹12K' },
        { cx: 196, cy: 65, val: '₹11.8K' },
        { cx: 248, cy: 30, val: '₹13.5K' },
        { cx: 300, cy: 20, val: '₹14.2K' },
        { cx: 355, cy: 40, val: '₹11.5K' }
      ]
    },
    monthly: {
      total: '₹3,65,000',
      percent: '↑ 22% vs last month',
      path: 'M 40,110 L 145,70 L 250,40 L 355,15',
      yLabels: ['₹100K', '₹75K', '₹50K', '₹0'],
      xLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      points: [
        { cx: 40, cy: 110, val: '₹82K' },
        { cx: 145, cy: 70, val: '₹91K' },
        { cx: 250, cy: 40, val: '₹95K' },
        { cx: 355, cy: 15, val: '₹97K' }
      ]
    },
    yearly: {
      total: '₹42,80,000',
      percent: '↑ 15% vs last year',
      path: 'M 40,100 L 145,70 L 250,45 L 355,20',
      yLabels: ['₹12L', '₹9L', '₹6L', '₹0'],
      xLabels: ['Q1', 'Q2', 'Q3', 'Q4'],
      points: [
        { cx: 40, cy: 100, val: '₹9.5L' },
        { cx: 145, cy: 70, val: '₹10.5L' },
        { cx: 250, cy: 45, val: '₹11.2L' },
        { cx: 355, cy: 20, val: '₹11.6L' }
      ]
    }
  };

  const topSellingItems: TopItem[] = [
    { id: 1, name: 'Hazelnut Cold Coffee', count: 24 },
    { id: 2, name: 'Paneer Tikka Sandwich', count: 18 },
    { id: 3, name: 'Cappuccino', count: 16 },
    { id: 4, name: 'Cold Brew', count: 14 },
    { id: 5, name: 'Latte', count: 12 },
  ];

  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([
    { id: '#1068', time: '11:18 AM', table: 'T4', items: '2 items', amount: '₹363.00', status: 'Paid' },
    { id: '#1067', time: '11:05 AM', table: 'T2', items: '3 items', amount: '₹480.00', status: 'Preparing' },
    { id: '#1066', time: '10:52 AM', table: 'T1', items: '1 item', amount: '₹180.00', status: 'Served' },
  ]);

  const [activeKOTs, setActiveKOTs] = useState<KOTItem[]>([
    { id: '#K204', table: 'T2', items: '3 items', time: '12 min', status: 'Preparing' },
    { id: '#K203', table: 'T6', items: '2 items', time: '18 min', status: 'Preparing' },
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [orders, kots] = await Promise.all([
          orderService.getOrders().catch(() => []),
          kotService.getKots().catch(() => []),
        ]);

        if (orders && orders.length > 0) {
          setRecentOrders(
            orders.slice(0, 5).map((o: any) => ({
              id: `#${o.id}`,
              time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
              table: o.tableName || (o.tableId ? `T${o.tableId}` : 'Takeaway'),
              items: `${(o.items || []).length} items`,
              amount: `₹${Number(o.totalAmount || 0).toFixed(2)}`,
              status: o.status === 'PAID' ? 'Paid' : o.status === 'PREPARING' ? 'Preparing' : 'Served',
            }))
          );
        }

        if (kots && kots.length > 0) {
          setActiveKOTs(
            kots.filter((k: any) => k.status !== 'SERVED').slice(0, 5).map((k: any) => ({
              id: k.kotNumber || `#K${k.id}`,
              table: k.tableName || (k.tableNumber ? `T${k.tableNumber}` : 'T1'),
              items: `${(k.items || []).length || 1} items`,
              time: 'Just now',
              status: k.status === 'PREPARING' ? 'Preparing' : 'Pending',
            }))
          );
        }
      } catch (e) {
        console.error('Error fetching cafe dashboard data', e);
      }
    };
    fetchDashboardData();
  }, []);

  // Professional PDF Print & Download Handler
  const handleGenerateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cafe Sales Report - ${salesTimeframe.toUpperCase()}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #a8583b; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 26px; font-weight: 800; color: #a8583b; letter-spacing: -0.5px; }
          .title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666; font-weight: 700; margin-top: 4px; }
          .meta { text-align: right; font-size: 12px; color: #555; line-height: 1.6; }
          .section-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 30px 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 6px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .kpi-card { background: #fdfbf7; border: 1px solid #f0e6dd; border-radius: 8px; padding: 15px; }
          .kpi-label { font-size: 11px; color: #777; font-weight: 600; text-transform: uppercase; }
          .kpi-val { font-size: 20px; font-weight: 800; color: #a8583b; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f8f8f8; text-align: left; padding: 10px; font-weight: 700; color: #444; border-bottom: 2px solid #ddd; }
          td { padding: 10px; border-bottom: 1px solid #eee; color: #333; }
          .badge { padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; display: inline-block; }
          .paid { background: #d1fae5; color: #065f46; }
          .preparing { background: #fef3c7; color: #92400e; }
          .served { background: #e0f2fe; color: #0369a1; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">BISTRO POS</div>
            <div class="title">Sales Performance Report</div>
          </div>
          <div class="meta">
            <div><strong>Timeframe:</strong> ${salesTimeframe.toUpperCase()}</div>
            <div><strong>Date:</strong> 12 Sept 2026</div>
            <div><strong>Status:</strong> Generated Automatically</div>
          </div>
        </div>

        <div class="section-title">Executive Summary</div>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-label">Total Revenue</div><div class="kpi-val">${salesDataMap[salesTimeframe].total}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total Orders</div><div class="kpi-val">42</div></div>
          <div class="kpi-card"><div class="kpi-label">Avg Order Value</div><div class="kpi-val">₹297</div></div>
          <div class="kpi-card"><div class="kpi-label">Table Occupancy</div><div class="kpi-val">41%</div></div>
        </div>

        <div class="section-title">Top Selling Items</div>
        <table>
          <thead>
            <tr><th>#</th><th>Item Name</th><th>Units Sold</th></tr>
          </thead>
          <tbody>
            ${topSellingItems.map(item => `
              <tr>
                <td><strong>#${item.id}</strong></td>
                <td>${item.name}</td>
                <td><strong>${item.count}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Recent Order Transactions</div>
        <table>
          <thead>
            <tr><th>Order ID</th><th>Time</th><th>Table</th><th>Items</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${recentOrders.map(ord => `
              <tr>
                <td><strong>${ord.id}</strong></td>
                <td>${ord.time}</td>
                <td>${ord.table}</td>
                <td>${ord.items}</td>
                <td><strong>${ord.amount}</strong></td>
                <td><span class="badge ${ord.status.toLowerCase()}">${ord.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Confidential POS System Generated Report • Cafe Bistro Analytics
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
  };

  const currentSalesObj = salesDataMap[salesTimeframe];

  return (
    <div style={{
      backgroundColor: '#f6f4f0',
      minHeight: '100vh',
      padding: '24px 32px',
      fontFamily: "'Inter', sans-serif",
      color: '#2d2d2d'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1a1a1a' }}>Good Morning! ☕</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>Here's your cafe performance today.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleGenerateReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <FileText size={16} color="#555" />
            <span>Generate Report</span>
          </button>

          {/* New Order Button */}
          <button
            onClick={() => setActivePopup("Redirecting to New Order Module...")}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#a8583b',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(168, 88, 59, 0.25)'
            }}
          >
            <Plus size={18} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Cards Row - NOT CLICKABLE (NO POPUP) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={nonClickableCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={cardTitleStyle}>Total Orders</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: '#e6f4ea', color: '#137333' }}>🛒</div>
          </div>
          <div style={cardValueStyle}>42</div>
          <div style={{ fontSize: '11px', color: '#137333', marginTop: '4px' }}>↑ 12% vs yesterday</div>
        </div>

        <div style={nonClickableCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={cardTitleStyle}>Total Sales</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: '#e6f4ea', color: '#137333' }}>₹</div>
          </div>
          <div style={cardValueStyle}>{currentSalesObj.total}</div>
          <div style={{ fontSize: '11px', color: '#137333', marginTop: '4px' }}>{currentSalesObj.percent}</div>
        </div>

        <div style={nonClickableCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={cardTitleStyle}>Pending KOTs</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: '#fef7e0', color: '#b06000' }}>⏱</div>
          </div>
          <div style={{ ...cardValueStyle, color: '#d93025' }}>5</div>
          <div style={{ fontSize: '11px', color: '#d93025', marginTop: '4px' }}>Need attention</div>
        </div>

        <div style={nonClickableCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={cardTitleStyle}>Tables Occupied</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: '#e8f0fe', color: '#1a73e8' }}>🍽</div>
          </div>
          <div style={cardValueStyle}>5/12</div>
          <div style={{ fontSize: '11px', color: '#1a73e8', marginTop: '4px' }}>↑ 41% occupancy</div>
        </div>

        <div style={nonClickableCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={cardTitleStyle}>Average Order Value</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: '#f3e8fd', color: '#9333ea' }}>🛍</div>
          </div>
          <div style={cardValueStyle}>₹297</div>
          <div style={{ fontSize: '11px', color: '#137333', marginTop: '4px' }}>↑ 9% vs yesterday</div>
        </div>
      </div>

      {/* Middle Main Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Full Graph Card */}
        <div style={boxCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={sectionHeadingStyle}>{salesTimeframe.toUpperCase()} Sales Graph</h3>
            <select
              value={salesTimeframe}
              onChange={(e) => setSalesTimeframe(e.target.value as any)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <option value="today">Today</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '170px' }}>
            <svg viewBox="0 0 380 150" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="brownArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Y-Axis Labels & Grid Lines */}
              <line x1="35" y1="20" x2="370" y2="20" stroke="#f0f0f0" strokeDasharray="3,3" />
              <line x1="35" y1="50" x2="370" y2="50" stroke="#f0f0f0" strokeDasharray="3,3" />
              <line x1="35" y1="80" x2="370" y2="80" stroke="#f0f0f0" strokeDasharray="3,3" />
              <line x1="35" y1="110" x2="370" y2="110" stroke="#e0e0e0" />

              <text x="5" y="24" fontSize="10" fill="#777" fontWeight="600">{currentSalesObj.yLabels[0]}</text>
              <text x="5" y="54" fontSize="10" fill="#777" fontWeight="600">{currentSalesObj.yLabels[1]}</text>
              <text x="5" y="84" fontSize="10" fill="#777" fontWeight="600">{currentSalesObj.yLabels[2]}</text>
              <text x="15" y="114" fontSize="10" fill="#777" fontWeight="600">{currentSalesObj.yLabels[3]}</text>

              {/* Shaded Area & Line */}
              <path d={`${currentSalesObj.path} L 355,110 L 40,110 Z`} fill="url(#brownArea)" />
              <path d={currentSalesObj.path} fill="none" stroke="#a8583b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Point Nodes */}
              {currentSalesObj.points.map((pt, i) => (
                <circle key={i} cx={pt.cx} cy={pt.cy} r="4.5" fill="#7c2d12" stroke="#ffffff" strokeWidth="1.5" />
              ))}
            </svg>

            {/* Below X-Axis Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '35px', paddingRight: '10px', fontSize: '10px', color: '#888', fontWeight: '600', marginTop: '-12px' }}>
              {currentSalesObj.xLabels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Top Selling Items Card */}
        <div style={boxCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={sectionHeadingStyle}>Top Selling Items</h3>
            <button onClick={() => setActivePopup("Navigating to Menu & Pricing Module...")} style={viewAllButtonStyle}>
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topSellingItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px dashed #eee', paddingBottom: '6px' }}>
                <span style={{ color: '#333' }}>{item.id}. {item.name}</span>
                <span style={{ fontWeight: '700', color: '#1a1a1a' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Category Donut Chart */}
        <div style={boxCardStyle}>
          <h3 style={{ ...sectionHeadingStyle, marginBottom: '14px' }}>Sales by Category</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '85px',
              height: '85px',
              borderRadius: '50%',
              background: 'conic-gradient(#a8583b 0% 45%, #d97706 45% 70%, #16a34a 70% 88%, #9333ea 88% 96%, #6b7280 96% 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ width: '55px', height: '55px', backgroundColor: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: '800' }}>{currentSalesObj.total}</span>
                <span style={{ fontSize: '7px', color: '#777' }}>Total</span>
              </div>
            </div>
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><span style={{ color: '#a8583b' }}>●</span> Beverages 45%</div>
              <div><span style={{ color: '#d97706' }}>●</span> Snacks 25%</div>
              <div><span style={{ color: '#16a34a' }}>●</span> Food 18%</div>
              <div><span style={{ color: '#9333ea' }}>●</span> Desserts 8%</div>
              <div><span style={{ color: '#6b7280' }}>●</span> Others 4%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Main Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px' }}>
        
        {/* Recent Orders Card */}
        <div style={boxCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={sectionHeadingStyle}>Recent Orders</h3>
            <button onClick={() => navigate('/cafe/order-history')} style={viewAllButtonStyle}>
              View All
            </button>
          </div>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={{ paddingBottom: '6px' }}>#</th>
                <th style={{ paddingBottom: '6px' }}>Time</th>
                <th style={{ paddingBottom: '6px' }}>Table</th>
                <th style={{ paddingBottom: '6px' }}>Items</th>
                <th style={{ paddingBottom: '6px' }}>Amount</th>
                <th style={{ paddingBottom: '6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((ord, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '8px 0', fontWeight: '700' }}>{ord.id}</td>
                  <td style={{ color: '#666' }}>{ord.time}</td>
                  <td>{ord.table}</td>
                  <td style={{ color: '#666' }}>{ord.items}</td>
                  <td style={{ fontWeight: '600' }}>{ord.amount}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: ord.status === 'Paid' ? '#d1fae5' : ord.status === 'Preparing' ? '#fef3c7' : '#e0f2fe',
                      color: ord.status === 'Paid' ? '#065f46' : ord.status === 'Preparing' ? '#92400e' : '#0369a1'
                    }}>
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Active KOTs Card */}
        <div style={boxCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={sectionHeadingStyle}>Active KOTs</h3>
            <button onClick={() => navigate('/hotel/kot')} style={viewAllButtonStyle}>
              View All
            </button>
          </div>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={{ paddingBottom: '6px' }}>KOT #</th>
                <th style={{ paddingBottom: '6px' }}>Table</th>
                <th style={{ paddingBottom: '6px' }}>Items</th>
                <th style={{ paddingBottom: '6px' }}>Time</th>
                <th style={{ paddingBottom: '6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeKOTs.map((kot, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '8px 0', fontWeight: '700' }}>{kot.id}</td>
                  <td>{kot.table}</td>
                  <td style={{ color: '#666' }}>{kot.items}</td>
                  <td style={{ color: '#666' }}>{kot.time}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: kot.status === 'Preparing' ? '#fef3c7' : '#fee2e2',
                      color: kot.status === 'Preparing' ? '#92400e' : '#b91c1c'
                    }}>
                      {kot.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions Card Grid */}
        <div style={boxCardStyle}>
          <h3 style={{ ...sectionHeadingStyle, marginBottom: '14px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div onClick={() => navigate('/cafe/new-order')} style={{ ...quickCardStyle, backgroundColor: '#fef2f2' }}>
              <div style={{ color: '#dc2626', marginBottom: '4px' }}>🛒</div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>New Order</span>
            </div>

            <div onClick={() => navigate('/cafe/tables')} style={{ ...quickCardStyle, backgroundColor: '#f0fdf4' }}>
              <div style={{ color: '#16a34a', marginBottom: '4px' }}>🍽</div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Floor Layout</span>
            </div>

            <div onClick={() => navigate('/cafe/menu')} style={{ ...quickCardStyle, backgroundColor: '#eff6ff' }}>
              <div style={{ color: '#2563eb', marginBottom: '4px' }}>📋</div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af' }}>Menu & Pricing</span>
            </div>

            <div onClick={() => navigate('/hotel/kot')} style={{ ...quickCardStyle, backgroundColor: '#fff7ed' }}>
              <div style={{ color: '#ea580c', marginBottom: '4px' }}>⏱</div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#9a3412' }}>View KOTs</span>
            </div>

            <div onClick={() => navigate('/cafe/reports')} style={{ ...quickCardStyle, backgroundColor: '#f3e8fd' }}>
              <div style={{ color: '#9333ea', marginBottom: '4px' }}>📊</div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b21a8' }}>Reports</span>
            </div>

            <div onClick={() => navigate('/settings')} style={{ ...quickCardStyle, backgroundColor: '#f3f4f6' }}>
              <div style={{ color: '#4b5563', marginBottom: '4px' }}>⚙️</div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1f2937' }}>Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Navigation Popup Modal */}
      {activePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '24px 32px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px 5px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            position: 'relative'
          }}>
            <button
              onClick={() => setActivePopup(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={18} color="#888" />
            </button>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '700', color: '#a8583b' }}>
              Module Navigation
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#444' }}>
              {activePopup}
            </p>
            <button
              onClick={() => setActivePopup(null)}
              style={{
                backgroundColor: '#a8583b',
                color: '#fff',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Common Styles
const nonClickableCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  border: '1px solid #eaeaea',
  userSelect: 'none'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
  fontWeight: '600'
};

const cardValueStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#1a1a1a',
  marginTop: '8px'
};

const iconBadgeStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px'
};

const boxCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '18px',
  borderRadius: '12px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  border: '1px solid #eaeaea'
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '800',
  color: '#1a1a1a',
  margin: 0
};

const viewAllButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#a8583b',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer'
};

const quickCardStyle: React.CSSProperties = {
  padding: '16px 12px',
  borderRadius: '10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  textAlign: 'center'
};

export default CafeDashboard;