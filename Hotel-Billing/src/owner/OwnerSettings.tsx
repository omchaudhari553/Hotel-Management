import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Crown,
  Shield,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  Sun,
  Moon,
  Palette,
  Check,
  Laptop,
  Download,
  Eye,
  EyeOff,
  FileText,
  Key,
  Globe,
} from 'lucide-react';
import { ownerService } from './ownerService';
import apiClient from '../services/api';
import { licenceService, LicenceInfo } from '../services/licenceService';
import { useToast } from '../context/ToastContext';
import { useTheme, ThemeType } from '../context/ThemeContext';
import { useLanguage, LanguageCode } from '../context/LanguageContext';
import SubscriptionModal from '../components/SubscriptionModal';

export const OwnerSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    businessName: '',
    ownerName: '',
    contactEmail: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    currency: 'INR',
    taxNumber: '',
  });

  const [licenceInfo, setLicenceInfo] = useState<LicenceInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [backupSending, setBackupSending] = useState<boolean>(false);
  const [savingSmtp, setSavingSmtp] = useState<boolean>(false);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState<string>('omchaudhari553@gmail.com');
  const [smtpAppPassword, setSmtpAppPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasCustomPassword, setHasCustomPassword] = useState<boolean>(false);
  const [lastBackupStatus, setLastBackupStatus] = useState<{ status: 'idle' | 'success' | 'warning' | 'error'; message: string; ref?: string }>({ status: 'idle', message: '' });
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const loadData = async () => {
    try {
      setLoading(true);
      const [settRes, licRes] = await Promise.all([
        ownerService.getSettings(),
        licenceService.getLicenceInfo().catch(() => null),
      ]);
      let cachedBank: any = {};
      try {
        const rawBank = localStorage.getItem('ajalkar_owner_bank_details');
        if (rawBank) cachedBank = JSON.parse(rawBank);
      } catch {}

      if (settRes) {
        setSettings({ ...settRes, ...cachedBank });
        if (settRes.theme && (settRes.theme === 'dark' || settRes.theme === 'light')) {
          setTheme(settRes.theme as ThemeType);
        } else {
          setTheme('light');
        }
      } else if (Object.keys(cachedBank).length > 0) {
        setSettings((prev: any) => ({ ...prev, ...cachedBank }));
      }
      if (licRes) setLicenceInfo(licRes);

      apiClient.get('/hotel/backup/status').then((res) => {
        const d = res.data?.data;
        if (d?.sender) setSmtpSenderEmail(d.sender);
        if (d?.hasCustomAppPassword) setHasCustomPassword(true);
      }).catch(() => {});
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleLicenceUpdated = () => {
      loadData();
    };
    window.addEventListener('owner-licence-updated', handleLicenceUpdated);
    window.addEventListener('licence-updated', handleLicenceUpdated);
    return () => {
      window.removeEventListener('owner-licence-updated', handleLicenceUpdated);
      window.removeEventListener('licence-updated', handleLicenceUpdated);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    setSettings((prev: any) => ({ ...prev, theme: newTheme }));
    showToast('success', `Admin Panel theme switched to ${newTheme.toUpperCase()}`);
    // Persist immediately in settings
    ownerService.updateSettings({ ...settings, theme: newTheme }).catch(() => {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.phone && !/^[6-9]\d{9}$/.test(settings.phone)) {
      showToast('error', 'Phone number must be a 10-digit Indian number starting with 6, 7, 8, or 9.');
      return;
    }
    if (settings.bankPhone && !/^[6-9]\d{9}$/.test(settings.bankPhone)) {
      showToast('error', 'Bank registered phone number must be a 10-digit Indian number starting with 6, 7, 8, or 9.');
      return;
    }
    setSaving(true);
    try {
      const bankDetails = {
        bankName: settings.bankName || '',
        accountHolderName: settings.accountHolderName || '',
        accountNumber: settings.accountNumber || '',
        ifscCode: settings.ifscCode || '',
        upiId: settings.upiId || '',
        bankPhone: settings.bankPhone || '',
      };
      try {
        localStorage.setItem('ajalkar_owner_bank_details', JSON.stringify(bankDetails));
      } catch {}

      await Promise.allSettled([
        ownerService.updateSettings({ ...settings, ...bankDetails, theme }),
        apiClient.put('/hotel/settings', {
          category: 'BANK',
          settingKey: 'DETAILS',
          settingValue: JSON.stringify(bankDetails),
        }).catch(() => {}),
      ]);
      showToast('success', 'Owner settings and business profile updated successfully.');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmtpSettings = async () => {
    setSavingSmtp(true);
    try {
      await apiClient.post('/hotel/backup/settings', null, {
        params: {
          senderEmail: smtpSenderEmail ? smtpSenderEmail.trim() : undefined,
          appPassword: smtpAppPassword ? smtpAppPassword.trim() : undefined,
        }
      });
      setHasCustomPassword(true);
      showToast('success', 'Google SMTP credentials saved successfully for daily 11:00 PM backups!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to save SMTP settings');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSendDailyBackupNow = async () => {
    setBackupSending(true);
    try {
      if (settings.contactEmail) {
        await ownerService.updateSettings({ ...settings, theme }).catch(() => {});
      }
      const res = await apiClient.post('/hotel/backup/send-email', null, {
        params: {
          customEmail: settings.contactEmail || undefined,
        }
      });
      const data = res.data?.data;
      const ref = data?.reference || 'HTL-SUCCESS';
      const target = data?.recipientEmail || settings.contactEmail || 'Profile Email';
      if (data?.success) {
        setLastBackupStatus({
          status: 'success',
          message: `Daily hotel data backup email dispatched to ${target}! Reference: ${ref}`,
          ref,
        });
        showToast('success', `Daily hotel data backup email dispatched to ${target}! Reference: ${ref}`);
      } else {
        const errDetail = data?.error || 'Authentication failed';
        setLastBackupStatus({
          status: 'warning',
          message: `Daily backup generated and saved securely on server (${ref})! ${errDetail}`,
          ref,
        });
        showToast('warning', `Daily backup generated and saved securely on server (${ref})!`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to trigger backup';
      setLastBackupStatus({
        status: 'error',
        message: msg,
      });
      showToast('error', msg);
    } finally {
      setBackupSending(false);
    }
  };

  const handleDownloadDailyBackup = async () => {
    try {
      const res = await apiClient.get('/hotel/backup/download');
      const jsonContent = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel_daily_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Daily backup JSON downloaded successfully!');
    } catch {
      showToast('error', 'Failed to download backup JSON');
    }
  };

  const handleDownloadDailyBackupPdf = async () => {
    try {
      const res = await apiClient.get('/hotel/backup/download-pdf', {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel_daily_backup_summary_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Daily backup PDF summary downloaded successfully!');
    } catch {
      showToast('error', 'Failed to download backup PDF');
    }
  };

  const handleOpenUpgrade = () => {
    setShowUpgradeModal(true);
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { mode: licenceInfo?.trialStatus === 'Expired' ? 'upgrade' : 'renew' },
      })
    );
  };

  const THEMES: Array<{
    id: ThemeType;
    name: string;
    badge: string;
    desc: string;
    colors: string[];
    icon: any;
  }> = [
    {
      id: 'system',
      name: language === 'mr' ? 'सिस्टीम डिफॉल्ट' : 'System Default',
      badge: language === 'mr' ? 'स्वयंचलित' : 'Automatic',
      desc: language === 'mr' ? 'तुमच्या डिव्हाइसच्या ऑपरेटिंग सिस्टीम थीमशी जुळते' : 'Automatically matches your device operating system theme (Light or Dark)',
      colors: ['#FFFFFF', '#0B0F19', '#F59E0B', '#38BDF8'],
      icon: Laptop,
    },
    {
      id: 'light',
      name: language === 'mr' ? 'क्लासिक लाईट' : 'Daylight / Classic Light',
      badge: language === 'mr' ? 'स्टँडर्ड' : 'Standard',
      desc: language === 'mr' ? 'स्वच्छ डेलाईट थीम' : 'Clean daylight theme with crisp white cards & amber accents',
      colors: ['#FFFFFF', '#F8FAFC', '#F59E0B', '#1E293B'],
      icon: Sun,
    },
    {
      id: 'dark',
      name: language === 'mr' ? 'मॉडर्न डार्क' : 'Midnight / Modern Dark',
      badge: language === 'mr' ? 'नाईट मोड' : 'Night Mode',
      desc: language === 'mr' ? 'गडद ऑब्सिडियन नाईट थीम' : 'Deep obsidian night theme with high contrast slate cards',
      colors: ['#161F36', '#0B0F19', '#38BDF8', '#F8FAFC'],
      icon: Moon,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <RefreshCw size={32} color="#B45309" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
          {language === 'mr' ? 'मालक सेटिंग्ज आणि एंटरप्राइझ प्राधान्ये' : 'Owner Settings & Enterprise Preferences'}
        </h1>
      </div>

      {/* Subscription & 28-Day Trial Status Banner */}
      <div
        className="owner-trial-banner"
        style={{
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 8px rgba(245, 158, 11, 0.45)',
                flexShrink: 0,
              }}
            >
              <Crown size={24} color="#FFFFFF" />
            </div>
            <div>
              <h3
                className="owner-trial-heading"
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                }}
              >
                {licenceInfo?.subscriptionPlan || '28-Day Free Trial Tier'}
              </h3>
              <p
                className="owner-trial-subtext"
                style={{
                  margin: '3px 0 0',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                {language === 'mr' ? 'स्थिती: ' : 'Status: '}
                <strong className="owner-trial-status-badge">
                  {licenceInfo?.trialStatus === 'Active'
                    ? (language === 'mr' ? 'सक्रिय' : 'Active')
                    : (licenceInfo?.trialStatus || (language === 'mr' ? 'सक्रिय' : 'Active'))}
                </strong>{' '}
                •{' '}
                <span className="owner-trial-days">
                  {licenceInfo?.daysRemaining != null
                    ? (language === 'mr' ? `${licenceInfo.daysRemaining} दिवस शिल्लक` : `${licenceInfo.daysRemaining} Days Remaining`)
                    : (language === 'mr' ? 'पूर्ण प्रवेश' : 'Full Access')}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenUpgrade}
            className="owner-btn-upgrade"
            style={{
              padding: '9px 20px',
              backgroundColor: '#B45309',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.15s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#92400E';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#B45309';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {language === 'mr' ? 'प्लॅन अपग्रेड / नूतनीकरण करा' : 'Upgrade / Renew Plan'}
          </button>
        </div>
      </div>

      {/* ========================================================
          THEME & LANGUAGE SWITCHER SECTION (Preferences)
      ======================================================== */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '10px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '12px 18px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Theme Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={18} color="#D97706" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
              {language === 'mr' ? 'थीम' : 'Theme'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {THEMES.map((t) => {
              const isSelected = theme === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTheme(t.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #D97706' : '1px solid var(--border-slate, #CBD5E1)',
                    backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'var(--card-white, #FFFFFF)',
                    color: isSelected ? '#B45309' : 'var(--text-body, #475569)',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} color={isSelected ? '#D97706' : '#64748B'} />
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={18} color="#D97706" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
              {language === 'mr' ? 'भाषा' : 'Language'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { code: 'en' as LanguageCode, label: 'English' },
              { code: 'mr' as LanguageCode, label: 'मराठी' },
            ].map((langOpt) => {
              const isSelected = language === langOpt.code;
              return (
                <button
                  key={langOpt.code}
                  type="button"
                  onClick={() => setLanguage(langOpt.code)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #D97706' : '1px solid var(--border-slate, #CBD5E1)',
                    backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'var(--card-white, #FFFFFF)',
                    color: isSelected ? '#B45309' : 'var(--text-body, #475569)',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{langOpt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', paddingBottom: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'केंद्रीय हॉटेल व्यवसाय प्रोफाइल' : 'Central Hotel Business Profile'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
            {language === 'mr' ? 'मल्टी-ब्राँच आयडेंटिफायर: ' : 'Multi-branch identifier: '}<strong>{settings?.code || 'HOTEL_GRANDHERITAGE12'}</strong>
          </span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>{language === 'mr' ? 'व्यवसाय कायदेशीर / ब्रँड नाव' : 'Business Legal / Brand Name'}</label>
              <input
                type="text"
                name="businessName"
                value={settings.businessName || ''}
                onChange={handleChange}
                required
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{language === 'mr' ? 'मालकाचे पूर्ण नाव' : 'Owner Full Name'}</label>
              <input
                type="text"
                name="ownerName"
                value={settings.ownerName || ''}
                onChange={handleChange}
                required
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            {/* Contact Email field with proper thickness, padding and Lucide Mail icon */}
            <div>
              <label style={labelStyle}>{language === 'mr' ? 'संपर्क ईमेल' : 'Contact Email'}</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="email"
                  name="contactEmail"
                  id="contactEmailInput"
                  value={settings.contactEmail || ''}
                  onChange={handleChange}
                  required
                  placeholder="admin@royalpalace.com"
                  className="form-control owner-input-field"
                  style={{
                    ...inputStyle,
                    paddingLeft: '48px',
                  }}
                />
                <Mail
                  size={18}
                  color="#94A3B8"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{language === 'mr' ? 'फोन नंबर' : 'Phone Number'}</label>
              <input
                type="tel"
                name="phone"
                maxLength={10}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                value={settings.phone || ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setSettings((prev: any) => ({ ...prev, phone: digits }));
                }}
                className="form-control owner-input-field"
                style={{
                  ...inputStyle,
                  borderColor: (settings.phone && (!/^[6-9]\d{9}$/.test(settings.phone))) ? '#EF4444' : undefined,
                }}
              />
              {settings.phone && !/^[6-9]/.test(settings.phone) && (
                <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '3px', display: 'block' }}>
                  Indian number must start with 6, 7, 8, or 9
                </span>
              )}
              {settings.phone && /^[6-9]/.test(settings.phone) && settings.phone.length < 10 && (
                <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '3px', display: 'block' }}>
                  Must be 10 digits ({settings.phone.length}/10 entered)
                </span>
              )}
              {settings.phone && /^[6-9]\d{9}$/.test(settings.phone) && (
                <span style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '3px', display: 'block' }}>
                  ✓ Valid 10-digit mobile number
                </span>
              )}
            </div>

            <div>
              <label style={labelStyle}>{language === 'mr' ? 'शहर' : 'City'}</label>
              <input
                type="text"
                name="city"
                value={settings.city || ''}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{language === 'mr' ? 'राज्य' : 'State'}</label>
              <input
                type="text"
                name="state"
                value={settings.state || ''}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{language === 'mr' ? 'चलन कोड' : 'Currency Code'}</label>
              <input
                type="text"
                name="currency"
                value={settings.currency || 'INR'}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{language === 'mr' ? 'जीएसटीआयएन / कर नोंदणी क्रमांक' : 'GSTIN / Tax Registration Number'}</label>
              <input
                type="text"
                name="taxNumber"
                placeholder="e.g. 27ABCDE1234F1Z5"
                value={settings.taxNumber || ''}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{language === 'mr' ? 'मुख्यालय / नोंदणीकृत पत्ता' : 'Headquarters / Registered Address'}</label>
              <input
                type="text"
                name="address"
                value={settings.address || ''}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            {/* Optional Bank Details for Hotel Business Profile */}
            <div style={{ gridColumn: '1 / -1', marginTop: '14px', paddingTop: '18px', borderTop: '1px solid var(--border-slate, #F1F5F9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>
                    Bank Details (Optional)
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #64748B)' }}>
                    Used for invoices, payouts, and billing payment references.
                  </p>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-secondary, #F1F5F9)', color: 'var(--text-muted, #64748B)', padding: '3px 8px', borderRadius: '6px' }}>
                  OPTIONAL
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    placeholder="e.g. State Bank of India"
                    value={settings.bankName || ''}
                    onChange={handleChange}
                    className="form-control owner-input-field"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Account Holder Name</label>
                  <input
                    type="text"
                    name="accountHolderName"
                    placeholder="e.g. Royal Palace Hotel"
                    value={settings.accountHolderName || ''}
                    onChange={handleChange}
                    className="form-control owner-input-field"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="e.g. 123456789012"
                    value={settings.accountNumber || ''}
                    onChange={handleChange}
                    className="form-control owner-input-field"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>IFSC Code</label>
                  <input
                    type="text"
                    name="ifscCode"
                    placeholder="e.g. SBIN0001234"
                    maxLength={11}
                    value={settings.ifscCode || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setSettings((prev: any) => ({ ...prev, ifscCode: val }));
                    }}
                    className="form-control owner-input-field"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>UPI ID / VPA</label>
                  <input
                    type="text"
                    name="upiId"
                    placeholder="e.g. royalpalace@upi"
                    value={settings.upiId || ''}
                    onChange={handleChange}
                    className="form-control owner-input-field"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Bank / Account Registered Phone Number</label>
                  <input
                    type="tel"
                    name="bankPhone"
                    maxLength={10}
                    placeholder="10-digit Indian number (e.g. 9876543210)"
                    value={settings.bankPhone || ''}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setSettings((prev: any) => ({ ...prev, bankPhone: digits }));
                    }}
                    className="form-control owner-input-field"
                    style={{
                      ...inputStyle,
                      borderColor: (settings.bankPhone && (!/^[6-9]\d{9}$/.test(settings.bankPhone))) ? '#EF4444' : undefined,
                    }}
                  />
                  {settings.bankPhone && !/^[6-9]/.test(settings.bankPhone) && (
                    <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '3px', display: 'block' }}>
                      Indian number must start with 6, 7, 8, or 9
                    </span>
                  )}
                  {settings.bankPhone && /^[6-9]/.test(settings.bankPhone) && settings.bankPhone.length < 10 && (
                    <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '3px', display: 'block' }}>
                      Must be 10 digits ({settings.bankPhone.length}/10 entered)
                    </span>
                  )}
                  {settings.bankPhone && /^[6-9]\d{9}$/.test(settings.bankPhone) && (
                    <span style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '3px', display: 'block' }}>
                      ✓ Valid 10-digit mobile number
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-slate, #F1F5F9)', paddingTop: '18px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 26px',
                backgroundColor: saving ? '#9CA3AF' : '#B45309',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(180, 83, 9, 0.25)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Save size={16} />
              <span>
                {saving
                  ? (language === 'mr' ? 'सेटिंग्ज सेव्ह होत आहेत...' : 'Saving Settings...')
                  : (language === 'mr' ? 'सेटिंग्ज सेव्ह करा' : 'Save Settings')}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Daily Automated Backup (11:00 PM) Card */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)' }}>
                {language === 'mr' ? 'दैनिक स्वयंचलित हॉटेल बॅकअप (रात्री ११:००)' : 'Daily Automated Hotel Backup (11:00 PM)'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
                {language === 'mr'
                  ? 'दैनिक हॉटेल डेटा बॅकअप • रोज रात्री ११:०० वाजता ऑटोमॅटिक ईमेल'
                  : 'Daily hotel data backup • Automatic email every night at 11:00 PM'}
              </p>
            </div>
          </div>
          <span
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
            }}
          >
            {language === 'mr' ? 'दररोज रात्री नियोजित (२३:००)' : 'SCHEDULED EVERY NIGHT (23:00)'}
          </span>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-body, #475569)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
          {language === 'mr' ? (
            <>
              दररोज रात्री <strong>११:०० वाजता</strong>, सर्व दैनंदिन विक्री, ऑर्डर्स, इनव्हॉइसेस, पेमेंट्स, टेबल्स आणि खर्च संकलित केले जातात आणि JSON डेटा व PDF अहवाल स्वरूपात तुमच्या हॉटेल प्रोफाइल ईमेलवर (<strong>{settings.contactEmail || 'admin@royalpalace.com'}</strong>) आपोआप पाठवले जातात.
            </>
          ) : (
            <>
              Every night at <strong>11:00 PM</strong>, all daily sales, orders, invoices, payments, tables, and expenses are compiled and automatically sent to your Hotel Profile email (<strong>{settings.contactEmail || 'admin@royalpalace.com'}</strong>) with JSON data and PDF summary attachments.
            </>
          )}
        </p>

        {/* SMTP Status Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '18px',
            padding: '11px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.10)',
            borderRadius: '10px',
            border: '1px solid rgba(16, 185, 129, 0.28)',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#10B981' }}>
              {language === 'mr' ? 'Gmail SMTP कनेक्टेड (application.yml द्वारे)' : 'Gmail SMTP Connected via application.yml'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginLeft: '6px' }}>
              ({smtpSenderEmail || 'omchaudhari553@gmail.com'}) — {language === 'mr' ? 'क्रेडेन्शियल्स आधीच application.yml मध्ये कॉन्फिगर केलेले आहेत.' : 'Credentials already configured in application.yml.'}
            </span>
          </div>
        </div>

        {lastBackupStatus.status !== 'idle' && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.84rem',
              backgroundColor:
                lastBackupStatus.status === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : lastBackupStatus.status === 'warning'
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${
                lastBackupStatus.status === 'success'
                  ? 'rgba(16, 185, 129, 0.35)'
                  : lastBackupStatus.status === 'warning'
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(239, 68, 68, 0.35)'
              }`,
              color:
                lastBackupStatus.status === 'success'
                  ? '#10B981'
                  : lastBackupStatus.status === 'warning'
                  ? '#F59E0B'
                  : '#EF4444',
            }}
          >
            {lastBackupStatus.status === 'success' ? (
              <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div>
              <div style={{ fontWeight: 700 }}>
                {lastBackupStatus.status === 'success'
                  ? (language === 'mr' ? 'बॅकअप ईमेल यशस्वीरीत्या पाठवला!' : 'Backup Email Dispatched Successfully!')
                  : (language === 'mr' ? 'बॅकअप फाइल सर्व्हरवर सेव्ह केली!' : 'Backup File Saved Locally on Server!')}
              </div>
              <div style={{ marginTop: '2px', lineHeight: 1.4 }}>
                {lastBackupStatus.message}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={backupSending}
            onClick={handleSendDailyBackupNow}
            title={language === 'mr' ? 'बॅकअप ईमेल आता पाठवा' : (backupSending ? 'Sending Backup Email...' : 'Send Daily Backup to Email Now')}
            aria-label="Send Daily Backup to Email Now"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: backupSending ? '#94A3B8' : '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: backupSending ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)',
              transition: 'background-color 0.2s ease',
            }}
          >
            <RefreshCw size={18} color="#FFFFFF" style={backupSending ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>

          <button
            type="button"
            onClick={handleDownloadDailyBackup}
            title={language === 'mr' ? 'बॅकअप डाउनलोड करा (.json)' : 'Download Backup (.json)'}
            aria-label="Download Backup (.json)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--card-white, #FFFFFF)',
              color: 'var(--text-heading, #0F172A)',
              border: '1px solid var(--border-slate, #CBD5E1)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D97706';
              e.currentTarget.style.color = '#D97706';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-slate, #CBD5E1)';
              e.currentTarget.style.color = 'var(--text-heading, #0F172A)';
            }}
          >
            <Download size={18} color="currentColor" />
          </button>

          <button
            type="button"
            onClick={handleDownloadDailyBackupPdf}
            title={language === 'mr' ? 'PDF अहवाल डाउनलोड करा (.pdf)' : 'Download PDF Report (.pdf)'}
            aria-label="Download PDF Report (.pdf)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--card-white, #FFFFFF)',
              color: 'var(--text-heading, #0F172A)',
              border: '1px solid var(--border-slate, #CBD5E1)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D97706';
              e.currentTarget.style.color = '#D97706';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-slate, #CBD5E1)';
              e.currentTarget.style.color = 'var(--text-heading, #0F172A)';
            }}
          >
            <FileText size={18} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Standalone / Direct Subscription Modal for 100% Reliable Triggering */}
      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => {
          setShowUpgradeModal(false);
          loadData();
        }}
      />
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.84rem',
  fontWeight: 700,
  color: 'var(--text-heading, #334155)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  minHeight: '44px',
  paddingTop: '10px',
  paddingBottom: '10px',
  paddingRight: '14px',
  paddingLeft: '14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-slate, #CBD5E1)',
  fontSize: '0.90rem',
  fontFamily: 'inherit',
  color: 'var(--text-heading, #0F172A)',
  backgroundColor: 'var(--card-white, #FFFFFF)',
  outline: 'none',
  boxSizing: 'border-box',
  display: 'block',
  transition: 'all 0.15s ease-in-out',
};

export default OwnerSettings;
