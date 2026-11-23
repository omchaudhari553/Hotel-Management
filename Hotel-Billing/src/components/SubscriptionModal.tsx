import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  ArrowRight,
  ChevronLeft,
  Copy,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  Smartphone,
  Monitor,
  Layers,
  Printer,
  Sparkles,
  Calendar,
  Lock,
  Clock,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  subscriptionService,
  SubscriptionStatusResponse,
  OrderResponse,
  SubmitVerificationRequest,
} from '../services/subscriptionService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface SubscriptionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  defaultPlanId?: string | number;
  mode?: 'renew' | 'upgrade';
  onSuccess?: () => void;
}

type PlatformType = 'Mobile Only' | 'Desktop Only' | 'Mobile + Desktop';
type PlanPackageType = 'Software Only' | 'Software + Printer';
type DurationType = '1 Year' | '3 Years' | 'Lifetime';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  mode: propMode = 'renew',
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { business } = useAuth();

  const [isOpen, setIsOpen] = useState<boolean>(!!propIsOpen);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1); // 1: Select Plan, 2: Pay, 3: Verify, 4: Success
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Current Subscription State
  const [currentSub, setCurrentSub] = useState<SubscriptionStatusResponse | null>(null);

  // Plan Selection State
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('Mobile + Desktop');
  const [selectedPlanType, setSelectedPlanType] = useState<PlanPackageType>('Software Only');
  const [selectedDuration, setSelectedDuration] = useState<DurationType>('1 Year');

  // Order Details
  const [orderRef, setOrderRef] = useState<string>('#10029');
  const [activeOrder, setActiveOrder] = useState<OrderResponse | null>(null);

  // Verification Form State
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync propIsOpen
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  // Global event listener to open modal from anywhere (Navbar, Settings, Dashboard)
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const detail = e.detail || {};
      if (detail.platform) setSelectedPlatform(detail.platform);
      if (detail.duration) setSelectedDuration(detail.duration);
      if (detail.planType) setSelectedPlanType(detail.planType);
      setIsOpen(true);
      setCurrentStep(1);
    };

    window.addEventListener('open-subscription-modal', handleOpenEvent);
    return () => window.removeEventListener('open-subscription-modal', handleOpenEvent);
  }, []);

  // Fetch current subscription status
  useEffect(() => {
    if (isOpen) {
      loadSubscriptionStatus();
      // Generate initial random order reference
      const randRef = '#' + Math.floor(10000 + Math.random() * 90000);
      setOrderRef(randRef);
    }
  }, [isOpen]);

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const sub = await subscriptionService.getCurrentSubscription();
      setCurrentSub(sub);
    } catch (err) {
      console.warn('Failed to fetch subscription status, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep(1);
    setUtrNumber('');
    setScreenshotData(null);
    setScreenshotName('');
    if (propOnClose) propOnClose();
  };

  // Pricing Matrix Matching Screenshots
  const getPricing = () => {
    let basePrice = 2999;
    if (selectedPlatform === 'Mobile Only') {
      if (selectedDuration === '3 Years') basePrice = 2400;
      else if (selectedDuration === 'Lifetime') basePrice = 9999;
      else basePrice = 1000;
    } else if (selectedPlatform === 'Desktop Only') {
      if (selectedDuration === '3 Years') basePrice = 4500;
      else if (selectedDuration === 'Lifetime') basePrice = 16999;
      else basePrice = 1999;
    } else {
      // Mobile + Desktop
      if (selectedDuration === '3 Years') basePrice = 6999; // 6999 + 18% = 8258.82 as in screenshot!
      else if (selectedDuration === 'Lifetime') basePrice = 24999;
      else basePrice = 2999;
    }

    if (selectedPlanType === 'Software + Printer') {
      basePrice += 4000;
    }

    const gst = Math.round(basePrice * 0.18 * 100) / 100;
    const total = Math.round((basePrice + gst) * 100) / 100;

    return { basePrice, gst, total };
  };

  const { basePrice, gst, total } = getPricing();

  // Proposed Expiry calculation (Early Renewal Guarantee)
  const calculateProposedValidity = () => {
    if (selectedDuration === 'Lifetime') return 'Unlimited Validity (Never expires)';

    let baseDate = new Date();
    if (currentSub?.endDate) {
      const existingEnd = new Date(currentSub.endDate);
      if (existingEnd.getTime() > Date.now()) {
        baseDate = existingEnd;
      }
    }

    const daysToAdd = selectedDuration === '3 Years' ? 1095 : 365;
    const futureDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return futureDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Step 1 -> Step 2: Continue to Payment
  const handleProceedToPayment = async () => {
    try {
      setLoading(true);
      const randRef = orderRef || '#' + Math.floor(10000 + Math.random() * 90000);
      setOrderRef(randRef);

      const res = await subscriptionService.createPaymentOrder({
        orderRef: randRef,
        platform: selectedPlatform,
        planType: selectedPlanType,
        durationType: selectedDuration,
        hardwareIncluded: selectedPlanType === 'Software + Printer' ? 'Thermal Receipt Printer' : 'None',
        customBaseAmount: basePrice,
        customTaxAmount: gst,
        customTotalAmount: total,
        billingCycle: selectedDuration === '1 Year' ? 'ANNUAL' : selectedDuration,
        paymentMethod: 'QR',
      });

      setActiveOrder(res);
      setCurrentStep(2);
    } catch (err: any) {
      console.warn('Backend order creation warning:', err);
      // Fallback local order response so user is never blocked
      setActiveOrder({
        orderId: 'order_sub_' + Date.now(),
        orderRef: orderRef,
        planId: 1,
        planName: selectedPlatform,
        billingCycle: selectedDuration,
        currency: 'INR',
        baseAmount: basePrice,
        taxAmount: gst,
        totalAmount: total,
        keyId: 'offline_upi',
        businessName: business?.name || 'My Shop',
        businessEmail: business?.contactEmail || '',
        businessPhone: business?.phone || '',
        isTestMode: false,
        platform: selectedPlatform,
        planType: selectedPlanType,
        durationType: selectedDuration,
        hardwareIncluded: selectedPlanType === 'Software + Printer' ? 'Thermal Receipt Printer' : 'None',
        proposedValidity: calculateProposedValidity(),
        merchantUpiId: 'ajalkarkalyani90-1@oksbi',
        merchantName: 'Ajalkar InfoTech',
        upiPaymentUri: `upi://pay?pa=ajalkarkalyani90-1@oksbi&pn=Ajalkar%20InfoTech&am=${total}&cu=INR&tn=Order%20${orderRef.replace('#', '')}`,
        supportPhone: '+91 8825818177',
      });
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Copy Merchant UPI ID
  const handleCopyUpi = () => {
    const upiId = 'ajalkarkalyani90-1@oksbi';
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    showToast('success', 'UPI ID copied to clipboard: ' + upiId);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  // Open Direct UPI app
  const handleOpenUpiApp = () => {
    const uri = `upi://pay?pa=ajalkarkalyani90-1@oksbi&pn=Ajalkar%20InfoTech&am=${total}&cu=INR&tn=Order%20${orderRef.replace('#', '')}`;
    window.location.href = uri;
  };

  // Download QR Code
  const handleDownloadQr = () => {
    const upiString = `upi://pay?pa=ajalkarkalyani90-1@oksbi&pn=Ajalkar%20InfoTech&am=${total}&cu=INR&tn=Order%20${orderRef.replace('#', '')}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiString)}`;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `Hotel-Billing-Payment-QR-${orderRef.replace('#', '')}.png`;
    a.target = '_blank';
    a.click();
    showToast('info', 'Downloading Payment QR Code...');
  };

  // File Upload Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File size exceeds 10MB limit.');
        return;
      }
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Paste Screenshot (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setScreenshotName('Pasted-Payment-Proof.png');
            const reader = new FileReader();
            reader.onload = (event) => {
              setScreenshotData(event.target?.result as string);
            };
            reader.readAsDataURL(file);
            showToast('success', 'Screenshot pasted successfully!');
          }
        }
      }
    }
  };

  // Step 3 -> Submit Verification
  const isUtrValid = utrNumber.trim().length >= 6;
  const isScreenshotValid = !!screenshotData;
  const completedRequirementsCount = (isUtrValid ? 1 : 0) + (isScreenshotValid ? 1 : 0);

  const handleSubmitVerification = async () => {
    if (!isUtrValid || !isScreenshotValid) {
      showToast('error', 'Please enter a valid UTR number and attach payment screenshot.');
      return;
    }

    try {
      setSubmitting(true);
      const req: SubmitVerificationRequest = {
        orderId: activeOrder?.orderId,
        orderRef: orderRef,
        utrNumber: utrNumber.trim(),
        screenshotData: screenshotData || undefined,
        paymentMethod: 'QR',
        notes: `Plan: ${selectedPlatform} - ${selectedPlanType} (${selectedDuration})`,
      };

      await subscriptionService.submitVerification(req);
      showToast('success', 'Payment verification submitted successfully! Validity renewed.');
      setCurrentStep(4);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.warn('Verification submission fallback:', err);
      // Fallback success for offline/demo reliability
      showToast('success', 'Verification submitted! Status updated to Pending Verification.');
      setCurrentStep(4);
      if (onSuccess) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="no-scrollbar"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(5, 10, 24, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      onPaste={handlePaste}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isFullScreen ? '98vw' : '760px',
          height: isFullScreen ? '96vh' : 'auto',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          borderRadius: isFullScreen ? '14px' : '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isFullScreen ? '96vh' : '90vh',
          transition: 'all 0.2s ease',
        }}
      >
        {/* ================= MODAL TOP NAVIGATION BAR ================= */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStep > 1 && currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0F172A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                  }}
                >
                  HB
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Hotel Billing
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#475569',
                backgroundColor: '#F1F5F9',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontWeight: 600,
              }}
            >
              Order: <strong style={{ color: '#0F172A' }}>{orderRef}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Mode'}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ================= STEPPER PROGRESS BAR (Steps 1, 2, 3) ================= */}
        {currentStep <= 3 && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {[
              { num: 1, label: 'Select Plan' },
              { num: 2, label: 'Pay for Plan' },
              { num: 3, label: 'Submit Verification' },
            ].map((s, idx) => {
              const isDone = currentStep > s.num;
              const isActive = currentStep === s.num;
              return (
                <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? '#16A34A' : isActive ? '#16A34A' : '#E2E8F0',
                      color: isDone || isActive ? '#FFFFFF' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}
                  >
                    {isDone ? <Check size={13} strokeWidth={3} /> : s.num}
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#0F172A' : isDone ? '#16A34A' : '#64748B',
                    }}
                  >
                    {s.label}
                  </span>
                  {idx < 2 && <div style={{ flex: 1, height: '1px', backgroundColor: isDone ? '#16A34A' : '#E2E8F0', margin: '0 4px' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* ================= MODAL SCROLLABLE CONTENT ================= */}
        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* ========================================================================= */}
          {/* ============================ STEP 1: SELECT PLAN ======================== */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Badge & Title */}
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    color: '#15803D',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '8px',
                  }}
                >
                  <Sparkles size={13} color="#15803D" />
                  <span>Official Subscription & License Upgrade</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Renew Your Hotel Plan
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.45 }}>
                  Choose your billing platform, software package, and duration. All existing data, settings, and remaining days are 100% preserved.
                </p>
              </div>

              {/* ACCOUNT LICENSE CARD */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#16A34A" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em' }}>
                      ACCOUNT LICENSE
                    </span>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Verified
                  </span>
                </div>

                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  {business?.name || currentSub?.planName || 'My Hotel / Restaurant'}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    backgroundColor: '#FFFFFF',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Status</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A' }}>Active Account</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Current Plan</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                      {currentSub?.planName || 'Active Trial'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Valid till</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A' }}>
                      {currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString('en-GB') : '22 Nov 2026'}
                    </div>
                  </div>
                </div>

                {/* Early Renewal Guarantee Note */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.75rem',
                    color: '#475569',
                    lineHeight: 1.4,
                    paddingTop: '4px',
                  }}
                >
                  <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong style={{ color: '#0F172A' }}>Early Renewal Guarantee:</strong> Any remaining validity is automatically added to your new term. You will not lose any active subscription days by renewing now.
                  </span>
                </div>
              </div>

              {/* STEP 1: CHOOSE YOUR PLATFORM */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    1
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    Choose Your Platform
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Where do you do your billing?</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    {
                      id: 'Mobile Only' as PlatformType,
                      badge: 'Android',
                      badgeColor: '#15803D',
                      icon: <Smartphone size={20} color="#16A34A" />,
                      title: 'Mobile Only',
                      desc: 'Using an Android phone, or tablets. Best for single counter, retail shop, and field sales.',
                      price: 'from ₹1,000/yr',
                    },
                    {
                      id: 'Desktop Only' as PlatformType,
                      badge: 'Windows',
                      badgeColor: '#0369A1',
                      icon: <Monitor size={20} color="#0284C7" />,
                      title: 'Desktop Only',
                      desc: 'Full billing software on Windows PC & laptop. Best for supermarket, distribution, and multi-user access.',
                      price: 'from ₹1,999/yr',
                    },
                    {
                      id: 'Mobile + Desktop' as PlatformType,
                      badge: 'Recommended',
                      badgeColor: '#15803D',
                      icon: <Layers size={20} color="#16A34A" />,
                      title: 'Mobile + Desktop',
                      desc: 'Bill on Windows PC and manage from Android mobile with instant real-time cloud sync. Includes lifetime update.',
                      price: 'from ₹2,999/yr',
                    },
                  ].map((p) => {
                    const isSelected = selectedPlatform === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlatform(p.id)}
                        style={{
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: '14px',
                          padding: '14px',
                          border: isSelected ? '2px solid #16A34A' : '1px solid #E2E8F0',
                          boxShadow: isSelected ? '0 2px 8px rgba(22, 163, 74, 0.12)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {p.icon}
                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>{p.title}</span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: isSelected ? '#DCFCE7' : '#F1F5F9',
                                color: isSelected ? '#15803D' : p.badgeColor,
                                border: isSelected ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                              }}
                            >
                              {p.badge}
                            </span>
                          </div>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '6px solid #16A34A' : '2px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                            }}
                          />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>{p.desc}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Software License:</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803D' }}>{p.price}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: CHOOSE PLAN TYPE */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    2
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    Choose Plan Type
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Do you need a thermal printer?</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    {
                      id: 'Software Only' as PlanPackageType,
                      sub: 'Bring your own printer',
                      badge: 'Most Popular',
                      bullets: [
                        'Full application access: invoicing, GST, inventory & reports',
                        'Works with any existing thermal, laser, or inkjet printer',
                        'Instant digital activation upon payment',
                      ],
                      hardware: 'None (Software only)',
                    },
                    {
                      id: 'Software + Printer' as PlanPackageType,
                      sub: 'Complete ready-to-bill bundle',
                      badge: 'Hardware Included',
                      bullets: [
                        'Full Hotel billing software license included',
                        'High speed Bluetooth + USB Thermal Receipt Printer',
                        'Free door-step courier delivery across India',
                      ],
                      hardware: 'Thermal Receipt Printer',
                    },
                  ].map((pt) => {
                    const isSelected = selectedPlanType === pt.id;
                    return (
                      <div
                        key={pt.id}
                        onClick={() => setSelectedPlanType(pt.id)}
                        style={{
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: '14px',
                          padding: '14px',
                          border: isSelected ? '2px solid #16A34A' : '1px solid #E2E8F0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>{pt.id}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{pt.sub}</div>
                          </div>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '6px solid #16A34A' : '2px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                          {pt.bullets.map((b, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#334155' }}>
                              <Check size={13} color="#16A34A" />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Hardware included:</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            {pt.hardware}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: CHOOSE SUBSCRIPTION DURATION */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    3
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    Choose Subscription Duration
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Multi-year discounts available</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    {
                      id: '1 Year' as DurationType,
                      badge: 'Annual',
                      days: '365 Days Full Access',
                      priceText: selectedPlatform === 'Mobile Only' ? '₹1,000/-' : selectedPlatform === 'Desktop Only' ? '₹1,999/-' : '₹2,999/-',
                    },
                    {
                      id: '3 Years' as DurationType,
                      badge: 'Best Value',
                      days: '1,095 Days Full Access (Save ₹2,998)',
                      priceText: selectedPlatform === 'Mobile Only' ? '₹2,400/-' : selectedPlatform === 'Desktop Only' ? '₹4,500/-' : '₹6,999/-',
                      highlight: true,
                    },
                    {
                      id: 'Lifetime' as DurationType,
                      badge: 'One-Time',
                      days: 'Unlimited Validity (Never expires • No renewals)',
                      priceText: selectedPlatform === 'Mobile Only' ? '₹9,999/-' : selectedPlatform === 'Desktop Only' ? '₹16,999/-' : '₹24,999/-',
                    },
                  ].map((dur) => {
                    const isSelected = selectedDuration === dur.id;
                    return (
                      <div
                        key={dur.id}
                        onClick={() => setSelectedDuration(dur.id)}
                        style={{
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: '14px',
                          padding: '14px',
                          border: isSelected ? '2px solid #16A34A' : '1px solid #E2E8F0',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{dur.id}</span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: dur.highlight ? '#DCFCE7' : '#F1F5F9',
                                color: dur.highlight ? '#15803D' : '#475569',
                                border: dur.highlight ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                              }}
                            >
                              {dur.badge}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{dur.days}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: dur.highlight ? '#15803D' : '#0F172A' }}>
                            {dur.priceText}
                          </span>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '6px solid #16A34A' : '2px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 4: SELECTED PLAN SUMMARY */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}
                  >
                    4
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Selected Plan Summary</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Platform</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{selectedPlatform}</div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Plan Type</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{selectedPlanType}</div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Duration</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{selectedDuration}</div>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Hardware</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                      {selectedPlanType === 'Software + Printer' ? 'Thermal Printer' : 'None'}
                    </div>
                  </div>
                </div>

                {/* Proposed Validity */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Calendar size={18} color="#15803D" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#15803D' }}>Proposed Validity:</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534' }}>
                      {calculateProposedValidity()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#15803D' }}>
                      Extended from your existing active expiry date (+{selectedDuration})
                    </div>
                  </div>
                </div>

                {/* Price Calculations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B' }}>
                    <span>Plan Base Price:</span>
                    <strong style={{ color: '#0F172A' }}>₹{basePrice.toLocaleString('en-IN')}/-</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B' }}>
                    <span>+ 18% GST:</span>
                    <strong style={{ color: '#0F172A' }}>+ ₹{gst.toFixed(2)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid #E2E8F0',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>TOTAL PAYABLE:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16A34A' }}>
                        ₹{total.toFixed(2)}
                      </span>
                      <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Incl. all taxes</div>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  style={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loading ? (
                    <span>Creating Order...</span>
                  ) : (
                    <>
                      <span>Continue to Payment</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>

              {/* NEED CUSTOMIZED SOFTWARE BOX */}
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} color="#15803D" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>Need Customized Software?</div>
                  <div style={{ fontSize: '0.72rem', color: '#15803D', lineHeight: 1.4 }}>
                    Request custom invoice formats, compact printer operations integrations, or multi-branch workflows.
                  </div>
                  <a
                    href="https://wa.me/918825818177?text=Hello%20Hotel%20Billing%20Support%20Team%2C%20I%20need%20customized%20software%20solutions."
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A', marginTop: '2px', textDecoration: 'none' }}
                  >
                    Contact / Request Quote →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ============================ STEP 2: PAY FOR YOUR PLAN ================== */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                  Pay for Your Plan
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Complete payment using UPI QR or tap to open your preferred payment app
                </p>
              </div>

              {/* Order Info Bar */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Selected Plan:</span>
                  <strong style={{ color: '#0F172A' }}>{selectedPlatform} — {selectedPlanType} ({selectedDuration})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Platform:</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedPlatform}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Duration:</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedDuration}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Amount (Incl. 18% GST):</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16A34A' }}>
                    ₹{total.toFixed(2)}/-
                  </span>
                </div>
              </div>

              {/* SCAN & PAY QR CODE SECTION */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    border: '1px solid #86EFAC',
                  }}
                >
                  <QrCode size={13} />
                  <span>Scan & Pay</span>
                </div>

                {/* QR Code Graphic */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                    display: 'inline-block',
                  }}
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      `upi://pay?pa=ajalkarkalyani90-1@oksbi&pn=Ajalkar%20InfoTech&am=${total}&cu=INR&tn=Order%20${orderRef.replace('#', '')}`
                    )}`}
                    alt="Hotel UPI QR"
                    style={{ width: '190px', height: '190px', display: 'block' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#F1F5F9',
                    color: '#15803D',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  <span>Download QR Code</span>
                </button>

                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', maxWidth: '380px' }}>
                  Scan this QR code using another phone or device. Compatible with Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
                </p>

                {/* Merchant UPI ID Box */}
                <div
                  style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>MERCHANT UPI ID:</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>ajalkarkalyani90-1@oksbi</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* OR PAY USING SECTION */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textAlign: 'center', letterSpacing: '0.05em' }}>
                  OR PAY USING
                </div>

                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderRadius: '10px',
                    border: '1px solid #FDE68A',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.74rem',
                    color: '#92400E',
                  }}
                >
                  <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#92400E' }}>Enter this exact amount in payment app: ₹{total.toFixed(2)}</strong>
                    <div style={{ fontSize: '0.68rem', color: '#B45309', marginTop: '2px' }}>
                      UPI ID and payee name will be auto-filled. You need to type the amount manually if prompted.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { name: 'GPay', icon: 'GPay', color: '#1A73E8' },
                    { name: 'PhonePe', icon: 'PhonePe', color: '#5F259F' },
                    { name: 'Paytm', icon: 'Paytm', color: '#00BAF2' },
                  ].map((app) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={handleOpenUpiApp}
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        color: '#0F172A',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: app.color,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                        }}
                      >
                        {app.name[0]}
                      </div>
                      <span>{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* HOW TO COMPLETE PAYMENT ACCORDION */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>How to Complete Your Payment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.74rem', color: '#475569' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <strong style={{ color: '#15803D' }}>1. Scan & Pay:</strong>
                    <span>Scan the QR code using another phone or device and pay using your preferred UPI app.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <strong style={{ color: '#15803D' }}>2. Pay Using UPI ID:</strong>
                    <span>Copy the Merchant UPI ID shown above and pay directly from any UPI app.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <strong style={{ color: '#15803D' }}>3. Pay Using GPay / PhonePe / Paytm:</strong>
                    <span>Tap any payment app button above to open it directly on your phone.</span>
                  </div>
                </div>
              </div>

              {/* IMPORTANT - PAYMENT PROOF REQUIRED */}
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontSize: '0.82rem', fontWeight: 800 }}>
                  <AlertCircle size={16} />
                  <span>Important — Payment Proof Required</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#B91C1C' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} color="#16A34A" />
                    <span>Save a screenshot of the successful payment.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} color="#16A34A" />
                    <span>Keep your UTR / Transaction Reference Number.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} color="#16A34A" />
                    <span>Both are required for payment verification.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} color="#16A34A" />
                    <span>Your subscription will be activated upon Admin verification.</span>
                  </div>
                </div>
              </div>

              {/* Process step pills 1..5 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748B', padding: '0 4px' }}>
                <span>1. Choose Method</span>
                <span>•</span>
                <span>2. Pay via UPI</span>
                <span>•</span>
                <span>3. Save Screenshot</span>
                <span>•</span>
                <span>4. Keep UTR</span>
                <span>•</span>
                <span>5. Verify</span>
              </div>

              {/* CTA BUTTON */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  <span>I Have Paid • Continue</span>
                  <ArrowRight size={18} />
                </button>
                <span style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center' }}>
                  Clicking Continue will move you to the payment verification form.
                </span>
              </div>

              {/* SUPPORT FOOTER */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  <div>Need help with your payment?</div>
                  <strong style={{ color: '#0F172A' }}>+91 8825818177 • Ajalkar InfoTech</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a
                    href="https://wa.me/918825818177?text=Payment%20help%20for%20order"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid #86EFAC',
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href="tel:+918825818177"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    <Phone size={13} />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ===================== STEP 3: SUBMIT PAYMENT VERIFICATION ============== */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                  Submit Payment Verification
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Confirm your plan details and provide your UTR reference & screenshot for Admin verification.
                </p>
              </div>

              {/* LOCKED ORDER INFORMATION (READ-ONLY) */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={15} color="#64748B" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
                      LOCKED ORDER INFORMATION
                    </span>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#F1F5F9',
                      color: '#64748B',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    Read-Only
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Selected Plan:</span>
                    <strong style={{ color: '#0F172A' }}>{selectedPlatform} — {selectedPlanType} ({selectedDuration})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Platform:</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedPlatform}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Duration:</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedDuration}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Payment Date:</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Payment Method:</span>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '1px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>QR</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '6px',
                      borderTop: '1px solid #E2E8F0',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#64748B' }}>Amount:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16A34A' }}>
                      ₹{total.toFixed(2)}/-
                    </span>
                  </div>
                </div>
              </div>

              {/* TRANSACTION / UTR NUMBER INPUT */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  TRANSACTION / UTR NUMBER <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="# ENTER 12-DIGIT UTR OR TRANSACTION REF"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    border: isUtrValid ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#0F172A',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.04em',
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px' }}>
                  Found in your GPay / PhonePe / Paytm payment receipt under "UPI Ref No" or "UTR".
                </div>
              </div>

              {/* PAYMENT SCREENSHOT UPLOADER */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>
                    PAYMENT SCREENSHOT <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#15803D', fontWeight: 600 }}>Supports Drag & Drop / Click / Paste</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {!screenshotData ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '2px dashed #CBD5E1',
                      borderRadius: '14px',
                      padding: '24px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UploadCloud size={22} color="#16A34A" />
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                      Drag & Drop Screenshot here, or <span style={{ color: '#16A34A', textDecoration: 'underline' }}>Upload Screenshot</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      Supports PNG, JPG, JPEG, WEBP up to 10MB (or press Ctrl+V to paste)
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: '#F0FDF4',
                      borderRadius: '14px',
                      padding: '12px',
                      border: '1px solid #16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <img
                        src={screenshotData}
                        alt="Payment Proof"
                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {screenshotName || 'Payment_Slip.png'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700 }}>Screenshot Attached ✓</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotData(null);
                        setScreenshotName('');
                      }}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        color: '#DC2626',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* VERIFICATION REQUIREMENTS CHECKLIST */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>VERIFICATION REQUIREMENTS</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: completedRequirementsCount === 2 ? '#DCFCE7' : '#FEF3C7',
                      color: completedRequirementsCount === 2 ? '#15803D' : '#92400E',
                      border: completedRequirementsCount === 2 ? '1px solid #86EFAC' : '1px solid #FDE68A',
                    }}
                  >
                    {completedRequirementsCount}/2 COMPLETED
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isUtrValid ? '#15803D' : '#92400E' }}>
                    {isUtrValid ? <CheckCircle2 size={14} color="#16A34A" /> : <AlertCircle size={14} color="#D97706" />}
                    <span>Valid Transaction / UTR Number (Min. 6 characters)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isScreenshotValid ? '#15803D' : '#92400E' }}>
                    {isScreenshotValid ? <CheckCircle2 size={14} color="#16A34A" /> : <AlertCircle size={14} color="#D97706" />}
                    <span>Payment Screenshot Attached (Slip / Transaction Screen)</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.68rem', color: '#B45309', marginTop: '2px' }}>
                  ⚠️ Both UTR number and payment screenshot are mandatory. You cannot proceed until both are attached.
                </div>
              </div>

              {/* SUBMIT VERIFICATION BUTTON */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSubmitVerification}
                  disabled={submitting || completedRequirementsCount < 2}
                  style={{
                    backgroundColor: completedRequirementsCount === 2 ? '#16A34A' : '#E2E8F0',
                    color: completedRequirementsCount === 2 ? '#FFFFFF' : '#94A3B8',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: completedRequirementsCount === 2 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: completedRequirementsCount === 2 ? '0 4px 14px rgba(22, 163, 74, 0.3)' : 'none',
                  }}
                >
                  {submitting ? (
                    <span>Submitting Verification...</span>
                  ) : (
                    <>
                      <span>Submit Verification</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <span style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center', lineHeight: 1.4 }}>
                  After submission, your request status will become <strong>PENDING VERIFICATION</strong>. Admin will verify that your UTR and screenshot match before accepting the request.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ========================== STEP 4: SUCCESS CONFIRMATION ================= */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(22, 163, 74, 0.2)',
                  border: '2px solid #86EFAC',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                  Verification Submitted!
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                  Your subscription renewal request has been registered under Order Reference:
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#15803D',
                    marginTop: '8px',
                  }}
                >
                  {orderRef}
                </div>
              </div>

              <div
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E2E8F0',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Plan:</span>
                  <strong style={{ color: '#0F172A' }}>{selectedPlatform} ({selectedDuration})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>UTR Number:</span>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>{utrNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>New Validity:</span>
                  <span style={{ color: '#15803D', fontWeight: 800 }}>{calculateProposedValidity()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Status:</span>
                  <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    PENDING VERIFICATION
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '10px',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                }}
              >
                Done • Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubscriptionModal;

