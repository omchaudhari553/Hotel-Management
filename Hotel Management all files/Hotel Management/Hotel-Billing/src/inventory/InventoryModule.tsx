import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { Product, StockMovement } from '../types';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import { Boxes, Plus, AlertTriangle, ArrowDownUp, RefreshCw } from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'MOVEMENTS'>('PRODUCTS');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    businessId: 1,
    category: 'GROCERY',
    name: '',
    sku: '',
    unit: 'KG',
    purchasePrice: 50,
    sellingPrice: 70,
    stockQuantity: 100,
    minStockAlert: 20,
    active: true,
  });

  const [adjustForm, setAdjustForm] = useState({
    productId: 0,
    movementType: 'INWARD',
    quantity: 10,
    notes: 'Purchase batch inward',
  });

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [prodData, moveData] = await Promise.all([
        inventoryService.getProducts(1),
        inventoryService.getMovements(1),
      ]);
      setProducts(prodData);
      setMovements(moveData);
      if (prodData.length > 0 && !adjustForm.productId) {
        setAdjustForm((prev) => ({ ...prev, productId: prodData[0].id }));
      }
    } catch {
      showToast('error', 'Failed to load inventory stock');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) {
      showToast('error', 'Product name and SKU are required');
      return;
    }
    try {
      await inventoryService.createProduct(newProduct as any);
      showToast('success', 'Product registered in inventory');
      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create product');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.productId || adjustForm.quantity <= 0) {
      showToast('error', 'Valid product and quantity required');
      return;
    }
    try {
      await inventoryService.adjustStock(adjustForm);
      showToast('success', 'Stock quantity adjusted successfully');
      setIsAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) <= (p.minStockAlert ?? 0)).length;

  const productColumns = [
    {
      header: 'SKU / Code',
      render: (row: Product) => <span style={{ fontWeight: 700 }}>{row.sku}</span>,
    },
    {
      header: 'Item Name & Category',
      render: (row: Product) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.category}</div>
        </div>
      ),
    },
    {
      header: 'Current Stock',
      render: (row: Product) => {
        const isLow = (row.stockQuantity ?? 0) <= (row.minStockAlert ?? 0);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--text-main)', fontSize: '1rem' }}>
              {row.stockQuantity} {row.unit}
            </span>
            {isLow && (
              <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                Low Alert
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Cost Price',
      render: (row: Product) => <span>₹{row.purchasePrice}</span>,
    },
    {
      header: 'Selling Price',
      render: (row: Product) => <span style={{ fontWeight: 600 }}>₹{row.sellingPrice}</span>,
    },
    {
      header: 'Action',
      render: (row: Product) => (
        <button
          onClick={() => {
            setAdjustForm((prev) => ({ ...prev, productId: row.id }));
            setIsAdjustModalOpen(true);
          }}
          className="btn btn-sm btn-outline"
        >
          <ArrowDownUp size={13} />
          <span>Adjust Stock</span>
        </button>
      ),
    },
  ];

  const movementColumns = [
    {
      header: 'Product',
      render: (row: StockMovement) => <span style={{ fontWeight: 700 }}>{row.productName}</span>,
    },
    {
      header: 'Type',
      render: (row: StockMovement) => (
        <span className={`badge ${row.movementType === 'INWARD' ? 'badge-success' : 'badge-danger'}`}>
          {row.movementType}
        </span>
      ),
    },
    {
      header: 'Quantity',
      render: (row: StockMovement) => (
        <span style={{ fontWeight: 700 }}>
          {row.movementType === 'INWARD' ? '+' : '-'}{row.quantity} {row.productUnit}
        </span>
      ),
    },
    {
      header: 'Notes / Reason',
      accessor: 'notes' as keyof StockMovement,
    },
    {
      header: 'Logged Date',
      render: (row: StockMovement) => <span style={{ fontSize: '0.8rem' }}>{row.createdAt?.split('T')[0]}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Central Inventory & Stock Room</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Shared raw ingredients, beverages, dairy, and supplies across Hotel, Mess, and Cafe
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsAdjustModalOpen(true)} className="btn btn-secondary">
            <ArrowDownUp size={16} />
            <span>Adjust Stock</span>
          </button>
          <button onClick={() => setIsProductModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400e',
          }}
        >
          <AlertTriangle size={20} color="var(--warning)" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
            Attention: {lowStockCount} raw items are below minimum safety stock levels! Replenishment required.
          </span>
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'PRODUCTS' ? 'var(--royal-blue)' : '#FFFFFF',
            color: activeTab === 'PRODUCTS' ? '#FFFFFF' : 'var(--text-body)',
            borderColor: activeTab === 'PRODUCTS' ? 'var(--royal-blue)' : 'var(--border-slate)',
            fontWeight: 700,
          }}
        >
          Product Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('MOVEMENTS')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'MOVEMENTS' ? 'var(--royal-blue)' : '#FFFFFF',
            color: activeTab === 'MOVEMENTS' ? '#FFFFFF' : 'var(--text-body)',
            borderColor: activeTab === 'MOVEMENTS' ? 'var(--royal-blue)' : 'var(--border-slate)',
            fontWeight: 700,
          }}
        >
          Stock Audit Ledger ({movements.length})
        </button>
      </div>

      <div className="card">
        {activeTab === 'PRODUCTS' ? (
          <DataTable
            columns={productColumns}
            data={products}
            searchKey="name"
            searchPlaceholder="Search product by name or SKU..."
          />
        ) : (
          <DataTable
            columns={movementColumns}
            data={movements}
            searchKey="productName"
            searchPlaceholder="Search movement log..."
          />
        )}
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Add Product to Inventory">
        <form onSubmit={handleCreateProduct}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">SKU / Code *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. MILK-500ML"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="select"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                <option value="GROCERY">Grocery & Grains</option>
                <option value="DAIRY">Dairy & Eggs</option>
                <option value="BEVERAGES">Coffee Beans & Tea</option>
                <option value="VEGETABLES">Fresh Vegetables</option>
                <option value="AMENITIES">Hotel Amenities</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Arabica Dark Roast Coffee Beans"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input
                type="text"
                className="input"
                placeholder="KG / LTR / PKT"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price (₹)</label>
              <input
                type="number"
                className="input"
                value={newProduct.purchasePrice}
                onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input
                type="number"
                className="input"
                value={newProduct.sellingPrice}
                onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Initial Stock</label>
              <input
                type="number"
                className="input"
                value={newProduct.stockQuantity}
                onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Alert Threshold</label>
              <input
                type="number"
                className="input"
                value={newProduct.minStockAlert}
                onChange={(e) => setNewProduct({ ...newProduct, minStockAlert: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Stock Adjustment / Audit">
        <form onSubmit={handleAdjustStock}>
          <div className="form-group">
            <label className="form-label">Product Item *</label>
            <select
              className="select"
              value={adjustForm.productId}
              onChange={(e) => setAdjustForm({ ...adjustForm, productId: Number(e.target.value) })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.stockQuantity} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Movement Type</label>
              <select
                className="select"
                value={adjustForm.movementType}
                onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value })}
              >
                <option value="INWARD">Inward (Purchase / Return)</option>
                <option value="OUTWARD">Outward (Usage / Spoilage)</option>
                <option value="AUDIT">Manual Audit Adjustment</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                required
                className="input"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Reference</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Weekly dairy batch delivery #PO-104"
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Movement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
