import React, { useState, useEffect } from 'react';
import { hotelService } from '../services/hotelService';
import { HotelGuest } from '../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { Users, Plus, Phone, Mail, FileText } from 'lucide-react';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';

export const GuestDirectory: React.FC = () => {
  const [guests, setGuests] = useState<HotelGuest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({
    businessId: 1,
    fullName: '',
    phone: '',
    email: '',
    idProofType: 'AADHAAR',
    idProofNumber: '',
    address: '',
  });

  const { showToast } = useToast();

  const loadGuests = async () => {
    try {
      const data = await hotelService.getGuests(1);
      setGuests(data);
    } catch {
      showToast('error', 'Failed to load guest directory');
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.fullName || !newGuest.phone) {
      showToast('error', 'Guest name and phone are required');
      return;
    }
    if (!isValidMobile(newGuest.phone)) {
      showToast('error', 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9');
      return;
    }
    try {
      await hotelService.createGuest(newGuest);
      showToast('success', 'Guest registered successfully');
      setIsModalOpen(false);
      setNewGuest({
        businessId: 1,
        fullName: '',
        phone: '',
        email: '',
        idProofType: 'AADHAAR',
        idProofNumber: '',
        address: '',
      });
      loadGuests();
    } catch {
      showToast('error', 'Failed to register guest');
    }
  };

  const columns = [
    {
      header: 'Guest Name',
      render: (row: HotelGuest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFF7ED', color: '#7C2D12', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
            {row.fullName.charAt(0)}
          </div>
          <span style={{ fontWeight: 700, color: '#1C1917' }}>{row.fullName}</span>
        </div>
      ),
    },
    {
      header: 'Contact',
      render: (row: HotelGuest) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#1C1917', fontWeight: 600 }}>
            <Phone size={13} color="#B45309" />
            <span>{row.phone}</span>
          </div>
          {row.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#57534E', marginTop: '2px' }}>
              <Mail size={12} color="#A8A29E" />
              <span>{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Govt ID Proof',
      render: (row: HotelGuest) => (
        <span style={{ fontSize: '0.82rem', background: '#FFF7ED', color: '#7C2D12', border: '1px solid #FED7AA', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
          {row.idProofType}: {row.idProofNumber || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Address',
      accessor: 'address' as keyof HotelGuest,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Hotel Guest Directory</h1>
          <p style={{ color: '#57534E', fontSize: '0.9rem', marginTop: '3px', margin: 0 }}>
            Verified guest profiles, contact records, and identity documents
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #7C2D12 0%, #B45309 100%)',
            color: '#FFFFFF',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124, 45, 18, 0.35)',
          }}
        >
          <Plus size={16} />
          <span>Register Guest</span>
        </button>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: '12px', padding: '24px' }}>
        <DataTable
          columns={columns}
          data={guests}
          searchKey="fullName"
          searchPlaceholder="Search guest by name..."
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Hotel Guest">
        <form onSubmit={handleCreateGuest}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="input"
              value={newGuest.fullName}
              onChange={(e) => setNewGuest({ ...newGuest, fullName: e.target.value })}
            />
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
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: sanitizeMobileInput(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">ID Proof Type</label>
              <select
                className="select"
                value={newGuest.idProofType}
                onChange={(e) => setNewGuest({ ...newGuest, idProofType: e.target.value })}
              >
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="VOTER_ID">Voter ID</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ID Proof Number</label>
              <input
                type="text"
                className="input"
                value={newGuest.idProofNumber}
                onChange={(e) => setNewGuest({ ...newGuest, idProofNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="textarea"
              rows={2}
              value={newGuest.address}
              onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-hotel">
              Save Guest Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
