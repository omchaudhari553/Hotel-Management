import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage, LanguageCode } from '../context/LanguageContext';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  User,
  Phone,
  Building2,
  ShieldCheck,
  Globe,
  UtensilsCrossed,
  Coffee,
  Check,
} from 'lucide-react';

type IndustryType = 'HOTEL' | 'MESS' | 'CAFE';

export const SignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  const queryIndustry = (
    searchParams.get('industry') ||
    location.state?.industry ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL'
  ).toUpperCase() as IndustryType;

  const [industry, setIndustry] = useState<IndustryType>(
    ['HOTEL', 'MESS', 'CAFE'].includes(queryIndustry) ? queryIndustry : 'HOTEL'
  );

  const [businessName, setBusinessName] = useState(location.state?.businessName || '');
  const [ownerName, setOwnerName] = useState(location.state?.ownerName || '');
  const [mobile, setMobile] = useState(location.state?.mobile || '');
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleIndustrySelect = (ind: IndustryType) => {
    setIndustry(ind);
    localStorage.setItem('ajalkar_industry', ind);
  };

  const handleMobileChange = (val: string) => {
    const cleaned = sanitizeMobileInput(val);
    setMobile(cleaned);
    if (errors.mobile) {
      setErrors((prev) => ({ ...prev, mobile: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }
    if (!mobile.trim() || !isValidMobile(mobile)) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!email.trim() || !email.includes('@')) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('error', 'Please fill all required fields properly');
      return;
    }

    setLoading(true);
    localStorage.setItem('ajalkar_industry', industry);
    // Navigate smoothly to Step 2 with pre-filled state
    navigate(`/get-started?step=2&industry=${industry}`, {
      state: {
        industry,
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        adminPassword: password,
      },
    });
  };

  const industryLabels: Record<IndustryType, { title: string; color: string; icon: React.ReactNode }> = {
    HOTEL: { title: 'Hotel / Restaurant', color: '#7C2D12', icon: <Building2 size={16} /> },
    MESS: { title: 'Mess & Dining', color: '#09331D', icon: <UtensilsCrossed size={16} /> },
    CAFE: { title: 'Cafe & Bistro', color: '#A56F63', icon: <Coffee size={16} /> },
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        padding: '32px 28px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
      }}
    >
      {/* Language Selector Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '6px 12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
          <Globe size={15} color="#ea580c" />
          <span>{t('selectLanguage', 'Language')}:</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { code: 'en' as LanguageCode, label: 'English' },
            { code: 'mr' as LanguageCode, label: 'मराठी' },
            { code: 'hi' as LanguageCode, label: 'हिन्दी' },
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: language === lang.code ? '1.5px solid #ea580c' : '1px solid #E2E8F0',
                backgroundColor: language === lang.code ? '#ea580c' : '#FFFFFF',
                color: language === lang.code ? '#FFFFFF' : '#334155',
                fontSize: '0.8rem',
                fontWeight: language === lang.code ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: language === lang.code ? '0 2px 4px rgba(234, 88, 12, 0.2)' : 'none',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Segmented Auth Navigation Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: '#F1F5F9',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '24px',
        }}
      >
        <Link
          to="/login"
          style={{
            padding: '10px',
            textAlign: 'center',
            borderRadius: '10px',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          {t('login', 'Login')}
        </Link>
        <div
          style={{
            padding: '10px',
            textAlign: 'center',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            color: '#090040',
            fontWeight: 800,
            fontSize: '0.9rem',
            boxShadow: '0 2px 6px rgba(9, 0, 64, 0.08)',
          }}
        >
          {t('newUserSetup', 'Sign Up / Register')}
        </div>
      </div>

      {/* Header Branding */}
      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: '#F0EEF8',
            border: '1px solid #D7D0F0',
            color: '#090040',
            fontSize: '0.74rem',
            fontWeight: 800,
            marginBottom: '10px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Sparkles size={12} color="#F59E0B" />
          <span>AJALKAR POS-BILLING</span>
        </div>

        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#090040', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {language === 'mr' ? 'नवीन खाते तयार करा' : language === 'hi' ? 'नया व्यवसाय खाता बनाएं' : 'Create Business Account'}
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '6px' }}>
          {language === 'mr'
            ? 'व्यवसाय प्रकार निवडा आणि कार्यक्षेत्र सुरू करा'
            : language === 'hi'
            ? 'व्यवसाय चुनें और अपना कार्यक्षेत्र शुरू करें'
            : 'Select your business type & launch dedicated isolated workspace'}
        </p>
      </div>

      {/* Industry Selector Pills */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#090040', marginBottom: '8px', display: 'block' }}>
          Business Type / Industry:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {(['HOTEL', 'MESS', 'CAFE'] as IndustryType[]).map((ind) => {
            const isSel = industry === ind;
            const meta = industryLabels[ind];
            return (
              <button
                key={ind}
                type="button"
                onClick={() => handleIndustrySelect(ind)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 6px',
                  borderRadius: '12px',
                  border: isSel ? `2px solid ${meta.color}` : '1.5px solid #E2E8F0',
                  backgroundColor: isSel ? '#F8FAFC' : '#FFFFFF',
                  color: isSel ? meta.color : '#64748B',
                  fontWeight: isSel ? 800 : 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSel ? '0 2px 8px rgba(9, 0, 64, 0.08)' : 'none',
                }}
              >
                {meta.icon}
                <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{meta.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Signup Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Business Name */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#090040' }}>
            Business / Enterprise Name <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="input-with-icon">
            <div className="input-icon">
              <Building2 size={18} />
            </div>
            <input
              type="text"
              required
              className={`form-control ${errors.businessName ? 'is-invalid' : ''}`}
              placeholder="e.g. Royal Palace Hotel & Lodging"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: '' }));
              }}
            />
          </div>
          {errors.businessName && <div className="form-error-msg">{errors.businessName}</div>}
        </div>

        {/* Owner Name */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#090040' }}>
            Owner / Proprietor Full Name <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="input-with-icon">
            <div className="input-icon">
              <User size={18} />
            </div>
            <input
              type="text"
              required
              className={`form-control ${errors.ownerName ? 'is-invalid' : ''}`}
              placeholder="e.g. Rahul Patil"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: '' }));
              }}
            />
          </div>
          {errors.ownerName && <div className="form-error-msg">{errors.ownerName}</div>}
        </div>

        {/* Mobile Number */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#090040' }}>
            Mobile Number (10 Digits) <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="input-with-prefix">
            <div className="prefix-badge">
              <span>🇮🇳 +91</span>
            </div>
            <input
              type="tel"
              required
              maxLength={10}
              className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
              placeholder="9876543210"
              value={mobile}
              onChange={(e) => handleMobileChange(e.target.value)}
            />
          </div>
          {errors.mobile && <div className="form-error-msg">{errors.mobile}</div>}
        </div>

        {/* Email Address */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#090040' }}>
            Business Email Address <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="input-with-icon">
            <div className="input-icon">
              <Mail size={18} />
            </div>
            <input
              type="email"
              required
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="owner@hotel.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
            />
          </div>
          {errors.email && <div className="form-error-msg">{errors.email}</div>}
        </div>

        {/* Password */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#090040' }}>
            Account Password <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <div className="input-icon">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <div className="form-error-msg">{errors.password}</div>}
        </div>

        {/* Confirm Password */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#090040' }}>
            Confirm Password <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <div className="input-icon">
              <ShieldCheck size={18} />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && <div className="form-error-msg">{errors.confirmPassword}</div>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '8px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '0.98rem',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 8px 16px -3px rgba(9, 0, 64, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Preparing Setup...</span>
            </>
          ) : (
            <>
              <span>Continue to Business Setup</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {/* Alternative Onboarding Link */}
      <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
          Prefer the full step-by-step wizard?{' '}
        </span>
        <Link
          to={`/get-started?step=1&industry=${industry}`}
          style={{
            color: '#090040',
            fontWeight: 800,
            fontSize: '0.84rem',
            textDecoration: 'none',
          }}
        >
          Start 4-Step Guided Setup →
        </Link>
      </div>

      {/* Back Link to Login */}
      <div style={{ textAlign: 'center', marginTop: '14px' }}>
        <Link to="/login" style={{ color: '#64748B', fontSize: '0.84rem', textDecoration: 'none', fontWeight: 600 }}>
          ← Already have an account? Login here
        </Link>
      </div>
    </div>
  );
};

export default SignupPage;
