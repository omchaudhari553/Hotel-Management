import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Crown,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ReceiptIndianRupee,
  Download,
  CreditCard,
  Zap,
  Bed,
  Users,
  Building,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface HotelSubscriptionData {
  businessId: number;
  businessName: string;
  status: string;
  isTrial: boolean;
  planName: string;
  tier: string;
  trialStartDate?: string;
  trialEndDate?: string;
  startDate?: string;
  endDate?: string;
  daysRemaining: number;
  secondsRemaining: number;
  serverTimestamp: string;
  autoRenew: boolean;
  maxRooms?: number;
  maxStaff?: number;
  maxBranches?: number;
  maxUsers?: number;
}

export const HotelSubscriptionDashboard: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();
  const [subData, setSubData] = useState<HotelSubscriptionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [payments, setPayments] = useState<any[]>([]);

  // Live countdown state
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, payRes] = await Promise.all([
        apiClient.get('/hotel/subscription'),
        apiClient.get('/hotel/subscription/payments').catch(() => ({ data: { data: [] } })),
      ]);
      const data: HotelSubscriptionData = subRes.data?.data || subRes.data;
      setSubData(data);
      setPayments(payRes.data?.data || payRes.data || []);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to load subscription status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live countdown timer based on server UTC expiry timestamp
  useEffect(() => {
    if (!subData) return;
    const expiryStr = subData.isTrial ? subData.trialEndDate : subData.endDate;
    if (!expiryStr) return;

    const targetTime = new Date(expiryStr).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const totalSeconds = Math.floor(diff / 1000);

      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [subData]);

  const handleOpenUpgrade = () => {
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { mode: subData?.status === 'EXPIRED' ? 'upgrade' : 'renew' },
      })
    );
  };

  const handleToggleAutoRenew = async () => {
    try {
      const next = !subData?.autoRenew;
      await apiClient.patch('/hotel/subscription/auto-renew', null, {
        params: { enabled: next },
      });
      showToast('success', `Auto-renew ${next ? 'enabled' : 'disabled'}`);
      setSubData((prev) => (prev ? { ...prev, autoRenew: next } : null));
    } catch (err: any) {
      showToast('error', 'Failed to update auto-renewal preference.');
    }
  };

  const isExpired = subData?.status === 'EXPIRED' || (subData?.daysRemaining ?? 0) < 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            Hotel Subscription & Licence Overview
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted, #64748B)' }}>
            Managing active plan for <strong>{business?.name || subData?.businessName || 'Your Hotel'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={handleOpenUpgrade}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#B45309',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)',
            }}
          >
            <Crown size={16} />
            <span>Upgrade / Renew Plan</span>
          </button>
        </div>
      </div>

      {/* Main Countdown & Plan Status Hero Card */}
      <div
        style={{
          borderRadius: '16px',
          background: isExpired
            ? 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)'
            : subData?.isTrial
            ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'
            : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          border: isExpired
            ? '1.5px solid #FCA5A5'
            : subData?.isTrial
            ? '1.5px solid #FDE68A'
            : '1.5px solid #A7F3D0',
          padding: '28px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: isExpired ? '#FEE2E2' : subData?.isTrial ? '#FEF3C7' : '#D1FAE5',
                  color: isExpired ? '#DC2626' : subData?.isTrial ? '#B45309' : '#15803D',
                  border: isExpired ? '1px solid #FCA5A5' : subData?.isTrial ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                }}
              >
                {isExpired ? 'EXPIRED' : subData?.isTrial ? '28-DAY FREE TRIAL ACTIVE' : 'PAID SUBSCRIPTION ACTIVE'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Tier: <strong>{subData?.tier || 'STARTER'}</strong>
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: isExpired ? '#991B1B' : subData?.isTrial ? '#78350F' : '#065F46' }}>
              {subData?.planName || 'Hotel Starter'}
            </h2>

            <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: isExpired ? '#B91C1C' : subData?.isTrial ? '#92400E' : '#047857' }}>
              {subData?.isTrial
                ? 'Your hotel is enjoying complete 28-day free trial access with zero operational restrictions.'
                : 'Your paid hotel subscription is active with full multi-device synchronization.'}
            </p>
          </div>

          {/* Live UTC Synchronized Countdown Clock */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '280px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: '8px' }}>
              {isExpired ? 'Subscription Expired' : subData?.isTrial ? 'Free Trial Remaining' : 'Subscription Time Left'}
            </span>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[
                { val: countdown.days, unit: 'DAYS' },
                { val: countdown.hours, unit: 'HRS' },
                { val: countdown.minutes, unit: 'MIN' },
                { val: countdown.seconds, unit: 'SEC' },
              ].map((item, idx) => (
                <React.Fragment key={item.unit}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '1.35rem',
                        fontWeight: 900,
                        color: isExpired ? '#DC2626' : '#B45309',
                        minWidth: '42px',
                        textAlign: 'center',
                      }}
                    >
                      {String(item.val).padStart(2, '0')}
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94A3B8', marginTop: '3px' }}>
                      {item.unit}
                    </span>
                  </div>
                  {idx < 3 && <span style={{ fontWeight: 800, color: '#CBD5E1', marginBottom: '12px' }}>:</span>}
                </React.Fragment>
              ))}
            </div>

            <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '6px' }}>
              Expires on:{' '}
              {subData?.isTrial && subData?.trialEndDate
                ? new Date(subData.trialEndDate).toLocaleString('en-IN')
                : subData?.endDate
                ? new Date(subData.endDate).toLocaleString('en-IN')
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Limits & Quotas Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
          Configured Hotel Limits & Module Permissions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
              <Bed size={16} color="#B45309" />
              <span>Rooms Quota</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
              {subData?.maxRooms ? `${subData.maxRooms} Rooms` : 'Unlimited Rooms'}
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
              <Users size={16} color="#B45309" />
              <span>Staff Quota</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
              {subData?.maxStaff ? `${subData.maxStaff} Staff Members` : 'Unlimited Staff'}
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
              <Building size={16} color="#B45309" />
              <span>Branches Quota</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
              {subData?.maxBranches ? `${subData.maxBranches} Branches` : 'Multi-Branch Ready'}
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
              <ShieldCheck size={16} color="#B45309" />
              <span>Auto-Renewal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: subData?.autoRenew ? '#16A34A' : '#64748B' }}>
                {subData?.autoRenew ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={handleToggleAutoRenew}
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {subData?.autoRenew ? 'Turn Off' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Invoices Ledger */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
            Payment History & Invoices
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Official GST invoices generated upon payment completion
          </span>
        </div>

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
            <ReceiptIndianRupee size={32} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: '0.88rem' }}>No payment invoices yet.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
              Your initial 28-day free trial has ₹0 charge. Future renewal invoices will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>ORDER ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>PLAN</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>BASE + GST</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>TOTAL</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{p.orderId}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#B45309' }}>{p.planName}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      ₹{p.baseAmount} + ₹{p.taxAmount} GST
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 900, color: '#16A34A' }}>₹{p.totalAmount}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: p.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2',
                          color: p.status === 'SUCCESS' ? '#15803D' : '#DC2626',
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>
                      {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelSubscriptionDashboard;

