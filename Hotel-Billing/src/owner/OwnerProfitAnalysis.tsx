import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  Filter,
  RefreshCw,
  TrendingUp,
  ReceiptIndianRupee,
  CreditCard,
  ShoppingCart,
  Building2,
  AlertCircle,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ownerService, OwnerProfitAnalysisData, BranchRecord } from './ownerService';
import { useToast } from '../context/ToastContext';

export const OwnerProfitAnalysis: React.FC = () => {
  const [data, setData] = useState<OwnerProfitAnalysisData | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [period, setPeriod] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { showToast } = useToast();

  const computeDateRange = (p: string, sDate: string, eDate: string) => {
    const today = new Date();
    const toYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let fStart = '';
    let fEnd = '';

    if (p === 'custom') {
      fStart = sDate;
      fEnd = eDate;
    } else if (p === 'today') {
      fStart = toYmd(today);
      fEnd = toYmd(today);
    } else if (p === 'this-week') {
      const day = today.getDay();
      const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(today.getFullYear(), today.getMonth(), diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      fStart = toYmd(mon);
      fEnd = toYmd(sun);
    } else if (p === 'this-month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      fStart = toYmd(first);
      fEnd = toYmd(last);
    } else if (p === 'this-year') {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31);
      fStart = toYmd(first);
      fEnd = toYmd(last);
    } else if (p === 'all-time' || p === 'all') {
      fStart = '';
      fEnd = '';
    }
    return { fStart, fEnd };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { fStart, fEnd } = computeDateRange(period, startDate, endDate);
      const params: any = {};
      if (selectedBranchId) params.branchId = Number(selectedBranchId);
      if (fStart) params.startDate = fStart;
      if (fEnd) params.endDate = fEnd;

      const [res, bRes] = await Promise.all([
        ownerService.getProfitAnalysis(params),
        ownerService.getBranches(),
      ]);
      setData(res);
      setBranches(bRes);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to fetch profit analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId, period, startDate, endDate]);

  const formatCurrency = (amt: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amt || 0));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            Profit Analysis & Financial Performance
          </h1>
        </div>

        <button
          onClick={fetchData}
          className="owner-btn-secondary"
          title="Refresh Data"
          aria-label="Refresh Data"
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
      </div>

      {/* Filter Row: Report Scope & Dates (Matching image) */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontWeight: 700, fontSize: '0.86rem' }}>
          <Filter size={16} />
          <span>Report Scope & Dates:</span>
        </div>

        <div>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Active Branches Consolidated</option>
            {branches.filter(b => b.status === 'ACTIVE').map((b) => (
              <option key={b.id} value={b.id}>
                Individual Branch: {b.name} ({b.city || b.code})
              </option>
            ))}
          </select>
        </div>

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
            <option value="this-month">This Month</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-year">This Year</option>
            <option value="all-time">All Time (All Records)</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

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

      {/* 5 Core Financial Metrics (Matching Branch-wise Sales Image 3 & 4) */}
      <div className="owner-kpi-grid-5" style={{ width: '100%', marginBottom: '16px' }}>
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Total Billing Amount">Total Billing Amount</span>
              <div style={statValueStyle} title={formatCurrency(data?.totalBillingAmount)}>{formatCurrency(data?.totalBillingAmount)}</div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#EFF6FF', color: '#2563EB', flexShrink: 0 }}>
              <ReceiptIndianRupee size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Total Payments Received">Total Payments Received</span>
              <div style={{ ...statValueStyle, color: '#16A34A' }} title={formatCurrency(data?.totalPaymentsReceived)}>
                {formatCurrency(data?.totalPaymentsReceived)}
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#DCFCE7', color: '#15803D', flexShrink: 0 }}>
              <CreditCard size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Total Purchase Amount">Total Purchase Amount</span>
              <div style={{ ...statValueStyle, color: '#DC2626' }} title={formatCurrency(data?.totalPurchaseAmount)}>
                {formatCurrency(data?.totalPurchaseAmount)}
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#FEE2E2', color: '#B91C1C', flexShrink: 0 }}>
              <ShoppingCart size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Estimated Business Profit">Estimated Business Profit</span>
              <div
                style={{
                  ...statValueStyle,
                  color: (data?.estimatedBusinessProfit || 0) >= 0 ? '#15803D' : '#B91C1C',
                }}
                title={formatCurrency(data?.estimatedBusinessProfit)}
              >
                {formatCurrency(data?.estimatedBusinessProfit)}
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#FEF3C7', color: '#B45309', flexShrink: 0 }}>
              <TrendingUp size={16} />
            </div>
          </div>
        </div>

        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title="Overall Profit Margin">Overall Profit Margin</span>
              <div
                style={{
                  ...statValueStyle,
                  color: (data?.estimatedBusinessProfit || 0) >= 0 ? '#7C3AED' : '#B91C1C',
                }}
                title={`${((data?.profitMarginPercent !== undefined && !isNaN(data.profitMarginPercent)) ? data.profitMarginPercent : ((data?.estimatedBusinessProfit || 0) / (data?.totalBillingAmount || 1) * 100)).toFixed(1)}%`}
              >
                {((data?.profitMarginPercent !== undefined && !isNaN(data.profitMarginPercent)) ? data.profitMarginPercent : ((data?.estimatedBusinessProfit || 0) / (data?.totalBillingAmount || 1) * 100)).toFixed(1)}%
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', flexShrink: 0 }}>
              <Percent size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      {data?.branchBreakdown && data.branchBreakdown.length > 0 && (
        <div
          className="owner-card"
          style={{
            backgroundColor: 'var(--card-white, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--border-slate, #E2E8F0)',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: '0 0 16px' }}>
            Profit Comparison by Branch
          </h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchBreakdown} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="branchName" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#FFFFFF', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="totalPaymentsReceived" name="Payments Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalPurchaseAmount" name="Purchases" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="estimatedBusinessProfit" name="Estimated Profit" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Branch Financial Breakdown Table */}
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
            Branch Profit Breakdown Ledger
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)', color: '#475569' }}>
                <th style={thStyle}>Branch</th>
                <th style={thStyle}>Location</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Billed</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Payments Collected</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Purchase Cost</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Estimated Profit</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748B)' }}>
                    Computing profit analysis...
                  </td>
                </tr>
              ) : data?.branchBreakdown && data.branchBreakdown.length > 0 ? (
                data.branchBreakdown.map((b) => (
                  <tr
                    key={b.branchId}
                    style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="#B45309" />
                        <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{b.branchName}</strong>
                      </div>
                    </td>
                    <td style={tdStyle}>{b.city || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#334155' }}>
                      {formatCurrency(b.totalBillingAmount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                      {formatCurrency(b.totalPaymentsReceived)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#DC2626' }}>
                      {formatCurrency(b.totalPurchaseAmount)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 800,
                        color: b.estimatedBusinessProfit >= 0 ? '#15803D' : '#B91C1C',
                      }}
                    >
                      {formatCurrency(b.estimatedBusinessProfit)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                      {b.profitMarginPercent}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No financial transactions recorded for this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
  padding: '7px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-slate, #CBD5E1)',
  fontSize: '0.84rem',
  color: 'var(--text-heading, #0F172A)',
  backgroundColor: 'var(--card-white, #FFFFFF)',
  outline: 'none',
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

const iconBoxStyle: React.CSSProperties = {
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

export default OwnerProfitAnalysis;

