import React, { useState, useEffect } from 'react';
import { messService } from '../services/messService';
import { MessPlan } from '../types';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { ScrollText, Plus, Check, Clock, Shield } from 'lucide-react';
import { sanitizeMobileInput, isValidMobile } from '../common/phoneUtils';

export const MealPlans: React.FC = () => {
  const [plans, setPlans] = useState<MessPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [newPlan, setNewPlan] = useState({
    businessId: 1,
    planName: '',
    planType: 'MONTHLY',
    mealsIncluded: 'LUNCH, DINNER',
    price: 3000,
    validityDays: 30,
    totalMealsCount: 60,
    description: '',
  });

  const [subscriberForm, setSubscriberForm] = useState({
    businessId: 1,
    planId: 0,
    fullName: '',
    phone: '',
    email: '',
    tiffinEnabled: false,
    deliveryAddress: '',
    tiffinSlot: 'LUNCH_ONLY',
  });

  const { showToast } = useToast();

  const loadPlans = async () => {
    try {
      const data = await messService.getPlans(1);
      setPlans(Array.isArray(data) ? data : []);
    } catch {
      showToast('error', 'Failed to load meal plans');
      setPlans([]);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.planName) {
      showToast('error', 'Plan name is required');
      return;
    }
    try {
      await messService.createPlan(newPlan as any);
      showToast('success', 'Plan created successfully');
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create plan');
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberForm.fullName || !subscriberForm.phone) {
      showToast('error', 'Subscriber name and phone are required');
      return;
    }
    if (!isValidMobile(subscriberForm.phone)) {
      showToast('error', 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9');
      return;
    }
    try {
      await messService.subscribe({
        ...subscriberForm,
        planId: selectedPlanId || plans[0]?.id,
      });
      showToast('success', 'New subscriber enrolled successfully');
      setIsSubscribeModalOpen(false);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to subscribe member');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917' }}>Mess Subscription Plans</h1>
          <p style={{ color: '#57534E', fontSize: '0.9rem', marginTop: '2px' }}>
            Configure monthly, daily, and tiffin meal packages for students and professionals
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #4D7C0F 0%, #65A30D 100%)',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(77, 124, 15, 0.35)',
          }}
        >
          <Plus size={16} />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {plans.map((plan) => (
          <div key={plan.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E7E5E4', backgroundColor: '#FFFFFF' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#F7FEE7',
                    color: '#4D7C0F',
                    border: '1px solid #E7E5E4',
                  }}
                >
                  {plan.planType}
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4D7C0F' }}>
                  ₹{plan.price?.toLocaleString()}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginBottom: '6px' }}>{plan.planName}</h3>
              <p style={{ fontSize: '0.84rem', color: '#57534E', marginBottom: '16px' }}>
                {plan.description || 'Nutritious balanced wholesome meals'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#F7FEE7', border: '1px solid #E7E5E4', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#57534E', fontWeight: 600 }}>Validity:</span>
                  <span style={{ fontWeight: 700, color: '#1C1917' }}>{plan.validityDays} Days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#57534E', fontWeight: 600 }}>Total Meals:</span>
                  <span style={{ fontWeight: 700, color: '#1C1917' }}>{plan.totalMealsCount} Meals</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#57534E', fontWeight: 600 }}>Included:</span>
                  <span style={{ fontWeight: 800, color: '#4D7C0F' }}>{plan.mealsIncluded}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedPlanId(plan.id);
                setIsSubscribeModalOpen(true);
              }}
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#F7FEE7',
                color: '#4D7C0F',
                border: '1px solid #E7E5E4',
                fontWeight: 700,
              }}
            >
              <span>Enroll Member to this Plan</span>
            </button>
          </div>
        ))}
      </div>

      {/* Create Plan Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Mess Plan">
        <form onSubmit={handleCreatePlan}>
          <div className="form-group">
            <label className="form-label">Plan Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Monthly Executive (Lunch + Dinner)"
              value={newPlan.planName}
              onChange={(e) => setNewPlan({ ...newPlan, planName: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Plan Type</label>
              <select
                className="select"
                value={newPlan.planType}
                onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value })}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily / Weekly</option>
                <option value="TIFFIN_ONLY">Tiffin Box Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input
                type="number"
                required
                className="input"
                value={newPlan.price}
                onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Validity (Days)</label>
              <input
                type="number"
                className="input"
                value={newPlan.validityDays}
                onChange={(e) => setNewPlan({ ...newPlan, validityDays: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Meals Included</label>
              <input
                type="number"
                className="input"
                value={newPlan.totalMealsCount}
                onChange={(e) => setNewPlan({ ...newPlan, totalMealsCount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Included Meals</label>
            <input
              type="text"
              className="input"
              placeholder="LUNCH, DINNER"
              value={newPlan.mealsIncluded}
              onChange={(e) => setNewPlan({ ...newPlan, mealsIncluded: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="textarea"
              rows={2}
              value={newPlan.description}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-mess">
              Save Plan
            </button>
          </div>
        </form>
      </Modal>

      {/* Enroll Subscriber Modal */}
      <Modal isOpen={isSubscribeModalOpen} onClose={() => setIsSubscribeModalOpen(false)} title="Enroll Member to Subscription Plan">
        <form onSubmit={handleSubscribe}>
          <div className="form-group">
            <label className="form-label">Member Full Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Anand Kadam"
              value={subscriberForm.fullName}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, fullName: e.target.value })}
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
                value={subscriberForm.phone}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, phone: sanitizeMobileInput(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                value={subscriberForm.email}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="tiffinCheck"
              checked={subscriberForm.tiffinEnabled}
              onChange={(e) => setSubscriberForm({ ...subscriberForm, tiffinEnabled: e.target.checked })}
            />
            <label htmlFor="tiffinCheck" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
              Enable Doorstep Tiffin Box Delivery
            </label>
          </div>

          {subscriberForm.tiffinEnabled && (
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Building, Street, Landmark, Corporate Park..."
                value={subscriberForm.deliveryAddress}
                onChange={(e) => setSubscriberForm({ ...subscriberForm, deliveryAddress: e.target.value })}
              />
            </div>
          )}

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsSubscribeModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-mess">
              Confirm Subscription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
