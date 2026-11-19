import React, { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import { Customer } from '../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { UserCheck, Plus, Phone, Mail, Award } from 'lucide-react';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';

export const CustomerModule: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    businessId: 1,
    name: '',
    phone: '',
    email: '',
    address: '',
    balance: 0,
    loyaltyPoints: 100,
  });

  const { showToast } = useToast();

  const loadCustomers = async () => {
    try {
      const data = await customerService.getCustomers(1);
      setCustomers(data);
    } catch {
      showToast('error', 'Failed to load customers');
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomer.name || !newCustomer.phone) {
      showToast('error', 'Name and phone are required');
      return;
    }

    // Full name: alphabets and spaces only
    if (!/^[A-Za-z\s]+$/.test(newCustomer.name)) {
      showToast('error', 'Full name can contain alphabets and spaces only');
      return;
    }

    // Phone: exactly 10 digits
    if (!/^[6-9]\d{9}$/.test(newCustomer.phone)) {
      showToast('error', 'Phone number must be 10 digits and start with 6, 7, 8, or 9');
      return;
    }

    try {
      await customerService.createCustomer(newCustomer);
      showToast('success', 'Customer profile created');
      setIsModalOpen(false);

      setNewCustomer({
        businessId: 1,
        name: '',
        phone: '',
        email: '',
        address: '',
        balance: 0,
        loyaltyPoints: 100,
      });

      loadCustomers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create customer');
    }
  };

  const columns = [
    {
      header: 'Customer Name',
      render: (row: Customer) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {row.name.charAt(0)}
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{row.name}</div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              {row.address || 'Pune'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      render: (row: Customer) => (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.84rem',
            }}
          >
            <Phone size={12} color="var(--text-muted)" />
            <span>{row.phone}</span>
          </div>

          {row.email && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: 'var(--text-light)',
              }}
            >
              <Mail size={12} />
              <span>{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Balance Outstanding',
      render: (row: Customer) => (
        <span
          style={{
            fontWeight: 700,
            color:
              row.balance > 0
                ? 'var(--danger)'
                : 'var(--success)',
          }}
        >
          ₹{row.balance?.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Loyalty Points',
      render: (row: Customer) => (
        <span
          className="badge badge-warning"
          style={{ fontSize: '0.75rem' }}
        >
          <Award size={12} /> {row.loyaltyPoints || 0} pts
        </span>
      ),
    },
    {
      header: 'Action',
      render: (row: Customer) => (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelectedCustomer(row)}
          title="View Customer Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
          }}
        >
          <UserCheck size={15} />
          <span>View</span>
        </button>
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
            }}
          >
            Unified Customer Directory (CRM)
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginTop: '2px',
            }}
          >
            Shared profiles, guest history, loyalty points, and receivables ledger
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={customers}
          searchKey="name"
          searchPlaceholder="Search customer by name..."
        />
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Customer to CRM"
      >
        <form onSubmit={handleCreateCustomer}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>

            <input
              type="text"
              required
              className="input"
              value={newCustomer.name}
              onChange={(e) => {
                const value = e.target.value;

                // Allow only alphabets and spaces
                if (/^[A-Za-z\s]*$/.test(value)) {
                  setNewCustomer({
                    ...newCustomer,
                    name: value,
                  });
                }
              }}
              placeholder="Enter full name"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number *</label>

              <input
                type="text"
                required
                className="input"
                value={newCustomer.phone}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => {
                  const value = sanitizeMobileInput(e.target.value);
                  setNewCustomer({
                    ...newCustomer,
                    phone: value,
                  });
                }}
                placeholder="10 digit phone number (starts with 6-9)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>

              <input
                type="email"
                className="input"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    email: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>

            <textarea
              className="textarea"
              rows={2}
              value={newCustomer.address}
              onChange={(e) =>
                setNewCustomer({
                  ...newCustomer,
                  address: e.target.value,
                })
              }
            />
          </div>

          <div
            className="modal-footer"
            style={{
              margin: '0 -24px -24px -24px',
              padding: '16px 24px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Profile Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Profile"
      >
        {selectedCustomer && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Customer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                }}
              >
                {selectedCustomer.name.charAt(0)}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                  }}
                >
                  {selectedCustomer.name}
                </div>

                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  Customer Profile
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input">
                  {selectedCustomer.name}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div
                  className="input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Phone size={14} />
                  {selectedCustomer.phone}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div
                  className="input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Mail size={14} />
                  {selectedCustomer.email || 'Not provided'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <div className="input">
                  {selectedCustomer.address || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Customer Account Information */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div
                style={{
                  padding: '14px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '5px',
                  }}
                >
                  Balance Outstanding
                </div>

                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color:
                      selectedCustomer.balance > 0
                        ? 'var(--danger)'
                        : 'var(--success)',
                  }}
                >
                  ₹{selectedCustomer.balance?.toFixed(2)}
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '5px',
                  }}
                >
                  Loyalty Points
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                  }}
                >
                  <Award size={16} />
                  {selectedCustomer.loyaltyPoints || 0} pts
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div
              className="modal-footer"
              style={{
                margin: '0 -24px -24px -24px',
                padding: '16px 24px',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};