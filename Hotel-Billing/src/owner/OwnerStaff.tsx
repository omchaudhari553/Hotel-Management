import React, { useState, useEffect } from 'react';
import {
  Users,
  Filter,
  RefreshCw,
  Building2,
  Phone,
  UserCheck,
  UserX,
  Shield,
  Search,
  Trash2,
} from 'lucide-react';
import { ownerService, OwnerStaffItem, BranchRecord } from './ownerService';
import { useToast } from '../context/ToastContext';

export const OwnerStaff: React.FC = () => {
  const [staffList, setStaffList] = useState<OwnerStaffItem[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedBranchId) params.branchId = Number(selectedBranchId);

      const [staffRes, branchRes] = await Promise.all([
        ownerService.getStaff(params),
        ownerService.getBranches(),
      ]);
      setStaffList(staffRes);
      setBranches(branchRes);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to fetch staff records.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (s: OwnerStaffItem) => {
    if (!window.confirm(`Are you sure you want to delete staff member "${s.name}" (${s.staffCode})?`)) {
      return;
    }
    try {
      setDeletingId(s.id);
      await ownerService.deleteStaff(s.id);
      setStaffList((prev) => prev.filter((item) => item.id !== s.id));
      showToast('success', `Staff member "${s.name}" deleted successfully.`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to delete staff member.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [selectedBranchId]);

  const filteredStaff = staffList.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.staffCode.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.branchName && s.branchName.toLowerCase().includes(q)) ||
      (s.designation && s.designation.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            Branch Staff Directory
          </h1>
        </div>

        <button
          onClick={fetchStaffData}
          className="owner-btn-secondary"
          title="Refresh"
          aria-label="Refresh"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            padding: 0,
            backgroundColor: 'var(--card-white, #FFFFFF)',
            border: '1px solid var(--border-slate, #CBD5E1)',
            borderRadius: '8px',
            color: 'var(--text-heading, #334155)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="owner-card"
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1.5px solid var(--border-slate, #E2E8F0)',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 800, fontSize: '0.88rem' }}>
          <Filter size={18} />
          <span>Branch Filter:</span>
        </div>

        <div style={{ minWidth: '240px' }}>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="owner-select-field"
            style={{
              width: '100%',
            }}
          >
            <option value="">All Active Branches</option>
            {branches.filter(b => b.status === 'ACTIVE').map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city || b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div
          className="owner-search-box"
          style={{
            flex: 1,
            minWidth: '280px',
          }}
        >
          <Search size={18} color="var(--text-muted, #94A3B8)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            className="owner-search-input"
            placeholder="Search staff by name, employee code, designation or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Staff Table */}
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
                <th style={thStyle}>Staff Member</th>
                <th style={thStyle}>Contact Number</th>
                <th style={thStyle}>Assigned Branch</th>
                <th style={thStyle}>Branch Manager Info</th>
                <th style={thStyle}>Designation</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Basic Salary</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748B)' }}>
                    Loading staff records...
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((s) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={tdStyle}>
                      <div>
                        <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{s.name}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)' }}>Code: {s.staffCode}</div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-body, #334155)' }}>
                        <Phone size={13} color="var(--text-muted, #64748B)" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={15} color="#F59E0B" />
                        <strong style={{ color: 'var(--text-heading, #0F172A)' }}>{s.branchName}</strong>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: 'var(--text-body, #475569)', fontSize: '0.82rem' }}>
                        {s.managerName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Shield size={13} color="#38BDF8" />
                            <span style={{ color: 'var(--text-heading, #1E293B)', fontWeight: 600 }}>{s.managerName}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        className="owner-designation-pill"
                        style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--bg-subtle, #F1F5F9)',
                          border: '1px solid var(--border-slate, #E2E8F0)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--text-heading, #334155)',
                        }}
                      >
                        {s.designation}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          backgroundColor: s.active ? '#DCFCE7' : '#FEE2E2',
                          color: s.active ? '#15803D' : '#B91C1C',
                        }}
                      >
                        {s.active ? <UserCheck size={12} /> : <UserX size={12} />}
                        {s.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--text-heading, #0F172A)' }}>
                      ₹{s.basicSalary ? Number(s.basicSalary).toLocaleString('en-IN') : '—'}
                      {s.salaryFrequency && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>/{s.salaryFrequency}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(s)}
                        disabled={deletingId === s.id}
                        title={`Delete ${s.name}`}
                        aria-label={`Delete ${s.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          cursor: deletingId === s.id ? 'not-allowed' : 'pointer',
                          opacity: deletingId === s.id ? 0.6 : 1,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                          e.currentTarget.style.borderColor = '#FCA5A5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEF2F2';
                          e.currentTarget.style.borderColor = '#FECACA';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No staff members found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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

export default OwnerStaff;

