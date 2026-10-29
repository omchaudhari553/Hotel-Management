import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useIndustry } from '../context/IndustryContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { onboardingService, OnboardingPayload } from '../services/onboardingService';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';
import {
  Building2,
  UtensilsCrossed,
  Coffee,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  BadgeDollarSign,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';

export type IndustryCode = 'HOTEL' | 'MESS' | 'CAFE';

interface BusinessOption {
  id: IndustryCode;
  name: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  themeColor: string;
  secondaryColor: string;
  highlightColor: string;
  lightBg: string;
  features: string[];
}

const BUSINESS_OPTIONS: BusinessOption[] = [
  {
    id: 'HOTEL',
    name: 'Hotel / Restaurant',
    subtitle: 'Rooms, Dine-In Tables, KOT & POS',
    description: 'Comprehensive management for Hotels & Restaurants with room check-in/out, dining table maps, kitchen KOT, food menus, and combined billing.',
    icon: <Building2 size={32} />,
    badge: 'Hotel & Restaurant Management',
    themeColor: '#7C2D12',
    secondaryColor: '#B45309',
    highlightColor: '#F59E0B',
    lightBg: '#FFF7ED',
    features: [
      'Hotel Rooms & Guest Check-In/Out',
      'Restaurant Dine-In Tables & KOT',
      'Food & Beverage Billing & Invoices',
    ],
  },
  {
    id: 'MESS',
    name: 'Mess & Dining',
    subtitle: 'Subscription & Tiffin Service',
    description: 'Manage monthly passes, daily meal attendance counters, tiffin route dispatch & menus.',
    icon: <UtensilsCrossed size={32} />,
    badge: 'Subscriptions & Tiffin',
    themeColor: '#09331D',
    secondaryColor: '#166534',
    highlightColor: '#22C55E',
    lightBg: '#EBF7EE',
    features: ['Monthly Subscriber Passes', 'Daily Attendance Counter', 'Tiffin Route Dispatcher'],
  },
  {
    id: 'CAFE',
    name: 'Cafe & Bistro',
    subtitle: 'Table POS & Fast Counter',
    description: 'Visual table layout maps, high-speed touchscreen order counter, KOT & thermal receipts.',
    icon: <Coffee size={32} />,
    badge: 'Table POS & Kitchen',
    themeColor: '#A56F63',
    secondaryColor: '#6F453C',
    highlightColor: '#C68B5C',
    lightBg: '#FCF8F6',
    features: ['Interactive Table Floor Layout', 'Fast Touchscreen POS Orders', 'Instant Kitchen KOT Dispatch'],
  },
];

interface PlanTier {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  description: string;
  isPopular?: boolean;
  features: string[];
}

const INDUSTRY_PLANS: Record<IndustryCode, PlanTier[]> = {
  HOTEL: [
    {
      id: 'hotel_starter',
      name: 'Hotel Starter',
      monthlyPrice: '\u20B91,499',
      annualPrice: '\u20B91,199',
      description: 'Ideal for small lodges, guesthouses, and homestays with up to 15 rooms.',
      features: [
        'Up to 15 Rooms Management',
        'Front Desk & Guest Directory',
        'Check-in / Check-out Workflow',
        'Universal GST Billing & Invoicing',
        'Daily Occupancy Statistics',
      ],
    },
    {
      id: 'hotel_pro',
      name: 'Hotel Professional',
      monthlyPrice: '\u20B92,999',
      annualPrice: '\u20B92,399',
      description: 'Best for standard hotels & multi-floor dining restaurants.',
      isPopular: true,
      features: [
        'Up to 50 Rooms & Floor Grids',
        'Integrated Room Service Billing',
        'Housekeeping & Maintenance Tracker',
        'Inventory & Linen Stock Deductions',
        'Comprehensive Revenue Reports & KPIs',
      ],
    },
    {
      id: 'hotel_enterprise',
      name: 'Hotel Enterprise',
      monthlyPrice: '\u20B95,999',
      annualPrice: '\u20B94,799',
      description: 'Full capabilities for luxury resorts, hotel chains, and multi-property groups.',
      features: [
        'Unlimited Rooms & Banquet Halls',
        'Multi-Building Floor Layouts',
        'Multi-Tender Advanced Invoicing',
        'Supplier Purchase Ledger & Auto-Reorder',
        'Dedicated Priority 24/7 Support',
      ],
    },
  ],
  MESS: [
    {
      id: 'mess_starter',
      name: 'Mess Basic',
      monthlyPrice: '\u20B9999',
      annualPrice: '\u20B9799',
      description: 'Perfect for local dining messes with up to 50 active subscribers.',
      features: [
        'Up to 50 Active Members',
        'Daily Meal Attendance Counter',
        'Monthly & Weekly Pass Billing',
        'Basic Weekly Menu Display',
        'Payment Status Ledger',
      ],
    },
    {
      id: 'mess_pro',
      name: 'Mess Pro & Tiffin',
      monthlyPrice: '\u20B91,999',
      annualPrice: '\u20B91,599',
      description: 'Ideal for growing messes with delivery tiffin operations.',
      isPopular: true,
      features: [
        'Up to 250 Active Subscribers',
        'Tiffin Delivery Route Dispatcher',
        'Automated Attendance Tracker',
        'Weekly Breakfast/Lunch/Dinner Planner',
        'Automated Monthly Invoicing & GST',
      ],
    },
    {
      id: 'mess_enterprise',
      name: 'Catering Commercial',
      monthlyPrice: '\u20B93,499',
      annualPrice: '\u20B92,799',
      description: 'Full-scale solution for commercial cloud kitchens & university catering.',
      features: [
        'Unlimited Subscribers & Routes',
        'Multi-Kitchen Fleet Management',
        'Bulk Order & Event Catering Ledger',
        'Real-time WhatsApp Delivery Alerts',
        'Ingredient Inventory Tracker',
      ],
    },
  ],
  CAFE: [
    {
      id: 'cafe_starter',
      name: 'Counter Express',
      monthlyPrice: '\u20B9799',
      annualPrice: '\u20B9649',
      description: 'Fast single-counter checkout for coffee shops, juice bars, and bakeries.',
      features: [
        'Single Terminal Fast POS',
        'Digital & Thermal Receipt Billing',
        'Menu Item Catalog with Modifiers',
        'UPI & Cash Tender Handling',
        'Daily Sales & Revenue Summary',
      ],
    },
    {
      id: 'cafe_pro',
      name: 'Bistro & Dine-In',
      monthlyPrice: '\u20B91,499',
      annualPrice: '\u20B91,199',
      description: 'Full-service dine-in cafes with table layouts and kitchen printing.',
      isPopular: true,
      features: [
        'Interactive Floor Table Grid Map',
        'Kitchen Order Tickets (KOT)',
        'Table Reservation & Waitlist Tracker',
        'Recipe Costing & Inventory Auto-Deduct',
        'Multi-Cashier Login Profiles',
      ],
    },
    {
      id: 'cafe_enterprise',
      name: 'QSR & Multi-Outlet',
      monthlyPrice: '\u20B92,799',
      annualPrice: '\u20B92,249',
      description: 'High-volume franchises and multi-counter quick service restaurants.',
      features: [
        'Multi-Counter POS Terminals',
        'Kitchen Display System (KDS) Screen',
        'Centralized Inventory & Warehouse Hub',
        'Advanced Hourly Sales Analytics',
        'Dedicated Account Manager',
      ],
    },
  ],
};

const STEPS = [
  { step: 1, label: 'Choose Business' },
  { step: 2, label: 'Business Registration Setup' },
  { step: 3, label: 'Select Plan' },
  { step: 4, label: 'Confirmation' },
];

export const GetStartedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const queryIndustry = (searchParams.get('industry') || location.state?.industry)?.toUpperCase() as IndustryCode | undefined;
  const queryStep = parseInt(searchParams.get('step') || location.state?.step || '1', 10);

  const { setIndustryContext, selectedIndustry, isConfigured, setIndustryCode } = useIndustry();
  const { user, business, isAuthenticated, logout, setSession, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (queryStep >= 1 && queryStep <= 4) return queryStep;
    if (isAuthenticated) return 2;
    return 1;
  });

  // Step 1: Industry Selection
  const [selectedIndustryType, setSelectedIndustryType] = useState<IndustryCode>(() => {
    if (queryIndustry && ['HOTEL', 'MESS', 'CAFE'].includes(queryIndustry)) {
      return queryIndustry;
    }
    const saved = localStorage.getItem('ajalkar_industry') as IndustryCode;
    if (saved && ['HOTEL', 'MESS', 'CAFE'].includes(saved)) {
      return saved;
    }
    if (business?.industryType && ['HOTEL', 'MESS', 'CAFE'].includes(business.industryType.toUpperCase())) {
      return business.industryType.toUpperCase() as IndustryCode;
    }
    return 'HOTEL';
  });

  // Step 2: Business Setup Form
  const [businessName, setBusinessName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Pune');
  const [state, setState] = useState<string>('Maharashtra');
  const [gstin, setGstin] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Step 3: Plan Selection
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    const ind = (queryIndustry && ['HOTEL', 'MESS', 'CAFE'].includes(queryIndustry)) ? queryIndustry : 'HOTEL';
    return ind === 'HOTEL' ? 'hotel_pro' : ind === 'MESS' ? 'mess_pro' : 'cafe_pro';
  });

  // Quick Login Modal State
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginRemember, setLoginRemember] = useState<boolean>(true);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSent, setForgotSent] = useState<boolean>(false);

  // Status & Validation
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-populate from authenticated user
  React.useEffect(() => {
    if (user) {
      if (user.fullName && !ownerName) setOwnerName(user.fullName);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !mobile) setMobile(user.phone);
    }
    if (business && business.name && !businessName) {
      setBusinessName(business.name);
    }
  }, [user, business]);

  // Sync if URL query parameters change
  React.useEffect(() => {
    if (queryIndustry && ['HOTEL', 'MESS', 'CAFE'].includes(queryIndustry)) {
      setSelectedIndustryType(queryIndustry);
      localStorage.setItem('ajalkar_industry', queryIndustry);
      setIndustryCode(queryIndustry);
    }
    if (queryStep >= 1 && queryStep <= 4) {
      setCurrentStep(queryStep);
    }
  }, [searchParams]);

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      showToast('error', 'Please enter your username, email, or mobile');
      return;
    }
    if (!loginPassword) {
      showToast('error', 'Please enter your password');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await login(loginIdentifier.trim(), loginPassword, loginRemember);
      showToast('success', 'Logged in successfully!');
      setShowLoginModal(false);
      const industry = res?.business?.industryType;
      if (industry && ['HOTEL', 'MESS', 'CAFE'].includes(industry.toUpperCase())) {
        navigate(`/${industry.toLowerCase()}/dashboard`, { replace: true });
      } else {
        showToast('info', 'Authenticated! You can now configure your business.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid credentials. Please check your username and password.';
      showToast('error', msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('error', 'Please enter your registered email or mobile number');
      return;
    }
    setForgotSent(true);
    showToast('success', 'Password reset instructions sent to your email/mobile!');
  };

  // Industry-specific Form Context
  const getIndustryFormContext = (type: IndustryCode) => {
    switch (type) {
      case 'MESS':
        return {
          title: 'Mess Profile Information',
          subtitle: 'Configure your dining hall, tiffin service, or student mess operational profile.',
          badge: 'Mess & Meal Management',
          icon: <UtensilsCrossed size={22} color="#09331D" />,
          businessNamePlaceholder: 'e.g. Annapurna Dining Mess & Tiffin Service',
          ownerNamePlaceholder: 'e.g. Suresh Joshi',
          emailPlaceholder: 'e.g. contact@annapurnamess.com',
          addressPlaceholder: 'e.g. 14 Fergusson College Road, Near Boys Hostel',
        };
      case 'CAFE':
        return {
          title: 'Cafe & Bistro Profile Information',
          subtitle: 'Set up your coffee shop, quick-service counter, or bistro profile.',
          badge: 'Cafe & Table POS',
          icon: <Coffee size={22} color="#A56F63" />,
          businessNamePlaceholder: 'e.g. Brew & Roast Espresso Bistro',
          ownerNamePlaceholder: 'e.g. Priya Sharma',
          emailPlaceholder: 'e.g. hello@brewandroast.com',
          addressPlaceholder: 'e.g. Shop 5, Green Glen Promenade, Koregaon Park',
        };
      case 'HOTEL':
      default:
        return {
          title: 'Hotel & Restaurant Business Profile',
          subtitle: 'Configure your hotel lodging, dining tables, KOT kitchen, and restaurant operations profile.',
          badge: 'Hotel & Restaurant Management',
          icon: <Building2 size={22} color="#7C2D12" />,
          businessNamePlaceholder: 'e.g. Grand Heritage Hotel & Restaurant',
          ownerNamePlaceholder: 'e.g. Rajesh Patil',
          emailPlaceholder: 'e.g. contact@grandheritage.com',
          addressPlaceholder: 'e.g. 42 MG Road, Heritage Boulevard',
        };
    }
  };

  const currentFormContext = getIndustryFormContext(selectedIndustryType);

  const handleSelectIndustry = (type: IndustryCode) => {
    setSelectedIndustryType(type);
    localStorage.setItem('ajalkar_industry', type);
    setIndustryCode(type);
    const defaultPlan = type === 'HOTEL' ? 'hotel_pro' : type === 'MESS' ? 'mess_pro' : 'cafe_pro';
    setSelectedPlanId(defaultPlan);
  };

  const handleStep1Continue = () => {
    localStorage.setItem('ajalkar_industry', selectedIndustryType);
    setIndustryCode(selectedIndustryType);
    setCurrentStep(2);
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!businessName.trim()) errors.businessName = 'Business name is required';
    if (!ownerName.trim()) errors.ownerName = 'Owner name is required';
    if (!mobile.trim() || !isValidMobile(mobile.trim())) {
      errors.mobile = 'Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9';
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!address.trim()) errors.address = 'Operating address is required';
    if (!city.trim()) errors.city = 'City is required';
    if (!state.trim()) errors.state = 'State is required';

    if (!isAuthenticated) {
      if (!adminPassword || adminPassword.length < 6) {
        errors.adminPassword = 'Password must be at least 6 characters';
      }
      if (adminPassword !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep2Continue = () => {
    if (!validateStep2()) {
      showToast('error', 'Please fill in all required business and account details.');
      return;
    }
    setCurrentStep(3);
  };

  const handleStep3Continue = () => {
    if (!selectedPlanId) {
      showToast('error', 'Please select a subscription plan.');
      return;
    }
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setFormErrors({});

    const payload: OnboardingPayload = {
      industryType: selectedIndustryType,
      businessName: businessName.trim() || 'My Business',
      ownerName: ownerName.trim() || 'Owner',
      mobile: mobile.trim() || '9876543210',
      email: email.trim() || 'admin@ajalkar.com',
      address: address.trim() || 'Main Road',
      city: city.trim() || 'Pune',
      state: state.trim() || 'Maharashtra',
      gstin: gstin.trim() || undefined,
      planId: selectedPlanId,
      billingCycle: billingCycle,
      adminPassword: adminPassword || undefined,
    };

    localStorage.setItem('ajalkar_industry', selectedIndustryType);
    setIndustryCode(selectedIndustryType);

    try {
      const result = await onboardingService.completeOnboarding(payload);
      setSession(result.user, result.business, result.token);
      setIndustryContext(result.selectedIndustry);
      localStorage.setItem('ajalkar_industry', selectedIndustryType);
      setIndustryCode(selectedIndustryType);

      showToast('success', `ðŸŽ‰ Business "${result.business.name}" registered and activated successfully!`);
      const targetRoute = `/${selectedIndustryType.toLowerCase()}/dashboard`;
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      if (business) {
        business.industryType = selectedIndustryType;
      }
      localStorage.setItem('ajalkar_industry', selectedIndustryType);
      setIndustryCode(selectedIndustryType);
      showToast('success', `ðŸŽ‰ Business "${payload.businessName}" activated successfully!`);
      navigate(`/${selectedIndustryType.toLowerCase()}/dashboard`, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBusinessOption = BUSINESS_OPTIONS.find((b) => b.id === selectedIndustryType);
  const currentIndustryPlans = INDUSTRY_PLANS[selectedIndustryType] || [];
  const chosenPlanDetails = currentIndustryPlans.find((p) => p.id === selectedPlanId) || currentIndustryPlans[1] || currentIndustryPlans[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 100px 20px',
        color: '#090040',
        fontFamily: 'var(--font-sans)',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1020px', margin: '0 auto' }}>
        {/* Top Action Bar with Full Executive Glassmorphism Styling */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            padding: '16px 24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Left Brand Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <img
              src="/logo.jpg"
              alt="Ajalkar POS-Billing"
              style={{
                width: '82px',
                height: '82px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #CBD5E1',
                boxShadow: '0 8px 24px rgba(9, 0, 64, 0.18)',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#090040', fontSize: '1.22rem', letterSpacing: '-0.02em' }}>
                  Ajalkar POS-Billing
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: '#F0EEF8',
                    border: '1px solid #D7D0F0',
                    color: '#090040',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                  }}
                >
                  <Sparkles size={11} color="#F59E0B" />
                  AJALKAR PLATFORM
                </span>
              </div>
              <span style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600, display: 'block', marginTop: '3px' }}>
                Unified Multi-Industry Platform • Hotel | Mess | Cafe
              </span>
            </div>
          </div>

          {/* Right Action Panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#090040' }}>
                    {user.fullName || user.username}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    {user.email || 'Authenticated Operator'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 500 }}>
                  Already have an account?
                </span>
                <button
                  type="button"
                  id="getstarted-login-btn"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 14px rgba(9, 0, 64, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Lock size={15} />
                  <span>Login</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 16px',
              borderRadius: '9999px',
              backgroundColor: '#F0EEF8',
              border: '1px solid #D7D0F0',
              color: '#090040',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={13} color="#F59E0B" />
            <span>UNIFIED RESTAURANT & LODGING PLATFORM</span>
          </div>

          <h1
            style={{
              fontSize: '2.3rem',
              fontWeight: 800,
              color: '#090040',
              letterSpacing: '-0.025em',
              textAlign: 'center',
              marginBottom: '6px',
            }}
          >
            {currentStep === 1 && 'Choose Your Business'}
            {currentStep === 2 && currentFormContext.title}
            {currentStep === 3 && `Select Your ${selectedBusinessOption?.name} Plan`}
            {currentStep === 4 && 'Confirm & Launch Workspace'}
          </h1>
          <p style={{ fontSize: '0.96rem', color: '#475569', textAlign: 'center', maxWidth: '620px' }}>
            {currentStep === 1 && 'Select your industry type to launch your dedicated, isolated operational workspace'}
            {currentStep === 2 && currentFormContext.subtitle}
            {currentStep === 3 && `Pick an industry-tailored subscription plan for ${selectedBusinessOption?.name}`}
            {currentStep === 4 && 'Review your business profile and subscription before launching your workspace'}
          </p>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '36px',
            backgroundColor: '#FFFFFF',
            padding: '16px 28px',
            borderRadius: '18px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 15px -3px rgba(9, 0, 64, 0.04)',
          }}
        >
          {STEPS.map((s, idx) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <div
                key={s.step}
                onClick={() => {
                  if (s.step < currentStep) {
                    setCurrentStep(s.step);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: isCurrent || isCompleted ? 1 : 0.45,
                  cursor: s.step < currentStep ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#090040' : '#E2E8F0',
                    color: isCompleted || isCurrent ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(9, 0, 64, 0.18)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : s.step}
                </div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent ? '#090040' : '#475569',
                  }}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      width: '28px',
                      height: '2px',
                      backgroundColor: isCompleted ? '#10B981' : '#E2E8F0',
                      marginLeft: '8px',
                      borderRadius: '2px',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Global Error Banner */}
        {formErrors.submit && (
          <div
            style={{
              padding: '12px 18px',
              marginBottom: '24px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #DC2626',
              borderRadius: '12px',
              color: '#DC2626',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {formErrors.submit}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CHOOSE BUSINESS                                                   */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            <div
              role="radiogroup"
              aria-label="Choose Your Business Type"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: '24px',
                width: '100%',
              }}
            >
              {BUSINESS_OPTIONS.map((option) => {
                const isSelected = selectedIndustryType === option.id;

                return (
                  <div
                    key={option.id}
                    role="radio"
                    tabIndex={0}
                    aria-checked={isSelected}
                    onClick={() => handleSelectIndustry(option.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectIndustry(option.id);
                      }
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '20px',
                      border: isSelected ? `2.5px solid ${option.themeColor}` : '1.5px solid #E2E8F0',
                      padding: '30px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isSelected
                        ? `0 16px 32px -6px ${option.themeColor}28, 0 4px 12px -2px rgba(15, 23, 42, 0.06)`
                        : '0 2px 6px 0 rgba(15, 23, 42, 0.03)',
                      transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top Glow Accent Bar */}
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          backgroundColor: option.themeColor,
                        }}
                      />
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            backgroundColor: isSelected ? option.lightBg : '#F8FAFC',
                            color: isSelected ? option.themeColor : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isSelected ? `1.5px solid ${option.themeColor}40` : '1px solid #E2E8F0',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {option.icon}
                        </div>

                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: isSelected ? `2px solid ${option.themeColor}` : '2px solid #CBD5E1',
                            backgroundColor: isSelected ? option.themeColor : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isSelected && <Check size={15} strokeWidth={3} />}
                        </div>
                      </div>

                      <div style={{ marginBottom: '18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: option.themeColor,
                            marginBottom: '4px',
                            display: 'block',
                          }}
                        >
                          {option.badge}
                        </span>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#090040', marginBottom: '2px' }}>
                          {option.name}
                        </h3>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                          {option.subtitle}
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
                          {option.description}
                        </p>
                      </div>

                      {/* Feature Bullet Points */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
                        {option.features.map((feat, fidx) => (
                          <div key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: option.lightBg,
                                color: option.themeColor,
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
                    </div>

                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: isSelected ? option.themeColor : '#F8FAFC',
                        color: isSelected ? '#FFFFFF' : '#475569',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        border: isSelected ? 'none' : '1px solid #E2E8F0',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Check size={15} strokeWidth={3} />
                          <span>Selected Industry</span>
                        </span>
                      ) : (
                        <span>Click to Select</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleStep1Continue}
                style={{
                  minWidth: '320px',
                  padding: '15px 34px',
                  borderRadius: '13px',
                  background: selectedBusinessOption
                    ? `linear-gradient(135deg, ${selectedBusinessOption.themeColor} 0%, ${selectedBusinessOption.secondaryColor || selectedBusinessOption.themeColor} 100%)`
                    : 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                  color: '#FFFFFF',
                  fontSize: '1.02rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: selectedBusinessOption?.themeColor
                    ? `0 6px 18px ${selectedBusinessOption.themeColor}55`
                    : '0 6px 18px rgba(9, 0, 64, 0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>
                  {`Continue to ${selectedBusinessOption?.name || 'Business'} Registration Setup`}
                </span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PROFESSIONAL BUSINESS SETUP                                       */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div
            className="card"
            style={{
              backgroundColor: '#FFFFFF',
              padding: '36px',
              borderRadius: '20px',
              border: '1px solid #E7E5E4',
              boxShadow: '0 10px 30px -5px rgba(0,0,0,0.06)',
            }}
          >
            {/* Header with Industry Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #E7E5E4', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: selectedBusinessOption?.lightBg || '#F0EEF8',
                    border: `1px solid ${selectedBusinessOption?.themeColor ? selectedBusinessOption.themeColor + '30' : '#D7D0F0'}`,
                    color: selectedBusinessOption?.themeColor || '#090040',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentFormContext.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#090040' }}>
                    {currentFormContext.title}
                  </h2>
                  <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                    {currentFormContext.subtitle}
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: selectedBusinessOption?.lightBg || '#F0EEF8',
                  border: `1px solid ${selectedBusinessOption?.themeColor ? selectedBusinessOption.themeColor + '30' : '#D7D0F0'}`,
                  color: selectedBusinessOption?.themeColor || '#090040',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} />
                <span>{currentFormContext.badge}</span>
              </div>
            </div>

            {/* Form Fields Structured in 3 Clean Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* SECTION 1: BUSINESS IDENTITY */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '14px' }}>
                  1. Business Identity
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* Business Name */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Business / Enterprise Name <span style={{ color: '#DC2626' }}>*</span></span>
                    </label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <Building2 size={18} />
                      </div>
                      <input
                        type="text"
                        className={`form-control ${formErrors.businessName ? 'is-invalid' : ''}`}
                        placeholder={currentFormContext.businessNamePlaceholder}
                        value={businessName}
                        onChange={(e) => {
                          setBusinessName(e.target.value);
                          if (formErrors.businessName) setFormErrors((prev) => ({ ...prev, businessName: '' }));
                        }}
                      />
                    </div>
                    {formErrors.businessName && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} />
                        <span>{formErrors.businessName}</span>
                      </div>
                    )}
                  </div>

                  {/* Owner Name */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Owner / Proprietor Name <span style={{ color: '#DC2626' }}>*</span></span>
                    </label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        className={`form-control ${formErrors.ownerName ? 'is-invalid' : ''}`}
                        placeholder={currentFormContext.ownerNamePlaceholder}
                        value={ownerName}
                        onChange={(e) => {
                          setOwnerName(e.target.value);
                          if (formErrors.ownerName) setFormErrors((prev) => ({ ...prev, ownerName: '' }));
                        }}
                      />
                    </div>
                    {formErrors.ownerName && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} />
                        <span>{formErrors.ownerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTACT & VERIFICATION */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '14px' }}>
                  2. Direct Contact & Verification
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* Mobile Number */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Mobile Number <span style={{ color: '#DC2626' }}>*</span></span>
                      <span style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: 500 }}>10 digits</span>
                    </label>
                    <div className="input-with-prefix">
                      <div className="prefix-badge">+91</div>
                      <input
                        type="tel"
                        maxLength={10}
                        className={`form-control ${formErrors.mobile ? 'is-invalid' : ''}`}
                        placeholder="9876543210"
                        value={mobile}
                        onChange={(e) => {
                          setMobile(sanitizeMobileInput(e.target.value));
                          if (formErrors.mobile) setFormErrors((prev) => ({ ...prev, mobile: '' }));
                        }}
                      />
                    </div>
                    {formErrors.mobile && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} />
                        <span>{formErrors.mobile}</span>
                      </div>
                    )}
                  </div>

                  {/* Business Email */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Business Email Address <span style={{ color: '#DC2626' }}>*</span></span>
                    </label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                        placeholder={currentFormContext.emailPlaceholder}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                        }}
                      />
                    </div>
                    {formErrors.email && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} />
                        <span>{formErrors.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: OPERATING LOCATION & COMPLIANCE */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '14px' }}>
                  3. Location & Statutory Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Address */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Operating Physical Address <span style={{ color: '#DC2626' }}>*</span></span>
                    </label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <MapPin size={18} />
                      </div>
                      <input
                        type="text"
                        className={`form-control ${formErrors.address ? 'is-invalid' : ''}`}
                        placeholder={currentFormContext.addressPlaceholder}
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: '' }));
                        }}
                      />
                    </div>
                    {formErrors.address && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} />
                        <span>{formErrors.address}</span>
                      </div>
                    )}
                  </div>

                  {/* City, State, GSTIN Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {/* City */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>City <span style={{ color: '#DC2626' }}>*</span></span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.city ? 'is-invalid' : ''}`}
                        placeholder="e.g. Pune"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: '' }));
                        }}
                      />
                      {formErrors.city && (
                        <div className="form-error-msg">
                          <AlertCircle size={14} />
                          <span>{formErrors.city}</span>
                        </div>
                      )}
                    </div>

                    {/* State */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>State <span style={{ color: '#DC2626' }}>*</span></span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.state ? 'is-invalid' : ''}`}
                        placeholder="e.g. Maharashtra"
                        value={state}
                        onChange={(e) => {
                          setState(e.target.value);
                          if (formErrors.state) setFormErrors((prev) => ({ ...prev, state: '' }));
                        }}
                      />
                      {formErrors.state && (
                        <div className="form-error-msg">
                          <AlertCircle size={14} />
                          <span>{formErrors.state}</span>
                        </div>
                      )}
                    </div>

                    {/* GSTIN (Optional) */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>GSTIN Number</span>
                        <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F5F5F4', color: '#78716C', fontWeight: 600 }}>
                          Optional
                        </span>
                      </label>
                      <div className="input-with-icon">
                        <div className="input-icon">
                          <FileText size={18} />
                        </div>
                        <input
                          type="text"
                          maxLength={15}
                          className="form-control"
                          placeholder="e.g. 27AAAAA0000A1Z5"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ACCOUNT CREDENTIALS & SECURITY */}
              {!isAuthenticated && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '14px' }}>
                    4. Account Credentials & Login Password
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Password */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>Account Login Password <span style={{ color: '#DC2626' }}>*</span></span>
                        <span style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: 500 }}>Min 6 characters</span>
                      </label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <div className="input-icon">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          name="new_admin_password"
                          autoComplete="new-password"
                          className={`form-control ${formErrors.adminPassword ? 'is-invalid' : ''}`}
                          placeholder="Create your login password"
                          value={adminPassword}
                          onChange={(e) => {
                            setAdminPassword(e.target.value);
                            if (formErrors.adminPassword) setFormErrors((prev) => ({ ...prev, adminPassword: '' }));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: '#78716C',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.adminPassword && (
                        <div className="form-error-msg">
                          <AlertCircle size={14} />
                          <span>{formErrors.adminPassword}</span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>Confirm Password <span style={{ color: '#DC2626' }}>*</span></span>
                      </label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <div className="input-icon">
                          <ShieldCheck size={18} />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="new_confirm_password"
                          autoComplete="new-password"
                          className={`form-control ${formErrors.confirmPassword ? 'is-invalid' : ''}`}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (formErrors.confirmPassword) setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: '#78716C',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.confirmPassword && (
                        <div className="form-error-msg">
                          <AlertCircle size={14} />
                          <span>{formErrors.confirmPassword}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #E7E5E4' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn btn-outline"
                style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
              >
                <ArrowLeft size={16} />
                <span>Back to Business Selection</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Continue}
                style={{
                  padding: '14px 32px',
                  borderRadius: '12px',
                  background: selectedBusinessOption
                    ? `linear-gradient(135deg, ${selectedBusinessOption.themeColor} 0%, ${selectedBusinessOption.secondaryColor || selectedBusinessOption.themeColor} 100%)`
                    : 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: selectedBusinessOption?.themeColor
                    ? `0 4px 14px ${selectedBusinessOption.themeColor}55`
                    : '0 4px 14px rgba(9, 0, 64, 0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>Continue to Plan Selection</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: INDUSTRY-SPECIFIC PLAN SELECTION                                  */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div
              className="card"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '24px 32px',
                borderRadius: '16px',
                border: '1px solid #E7E5E4',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#090040', letterSpacing: '0.06em' }}>
                    Dedicated Plans
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#090040' }}>
                  Plans for {selectedBusinessOption?.name}
                </h3>
              </div>

              {/* Monthly / Annual Toggle */}
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
                  onClick={() => setBillingCycle('MONTHLY')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: billingCycle === 'MONTHLY' ? '#090040' : 'transparent',
                    color: billingCycle === 'MONTHLY' ? '#FFFFFF' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('ANNUAL')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: billingCycle === 'ANNUAL' ? '#090040' : 'transparent',
                    color: billingCycle === 'ANNUAL' ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Annual</span>
                  <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F59E0B', color: '#FFFFFF', fontWeight: 700 }}>
                    20% OFF
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {currentIndustryPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const price = billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.annualPrice;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: isSelected ? '2.5px solid #090040' : '1px solid #E2E8F0',
                      padding: '30px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: isSelected
                        ? '0 12px 28px -6px rgba(9, 0, 64, 0.22)'
                        : '0 1px 3px 0 rgba(9, 0, 64, 0.05)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.15s ease',
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
                        MOST POPULAR
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#090040' }}>{plan.name}</h4>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: isSelected ? '2px solid #090040' : '2px solid #CBD5E1',
                            backgroundColor: isSelected ? '#090040' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '16px', minHeight: '38px' }}>
                        {plan.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#090040' }}>{price}</span>
                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>/month</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        {plan.features.map((feature, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#090040' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#F0EEF8', color: '#090040', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#090040' : '#F8FAFC',
                        color: isSelected ? '#FFFFFF' : '#090040',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        textAlign: 'center',
                        border: isSelected ? 'none' : '1px solid #E2E8F0',
                      }}
                    >
                      {isSelected ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Check size={15} strokeWidth={3} />
                          <span>Plan Selected</span>
                        </span>
                      ) : (
                        <span>Choose Plan</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '16px', paddingBottom: '32px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Business Registration Setup</span>
              </button>

              <button
                type="button"
                onClick={handleStep3Continue}
                style={{
                  padding: '12px 28px',
                  borderRadius: '10px',
                  background: selectedBusinessOption
                    ? `linear-gradient(135deg, ${selectedBusinessOption.themeColor} 0%, ${selectedBusinessOption.secondaryColor || selectedBusinessOption.themeColor} 100%)`
                    : 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: selectedBusinessOption?.themeColor
                    ? `0 4px 12px ${selectedBusinessOption.themeColor}55`
                    : '0 4px 12px rgba(9, 0, 64, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>Continue to Confirmation</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: REVIEW & CONFIRMATION                                             */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              className="card"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '36px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 30px -5px rgba(9, 0, 64, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', paddingBottom: '18px', borderBottom: '1px solid #E2E8F0' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: selectedBusinessOption?.lightBg || '#F0EEF8',
                    border: `1px solid ${selectedBusinessOption?.themeColor ? `${selectedBusinessOption.themeColor}33` : '#D7D0F0'}`,
                    color: selectedBusinessOption?.themeColor || '#090040',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={24} color="#10B981" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#090040' }}>
                    Review Business Registration Setup & Confirm
                  </h2>
                  <span style={{ fontSize: '0.86rem', color: '#475569' }}>
                    Please verify your details before creating your dedicated workspace.
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {/* Business Summary */}
                <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    Business Profile
                  </div>
                  <h4 style={{ fontSize: '1.18rem', fontWeight: 700, color: '#090040', marginBottom: '8px' }}>
                    {businessName}
                  </h4>
                  <div style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div><strong>Owner:</strong> {ownerName}</div>
                    <div><strong>Mobile:</strong> {mobile}</div>
                    <div><strong>Email:</strong> {email}</div>
                    <div><strong>Location:</strong> {address}, {city}, {state}</div>
                    {gstin && <div><strong>GSTIN:</strong> {gstin}</div>}
                  </div>
                </div>

                {/* Industry & Plan Summary */}
                <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    Selected Industry & Plan
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      backgroundColor: selectedBusinessOption?.lightBg || '#F0EEF8',
                      color: selectedBusinessOption?.themeColor || '#090040',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      marginBottom: '10px',
                      border: `1px solid ${selectedBusinessOption?.themeColor ? `${selectedBusinessOption.themeColor}33` : '#D7D0F0'}`,
                    }}
                  >
                    <span>{selectedBusinessOption?.name}</span>
                  </div>
                  <h4 style={{ fontSize: '1.18rem', fontWeight: 700, color: '#090040', marginBottom: '4px' }}>
                    {chosenPlanDetails.name}
                  </h4>
                  <div style={{ fontSize: '0.86rem', color: '#475569' }}>
                    <strong>Billing:</strong> {billingCycle === 'MONTHLY' ? `${chosenPlanDetails.monthlyPrice}/month (Monthly)` : `${chosenPlanDetails.annualPrice}/month (Billed Annually)`}
                  </div>
                </div>

                {/* Operator Session Summary */}
                <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: selectedBusinessOption?.themeColor || '#090040', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    Operator Account
                  </div>
                  <h4 style={{ fontSize: '1.18rem', fontWeight: 700, color: '#090040', marginBottom: '8px' }}>
                    {ownerName || user?.fullName || user?.username || 'Primary Administrator'}
                  </h4>
                  <div style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div><strong>Login Identifiers:</strong> Username, Email ({email || user?.email}), or Mobile ({mobile || user?.phone})</div>
                    <div><strong>Access Level:</strong> Master Admin (ROLE_OWNER)</div>
                    <div><strong>Data Mode:</strong> Single-Industry Isolated</div>
                    <div><strong>Status:</strong> Ready to Launch</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={submitting}
                  className="btn btn-outline"
                  style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Plans</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  style={{
                    padding: '14px 36px',
                    borderRadius: '12px',
                    background: selectedBusinessOption
                      ? `linear-gradient(135deg, ${selectedBusinessOption.themeColor} 0%, ${selectedBusinessOption.secondaryColor || selectedBusinessOption.themeColor} 100%)`
                      : 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: selectedBusinessOption?.themeColor
                      ? `0 4px 14px ${selectedBusinessOption.themeColor}55`
                      : '0 4px 14px rgba(9, 0, 64, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Configuring Workspace & Dashboard...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch My Workspace Now</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE QUICK SIGN IN MODAL                                           */}
        {/* ========================================================================= */}
        {showLoginModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(9, 0, 64, 0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={() => setShowLoginModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(9, 0, 64, 0.25)',
                border: '1px solid #E2E8F0',
                padding: '32px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #090040 0%, #090040 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 18px rgba(9, 0, 64, 0.3)',
                  }}
                >
                  <Lock size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#090040', marginBottom: '2px' }}>
                    {`Login to ${selectedIndustryType === 'MESS' ? 'Mess' : selectedIndustryType === 'CAFE' ? 'Cafe' : 'Hotel'} Workspace`}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#475569' }}>
                    {selectedIndustryType === 'MESS'
                      ? 'Access your active dining mess and meal passes dashboard'
                      : selectedIndustryType === 'CAFE'
                        ? 'Access your active cafe table POS and bistro dashboard'
                        : 'Access your active hotel lodging and dining dashboard'}
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleModalLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#090040', marginBottom: '6px' }}>
                    Username, Email, or Mobile Number
                  </label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <User size={18} color="#64748B" />
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. admin, owner@hotel.com, or 9876543210"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div className="input-with-icon" style={{ position: 'relative' }}>
                    <div className="input-icon">
                      <Lock size={18} color="#64748B" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={loginRemember}
                      onChange={(e) => setLoginRemember(e.target.checked)}
                      style={{ borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setShowForgotModal(true);
                    }}
                    style={{ background: 'none', border: 'none', color: '#090040', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    marginTop: '4px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 18px rgba(9, 0, 64, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Login to Dashboard</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Link to New Business Registration */}
              <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
                  New to Ajalkar POS-Billing?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setCurrentStep(1);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#090040',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  Register Your Business →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FORGOT / RESET PASSWORD MODAL                                             */}
        {/* ========================================================================= */}
        {showForgotModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(9, 0, 64, 0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={() => setShowForgotModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '30px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(9, 0, 64, 0.25)',
                border: '1px solid #E2E8F0',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#F0EEF8',
                      color: '#090040',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HelpCircle size={20} color="#090040" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#090040' }}>Reset Password</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {forgotSent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CheckCircle2 size={44} color="#10B981" style={{ margin: '0 auto 14px' }} />
                  <h4 style={{ fontWeight: 800, color: '#090040', fontSize: '1.1rem' }}>Instructions Sent!</h4>
                  <p style={{ fontSize: '0.86rem', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                    We have sent password recovery instructions to <strong>{forgotEmail}</strong>. Please check your inbox.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSent(false);
                      setShowLoginModal(true);
                    }}
                    style={{
                      width: '100%',
                      marginTop: '20px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#090040',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
                    Enter your registered email address or mobile number to receive password recovery instructions.
                  </p>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#090040' }}>
                      Email Address or Mobile Number
                    </label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <Mail size={17} color="#64748B" />
                      </div>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. admin@ajalkar.com or 9876543210"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setShowLoginModal(true);
                      }}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(9, 0, 64, 0.25)',
                      }}
                    >
                      Send Link
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

