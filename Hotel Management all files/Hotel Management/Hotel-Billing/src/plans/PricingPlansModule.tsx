import React, { useState, useEffect } from 'react';
import { useIndustry } from '../context/IndustryContext';
import { useToast } from '../context/ToastContext';
import { Check, Zap, Sparkles, Shield, ArrowRight, Building2, UtensilsCrossed, Coffee, Calendar, RefreshCw } from 'lucide-react';
import { licenceService, LicenceInfo } from '../services/licenceService';
import { useLanguage } from '../context/LanguageContext';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  isPopular?: boolean;
  features: string[];
  ctaText: string;
}

export const PricingPlansModule: React.FC = () => {
  const { activeIndustryCode, selectedIndustry } = useIndustry();
  const { showToast } = useToast();
  const { t, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [activePlanId, setActivePlanId] = useState<string>('pro');
  const [licenceInfo, setLicenceInfo] = useState<LicenceInfo>({
    licenceVersion: 'Enterprise',
    subscriptionPlan: 'Enterprise',
    trialDurationDays: 28,
    trialStatus: 'Active',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStatus: 'Active & Verified',
    renewalDate: null,
    daysRemaining: 28,
    isEligibleForTrial: false,
  });
  const [licenceLoading, setLicenceLoading] = useState<boolean>(false);

  const fetchLicence = async () => {
    try {
      const data = await licenceService.getLicenceInfo();
      setLicenceInfo(data);
    } catch (e) {
      console.warn('Failed to fetch licence info', e);
    }
  };

  useEffect(() => {
    fetchLicence();
    window.addEventListener('licence-updated', fetchLicence);
    return () => window.removeEventListener('licence-updated', fetchLicence);
  }, []);

  const handleStartTrial = async () => {
    try {
      setLicenceLoading(true);
      const updated = await licenceService.startFreeTrial();
      setLicenceInfo(updated);
      showToast('success', '28 Days Free Trial Activated! Enjoy full access to Enterprise features.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to start free trial.');
    } finally {
      setLicenceLoading(false);
    }
  };

  const handleRenewSubscription = () => {
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { mode: 'renew' },
      })
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not Applicable';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getIndustryPlans = (): { title: string; subtitle: string; icon: React.ReactNode; color: string; plans: PricingPlan[] } => {
    switch (activeIndustryCode) {
      case 'HOTEL':
        return {
          title: 'Hotel & Restaurant POS Subscriptions',
          subtitle: 'Designed specifically for hoteliers, boutique resorts, and multi-floor restaurants.',
          icon: <Building2 size={24} color="#7C2D12" />,
          color: '#7C2D12',
          plans: [
            {
              id: 'starter',
              name: 'Hotel Starter',
              price: activeTab === 'MONTHLY' ? '₹1,499' : '₹1,199',
              period: '/month',
              description: 'Ideal for small lodges, guesthouses, and homestays with up to 15 rooms.',
              features: [
                'Up to 15 Rooms Management',
                'Front Desk & Guest Directory',
                'Check-in / Check-out Workflow',
                'Universal GST Billing & Invoicing',
                'Daily Occupancy Statistics',
                'Email & Phone Support',
              ],
              ctaText: 'Select Starter Plan',
            },
            {
              id: 'pro',
              name: 'Hotel Professional',
              price: activeTab === 'MONTHLY' ? '₹2,999' : '₹2,399',
              period: '/month',
              description: 'Best for standard hotels & multi-floor dining restaurants.',
              isPopular: true,
              features: [
                'Up to 50 Rooms & Floor Grids',
                'Integrated Room Service Billing',
                'Housekeeping & Maintenance Tracker',
                'Inventory & Linen Stock Deductions',
                'Comprehensive Revenue Reports & KPIs',
                'Multiple Staff User Accounts',
                'Priority 24/7 Support',
              ],
              ctaText: 'Active Plan (Current)',
            },
            {
              id: 'enterprise',
              name: 'Hotel Enterprise',
              price: activeTab === 'MONTHLY' ? '₹5,999' : '₹4,799',
              period: '/month',
              description: 'Full capabilities for luxury resorts, hotel chains, and multi-property groups.',
              features: [
                'Unlimited Rooms & Banquet Halls',
                'Multi-Building Floor Layouts',
                'Multi-Tender Advanced Invoicing',
                'Supplier Purchase Ledger & Auto-Reorder',
                'Dedicated Account Manager',
                'Custom Integrations & API Access',
              ],
              ctaText: 'Upgrade to Enterprise',
            },
          ],
        };

      case 'MESS':
        return {
          title: 'Mess & Tiffin Subscription Plans',
          subtitle: 'Engineered specifically for student messes, dining halls, and daily tiffin delivery services.',
          icon: <UtensilsCrossed size={24} color="#047857" />,
          color: '#047857',
          plans: [
            {
              id: 'starter',
              name: 'Mess Basic',
              price: activeTab === 'MONTHLY' ? '₹999' : '₹799',
              period: '/month',
              description: 'Perfect for local dining messes with up to 50 active subscribers.',
              features: [
                'Up to 50 Active Members',
                'Daily Meal Attendance Counter',
                'Monthly & Weekly Pass Billing',
                'Basic Weekly Menu Display',
                'Payment Status Ledger',
                'Email & Chat Support',
              ],
              ctaText: 'Select Basic Plan',
            },
            {
              id: 'pro',
              name: 'Mess Pro & Tiffin',
              price: activeTab === 'MONTHLY' ? '₹1,999' : '₹1,599',
              period: '/month',
              description: 'Ideal for growing messes with delivery tiffin operations.',
              isPopular: true,
              features: [
                'Up to 250 Active Subscribers',
                'Tiffin Delivery Route Dispatcher',
                'Automated QR/Card Attendance',
                'Weekly Breakfast/Lunch/Dinner Planner',
                'Automated Monthly Invoicing & GST',
                'Ingredient Inventory Tracker',
                'Priority Phone Support',
              ],
              ctaText: 'Active Plan (Current)',
            },
            {
              id: 'enterprise',
              name: 'Catering Commercial',
              price: activeTab === 'MONTHLY' ? '₹3,499' : '₹2,799',
              period: '/month',
              description: 'Full-scale solution for commercial cloud kitchens & university catering.',
              features: [
                'Unlimited Subscribers & Routes',
                'Multi-Kitchen Fleet Management',
                'Bulk Order & Event Catering Ledger',
                'Real-time WhatsApp Delivery Alerts',
                'Automated Supplier Stock Replenishment',
                'Custom Reports & Analytics',
              ],
              ctaText: 'Upgrade to Catering Plan',
            },
          ],
        };

      case 'CAFE':
      default:
        return {
          title: 'Cafe & Restaurant POS Subscriptions',
          subtitle: 'Designed specifically for cafes, bistros, espresso bars, and QSR counters.',
          icon: <Coffee size={24} color="#A56F63" />,
          color: '#A56F63',
          plans: [
            {
              id: 'starter',
              name: 'Counter Express',
              price: activeTab === 'MONTHLY' ? '₹799' : '₹649',
              period: '/month',
              description: 'Fast single-counter checkout for coffee shops, juice bars, and bakeries.',
              features: [
                'Single Terminal Fast POS',
                'Digital & Thermal Receipt Billing',
                'Menu Item Catalog with Modifiers',
                'UPI & Cash Tender Handling',
                'Daily Sales & Revenue Summary',
                'Standard Email Support',
              ],
              ctaText: 'Select Express Plan',
            },
            {
              id: 'pro',
              name: 'Bistro & Dine-In',
              price: activeTab === 'MONTHLY' ? '₹1,499' : '₹1,199',
              period: '/month',
              description: 'Full-service dine-in cafes with table layouts and kitchen printing.',
              isPopular: true,
              features: [
                'Interactive Floor Table Grid Map',
                'Kitchen Order Tickets (KOT)',
                'Table Reservation & Waitlist Tracker',
                'Recipe Costing & Inventory Auto-Deduct',
                'Discounts & Customer CRM Loyalty',
                'Multiple Cashier Login Profiles',
                'Priority 24/7 Support',
              ],
              ctaText: 'Active Plan (Current)',
            },
            {
              id: 'enterprise',
              name: 'QSR & Multi-Outlet',
              price: activeTab === 'MONTHLY' ? '₹2,799' : '₹2,249',
              period: '/month',
              description: 'High-volume franchises and multi-counter quick service restaurants.',
              features: [
                'Multi-Counter POS Terminals',
                'Kitchen Display System (KDS) Screen',
                'Centralized Inventory & Warehouse Hub',
                'Aggregator Online Order Sync',
                'Advanced Hourly Sales Analytics',
                'Dedicated Account Manager',
              ],
              ctaText: 'Upgrade to QSR Plan',
            },
          ],
        };
    }
  };

  const currentTheme = getIndustryPlans();

  const handleSelectPlan = (planId: string, planName: string) => {
    setActivePlanId(planId);
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { planId, mode: 'upgrade' },
      })
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div
        className="card"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '32px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#F0EEF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #D7D0F0',
              }}
            >
              {currentTheme.icon}
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#090040',
              }}
            >
              {selectedIndustry?.name || 'Industry'} Dedicated Pricing
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#090040', marginBottom: '6px' }}>
            {currentTheme.title}
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#475569', maxWidth: '640px' }}>
            {currentTheme.subtitle} Pricing automatically tailored to your selected industry workspace.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
          }}
        >
          <button
            onClick={() => setActiveTab('MONTHLY')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'MONTHLY' ? '#090040' : 'transparent',
              color: activeTab === 'MONTHLY' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            {t('monthly', 'Monthly')}
          </button>
          <button
            onClick={() => setActiveTab('ANNUAL')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'ANNUAL' ? '#090040' : 'transparent',
              color: activeTab === 'ANNUAL' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{t('annual', 'Annual')}</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                fontWeight: 700,
              }}
            >
              {t('save20Percent', '20% OFF')}
            </span>
          </button>
        </div>
      </div>

      {/* Prominent Enterprise 28 Days Free Trial Offer Section */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #090040 0%, #1E1B4B 60%, #0F172A 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 40px -15px rgba(9, 0, 64, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '220px',
            height: '220px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '24px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: '680px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                }}
              >
                {t('daysTrial', '28 Days Free Trial')}
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#E2E8F0',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {t('planName', 'Plan Name')}: {t('enterprise', 'Enterprise')}
              </span>
              <span
                style={{
                  background:
                    licenceInfo.trialStatus === 'Active'
                      ? '#059669'
                      : licenceInfo.trialStatus === 'Expired'
                        ? '#DC2626'
                        : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                }}
              >
                {t('status', 'Status')}:{' '}
                {licenceInfo.trialStatus === 'Active'
                  ? `${t('trialActive', 'Active')} (${formatNumber(Math.min(28, Math.max(0, licenceInfo.daysRemaining)))} ${t('daysLeft', 'Days Left')})`
                  : t(licenceInfo.trialStatus, licenceInfo.trialStatus)}
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.9rem',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '0 0 10px 0',
                letterSpacing: '-0.02em',
              }}
            >
              {t('enterpriseFreeTrialOffer', 'Enterprise Free Trial Offer')}
            </h2>

            <p
              style={{
                fontSize: '1rem',
                color: '#CBD5E1',
                margin: '0 0 20px 0',
                lineHeight: 1.55,
              }}
            >
              {t('trialPromoDesc', 'Experience the Enterprise features of Ajalkar POS Billing with a 28-day free trial. Explore the available features before choosing your subscription plan.')}
            </p>

            {/* Enterprise Features List */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              {[
                'Unlimited Rooms, Banquet Halls & Outlets',
                'Multi-Building Floor Layouts & KOTs',
                'Multi-Tender Advanced Invoicing & Automated GST',
                'Supplier Purchase Ledger & Auto-Reorder',
                '24/7 Dedicated Account Manager & SLA Support',
                'Custom Integrations, API Access & Automated Cloud Backup',
              ].map((feat, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.86rem',
                    color: '#F1F5F9',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.25)',
                      border: '1px solid #F59E0B',
                      color: '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Trial Details Stats Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '12px 18px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Trial Duration
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                  28 Calendar Days
                </div>
              </div>
              <div
                style={{
                  width: '1px',
                  height: '24px',
                  background: 'rgba(255, 255, 255, 0.15)',
                }}
              />
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Trial Start Date
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FCD34D' }}>
                  {formatDate(licenceInfo.trialStartDate)}
                </div>
              </div>
              <div
                style={{
                  width: '1px',
                  height: '24px',
                  background: 'rgba(255, 255, 255, 0.15)',
                }}
              />
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Trial End Date
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FCD34D' }}>
                  {formatDate(licenceInfo.trialEndDate)}
                </div>
              </div>
              <div
                style={{
                  width: '1px',
                  height: '24px',
                  background: 'rgba(255, 255, 255, 0.15)',
                }}
              />
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Subscription Status
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34D399' }}>
                  {licenceInfo.subscriptionStatus}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
            {licenceInfo.trialStatus === 'Not Started' ? (
              <button
                type="button"
                disabled={licenceLoading}
                onClick={handleStartTrial}
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Zap size={18} />
                <span>{licenceLoading ? t('activatingTrial', 'Activating...') : t('startFreeTrial', 'Start Free Trial')}</span>
              </button>
            ) : licenceInfo.trialStatus === 'Active' ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1.5px solid #10B981',
                  color: '#A7F3D0',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textAlign: 'center',
                }}
              >
                ✓ {t('trialActive', 'Trial Active')} · {formatNumber(Math.min(28, Math.max(0, licenceInfo.daysRemaining)))} {t('daysLeft', 'Days Left')}
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1.5px solid #EF4444',
                  color: '#FCA5A5',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textAlign: 'center',
                }}
              >
                ⚠ {t('freeTrialExpired', 'Free Trial Expired')}
              </div>
            )}

            <button
              type="button"
              disabled={licenceLoading}
              onClick={handleRenewSubscription}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={15} />
              <span>{t('renewSubscription', 'Renew Subscription')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPlan('enterprise', 'Hotel Enterprise')}
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowRight size={15} />
              <span>{t('upgradePlan', 'Upgrade Plan')}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {currentTheme.plans.map((plan) => {
          const isSelected = activePlanId === plan.id;

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '32px 28px',
                border: plan.isPopular ? '2px solid #090040' : '1px solid #E2E8F0',
                position: 'relative',
                boxShadow: plan.isPopular
                  ? '0 12px 28px -6px rgba(9, 0, 64, 0.25)'
                  : '0 1px 3px 0 rgba(9, 0, 64, 0.05)',
                backgroundColor: '#FFFFFF',
                transform: plan.isPopular ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {plan.isPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {t('mostPopular', 'MOST POPULAR')}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#090040' }}>{t(plan.name, plan.name)}</h3>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #090040' : '2px solid #CBD5E1',
                      backgroundColor: isSelected ? '#090040' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>

                <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '18px', minHeight: '40px' }}>
                  {t(plan.description, plan.description)}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    marginBottom: '22px',
                    paddingBottom: '18px',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#090040' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.88rem', color: '#475569' }}>/ {t('month', 'month')}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '28px' }}>
                  {plan.features.map((feat, fidx) => (
                    <div key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '0.86rem', color: '#090040' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#F0EEF8',
                          color: '#090040',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span>{t(feat, feat)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id, plan.name)}
                className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>{t(plan.ctaText, plan.ctaText)}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
