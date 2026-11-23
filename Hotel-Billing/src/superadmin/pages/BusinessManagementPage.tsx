import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import {
  superAdminApi,
  BusinessSummary,
  BusinessDetail,
  BusinessSavePayload
} from '../superAdminApi';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  Hotel,
  UtensilsCrossed,
  Coffee,
  Check,
  MapPin,
  Calendar,
  Edit3,
  Trash2
} from 'lucide-react';

export const BusinessManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessSummary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<BusinessDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    gstin: '',
  });

  const handleOpenEditModal = (b: BusinessSummary) => {
    setEditingBusiness(b);
    setEditForm({
      name: b.name,
      ownerName: b.ownerName || '',
      email: b.email || '',
      phone: b.phone || '',
      city: b.city || '',
      state: b.state || '',
      gstin: '',
    });
    setShowEditModal(true);
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    try {
      await superAdminApi.updateBusiness(editingBusiness.id, editForm);
      setShowEditModal(false);
      showAlert(`Business "${editForm.name}" updated successfully!`, 'Business Updated', 'success');
      loadBusinesses();
    } catch (err: any) {
      showAlert('Failed to update business: ' + (err.message || 'Error'), 'Update Error', 'error');
    }
  };

  const handleDeleteBusiness = async (id: number, name: string) => {
    showConfirm(
      `Are you sure you want to deactivate and archive business "${name}"?`,
      async () => {
        try {
          await superAdminApi.deleteBusiness(id);
          showAlert(`Business "${name}" has been deactivated.`, 'Business Deactivated', 'info');
          loadBusinesses();
        } catch (err: any) {
          showAlert('Failed to delete business: ' + (err.message || 'Error'), 'Delete Error', 'error');
        }
      },
      'Deactivate Business',
      'Deactivate'
    );
  };

  // Form state
  const [form, setForm] = useState<BusinessSavePayload>({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411001',
    gstin: '',
    businessType: 'HOTEL',
    products: ['HOTEL'],
    username: '',
    password: 'Owner@123'
  });

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getBusinesses(search, selectedStatus);
      setBusinesses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [search, selectedStatus]);

  const handleProductToggle = (prod: string) => {
    const cur = form.products || [];
    if (cur.includes(prod)) {
      if (cur.length === 1) return; // Keep at least one
      setForm({ ...form, products: cur.filter(p => p !== prod) });
    } else {
      setForm({ ...form, products: [...cur, prod] });
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    setActionLoading(true);
    try {
      await superAdminApi.createBusiness(form);
      setShowAddModal(false);
      // Reset form
      setForm({
        name: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        city: 'Pune',
        state: 'Maharashtra',
        pinCode: '411001',
        gstin: '',
        businessType: 'HOTEL',
        products: ['HOTEL'],
        username: '',
        password: 'Owner@123'
      });
      showAlert(`Business "${form.name}" registered successfully!`, 'Business Created', 'success');
      loadBusinesses();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Failed to create business.', 'Creation Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    showConfirm(
      `Are you sure you want to change status to ${newStatus}?`,
      async () => {
        try {
          await superAdminApi.toggleBusinessStatus(id, newStatus);
          showAlert(`Status updated to ${newStatus}`, 'Status Changed', 'info');
          loadBusinesses();
          if (selectedDetail && selectedDetail.id === id) {
            const updated = await superAdminApi.getBusinessById(id);
            setSelectedDetail(updated);
          }
        } catch (err: any) {
          showAlert(err.response?.data?.message || 'Status update failed.', 'Update Error', 'error');
        }
      },
      'Change Business Status',
      'Update Status'
    );
  };

  const handleViewDetails = async (id: number) => {
    try {
      const detail = await superAdminApi.getBusinessById(id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Business Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Register and administer businesses, product packages (Hotel, Mess, Cafe), and branches.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Business</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 focus-within:ring-1 focus-within:ring-indigo-500 gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, owner, email, city..."
            className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>

          <button
            onClick={loadBusinesses}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center justify-center transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Owner & Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Subscribed Products</th>
                <th className="py-3 px-4">Branches</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading businesses from database...</td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">No businesses match the search query.</td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span>{b.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{b.code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-200 font-medium">{b.ownerName || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400">{b.email || b.phone || 'No email'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.city || 'Pune'}, {b.state || 'MH'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {b.products.map((p) => {
                          const isHotel = p.includes('HOTEL');
                          const isMess = p.includes('MESS');
                          const isCafe = p.includes('CAFE');
                          return (
                            <span
                              key={p}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                                isHotel
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isMess
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : isCafe
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {isHotel && <Hotel className="w-3 h-3" />}
                              {isMess && <UtensilsCrossed className="w-3 h-3" />}
                              {isCafe && <Coffee className="w-3 h-3" />}
                              <span>{p}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-300">{b.branchCount} Branch(es)</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(b.id, b.status)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        {b.status}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(b.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="View Business Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="Edit Business Information"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBusiness(b.id, b.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="Deactivate / Archive Business"
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

      {/* REGISTER NEW BUSINESS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Register New Multi-Product Business
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

            <form onSubmit={handleCreateBusiness} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Royal Heritage Hospitality"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    placeholder="e.g. Rahul Patil"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. owner@royalheritage.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
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

              {/* Product Multi-Select */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Product Entitlements (Can choose multiple)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Hotel */}
                  <div
                    onClick={() => handleProductToggle('HOTEL')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      form.products?.includes('HOTEL')
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold leading-tight">Hotel</p>
                        <p className="text-[10px] text-slate-500">Rooms & POS</p>
                      </div>
                    </div>
                    {form.products?.includes('HOTEL') && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>

                  {/* Mess */}
                  <div
                    onClick={() => handleProductToggle('MESS')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      form.products?.includes('MESS')
                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold leading-tight">Mess</p>
                        <p className="text-[10px] text-amber-400/80">Ready for Import</p>
                      </div>
                    </div>
                    {form.products?.includes('MESS') && <Check className="w-4 h-4 text-amber-400" />}
                  </div>

                  {/* Cafe */}
                  <div
                    onClick={() => handleProductToggle('CAFE')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      form.products?.includes('CAFE')
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-xs font-bold leading-tight">Cafe</p>
                        <p className="text-[10px] text-cyan-400/80">Ready for Import</p>
                      </div>
                    </div>
                    {form.products?.includes('CAFE') && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                </div>
              </div>

              {/* Owner Initial Credentials */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Login Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Leave empty for auto-generated"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-60"
                >
                  {actionLoading ? 'Creating in Database...' : 'Register Business & Provision Trials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BUSINESS DETAILS MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  {selectedDetail.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {selectedDetail.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="modal-close-btn"
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4">
              {/* Profile details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block">Owner</span>
                  <span className="text-white font-semibold">{selectedDetail.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact</span>
                  <span className="text-white font-semibold">{selectedDetail.email || selectedDetail.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location</span>
                  <span className="text-white font-semibold">{selectedDetail.city}, {selectedDetail.state}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                    selectedDetail.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedDetail.status}
                  </span>
                </div>
              </div>

              {/* Branches */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Branches ({selectedDetail.branches.length})</h3>
                <div className="space-y-2">
                  {selectedDetail.branches.map(br => (
                    <div key={br.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{br.name} ({br.code})</p>
                        <p className="text-slate-400 text-[11px]">Manager: {br.managerName} • Phone: {br.contactPhone}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        br.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {br.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscriptions */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Active Subscriptions ({selectedDetail.subscriptions.length})</h3>
                <div className="space-y-2">
                  {selectedDetail.subscriptions.map(s => (
                    <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          <span className="text-indigo-400">{s.productName}</span>
                          <span className="text-slate-500">•</span>
                          <span>{s.planName}</span>
                        </p>
                        <p className="text-slate-400 text-[11px]">Branch: {s.branchName || 'All'} • Expiry: {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'Permanent Lifetime'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : s.status === 'TRIAL' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS MODAL */}
      {showEditModal && editingBusiness && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Edit Business: {editingBusiness.name}
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

            <form onSubmit={handleUpdateBusiness} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

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

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Business</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
