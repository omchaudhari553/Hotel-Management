import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Eye,
  Power,
  RefreshCw,
  Building2,
  MapPin,
  Phone,
  User,
  Shield,
  Key,
  Trash2,
  Check,
} from 'lucide-react';
import { ownerService, BranchRecord, UpdateBranchPayload } from './ownerService';
import { useToast } from '../context/ToastContext';

export const OwnerBranches: React.FC = () => {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<BranchRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [branchToDelete, setBranchToDelete] = useState<BranchRecord | null>(null);
  const [deleteSuccessModal, setDeleteSuccessModal] = useState<{ open: boolean; branchName: string }>({
    open: false,
    branchName: '',
  });
  const [editForm, setEditForm] = useState<UpdateBranchPayload>({});
  const [updating, setUpdating] = useState<boolean>(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await ownerService.getBranches();
      setBranches(res);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleToggleStatus = async (branch: BranchRecord) => {
    const nextStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ownerService.updateBranchStatus(branch.id, nextStatus);
      showToast(
        'success',
        `Branch "${branch.name}" is now ${nextStatus}.${nextStatus === 'INACTIVE' ? ' Associated user cannot log in.' : ''}`
      );
      loadBranches();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to update branch status.');
    }
  };

  const [deletingBranchId, setDeletingBranchId] = useState<number | null>(null);

  const handleDeleteClick = (branch: BranchRecord) => {
    if (branches.length <= 1) {
      showToast('error', 'Cannot delete the only branch of your hotel. At least one branch must remain.');
      return;
    }
    setBranchToDelete(branch);
  };

  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    const target = branchToDelete;
    try {
      setDeletingBranchId(target.id);
      await ownerService.deleteBranch(target.id);
      setBranchToDelete(null);
      setDeleteSuccessModal({ open: true, branchName: target.name });
      loadBranches();
      setTimeout(() => {
        setDeleteSuccessModal({ open: false, branchName: '' });
      }, 2000);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to delete branch.';
      showToast('error', errorMsg);
    } finally {
      setDeletingBranchId(null);
    }
  };

  const handleOpenEdit = (branch: BranchRecord) => {
    setSelectedBranch(branch);
    setEditForm({
      branchName: branch.name,
      contactNumber: branch.contactPhone,
      branchAddress: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      branchManagerName: branch.managerName || '',
      password: '',
      status: branch.status,
    });
    setShowEditModal(true);
  };

  const handleOpenDetail = (branch: BranchRecord) => {
    setSelectedBranch(branch);
    setShowDetailModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    setUpdating(true);
    try {
      await ownerService.updateBranch(selectedBranch.id, editForm);
      showToast('success', `Branch "${editForm.branchName || selectedBranch.name}" updated successfully.`);
      setShowEditModal(false);
      loadBranches();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to update branch.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.managerName && b.managerName.toLowerCase().includes(q)) ||
      (b.username && b.username.toLowerCase().includes(q))
    );
  });

  const formatCurrency = (amt: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amt || 0));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            Branch Management
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => window.location.reload()}
            className="owner-btn-secondary"
            title="Refresh"
            aria-label="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              minHeight: '38px',
              padding: 0,
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1.5px solid var(--border-slate, #CBD5E1)',
            }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => navigate('/owner/branches/create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 18px',
              height: '42px',
              minHeight: '42px',
              backgroundColor: '#B45309',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(180, 83, 9, 0.25)',
            }}
          >
            <PlusCircle size={16} />
            <span>Add New Branch</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="owner-card owner-search-box"
        style={{
          borderRadius: '10px',
          padding: '0 16px',
          height: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Search size={18} color="var(--text-muted, #94A3B8)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          className="owner-search-input"
          placeholder="Search by branch name, code, city, manager name or login username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '0.88rem',
            backgroundColor: 'transparent',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-muted, #94A3B8)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Branch Table */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)', color: '#475569' }}>
                <th style={thStyle}>Branch Info</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Manager & Phone</th>
                <th style={thStyle}>Login Username</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Sales</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Staff</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748B)' }}>
                    Loading branches...
                  </td>
                </tr>
              ) : filteredBranches.length > 0 ? (
                filteredBranches.map((b) => (
                  <tr
                    key={b.id}
                    style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          <Building2 size={18} color="#B45309" />
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-heading, #0F172A)', fontSize: '0.92rem' }}>{b.name}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)' }}>Code: {b.code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-body, #334155)' }}>
                        <MapPin size={14} color="var(--text-muted, #94A3B8)" />
                        <span>{b.city ? `${b.city}${b.state ? `, ${b.state}` : ''}` : 'Not Specified'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: 'var(--text-heading, #0F172A)', fontWeight: 600 }}>{b.managerName || 'General Manager'}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="var(--text-muted, #94A3B8)" />
                        <span>{b.contactPhone || '—'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {b.username ? (
                        <div
                          className="owner-username-pill"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                          }}
                        >
                          <Shield size={12} />
                          <code style={{ fontSize: '0.8rem', fontWeight: 700 }}>{b.username}</code>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.78rem' }}>None</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          backgroundColor: b.status === 'ACTIVE' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                          color: b.status === 'ACTIVE' ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {b.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {b.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                      {formatCurrency(b.totalSales)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: 'var(--text-muted, #475569)' }}>
                      {b.staffCount}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenDetail(b)}
                          title="View Details"
                          className="owner-action-btn owner-action-btn-view"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          title="Edit Branch"
                          className="owner-action-btn owner-action-btn-edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(b)}
                          title={b.status === 'ACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
                          className={`owner-action-btn owner-action-btn-power ${b.status === 'ACTIVE' ? 'active' : 'inactive'}`}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(b)}
                          disabled={deletingBranchId === b.id}
                          title="Delete Branch"
                          className="owner-action-btn"
                          style={{
                            color: '#DC2626',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            cursor: deletingBranchId === b.id ? 'not-allowed' : 'pointer',
                            opacity: deletingBranchId === b.id ? 0.6 : 1,
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    No branches matched your filter. Click "Add New Branch" to create a new branch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Branch Modal */}
      {showEditModal && selectedBranch && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-slate, #E2E8F0)', paddingBottom: '14px', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
                Edit Branch: {selectedBranch.name}
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted, #64748B)' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={modalLabelStyle}>Branch Name</label>
                <input
                  type="text"
                  value={editForm.branchName || ''}
                  onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                  required
                  style={modalInputStyle}
                />
              </div>

              <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={modalLabelStyle}>Contact Phone</label>
                  <input
                    type="tel"
                    value={editForm.contactNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    required
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>Branch Manager Name</label>
                  <input
                    type="text"
                    value={editForm.branchManagerName || ''}
                    onChange={(e) => setEditForm({ ...editForm, branchManagerName: e.target.value })}
                    required
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={modalLabelStyle}>City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>State</label>
                  <input
                    type="text"
                    value={editForm.state || ''}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={modalLabelStyle}>Address</label>
                <input
                  type="text"
                  value={editForm.branchAddress || ''}
                  onChange={(e) => setEditForm({ ...editForm, branchAddress: e.target.value })}
                  placeholder="Full physical address or hotel premises location"
                  style={modalInputStyle}
                />
              </div>

              <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={modalLabelStyle}>Status</label>
                  <select
                    value={editForm.status || 'ACTIVE'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label style={modalLabelStyle}>Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave empty to keep current"
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--card-white, #FFFFFF)', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  style={{ padding: '8px 20px', backgroundColor: '#B45309', border: 'none', borderRadius: '6px', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Branch Details Modal */}
      {showDetailModal && selectedBranch && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-slate, #E2E8F0)', paddingBottom: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={24} color="#B45309" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
                  {selectedBranch.name}
                </h2>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted, #64748B)' }}>
                ✕
              </button>
            </div>

            <div className="owner-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Branch Code</span>
                <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{selectedBranch.code}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Status</span>
                <strong style={{ color: selectedBranch.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                  {selectedBranch.status}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Branch Manager</span>
                <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{selectedBranch.managerName || 'General Manager'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Contact Phone</span>
                <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{selectedBranch.contactPhone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Login Account Username</span>
                <strong style={{ color: '#2563EB' }}>{selectedBranch.username || 'Not configured'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Staff Count</span>
                <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{selectedBranch.staffCount} Members</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Physical Address</span>
                <span style={{ color: 'var(--text-heading, #0F172A)' }}>
                  {selectedBranch.address || 'Hotel Premises'}, {selectedBranch.city || ''} {selectedBranch.state || ''}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-slate, #E2E8F0)' }}>
                <span style={{ color: 'var(--text-muted, #64748B)', display: 'block', fontSize: '0.78rem' }}>Cumulative Realized Sales</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D' }}>
                  {formatCurrency(selectedBranch.totalSales)}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginLeft: '10px' }}>
                  ({selectedBranch.invoiceCount} invoices generated)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ padding: '8px 18px', backgroundColor: '#1E293B', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal (Software Popup) */}
      {branchToDelete && (
        <div style={modalOverlayStyle}>
          <div
            style={{
              ...modalContentStyle,
              maxWidth: '430px',
              textAlign: 'center',
              padding: '28px 24px',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Trash2 size={26} />
            </div>

            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-heading, #0F172A)',
                marginBottom: '8px',
              }}
            >
              Delete Branch?
            </h3>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted, #64748B)',
                lineHeight: '1.5',
                marginBottom: '20px',
              }}
            >
              Are you sure you want to delete branch{' '}
              <strong style={{ color: '#0F172A' }}>"{branchToDelete.name}"</strong> (Code:{' '}
              {branchToDelete.code})?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: '6px', display: 'block' }}>
                This will remove the branch and its associated credentials.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                disabled={deletingBranchId !== null}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingBranchId !== null}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: deletingBranchId !== null ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {deletingBranchId !== null ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Second Success Popup Modal */}
      {deleteSuccessModal.open && (
        <div style={modalOverlayStyle}>
          <div
            style={{
              ...modalContentStyle,
              maxWidth: '360px',
              textAlign: 'center',
              padding: '24px 20px',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
              }}
            >
              <Check size={26} />
            </div>
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-heading, #0F172A)',
                marginBottom: '6px',
              }}
            >
              Branch Deleted
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #64748B)', margin: '0 0 16px 0' }}>
              Branch <strong>"{deleteSuccessModal.branchName}"</strong> deleted successfully.
            </p>
            <button
              type="button"
              onClick={() => setDeleteSuccessModal({ open: false, branchName: '' })}
              style={{
                padding: '6px 20px',
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontWeight: 700,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '14px',
};

const iconBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: '1px solid var(--border-slate, #E2E8F0)',
  backgroundColor: 'var(--card-white, #FFFFFF)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '16px',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-white, #FFFFFF)',
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '4px',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  fontSize: '0.86rem',
  color: 'var(--text-heading, #0F172A)',
  outline: 'none',
  boxSizing: 'border-box',
};

export default OwnerBranches;

