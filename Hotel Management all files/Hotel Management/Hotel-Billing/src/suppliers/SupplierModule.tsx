import React, { useState, useEffect } from 'react';
import { supplierService } from '../services/supplierService';
import { Supplier } from '../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { TruckIcon, Plus, Phone, Mail, Building } from 'lucide-react';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';

export const SupplierModule: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    businessId: 1,
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
  });

  const { showToast } = useToast();

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getSuppliers(1);
      setSuppliers(data);
    } catch {
      showToast('error', 'Failed to load suppliers');
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.phone) {
      showToast('error', 'Supplier contact and phone are required');
      return;
    }
    if (!isValidMobile(newSupplier.phone)) {
      showToast('error', 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9');
      return;
    }
    try {
      await supplierService.createSupplier(newSupplier);
      showToast('success', 'Supplier vendor registered');
      setIsModalOpen(false);
      setNewSupplier({
        businessId: 1,
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
      });
      loadSuppliers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create supplier');
    }
  };

  const columns = [
    {
      header: 'Vendor & Company',
      render: (row: Supplier) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.company || row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact: {row.name}</div>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      render: (row: Supplier) => (
        <div>
          <div style={{ fontSize: '0.84rem' }}>{row.phone}</div>
          {row.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{row.email}</div>}
        </div>
      ),
    },
    {
      header: 'GST Number',
      render: (row: Supplier) => (
        <span style={{ fontSize: '0.82rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
          {row.gstNumber || 'Unregistered'}
        </span>
      ),
    },
    {
      header: 'Address / Hub',
      accessor: 'address' as keyof Supplier,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Suppliers & Vendor Procurement</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Dairy farms, grocery wholesalers, linen suppliers, and coffee bean roasters
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Register Vendor</span>
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={suppliers}
          searchKey="name"
          searchPlaceholder="Search vendor by company or contact..."
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Supplier Vendor">
        <form onSubmit={handleCreateSupplier}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Company / Business Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Sahyadri Organic Dairy Farm"
                value={newSupplier.company}
                onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Vinayak Shinde"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="10 digit mobile (starts with 6-9)"
                maxLength={10}
                inputMode="numeric"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: sanitizeMobileInput(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">GST Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 27ABCDE1234F1Z5"
              value={newSupplier.gstNumber}
              onChange={(e) => setNewSupplier({ ...newSupplier, gstNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Warehouse Address</label>
            <textarea
              className="textarea"
              rows={2}
              value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
