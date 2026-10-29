import React, { useState, useEffect } from 'react';
import { cafeService } from '../services/cafeService';
import { CafeMenuItem, CafeTable, CafeOrder } from '../types';
import { useToast } from '../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Search,
  CheckCircle,
  Printer,
} from 'lucide-react';

export const LivePOS: React.FC = () => {
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<{ item: CafeMenuItem; quantity: number }[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | ''>('');
  const [orderType, setOrderType] = useState<string>('DINE_IN');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<CafeOrder | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [items, tbls] = await Promise.all([
        cafeService.getMenuItems(1),
        cafeService.getTables(1),
      ]);
      setMenuItems(items);
      setTables(tbls);
      if (tbls.length > 0) {
        setSelectedTableId(tbls[0].id);
      }
    } catch {
      showToast('error', 'Failed to load POS catalog');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = ['ALL', 'COFFEE', 'BEVERAGES', 'SNACKS', 'PIZZA', 'DESSERT'];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.categoryName.toUpperCase() === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const addToCart = (item: CafeMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.item.id === itemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as { item: CafeMenuItem; quantity: number }[];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
  const taxRate = 0.05; // 5% GST
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('warning', 'Order cart is empty');
      return;
    }

    const payload = {
      businessId: 1,
      tableId: orderType === 'DINE_IN' && selectedTableId ? selectedTableId : null,
      orderType,
      notes: orderNotes,
      items: cart.map((c) => ({
        menuItemId: c.item.id,
        itemName: c.item.itemName,
        quantity: c.quantity,
        unitPrice: c.item.price,
      })),
    };

    try {
      const placed = await cafeService.createOrder(payload);
      setLastPlacedOrder(placed);
      setIsReceiptModalOpen(true);
      showToast('success', `Order ${placed.orderNumber} placed & KOT created!`);
      clearCart();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to place POS order');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Left Column: Menu Items & Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Live Cafe Point of Sale (POS)</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Touch & click billing terminal with instant KOT dispatch
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search espresso, pastry, pizza..."
              style={{ paddingLeft: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn btn-sm"
              style={{
                background: selectedCategory === cat ? 'var(--royal-blue)' : '#FFFFFF',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-body)',
                borderColor: selectedCategory === cat ? 'var(--royal-blue)' : 'var(--border-slate)',
                fontWeight: 700,
                borderRadius: '9999px',
                padding: '6px 16px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', overflowY: 'auto' }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cafe-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      border: `1.5px solid ${item.vegetarian ? '#10b981' : '#ef4444'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: item.vegetarian ? '#10b981' : '#ef4444',
                      }}
                    />
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>
                    {item.categoryName}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '4px' }}>{item.itemName}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, minHeight: '32px' }}>
                  {item.description || 'Artisanal recipe'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  ₹{item.price?.toFixed(0)}
                </span>
                <button
                  className="btn btn-sm btn-cafe"
                  style={{ width: '28px', height: '28px', padding: 0, borderRadius: '50%' }}
                  title="Add to Ticket"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Live Order Ticket Cart */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px',
          height: '100%',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={20} color="var(--cafe-accent)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Live Ticket</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Table & Order Type Selectors */}
          <div className="grid-2" style={{ marginBottom: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Type</label>
              <select
                className="select"
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="DINE_IN">Dine-In</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>

            {orderType === 'DINE_IN' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Table</label>
                <select
                  className="select"
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(Number(e.target.value))}
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cart Item Lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <ShoppingBag size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <span>Ticket is empty. Tap menu items to add.</span>
              </div>
            ) : (
              cart.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.itemName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{item.price} each</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', width: '16px', textAlign: 'center' }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={12} />
                    </button>

                    <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: '45px', textAlign: 'right' }}>
                      ₹{(item.price * quantity).toFixed(0)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bill Summary & Actions */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>GST (5%):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handlePlaceOrder}
            className="btn btn-cafe"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
          >
            <CheckCircle size={18} />
            <span>Generate KOT & Bill (₹{grandTotal.toFixed(0)})</span>
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Kitchen Order Ticket (KOT) Generated">
        {lastPlacedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Ajalkar POS Cafe</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Order #{lastPlacedOrder.orderNumber} • Table: {lastPlacedOrder.tableNumber || 'Takeaway'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lastPlacedOrder.items?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span>{item.quantity}x {item.itemName}</span>
                  <span style={{ fontWeight: 600 }}>₹{item.totalPrice?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
              <span>Total Paid / Billed:</span>
              <span>₹{lastPlacedOrder.totalAmount?.toFixed(2)}</span>
            </div>

            <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
              <button onClick={() => window.print()} className="btn btn-secondary">
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button onClick={() => setIsReceiptModalOpen(false)} className="btn btn-cafe">
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
