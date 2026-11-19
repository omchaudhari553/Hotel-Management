import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { ownerService, CreateBranchPayload } from './ownerService';
import { useToast } from '../context/ToastContext';

export const OwnerBranchCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState<CreateBranchPayload>({
    branchName: '',
    contactNumber: '',
    branchAddress: '',
    city: '',
    state: '',
    branchManagerName: '',
    username: '',
    password: '',
    status: 'ACTIVE',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate required fields
    if (!form.branchName.trim()) {
      setError('Branch Name is required.');
      return;
    }
    if (!form.contactNumber.trim()) {
      setError('Contact Number is required.');
      return;
    }
    const cleanPhone = form.contactNumber.replace(/\D/g, '');
    if (!cleanPhone.match(/^[6-9][0-9]{9}$/)) {
      setError('Contact Number must be exactly 10 digits and start with 6, 7, 8, or 9.');
      return;
    }
    if (!form.branchManagerName.trim()) {
      setError('Branch Manager Name is required.');
      return;
    }
    if (!form.username.trim()) {
      setError('Username for branch login is required.');
      return;
    }
    if (form.username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateBranchPayload = {
        branchName: form.branchName.trim(),
        contactNumber: cleanPhone,
        branchAddress: form.branchAddress?.trim() || '',
        city: form.city?.trim() || '',
        state: form.state?.trim() || '',
        branchManagerName: form.branchManagerName.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        status: form.status || 'ACTIVE',
      };

      await ownerService.createBranch(payload);
      showToast('success', `Branch "${payload.branchName}" and login credentials created successfully!`);
      navigate('/owner/branches');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create branch and credentials.';
      setError(msg);
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/owner/branches')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-muted, #64748B)',
          fontSize: '0.86rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Branch Management</span>
      </button>

      {/* Card Header */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '24px 30px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', paddingBottom: '16px', marginBottom: '22px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            Create New Hotel Branch
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748B)', fontSize: '0.86rem' }}>
            Configure branch location details and automatically provision separate branch login credentials
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#B91C1C',
              fontSize: '0.86rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Section 1: Branch Details */}
          <div>
            <h3
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#B45309',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Building2 size={16} />
              <span>1. Branch Profile & Location</span>
            </h3>

            <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>
                  Branch Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  name="branchName"
                  placeholder="e.g. Main Branch, City Center Branch"
                  value={form.branchName}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Contact Number <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  placeholder="10-digit mobile number (e.g. 9876543210)"
                  value={form.contactNumber}
                  onChange={handleChange}
                  maxLength={10}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Mumbai, Pune"
                  value={form.city}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>State</label>
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Maharashtra"
                  value={form.state}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Branch Address</label>
                <input
                  type="text"
                  name="branchAddress"
                  placeholder="Full physical address or hotel premises location"
                  value={form.branchAddress}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Manager & Login Credentials */}
          <div style={{ borderTop: '1px solid var(--border-slate, #F1F5F9)', paddingTop: '20px' }}>
            <h3
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#B45309',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Shield size={16} />
              <span>2. Dedicated Branch Login Credentials</span>
            </h3>

            <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>
                  Branch Manager Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  name="branchManagerName"
                  placeholder="e.g. Rahul Sharma"
                  value={form.branchManagerName}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Branch Status <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                  <option value="ACTIVE">ACTIVE (Can log in & operate)</option>
                  <option value="INACTIVE">INACTIVE (Account disabled)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Username <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  placeholder="e.g. branch_admin, manager1"
                  value={form.username}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', marginTop: '3px', display: 'block' }}>
                  Must be unique across the hotel system.
                </span>
              </div>

              <div>
                <label style={labelStyle}>
                  Password <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Min 6 characters (stored as BCrypt hash)"
                    value={form.password}
                    onChange={handleChange}
                    required
                    style={{ ...inputStyle, paddingRight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #64748B)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', marginTop: '3px', display: 'block' }}>
                  Hashed securely on server with BCrypt.
                </span>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid var(--border-slate, #F1F5F9)',
              paddingTop: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/owner/branches')}
              className="owner-btn-secondary"
              style={{
                padding: '9px 18px',
                backgroundColor: 'var(--card-white, #FFFFFF)',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: 'var(--text-heading, #475569)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                backgroundColor: submitting ? '#9CA3AF' : '#B45309',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(180, 83, 9, 0.25)',
              }}
            >
              {submitting ? 'Creating Branch & Account...' : 'Create Branch & Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-heading, #334155)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  minHeight: '42px',
  padding: '0 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-slate, #CBD5E1)',
  fontSize: '0.88rem',
  fontWeight: 500,
  color: 'var(--text-heading, #0F172A)',
  backgroundColor: 'var(--card-white, #FFFFFF)',
  outline: 'none',
  boxSizing: 'border-box',
};

export default OwnerBranchCreate;

