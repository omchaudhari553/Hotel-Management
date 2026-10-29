import { AppLanguage } from '../context/LanguageContext';
import { toDevanagari } from '../locales/translations';

export const translateNotifTitle = (title: string, language: AppLanguage): string => {
  if (language === 'en') return title;
  const clean = (title || '').trim();
  const titleDict: Record<string, { mr: string; hi: string }> = {
    'New Bill Request': { mr: 'नवीन बिल विनंती', hi: 'नए बिल का अनुरोध' },
    'KOT Dispatched': { mr: 'केओटी पाठवले', hi: 'केओटी भेजा गया' },
    'KOT Sent': { mr: 'केओटी पाठवले', hi: 'केओटी भेजा गया' },
    'Low Inventory Alert': { mr: 'कमी साठा इशारा', hi: 'कम स्टॉक अलर्ट' },
    'Payment Received': { mr: 'पेमेंट प्राप्त झाले', hi: 'भुगतान प्राप्त हुआ' },
    'Table Cleaned': { mr: 'टेबल स्वच्छ केले', hi: 'टेबल साफ किया गया' },
    'Table Sanitized': { mr: 'टेबल स्वच्छ केले', hi: 'टेबल साफ किया गया' },
  };
  return titleDict[clean]?.[language] || clean;
};

export const translateNotifTime = (timeStr: string, language: AppLanguage): string => {
  if (!timeStr) return '';
  if (language === 'en') return timeStr;
  const clean = timeStr.trim().toLowerCase();
  if (clean === 'just now') {
    return language === 'mr' ? 'आत्ताच' : 'अभी';
  }
  const matchMin = clean.match(/^(\d+)\s*m\s*ago$/);
  if (matchMin) {
    const num = toDevanagari(matchMin[1]);
    return language === 'mr' ? `${num} मिनिटांपूर्वी` : `${num} मिनट पहले`;
  }
  const matchHr = clean.match(/^(\d+)\s*h\s*ago$/);
  if (matchHr) {
    const num = toDevanagari(matchHr[1]);
    return language === 'mr' ? `${num} तासापूर्वी` : `${num} घंटे पहले`;
  }
  const matchDay = clean.match(/^(\d+)\s*d\s*ago$/);
  if (matchDay) {
    const num = toDevanagari(matchDay[1]);
    return language === 'mr' ? `${num} दिवसांपूर्वी` : `${num} दिन पहले`;
  }
  return toDevanagari(timeStr);
};

export const translateNotifDesc = (desc: string, language: AppLanguage): string => {
  if (!desc) return '';
  if (language === 'en') return desc;
  const clean = desc.trim();

  // Pattern 1: Table 06 requested final bill (₹ 2,499)
  if (clean.includes('requested final bill')) {
    const tableMatch = clean.match(/Table\s*(\d+)/i);
    const amtMatch = clean.match(/₹\s*([0-9,]+)/);
    const tNum = tableMatch ? toDevanagari(tableMatch[1]) : '';
    const amt = amtMatch ? toDevanagari(amtMatch[1]) : '';
    if (language === 'mr') {
      return `टेबल ${tNum} कडून अंतिम बिलाची विनंती (₹ ${amt})`;
    } else {
      return `टेबल ${tNum} द्वारा अंतिम बिल का अनुरोध (₹ ${amt})`;
    }
  }

  // Pattern 2: Order #KOT-104 dispatched to kitchen for Table 02
  if (clean.includes('dispatched to kitchen') || clean.includes('sent to kitchen')) {
    const kotMatch = clean.match(/#?KOT-(\d+)/i);
    const tableMatch = clean.match(/Table\s*(\d+)/i);
    const kotNum = kotMatch ? toDevanagari(kotMatch[1]) : '';
    const tNum = tableMatch ? toDevanagari(tableMatch[1]) : '';
    if (language === 'mr') {
      return `ऑर्डर #KOT-${kotNum} टेबल ${tNum} साठी किचनमध्ये पाठवली`;
    } else {
      return `ऑर्डर #KOT-${kotNum} टेबल ${tNum} के लिए किचन में भेजी गई`;
    }
  }

  // Pattern 3: Paneer & Butter stock below reorder level (2 kg left)
  if (clean.includes('stock below reorder level')) {
    if (language === 'mr') {
      return `पनीर व बटरचा साठा कमी आहे (२ किलो शिल्लक)`;
    } else {
      return `पनीर और मक्खन का स्टॉक कम है (२ किग्रा शेष)`;
    }
  }

  // Pattern 4: UPI payment of ₹ 1,450 received via PhonePe
  if (clean.includes('UPI payment') || clean.includes('payment of')) {
    const amtMatch = clean.match(/₹\s*([0-9,]+)/);
    const amt = amtMatch ? toDevanagari(amtMatch[1]) : '';
    if (language === 'mr') {
      return `PhonePe द्वारे ₹ ${amt} चे यूपीआय पेमेंट प्राप्त झाले`;
    } else {
      return `PhonePe के माध्यम से ₹ ${amt} का यूपीआई भुगतान प्राप्त हुआ`;
    }
  }

  // Pattern 5: Table 05 sanitized and ready for seating
  if (clean.includes('sanitized and ready') || clean.includes('cleaned and ready')) {
    const tableMatch = clean.match(/Table\s*(\d+)/i);
    const tNum = tableMatch ? toDevanagari(tableMatch[1]) : '';
    if (language === 'mr') {
      return `टेबल ${tNum} सॅनिटाईज करून बसण्यासाठी तयार आहे`;
    } else {
      return `टेबल ${tNum} सैनिटाइज होकर बैठने के लिए तैयार है`;
    }
  }

  return toDevanagari(clean);
};

export const getOpenScreenActionText = (targetScreen?: string, language: AppLanguage = 'en'): string => {
  if (!targetScreen) return '';
  const screenMap: Record<string, { mr: string; hi: string; en: string }> = {
    Billing: { mr: 'बिलिंग उघडा →', hi: 'बिलिंग खोलें →', en: 'Open Billing →' },
    KOT: { mr: 'केओटी उघडा →', hi: 'केओटी खोलें →', en: 'Open KOT →' },
    Purchase: { mr: 'खरेदी उघडा →', hi: 'खरीद खोलें →', en: 'Open Purchase →' },
    Payments: { mr: 'पेमेंट्स उघडा →', hi: 'भुगतान खोलें →', en: 'Open Payments →' },
    Tables: { mr: 'टेबल्स उघडा →', hi: 'टेबल्स खोलें →', en: 'Open Tables →' },
  };
  if (screenMap[targetScreen]) {
    return screenMap[targetScreen][language];
  }
  if (language === 'mr') return `${targetScreen} उघडा →`;
  if (language === 'hi') return `${targetScreen} खोलें →`;
  return `Open ${targetScreen} →`;
};
