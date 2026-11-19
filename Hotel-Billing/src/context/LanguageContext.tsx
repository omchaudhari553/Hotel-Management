import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { settingsService } from '../services/settingsService';
import { MASTER_TRANSLATIONS, TranslationsMap, TranslationItem } from '../locales/translations';
import { localizeGuestName as localizeNameEngine, getLocalizedMenuItemName, getLocalizedMenuDescription, formatTableName, lookupExactName } from '../locales/nameLocalization';

export type LanguageCode = 'en' | 'mr' | 'hi';

export interface LanguageContextType {
  language: LanguageCode;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  formatDate: (dateInput: string | Date | number, options?: { showDayOfWeek?: boolean; showTime?: boolean }) => string;
  formatNumber: (val: number | string, options?: { decimals?: number; asCurrency?: boolean; currencySymbol?: string }) => string;
  toDevanagari: (input: string | number) => string;
  translateStatus: (status: string) => string;
  localizeGuestName: (name?: string) => string;
  formatTableName: (name?: string, lang?: LanguageCode) => string;
  getLocalizedMenuItemName: (name?: string, lang?: LanguageCode) => string;
  getLocalizedMenuDescription: (desc?: string, lang?: LanguageCode) => string;
}

export const toDevanagariNumerals = (input: string | number): string => {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[0-9]/g, (digit) => devanagariDigits[parseInt(digit, 10)]);
};

// Additional status mappings
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
  PARTIALLY_RECEIVED: { en: 'Partially Received', mr: 'अंशतः प्राप्त', hi: 'आंशिक प्राप्त' },
  PARTIAL_RECEIVED: { en: 'Partially Received', mr: 'अंशतः प्राप्त', hi: 'आंशिक प्राप्त' },
  RETURNED: { en: 'Returned', mr: 'परत केले', hi: 'वापस किया' },
  DAMAGED: { en: 'Damaged', mr: 'खराब (Damaged)', hi: 'क्षतिग्रस्त (Damaged)' },
  EXPIRED: { en: 'Expired', mr: 'मुदत संपलेली', hi: 'अवधि समाप्त' },
  WRONG_ITEM: { en: 'Wrong Item', mr: 'चुकीची वस्तू', hi: 'गलत वस्तु' },
  QUALITY_ISSUE: { en: 'Quality Issue', mr: 'दर्जाची समस्या', hi: 'गुणवत्ता समस्या' },
  EXCESS_STOCK: { en: 'Excess Stock', mr: 'अतिरिक्त साठा', hi: 'अतिरिक्त स्टॉक' },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  currentLanguage: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  formatDate: (d) => String(d),
  formatNumber: (v) => String(v),
  toDevanagari: (v) => String(v),
  translateStatus: (s) => s,
  localizeGuestName: (n) => n || 'Guest',
  formatTableName: (name) => name || '',
  getLocalizedMenuItemName: (name) => name || '',
  getLocalizedMenuDescription: (desc) => desc || '',
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('ajalkar_language');
      if (saved === 'mr' || saved === 'hi' || saved === 'en') return saved;
      if (saved === 'Marathi') return 'mr';
      if (saved === 'Hindi') return 'hi';
      if (saved === 'English') return 'en';
    } catch {}
    return 'en';
  });

  // Fast case-insensitive normalized dictionary
  const normalizedDictionary = useMemo(() => {
    const map = new Map<string, TranslationItem>();
    
    // Add master translations
    Object.entries(MASTER_TRANSLATIONS).forEach(([k, item]) => {
      map.set(k.toLowerCase().trim(), item);
      map.set(item.en.toLowerCase().trim(), item);
    });

    // Add status dictionary
    Object.entries(STATUS_DICTIONARY).forEach(([k, item]) => {
      map.set(k.toLowerCase().trim(), item);
      map.set(item.en.toLowerCase().trim(), item);
    });

    return map;
  }, []);

  useEffect(() => {
    // Fetch user language setting from backend SQL Server
    settingsService.getSettings().then((settings) => {
      if (Array.isArray(settings)) {
        const langSetting = settings.find(
          (s) => (s.category === 'preferences' || s.category === 'localization') &&
                 (s.settingKey === 'default_language' || s.settingKey === 'language')
        );
        if (langSetting?.settingValue) {
          const val = langSetting.settingValue.toLowerCase();
          const hasExplicit = localStorage.getItem('ajalkar_language_explicit');
          if (!hasExplicit) {
            if (val === 'marathi' || val === 'mr') setLanguageState('mr');
            else if (val === 'hindi' || val === 'hi') setLanguageState('hi');
            else if (val === 'english' || val === 'en') setLanguageState('en');
          }
        }
      }
    }).catch(() => {});

    const handleLanguageChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ language: LanguageCode }>;
      if (customEvent.detail?.language) {
        setLanguageState(customEvent.detail.language);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ajalkar_language' && (e.newValue === 'en' || e.newValue === 'mr' || e.newValue === 'hi')) {
        setLanguageState(e.newValue as LanguageCode);
      }
    };

    window.addEventListener('language-changed', handleLanguageChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('language-changed', handleLanguageChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('ajalkar_language', lang);
      localStorage.setItem('ajalkar_language_explicit', 'true');
    } catch {}
    const langName = lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English';
    settingsService.saveSetting('preferences', 'default_language', langName).catch(() => {});
    settingsService.saveSetting('localization', 'language', lang).catch(() => {});
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));
  };

  const t = (key: string, fallback?: string): string => {
    if (!key && !fallback) return '';
    const cleanKey = (key || '').trim();
    const cleanFallback = (fallback || '').trim();

    // 1. Direct key match in MASTER_TRANSLATIONS
    if (cleanKey && MASTER_TRANSLATIONS[cleanKey]) {
      const match = MASTER_TRANSLATIONS[cleanKey][language];
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

    // 5. Check exact dish name, description, and exact name dictionary
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
      // If language is English and candidate is known Devanagari dish or supplier, convert to English
      const exactName = lookupExactName(candidate, 'en');
      if (exactName) {
        return exactName;
      }
    }

    // 6. Default fallback or key
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

  const formatDate = (
    dateInput: string | Date | number,
    options?: { showDayOfWeek?: boolean; showTime?: boolean }
  ): string => {
    if (!dateInput) return '';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);

      const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daysMr = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
      const daysHi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthsMr = ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'];
      const monthsHi = ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितं', 'अक्टू', 'नवंबर', 'दिसं'];

      const dayIdx = d.getDay();
      const monthIdx = d.getMonth();
      const dateNum = d.getDate();
      const year = d.getFullYear();

      let dayStr = daysEn[dayIdx];
      let monthStr = monthsEn[monthIdx];
      if (language === 'mr') {
        dayStr = daysMr[dayIdx];
        monthStr = monthsMr[monthIdx];
      } else if (language === 'hi') {
        dayStr = daysHi[dayIdx];
        monthStr = monthsHi[monthIdx];
      }

      let formatted = `${dateNum} ${monthStr} ${year}`;
      if (options?.showDayOfWeek !== false) {
        formatted = `${dayStr}, ${formatted}`;
      }
      if (options?.showTime) {
        const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        formatted = `${formatted} ${timePart}`;
      }
      if (language === 'mr' || language === 'hi') {
        formatted = toDevanagariNumerals(formatted);
      }
      return formatted;
    } catch {
      return String(dateInput);
    }
  };

  const toDevanagari = (input: string | number): string => {
    if (input === null || input === undefined) return '';
    if (language === 'mr' || language === 'hi') {
      return toDevanagariNumerals(input);
    }
    return String(input);
  };

  const formatNumber = (
    val: number | string,
    options?: { decimals?: number; asCurrency?: boolean; currencySymbol?: string }
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

  const formatTable = (name?: string, lang?: LanguageCode): string => {
    return formatTableName(name, lang || language);
  };

  const getLocalizedMenuItem = (name?: string, lang?: LanguageCode): string => {
    return getLocalizedMenuItemName(name, lang || language);
  };

  const getLocalizedDesc = (desc?: string, lang?: LanguageCode): string => {
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

export const useLanguage = () => useContext(LanguageContext);
export { localizeNameEngine as localizeGuestName, getLocalizedMenuItemName, getLocalizedMenuDescription, formatTableName };
export default LanguageContext;
