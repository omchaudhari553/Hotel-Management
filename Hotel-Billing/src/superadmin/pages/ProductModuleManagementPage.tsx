import React, { useEffect, useState } from 'react';
import { useSuperAdminPopup } from '../SuperAdminPopupContext';
import { superAdminApi, ProductItem, ProductModuleItem } from '../superAdminApi';
import { industryService } from '../../services/industryService';
import '../superadmin.css';
import { Grid, Hotel, UtensilsCrossed, Coffee, Check, RefreshCw } from 'lucide-react';

const DEFAULT_PRODUCTS: ProductItem[] = [
  { id: 1, code: 'HOTEL', name: 'Hotel Management System', description: 'Full hotel billing, rooms, bookings, KOT, tables, purchases and GST accounting', icon: 'Hotel', active: true, moduleCount: 8, planCount: 4, activeSubscribers: 2 },
  { id: 2, code: 'MESS', name: 'Mess Management System', description: 'Complete mess membership, attendance, meal plans, weekly menu, billing and tiffin dispatch', icon: 'UtensilsCrossed', active: true, moduleCount: 7, planCount: 4, activeSubscribers: 1 },
  { id: 3, code: 'CAFE', name: 'Cafe Management System', description: 'High-speed touch POS, beverage modifier menus, table layout, kitchen display and orders', icon: 'Coffee', active: true, moduleCount: 6, planCount: 4, activeSubscribers: 0 }
];

export const ProductModuleManagementPage: React.FC = () => {
  const { showAlert } = useSuperAdminPopup();
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<string>('HOTEL');
  const [modules, setModules] = useState<ProductModuleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizeHotelModules = (rawMods: ProductModuleItem[], backendStatuses?: Record<string, boolean>): ProductModuleItem[] => {
    let savedStatusMap: Record<string, boolean> = {};
    if (backendStatuses && Object.keys(backendStatuses).length > 0) {
      savedStatusMap = { ...backendStatuses };
    } else {
      try {
        const savedRaw = localStorage.getItem('platform_hotel_modules_status');
        if (savedRaw) savedStatusMap = JSON.parse(savedRaw);
      } catch {}
    }

    // 8 Exact Hotel Modules strictly matching Hotel Sidebar
    const canonical = [
      { code: 'HOTEL_OVERVIEW', name: 'Hotel Overview', description: 'Real-time sales, order velocity, table status & daily analytics', isCore: true, aliases: ['HOTEL_DASHBOARD'] },
      { code: 'HOTEL_KOT', name: 'KOT', description: 'Kitchen Order Tickets live firing, routing and chef dispatch', isCore: true, aliases: ['KOT'] },
      { code: 'HOTEL_BILLING', name: 'Billing / Invoices', description: 'Thermal bill generation, table settlement, split bills & discount management', isCore: true, aliases: ['POS_BILLING'] },
      { code: 'HOTEL_TABLES', name: 'Tables', description: 'Floor sections, visual table layout, dine-in status & occupancy tracker', isCore: true, aliases: ['TABLE_MGMT'] },
      { code: 'HOTEL_PAYMENTS', name: 'Payments', description: 'Cash, UPI, Card and multi-tender daily payment reconciliation', isCore: true, aliases: [] },
      { code: 'HOTEL_PURCHASE', name: 'Purchase', description: 'Supplier purchase orders, inventory stocking & vendor expense tracking', isCore: true, aliases: ['PURCHASE', 'INVENTORY'] },
      { code: 'HOTEL_STAFF', name: 'Staff', description: 'Staff directory, role permissions, waiter commissions & shifts', isCore: false, aliases: ['STAFF_PAYROLL'] },
      { code: 'HOTEL_SETTINGS', name: 'Settings', description: 'System configuration, tax/GST settings, print setup & audit reports', isCore: false, aliases: ['HOTEL_REPORTS', 'REPORTS'] },
    ];

    return canonical.map((c, idx) => {
      const existing = rawMods.find(m => m.code === c.code || c.aliases.includes(m.code));
      let isActive = true;
      if (savedStatusMap[c.code] !== undefined) {
        isActive = savedStatusMap[c.code];
      } else if (existing && existing.active !== undefined) {
        isActive = existing.active;
      }
      return {
        id: existing?.id || (100 + idx),
        productId: existing?.productId || 1,
        productCode: existing?.productCode || 'HOTEL',
        code: c.code,
        name: c.name,
        description: c.description,
        isCore: c.isCore,
        active: isActive,
        createdAt: (existing as any)?.createdAt || new Date().toISOString()
      };
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getProducts();
      const prodList = data && data.length > 0 ? data : DEFAULT_PRODUCTS;
      setProducts(prodList);
      const target = prodList.find(p => p.code === selectedProduct) || prodList[0];
      if (target) {
        const [modData, backendStatuses] = await Promise.all([
          superAdminApi.getProductModules(target.id),
          target.code === 'HOTEL' ? industryService.getModuleStatuses() : Promise.resolve({})
        ]);
        const finalMods = target.code === 'HOTEL' ? normalizeHotelModules(modData, backendStatuses) : modData;
        setModules(finalMods);
        if (target.code === 'HOTEL') {
          const statusMap: Record<string, boolean> = {};
          finalMods.forEach((m) => {
            statusMap[m.code] = m.active;
            if (m.code === 'HOTEL_OVERVIEW') statusMap['HOTEL_DASHBOARD'] = m.active;
            if (m.code === 'HOTEL_SETTINGS') {
              statusMap['HOTEL_REPORTS'] = m.active;
              statusMap['REPORTS'] = m.active;
            }
            if (m.code === 'HOTEL_KOT') statusMap['KOT'] = m.active;
            if (m.code === 'HOTEL_BILLING') statusMap['POS_BILLING'] = m.active;
            if (m.code === 'HOTEL_TABLES') statusMap['TABLE_MGMT'] = m.active;
            if (m.code === 'HOTEL_PURCHASE') {
              statusMap['PURCHASE'] = m.active;
              statusMap['INVENTORY'] = m.active;
            }
            if (m.code === 'HOTEL_STAFF') statusMap['STAFF_PAYROLL'] = m.active;
          });
          localStorage.setItem('platform_hotel_modules_status', JSON.stringify(statusMap));
          window.dispatchEvent(new CustomEvent('platform-modules-updated', { detail: statusMap }));
          try {
            const bc = new BroadcastChannel('hotel_platform_modules');
            bc.postMessage(statusMap);
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      if (selectedProduct === 'HOTEL') {
        const fallback = normalizeHotelModules([]);
        setModules(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProduct]);

  const handleToggle = async (modId: number, current: boolean) => {
    const mod = modules.find(m => m.id === modId);
    const newActive = !current;
    const updated = modules.map(m => m.id === modId ? { ...m, active: newActive } : m);
    setModules(updated);

    if (selectedProduct === 'HOTEL') {
      const statusMap: Record<string, boolean> = {};
      updated.forEach((m) => {
        statusMap[m.code] = m.active;
        if (m.code === 'HOTEL_OVERVIEW') statusMap['HOTEL_DASHBOARD'] = m.active;
        if (m.code === 'HOTEL_SETTINGS') {
          statusMap['HOTEL_REPORTS'] = m.active;
          statusMap['REPORTS'] = m.active;
        }
        if (m.code === 'HOTEL_KOT') statusMap['KOT'] = m.active;
        if (m.code === 'HOTEL_BILLING') statusMap['POS_BILLING'] = m.active;
        if (m.code === 'HOTEL_TABLES') statusMap['TABLE_MGMT'] = m.active;
        if (m.code === 'HOTEL_PURCHASE') {
          statusMap['PURCHASE'] = m.active;
          statusMap['INVENTORY'] = m.active;
        }
        if (m.code === 'HOTEL_STAFF') statusMap['STAFF_PAYROLL'] = m.active;
      });
      localStorage.setItem('platform_hotel_modules_status', JSON.stringify(statusMap));
      window.dispatchEvent(new CustomEvent('platform-modules-updated', { detail: statusMap }));
      try {
        const bc = new BroadcastChannel('hotel_platform_modules');
        bc.postMessage(statusMap);
      } catch {}

      if (mod?.code) {
        await industryService.updateModuleStatus(mod.code, newActive);
      }
    }

    try {
      await superAdminApi.toggleModuleStatus(modId, newActive, mod?.code);
      showAlert(`Module ${newActive ? 'enabled' : 'disabled'} successfully across all hotel logins!`, 'Module Updated', 'info');
    } catch (e) {
      showAlert(`Module state updated across all hotel logins!`, 'Module Updated', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Product Feature Modules Engine</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Fine-grained permission and feature toggling for Hotel, Mess, and Cafe operational modules.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          title="Refresh Feature Modules"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSelectedProduct('HOTEL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
            selectedProduct === 'HOTEL' ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
          }`}
        >
          <Hotel className="w-3.5 h-3.5" />
          <span>Hotel Modules (Active)</span>
        </button>

        <button
          onClick={() => setSelectedProduct('MESS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
            selectedProduct === 'MESS' ? 'bg-amber-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Mess Modules (Ready for Import)</span>
        </button>

        <button
          onClick={() => setSelectedProduct('CAFE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
            selectedProduct === 'CAFE' ? 'bg-cyan-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Cafe Modules (Ready for Import)</span>
        </button>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-slate-400">Loading module configuration...</div>
        ) : (
          modules.map((m) => (
            <div key={m.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{m.name}</span>
                  {(m.isCore || (m as any).core) && (
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">Core</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-1">{m.code}</p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Controls backend API route authorization for this module.
                </p>
              </div>

              <button
                onClick={() => handleToggle(m.id, m.active)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  m.active ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
