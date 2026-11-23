import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import {
  superAdminApi,
  SubscriptionItem,
  BusinessSummary,
  BranchSummary,
  ProductItem,
  SubscriptionPlanItem,
  SubscriptionSavePayload
} from '../superAdminApi';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Hotel,
  UtensilsCrossed,
  Coffee
} from 'lucide-react';

export const SubscriptionManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState<SubscriptionSavePayload>({
    businessId: 0,
    branchId: undefined,
    productId: 1,
    planId: 1,
    durationMonths: 12,
    isLifetime: false,
    notes: 'Super Admin assigned'
  });

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getSubscriptions(selectedProduct, selectedStatus);
      setSubscriptions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [selectedProduct, selectedStatus]);

  const openAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const [bizData, prodData, planData] = await Promise.all([
        superAdminApi.getBusinesses(),
        superAdminApi.getProducts(),
        superAdminApi.getPlans()
      ]);
      setBusinesses(bizData);
      setProducts(prodData);
      setPlans(planData);
      if (bizData.length > 0) {
        setForm(f => ({ ...f, businessId: bizData[0].id }));
        loadBranches(bizData[0].id);
      }
      if (prodData.length > 0) {
        setForm(f => ({ ...f, productId: prodData[0].id }));
      }
      if (planData.length > 0) {
        setForm(f => ({ ...f, planId: planData[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBranches = async (bizId: number) => {
    try {
      const data = await superAdminApi.getBranches(bizId);
      setBranches(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessId || !form.productId || !form.planId) return;

    setActionLoading(true);
    try {
      await superAdminApi.assignSubscription(form);
      showAlert('Subscription assigned successfully!', 'Subscription Created', 'success');
      setShowAssignModal(false);
      loadSubscriptions();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Assignment failed', 'Assignment Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async (id: number) => {
    showConfirm(
      'Renew this subscription for an additional 12 months?',
      async () => {
        try {
          await superAdminApi.renewSubscription(id, 12);
          showAlert('Subscription renewed for 12 months successfully!', 'Subscription Renewed', 'success');
          loadSubscriptions();
        } catch (err: any) {
          showAlert('Renewal failed: ' + (err.message || 'Error'), 'Renewal Error', 'error');
        }
      },
      'Renew Subscription',
      'Renew +12m'
    );
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    showConfirm(
      `Are you sure you want to change subscription status to ${nextStatus}?`,
      async () => {
        try {
          await superAdminApi.toggleSubscriptionStatus(id, nextStatus);
          showAlert(`Subscription status updated to ${nextStatus}`, 'Status Changed', 'info');
          loadSubscriptions();
        } catch (err: any) {
          showAlert('Status change failed: ' + (err.message || 'Error'), 'Status Error', 'error');
        }
      },
      'Change Subscription Status',
      'Change Status'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Subscription Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor, assign, renew, and enforce branch-wise subscriptions across Hotel, Mess, and Cafe.
          </p>
        </div>

        <button
          onClick={openAssignModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Subscription</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs">
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
        >
          <option value="">All Products</option>
          <option value="HOTEL">Hotel Management</option>
          <option value="MESS">Mess Management</option>
          <option value="CAFE">Cafe Management</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active (Paid)</option>
          <option value="TRIAL">Trial (28 Days)</option>
          <option value="EXPIRED">Expired</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <button
          onClick={loadSubscriptions}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-1.5 transition-colors ml-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Business & Branch</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Plan Name & Type</th>
                <th className="py-3 px-4">Validity / Expiry</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading subscriptions...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No subscription records match filters.</td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{s.businessName}</p>
                      <p className="text-[11px] text-slate-400">Branch: {s.branchName || 'All Branches'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-400">{s.productName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-200">{s.planName}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{s.planType}</span>
                    </td>
                    <td className="py-3 px-4">
                      {s.isLifetime ? (
                        <span className="text-purple-400 font-bold">Permanent Lifetime</span>
                      ) : (
                        <span className="text-slate-300">
                          {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : s.status === 'TRIAL'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleRenew(s.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors text-[11px] font-semibold"
                        title="Renew Subscription (+12 Months)"
                      >
                        <RotateCw className="w-3.5 h-3.5 inline mr-1" />
                        Renew
                      </button>
                      <button
                        onClick={() => handleToggleStatus(s.id, s.status)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors text-[11px] font-semibold"
                        title="Toggle Status (Active / Suspend)"
                      >
                        {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN SUBSCRIPTION MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                Assign Product Subscription
              </h2>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="modal-close-btn"
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Business *</label>
                <select
                  required
                  value={form.businessId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setForm({ ...form, businessId: id });
                    loadBranches(id);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Branch (Optional - Blank for All)</label>
                <select
                  value={form.branchId || ''}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">All Branches</option>
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>{br.name} ({br.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product *</label>
                  <select
                    required
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Tier *</label>
                  <select
                    required
                    value={form.planId}
                    onChange={(e) => setForm({ ...form, planId: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name} - ₹{pl.finalPrice}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
                >
                  {actionLoading ? 'Assigning...' : 'Assign & Activate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
