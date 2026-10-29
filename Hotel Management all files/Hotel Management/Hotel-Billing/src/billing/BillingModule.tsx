import React, { useState, useEffect } from 'react';
import { billingService } from '../services/billingService';
import { customerService } from '../services/customerService';
import { Invoice, Customer } from '../types';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { FileText, Plus, Printer, Search, Download } from 'lucide-react';

export const BillingModule: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterIndustry, setFilterIndustry] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const [invoiceForm, setInvoiceForm] = useState({
    businessId: 1,
    industryCode: 'HOTEL',
    customerId: 0,
    customerName: '',
    paymentMode: 'CASH',
    notes: '',
    items: [{ description: 'Room Stay / Food Services', quantity: 1, unitPrice: 2500, taxRate: 12 }],
  });

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [invData, custData] = await Promise.all([
        billingService.getInvoices(1, filterIndustry === 'ALL' ? undefined : filterIndustry),
        customerService.getCustomers(1),
      ]);
      setInvoices(invData);
      setCustomers(custData);
    } catch {
      showToast('error', 'Failed to load billing invoices');
    }
  };

  useEffect(() => {
    loadData();
  }, [filterIndustry]);

  const handleAddItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, taxRate: 5 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setInvoiceForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerName) {
      showToast('error', 'Customer name is required');
      return;
    }
    try {
      await billingService.createInvoice(invoiceForm);
      showToast('success', 'Invoice generated successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      render: (row: Invoice) => <span style={{ fontWeight: 700 }}>{row.invoiceNumber}</span>,
    },
    {
      header: 'Industry Source',
      render: (row: Invoice) => (
        <span
          className={`badge ${
            row.industryCode === 'HOTEL'
              ? 'badge-hotel'
              : row.industryCode === 'MESS'
              ? 'badge-mess'
              : 'badge-cafe'
          }`}
        >
          {row.industryCode || 'GENERAL'}
        </span>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customerName' as keyof Invoice,
    },
    {
      header: 'Date',
      render: (row: Invoice) => <span style={{ fontSize: '0.82rem' }}>{row.createdAt?.split('T')[0]}</span>,
    },
    {
      header: 'Grand Total',
      render: (row: Invoice) => (
        <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
          ₹{row.grandTotal?.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row: Invoice) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Action',
      render: (row: Invoice) => (
        <button
          onClick={() => {
            setSelectedInvoice(row);
            setIsPrintModalOpen(true);
          }}
          className="btn btn-sm btn-outline"
        >
          <Printer size={13} />
          <span>View / Print</span>
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Centralized Invoicing & Billing</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Unified multi-industry tax invoices, receipts, and payment settlements
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Generate New Invoice</span>
        </button>
      </div>

      {/* Industry Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['ALL', 'HOTEL', 'MESS', 'CAFE'].map((ind) => (
          <button
            key={ind}
            onClick={() => setFilterIndustry(ind)}
            className="btn btn-sm"
            style={{
              background: filterIndustry === ind ? 'var(--royal-blue)' : '#FFFFFF',
              color: filterIndustry === ind ? '#FFFFFF' : 'var(--text-body)',
              borderColor: filterIndustry === ind ? 'var(--royal-blue)' : 'var(--border-slate)',
              fontWeight: 700,
            }}
          >
            {ind} Invoices
          </button>
        ))}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={invoices}
          searchKey="customerName"
          searchPlaceholder="Search customer name or invoice #..."
        />
      </div>

      {/* Create Invoice Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Tax Invoice" maxWidth="680px">
        <form onSubmit={handleCreateInvoice}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Industry Source</label>
              <select
                className="select"
                value={invoiceForm.industryCode}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, industryCode: e.target.value })}
              >
                <option value="HOTEL">Hotel Management</option>
                <option value="MESS">Mess & Tiffin Services</option>
                <option value="CAFE">Cafe & Restaurant</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select
                className="select"
                value={invoiceForm.paymentMode}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Ramesh Patil / Walk-in Guest"
              value={invoiceForm.customerName}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
            />
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="form-label">Invoice Items</span>
              <button type="button" onClick={handleAddItem} className="btn btn-sm btn-outline">
                + Add Line
              </button>
            </div>

            {invoiceForm.items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Item description"
                  className="input"
                  value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  className="input"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="input"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="GST %"
                  className="input"
                  value={item.taxRate}
                  onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Generate & Record Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Preview Modal */}
      <Modal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title="Tax Invoice Receipt" maxWidth="600px">
        {selectedInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Ajalkar POS Billing Group</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>GSTIN: 27AAACA9999P1Z1 • Pune, Maharashtra</p>
              <div style={{ marginTop: '8px', fontSize: '0.9rem', fontWeight: 700 }}>
                INVOICE #{selectedInvoice.invoiceNumber}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Billed To:</span>
                <div style={{ fontWeight: 700 }}>{selectedInvoice.customerName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <div style={{ fontWeight: 700 }}>{selectedInvoice.createdAt?.split('T')[0]}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedInvoice.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{item.quantity}x {item.description}</span>
                  <span style={{ fontWeight: 600 }}>₹{item.totalPrice?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.subtotal?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Tax:</span>
                <span>₹{selectedInvoice.taxAmount?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', marginTop: '6px' }}>
                <span>Grand Total:</span>
                <span>₹{selectedInvoice.grandTotal?.toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
              <button onClick={() => window.print()} className="btn btn-secondary">
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>
              <button onClick={() => setIsPrintModalOpen(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
