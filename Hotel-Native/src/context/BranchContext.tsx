import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { ensureBackendToken } from '../api/client';
import {
  BranchConfig,
  BranchId,
  INITIAL_BRANCH_LIST,
  getBranchById,
} from '../branches';
import { restaurantStore } from '../api/restaurantStore';

interface BranchContextType {
  branches: BranchConfig[];
  activeBranchId: BranchId;
  activeBranchNumId: number;
  activeBranch: BranchConfig;
  mainBranches: BranchConfig[];
  subBranches: BranchConfig[];
  switchBranch: (branchId: BranchId | number) => Promise<void>;
  updateActiveBranchStats: (partialStats: Partial<BranchConfig['stats']>) => void;
  getBranchName: (lang?: 'en' | 'mr' | 'hi') => string;
  refreshBranches: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = '@hotel_active_branch_id';

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<BranchConfig[]>(INITIAL_BRANCH_LIST);
  const [activeBranchId, setActiveBranchId] = useState<BranchId>('1');
  const [loading, setLoading] = useState<boolean>(false);

  // Sync with restaurantStore
  const syncStoreBranch = (branchId: BranchId | number) => {
    const num = Number(String(branchId).replace(/\D/g, '')) || 1;
    restaurantStore.setCurrentBranch(num);
  };

  const loadBranchesFromBackend = useCallback(async () => {
    try {
      setLoading(true);
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/branches');
      const rawList = res.data?.data || res.data || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        setBranches((prev) => {
          return rawList.map((rb: any) => {
            const strId = String(rb.id);
            const existing = prev.find((p) => String(p.id) === strId);
            return {
              id: strId,
              code: rb.code || existing?.code || `BR-${strId}`,
              name: rb.name || existing?.name || `Branch ${strId}`,
              nameMr: rb.nameMr || existing?.nameMr || rb.name || `शाखा ${strId}`,
              nameHi: rb.nameHi || existing?.nameHi || rb.name || `शाखा ${strId}`,
              type: rb.type || existing?.type || 'Dine-In Restaurant',
              typeMr: existing?.typeMr || 'रेस्टॉरंट आणि डायनिंग',
              typeHi: existing?.typeHi || 'रेस्टोरेंट और डाइन-इन',
              address: rb.address || existing?.address || 'Hotel Premises',
              addressMr: existing?.addressMr || rb.address || 'हॉटेल परिसर',
              addressHi: existing?.addressHi || rb.address || 'होटल परिसर',
              phone: rb.contactPhone || rb.phone || existing?.phone || '9876543210',
              gstin: rb.gstin || existing?.gstin || '27AABCR1234F1Z5',
              manager: rb.managerName || rb.manager || existing?.manager || 'Manager',
              managerPhone: rb.contactPhone || rb.phone || existing?.managerPhone || '9876543210',
              isActive: String(activeBranchId) === strId,
              color: existing?.color || '#C2410C',
              parentBranchId: rb.parentBranchId ? String(rb.parentBranchId) : existing?.parentBranchId || null,
              parentBranchName: rb.parentBranchName || existing?.parentBranchName || null,
              stats: existing?.stats || {
                todaySales: '₹ 0.00',
                todaySalesNum: 0,
                todayOrders: 0,
                occupiedTables: 0,
                totalTables: 0,
                availableTables: 0,
                staffOnDuty: Number(rb.memberCount || rb.members || 0),
                totalStaff: Number(rb.memberCount || rb.members || 0),
                netGst: '₹ 0.00',
                pendingSettlement: '₹ 0.00',
                averageBillValue: '₹ 0.00',
                cashCollection: '₹ 0.00',
                upiCollection: '₹ 0.00',
                cardCollection: '₹ 0.00',
              },
              billRequests: existing?.billRequests || [],
              tables: existing?.tables || [],
            };
          });
        });
      }
    } catch (e) {
      // Backend branches fallback to initial list
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    const loadSavedBranch = async () => {
      try {
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        const resolvedId = savedId === 'b1' ? '1' : savedId === 'b2' ? '2' : savedId === 'b3' ? '5' : (savedId || '1');
        setActiveBranchId(resolvedId);
        syncStoreBranch(resolvedId);
      } catch (e) {
        console.warn('Failed to load active branch', e);
      }
    };
    loadSavedBranch();
    loadBranchesFromBackend();
  }, [loadBranchesFromBackend]);

  const switchBranch = async (branchId: BranchId | number) => {
    const strId = String(branchId) === 'b1' ? '1' : String(branchId) === 'b2' ? '2' : String(branchId) === 'b3' ? '5' : String(branchId);
    setActiveBranchId(strId);
    syncStoreBranch(strId);
    setBranches((prev) =>
      prev.map((b) => ({
        ...b,
        isActive: String(b.id) === strId,
      }))
    );
    try {
      await AsyncStorage.setItem(STORAGE_KEY, strId);
    } catch (e) {
      console.warn('Failed to persist active branch', e);
    }
  };

  const updateActiveBranchStats = (partialStats: Partial<BranchConfig['stats']>) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (String(b.id) === String(activeBranchId)) {
          return {
            ...b,
            stats: {
              ...b.stats,
              ...partialStats,
            },
          };
        }
        return b;
      })
    );
  };

  const activeBranch = getBranchById(activeBranchId, branches);
  const activeBranchNumId = Number(String(activeBranchId).replace(/\D/g, '')) || 1;

  const mainBranches = branches.filter((b) => !b.parentBranchId);
  const subBranches = branches.filter((b) => b.parentBranchId && String(b.parentBranchId) === String(activeBranchId));

  const getBranchName = (_lang: 'en' | 'mr' | 'hi' = 'en') => {
    // Company / Hotel name remains constant across languages per user requirement
    return activeBranch.name || 'Royal Palace Hotel';
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranchId,
        activeBranchNumId,
        activeBranch,
        mainBranches,
        subBranches,
        switchBranch,
        updateActiveBranchStats,
        getBranchName,
        refreshBranches: loadBranchesFromBackend,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
