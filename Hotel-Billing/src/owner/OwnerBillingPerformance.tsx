import React, { useState, useEffect } from 'react';
import {
  Gauge,
  ReceiptIndianRupee,
  CreditCard,
  ChefHat,
  ShoppingCart,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle2,
  TrendingUp,
  FileText,
  Coins,
} from 'lucide-react';
import { ownerService, OwnerBillingPerformanceData, BranchRecord } from './ownerService';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const OwnerBillingPerformance: React.FC = () => {
  const { language, toDevanagari, localizeName } = useLanguage();
  const [data, setData] = useState<OwnerBillingPerformanceData | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedBranchId) params.branchId = Number(selectedBranchId);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [perfRes, branchRes] = await Promise.all([
        ownerService.getBillingPerformance(params),
        ownerService.getBranches(),
      ]);
      setData(perfRes);
      setBranches(branchRes);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to fetch billing performance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId, startDate, endDate]);

  const formatCurrency = (amt: number | undefined) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amt || 0));
    return language === 'mr' ? toDevanagari(formatted) : formatted;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'बिलिंग आणि कामकाज कार्यक्षमता' : 'Billing & Operational Performance'}
          </h1>
        </div>

        <button
          onClick={() => window.location.reload()}
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
      </div>

      {/* Filter Toolbar */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '8px',
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
          <span>{language === 'mr' ? 'फिल्टर्स:' : 'Filters:'}</span>
        </div>

        <div>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            style={selectStyle}
          >
            <option value="">{language === 'mr' ? 'सर्व सक्रिय शाखा' : 'All Active Branches'}</option>
            {branches.filter(b => b.status === 'ACTIVE').map((b) => (
              <option key={b.id} value={b.id}>
                {language === 'mr' ? localizeName(b.name) : b.name} ({b.city ? (language === 'mr' ? localizeName(b.city) : b.city) : (language === 'mr' ? toDevanagari(b.code) : b.code)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={selectStyle}
            title={language === 'mr' ? 'प्रारंभ तारीख' : 'Start Date'}
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={selectStyle}
            title={language === 'mr' ? 'शेवट तारीख' : 'End Date'}
          />
        </div>

        {(selectedBranchId || startDate || endDate) && (
          <button
            onClick={() => {
              setSelectedBranchId('');
              setStartDate('');
              setEndDate('');
            }}
            className="owner-btn-secondary"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-subtle, #F1F5F9)',
              border: '1px solid var(--border-slate, #CBD5E1)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-heading, #475569)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {language === 'mr' ? 'फिल्टर्स साफ करा' : 'Clear Filters'}
          </button>
        )}
      </div>

      {/* 5 Performance KPI Cards (Matching Branch-wise Sales Image 3 & 4) */}
      <div className="owner-kpi-grid-5" style={{ width: '100%', marginBottom: '16px' }}>
        {/* Total Invoices Generated */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title={language === 'mr' ? 'एकूण निर्माण केलेली बिले' : 'Total Invoices Generated'}>
                {language === 'mr' ? 'एकूण बिले / इनव्हॉइसेस' : 'Total Invoices'}
              </span>
              <div style={{ ...statValueStyle, color: '#2563EB' }} title={`${data?.totalInvoices || 0} Invoices`}>
                {language === 'mr' ? toDevanagari(data?.totalInvoices || 0) : (data?.totalInvoices || 0)} {language === 'mr' ? 'बिले' : 'Bills'}
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#EFF6FF', color: '#2563EB', flexShrink: 0 }}>
              <ReceiptIndianRupee size={16} />
            </div>
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title={language === 'mr' ? 'पेमेंट संकलन दर' : 'Payment Collection Rate'}>
                {language === 'mr' ? 'पेमेंट संकलन दर' : 'Payment Collection Rate'}
              </span>
              <div style={{ ...statValueStyle, color: '#16A34A' }} title={`${data?.collectionEfficiencyPercent || 0}%`}>
                {language === 'mr' ? toDevanagari(data?.collectionEfficiencyPercent || 0) : (data?.collectionEfficiencyPercent || 0)}%
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#DCFCE7', color: '#15803D', flexShrink: 0 }}>
              <CreditCard size={16} />
            </div>
          </div>
        </div>

        {/* Average Ticket Size */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title={language === 'mr' ? 'सरासरी बिल मूल्य' : 'Average Ticket Value'}>
                {language === 'mr' ? 'सरासरी बिल मूल्य' : 'Average Ticket Value'}
              </span>
              <div style={statValueStyle} title={formatCurrency(data?.averageTicketSize)}>{formatCurrency(data?.averageTicketSize)}</div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#F0F9FF', color: '#0284C7', flexShrink: 0 }}>
              <Coins size={16} />
            </div>
          </div>
        </div>

        {/* KOT Execution Rate */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title={language === 'mr' ? 'किचन ऑर्डर्स (KOT)' : 'Kitchen Orders (KOT)'}>
                {language === 'mr' ? 'किचन ऑर्डर्स (KOT)' : 'Kitchen Orders (KOT)'}
              </span>
              <div style={statValueStyle} title={`${data?.totalKots || 0} Total KOTs`}>
                {language === 'mr' ? toDevanagari(data?.totalKots || 0) : (data?.totalKots || 0)}
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#FEF3C7', color: '#B45309', flexShrink: 0 }}>
              <ChefHat size={16} />
            </div>
          </div>
        </div>

        {/* Purchase Orders */}
        <div className="owner-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={statLabelStyle} title={language === 'mr' ? 'पुरवठादार खरेदी' : 'Supplier Purchases'}>
                {language === 'mr' ? 'पुरवठादार खरेदी' : 'Supplier Purchases'}
              </span>
              <div style={{ ...statValueStyle, color: '#DC2626' }} title={formatCurrency(data?.totalPurchaseAmount)}>
                {formatCurrency(data?.totalPurchaseAmount)}
              </div>
            </div>
            <div style={{ ...iconBoxStyle, backgroundColor: '#FEE2E2', color: '#B91C1C', flexShrink: 0 }}>
              <ShoppingCart size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Branch Comparison Table */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '8px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-slate, #E2E8F0)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'शाखा तुलना: बिलिंग आणि किचन कार्यक्षमता' : 'Branch Comparison: Billing & Kitchen Performance'}
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)', color: '#475569' }}>
                <th style={thStyle}>{language === 'mr' ? 'शाखा' : 'Branch'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{language === 'mr' ? 'एकूण बिले' : 'Total Bills'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{language === 'mr' ? 'भरलेली बिले' : 'Paid Bills'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'एकूण बिल रक्कम' : 'Total Billed'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'संकलित रक्कम' : 'Collected'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'संकलन %' : 'Collection %'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'सरासरी बिल' : 'Avg Ticket'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{language === 'mr' ? 'KOTs' : 'KOTs'}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{language === 'mr' ? 'खरेदी' : 'Purchases'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748B)' }}>
                    {language === 'mr' ? 'कार्यक्षमता मेट्रिक्स मोजले जात आहेत...' : 'Computing performance metrics...'}
                  </td>
                </tr>
              ) : data?.branchComparison && data.branchComparison.length > 0 ? (
                data.branchComparison.map((b) => (
                  <tr
                    key={b.branchId}
                    style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="#B45309" />
                        <strong style={{ color: 'var(--text-heading, #0F172A)' }}>
                          {language === 'mr' ? localizeName(b.branchName) : b.branchName}
                        </strong>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                      {language === 'mr' ? toDevanagari(b.totalInvoices) : b.totalInvoices}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#16A34A' }}>
                      {language === 'mr' ? toDevanagari(b.paidInvoices) : b.paidInvoices}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--text-heading, #0F172A)' }}>
                      {formatCurrency(b.totalBilled)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                      {formatCurrency(b.totalCollected)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#B45309' }}>
                      {language === 'mr' ? toDevanagari(b.collectionEfficiencyPercent) : b.collectionEfficiencyPercent}%
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#2563EB' }}>
                      {formatCurrency(b.averageTicketSize)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                      {language === 'mr' ? `${toDevanagari(b.completedKots)}/${toDevanagari(b.totalKots)}` : `${b.completedKots}/${b.totalKots}`}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#DC2626' }}>
                      {formatCurrency(b.totalPurchaseAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    {language === 'mr' ? 'कोणताही बिलिंग डेटा आढळला नाही.' : 'No billing data found.'}
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

export default OwnerBillingPerformance;

