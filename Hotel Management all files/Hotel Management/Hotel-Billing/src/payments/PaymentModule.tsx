import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { Payment } from '../types';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { CreditCard, Plus, ArrowUpRight, DollarSign } from 'lucide-react';

export const PaymentModule: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    businessId: 1,
    customerName: '',
    amount: 1000,
    paymentMethod: 'UPI',
    transactionRef: '',
    status: 'SUCCESS',
    notes: 'Direct settlement',
  });

  const { showToast } = useToast();

  const loadPayments = async () => {
    try {
      const data = await paymentService.getPayments(1);
      setPayments(data);
    } catch {
      showToast('error', 'Failed to load payments ledger');
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.customerName || newPayment.amount <= 0) {
      showToast('error', 'Valid customer name and amount required');
      return;
    }
    try {
      await paymentService.recordPayment(newPayment);
      showToast('success', 'Payment recorded successfully');
      setIsModalOpen(false);
      setNewPayment({
        businessId: 1,
        customerName: '',
        amount: 1000,
        paymentMethod: 'UPI',
        transactionRef: '',
        status: 'SUCCESS',
        notes: 'Direct settlement',
      });
      loadPayments();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to record payment');
    }
  };

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const columns = [
    {
      header: 'Txn Ref / ID',
      render: (row: Payment) => (
        <div>
          <span style={{ fontWeight: 700 }}>#PAY-{row.id}</span>
          {row.transactionRef && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{row.transactionRef}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Customer / Payer',
      accessor: 'customerName' as keyof Payment,
    },
    {
      header: 'Payment Method',
      render: (row: Payment) => (
        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
          {row.paymentMethod}
        </span>
      ),
    },
    {
      header: 'Amount Collected',
      render: (row: Payment) => (
        <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.95rem' }}>
          ₹{row.amount?.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Date',
      render: (row: Payment) => <span style={{ fontSize: '0.82rem' }}>{row.paymentDate?.split('T')[0]}</span>,
    },
    {
      header: 'Status',
      render: (row: Payment) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Central Payment & Treasury Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Unified receipt audit across Hotel stays, Mess lunchboxes, and Cafe point-of-sale
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Record Offline / Manual Payment</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Cash & Digital Receipts</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            ₹{totalCollected.toLocaleString()}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transactions</span>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{payments.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={payments}
          searchKey="customerName"
          searchPlaceholder="Search customer or txn ref..."
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Payment Receipt">
        <form onSubmit={handleRecordPayment}>
          <div className="form-group">
            <label className="form-label">Customer / Payer Name *</label>
            <input
              type="text"
              required
              className="input"
              value={newPayment.customerName}
              onChange={(e) => setNewPayment({ ...newPayment, customerName: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                required
                className="input"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="select"
                value={newPayment.paymentMethod}
                onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
              >
                <option value="UPI">UPI / GooglePay / PhonePe</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Transaction ID / Bank Reference</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. UPI-123456789012"
              value={newPayment.transactionRef}
              onChange={(e) => setNewPayment({ ...newPayment, transactionRef: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
