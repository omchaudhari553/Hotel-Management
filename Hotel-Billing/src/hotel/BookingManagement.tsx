import React, { useState, useEffect } from 'react';
import { hotelService } from '../services/hotelService';
import { HotelBooking, HotelRoom } from '../types';
import { DataTable } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { CalendarCheck, Plus, Check, LogOut, Utensils } from 'lucide-react';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';

export const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const [bookingForm, setBookingForm] = useState({
    businessId: 1,
    roomId: 0,
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    idProofType: 'AADHAAR',
    idProofNumber: '',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    notes: '',
  });

  const [serviceForm, setServiceForm] = useState({
    bookingId: 0,
    serviceName: 'Room Dining Breakfast',
    quantity: 1,
    unitPrice: 350,
  });

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [bookingsData, roomsData] = await Promise.all([
        hotelService.getBookings(1),
        hotelService.getRooms(1),
      ]);
      setBookings(bookingsData);
      setRooms(roomsData);
      if (roomsData.length > 0 && !bookingForm.roomId) {
        setBookingForm((prev) => ({ ...prev, roomId: roomsData[0].id }));
      }
    } catch {
      showToast('error', 'Failed to load bookings');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.roomId || !bookingForm.guestName || !bookingForm.guestPhone) {
      showToast('error', 'Please fill all required booking fields');
      return;
    }
    if (!isValidMobile(bookingForm.guestPhone)) {
      showToast('error', 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9');
      return;
    }
    try {
      await hotelService.createBooking(bookingForm);
      showToast('success', 'Reservation booked successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create booking');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await hotelService.updateBookingStatus(id, status);
      showToast('success', `Booking marked as ${status}`);
      loadData();
    } catch {
      showToast('error', 'Failed to update booking status');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) return;
    try {
      await hotelService.addService({
        bookingId: selectedBookingId,
        ...serviceForm,
      });
      showToast('success', 'Service added to guest folio');
      setIsServiceModalOpen(false);
      loadData();
    } catch {
      showToast('error', 'Failed to add service');
    }
  };

  const columns = [
    {
      header: 'Folio / ID',
      render: (row: HotelBooking) => <span style={{ fontWeight: 800, color: '#1C1917' }}>#HB-{row.id}</span>,
    },
    {
      header: 'Room',
      render: (row: HotelBooking) => (
        <span style={{ fontWeight: 700, color: '#7C2D12' }}>
          Room {row.roomNumber} ({row.roomType})
        </span>
      ),
    },
    {
      header: 'Guest Name & Phone',
      render: (row: HotelBooking) => (
        <div>
          <div style={{ fontWeight: 700, color: '#1C1917' }}>{row.guestName}</div>
          <div style={{ fontSize: '0.78rem', color: '#57534E' }}>{row.guestPhone}</div>
        </div>
      ),
    },
    {
      header: 'Stay Dates',
      render: (row: HotelBooking) => (
        <span style={{ fontSize: '0.82rem', color: '#57534E' }}>
          {row.checkInDate} → {row.checkOutDate} ({row.totalNights}N)
        </span>
      ),
    },
    {
      header: 'Total Bill',
      render: (row: HotelBooking) => (
        <span style={{ fontWeight: 800, color: '#1C1917' }}>₹{row.totalAmount?.toLocaleString()}</span>
      ),
    },
    {
      header: 'Status',
      render: (row: HotelBooking) => <StatusBadge status={row.bookingStatus} />,
    },
    {
      header: 'Actions',
      render: (row: HotelBooking) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {row.bookingStatus === 'CONFIRMED' && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'CHECKED_IN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #7C2D12 0%, #B45309 100%)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Check In Guest"
            >
              <Check size={13} />
              <span>Check In</span>
            </button>
          )}
          {row.bookingStatus === 'CHECKED_IN' && (
            <>
              <button
                onClick={() => {
                  setSelectedBookingId(row.id);
                  setIsServiceModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #FED7AA',
                  background: '#FFF7ED',
                  color: '#7C2D12',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Add Room Service / Extras"
              >
                <Utensils size={13} />
                <span>Service</span>
              </button>
              <button
                onClick={() => handleUpdateStatus(row.id, 'CHECKED_OUT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #FECACA',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Check Out"
              >
                <LogOut size={13} />
                <span>Check Out</span>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Hotel Bookings & Reservations</h1>
          <p style={{ color: '#57534E', fontSize: '0.9rem', marginTop: '3px', margin: 0 }}>
            Check-in/out workflows, reservation calendar, and extra room services
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
          <span>New Reservation</span>
        </button>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: '12px', padding: '24px' }}>
        <DataTable
          columns={columns}
          data={bookings}
          searchKey="guestName"
          searchPlaceholder="Search by guest name or phone..."
        />
      </div>

      {/* New Booking Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Room Reservation">
        <form onSubmit={handleCreateBooking}>
          <div className="form-group">
            <label className="form-label">Select Available Room *</label>
            <select
              required
              className="select"
              value={bookingForm.roomId}
              onChange={(e) => setBookingForm({ ...bookingForm, roomId: Number(e.target.value) })}
            >
              <option value="">-- Select Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} - {r.roomType} (₹{r.basePricePerNight}/night) - {r.status}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Guest Full Name *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Ramesh Patil"
                value={bookingForm.guestName}
                onChange={(e) => setBookingForm({ ...bookingForm, guestName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="10 digit mobile (starts with 6-9)"
                maxLength={10}
                inputMode="numeric"
                value={bookingForm.guestPhone}
                onChange={(e) => setBookingForm({ ...bookingForm, guestPhone: sanitizeMobileInput(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">ID Proof Type</label>
              <select
                className="select"
                value={bookingForm.idProofType}
                onChange={(e) => setBookingForm({ ...bookingForm, idProofType: e.target.value })}
              >
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ID Proof Number</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 1234-5678-9012"
                value={bookingForm.idProofNumber}
                onChange={(e) => setBookingForm({ ...bookingForm, idProofNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Check-In Date *</label>
              <input
                type="date"
                required
                className="input"
                value={bookingForm.checkInDate}
                onChange={(e) => setBookingForm({ ...bookingForm, checkInDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Check-Out Date *</label>
              <input
                type="date"
                required
                className="input"
                value={bookingForm.checkOutDate}
                onChange={(e) => setBookingForm({ ...bookingForm, checkOutDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes & Requests</label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Extra bed, late check-in, dietary preferences..."
              value={bookingForm.notes}
              onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-hotel">
              Confirm Reservation
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Service Modal */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Add Room Service / Amenity to Folio"
      >
        <form onSubmit={handleAddService}>
          <div className="form-group">
            <label className="form-label">Service Item Name *</label>
            <input
              type="text"
              required
              className="input"
              value={serviceForm.serviceName}
              onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                className="input"
                value={serviceForm.quantity}
                onChange={(e) => setServiceForm({ ...serviceForm, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price (₹)</label>
              <input
                type="number"
                required
                className="input"
                value={serviceForm.unitPrice}
                onChange={(e) => setServiceForm({ ...serviceForm, unitPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsServiceModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-hotel">
              Add to Bill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
