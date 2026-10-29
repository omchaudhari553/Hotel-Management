import React, { useState } from 'react';
import {
  TrendingUp,
  Receipt,
  ShoppingBag,
  Users,
  Wallet,
  PiggyBank,
  Calendar,
  Download,
  ChevronRight,
  FileText,
  CheckCircle,
  BarChart2
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Updated Main Tabs (Item Report & Category Report removed)
type MainTab =
  | 'Sales Report'
  | 'Payment Report'
  | 'Expense Report'
  | 'Purchase Report'
  | 'Customer Report';

type DateFilter = 'Today' | 'Yesterday' | 'Last 7 Days' | 'This Month' | 'Custom';

interface KPICardData {
  title: string;
  value: string;
  growth: string;
  isPositive: boolean;
  icon: React.ReactNode;
  bgColor: string;
}

interface TopSellingItem {
  rank: number;
  name: string;
  qtySold: number;
  revenue: string;
  image: string;
}

interface CategorySale {
  rank: number;
  category: string;
  itemsSold: number;
  revenue: string;
  icon: string;
}

interface ReportsManagementProps {
  onNavigateToMenu?: () => void;
}

export const ReportsManagement: React.FC<ReportsManagementProps> = ({ onNavigateToMenu }) => {
  // State Management
  const [activeTab, setActiveTab] = useState<MainTab>('Sales Report');
  const [dateFilter, setDateFilter] = useState<DateFilter>('Last 7 Days');
  const [reportType, setReportType] = useState<string>('Sales Report');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-10');
  const [viewBy, setViewBy] = useState<string>('Daily');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Dynamic Chart & Overview Data mapped according to Active Tab
  const tabDataMap: Record<
    MainTab,
    {
      chartData: { day: string; dineIn: number; takeaway: number; delivery: number }[];
      paymentBreakdown: { name: string; percentage: number; color: string }[];
      totalSalesText: string;
    }
  > = {
    'Sales Report': {
      totalSalesText: '48,250',
      chartData: [
        { day: '04 Sep', dineIn: 2400, takeaway: 1000, delivery: 600 },
        { day: '05 Sep', dineIn: 2600, takeaway: 1200, delivery: 1100 },
        { day: '06 Sep', dineIn: 2800, takeaway: 1500, delivery: 1400 },
        { day: '07 Sep', dineIn: 3400, takeaway: 1600, delivery: 1500 },
        { day: '08 Sep', dineIn: 3200, takeaway: 1400, delivery: 1200 },
        { day: '09 Sep', dineIn: 3600, takeaway: 1700, delivery: 1200 },
        { day: '10 Sep', dineIn: 4500, takeaway: 2700, delivery: 2000 }
      ],
      paymentBreakdown: [
        { name: 'Cash', percentage: 32, color: '#16A34A' },
        { name: 'UPI', percentage: 40, color: '#7C3AED' },
        { name: 'Card', percentage: 18, color: '#3B82F6' },
        { name: 'Others', percentage: 10, color: '#9CA3AF' }
      ]
    },
    'Payment Report': {
      totalSalesText: '52,100',
      chartData: [
        { day: '04 Sep', dineIn: 1800, takeaway: 2000, delivery: 1200 },
        { day: '05 Sep', dineIn: 2200, takeaway: 1800, delivery: 1500 },
        { day: '06 Sep', dineIn: 3000, takeaway: 1200, delivery: 1800 },
        { day: '07 Sep', dineIn: 3200, takeaway: 2200, delivery: 1000 },
        { day: '08 Sep', dineIn: 2900, takeaway: 1900, delivery: 1400 },
        { day: '09 Sep', dineIn: 4000, takeaway: 2100, delivery: 1100 },
        { day: '10 Sep', dineIn: 4200, takeaway: 3000, delivery: 2100 }
      ],
      paymentBreakdown: [
        { name: 'UPI', percentage: 55, color: '#7C3AED' },
        { name: 'Card', percentage: 25, color: '#3B82F6' },
        { name: 'Cash', percentage: 15, color: '#16A34A' },
        { name: 'Others', percentage: 5, color: '#9CA3AF' }
      ]
    },
    'Expense Report': {
      totalSalesText: '12,450',
      chartData: [
        { day: '04 Sep', dineIn: 1000, takeaway: 500, delivery: 200 },
        { day: '05 Sep', dineIn: 1200, takeaway: 400, delivery: 300 },
        { day: '06 Sep', dineIn: 1500, takeaway: 800, delivery: 400 },
        { day: '07 Sep', dineIn: 1100, takeaway: 600, delivery: 500 },
        { day: '08 Sep', dineIn: 1800, takeaway: 900, delivery: 300 },
        { day: '09 Sep', dineIn: 1400, takeaway: 700, delivery: 600 },
        { day: '10 Sep', dineIn: 2000, takeaway: 1000, delivery: 800 }
      ],
      paymentBreakdown: [
        { name: 'Raw Materials', percentage: 45, color: '#DC2626' },
        { name: 'Utilities', percentage: 25, color: '#D97706' },
        { name: 'Salaries', percentage: 20, color: '#2563EB' },
        { name: 'Maintenance', percentage: 10, color: '#9CA3AF' }
      ]
    },
    'Purchase Report': {
      totalSalesText: '28,900',
      chartData: [
        { day: '04 Sep', dineIn: 1500, takeaway: 1200, delivery: 800 },
        { day: '05 Sep', dineIn: 2000, takeaway: 1500, delivery: 1000 },
        { day: '06 Sep', dineIn: 2500, takeaway: 1100, delivery: 1200 },
        { day: '07 Sep', dineIn: 2200, takeaway: 1800, delivery: 900 },
        { day: '08 Sep', dineIn: 2700, takeaway: 1600, delivery: 1400 },
        { day: '09 Sep', dineIn: 3100, takeaway: 2000, delivery: 1500 },
        { day: '10 Sep', dineIn: 3800, takeaway: 2200, delivery: 1800 }
      ],
      paymentBreakdown: [
        { name: 'Dairy & Milk', percentage: 35, color: '#16A34A' },
        { name: 'Coffee Beans', percentage: 30, color: '#7C3AED' },
        { name: 'Packaging', percentage: 20, color: '#3B82F6' },
        { name: 'Vegetables', percentage: 15, color: '#9CA3AF' }
      ]
    },
    'Customer Report': {
      totalSalesText: '286 Cust',
      chartData: [
        { day: '04 Sep', dineIn: 1200, takeaway: 800, delivery: 400 },
        { day: '05 Sep', dineIn: 1500, takeaway: 900, delivery: 600 },
        { day: '06 Sep', dineIn: 1800, takeaway: 1100, delivery: 800 },
        { day: '07 Sep', dineIn: 2000, takeaway: 1300, delivery: 900 },
        { day: '08 Sep', dineIn: 1900, takeaway: 1000, delivery: 700 },
        { day: '09 Sep', dineIn: 2300, takeaway: 1400, delivery: 1000 },
        { day: '10 Sep', dineIn: 2800, takeaway: 1900, delivery: 1500 }
      ],
      paymentBreakdown: [
        { name: 'Repeat', percentage: 60, color: '#16A34A' },
        { name: 'New', percentage: 25, color: '#7C3AED' },
        { name: 'VIP', percentage: 10, color: '#3B82F6' },
        { name: 'Online', percentage: 5, color: '#9CA3AF' }
      ]
    }
  };

  // Professional PDF Generation Function
  const triggerPdfDownload = (title: string) => {
    const doc = new jsPDF() as any;

    // Header Background
    doc.setFillColor(92, 44, 22); // Cafe Brown Header
    doc.rect(0, 0, 210, 30, 'F');

    // Title text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('CAFE MANAGEMENT SYSTEM', 14, 20);

    // Subtitle / Date Info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 20);

    // Decorative Accent Bar
    doc.setFillColor(217, 119, 6); // Gold Accent
    doc.rect(0, 30, 210, 3, 'F');

    // Report Information Box
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(250, 247, 242);
    doc.roundedRect(14, 40, 182, 28, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(92, 44, 22);
    doc.text(`Report: ${title}`, 20, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 20, 60);
    doc.text(`View By: ${viewBy}`, 130, 60);

    // Summary Metric Cards (Professional Layout)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Key Summary Metrics', 14, 78);

    // Table Data Generation
    const tableHeaders = [['Metric / Item', 'Category / Details', 'Qty / Bills', 'Amount (Rs.)']];
    const tableBody = [
      ['Total Revenue', 'Sales & Orders', '412 Bills', 'Rs. 48,250'],
      ['Items Sold', 'Food & Beverages', '876 Units', 'Rs. 48,250'],
      ['Total Expenses', 'Operations & Utility', '24 Receipts', 'Rs. 12,450'],
      ['Net Profit', 'Final Earnings', '-', 'Rs. 35,800'],
      ['Cappuccino (Medium)', 'Beverages', '156 Sold', 'Rs. 26,520'],
      ['Veg Burger', 'Fast Food', '124 Sold', 'Rs. 17,360'],
      ['French Fries', 'Snacks', '118 Sold', 'Rs. 14,160']
    ];

    if (doc.autoTable) {
      doc.autoTable({
        startY: 84,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [92, 44, 22],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [250, 247, 242]
        },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 5
        }
      });
    }

    // Footer
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 150;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('This is an official system-generated report from Cafe Management.', 14, finalY);

    const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`;
    doc.save(fileName);
  };

  // Redirect to Menu Module
  const handleGoToMenu = () => {
    if (onNavigateToMenu) {
      onNavigateToMenu();
    } else {
      window.location.href = '/menu';
    }
  };

  // KPI Data
  const kpiData: KPICardData[] = [
    { title: 'Total Sales', value: '48,250', growth: '12%', isPositive: true, icon: <TrendingUp size={20} color="#16A34A" />, bgColor: '#DCFCE7' },
    { title: 'Total Bills', value: '412', growth: '8%', isPositive: true, icon: <Receipt size={20} color="#2563EB" />, bgColor: '#DBEAFE' },
    { title: 'Items Sold', value: '876', growth: '15%', isPositive: true, icon: <ShoppingBag size={20} color="#D97706" />, bgColor: '#FEF3C7' },
    { title: 'Customers', value: '286', growth: '10%', isPositive: true, icon: <Users size={20} color="#9333EA" />, bgColor: '#F3E8FF' },
    { title: 'Total Expenses', value: '12,450', growth: '5%', isPositive: false, icon: <Wallet size={20} color="#DC2626" />, bgColor: '#FEE2E2' },
    { title: 'Net Profit', value: '35,800', growth: '14%', isPositive: true, icon: <PiggyBank size={20} color="#059669" />, bgColor: '#D1FAE5' }
  ];

  const topSellingItems: TopSellingItem[] = [
    { rank: 1, name: 'Cappuccino (Medium)', qtySold: 156, revenue: '26,520', image: '☕' },
    { rank: 2, name: 'Veg Burger', qtySold: 124, revenue: '17,360', image: '🍔' },
    { rank: 3, name: 'French Fries', qtySold: 118, revenue: '14,160', image: '🍟' },
    { rank: 4, name: 'Iced Latte', qtySold: 96, revenue: '14,400', image: '🥤' },
    { rank: 5, name: 'Margherita Pizza', qtySold: 68, revenue: '13,600', image: '🍕' }
  ];

  const salesByCategory: CategorySale[] = [
    { rank: 1, category: 'Beverages', itemsSold: 284, revenue: '32,450', icon: '☕' },
    { rank: 2, category: 'Fast Food', itemsSold: 212, revenue: '18,760', icon: '🍔' },
    { rank: 3, category: 'Pizzas', itemsSold: 108, revenue: '16,200', icon: '🍕' },
    { rank: 4, category: 'Snacks', itemsSold: 96, revenue: '11,520', icon: '🍿' },
    { rank: 5, category: 'Desserts', itemsSold: 64, revenue: '7,840', icon: '🍰' }
  ];

  const quickReports = [
    'Today\'s Sales Report',
    'Monthly Sales Report',
    'Top Selling Items',
    'Low Stock Report',
    'Expense Summary',
    'Profit & Loss Report',
    'Customer Report'
  ];

  const currentTabData = tabDataMap[activeTab];

  return (
    <div style={styles.pageBackground}>
      {/* Top Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.mainTitle}>Reports</h1>
          <p style={styles.subTitle}>Insights to grow your business</p>
        </div>
        <div style={styles.dateFilterContainer}>
          <Calendar size={18} color="#6B7280" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            style={styles.dateSelect}
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="This Month">This Month</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div style={styles.kpiGrid}>
        {kpiData.map((kpi, idx) => {
          const isSelected = selectedCard === kpi.title;
          return (
            <div
              key={idx}
              onClick={() => setSelectedCard(kpi.title)}
              style={{
                ...styles.kpiCard,
                ...(isSelected ? styles.activeKpiCard : {})
              }}
            >
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: kpi.bgColor }}>
                {kpi.icon}
              </div>
              <div>
                <div style={styles.kpiValue}>{kpi.value}</div>
                <div style={styles.kpiTitle}>{kpi.title}</div>
                <div style={{ ...styles.kpiGrowth, color: kpi.isPositive ? '#16A34A' : '#DC2626' }}>
                  {kpi.isPositive ? '▲' : '▼'} {kpi.growth}{' '}
                  <span style={styles.kpiSubtext}>vs previous period</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Main Tabs (Item & Category Report buttons removed) */}
      <div style={styles.tabsContainer}>
        {(
          [
            'Sales Report',
            'Payment Report',
            'Expense Report',
            'Purchase Report',
            'Customer Report'
          ] as MainTab[]
        ).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setReportType(tab);
              }}
              style={{
                ...styles.tabButton,
                ...(isActive ? styles.activeTabButton : styles.inactiveTabButton)
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Middle Grid */}
      <div style={styles.middleGrid}>
        {/* Sales Overview Bar Chart (Dynamic based on selected tab) */}
        <div style={styles.chartCard}>
          <div style={styles.cardHeaderFlex}>
            <h3 style={styles.cardTitle}>{activeTab} Overview</h3>
            <div style={styles.chartLegend}>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#6B3E26' }}></span> Dine In
              </span>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#B86F43' }}></span> Takeaway
              </span>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#F3B178' }}></span> Delivery
              </span>
            </div>
          </div>
          <div style={styles.barChartWrapper}>
            <div style={styles.yAxisLabels}>
              <span>10,000</span>
              <span>8,000</span>
              <span>6,000</span>
              <span>4,000</span>
              <span>2,000</span>
              <span>0</span>
            </div>
            <div style={styles.barsContainer}>
              {currentTabData.chartData.map((item, index) => {
                const total = item.dineIn + item.takeaway + item.delivery;
                const totalHeightPct = (total / 10000) * 100;
                const dineInPct = (item.dineIn / total) * 100;
                const takeawayPct = (item.takeaway / total) * 100;
                const deliveryPct = (item.delivery / total) * 100;
                return (
                  <div key={index} style={styles.barColumn}>
                    <div style={{ ...styles.stackedBarTrack, height: `${totalHeightPct}%` }}>
                      <div style={{ ...styles.deliverySegment, height: `${deliveryPct}%` }} />
                      <div style={{ ...styles.takeawaySegment, height: `${takeawayPct}%` }} />
                      <div style={{ ...styles.dineInSegment, height: `${dineInPct}%` }} />
                    </div>
                    <span style={styles.xAxisLabel}>{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sales by Payment Method (Dynamic based on selected tab) */}
        <div style={styles.paymentCard}>
          <h3 style={styles.cardTitle}>{activeTab} Breakdown</h3>
          <div style={styles.donutFlexContainer}>
            <div style={styles.donutChartWrapper}>
              <svg viewBox="0 0 100 100" style={{ width: '140px', height: '140px' }}>
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#16A34A" strokeWidth="18" strokeDasharray="32 68" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#7C3AED" strokeWidth="18" strokeDasharray="40 60" strokeDashoffset="-32" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3B82F6" strokeWidth="18" strokeDasharray="18 82" strokeDashoffset="-72" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#9CA3AF" strokeWidth="18" strokeDasharray="10 90" strokeDashoffset="-90" />
              </svg>
              <div style={styles.donutCenterText}>
                <div style={styles.donutCenterAmount}>{currentTabData.totalSalesText}</div>
                <div style={styles.donutCenterLabel}>Total</div>
              </div>
            </div>
            <div style={styles.paymentLegendList}>
              {currentTabData.paymentBreakdown.map((pay, idx) => (
                <div key={idx} style={styles.paymentLegendRow}>
                  <span style={{ ...styles.dot, backgroundColor: pay.color }}></span>
                  <span style={styles.paymentName}>{pay.name}</span>
                  <span style={styles.paymentVal}>{pay.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Report Form */}
        <div style={styles.generateCard}>
          <h3 style={styles.cardTitle}>Generate Report</h3>
          <div style={styles.formStack}>
            <div>
              <label style={styles.formLabel}>Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={styles.formSelect}
              >
                <option value="Sales Report">Sales Report</option>
                <option value="Payment Report">Payment Report</option>
                <option value="Expense Report">Expense Report</option>
                <option value="Purchase Report">Purchase Report</option>
                <option value="Customer Report">Customer Report</option>
              </select>
            </div>
            <div>
              <label style={styles.formLabel}>Date Range</label>
              <div style={styles.dateRangeBox}>
                <Calendar size={16} color="#5C2C16" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.calendarInput}
                />
                <span style={{ color: '#9CA3AF' }}>-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.calendarInput}
                />
              </div>
            </div>
            <div>
              <label style={styles.formLabel}>View By</label>
              <select
                value={viewBy}
                onChange={(e) => setViewBy(e.target.value)}
                style={styles.formSelect}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <button
              onClick={() => triggerPdfDownload(reportType)}
              style={styles.generateButton}
            >
              <BarChart2 size={16} /> Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={styles.bottomGrid}>
        {/* Top Selling Items */}
        <div style={styles.tableCard}>
          <div style={styles.cardHeaderFlex}>
            <h3 style={styles.cardTitle}>Top Selling Items</h3>
            <button onClick={handleGoToMenu} style={styles.viewAllBtn}>
              View All
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={{ ...styles.th, width: '30px' }}>#</th>
                <th style={styles.th}>Item</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Qty Sold</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {topSellingItems.map((item) => (
                <tr key={item.rank} style={styles.tableBodyRow}>
                  <td style={styles.tdRank}>{item.rank}</td>
                  <td style={styles.tdItem}>
                    <span>{item.image}</span>
                    <span style={styles.itemName}>{item.name}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{item.qtySold}</td>
                  <td style={{ ...styles.tdRevenue, textAlign: 'right' }}>{item.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sales by Category */}
        <div style={styles.tableCard}>
          <div style={styles.cardHeaderFlex}>
            <h3 style={styles.cardTitle}>Sales by Category</h3>
            <button onClick={handleGoToMenu} style={styles.viewAllBtn}>
              View All
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={{ ...styles.th, width: '30px' }}>#</th>
                <th style={styles.th}>Category</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Items Sold</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {salesByCategory.map((cat) => (
                <tr key={cat.rank} style={styles.tableBodyRow}>
                  <td style={styles.tdRank}>{cat.rank}</td>
                  <td style={styles.tdItem}>
                    <span>{cat.icon}</span>
                    <span style={styles.itemName}>{cat.category}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{cat.itemsSold}</td>
                  <td style={{ ...styles.tdRevenue, textAlign: 'right' }}>{cat.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Reports List */}
        <div style={styles.quickCard}>
          <h3 style={styles.cardTitle}>Quick Reports</h3>
          <div style={styles.quickList}>
            {quickReports.map((qReport, idx) => (
              <button
                key={idx}
                onClick={() => triggerPdfDownload(qReport)}
                style={styles.quickRowBtn}
              >
                <div style={styles.quickLeft}>
                  <FileText size={16} color="#687280" />
                  <span>{qReport}</span>
                </div>
                <ChevronRight size={16} color="#9CA3AF" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Notice & Export Button */}
      <div style={styles.footerBar}>
        <div style={styles.footerNotice}>
          <CheckCircle size={18} color="#16A34A" />
          <span>Reports are generated from real-time data. All amounts are inclusive of applicable taxes.</span>
        </div>
        <button
          onClick={() => triggerPdfDownload(`${activeTab}_Summary`)}
          style={styles.exportBtn}
        >
          <Download size={16} /> Export Report (PDF)
        </button>
      </div>
    </div>
  );
};

// CSS Styles (Cafe Management Theme)
const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    backgroundColor: '#FAF7F2',
    minHeight: '100vh',
    padding: '24px 32px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#1F2937'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#111827',
    margin: 0
  },
  subTitle: {
    fontSize: '14px',
    color: '#687280',
    margin: '4px 0 0 0'
  },
  dateFilterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    padding: '8px 14px',
    borderRadius: '8px'
  },
  dateSelect: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  activeKpiCard: {
    borderColor: '#5C2C16',
    boxShadow: '0 0 0 2px #5C2C16',
    backgroundColor: '#FFFDF9'
  },
  kpiIconWrapper: {
    padding: '10px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#111827'
  },
  kpiTitle: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#687280',
    marginTop: '2px'
  },
  kpiGrowth: {
    fontSize: '11px',
    fontWeight: '700',
    marginTop: '4px'
  },
  kpiSubtext: {
    fontSize: '10px',
    color: '#9CA3AF',
    fontWeight: '400'
  },
  tabsContainer: {
    display: 'flex',
    backgroundColor: '#FFFFFF',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid #E5E7EB',
    gap: '4px',
    marginBottom: '20px',
    overflowX: 'auto'
  },
  tabButton: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  activeTabButton: {
    backgroundColor: '#5C2C16',
    color: '#FFFFFF'
  },
  inactiveTabButton: {
    backgroundColor: 'transparent',
    color: '#4B5563'
  },
  middleGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB'
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB'
  },
  generateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB'
  },
  cardHeaderFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  chartLegend: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#6B7280'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  barChartWrapper: {
    display: 'flex',
    gap: '12px',
    height: '180px',
    alignItems: 'flex-end',
    paddingTop: '20px'
  },
  yAxisLabels: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    fontSize: '11px',
    color: '#9CA3AF'
  },
  barsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flex: 1,
    height: '100%',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '4px'
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: '32px'
  },
  stackedBarTrack: {
    width: '24px',
    borderRadius: '4px 4px 0 0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  deliverySegment: { backgroundColor: '#F3B178' },
  takeawaySegment: { backgroundColor: '#B86F43' },
  dineInSegment: { backgroundColor: '#6B3E26' },
  xAxisLabel: {
    fontSize: '11px',
    color: '#687280',
    marginTop: '6px'
  },
  donutFlexContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '16px'
  },
  donutChartWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  donutCenterText: {
    position: 'absolute',
    textAlign: 'center'
  },
  donutCenterAmount: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#111827'
  },
  donutCenterLabel: {
    fontSize: '10px',
    color: '#687280'
  },
  paymentLegendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1
  },
  paymentLegendRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px'
  },
  paymentName: {
    flex: 1,
    color: '#4B5563',
    fontWeight: '500'
  },
  paymentVal: {
    fontWeight: '700',
    color: '#111827'
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '14px'
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    display: 'block',
    marginBottom: '4px'
  },
  formSelect: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '13px',
    outline: 'none'
  },
  dateRangeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF'
  },
  calendarInput: {
    border: 'none',
    outline: 'none',
    fontSize: '11px',
    fontFamily: 'inherit',
    color: '#111827',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  },
  generateButton: {
    backgroundColor: '#5C2C16',
    color: '#FFFFFF',
    padding: '10px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '4px'
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.2fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB'
  },
  viewAllBtn: {
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '8px'
  },
  tableHeaderRow: {
    borderBottom: '1px solid #E5E7EB'
  },
  th: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#687280',
    paddingBottom: '8px',
    textAlign: 'left'
  },
  tableBodyRow: {
    borderBottom: '1px solid #F3F4F6'
  },
  tdRank: {
    fontSize: '12px',
    color: '#9CA3AF',
    padding: '10px 0'
  },
  tdItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 0'
  },
  itemName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827'
  },
  td: {
    fontSize: '13px',
    color: '#4B5563'
  },
  tdRevenue: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#111827'
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB'
  },
  quickList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '12px'
  },
  quickRowBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#FAF7F2',
    border: '1px solid #F3EFEA',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500'
  },
  quickLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  footerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '14px 20px',
    borderRadius: '10px',
    border: '1px solid #E5E7EB'
  },
  footerNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#4B5563'
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer'
  }
};

export default ReportsManagement;