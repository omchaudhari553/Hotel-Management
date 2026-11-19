import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IndustryType } from '../types';
import { STORAGE_KEYS } from '../api/client';

interface IndustryContextType {
  industry: IndustryType;
  setIndustry: (industry: IndustryType) => Promise<void>;
  isIndustrySelected: boolean;
}

const IndustryContext = createContext<IndustryContextType>({} as IndustryContextType);

export const IndustryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [industry, setIndustryState] = useState<IndustryType>('HOTEL');
  const [isIndustrySelected, setIsIndustrySelected] = useState<boolean>(true);

  useEffect(() => {
    const loadIndustry = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.INDUSTRY);
        if (stored) {
          setIndustryState(stored as IndustryType);
          setIsIndustrySelected(true);
        }
      } catch (err) {
        console.warn('Failed to load industry:', err);
      }
    };
    loadIndustry();
  }, []);

  const setIndustry = async (newIndustry: IndustryType) => {
    setIndustryState(newIndustry);
    setIsIndustrySelected(true);
    await AsyncStorage.setItem(STORAGE_KEYS.INDUSTRY, newIndustry);
  };

  return (
    <IndustryContext.Provider
      value={{
        industry,
        setIndustry,
        isIndustrySelected,
      }}
    >
      {children}
    </IndustryContext.Provider>
  );
};

export const useIndustry = () => useContext(IndustryContext);
