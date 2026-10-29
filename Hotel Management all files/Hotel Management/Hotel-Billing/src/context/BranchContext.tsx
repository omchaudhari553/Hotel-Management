import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import branchService, { Branch } from '../services/branchService';

export interface BranchContextType {
  branches: Branch[];
  mainBranch: Branch | null;
  mainBranches: Branch[];
  selectedMainBranch: Branch | null;
  selectedMainBranchId: number;
  subBranches: Branch[];
  selectedSubBranch: Branch | null;
  selectedSubBranchId: number;
  selectedBranch: Branch | null;
  selectedBranchId: number;
  setSelectedMainBranchId: (id: number) => void;
  setSelectedBranchId: (id: number) => void;
  setSelectedSubBranchId: (id: number) => void;
  loading: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const SELECTED_MAIN_BRANCH_KEY = 'ajalkar_selected_main_branch_id';
const SELECTED_BRANCH_KEY = 'ajalkar_selected_branch_id';
const SELECTED_SUB_BRANCH_KEY = 'ajalkar_selected_sub_branch_id';

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedMainBranchId, setSelectedMainBranchIdState] = useState<number>(() => {
    const saved = localStorage.getItem(SELECTED_MAIN_BRANCH_KEY);
    return saved ? Number(saved) : 1;
  });

  const [selectedBranchId, setSelectedBranchIdState] = useState<number>(() => {
    const saved = localStorage.getItem(SELECTED_BRANCH_KEY);
    return saved ? Number(saved) : 1;
  });

  const [selectedSubBranchId, setSelectedSubBranchIdState] = useState<number>(() => {
    const saved = localStorage.getItem(SELECTED_SUB_BRANCH_KEY);
    return saved ? Number(saved) : 0;
  });

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await branchService.getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load branches from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Identify all main branches (those without a parentBranchId)
  const mainBranches: Branch[] = React.useMemo(() => {
    if (!branches.length) return [];
    const roots = branches.filter((b: any) => !b.parentBranchId);
    return roots.length > 0 ? roots : [branches[0]];
  }, [branches]);

  // Identify active main branch
  const selectedMainBranch: Branch | null = React.useMemo(() => {
    if (!mainBranches.length) return null;
    const match = mainBranches.find((b) => b.id === selectedMainBranchId);
    return match || mainBranches[0];
  }, [mainBranches, selectedMainBranchId]);

  // Backward-compatible alias
  const mainBranch = selectedMainBranch;

  // Identify sub-branches strictly belonging to the active main branch
  const subBranches: Branch[] = React.useMemo(() => {
    if (!branches.length || !selectedMainBranch) return [];
    return branches.filter((b: any) => {
      if (b.id === selectedMainBranch.id) return false;
      if (b.parentBranchId !== undefined && b.parentBranchId !== null && b.parentBranchId !== "") {
        return Number(b.parentBranchId) === Number(selectedMainBranch.id);
      }
      return false;
    });
  }, [branches, selectedMainBranch]);

  // Resolve selected sub-branch
  const selectedSubBranch: Branch | null = React.useMemo(() => {
    if (!subBranches.length) return null;
    if (selectedSubBranchId) {
      const match = subBranches.find((b) => b.id === selectedSubBranchId);
      if (match) return match;
    }
    return null;
  }, [subBranches, selectedSubBranchId]);

  // Resolve active overall selected branch
  const selectedBranch: Branch | null = React.useMemo(() => {
    if (!branches.length) return null;
    if (selectedSubBranch) return selectedSubBranch;
    if (selectedMainBranch) return selectedMainBranch;
    const match = branches.find((b) => b.id === selectedBranchId);
    return match || branches[0] || null;
  }, [branches, selectedBranchId, selectedSubBranch, selectedMainBranch]);

  const setSelectedMainBranchId = (id: number) => {
    setSelectedMainBranchIdState(id);
    localStorage.setItem(SELECTED_MAIN_BRANCH_KEY, String(id));
    // Clear sub-branch selection when switching main branch
    setSelectedSubBranchIdState(0);
    localStorage.removeItem(SELECTED_SUB_BRANCH_KEY);
    setSelectedBranchIdState(id);
    localStorage.setItem(SELECTED_BRANCH_KEY, String(id));
  };

  const setSelectedBranchId = (id: number) => {
    setSelectedBranchIdState(id);
    localStorage.setItem(SELECTED_BRANCH_KEY, String(id));
  };

  const setSelectedSubBranchId = (id: number) => {
    if (!id || id === selectedMainBranch?.id) {
      setSelectedSubBranchIdState(0);
      localStorage.removeItem(SELECTED_SUB_BRANCH_KEY);
      if (selectedMainBranch) {
        setSelectedBranchIdState(selectedMainBranch.id);
        localStorage.setItem(SELECTED_BRANCH_KEY, String(selectedMainBranch.id));
      }
    } else {
      setSelectedSubBranchIdState(id);
      localStorage.setItem(SELECTED_SUB_BRANCH_KEY, String(id));
      setSelectedBranchIdState(id);
      localStorage.setItem(SELECTED_BRANCH_KEY, String(id));
    }
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        mainBranch,
        mainBranches,
        selectedMainBranch,
        selectedMainBranchId: selectedMainBranch?.id || selectedMainBranchId || 1,
        subBranches,
        selectedSubBranch,
        selectedSubBranchId: selectedSubBranch?.id || selectedSubBranchId || 0,
        selectedBranch,
        selectedBranchId: selectedBranch?.id || selectedBranchId || 1,
        setSelectedMainBranchId,
        setSelectedBranchId,
        setSelectedSubBranchId,
        loading,
        refreshBranches: loadBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;
