import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import { superAdminApi, BranchSummary, BusinessSummary, BranchSavePayload } from '../superAdminApi';
import { GitBranch, Plus, Search, RefreshCw, X, MapPin, Building2, User, Edit3, Trash2, Check } from 'lucide-react';

export const BranchManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    managerName: '',
    contactPhone: '',
    email: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
  });

  const handleOpenEditModal = (br: BranchSummary) => {
    setEditingBranch(br);
    setEditForm({
      name: br.name,
      managerName: br.managerName || '',
      contactPhone: br.contactPhone || '',
      email: br.email || '',
      address: '',
      city: br.city || 'Pune',
      state: br.state || 'Maharashtra',
    });
    setShowEditModal(true);
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    try {
      await superAdminApi.updateBranch(editingBranch.id, editForm);
      setShowEditModal(false);
      showAlert(`Branch "${editForm.name}" updated successfully!`, 'Branch Updated', 'success');
      loadData();
    } catch (err: any) {
      showAlert('Failed to update branch: ' + (err.message || 'Error'), 'Update Error', 'error');
    }
  };

  const handleDeleteBranch = async (id: number, name: string) => {
    showConfirm(
      `Are you sure you want to deactivate branch "${name}"?`,
      async () => {
        try {
          await superAdminApi.deleteBranch(id);
          showAlert(`Branch "${name}" has been deactivated.`, 'Branch Deactivated', 'info');
          loadData();
        } catch (err: any) {
          showAlert('Failed to delete branch: ' + (err.message || 'Error'), 'Delete Error', 'error');
        }
      },
      'Deactivate Branch',
      'Deactivate'
    );
  };

  const [form, setForm] = useState<BranchSavePayload>({
    businessId: 0,
    name: '',
    code: '',
    managerName: '',
    contactPhone: '',
    email: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    username: '',
    password: 'Branch@123'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [brData, bzData] = await Promise.all([
        superAdminApi.getBranches(selectedBusiness ? Number(selectedBusiness) : undefined),
        superAdminApi.getBusinesses()
      ]);
      setBranches(brData);
      setBusinesses(bzData);
      if (bzData.length > 0 && !form.businessId) {
        setForm(f => ({ ...f, businessId: bzData[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBusiness]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.businessId) return;

    setActionLoading(true);
    try {
      await superAdminApi.createBranch(form);
      setShowAddModal(false);
      setForm({
        businessId: businesses[0]?.id || 0,
        name: '',
        code: '',
        managerName: '',
        contactPhone: '',
        email: '',
        address: '',
        city: 'Pune',
        state: 'Maharashtra',
        username: '',
        password: 'Branch@123'
      });
      showAlert(`Branch "${form.name}" created successfully!`, 'Branch Created', 'success');
      loadData();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Branch creation failed.', 'Creation Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    showConfirm(
      `Are you sure you want to change branch status to ${nextStatus}?`,
      async () => {
        try {
          await superAdminApi.toggleBranchStatus(id, nextStatus);
          showAlert(`Branch status updated to ${nextStatus}`, 'Status Updated', 'info');
          loadData();
        } catch (err: any) {
          showAlert('Status change failed.', 'Update Error', 'error');
        }
      },
      'Change Branch Status',
      'Update Status'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Centralized Branch Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administer branch locations, isolated branch credentials, and branch subscriptions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <Building2 className="w-4 h-4 text-slate-400 ml-2" />
        <select
          value={selectedBusiness}
          onChange={(e) => setSelectedBusiness(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none flex-1 max-w-xs"
        >
          <option value="">All Businesses</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
          ))}
        </select>

        <button
          onClick={loadData}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center justify-center transition-colors ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Branches Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Branch Details</th>
                <th className="py-3 px-4">Parent Business</th>
                <th className="py-3 px-4">Branch Manager</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading branches...</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No branches registered.</td>
                </tr>
              ) : (
                branches.map((br) => (
                  <tr key={br.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-purple-400" />
                        <span>{br.name}</span>
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">{br.code}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-300">{br.businessName}</td>
                    <td className="py-3 px-4">
                      <p className="text-slate-200">{br.managerName || 'Manager'}</p>
                      <p className="text-[11px] text-slate-400">{br.contactPhone || br.email || 'No phone'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{br.city || 'Pune'}, {br.state || 'MH'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        br.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {br.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(br)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="Edit Branch"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(br.id, br.status)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            br.status === 'ACTIVE'
                              ? 'bg-slate-800 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
                              : 'bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                          }`}
                        >
                          {br.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(br.id, br.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="Delete Branch"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD BRANCH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-400" />
                Add New Branch
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="modal-close-btn"
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Business *</label>
                <select
                  required
                  value={form.businessId}
                  onChange={(e) => setForm({ ...form, businessId: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Pune Shivajinagar Branch"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={form.managerName}
                    onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                    placeholder="e.g. Ajay Shinde"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Pune"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Branch Admin User */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Admin Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. branch_pune"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Admin Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
                >
                  {actionLoading ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {showEditModal && editingBranch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Edit Branch: {editingBranch.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="modal-close-btn"
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Manager</label>
                  <input
                    type="text"
                    value={editForm.managerName}
                    onChange={(e) => setEditForm({ ...editForm, managerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.contactPhone}
                    onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
