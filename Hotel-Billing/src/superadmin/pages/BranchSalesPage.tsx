import React, { useEffect, useState } from 'react';
import { superAdminApi, BranchSummary } from '../superAdminApi';
import { TrendingUp, GitBranch, RefreshCw, DollarSign } from 'lucide-react';

export const BranchSalesPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getBranches();
      setBranches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Branch-wise Sales Performance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidated operational sales and invoice metrics across physical business branches.
          </p>
        </div>

        <button
          onClick={loadBranches}
          disabled={loading}
          className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          title="Refresh Branch Metrics"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Parent Business</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Manager</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Invoices / Orders</th>
                <th className="py-3 px-4 text-right">Total Real Sales</th>
                <th className="py-3 px-4 text-right">Data Isolation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading branch metrics...</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No branches recorded.</td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{b.businessName}</td>
                    <td className="py-3 px-4 text-slate-400">{b.city || 'Pune'}</td>
                    <td className="py-3 px-4 text-slate-300">{b.managerName || 'Manager'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {b.totalInvoices ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-indigo-400">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.totalSales || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-mono">
                        branch_id = {b.id}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
