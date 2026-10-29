import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_TRANSLATIONS,
  DAYS_OF_WEEK,
  DAYS_OF_WEEK_SHORT,
  MONTHS,
  MONTHS_SHORT,
  toDevanagariNumerals,
  TranslationItem,
} from '../locales/translations';
import {
  localizeGuestName as localizeNameEngine,
  getLocalizedMenuItemName,
  getLocalizedMenuDescription,
  formatTableName,
  lookupExactName,
} from '../locales/nameLocalization';

export type AppLanguage = 'en' | 'mr' | 'hi';

export interface FormatDateOptions {
  showDayOfWeek?: boolean;
  shortFormat?: boolean;
  useDevanagariNumerals?: boolean;
  showTime?: boolean;
}

export interface FormatNumberOptions {
  decimals?: number;
  asCurrency?: boolean;
  currencySymbol?: string;
}

export interface LanguageContextType {
  language: AppLanguage;
  currentLanguage: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  formatDate: (date?: Date | string | number, options?: FormatDateOptions) => string;
  formatTime: (date?: Date | string) => string;
  formatNumber: (val: number | string, options?: FormatNumberOptions) => string;
  toDevanagari: (num?: number | string | null) => string;
  translateStatus: (status: string) => string;
  localizeGuestName: (name?: string) => string;
  formatTableName: (name?: string, lang?: AppLanguage) => string;
  getLocalizedMenuItemName: (name?: string, lang?: AppLanguage) => string;
  getLocalizedMenuDescription: (desc?: string, lang?: AppLanguage) => string;
}

const STORAGE_KEY = '@hotel_app_lang';

const STATUS_DICTIONARY: Record<string, { en: string; mr: string; hi: string }> = {
  ON: { en: 'ON', mr: 'चालू', hi: 'चालू' },
  OFF: { en: 'OFF', mr: 'बंद', hi: 'बंद' },
  ACTIVE: { en: 'Active', mr: 'सक्रिय', hi: 'सक्रिय' },
  INACTIVE: { en: 'Inactive', mr: 'निष्क्रिय', hi: 'निष्क्रिय' },
  PENDING: { en: 'Pending', mr: 'प्रलंबित', hi: 'लंबित' },
  ORDERED: { en: 'Ordered', mr: 'मागणी केली', hi: 'ऑर्डर किया' },
  CONFIRMED: { en: 'Confirmed', mr: 'पुष्टी केली', hi: 'पुष्ट' },
  RECEIVED: { en: 'Received', mr: 'प्राप्त झाले', hi: 'प्राप्त हुआ' },
  COMPLETED: { en: 'Completed', mr: 'पूर्ण झाले', hi: 'पूर्ण' },
  CANCELLED: { en: 'Cancelled', mr: 'रद्द केले', hi: 'रद्द' },
  DRAFT: { en: 'Draft', mr: 'मसुदा (Draft)', hi: 'प्रारूप (Draft)' },
  APPROVED: { en: 'Approved', mr: 'मंजूर', hi: 'स्वीकृत' },
  PAID: { en: 'Paid', mr: 'भरले (Paid)', hi: 'भुगतान किया (Paid)' },
  UNPAID: { en: 'Unpaid', mr: 'थकीत (Unpaid)', hi: 'बकाया (Unpaid)' },
  PARTIAL: { en: 'Partial', mr: 'अंशतः भरले', hi: 'आंशिक' },
  DUE: { en: 'Due', mr: 'बाकी', hi: 'देय' },
  AVAILABLE: { en: 'Available', mr: 'उपलब्ध', hi: 'उपलब्ध' },
  OCCUPIED: { en: 'Occupied', mr: 'भरलेले (व्यस्त)', hi: 'व्यस्त' },
  RESERVED: { en: 'Reserved', mr: 'आरक्षित', hi: 'आरक्षित' },
  BILLED: { en: 'Billed', mr: 'बिल दिले', hi: 'बिल जारी' },
  BILL_REQUESTED: { en: 'Bill Requested', mr: 'बिल मागवले', hi: 'बिल अनुरोध' },
  CLEANING: { en: 'Cleaning', mr: 'स्वच्छता', hi: 'सफाई' },
  OUT_OF_SERVICE: { en: 'Out of Service', mr: 'सेवा बंद', hi: 'सेवा से बाहर' },
  PREPARING: { en: 'Preparing', mr: 'तयार होत आहे', hi: 'तैयार हो रहा है' },
  READY: { en: 'Ready', mr: 'तयार', hi: 'तैयार' },
  SERVED: { en: 'Served', mr: 'सर्व्ह केले', hi: 'परोसा गया' },
  PRESENT: { en: 'Present', mr: 'उपस्थित', hi: 'उपस्थित' },
  ABSENT: { en: 'Absent', mr: 'अनुपस्थित', hi: 'अनुपस्थित' },
  HALF_DAY: { en: 'Half Day', mr: 'अर्धा दिवस', hi: 'आधा दिन' },
  LEAVE: { en: 'On Leave', mr: 'रजेवर', hi: 'छुट्टी पर' },
  UNMARKED: { en: 'Unmarked', mr: 'नोंद नाही', hi: 'अचिह्नित' },
  ON_DUTY: { en: 'On Duty', mr: 'हजर', hi: 'ड्यूटी पर' },
  OFF_DUTY: { en: 'Off Duty', mr: 'रजेवर', hi: 'छुट्टी पर' },
  PARTIALLY_RECEIVED: { en: 'Partially Received', mr: 'अंशतः प्राप्त', hi: 'आंशिक प्राप्त' },
  PARTIAL_RECEIVED: { en: 'Partially Received', mr: 'अंशतः प्राप्त', hi: 'आंशिक प्राप्त' },
  RETURNED: { en: 'Returned', mr: 'परत केले', hi: 'वापस किया' },
  DAMAGED: { en: 'Damaged', mr: 'खराब (Damaged)', hi: 'क्षतिग्रस्त (Damaged)' },
  EXPIRED: { en: 'Expired', mr: 'मुदत संपलेली', hi: 'अवधि समाप्त' },
  WRONG_ITEM: { en: 'Wrong Item', mr: 'चुकीची वस्तू', hi: 'गलत वस्तु' },
  QUALITY_ISSUE: { en: 'Quality Issue', mr: 'दर्जाची समस्या', hi: 'गुणवत्ता समस्या' },
  EXCESS_STOCK: { en: 'Excess Stock', mr: 'अतिरिक्त साठा', hi: 'अतिरिक्त स्टॉक' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  // Fast case-insensitive normalized dictionary
  const normalizedDictionary = useMemo(() => {
    const map = new Map<string, TranslationItem>();

    Object.entries(APP_TRANSLATIONS).forEach(([k, item]) => {
      map.set(k.toLowerCase().trim(), item);
      map.set(item.en.toLowerCase().trim(), item);
    });

    Object.entries(STATUS_DICTIONARY).forEach(([k, item]) => {
      map.set(k.toLowerCase().trim(), item);
      map.set(item.en.toLowerCase().trim(), item);
    });

    return map;
  }, []);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'mr' || saved === 'hi')) {
          setLanguageState(saved as AppLanguage);
        }
      } catch (e) {
        console.warn('Failed to load saved language', e);
      }
    };
    loadSavedLanguage();
  }, []);

  const setLanguage = async (newLang: AppLanguage) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Failed to persist language', e);
    }
  };

  const toDevanagari = (num?: number | string | null): string => {
    if (num === null || num === undefined) return '';
    if (language === 'mr' || language === 'hi') {
      return toDevanagariNumerals(num);
    }
    return String(num);
  };

  const t = (key: string, fallback?: string): string => {
    if (!key && !fallback) return '';
    const cleanKey = (key || '').trim();
    const cleanFallback = (fallback || '').trim();

    // 1. Direct key match in APP_TRANSLATIONS
    if (cleanKey && APP_TRANSLATIONS[cleanKey]) {
      const match = APP_TRANSLATIONS[cleanKey][language];
      if (match) return match;
    }

    // 2. Direct key match in STATUS_DICTIONARY
    if (cleanKey && STATUS_DICTIONARY[cleanKey.toUpperCase()]) {
      const match = STATUS_DICTIONARY[cleanKey.toUpperCase()][language];
      if (match) return match;
    }

    // 3. Normalized case-insensitive lookup by key
    const lowerKey = cleanKey.toLowerCase();
    const normalizedMatch = normalizedDictionary.get(lowerKey);
    if (normalizedMatch && normalizedMatch[language]) {
      return normalizedMatch[language];
    }

    // 4. Normalized lookup by fallback text
    if (cleanFallback) {
      const lowerFallback = cleanFallback.toLowerCase();
      const fallbackMatch = normalizedDictionary.get(lowerFallback);
      if (fallbackMatch && fallbackMatch[language]) {
        return fallbackMatch[language];
      }
    }

    // 5. Dish name, description, and exact name lookup
    const candidate = cleanFallback || cleanKey;
    if (language !== 'en') {
      const dishResult = getLocalizedMenuItemName(candidate, language);
      if (dishResult && dishResult.toLowerCase() !== candidate.toLowerCase()) {
        return dishResult;
      }
      const descResult = getLocalizedMenuDescription(candidate, language);
      if (descResult && descResult.toLowerCase() !== candidate.toLowerCase()) {
        return descResult;
      }
      const exactName = lookupExactName(candidate, language);
      if (exactName) {
        return exactName;
      }
    } else {
      const exactName = lookupExactName(candidate, 'en');
      if (exactName) {
        return exactName;
      }
    }

    return fallback !== undefined ? fallback : key;
  };

  const translateStatus = (status: string): string => {
    if (!status) return '';
    const rawUpper = status.trim().toUpperCase();
    const normalizedUpper = rawUpper.replace(/[\s-]+/g, '_');
    if (STATUS_DICTIONARY[normalizedUpper]) {
      return STATUS_DICTIONARY[normalizedUpper][language];
    }
    if (STATUS_DICTIONARY[rawUpper]) {
      return STATUS_DICTIONARY[rawUpper][language];
    }
    return t(status);
  };

  const formatDate = (dateInput?: Date | string | number, options?: FormatDateOptions): string => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const dayOfWeekIdx = d.getDay();
    const monthIdx = d.getMonth();
    const dateNum = d.getDate();
    const yearNum = d.getFullYear();

    const short = options?.shortFormat ?? true;
    const showDay = options?.showDayOfWeek ?? true;
    const useDevanagari = options?.useDevanagariNumerals ?? (language === 'mr' || language === 'hi');

    const dayName = showDay
      ? short
        ? DAYS_OF_WEEK_SHORT[language][dayOfWeekIdx]
        : DAYS_OF_WEEK[language][dayOfWeekIdx]
      : '';

    const monthName = short ? MONTHS_SHORT[language][monthIdx] : MONTHS[language][monthIdx];

    const displayDate = useDevanagari ? toDevanagariNumerals(dateNum) : String(dateNum);
    const displayYear = useDevanagari ? toDevanagariNumerals(yearNum) : String(yearNum);

    let result = '';
    if (showDay) {
      result = `${dayName}, ${displayDate} ${monthName} ${displayYear}`;
    } else {
      result = `${displayDate} ${monthName} ${displayYear}`;
    }

    if (options?.showTime) {
      const timePart = formatTime(d);
      result = `${result} ${timePart}`;
    }

    return result;
  };

  const formatTime = (dateInput?: Date | string): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '';
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (language === 'mr' || language === 'hi') {
      return toDevanagariNumerals(timeStr);
    }
    return timeStr;
  };

  const formatNumber = (
    val: number | string,
    options?: FormatNumberOptions
  ): string => {
    const num = Number(val || 0);
    const decimals = options?.decimals !== undefined ? options.decimals : 2;
    const formatted = num.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const prefix = options?.asCurrency ? (options.currencySymbol || '₹') + ' ' : '';
    const result = `${prefix}${formatted}`;
    if (language === 'mr' || language === 'hi') {
      return toDevanagariNumerals(result);
    }
    return result;
  };

  const localizeGuest = (name?: string): string => {
    return localizeNameEngine(name, language);
  };

  const formatTable = (name?: string, lang?: AppLanguage): string => {
    return formatTableName(name, lang || language);
  };

  const getLocalizedMenuItem = (name?: string, lang?: AppLanguage): string => {
    return getLocalizedMenuItemName(name, lang || language);
  };

  const getLocalizedDesc = (desc?: string, lang?: AppLanguage): string => {
    return getLocalizedMenuDescription(desc, lang || language);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        currentLanguage: language,
        setLanguage,
        t,
        formatDate,
        formatTime,
        formatNumber,
        toDevanagari,
        translateStatus,
        localizeGuestName: localizeGuest,
        formatTableName: formatTable,
        getLocalizedMenuItemName: getLocalizedMenuItem,
        getLocalizedMenuDescription: getLocalizedDesc,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export {
  localizeNameEngine as localizeGuestName,
  getLocalizedMenuItemName,
  getLocalizedMenuDescription,
  formatTableName,
  toDevanagariNumerals,
};
