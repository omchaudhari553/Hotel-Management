import React, { useEffect, useState } from 'react';
import { superAdminApi, InvoiceItem } from '../superAdminApi';
import { FileText, Download, Printer, RefreshCw, X } from 'lucide-react';
import { downloadInvoicePdf, printInvoiceDirect } from '../pdfInvoiceService';

export const InvoiceManagementPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Platform Invoices (GST Compliant)</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated subscription tax invoices with CGST (9%), SGST (9%), and IGST (18%) compliance.
          </p>
        </div>

        <button
          onClick={loadInvoices}
          className="p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto"
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
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Taxable Value</th>
                <th className="py-3 px-4">CGST + SGST</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No invoices generated yet.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-400 font-mono">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-semibold text-white">{inv.businessName}</td>
                    <td className="py-3 px-4 text-slate-300">{inv.branchName || 'All'}</td>
                    <td className="py-3 px-4 text-slate-300">{formatCurrency(inv.baseAmount)}</td>
                    <td className="py-3 px-4 text-slate-400">{formatCurrency(inv.cgstAmount + inv.sgstAmount)}</td>
                    <td className="py-3 px-4 font-black text-white">{formatCurrency(inv.totalAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVOICE VIEW MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">GST Subscription Tax Invoice</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="modal-close-btn"
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 text-xs" id="invoice-printable">
              <div className="flex justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm">Ajalkar Infotech SaaS</h3>
                  <p className="text-slate-400">Hospitality Tech Platform</p>
                  <p className="text-slate-400">GSTIN: 27AABCA1234F1Z5</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-indigo-400 font-bold text-sm">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-slate-400">Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Billed To Customer</p>
                <p className="font-bold text-white text-sm">{selectedInvoice.businessName}</p>
                <p className="text-slate-400">Branch: {selectedInvoice.branchName || 'Central Primary Branch'}</p>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">GST (18%)</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 text-slate-200">Software Subscription License Fee</td>
                      <td className="p-2.5 text-right text-slate-300">{formatCurrency(selectedInvoice.baseAmount)}</td>
                      <td className="p-2.5 text-right text-slate-400">{formatCurrency(selectedInvoice.cgstAmount + selectedInvoice.sgstAmount)}</td>
                      <td className="p-2.5 text-right font-bold text-white">{formatCurrency(selectedInvoice.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  printInvoiceDirect({
                    invoiceNumber: selectedInvoice.invoiceNumber,
                    invoiceDate: selectedInvoice.invoiceDate,
                    businessName: selectedInvoice.businessName,
                    branchName: selectedInvoice.branchName,
                    baseAmount: selectedInvoice.baseAmount,
                    cgstAmount: selectedInvoice.cgstAmount,
                    sgstAmount: selectedInvoice.sgstAmount,
                    totalAmount: selectedInvoice.totalAmount,
                    status: selectedInvoice.status,
                  });
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await downloadInvoicePdf({
                    invoiceNumber: selectedInvoice.invoiceNumber,
                    invoiceDate: selectedInvoice.invoiceDate,
                    businessName: selectedInvoice.businessName,
                    branchName: selectedInvoice.branchName,
                    baseAmount: selectedInvoice.baseAmount,
                    cgstAmount: selectedInvoice.cgstAmount,
                    sgstAmount: selectedInvoice.sgstAmount,
                    totalAmount: selectedInvoice.totalAmount,
                    status: selectedInvoice.status,
                  });
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
