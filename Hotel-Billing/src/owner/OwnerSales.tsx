import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Filter,
  Calendar,
  Building2,
  RefreshCw,
  CreditCard,
  Download,
  Receipt,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  ReceiptIndianRupee,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ownerService, OwnerSalesData, BranchRecord } from './ownerService';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const OwnerSales: React.FC = () => {
  const { language, toDevanagari, localizeName } = useLanguage();
  const [salesData, setSalesData] = useState<OwnerSalesData | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [period, setPeriod] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  const { showToast } = useToast();

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedBranchId) params.branchId = Number(selectedBranchId);

      let fStart = startDate;
      let fEnd = endDate;
      if (period !== 'custom') {
        const today = new Date();
        const toYmd = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        if (period === 'today') {
          fStart = toYmd(today);
          fEnd = toYmd(today);
        } else if (period === 'this-week') {
          const day = today.getDay();
          const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
          const mon = new Date(today.getFullYear(), today.getMonth(), diffToMon);
          const sun = new Date(mon);
          sun.setDate(mon.getDate() + 6);
          fStart = toYmd(mon);
          fEnd = toYmd(sun);
        } else if (period === 'this-month') {
          const first = new Date(today.getFullYear(), today.getMonth(), 1);
          const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          fStart = toYmd(first);
          fEnd = toYmd(last);
        } else if (period === 'this-year') {
          const first = new Date(today.getFullYear(), 0, 1);
          const last = new Date(today.getFullYear(), 11, 31);
          fStart = toYmd(first);
          fEnd = toYmd(last);
        } else if (period === 'all-time') {
          fStart = '';
          fEnd = '';
        }
      }

      if (fStart) params.startDate = fStart;
      if (fEnd) params.endDate = fEnd;
      if (selectedMonth) params.month = Number(selectedMonth);
      if (selectedYear) params.year = Number(selectedYear);

      const [salesRes, branchRes] = await Promise.all([
        ownerService.getSales(params),
        ownerService.getBranches(),
      ]);
      setSalesData(salesRes);
      setBranches(branchRes);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to fetch branch-wise sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedBranchId, period, startDate, endDate, selectedMonth, selectedYear]);

  const handleResetFilters = () => {
    setSelectedBranchId('');
    setPeriod('this-month');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setSelectedYear(String(new Date().getFullYear()));
  };

  const formatCurrency = (amt: number | undefined) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amt || 0));
    return language === 'mr' ? toDevanagari(formatted) : formatted;
  };

  const handleExportCSV = () => {
    if (!salesData?.branches?.length) {
      showToast('error', 'No sales data available to export.');
      return;
    }
    const headers = ['Branch Name', 'City', 'Today Sales', 'Weekly Sales', 'Monthly Sales', 'Yearly Sales', 'Total Sales', 'Invoices Count'];
    const rows = salesData.branches.map((b) => [
      `"${b.branchName}"`,
      `"${b.city}"`,
      b.todaySales,
      b.weeklySales,
      b.monthlySales,
      b.yearlySales,
      b.totalSales,
      b.invoiceCount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `branch_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Branch-wise sales report exported as CSV.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'शाखानिहाय विक्री कामगिरी' : 'Branch-wise Sales Performance'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchSales}
            className="owner-btn-secondary"
            title={language === 'mr' ? 'रीफ्रेश करा' : 'Refresh'}
            aria-label="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              padding: 0,
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#B45309',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(180, 83, 9, 0.25)',
            }}
          >
            <Download size={15} />
            <span>{language === 'mr' ? 'CSV एक्सपोर्ट करा' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Report Scope & Dates matching Image 1 */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '14px 20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontWeight: 700, fontSize: '0.86rem' }}>
          <Filter size={16} />
          <span>{language === 'mr' ? 'अहवाल व्याप्ती आणि तारखा:' : 'Report Scope & Dates:'}</span>
        </div>

        {/* Branch selector */}
        <div>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            style={selectStyle}
          >
            <option value="">{language === 'mr' ? 'सर्व सक्रिय शाखा एकत्रित' : 'All Active Branches Consolidated'}</option>
            {branches.filter(b => b.status === 'ACTIVE').map((b) => (
              <option key={b.id} value={b.id}>
                {language === 'mr'
                  ? `शाखा: ${localizeName(b.name)} (${b.city ? localizeName(b.city) : toDevanagari(b.code)})`
                  : `Individual Branch: ${b.name} (${b.city || b.code})`}
              </option>
            ))}
          </select>
        </div>

        {/* Period selector */}
        <div>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setStartDate('');
              setEndDate('');
            }}
            style={selectStyle}
          >
            <option value="this-month">{language === 'mr' ? 'हा महिना' : 'This Month'}</option>
            <option value="today">{language === 'mr' ? 'आज' : 'Today'}</option>
            <option value="this-week">{language === 'mr' ? 'हा आठवडा' : 'This Week'}</option>
            <option value="this-year">{language === 'mr' ? 'हे वर्ष' : 'This Year'}</option>
            <option value="all-time">{language === 'mr' ? 'सर्व काळ (All Time)' : 'All Time (All Records)'}</option>
            <option value="custom">{language === 'mr' ? 'सानुकूल तारीख श्रेणी' : 'Custom Date Range'}</option>
          </select>
        </div>

        {/* Interactive Custom Date Inputs */}
        {period === 'custom' && (
          <>
            <div>
              <input
                type="date"
                className="owner-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={selectStyle}
                placeholder="Start Date"
                title="Start Date"
              />
            </div>
            <div>
              <input
                type="date"
                className="owner-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={selectStyle}
                placeholder="End Date"
                title="End Date"
              />
            </div>
          </>
        )}
      </div>

      {/* Consolidated Summary Cards (5 Cards matching Image 1) */}
      <div className="owner-kpi-grid-5" style={{ width: '100%', marginBottom: '16px' }}>
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Today's Sales">{language === 'mr' ? 'आजची विक्री' : "Today's Sales"}</span>
              <div style={{ ...statValueStyle, color: '#16A34A' }} title={formatCurrency(salesData?.consolidated?.todaySales)}>
                {formatCurrency(salesData?.consolidated?.todaySales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(22, 163, 74, 0.12)', color: '#16A34A' }}>
              <TrendingUp size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Weekly Sales">{language === 'mr' ? 'साप्ताहिक विक्री' : 'Weekly Sales'}</span>
              <div style={{ ...statValueStyle, color: '#2563EB' }} title={formatCurrency(salesData?.consolidated?.weeklySales)}>
                {formatCurrency(salesData?.consolidated?.weeklySales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' }}>
              <CalendarDays size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Monthly Sales">{language === 'mr' ? 'मासिक विक्री' : 'Monthly Sales'}</span>
              <div style={{ ...statValueStyle, color: '#0284C7' }} title={formatCurrency(salesData?.consolidated?.monthlySales)}>
                {formatCurrency(salesData?.consolidated?.monthlySales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }}>
              <ReceiptIndianRupee size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Yearly Sales">{language === 'mr' ? 'वार्षिक विक्री' : 'Yearly Sales'}</span>
              <div style={{ ...statValueStyle, color: '#7C3AED' }} title={formatCurrency(salesData?.consolidated?.yearlySales)}>
                {formatCurrency(salesData?.consolidated?.yearlySales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' }}>
              <CalendarRange size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Total Realized Sales">{language === 'mr' ? 'एकूण प्रत्यक्ष विक्री' : 'Total Realized Sales'}</span>
              <div style={{ ...statValueStyle, color: 'var(--text-heading, #0F172A)' }} title={formatCurrency(salesData?.consolidated?.totalSales)}>
                {formatCurrency(salesData?.consolidated?.totalSales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(15, 23, 42, 0.08)', color: '#0F172A' }}>
              <CreditCard size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: Branch-wise Sales */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-slate, #E2E8F0)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'शाखा तपशील तक्ता' : 'Branch Breakdown Table'}
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)', color: '#475569' }}>
                <th style={thStyle}>{language === 'mr' ? 'शाखेचे नाव' : 'Branch Name'}</th>
                <th style={thStyle}>{language === 'mr' ? 'शहर' : 'City'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'आजची विक्री' : "Today's Sales"}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'साप्ताहिक विक्री' : 'Weekly Sales'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'मासिक विक्री' : 'Monthly Sales'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'वार्षिक विक्री' : 'Yearly Sales'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'एकूण विक्री' : 'Total Sales'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{language === 'mr' ? 'इनव्हॉइसेस' : 'Invoices'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748B)' }}>
                    Loading sales records...
                  </td>
                </tr>
              ) : salesData?.branches && salesData.branches.length > 0 ? (
                salesData.branches.map((b) => (
                  <tr
                    key={b.branchId}
                    style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="#B45309" />
                        <div>
                          <strong style={{ color: 'var(--text-heading, #0F172A)' }}>
                            {language === 'mr' ? localizeName(b.branchName) : b.branchName}
                          </strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)' }}>
                            {language === 'mr' ? toDevanagari(b.code) : b.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>{b.city ? (language === 'mr' ? localizeName(b.city) : b.city) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                      {formatCurrency(b.todaySales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#2563EB' }}>
                      {formatCurrency(b.weeklySales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#0284C7' }}>
                      {formatCurrency(b.monthlySales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#7C3AED' }}>
                      {formatCurrency(b.yearlySales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: 'var(--text-heading, #0F172A)' }}>
                      {formatCurrency(b.totalSales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {language === 'mr' ? toDevanagari(b.invoiceCount) : b.invoiceCount}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    {language === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणतीही विक्री नोंदवलेली नाही.' : 'No sales recorded for the selected filter period.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Sales Trend Chart */}
      {salesData?.dailyBreakdown && salesData.dailyBreakdown.length > 0 && (
        <div
          className="owner-card"
          style={{
            backgroundColor: 'var(--card-white, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--border-slate, #E2E8F0)',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: '0 0 14px' }}>
            {language === 'mr' ? 'दैनंदिन विक्री कालमर्यादा' : 'Daily Sales Timeline'}
          </h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData.dailyBreakdown} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  tickFormatter={(d) => (language === 'mr' ? toDevanagari(d) : d)}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  tickFormatter={(val) => {
                    const s = `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;
                    return language === 'mr' ? toDevanagari(s) : s;
                  }}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#FFFFFF', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name={language === 'mr' ? 'दैनंदिन विक्री' : 'Daily Sales'}
                  stroke="#B45309"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontWeight: 700,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '14px',
};

const selectStyle: React.CSSProperties = {
  height: '42px',
  minHeight: '42px',
  padding: '0 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-slate, #CBD5E1)',
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'var(--text-heading, #0F172A)',
  backgroundColor: 'var(--card-white, #FFFFFF)',
  outline: 'none',
  boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-white, #FFFFFF)',
  borderRadius: '8px',
  border: '1.5px solid var(--border-slate, #CBD5E1)',
  padding: '10px 12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '68px',
  boxSizing: 'border-box',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--text-muted, #64748B)',
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.2,
};

const statValueStyle: React.CSSProperties = {
  fontSize: '1.12rem',
  fontWeight: 800,
  color: 'var(--text-heading, #0F172A)',
  marginTop: '3px',
  letterSpacing: '-0.02em',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.2,
};

const iconContainerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  minWidth: '32px',
  minHeight: '32px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export default OwnerSales;

