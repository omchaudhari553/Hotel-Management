import React, { useState, useEffect } from 'react';
import { cafeService } from '../services/cafeService';
import { CafeTable } from '../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { Grid, Plus, CheckCircle, Users, Coffee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TableLayout: React.FC = () => {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    businessId: 1,
    tableNumber: '',
    seatingCapacity: 4,
    status: 'AVAILABLE',
    section: 'MAIN_HALL',
  });
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadTables = async () => {
    try {
      const data = await cafeService.getTables(1);
      setTables(data);
    } catch {
      showToast('error', 'Failed to load floor tables');
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.tableNumber) {
      showToast('error', 'Table number is required');
      return;
    }
    try {
      await cafeService.createTable(newTable as any);
      showToast('success', `Table ${newTable.tableNumber} added to floor map`);
      setIsModalOpen(false);
      setNewTable({
        businessId: 1,
        tableNumber: '',
        seatingCapacity: 4,
        status: 'AVAILABLE',
        section: 'MAIN_HALL',
      });
      loadTables();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create table');
    }
  };

  const handleStatusChange = async (tableId: number, status: string) => {
    try {
      await cafeService.updateTableStatus(tableId, status);
      showToast('success', `Table status updated to ${status}`);
      loadTables();
    } catch {
      showToast('error', 'Failed to update table status');
    }
  };

  const filteredTables = tables.filter((t) => {
    if (selectedSection === 'ALL') return true;
    return t.section === selectedSection;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Floor Table Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Live seating allocation, section assignments, and dine-in occupancy
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-cafe">
          <Plus size={16} />
          <span>Add New Table</span>
        </button>
      </div>

      {/* Section Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['ALL', 'MAIN_HALL', 'OUTDOOR_PATIO', 'VIP_LOUNGE', 'BALCONY'].map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className="btn btn-sm"
            style={{
              background: selectedSection === sec ? 'var(--cafe-accent)' : '#fff',
              color: selectedSection === sec ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 600,
            }}
          >
            {sec.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Floor Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {filteredTables.map((t) => (
          <div
            key={t.id}
            className="card"
            style={{
              borderTop: `4px solid ${
                t.status === 'AVAILABLE' ? 'var(--success)' : t.status === 'OCCUPIED' ? 'var(--danger)' : 'var(--warning)'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coffee size={18} color="var(--cafe-accent)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t.tableNumber}</h3>
              </div>
              <StatusBadge status={t.status} />
            </div>

            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Capacity: {t.seatingCapacity} Guests • {t.section}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => navigate('/cafe/pos')}
                className="btn btn-sm btn-cafe"
                style={{ fontSize: '0.78rem' }}
              >
                <span>Take Order</span>
              </button>

              <div style={{ display: 'flex', gap: '4px' }}>
                {t.status === 'OCCUPIED' && (
                  <button
                    onClick={() => handleStatusChange(t.id, 'AVAILABLE')}
                    className="btn btn-sm btn-outline"
                    title="Release Table / Vacant"
                  >
                    <CheckCircle size={13} color="var(--success)" />
                    <span>Free</span>
                  </button>
                )}
                {t.status === 'AVAILABLE' && (
                  <button
                    onClick={() => handleStatusChange(t.id, 'OCCUPIED')}
                    className="btn btn-sm btn-outline"
                    title="Mark Occupied"
                  >
                    <span>Occupy</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Table Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Table to Floor Map">
        <form onSubmit={handleCreateTable}>
          <div className="form-group">
            <label className="form-label">Table Number / Code *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. T-04, Patio-2, VIP-1"
              value={newTable.tableNumber}
              onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Seating Capacity</label>
              <input
                type="number"
                min="1"
                required
                className="input"
                value={newTable.seatingCapacity}
                onChange={(e) => setNewTable({ ...newTable, seatingCapacity: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Floor Section</label>
              <select
                className="select"
                value={newTable.section}
                onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
              >
                <option value="MAIN_HALL">Main Hall</option>
                <option value="OUTDOOR_PATIO">Outdoor Patio</option>
                <option value="VIP_LOUNGE">VIP Lounge</option>
                <option value="BALCONY">Balcony</option>
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-cafe">
              Save Table
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
