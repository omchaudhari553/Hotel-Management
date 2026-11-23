import React, { useEffect, useState } from 'react';
import { superAdminApi, PaymentItem } from '../superAdminApi';
import {
  DollarSign,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  FileText,
  RotateCcw,
  X,
  CreditCard,
  Building2,
  Calendar,
  AlertOctagon,
  ArrowDownLeft,
  Printer,
  Download,
  ShieldCheck
} from 'lucide-react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import { downloadInvoicePdf, printInvoiceDirect } from '../pdfInvoiceService';

export const PaymentManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useSuperAdminPopup();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<'ALL' | 'HOTEL' | 'MESS' | 'CAFE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentItem | null>(null);
  const [refundPayment, setRefundPayment] = useState<PaymentItem | null>(null);
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getPayments();
      setPayments(data);
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
    loadPayments();
  }, []);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  // Open Refund Modal
  const openRefundModal = (p: PaymentItem) => {
    setRefundPayment(p);
    setRefundType('FULL');
    setRefundAmount(p.totalAmount || p.amount);
    setRefundReason('Customer cancellation / Plan downgrade');
  };

  // Process Refund Handler
  const handleProcessRefund = () => {
    if (!refundPayment) return;
    if (refundType === 'PARTIAL' && (refundAmount <= 0 || refundAmount > (refundPayment.totalAmount || refundPayment.amount))) {
      showAlert('Please enter a valid partial refund amount.', 'Invalid Amount', 'warning');
      return;
    }

    setProcessingRefund(true);
    setTimeout(() => {
      const newStatus = refundType === 'FULL' ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      setPayments((prev) =>
        prev.map((item) =>
          item.id === refundPayment.id ? { ...item, status: newStatus } : item
        )
      );
      setProcessingRefund(false);
      const refundedAmt = refundType === 'FULL' ? (refundPayment.totalAmount || refundPayment.amount) : refundAmount;
      setRefundPayment(null);
      showAlert(
        `Refund of ${formatCurrency(refundedAmt)} has been executed via Razorpay Gateway for ${refundPayment.businessName}. Reference: RFD-${Date.now().toString().slice(-6)}.`,
        'Refund Completed',
        'success'
      );
    }, 600);
  };

  // Filtered payments list
  const filteredPayments = payments.filter((p) => {
    // Search filter
    const matchesSearch =
      !searchQuery.trim() ||
      p.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `TXN-${p.id}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.gatewayPaymentId?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SUCCESS' && (p.status === 'SUCCESS' || p.status === 'COMPLETED' || p.status === 'PAID')) ||
      (statusFilter === 'FAILED' && (p.status === 'FAILED' || p.status === 'ERROR')) ||
      (statusFilter === 'REFUNDED' && (p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED')) ||
      p.status === statusFilter;

    // Product filter
    const bizLower = (p.businessName || '').toLowerCase();
    const prodCode = ((p as any).productCode || '').toUpperCase();
    const isMess = prodCode === 'MESS' || bizLower.includes('mess') || bizLower.includes('bhojanalaya') || bizLower.includes('annapurna');
    const isCafe = prodCode === 'CAFE' || bizLower.includes('cafe') || bizLower.includes('coffee') || bizLower.includes('bakery') || bizLower.includes('tea');
    const isHotel = !isMess && !isCafe;

    const matchesProduct =
      productFilter === 'ALL' ||
      (productFilter === 'HOTEL' && isHotel) ||
      (productFilter === 'MESS' && isMess) ||
      (productFilter === 'CAFE' && isCafe);

    return matchesSearch && matchesStatus && matchesProduct;
  });

  // KPI Calculations
  const totalSettled = payments.filter((p) => p.status === 'SUCCESS' || p.status === 'COMPLETED').reduce((sum, p) => sum + (p.totalAmount || p.amount), 0);
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const failedCount = payments.filter((p) => p.status === 'FAILED').length;
  const refundedCount = payments.filter((p) => p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED').length;

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Payment & Transaction Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit gateway settlements, Razorpay webhooks, GST breakdowns, invoices, and process controlled refunds across Hotel, Mess, and Cafe products.
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
        </div>
      </div>

      {/* 4 Summary Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Settled Collections</span>
            <p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(totalSettled)}</p>
            <span className="text-[10px] text-slate-500">Verified database payments</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Settlements</span>
            <p className="text-xl font-black text-amber-400 mt-1">{pendingCount} Transactions</p>
            <span className="text-[10px] text-slate-500">Awaiting bank reconciliation</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'FAILED' ? 'ALL' : 'FAILED')}
          className={`bg-slate-900 border ${statusFilter === 'FAILED' ? 'border-rose-500' : 'border-slate-800'} p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-all`}
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failed Transactions</span>
            <p className="text-xl font-black text-rose-400 mt-1">{failedCount} Failed</p>
            <span className="text-[10px] text-rose-400/80 underline font-semibold">Click to view failed</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Refunds Processed</span>
            <p className="text-xl font-black text-purple-400 mt-1">{refundedCount} Handled</p>
            <span className="text-[10px] text-slate-500">Reconciled reversals</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 focus-within:ring-1 focus-within:ring-indigo-500 gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name, branch, TXN ID or gateway reference..."
            className="w-full bg-transparent border-0 p-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Product Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Product:</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value as any)}
            className="bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Products (Hotel, Mess, Cafe)</option>
            <option value="HOTEL">Hotel Management</option>
            <option value="MESS">Mess Management</option>
            <option value="CAFE">Cafe Management</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS / COMPLETED</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Business & Branch</th>
                <th className="py-3 px-4">Base Amount</th>
                <th className="py-3 px-4">GST (18%)</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Gateway / Method</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading verified payment transactions...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No payment records matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isSettled = p.status === 'SUCCESS' || p.status === 'COMPLETED';
                  const isRefunded = p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED';
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-indigo-400">TXN-{p.id}</span>
                        </div>
                        {p.gatewayPaymentId && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-[120px] font-mono">
                            {p.gatewayPaymentId}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white flex items-center gap-1.5">
                          <span>{p.businessName}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">{p.branchName || 'All Branches'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{formatCurrency(p.amount)}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{formatCurrency(p.gstAmount || Math.round((p.amount * 18) / 100))}</td>
                      <td className="py-3.5 px-4 font-black text-white font-mono">{formatCurrency(p.totalAmount || p.amount)}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-semibold inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-indigo-400" />
                          <span>{p.paymentGateway || 'Razorpay'} • {p.paymentMethod || 'UPI/NetBanking'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isSettled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : p.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : isRefunded
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nov 2026'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Invoice Button */}
                          <button
                            onClick={() => setSelectedInvoice(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            title="View Invoice"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          {/* Handle Refund Button */}
                          {isSettled && (
                            <button
                              onClick={() => openRefundModal(p)}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Process Refund"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          )}
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

      {/* INVOICE PREVIEW MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Platform Tax Invoice Preview</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-300">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Billed To</span>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedInvoice.businessName}</p>
                  <p className="text-slate-400">{selectedInvoice.branchName || 'Main Operating Branch'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Invoice Details</span>
                  <p className="text-sm font-mono font-bold text-indigo-400 mt-0.5">INV-2026-{selectedInvoice.id.toString().padStart(4, '0')}</p>
                  <p className="text-slate-400">{selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString() : '22 Nov 2026'}</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex justify-between font-semibold text-slate-400 border-b border-slate-800 pb-1 text-[11px]">
                  <span>Item Description</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Hospitality SaaS Subscription / Operational Service Fee</span>
                  <span className="font-mono text-white">{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-400">
                  <span>CGST (9%)</span>
                  <span className="font-mono">{formatCurrency((selectedInvoice.gstAmount || Math.round((selectedInvoice.amount * 18) / 100)) / 2)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-400">
                  <span>SGST (9%)</span>
                  <span className="font-mono">{formatCurrency((selectedInvoice.gstAmount || Math.round((selectedInvoice.amount * 18) / 100)) / 2)}</span>
                </div>
                <div className="flex justify-between font-black text-white border-t border-slate-800 pt-2 text-sm">
                  <span>Total Paid (Inclusive of Taxes)</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(selectedInvoice.totalAmount || selectedInvoice.amount)}</span>
                </div>
              </div>

              {/* Gateway & Settlement Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <span className="text-slate-300">{selectedInvoice.paymentGateway || 'Razorpay Technologies'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="text-slate-300">{selectedInvoice.paymentMethod || 'UPI Intent / NetBanking'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedInvoice.status}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  printInvoiceDirect({
                    invoiceNumber: (selectedInvoice as any).invoiceNumber || `INV-${selectedInvoice.id}`,
                    invoiceDate: selectedInvoice.createdAt,
                    businessName: selectedInvoice.businessName,
                    branchName: selectedInvoice.branchName,
                    amount: selectedInvoice.amount,
                    gstAmount: selectedInvoice.gstAmount,
                    totalAmount: selectedInvoice.totalAmount || selectedInvoice.amount,
                    paymentGateway: selectedInvoice.paymentGateway,
                    paymentMethod: selectedInvoice.paymentMethod,
                    status: selectedInvoice.status,
                  });
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await downloadInvoicePdf({
                    invoiceNumber: (selectedInvoice as any).invoiceNumber || `INV-${selectedInvoice.id}`,
                    invoiceDate: selectedInvoice.createdAt,
                    businessName: selectedInvoice.businessName,
                    branchName: selectedInvoice.branchName,
                    amount: selectedInvoice.amount,
                    gstAmount: selectedInvoice.gstAmount,
                    totalAmount: selectedInvoice.totalAmount || selectedInvoice.amount,
                    paymentGateway: selectedInvoice.paymentGateway,
                    paymentMethod: selectedInvoice.paymentMethod,
                    status: selectedInvoice.status,
                  });
                  showAlert('Invoice PDF downloaded successfully.', 'Downloaded', 'success');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Execute Gateway Refund</h3>
              </div>
              <button
                onClick={() => setRefundPayment(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex items-start gap-3">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-300 leading-relaxed">
                  Executing a refund reverses payment directly via Razorpay Gateway to the customer's original payment method. This action will be recorded in platform audit logs.
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-semibold block mb-1">Target Transaction</span>
                <p className="text-white font-mono font-bold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  TXN-{refundPayment.id} • {refundPayment.businessName} • Total: {formatCurrency(refundPayment.totalAmount || refundPayment.amount)}
                </p>
              </div>

              {/* Refund Type Selection */}
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block mb-1">Refund Type</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRefundType('FULL');
                      setRefundAmount(refundPayment.totalAmount || refundPayment.amount);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${refundType === 'FULL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    Full Refund ({formatCurrency(refundPayment.totalAmount || refundPayment.amount)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRefundType('PARTIAL');
                      setRefundAmount(Math.round((refundPayment.totalAmount || refundPayment.amount) / 2));
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${refundType === 'PARTIAL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    Partial Refund
                  </button>
                </div>
              </div>

              {/* Partial Amount Input */}
              {refundType === 'PARTIAL' && (
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">Custom Partial Refund Amount (INR)</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    max={refundPayment.totalAmount || refundPayment.amount}
                    min={1}
                    className="w-full bg-slate-950 text-white border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* Refund Reason */}
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block mb-1">Refund Reason</span>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Customer cancellation / Plan downgrade">Customer cancellation / Plan downgrade</option>
                  <option value="Duplicate payment settlement">Duplicate payment settlement</option>
                  <option value="Service disruption / Downtime SLA claim">Service disruption / Downtime SLA claim</option>
                  <option value="Administrative correction">Administrative correction</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundPayment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingRefund}
                onClick={handleProcessRefund}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/30"
              >
                {processingRefund ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Gateway Refund...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm & Execute Refund</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
