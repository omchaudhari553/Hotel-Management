import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Zap,
  CreditCard,
  QrCode,
  Building,
  ArrowRight,
  Lock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Crown,
  ChevronLeft,
} from 'lucide-react';
import { subscriptionService, PlanDto, OrderResponse } from '../services/subscriptionService';
import { useIndustry } from '../context/IndustryContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

interface SubscriptionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  defaultPlanId?: string | number;
  mode?: 'renew' | 'upgrade';
  onSuccess?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  defaultPlanId,
  mode: propMode = 'renew',
  onSuccess,
}) => {
  const { activeIndustryCode } = useIndustry();
  const { showToast } = useToast();
  const { t, formatNumber, language } = useLanguage();

  const [isOpen, setIsOpen] = useState<boolean>(!!propIsOpen);
  const [modalMode, setModalMode] = useState<'renew' | 'upgrade'>(propMode);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanDto | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<'SELECT' | 'CHECKOUT' | 'SUCCESS' | 'FAILED'>('SELECT');
  const [activeOrder, setActiveOrder] = useState<OrderResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verifiedSuccessData, setVerifiedSuccessData] = useState<any>(null);

  // Sync propIsOpen
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Global event listener for opening modal from anywhere (Navbar, Sidebar, Settings)
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const detail = e.detail || {};
      if (detail.mode) setModalMode(detail.mode);
      setIsOpen(true);
      setStep('SELECT');
      setErrorMessage('');
      if (detail.planId && plans.length > 0) {
        const found = plans.find((p) => p.id === Number(detail.planId) || p.planCode === detail.planId);
        if (found) setSelectedPlan(found);
      }
    };

    window.addEventListener('open-subscription-modal', handleOpenEvent);
    return () => window.removeEventListener('open-subscription-modal', handleOpenEvent);
  }, [plans]);

  // Fetch plans from backend - HOTEL plans only
  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getAllPlans('HOTEL');
      if (data && data.length > 0) {
        // Enforce strictly HOTEL plans - exclude all Mess and Cafe plans
        const hotelPlans = data.filter((p) => p.industryCode === 'HOTEL' || p.planCode?.startsWith('HOTEL_'));
        const finalPlans = hotelPlans.length > 0 ? hotelPlans : data.filter((p) => !p.industryCode || p.industryCode === 'HOTEL');
        setPlans(finalPlans);
        // Pre-select plan
        const defaultChoice =
          finalPlans.find((p) => p.isPopular) ||
          finalPlans.find((p) => p.tier === 'PRO' || p.tier === 'ENTERPRISE') ||
          finalPlans[0];
        setSelectedPlan(defaultChoice);
      }
    } catch (err) {
      console.warn('Failed to fetch backend plans, using fallback plan list:', err);
      // Fallback hotel plans with strictly 28-day free trial
      const fallbackList: PlanDto[] = [
        {
          id: 1,
          planCode: 'HOTEL_STARTER',
          name: 'Hotel Starter',
          industryCode: 'HOTEL',
          tier: 'STARTER',
          monthlyPrice: 1499,
          annualPricePerMonth: 1199,
          trialDurationDays: 28,
          features: [
            'Up to 15 Rooms Management',
            'Front Desk & Guest Directory',
            'Check-in / Check-out Workflow',
            'Universal GST Billing & Invoicing',
            'Daily Occupancy Statistics',
            'Email & Phone Support',
          ],
          description: 'Ideal for small lodges, guesthouses, and homestays with up to 15 rooms.',
          isPopular: false,
          isActive: true,
          taxRatePercent: 18,
          monthlyTax: 269.82,
          monthlyTotal: 1768.82,
          annualBase: 14388,
          annualTax: 2589.84,
          annualTotal: 16977.84,
        },
        {
          id: 2,
          planCode: 'HOTEL_PRO',
          name: 'Hotel Professional',
          industryCode: 'HOTEL',
          tier: 'PRO',
          monthlyPrice: 2999,
          annualPricePerMonth: 2399,
          trialDurationDays: 28,
          features: [
            'Up to 50 Rooms & Floor Grids',
            'Integrated Room Service Billing',
            'Housekeeping & Maintenance Tracker',
            'Inventory & Linen Stock Deductions',
            'Comprehensive Revenue Reports & KPIs',
            'Multiple Staff User Accounts',
            'Priority 24/7 Support',
          ],
          description: 'Best for standard hotels & multi-floor dining restaurants.',
          isPopular: true,
          isActive: true,
          taxRatePercent: 18,
          monthlyTax: 539.82,
          monthlyTotal: 3538.82,
          annualBase: 28788,
          annualTax: 5181.84,
          annualTotal: 33969.84,
        },
        {
          id: 3,
          planCode: 'HOTEL_ENTERPRISE',
          name: 'Hotel Enterprise',
          industryCode: 'HOTEL',
          tier: 'ENTERPRISE',
          monthlyPrice: 5999,
          annualPricePerMonth: 4799,
          trialDurationDays: 28,
          features: [
            'Unlimited Rooms & Banquet Halls',
            'Multi-Building Floor Layouts',
            'Multi-Tender Advanced Invoicing',
            'Supplier Purchase Ledger & Auto-Reorder',
            'Dedicated Account Manager',
            'Custom Integrations & API Access',
          ],
          description: 'Full capabilities for luxury resorts, hotel chains, and multi-property groups.',
          isPopular: false,
          isActive: true,
          taxRatePercent: 18,
          monthlyTax: 1079.82,
          monthlyTotal: 7078.82,
          annualBase: 57588,
          annualTax: 10365.84,
          annualTotal: 67953.84,
        },
      ];
      setPlans(fallbackList);
      setSelectedPlan(fallbackList[1]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen, activeIndustryCode]);

  const handleClose = () => {
    setIsOpen(false);
    setStep('SELECT');
    setErrorMessage('');
    if (propOnClose) propOnClose();
  };

  // Calculate prices
  const basePrice = selectedPlan
    ? billingCycle === 'ANNUAL'
      ? selectedPlan.annualPricePerMonth * 12
      : selectedPlan.monthlyPrice
    : 0;
  const gstAmount = Math.round(basePrice * 0.18 * 100) / 100;
  const cgst = Math.round((gstAmount / 2) * 100) / 100;
  const sgst = Math.round((gstAmount / 2) * 100) / 100;
  const totalPayable = Math.round((basePrice + gstAmount) * 100) / 100;

  // Step 1: Create Order on backend
  const handleProceedToCheckout = async () => {
    if (!selectedPlan) {
      showToast('error', t('selectPlanError', 'Please select a subscription plan.'));
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const order = await subscriptionService.createPaymentOrder({
        planId: selectedPlan.id,
        planCode: selectedPlan.planCode,
        billingCycle,
        paymentMethod,
      });

      setActiveOrder(order);
      setStep('CHECKOUT');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || t('orderInitFailed', 'Failed to initialize payment order.'));
      setStep('FAILED');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete Payment & Verify on backend
  const handleConfirmPayment = async () => {
    if (!activeOrder) return;

    try {
      setLoading(true);
      setErrorMessage('');

      // Generate payment transaction token
      const simulatedPaymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const simulatedSignature = 'sig_' + Math.random().toString(36).substring(2, 12);

      const verificationResult = await subscriptionService.verifyPayment({
        orderId: activeOrder.orderId,
        paymentId: simulatedPaymentId,
        signature: simulatedSignature,
        paymentMethod,
      });

      if (verificationResult.success) {
        setVerifiedSuccessData(verificationResult);
        setStep('SUCCESS');
        showToast('success', t('paymentSuccessToast', 'Payment successful! Your subscription is now active.'));
        window.dispatchEvent(new Event('licence-updated'));
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(verificationResult.message || t('paymentVerificationFailed', 'Payment verification failed.'));
        setStep('FAILED');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t('paymentVerificationFailed', 'Payment verification failed.');
      setErrorMessage(msg);
      setStep('FAILED');
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <style>{`
        .sub-modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sub-modal-scroll::-webkit-scrollbar-track {
          background: #F1F5F9;
        }
        .sub-modal-scroll::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 9999px;
        }
        .sub-modal-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94A3B8;
        }
      `}</style>

      {/* Modal Dialog Window */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: step === 'SELECT' ? '1040px' : '560px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          position: 'relative',
          margin: 'auto',
          transition: 'max-width 0.2s ease',
        }}
      >
        {/* ================= FIXED MODAL HEADER ================= */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <Crown size={22} color="#F59E0B" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                {step === 'CHECKOUT'
                  ? t('completeSecurePayment', 'Complete Secure Payment')
                  : step === 'SUCCESS'
                  ? t('paymentConfirmed', 'Payment Confirmed')
                  : step === 'FAILED'
                  ? t('paymentStatus', 'Payment Status')
                  : modalMode === 'renew'
                  ? t('renewLicenseSubscription', 'Renew License & Subscription')
                  : t('upgradeSubscriptionPlan', 'Upgrade Subscription Plan')}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                {step === 'CHECKOUT'
                  ? t('checkoutSubtitle', 'Review order details and choose your preferred payment method')
                  : t('enterpriseBusinessLicense', 'Ajalkar POS Billing · Enterprise Business License')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '9999px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#CBD5E1',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = '#CBD5E1';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= SCROLLABLE MODAL BODY ================= */}
        <div
          className="sub-modal-scroll"
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px 28px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* STEP 1: PLAN SELECTION */}
          {step === 'SELECT' && (
            <div>
              {/* Billing Cycle Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    background: '#F1F5F9',
                    padding: '4px',
                    borderRadius: '9999px',
                    border: '1.5px solid #CBD5E1',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    style={{
                      padding: '8px 22px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: billingCycle === 'MONTHLY' ? '#0F172A' : 'transparent',
                      color: billingCycle === 'MONTHLY' ? '#FFFFFF' : '#64748B',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t('monthlyBilling', 'Monthly Billing')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('ANNUAL')}
                    style={{
                      padding: '8px 22px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: billingCycle === 'ANNUAL' ? '#0F172A' : 'transparent',
                      color: billingCycle === 'ANNUAL' ? '#FFFFFF' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{t('annualBilling', 'Annual Billing')}</span>
                    <span
                      style={{
                        background: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      {t('save20Percent', 'Save 20%')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '26px',
                }}
              >
                {plans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const price = billingCycle === 'ANNUAL' ? plan.annualPricePerMonth : plan.monthlyPrice;
                  const planDisplayName = t(plan.planCode || plan.name, plan.name);
                  const planDisplayDesc = t((plan.planCode || '') + 'Desc', plan.description);

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      style={{
                        border: isSelected ? '2.5px solid #059669' : '1.5px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '22px 20px',
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                        boxShadow: isSelected
                          ? '0 10px 25px -4px rgba(5, 150, 105, 0.2)'
                          : '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.18s ease',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {plan.isPopular && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-11px',
                            right: '18px',
                            background: '#059669',
                            color: '#FFFFFF',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '3px 12px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.35)',
                          }}
                        >
                          {t('recommended', 'Recommended')}
                        </div>
                      )}

                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                        {planDisplayName}
                      </h3>

                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: '#15803D',
                          background: '#DCFCE7',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          marginTop: '6px',
                          marginBottom: '8px',
                          width: 'fit-content',
                        }}
                      >
                        ✓ {t('trialIncludes28', 'Includes 28-day free trial')}
                      </div>

                      <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#64748B', minHeight: '36px', lineHeight: 1.4 }}>
                        {planDisplayDesc}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A' }}>
                          ₹{formatNumber(price)}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#64748B' }}>/ {t('month', 'month')}</span>
                      </div>

                      {billingCycle === 'ANNUAL' && (
                        <div
                          style={{
                            fontSize: '0.76rem',
                            color: '#15803D',
                            fontWeight: 700,
                            marginBottom: '14px',
                            background: '#DCFCE7',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {t('billedPerYearGst', 'Billed annually + 18% GST')} (₹{formatNumber(price * 12)})
                        </div>
                      )}

                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#94A3B8',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {t('includedFeatures', 'Included Features')}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {plan.features?.slice(0, 6).map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                              <Check size={15} color="#059669" style={{ flexShrink: 0 }} />
                              <span>{t(f, f)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ marginTop: '18px' }}>
                        <div
                          style={{
                            width: '100%',
                            padding: '10px 0',
                            borderRadius: '10px',
                            textAlign: 'center',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            backgroundColor: isSelected ? '#059669' : '#F1F5F9',
                            color: isSelected ? '#FFFFFF' : '#475569',
                            border: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected ? t('selectedPlanBadge', '✓ Selected Plan') : t('selectPlanAction', 'Select Plan')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary & GST Breakdown Box */}
              {selectedPlan && (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '20px 24px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="#059669" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                        {t('subscriptionInvoiceSummary', 'Subscription Invoice Summary')} ({billingCycle === 'ANNUAL' ? '12 ' + t('monthsAnnual', 'Months Annual') : '1 ' + t('month', 'Month')})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', background: '#E2E8F0', padding: '3px 10px', borderRadius: '6px' }}>
                      {t('gstinCompliantInvoicing', 'GSTIN Compliant Invoicing')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.86rem', color: '#475569' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('basePlanPrice', 'Base Plan Price')} ({t(selectedPlan.planCode || selectedPlan.name, selectedPlan.name)}):</span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{formatNumber(basePrice)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('cgst9Percent', 'CGST (9%):')}</span>
                      <span>₹{formatNumber(cgst)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('sgst9Percent', 'SGST (9%):')}</span>
                      <span>₹{formatNumber(sgst)}</span>
                    </div>
                    <div
                      style={{
                        borderTop: '1.5px dashed #CBD5E1',
                        paddingTop: '12px',
                        marginTop: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>{t('totalPayableAmount', 'Total Payable Amount:')}</span>
                      <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669' }}>
                        ₹{formatNumber(totalPayable)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHECKOUT & PAYMENT METHOD */}
          {step === 'CHECKOUT' && activeOrder && (
            <div>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #BBF7D0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  marginBottom: '22px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('orderRef', 'Order Ref:')} {activeOrder.orderId}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                      {t(activeOrder.planName, activeOrder.planName)} ({t(activeOrder.billingCycle?.toLowerCase() || '', activeOrder.billingCycle)})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t('totalAmountDue', 'Total Amount Due')}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669' }}>
                      ₹{formatNumber(activeOrder.totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '10px' }}>
                  {t('selectPaymentMethod', 'Select Payment Method')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { id: 'UPI', label: t('upiQr', 'UPI / QR'), icon: <QrCode size={20} /> },
                    { id: 'CARD', label: t('debitCreditCard', 'Debit / Credit Card'), icon: <CreditCard size={20} /> },
                    { id: 'NETBANKING', label: t('netBanking', 'Net Banking'), icon: <Building size={20} /> },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        border: paymentMethod === m.id ? '2px solid #059669' : '1.5px solid #CBD5E1',
                        borderRadius: '12px',
                        padding: '14px 10px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: paymentMethod === m.id ? '#ECFDF5' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: paymentMethod === m.id ? '#065F46' : '#475569',
                        boxShadow: paymentMethod === m.id ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details based on method */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '18px',
                  fontSize: '0.85rem',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                {paymentMethod === 'UPI' && (
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{t('instantUpiCheckout', 'Instant UPI Checkout:')}</div>
                    <div>{t('acceptsUpiApps', 'Accepts GPay, PhonePe, Paytm, BHIM and all authorized banking UPI apps.')}</div>
                    <div style={{ marginTop: '10px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={16} />
                      <span>{t('encryptedPayment256', '256-Bit Encrypted Payment Order · Instant Backend Activation')}</span>
                    </div>
                  </div>
                )}
                {paymentMethod === 'CARD' && (
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{t('creditDebitCardTitle', 'Credit / Debit Card:')}</div>
                    <div>{t('cardOtpVerification', 'Supports Visa, MasterCard, RuPay, Maestro with 3D Secure OTP verification.')}</div>
                  </div>
                )}
                {paymentMethod === 'NETBANKING' && (
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{t('allMajorIndianBanks', 'All Major Indian Banks:')}</div>
                    <div>{t('banksListDesc', 'HDFC, ICICI, SBI, Axis, Kotak, Bank of Baroda, and 50+ supported banks.')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'SUCCESS' && verifiedSuccessData && (
            <div style={{ textAlign: 'center', padding: '20px 8px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '9999px',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                }}
              >
                <CheckCircle2 size={42} />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                {t('paymentSuccessVerified', 'Payment Successfully Verified!')}
              </h3>
              <p style={{ margin: '0 0 22px', fontSize: '0.88rem', color: '#64748B' }}>
                {t('subscriptionActiveDb', 'Your business subscription is now active and stored in the database.')}
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  textAlign: 'left',
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxWidth: '460px',
                  margin: '0 auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>{t('planActivatedLabel', 'Plan Activated:')}</span>
                  <span style={{ fontWeight: 800, color: '#059669' }}>
                    {t(verifiedSuccessData.subscription?.planName || '', verifiedSuccessData.subscription?.planName)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>{t('billingCycleLabel', 'Billing Cycle:')}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {t(verifiedSuccessData.subscription?.billingCycle?.toLowerCase() || '', verifiedSuccessData.subscription?.billingCycle)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>{t('validUntilLabel', 'Valid Until:')}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {verifiedSuccessData.subscription?.endDate?.split('T')[0]}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>{t('licenseStatusLabel', 'License Status:')}</span>
                  <span style={{ fontWeight: 800, color: '#16A34A' }}>{t('activeAndVerified', 'Active & Verified')}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FAILURE OR ERROR */}
          {step === 'FAILED' && (
            <div style={{ textAlign: 'center', padding: '20px 8px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '9999px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
                }}
              >
                <AlertCircle size={40} />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 800, color: '#991B1B' }}>
                {t('paymentVerificationIncomplete', 'Payment Verification Incomplete')}
              </h3>
              <p style={{ margin: '0 0 22px', fontSize: '0.88rem', color: '#64748B' }}>
                {errorMessage || t('paymentFailedDefault', 'Your payment could not be confirmed. The subscription was not renewed.')}
              </p>
            </div>
          )}
        </div>

        {/* ================= FIXED MODAL FOOTER ================= */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
            boxShadow: '0 -4px 14px rgba(0, 0, 0, 0.04)',
            flexWrap: 'wrap',
          }}
        >
          {step === 'SELECT' && (
            <>
              {/* Selected Plan Details Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedPlan && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('selectedLabel', 'Selected:')} <strong style={{ color: '#0F172A' }}>{t(selectedPlan.planCode || selectedPlan.name, selectedPlan.name)}</strong> ({t(billingCycle.toLowerCase(), billingCycle)})
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: '1px' }}>
                      ₹{formatNumber(totalPayable)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                        {t('totalPayableInclGst', 'Total Payable (incl. 18% GST)')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={loading || !selectedPlan}
                  onClick={handleProceedToCheckout}
                  style={{
                    padding: '10px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: !selectedPlan ? '#94A3B8' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: !selectedPlan ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: !selectedPlan ? 'none' : '0 4px 14px rgba(5, 150, 105, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{t('generatingOrder', 'Generating Order...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('proceedToCheckout', 'Proceed to Checkout')}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'CHECKOUT' && activeOrder && (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ChevronLeft size={16} />
                <span>{t('backToPlans', 'Back to Plans')}</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmPayment}
                style={{
                  padding: '10px 26px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>{t('verifyingPayment', 'Verifying Payment...')}</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>{t('authorizeAndPay', 'Authorize & Pay')} ₹{formatNumber(activeOrder.totalAmount)}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  padding: '12px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('returnToDashboard', 'Return to Dashboard')}
              </button>
            </div>
          )}

          {step === 'FAILED' && (
            <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('close', 'Close')}
              </button>
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('tryPaymentAgain', 'Try Payment Again')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
