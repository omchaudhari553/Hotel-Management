import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  TrendingUp,
  ReceiptIndianRupee,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  Building2,
  MapPin,
  Phone,
  User,
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
import { ownerService, OwnerDashboardData } from './ownerService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';


export const OwnerDashboard: React.FC = () => {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { language, toDevanagari, localizeName } = useLanguage();

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await ownerService.getDashboard();
      setData(res);
      if (isManual) showToast('success', 'Dashboard refreshed successfully!');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load owner dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number | undefined) => {
    const val = Number(amount || 0);
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
    return language === 'mr' ? toDevanagari(formatted) : formatted;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RefreshCw size={36} color="#B45309" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '14px', fontSize: '0.95rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
          {language === 'mr' ? 'कंसोलिडेटेड मालक डॅशबोर्ड लोड होत आहे...' : 'Loading Consolidated Owner Dashboard...'}
        </p>
      </div>
    );
  }

  if (error) {
    const isForbidden = error.toLowerCase().includes('forbidden') || error.toLowerCase().includes('denied');

    const handleSwitchToOwner = async () => {
      try {
        await logout();
      } finally {
        navigate('/login', { replace: true });
      }
    };

    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: isForbidden ? '#FFFBEB' : '#FEF2F2',
          border: `1px solid ${isForbidden ? '#FDE68A' : '#FCA5A5'}`,
          borderRadius: '12px',
          margin: '20px 0',
        }}
      >
        <h3
          style={{
            margin: 0,
            color: isForbidden ? '#92400E' : '#991B1B',
            fontSize: '1.05rem',
            fontWeight: 700,
          }}
        >
          {isForbidden
            ? (language === 'mr' ? 'उप-शाखा खाते आढळले (मालक अधिकारांची आवश्यकता)' : 'Sub-Branch Account Detected (Owner Privileges Required)')
            : (language === 'mr' ? 'मालक डॅशबोर्ड लोड करण्यात अयशस्वी' : 'Unable to load Owner Dashboard')}
        </h3>
        <p
          style={{
            margin: '8px 0 16px',
            color: isForbidden ? '#B45309' : '#B91C1C',
            fontSize: '0.88rem',
            lineHeight: 1.5,
          }}
        >
          {isForbidden
            ? (language === 'mr'
              ? 'तुम्ही सध्या उप-शाखा खात्यासह लॉगिन केलेले आहात. कंसोलिडेटेड मालक डॅशबोर्ड केवळ केंद्रीय व्यवसाय मालकासाठी (hoteladmin) आरक्षित आहे. या डॅशबोर्डमध्ये प्रवेश करण्यासाठी, कृपया मालक म्हणून लॉगिन करा किंवा तुमच्या शाखेच्या कार्यप्रणाली डॅशबोर्डवर जा.'
              : 'You are currently logged in with a sub-branch account. The consolidated Owner Dashboard is reserved exclusively for the Central Business Owner (hoteladmin). To access this dashboard, please log in as Owner, or switch to your branch operational dashboard.')
            : error}
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isForbidden && (
            <>
              <button
                onClick={handleSwitchToOwner}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#B45309',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                {language === 'mr' ? 'मालक म्हणून लॉगिन करा (hoteladmin)' : 'Log In as Owner (hoteladmin)'}
              </button>
              <button
                onClick={() => navigate('/hotel/dashboard')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                {language === 'mr' ? 'शाखा डॅशबोर्डवर जा' : 'Go to Branch Dashboard'}
              </button>
            </>
          )}
          <button
            onClick={() => fetchDashboardData()}
            style={{
              padding: '8px 16px',
              backgroundColor: isForbidden ? '#6B7280' : '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'केंद्रीय कार्यकारी डॅशबोर्ड' : 'Central Executive Dashboard'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
            className="owner-btn-secondary"
            title={language === 'mr' ? 'रीफ्रेश करा' : 'Refresh Dashboard Data'}
            aria-label="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              minHeight: '38px',
              padding: 0,
              borderRadius: '8px',
              cursor: (refreshing || loading) ? 'not-allowed' : 'pointer',
              border: '1.5px solid var(--border-slate, #CBD5E1)',
              opacity: (refreshing || loading) ? 0.7 : 1,
            }}
          >
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (8 Cards) */}
      <div className="owner-kpi-grid">
        {/* Total Branches */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle}>{language === 'mr' ? 'एकूण शाखा' : 'Total Branches'}</span>
              <div style={statValueStyle} title={`${data?.totalBranches || 0} Total Branches`}>
                {language === 'mr' ? toDevanagari(data?.totalBranches || 0) : (data?.totalBranches || 0)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' }}>
              <GitBranch size={16} />
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle}>{language === 'mr' ? 'आजची एकूण विक्री' : "Today's Total Sales"}</span>
              <div style={{ ...statValueStyle, color: '#15803D' }} title={formatCurrency(data?.todaySales)}>
                {formatCurrency(data?.todaySales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(22, 163, 74, 0.12)', color: '#16A34A' }}>
              <TrendingUp size={16} />
            </div>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle}>{language === 'mr' ? 'मासिक एकूण विक्री' : 'Monthly Total Sales'}</span>
              <div style={{ ...statValueStyle, color: '#0369A1' }} title={formatCurrency(data?.monthlySales)}>
                {formatCurrency(data?.monthlySales)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }}>
              <ReceiptIndianRupee size={16} />
            </div>
          </div>
        </div>

        {/* Total Billing Amount */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle}>{language === 'mr' ? 'एकूण बिलिंग रक्कम' : 'Total Billing Amount'}</span>
              <div style={statValueStyle} title={formatCurrency(data?.totalBillingAmount)}>{formatCurrency(data?.totalBillingAmount)}</div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(245, 158, 11, 0.14)', color: '#B45309' }}>
              <ReceiptIndianRupee size={16} />
            </div>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle}>{language === 'mr' ? 'एकूण प्राप्त पेमेंट्स' : 'Total Payments Received'}</span>
              <div style={{ ...statValueStyle, color: '#16A34A' }} title={formatCurrency(data?.totalPayments)}>
                {formatCurrency(data?.totalPayments)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(22, 163, 74, 0.12)', color: '#15803D' }}>
              <CreditCard size={16} />
            </div>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle}>{language === 'mr' ? 'एकूण खरेदी रक्कम' : 'Total Purchase Amount'}</span>
              <div style={{ ...statValueStyle, color: '#B91C1C' }} title={formatCurrency(data?.totalPurchaseAmount)}>
                {formatCurrency(data?.totalPurchaseAmount)}
              </div>
            </div>
            <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(220, 38, 38, 0.12)', color: '#DC2626' }}>
              <ShoppingCart size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section: Branch Performance Comparison */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
              {language === 'mr' ? 'शाखा कामगिरी तुलना' : 'Branch Performance Comparison'}
            </h2>
          </div>
          <button
            onClick={() => navigate('/owner/profit-analysis')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#B45309',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>{language === 'mr' ? 'संपूर्ण नफा विश्लेषण' : 'Full Profit Analysis'}</span>
            <ArrowUpRight size={16} />
          </button>
        </div>

        {data?.branchPerformanceComparison && data.branchPerformanceComparison.filter((b: any) => b.status === undefined || b.status === 'ACTIVE').length > 0 ? (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.branchPerformanceComparison
                  .filter((b: any) => b.status === undefined || b.status === 'ACTIVE')
                  .map((b: any) => ({
                    ...b,
                    branchName: language === 'mr' ? localizeName(b.branchName) : b.branchName,
                  }))}
                margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-slate, #E2E8F0)" />
                <XAxis dataKey="branchName" tick={{ fill: 'var(--text-muted, #64748B)', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: 'var(--text-muted, #64748B)', fontSize: 12 }}
                  tickFormatter={(val) => {
                    const str = `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;
                    return language === 'mr' ? toDevanagari(str) : str;
                  }}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: 'var(--card-white, #1E293B)', color: 'var(--text-heading, #FFFFFF)', borderRadius: '8px', border: '1px solid var(--border-slate, #334155)' }}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="sales" name={language === 'mr' ? 'एकूण विक्री' : 'Total Sales'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" name={language === 'mr' ? 'जमा पेमेंट्स' : 'Payments Collected'} fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name={language === 'mr' ? 'खरेदी' : 'Purchases'} fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '0.9rem' }}>
            {language === 'mr'
              ? 'अद्याप कोणताही तुलनात्मक डेटा उपलब्ध नाही. आलेखासाठी नवीन शाखा तयार करा.'
              : 'No branch comparison data available yet. Create branches to see graphical comparisons.'}
          </div>
        )}
      </div>

      {/* Table: Branch-wise Sales & Operational Status */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
              {language === 'mr' ? 'शाखानिहाय कामकाजाचा आढावा' : 'Branch-wise Operational Overview'}
            </h2>
          </div>
          <button
            onClick={() => navigate('/owner/branches')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#B45309',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>{language === 'mr' ? 'शाखा व्यवस्थापित करा' : 'Manage Branches'}</span>
            <ArrowUpRight size={16} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)', color: 'var(--text-muted, #475569)' }}>
                <th style={thStyle}>{language === 'mr' ? 'शाखा' : 'Branch'}</th>
                <th style={thStyle}>{language === 'mr' ? 'शहर / ठिकाण' : 'City / Location'}</th>
                <th style={thStyle}>{language === 'mr' ? 'व्यवस्थापक आणि संपर्क' : 'Manager & Contact'}</th>
                <th style={thStyle}>{language === 'mr' ? 'स्थिती' : 'Status'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'आजची विक्री' : "Today's Sales"}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'मासिक विक्री' : 'Monthly Sales'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'एकूण विक्री' : 'Total Sales'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{language === 'mr' ? 'इनव्हॉइसेस' : 'Invoices'}</th>
              </tr>
            </thead>
            <tbody>
              {data?.branchSalesOverview && data.branchSalesOverview.filter((b: any) => b.status === undefined || b.status === 'ACTIVE').length > 0 ? (
                data.branchSalesOverview.filter((b: any) => b.status === undefined || b.status === 'ACTIVE').map((b) => (
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
                            {language === 'mr' ? 'कोड: ' : 'Code: '}{language === 'mr' ? toDevanagari(b.code) : b.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                        <MapPin size={14} color="#94A3B8" />
                        <span>
                          {b.city
                            ? (language === 'mr' ? localizeName(b.city) : b.city)
                            : (language === 'mr' ? 'निर्दिष्ट नाही' : 'Not Specified')}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: 'var(--text-heading, #1E293B)', fontWeight: 600 }}>
                        {b.managerName
                          ? (language === 'mr' ? localizeName(b.managerName) : b.managerName)
                          : (language === 'mr' ? 'जनरल मॅनेजर' : 'General Manager')}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} />
                        <span>{b.contactPhone ? (language === 'mr' ? toDevanagari(b.contactPhone) : b.contactPhone) : '—'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          backgroundColor: b.status === 'ACTIVE' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                          color: b.status === 'ACTIVE' ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {b.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {b.status === 'ACTIVE' ? (language === 'mr' ? 'सक्रिय' : 'ACTIVE') : (language === 'mr' ? 'निष्क्रिय' : 'INACTIVE')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#15803D' }}>
                      {formatCurrency(b.todaySales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#0369A1' }}>
                      {formatCurrency(b.monthlySales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: 'var(--text-heading, #0F172A)' }}>
                      {formatCurrency(b.totalSales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted, #475569)' }}>
                      {language === 'mr' ? toDevanagari(b.invoiceCount) : b.invoiceCount}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    {language === 'mr'
                      ? 'कोणतीही शाखा कॉन्फिगर केलेली नाही. आपली पहिली शाखा जोडण्यासाठी वरील "नवीन शाखा जोडा" वर क्लिक करा.'
                      : 'No branches configured. Click "Add New Branch" above to create your first branch.'}
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

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontWeight: 700,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted, #475569)',
};

const tdStyle: React.CSSProperties = {
  padding: '14px',
  color: 'var(--text-body, #1E293B)',
};

export default OwnerDashboard;

