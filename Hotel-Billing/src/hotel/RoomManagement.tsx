import React, { useState, useEffect } from 'react';
import { hotelService } from '../services/hotelService';
import { HotelRoom } from '../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { BedDouble, Plus, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';

export const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    businessId: 1,
    roomNumber: '',
    roomType: 'DELUXE',
    floor: '1st Floor',
    basePricePerNight: 2500,
    maxOccupancy: 2,
    amenities: 'AC, WiFi, Smart TV',
    status: 'AVAILABLE',
  });
  const { showToast } = useToast();

  const loadRooms = async () => {
    try {
      const data = await hotelService.getRooms(1, filterStatus === 'ALL' ? undefined : filterStatus);
      setRooms(data);
    } catch {
      showToast('error', 'Failed to load hotel rooms');
    }
  };

  useEffect(() => {
    loadRooms();
  }, [filterStatus]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.roomNumber) {
      showToast('error', 'Room number is required');
      return;
    }
    try {
      await hotelService.createRoom(newRoom as any);
      showToast('success', `Room ${newRoom.roomNumber} created successfully`);
      setIsModalOpen(false);
      setNewRoom({
        businessId: 1,
        roomNumber: '',
        roomType: 'DELUXE',
        floor: '1st Floor',
        basePricePerNight: 2500,
        maxOccupancy: 2,
        amenities: 'AC, WiFi, Smart TV',
        status: 'AVAILABLE',
      });
      loadRooms();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create room');
    }
  };

  const handleStatusChange = async (roomId: number, status: string) => {
    try {
      await hotelService.updateRoomStatus(roomId, status);
      showToast('success', `Room marked as ${status}`);
      loadRooms();
    } catch {
      showToast('error', 'Failed to update status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Room & Floor Directory</h1>
          <p style={{ color: '#57534E', fontSize: '0.9rem', marginTop: '3px', margin: 0 }}>
            Manage room inventory, pricing tiers, and housekeeping cycles
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
          <span>Add New Room</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['ALL', 'AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: filterStatus === st ? '1px solid #B45309' : '1px solid #E7E5E4',
              background: filterStatus === st ? 'linear-gradient(135deg, #7C2D12 0%, #B45309 100%)' : '#FFFFFF',
              color: filterStatus === st ? '#FFFFFF' : '#57534E',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: filterStatus === st ? '0 2px 8px rgba(124, 45, 18, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Room Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {rooms.map((room) => (
          <div
            key={room.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E7E5E4',
              padding: '20px',
              borderTop: `4px solid ${room.status === 'AVAILABLE'
                  ? '#16A34A'
                  : room.status === 'OCCUPIED'
                    ? '#DC2626'
                    : room.status === 'CLEANING'
                      ? '#F59E0B'
                      : '#B45309'
                }`,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BedDouble size={20} color="#B45309" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>Room {room.roomNumber}</h3>
              </div>
              <StatusBadge status={room.status} />
            </div>

            <div style={{ fontSize: '0.84rem', color: '#57534E', marginBottom: '8px', fontWeight: 500 }}>
              {room.roomType} • {room.floor} • Max {room.maxOccupancy} Guests
            </div>

            <div style={{ fontSize: '0.8rem', color: '#57534E', marginBottom: '16px', background: '#FFF7ED', padding: '6px 10px', borderRadius: '6px', border: '1px solid #FED7AA' }}>
              {room.amenities || 'Standard amenities'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E7E5E4' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#57534E', textTransform: 'uppercase', fontWeight: 600 }}>Rate / Night</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                  ₹{room.basePricePerNight?.toLocaleString()}
                </div>
              </div>

              {/* Status Quick Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {room.status === 'CLEANING' && (
                  <button
                    onClick={() => handleStatusChange(room.id, 'AVAILABLE')}
                    className="btn btn-sm"
                    style={{ background: '#ECFDF5', color: '#16A34A', border: '1px solid #A7F3D0', fontWeight: 700 }}
                    title="Mark Ready & Available"
                  >
                    <Sparkles size={14} color="#16A34A" />
                    <span>Cleaned</span>
                  </button>
                )}
                {room.status === 'AVAILABLE' && (
                  <button
                    onClick={() => handleStatusChange(room.id, 'MAINTENANCE')}
                    className="btn btn-sm"
                    style={{ background: '#FFF7ED', color: '#B45309', border: '1px solid #FED7AA', fontWeight: 700 }}
                    title="Mark for Maintenance"
                  >
                    <AlertCircle size={14} color="#B45309" />
                  </button>
                )}
                {room.status === 'MAINTENANCE' && (
                  <button
                    onClick={() => handleStatusChange(room.id, 'AVAILABLE')}
                    className="btn btn-sm"
                    style={{ background: '#ECFDF5', color: '#16A34A', border: '1px solid #A7F3D0', fontWeight: 700 }}
                    title="Mark Available"
                  >
                    <CheckCircle size={14} color="#16A34A" />
                    <span>Ready</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Room Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Hotel Room">
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label className="form-label">Room Number *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. 105, 204, 301"
              value={newRoom.roomNumber}
              onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Room Category</label>
              <select
                className="select"
                value={newRoom.roomType}
                onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
              >
                <option value="DELUXE">Deluxe Room</option>
                <option value="EXECUTIVE_SUITE">Executive Suite</option>
                <option value="FAMILY_SUITE">Family Suite</option>
                <option value="PRESIDENTIAL_SUITE">Presidential Suite</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                type="text"
                className="input"
                value={newRoom.floor}
                onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Price per Night (₹) *</label>
              <input
                type="number"
                required
                className="input"
                value={newRoom.basePricePerNight}
                onChange={(e) => setNewRoom({ ...newRoom, basePricePerNight: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Occupancy</label>
              <input
                type="number"
                className="input"
                value={newRoom.maxOccupancy}
                onChange={(e) => setNewRoom({ ...newRoom, maxOccupancy: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amenities</label>
            <input
              type="text"
              className="input"
              placeholder="AC, WiFi, Mini Bar, King Bed"
              value={newRoom.amenities}
              onChange={(e) => setNewRoom({ ...newRoom, amenities: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-hotel">
              Save Room
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
