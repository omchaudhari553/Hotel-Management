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
} from 'lucide-react';
import { ownerService } from './ownerService';
import apiClient from '../services/api';
import { licenceService, LicenceInfo } from '../services/licenceService';
import { useToast } from '../context/ToastContext';
import { useTheme, ThemeType } from '../context/ThemeContext';
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [settRes, licRes] = await Promise.all([
        ownerService.getSettings(),
        licenceService.getLicenceInfo().catch(() => null),
      ]);
      if (settRes) {
        setSettings(settRes);
        if (settRes.theme && (settRes.theme === 'system' || settRes.theme === 'dark' || settRes.theme === 'light')) {
          setTheme(settRes.theme as ThemeType);
        }
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
    setSaving(true);
    try {
      await ownerService.updateSettings({ ...settings, theme });
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
          senderEmail: smtpSenderEmail ? smtpSenderEmail.trim() : undefined,
          appPassword: smtpAppPassword ? smtpAppPassword.trim() : undefined,
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
      name: 'System Default / सिस्टीम डिफॉल्ट',
      badge: 'Automatic',
      desc: 'Automatically matches your device operating system theme (Light or Dark)',
      colors: ['#FFFFFF', '#0B0F19', '#F59E0B', '#38BDF8'],
      icon: Laptop,
    },
    {
      id: 'light',
      name: 'Daylight / Classic Light',
      badge: 'Standard',
      desc: 'Clean daylight theme with crisp white cards & amber accents',
      colors: ['#FFFFFF', '#F8FAFC', '#F59E0B', '#1E293B'],
      icon: Sun,
    },
    {
      id: 'dark',
      name: 'Midnight / Modern Dark',
      badge: 'Night Mode',
      desc: 'Deep obsidian night theme with high contrast slate cards',
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
          Owner Settings & Enterprise Preferences
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
                Status:{' '}
                <strong className="owner-trial-status-badge">
                  {licenceInfo?.trialStatus || 'Active'}
                </strong>{' '}
                •{' '}
                <span className="owner-trial-days">
                  {licenceInfo?.daysRemaining != null ? `${licenceInfo.daysRemaining} Days Remaining` : 'Full Access'}
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
            Upgrade / Renew Plan
          </button>
        </div>
      </div>

      {/* ========================================================
          THEME SWITCHER SECTION (Applies Across Whole Application)
      ======================================================== */}
      {/* Compact Theme Buttons - All verbose garbage removed per user request */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={18} color="#D97706" />
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
            Theme
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            Central Hotel Business Profile
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
            Multi-branch identifier: <strong>{settings?.code || 'HOTEL_GRANDHERITAGE12'}</strong>
          </span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Business Legal / Brand Name</label>
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
              <label style={labelStyle}>Owner Full Name</label>
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
              <label style={labelStyle}>Contact Email</label>
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
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={settings.phone || ''}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>City</label>
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
              <label style={labelStyle}>State</label>
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
              <label style={labelStyle}>Currency Code</label>
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
              <label style={labelStyle}>GSTIN / Tax Registration Number</label>
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
              <label style={labelStyle}>Headquarters / Registered Address</label>
              <input
                type="text"
                name="address"
                value={settings.address || ''}
                onChange={handleChange}
                className="form-control owner-input-field"
                style={inputStyle}
              />
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
              <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Daily Automated Backup (11:00 PM) Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '24px',
          boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0,0,0,0.05))',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading, #1E293B)' }}>
                Daily Automated Hotel Backup (11:00 PM)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
                दैनिक हॉटेल डेटा बॅकअप • रोज रात्री ११:०० वाजता ऑटोमॅटिक मेल
              </p>
            </div>
          </div>
          <span style={{ backgroundColor: '#10B98118', color: '#10B981', border: '1px solid #10B98140', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            SCHEDULED EVERY NIGHT (23:00)
          </span>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #475569)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
          Every night at <strong>11:00 PM</strong>, all daily sales, orders, invoices, payments, tables, and expenses are compiled and automatically sent to your Hotel Profile email (<strong>{settings.contactEmail || 'admin@royalpalace.com'}</strong>) with JSON data and PDF summary attachments.
        </p>

        <div style={{ marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading, #334155)', margin: 0 }}>
                Sender Gmail Address (प्रेषक ईमेल)
              </label>
            </div>
            <input
              type="email"
              value={smtpSenderEmail}
              onChange={(e) => setSmtpSenderEmail(e.target.value)}
              placeholder="e.g. yourhotel@gmail.com"
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
              }}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', marginTop: '4px', display: 'block' }}>
              ज्या Gmail खात्यावरून बॅकअप पाठवायचा आहे तो ईमेल.
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading, #334155)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} color="#D97706" />
                Google App Password (16-digit)
              </label>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: '#2563EB', textDecoration: 'underline', fontWeight: 600 }}
              >
                गुगल ॲप पासवर्ड तयार करा ↗
              </a>
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={smtpAppPassword}
                onChange={(e) => setSmtpAppPassword(e.target.value)}
                placeholder={hasCustomPassword ? '•••••••••••••••• (App Password Saved)' : 'abcd efgh ijkl mnop'}
                style={{
                  ...inputStyle,
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  paddingRight: '40px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748B',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', marginTop: '4px', display: 'block' }}>
              Gmail वरून दररोज रात्री ११:०० वाजता बॅकअप मेल जाण्यासाठी गुगलचा 16-अंकी App Password येथे टाका.
            </span>
          </div>
        </div>

        {/* 1-Minute Guide Alert Box */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '18px',
            fontSize: '0.8rem',
            color: '#334155',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#3B82F6" />
            1 मिनिटात Google 16-Digit App Password कसा मिळवायचा:
          </div>
          <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
            <li>तुमच्या Google खात्यात (उदा. {smtpSenderEmail || 'Gmail'}) <strong>2-Step Verification</strong> चालू असल्याची खात्री करा.</li>
            <li>
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 600 }}>
                https://myaccount.google.com/apppasswords
              </a> वर जा आणि App Name मध्ये <strong>Hotel POS</strong> टाकून "Create" वर क्लिक करा.
            </li>
            <li>मिळालेला 16-अंकी पासवर्ड (उदा. <code>abcd efgh ijkl mnop</code>) वरील रकान्यात टाकून खालील <strong>"Save SMTP Credentials"</strong> किंवा <strong>"Send Daily Backup to Email Now"</strong> दाबा.</li>
          </ol>
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
                  ? '#ECFDF5'
                  : lastBackupStatus.status === 'warning'
                  ? '#FFFBEB'
                  : '#FEF2F2',
              border: `1px solid ${
                lastBackupStatus.status === 'success'
                  ? '#10B98150'
                  : lastBackupStatus.status === 'warning'
                  ? '#F59E0B60'
                  : '#EF444450'
              }`,
              color:
                lastBackupStatus.status === 'success'
                  ? '#065F46'
                  : lastBackupStatus.status === 'warning'
                  ? '#92400E'
                  : '#991B1B',
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
                  ? 'Backup Email Dispatched Successfully!'
                  : 'Backup File Saved Locally on Server!'}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              backgroundColor: backupSending ? '#94A3B8' : '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: backupSending ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)',
            }}
          >
            <RefreshCw size={15} style={backupSending ? { animation: 'spin 1s linear infinite' } : undefined} />
            <span>{backupSending ? 'Sending Backup Email...' : 'Send Daily Backup to Email Now'}</span>
          </button>

          {(smtpAppPassword || smtpSenderEmail) && (
            <button
              type="button"
              disabled={savingSmtp}
              onClick={handleSaveSmtpSettings}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: savingSmtp ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Save size={15} />
              <span>{savingSmtp ? 'Saving...' : 'Save SMTP Credentials'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadDailyBackup}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              backgroundColor: 'var(--bg-secondary, #F1F5F9)',
              color: 'var(--text-heading, #1E293B)',
              border: '1px solid var(--border-slate, #CBD5E1)',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            <span>Download Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDailyBackupPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              backgroundColor: 'var(--bg-secondary, #F1F5F9)',
              color: 'var(--text-heading, #1E293B)',
              border: '1px solid var(--border-slate, #CBD5E1)',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={15} />
            <span>Download PDF Report (.pdf)</span>
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
