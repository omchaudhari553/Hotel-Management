import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import { superAdminApi, SubscriptionPlanItem } from '../superAdminApi';
import {
  FileCheck2,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Check,
  X,
  Hotel,
  UtensilsCrossed,
  Coffee,
  Edit3,
  Trash2
} from 'lucide-react';

export const SubscriptionPlansPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState<SubscriptionPlanItem>({
    productCode: 'HOTEL',
    name: '',
    planType: 'YEARLY',
    billingIntervalMonths: 12,
    basePrice: 12000,
    gstRate: 18,
    discountAmount: 0,
    finalPrice: 14160,
    maxBranches: 1,
    maxUsers: 10,
    description: '',
    active: true
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getPlans(selectedProduct);
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [selectedProduct]);

  // Recalculate final price when base price or discount changes
  const updateBasePrice = (base: number) => {
    const gst = (base * form.gstRate) / 100;
    const finalP = Math.max(0, base + gst - form.discountAmount);
    setForm({ ...form, basePrice: base, finalPrice: Math.round(finalP) });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await superAdminApi.savePlan(form);
      setShowAddModal(false);
      setForm({
        productCode: 'HOTEL',
        name: '',
        planType: 'YEARLY',
        billingIntervalMonths: 12,
        basePrice: 12000,
        gstRate: 18,
        discountAmount: 0,
        finalPrice: 14160,
        maxBranches: 1,
        maxUsers: 10,
        description: '',
        active: true
      });
      showAlert(`Plan "${form.name}" saved successfully!`, 'Plan Saved', 'success');
      loadPlans();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Failed to save plan.', 'Save Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPlan = (p: SubscriptionPlanItem) => {
    setForm({ ...p });
    setShowAddModal(true);
  };

  const handleDeletePlan = async (id?: number, name?: string) => {
    if (!id) return;
    showConfirm(
      `Are you sure you want to deactivate plan "${name}"?`,
      async () => {
        try {
          await superAdminApi.deletePlan(id);
          showAlert(`Plan "${name}" has been deactivated.`, 'Plan Deactivated', 'info');
          loadPlans();
        } catch (err: any) {
          showAlert('Failed to delete plan: ' + (err.message || 'Error'), 'Delete Error', 'error');
        }
      },
      'Deactivate Subscription Plan',
      'Deactivate'
    );
  };

  const handleToggleActive = async (p: SubscriptionPlanItem) => {
    try {
      await superAdminApi.savePlan({ ...p, active: !p.active });
      showAlert(`Plan ${!p.active ? 'activated' : 'deactivated'} successfully.`, 'Plan Status Updated', 'info');
      loadPlans();
    } catch (err: any) {
      showAlert('Failed to toggle plan status: ' + (err.message || 'Error'), 'Update Error', 'error');
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Subscription Plans Catalog</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure Trial, Yearly, 3-Year, and Lifetime tiers for Hotel, Mess, and Cafe management software.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Product Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSelectedProduct('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedProduct === ''
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          All Products
        </button>
        <button
          onClick={() => setSelectedProduct('HOTEL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedProduct === 'HOTEL'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Hotel className="w-3.5 h-3.5" />
          <span>Hotel Plans</span>
        </button>
        <button
          onClick={() => setSelectedProduct('MESS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedProduct === 'MESS'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Mess Plans (Pre-Configured)</span>
        </button>
        <button
          onClick={() => setSelectedProduct('CAFE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedProduct === 'CAFE'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Cafe Plans (Pre-Configured)</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 py-12 text-center text-slate-400">Loading subscription plans...</div>
        ) : (
          plans.map((p) => {
            const isTrial = p.planType === 'TRIAL';
            const isLifetime = p.planType === 'LIFETIME';
            return (
              <div
                key={p.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700 uppercase">
                      {p.productCode}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isTrial ? 'bg-blue-500/10 text-blue-400' : isLifetime ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {p.planType}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px] line-clamp-2">{p.description || 'Standard platform tier'}</p>

                  <div className="my-4 pt-3 border-t border-slate-800">
                    <div className="text-2xl font-black text-white">
                      {isTrial ? 'Free' : formatPrice(p.finalPrice)}
                    </div>
                    {!isTrial && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Base: {formatPrice(p.basePrice)} + {p.gstRate}% GST
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{p.billingIntervalMonths === 0 ? 'No Recurring Expiry' : `${p.billingIntervalMonths} Months Validity`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Up to {p.maxBranches} Branch(es)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Up to {p.maxUsers} Users per Branch</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-[10px] font-semibold ${p.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.active ? 'Active Plan' : 'Inactive'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{p.code}</span>
                  </div>

                  {/* Plan Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => handleEditPlan(p)}
                      className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-colors text-[11px] font-semibold flex items-center justify-center gap-1 border border-slate-700"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(p)}
                      className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px] font-semibold border border-slate-700"
                      title="Toggle Active/Inactive"
                    >
                      {p.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.id, p.name)}
                      className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 hover:text-white transition-colors border border-slate-700"
                      title="Deactivate Plan"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE PLAN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
                Configure Subscription Plan
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

            <form onSubmit={handleSavePlan} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Product</label>
                  <select
                    value={form.productCode}
                    onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="HOTEL">Hotel Management</option>
                    <option value="MESS">Mess Management</option>
                    <option value="CAFE">Cafe Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Type</label>
                  <select
                    value={form.planType}
                    onChange={(e) => setForm({ ...form, planType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="TRIAL">Free Trial</option>
                    <option value="YEARLY">Yearly (12 Months)</option>
                    <option value="THREE_YEAR">Three-Year (36 Months)</option>
                    <option value="LIFETIME">Lifetime License</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Display Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Hotel Growth Yearly Plan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Price (INR)</label>
                  <input
                    type="number"
                    value={form.basePrice}
                    onChange={(e) => updateBasePrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Calculated Final Price (Inc. 18% GST)</label>
                  <input
                    type="number"
                    readOnly
                    value={form.finalPrice}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summary of benefits and limits included in this tier..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
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
                  {actionLoading ? 'Saving Plan...' : 'Save Plan to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
