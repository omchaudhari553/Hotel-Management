import React, { createContext, useContext, useState, useEffect } from 'react';
import { Industry } from '../types';
import { industryService } from '../services/industryService';
import api from '../services/api';

export type IndustryCode = 'HOTEL' | 'MESS' | 'CAFE';

interface IndustryContextType {
  selectedIndustry: Industry | null;
  activeIndustryCode: IndustryCode | null;
  isConfigured: boolean;
  industries: Industry[];
  availableModules: string[];
  selectAndLockIndustry: (code: IndustryCode) => Promise<string>;
  setIndustryContext: (industry: Industry, modules?: string[]) => void;
  setIndustryCode: (code: IndustryCode) => void;
  switchIndustry: (code: string) => Promise<string>;
  loading: boolean;
}

const DEFAULT_INDUSTRIES: Industry[] = [
  {
    id: 1,
    code: 'HOTEL',
    name: 'Hotel & Restaurant',
    description: 'Hotel and restaurant dining management',
    icon: 'hotel',
    active: true,
  },
  {
    id: 2,
    code: 'MESS',
    name: 'Mess',
    description: 'Mess and meal management',
    icon: 'utensils',
    active: true,
  },
  {
    id: 3,
    code: 'CAFE',
    name: 'Cafe',
    description: 'Cafe and table-order management',
    icon: 'coffee',
    active: true,
  },
];

const IndustryContext = createContext<IndustryContextType | undefined>(undefined);

export const IndustryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [industries, setIndustries] = useState<Industry[]>(DEFAULT_INDUSTRIES);
  
  // Hydrate persistent selection from localStorage
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(() => {
    const savedCode = localStorage.getItem('ajalkar_industry') as IndustryCode;
    if (savedCode && ['HOTEL', 'MESS', 'CAFE'].includes(savedCode)) {
      return DEFAULT_INDUSTRIES.find((i) => i.code === savedCode) || DEFAULT_INDUSTRIES[0];
    }
    return null;
  });

  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const activeIndustryCode = (selectedIndustry?.code as IndustryCode) || null;
  const isConfigured = !!selectedIndustry;

  useEffect(() => {
    if (activeIndustryCode) {
      // api.defaults.headers.common['X-Industry-Id'] = activeIndustryCode;
      localStorage.setItem('ajalkar_industry', activeIndustryCode);
    }
  }, [activeIndustryCode]);

  useEffect(() => {
    industryService
      .getIndustries()
      .then((data) => {
        if (data && data.length > 0) {
          setIndustries(data);
          const savedCode = localStorage.getItem('ajalkar_industry') as IndustryCode;
          if (savedCode) {
            const found = data.find((i) => i.code === savedCode);
            if (found) setSelectedIndustry(found);
          }
        }
      })
      .catch(() => {
        setIndustries(DEFAULT_INDUSTRIES);
      });
  }, []);

  const setIndustryContext = (ind: Industry, modules: string[] = []) => {
    setSelectedIndustry(ind);
    setAvailableModules(modules);
    localStorage.setItem('ajalkar_industry', ind.code);
    // api.defaults.headers.common['X-Industry-Id'] = ind.code;
  };

  const setIndustryCode = (code: IndustryCode) => {
    const upper = code.toUpperCase() as IndustryCode;
    const ind = industries.find((i) => i.code === upper) || DEFAULT_INDUSTRIES.find((i) => i.code === upper) || DEFAULT_INDUSTRIES[0];
    setSelectedIndustry(ind);
    localStorage.setItem('ajalkar_industry', upper);
    // api.defaults.headers.common['X-Industry-Id'] = upper;
  };

  const selectAndLockIndustry = async (code: IndustryCode): Promise<string> => {
    setLoading(true);
    const upperCode = code.toUpperCase() as IndustryCode;
    try {
      const res = await industryService.selectIndustry(upperCode);
      const ind = industries.find((i) => i.code === upperCode) || {
        id: upperCode === 'HOTEL' ? 1 : upperCode === 'MESS' ? 2 : 3,
        code: upperCode,
        name: res.selectedIndustry?.name || (upperCode === 'HOTEL' ? 'Hotel & Restaurant' : upperCode === 'MESS' ? 'Mess' : 'Cafe'),
        description: res.selectedIndustry?.description || '',
        icon: res.selectedIndustry?.icon || 'grid',
        active: true,
      };

      setIndustryContext(ind, res.availableModules || []);
      return res.dashboardRoute || `/${upperCode.toLowerCase()}/dashboard`;
    } catch (err: any) {
      const savedCode = (localStorage.getItem('ajalkar_industry') as IndustryCode) || 'HOTEL';
      const ind = industries.find((i) => i.code === savedCode) || DEFAULT_INDUSTRIES[0];
      setIndustryContext(ind, []);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <IndustryContext.Provider
      value={{
        selectedIndustry,
        activeIndustryCode,
        isConfigured,
        industries,
        availableModules,
        selectAndLockIndustry,
        setIndustryContext,
        setIndustryCode,
        switchIndustry: selectAndLockIndustry,
        loading,
      }}
    >
      {children}
    </IndustryContext.Provider>
  );
};

export const useIndustry = () => {
  const context = useContext(IndustryContext);
  if (!context) throw new Error('useIndustry must be used within an IndustryProvider');
  return context;
};

