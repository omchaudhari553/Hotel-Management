import React, { useEffect, useState } from 'react';
import { superAdminApi, BusinessSummary } from '../superAdminApi';
import {
  Users2,
  Shield,
  KeyRound,
  Check,
  RefreshCw,
  Plus,
  Edit2,
  Lock,
  History,
  Slash,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  X,
  Copy,
  Smartphone,
  Laptop,
  CheckCheck,
  ShieldAlert,
  Search
} from 'lucide-react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';

export interface PlatformUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_SUPPORT' | 'BILLING_ADMIN' | 'AUDIT_MANAGER' | 'PRODUCT_OPERATIONS';
  active: boolean;
  lastLogin?: string;
  permissions: string[];
}

export interface LoginHistoryEntry {
  id: number;
  username: string;
  ipAddress: string;
  device: string;
  location: string;
  timestamp: string;
  status: 'SUCCESS' | 'MFA_VERIFIED' | 'FAILED';
}

const AVAILABLE_PERMISSIONS = [
  { key: 'MANAGE_BUSINESSES', label: 'Manage Businesses & Branches' },
  { key: 'MANAGE_PRODUCTS_MODULES', label: 'Toggle Product Modules (Hotel/Mess/Cafe)' },
  { key: 'MANAGE_SUBSCRIPTIONS', label: 'Manage Plans & Subscriptions' },
  { key: 'MANAGE_PAYMENTS', label: 'Payment Gateway & View Invoices' },
  { key: 'HANDLE_REFUNDS', label: 'Execute Gateway Refunds' },
  { key: 'SUPPORT_TICKETS', label: 'Customer Support & Impersonation Access' },
  { key: 'VIEW_AUDIT_LOGS', label: 'Security & Platform Audit Logs' },
  { key: 'MANAGE_PLATFORM_USERS', label: 'Create & Manage Admin Users' }
];

export const UserRoleManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PLATFORM_USERS' | 'BUSINESS_OWNERS' | 'PERMISSIONS_MATRIX'>('PLATFORM_USERS');
  const [searchQuery, setSearchQuery] = useState('');

  // Business owners fetched from backend
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);

  // Platform Admins
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([
    {
      id: 1,
      username: 'superadmin',
      fullName: 'Platform Super Administrator',
      email: 'superadmin@platform.com',
      phone: '+91 98765 43210',
      role: 'SUPER_ADMIN',
      active: true,
      lastLogin: 'Just now',
      permissions: AVAILABLE_PERMISSIONS.map(p => p.key)
    },
    {
      id: 2,
      username: 'rahul.support',
      fullName: 'Rahul Verma (Support Lead)',
      email: 'rahul.support@platform.com',
      phone: '+91 98234 11223',
      role: 'PLATFORM_SUPPORT',
      active: true,
      lastLogin: '2 hours ago',
      permissions: ['SUPPORT_TICKETS', 'VIEW_AUDIT_LOGS']
    },
    {
      id: 3,
      username: 'priya.finance',
      fullName: 'Priya Deshmukh (Billing Admin)',
      email: 'priya.billing@platform.com',
      phone: '+91 97654 33445',
      role: 'BILLING_ADMIN',
      active: true,
      lastLogin: 'Yesterday, 4:15 PM',
      permissions: ['MANAGE_PAYMENTS', 'MANAGE_SUBSCRIPTIONS', 'HANDLE_REFUNDS']
    },
    {
      id: 4,
      username: 'audit.officer',
      fullName: 'Audit & Compliance Officer',
      email: 'audit@platform.com',
      phone: '+91 91234 56789',
      role: 'AUDIT_MANAGER',
      active: false,
      lastLogin: '3 days ago',
      permissions: ['VIEW_AUDIT_LOGS']
    }
  ]);

  // Login History Mock entries
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([
    { id: 101, username: 'superadmin', ipAddress: '103.21.244.15', device: 'Chrome on Windows 11', location: 'Pune, India', timestamp: '22 Nov 2026, 07:15 PM', status: 'SUCCESS' },
    { id: 102, username: 'superadmin', ipAddress: '103.21.244.15', device: 'Chrome on Windows 11', location: 'Pune, India', timestamp: '22 Nov 2026, 05:40 PM', status: 'MFA_VERIFIED' },
    { id: 103, username: 'rahul.support', ipAddress: '49.36.128.89', device: 'Edge on Windows 10', location: 'Mumbai, India', timestamp: '22 Nov 2026, 03:10 PM', status: 'SUCCESS' },
    { id: 104, username: 'unknown_probe', ipAddress: '185.220.101.4', device: 'Python-requests/2.28', location: 'Frankfurt, Germany', timestamp: '22 Nov 2026, 01:22 AM', status: 'FAILED' },
    { id: 105, username: 'priya.finance', ipAddress: '157.34.88.19', device: 'Safari on macOS', location: 'Bengaluru, India', timestamp: '21 Nov 2026, 04:15 PM', status: 'SUCCESS' }
  ]);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [userForm, setUserForm] = useState<Omit<PlatformUser, 'id'>>({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'PLATFORM_SUPPORT',
    active: true,
    permissions: ['SUPPORT_TICKETS']
  });

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<PlatformUser | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedPass, setCopiedPass] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetUsername, setHistoryTargetUsername] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getBusinesses();
      setBusinesses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFullPageRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 120);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'PLATFORM_SUPPORT',
      active: true,
      permissions: ['SUPPORT_TICKETS']
    });
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const openEditModal = (u: PlatformUser) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      active: u.active,
      permissions: [...u.permissions]
    });
    setShowAddEditModal(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.email.trim()) {
      showAlert('Username and Email are required.', 'Missing Fields', 'warning');
      return;
    }

    if (editingUser) {
      setPlatformUsers(prev =>
        prev.map(u => (u.id === editingUser.id ? { ...u, ...userForm } : u))
      );
      showAlert(`Platform user "${userForm.fullName}" updated successfully.`, 'User Updated', 'success');
    } else {
      const newUser: PlatformUser = {
        id: Date.now(),
        ...userForm,
        lastLogin: 'Never'
      };
      setPlatformUsers(prev => [...prev, newUser]);
      showAlert(`New platform admin "${userForm.fullName}" created successfully with role ${userForm.role}.`, 'User Created', 'success');
    }
    setShowAddEditModal(false);
  };

  // Toggle User Active Status
  const handleToggleActive = (u: PlatformUser) => {
    if (u.role === 'SUPER_ADMIN') {
      showAlert('Root Super Administrator account cannot be deactivated.', 'Action Restricted', 'warning');
      return;
    }

    const nextState = !u.active;
    showConfirm(
      `Are you sure you want to ${nextState ? 'activate' : 'deactivate'} access for "${u.fullName}"?`,
      () => {
        setPlatformUsers(prev =>
          prev.map(item => (item.id === u.id ? { ...item, active: nextState } : item))
        );
        showAlert(`Account for ${u.fullName} is now ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`, 'Status Updated', 'info');
      },
      nextState ? 'Activate User' : 'Deactivate User',
      nextState ? 'Activate' : 'Deactivate'
    );
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (u: PlatformUser) => {
    setResetTargetUser(u);
    const randomPass = 'Secure@' + Math.floor(100000 + Math.random() * 900000);
    setGeneratedPassword(randomPass);
    setCopiedPass(false);
    setShowPasswordResetModal(true);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleConfirmResetPassword = () => {
    if (!resetTargetUser) return;
    setShowPasswordResetModal(false);
    showAlert(
      `Password for ${resetTargetUser.username} has been securely reset. One-time credentials issued.`,
      'Password Reset Complete',
      'success'
    );
  };

  // Revoke Active Sessions
  const handleRevokeSessions = (u: PlatformUser) => {
    showConfirm(
      `Revoke all active JWT sessions and refresh tokens for "${u.fullName}"? The user will be immediately logged out of all devices.`,
      () => {
        showAlert(`All active sessions for ${u.username} have been terminated.`, 'Sessions Revoked', 'success');
      },
      'Revoke Active Sessions',
      'Revoke All Sessions'
    );
  };

  // Toggle permission in form
  const togglePermission = (permKey: string) => {
    if (userForm.permissions.includes(permKey)) {
      setUserForm({ ...userForm, permissions: userForm.permissions.filter(p => p !== permKey) });
    } else {
      setUserForm({ ...userForm, permissions: [...userForm.permissions, permKey] });
    }
  };

  const filteredPlatformUsers = platformUsers.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">User & Role Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administer platform-level users, assign role-based permissions, reset passwords, audit login histories, and revoke active sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Full Page Refresh Button (38px height) */}
          <button
            type="button"
            onClick={handleFullPageRefresh}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '10px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              color: '#E2E8F0',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
            title="Refresh Entire Page"
          >
            <RefreshCw
              style={{
                width: '15px',
                height: '15px',
                color: '#818CF8',
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>Refresh</span>
          </button>

          {/* Create Admin User Button (38px height) */}
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '10px',
              backgroundColor: '#4F46E5',
              border: '1px solid #6366F1',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4338CA'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4F46E5'; }}
          >
            <Plus className="w-4 h-4" />
            <span>Create Admin User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 text-xs">
        <button
          onClick={() => setActiveTab('PLATFORM_USERS')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PLATFORM_USERS'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Platform Admins & Staff ({platformUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BUSINESS_OWNERS')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'BUSINESS_OWNERS'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Business Owners & Branches ({businesses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PERMISSIONS_MATRIX')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PERMISSIONS_MATRIX'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>RBAC Permission Matrix</span>
        </button>
      </div>

      {/* TAB 1: PLATFORM USERS */}
      {activeTab === 'PLATFORM_USERS' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platform users by username, full name, email, or role..."
              className="w-full bg-transparent text-slate-200 text-xs focus:outline-none"
            />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Permissions Scope</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPlatformUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            u.role === 'SUPER_ADMIN' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white">{u.fullName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">@{u.username} • {u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                            : u.role === 'PLATFORM_SUPPORT'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : u.role === 'BILLING_ADMIN'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-slate-300">
                          {u.permissions.length === AVAILABLE_PERMISSIONS.length
                            ? 'Full Super Admin Scope'
                            : `${u.permissions.length} granular privileges`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {u.lastLogin}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {u.active ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Edit User Details & Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => openResetPasswordModal(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Reset Password Securely"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* Login History */}
                          <button
                            onClick={() => {
                              setHistoryTargetUsername(u.username);
                              setShowHistoryModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="View Login History"
                          >
                            <History className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          {/* Revoke Sessions */}
                          <button
                            onClick={() => handleRevokeSessions(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Revoke Active Sessions"
                          >
                            <Slash className="w-3.5 h-3.5 text-rose-400" />
                          </button>

                          {/* Activate / Deactivate */}
                          {u.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.active
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}
                              title={u.active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {u.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS OWNERS & BRANCHES */}
      {activeTab === 'BUSINESS_OWNERS' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tenant Business Accounts & Branch Admins</h3>
            <span className="text-xs text-slate-400">Total Businesses: {businesses.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4 text-center">Branches</th>
                  <th className="py-3 px-4">Role Tier</th>
                  <th className="py-3 px-4 text-center">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{b.ownerName || 'Business Owner'}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold">{b.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{b.email || b.phone}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {b.branchCount || 1} Branches
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ROLE_OWNER
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RBAC PERMISSIONS MATRIX */}
      {activeTab === 'PERMISSIONS_MATRIX' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>Role-Based Access Control (RBAC) Architecture</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Do not grant every Super Admin employee full access. The principle of least privilege is strictly enforced across platform modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30">
              <span className="text-xs font-mono font-bold text-indigo-400 block mb-1">SUPER_ADMIN</span>
              <p className="text-[11px] text-slate-300 mb-3">Root platform authority with full unrestricted read/write permissions.</p>
              <ul className="text-[11px] space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> All 8 Capabilities</li>
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Manage Platform Users</li>
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Root Impersonation Guard</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30">
              <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">PLATFORM_SUPPORT</span>
              <p className="text-[11px] text-slate-300 mb-3">Assigned to help customers resolve technical queries and view audit trails.</p>
              <ul className="text-[11px] space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Support & Complaints</li>
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> View Audit Logs</li>
                <li className="flex items-center gap-1.5 text-rose-400"><Slash className="w-3.5 h-3.5" /> No Payment Access</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
              <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">BILLING_ADMIN</span>
              <p className="text-[11px] text-slate-300 mb-3">Audits payments, manages subscriptions, plans, and executes customer refunds.</p>
              <ul className="text-[11px] space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Payment Management</li>
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Execute Gateway Refunds</li>
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Subscription Pricing</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30">
              <span className="text-xs font-mono font-bold text-purple-400 block mb-1">AUDIT_MANAGER</span>
              <p className="text-[11px] text-slate-300 mb-3">Read-only platform compliance officer verifying regulatory security logs.</p>
              <ul className="text-[11px] space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Read-Only Security Logs</li>
                <li className="flex items-center gap-1.5 text-emerald-400"><Check className="w-3.5 h-3.5" /> Compliance Verification</li>
                <li className="flex items-center gap-1.5 text-rose-400"><Slash className="w-3.5 h-3.5" /> Zero Mutation Rights</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {editingUser ? 'Edit Platform User & Roles' : 'Create Platform Admin User'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="e.g. amit.admin"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Amit Patil"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="admin@platform.com"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Role Assignment *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform)</option>
                    <option value="PLATFORM_SUPPORT">PLATFORM_SUPPORT (Tickets & Logs)</option>
                    <option value="BILLING_ADMIN">BILLING_ADMIN (Payments & Refunds)</option>
                    <option value="AUDIT_MANAGER">AUDIT_MANAGER (Audit Only)</option>
                    <option value="PRODUCT_OPERATIONS">PRODUCT_OPERATIONS (Module Toggles)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div>
                <label className="text-slate-400 font-semibold block mb-2">Granular Role Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  {AVAILABLE_PERMISSIONS.map((p) => {
                    const checked = userForm.permissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        onClick={() => togglePermission(p.key)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-[11px] transition-colors ${
                          checked ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 -mx-6 -mb-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordResetModal && resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Reset User Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordResetModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <p>
                Resetting password for <strong className="text-white">@{resetTargetUser.username}</strong> ({resetTargetUser.fullName}).
              </p>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Generated One-Time Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedPassword}
                    className="flex-1 bg-slate-950 text-amber-400 font-mono font-bold text-sm border border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                    title="Copy Password"
                  >
                    {copiedPass ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copiedPass && <span className="text-[10px] text-emerald-400 block mt-1">Copied to clipboard!</span>}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                The user will be required to change this password upon their next successful login.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                onClick={() => setShowPasswordResetModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetPassword}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/30"
              >
                Confirm & Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Login & Device Access History {historyTargetUsername ? `(@${historyTargetUsername})` : ''}
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Device & Browser</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loginHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-300">{h.timestamp}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-400">{h.ipAddress}</td>
                      <td className="py-2.5 px-3 text-slate-300">{h.device}</td>
                      <td className="py-2.5 px-3 text-slate-400">{h.location}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.status === 'SUCCESS' || h.status === 'MFA_VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
