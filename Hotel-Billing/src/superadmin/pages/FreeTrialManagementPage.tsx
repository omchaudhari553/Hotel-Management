import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import { superAdminApi, SubscriptionItem } from '../superAdminApi';
import { Clock, RefreshCw, AlertCircle, CheckCircle2, RotateCw, ArrowRight } from 'lucide-react';

export const FreeTrialManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [trials, setTrials] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrials = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getSubscriptions(undefined, 'TRIAL');
      setTrials(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrials();
  }, []);

  const handleConvertToPaid = async (subId: number) => {
    showConfirm(
      'Convert this trial into a 12-month paid subscription?',
      async () => {
        try {
          await superAdminApi.renewSubscription(subId, 12);
          showAlert('Trial converted to 12-month paid subscription successfully!', 'Converted', 'success');
          loadTrials();
        } catch (err) {
          showAlert('Conversion to paid subscription failed.', 'Error', 'error');
        }
      },
      'Convert to Paid Subscription',
      'Convert'
    );
  };

  const handleExtendTrial = async (subId: number) => {
    try {
      await superAdminApi.extendTrial(subId, 14);
      showAlert('Trial extended by +14 days successfully!', 'Trial Extended', 'success');
      loadTrials();
    } catch (err: any) {
      showAlert('Failed to extend trial: ' + (err.message || 'Error'), 'Error', 'error');
    }
  };

  const handleCancelTrial = async (subId: number) => {
    showConfirm(
      'Are you sure you want to end and cancel this trial immediately?',
      async () => {
        try {
          await superAdminApi.toggleSubscriptionStatus(subId, 'EXPIRED');
          showAlert('Trial has been canceled and marked as expired.', 'Trial Canceled', 'info');
          loadTrials();
        } catch (err: any) {
          showAlert('Failed to cancel trial: ' + (err.message || 'Error'), 'Error', 'error');
        }
      },
      'Cancel Trial',
      'Cancel Trial'
    );
  };

  const getDaysLeft = (trialEnd?: string) => {
    if (!trialEnd) return 28;
    const diffMs = new Date(trialEnd).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Free Trial Management (28-Day Engine)</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor countdown clocks, track trial conversion rates, and convert trials into paid plans.
          </p>
        </div>

        <button
          onClick={loadTrials}
          className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto border border-slate-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Started On</th>
                <th className="py-3 px-4">Days Remaining</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading trial records...</td>
                </tr>
              ) : trials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No businesses currently on trial.</td>
                </tr>
              ) : (
                trials.map((t) => {
                  const days = getDaysLeft(t.trialEndAt || t.endDate);
                  const isUrgent = days <= 5;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{t.businessName}</td>
                      <td className="py-3 px-4 text-indigo-400 font-semibold">{t.productName}</td>
                      <td className="py-3 px-4 text-slate-300">{t.branchName || 'Main Branch'}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {t.startDate ? new Date(t.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          isUrgent ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{days} Day(s) Left</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleExtendTrial(t.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700"
                            title="Extend Trial by 14 Days"
                          >
                            <span>+14 Days</span>
                          </button>
                          <button
                            onClick={() => handleConvertToPaid(t.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 shadow-md shadow-emerald-600/20"
                          >
                            <span>Convert to Paid</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCancelTrial(t.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700"
                            title="Cancel / Expire Trial"
                          >
                            <span>End</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
