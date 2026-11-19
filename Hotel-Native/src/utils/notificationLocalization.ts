import { AppLanguage } from '../context/LanguageContext';
import { toDevanagari } from '../locales/translations';

const toDevDigits = (input: string | number): string => {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[0-9]/g, (digit) => devanagariDigits[parseInt(digit, 10)]);
};

const PAYMENT_METHODS_DICT: Record<string, { mr: string; hi: string }> = {
  CASH: { mr: 'कॅश (रोख)', hi: 'कैश (नकद)' },
  UPI: { mr: 'यूपीआय', hi: 'यूपीआई' },
  CARD: { mr: 'कार्ड', hi: 'कार्ड' },
  NETBANKING: { mr: 'नेट बँकिंग', hi: 'नेट बैंकिंग' },
  CREDIT: { mr: 'उधारी', hi: 'उधार' },
  CHEQUE: { mr: 'धनादेश', hi: 'चेक' },
  ONLINE: { mr: 'ऑनलाइन', hi: 'ऑनलाइन' },
};

const translatePaymentMethod = (method: string, lang: AppLanguage): string => {
  if (!method) return '';
  const upper = method.trim().toUpperCase();
  const match = PAYMENT_METHODS_DICT[upper];
  if (match) {
    return lang === 'hi' ? match.hi : match.mr;
  }
  return method;
};

export const translateNotifTitle = (title: string, language: AppLanguage): string => {
  if (language === 'en') return title;
  const clean = (title || '').trim();
  const titleDict: Record<string, { mr: string; hi: string }> = {
    // Payments
    'Payment Received': { mr: 'पेमेंट प्राप्त झाले', hi: 'भुगतान प्राप्त हुआ' },
    'Payment Successful': { mr: 'पेमेंट यशस्वी झाले', hi: 'भुगतान सफल रहा' },
    'Payment Failed': { mr: 'पेमेंट अयशस्वी झाले', hi: 'भुगतान विफल रहा' },

    // Billing
    'New Bill Generated': { mr: 'नवीन बिल तयार झाले', hi: 'नया बिल बनाया गया' },
    'Bill Generated': { mr: 'बिल तयार झाले', hi: 'बिल बनाया गया' },
    'Bill Settled': { mr: 'बिल भरले', hi: 'बिल चुकता हुआ' },
    'New Bill Settled': { mr: 'नवीन बिल भरले', hi: 'नया बिल चुकता हुआ' },
    'New Bill Request': { mr: 'नवीन बिल विनंती', hi: 'नए बिल का अनुरोध' },

    // Orders & KOT
    'New Dine-In Order Placed': { mr: 'नवीन डायन-इन ऑर्डर प्राप्त', hi: 'नया डाइन-इन ऑर्डर प्राप्त' },
    'New Order Placed': { mr: 'नवीन ऑर्डर प्राप्त', hi: 'नया ऑर्डर प्राप्त' },
    'New Kitchen Order (KOT)': { mr: 'नवीन केओटी (KOT) पाठवले', hi: 'नया केओटी (KOT) भेजा गया' },
    'KOT Dispatched': { mr: 'केओटी पाठवले', hi: 'केओटी भेजा गया' },
    'KOT Sent': { mr: 'केओटी पाठवले', hi: 'केओटी भेजा गया' },

    // Stock & Inventory
    'Low Stock Alert': { mr: 'कमी साठा इशारा', hi: 'कम स्टॉक अलर्ट' },
    'Low Inventory Alert': { mr: 'कमी साठा इशारा', hi: 'कम स्टॉक अलर्ट' },

    // Staff & Attendance
    'Staff Attendance': { mr: 'कर्मचारी उपस्थिती', hi: 'कर्मचारी उपस्थिति' },

    // Delivery
    'Delivery Order Dispatched': { mr: 'डिलिव्हरी ऑर्डर पाठवली', hi: 'डिलीवरी ऑर्डर भेजा गया' },

    // Offers
    'New Offer Published': { mr: 'नवीन ऑफर प्रसिद्ध केली', hi: 'नया ऑफ़र प्रकाशित किया' },
    'New Offer Added': { mr: 'नवीन ऑफर जोडली', hi: 'नया ऑफ़र जोड़ा गया' },
    'New Offer Created': { mr: 'नवीन ऑफर जोडली', hi: 'नया ऑफ़र बनाया गया' },
    'Offer Activated': { mr: 'ऑफर सक्रिय झाली', hi: 'ऑफ़र सक्रिय हुआ' },
    'Special Offer Active': { mr: 'विशेष ऑफर सक्रिय', hi: 'विशेष ऑफ़र सक्रिय' },

    // Subscriptions
    'Plan Activated Successfully': { mr: 'प्लॅन यशस्वीरित्या सक्रिय झाला', hi: 'प्लान सफलतापूर्वक सक्रिय हुआ' },
    '28-Day Free Trial Activated': { mr: '२८-दिवसांची मोफत चाचणी सक्रिय', hi: '२८-दिन का निःशुल्क परीक्षण सक्रिय' },
    'Free Trial Expired': { mr: 'मोफत चाचणी संपली', hi: 'निःशुल्क परीक्षण समाप्त' },
    'Subscription Expired': { mr: 'सदस्यता संपली', hi: 'सदस्यता समाप्त' },
    'Subscription Upgraded / Renewed': { mr: 'सदस्यता नूतनीकरण / अपग्रेड', hi: 'सदस्यता नवीनीकृत / अपग्रेड' },
    'Subscription Expiring Soon': { mr: 'सदस्यता लवकरच संपत आहे', hi: 'सदस्यता जल्द समाप्त हो रही है' },
    'Free Trial Expiring Soon': { mr: 'मोफत चाचणी लवकरच संपत आहे', hi: 'निःशुल्क परीक्षण जल्द समाप्त हो रहा है' },
    'Plan Upgrade Required': { mr: 'प्लॅन अपग्रेड आवश्यक', hi: 'प्लान अपग्रेड आवश्यक' },
    'Subscription Plan Expired - Upgrade Now': { mr: 'सबस्क्रिप्शन प्लॅन संपला - आत्ताच अपग्रेड करा', hi: 'सब्सक्रिप्शन प्लान समाप्त - अभी अपग्रेड करें' },

    // Purchase
    'Purchase Order Created': { mr: 'खरेदी ऑर्डर तयार केली', hi: 'खरीद आदेश बनाया गया' },

    // Tables
    'Table Cleaned': { mr: 'टेबल स्वच्छ केले', hi: 'टेबल साफ किया गया' },
    'Table Sanitized': { mr: 'टेबल स्वच्छ केले', hi: 'टेबल साफ किया गया' },
  };

  const exact = titleDict[clean];
  if (exact) return exact[language];

  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(titleDict)) {
    if (k.toLowerCase() === lower) {
      return v[language];
    }
  }

  const planUpgradeMatch = clean.match(/Plan\s+Upgrade\s+Required\s*(?:\((\d+)\s+Days\s+Left\))?/i);
  if (planUpgradeMatch) {
    const days = planUpgradeMatch[1] ? toDevDigits(planUpgradeMatch[1]) : '';
    if (language === 'hi') {
      return days ? `प्लान अपग्रेड करें (${days} दिन शेष)` : 'प्लान अपग्रेड आवश्यक';
    } else {
      return days ? `प्लॅन अपग्रेड करा (${days} दिवस बाकी)` : 'प्लॅन अपग्रेड आवश्यक';
    }
  }

  if (lower.includes('payment received')) return language === 'hi' ? 'भुगतान प्राप्त हुआ' : 'पेमेंट प्राप्त झाले';
  if (lower.includes('new bill') || lower.includes('bill generated')) return language === 'hi' ? 'नया बिल बनाया गया' : 'नवीन बिल तयार झाले';
  if (lower.includes('bill settled')) return language === 'hi' ? 'बिल चुकता हुआ' : 'बिल भरले';
  if (lower.includes('kot')) return language === 'hi' ? 'केओटी भेजा गया' : 'केओटी पाठवले';
  if (lower.includes('order placed')) return language === 'hi' ? 'ऑर्डर प्राप्त हुआ' : 'नवीन ऑर्डर प्राप्त';

  return clean;
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

const cleanAmount = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(/[₹?\s]/g, '').replace(/\.+$/, '');
};

export const translateNotifDesc = (desc: string, language: AppLanguage): string => {
  if (!desc) return '';
  if (language === 'en') return desc;
  const clean = desc.trim();

  // Pattern 1: Bill settlement / Payment Received (e.g. "Bill #INV-1016 settled for ₹651.00 via CASH (Ref: CASH/REC-269).")
  const payMatch1 = clean.match(
    /Bill\s*#?([A-Za-z0-9_-]+)\s+settled\s+for\s+[₹?]?\s*([0-9,.]+)\s+via\s+([A-Za-z0-9_-]+)(?:\s*\((?:Ref:\s*)?([^)]+)\))?/i
  );
  if (payMatch1) {
    const inv = toDevDigits(payMatch1[1]);
    const amt = toDevDigits(cleanAmount(payMatch1[2]));
    const method = translatePaymentMethod(payMatch1[3], language);
    const rawRef = payMatch1[4] ? payMatch1[4].trim() : '';
    const ref = rawRef ? toDevDigits(rawRef) : '';

    if (language === 'hi') {
      return ref
        ? `बिल #${inv} का ₹${amt} भुगतान ${method} द्वारा प्राप्त हुआ (संदर्भ: ${ref})।`
        : `बिल #${inv} का ₹${amt} भुगतान ${method} द्वारा प्राप्त हुआ।`;
    } else {
      return ref
        ? `बिल #${inv} चे ₹${amt} पेमेंट ${method} द्वारे भरले (संदर्भ: ${ref}).`
        : `बिल #${inv} चे ₹${amt} पेमेंट ${method} द्वारे भरले.`;
    }
  }

  // Pattern 2: Bill Generated (e.g. "Bill #INV-1016 for Table Table 01 generated for amount ₹651.00.")
  const billGenMatch = clean.match(
    /Bill\s*#?([A-Za-z0-9_-]+)(?:\s+(?:for\s+Table|for)\s+(?:Table\s+)?([^,.]+?))?\s+generated(?:\s+(?:for\s+amount|for\s+Table\s+([^,.]+?)\.\s*Total))?\s*[₹?]?\s*([0-9,.]+)/i
  );
  if (billGenMatch) {
    const inv = toDevDigits(billGenMatch[1]);
    let rawTable = billGenMatch[2] || billGenMatch[3] || '';
    rawTable = rawTable.replace(/Table/gi, '').trim();
    const amt = toDevDigits(cleanAmount(billGenMatch[4]));

    if (rawTable) {
      const tNum = toDevDigits(rawTable);
      if (language === 'hi') {
        return `टेबल ${tNum} के लिए बिल #${inv} (राशि ₹${amt}) बनाया गया।`;
      } else {
        return `टेबल ${tNum} साठी बिल #${inv} (रक्कम ₹${amt}) तयार झाले.`;
      }
    } else {
      if (language === 'hi') {
        return `बिल #${inv} (राशि ₹${amt}) बनाया गया।`;
      } else {
        return `बिल #${inv} (रक्कम ₹${amt}) तयार झाले.`;
      }
    }
  }

  // Pattern 3: Offer notifications
  if (clean.toLowerCase().includes('offer') || clean.toLowerCase().includes('ऑफर') || clean.toLowerCase().includes('ऑफ़र') || clean.toLowerCase().includes('promo')) {
    const nameMatch = clean.match(/"([^"]+)"/);
    const codeMatch = clean.match(/\(([A-Z0-9_-]+)\)/);
    const discMatch = clean.match(/with\s+([0-9.]+%?|₹\s*[0-9.]+)/i);

    const oName = nameMatch ? nameMatch[1] : '';
    const oCode = codeMatch ? toDevDigits(codeMatch[1]) : '';
    const oDisc = discMatch ? toDevDigits(discMatch[1]) : '';

    if (language === 'mr') {
      return `नवीन ऑफर "${oName}" (${oCode}) सक्रिय झाली - ${oDisc} सवलत लागू.`;
    } else if (language === 'hi') {
      return `नया ऑफ़र "${oName}" (${oCode}) सक्रिय हुआ - ${oDisc} छूट लागू।`;
    }
  }

  // Pattern 4: Table 06 requested final bill (₹ 2,499)
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

  // Pattern 5: Table 03 bill payment of ₹1,470 completed successfully.
  if (clean.includes('bill payment of') || clean.includes('bill of') || clean.includes('settled via')) {
    const tableMatch = clean.match(/Table\s*(\d+)/i);
    const amtMatch = clean.match(/₹\s*([0-9,]+)/);
    const tNum = tableMatch ? toDevanagari(tableMatch[1]) : '';
    const amt = amtMatch ? toDevanagari(amtMatch[1]) : '';
    if (language === 'mr') {
      return `टेबल ${tNum} चे ₹ ${amt} चे बिल यशस्वीरित्या भरले.`;
    } else if (language === 'hi') {
      return `टेबल ${tNum} का ₹ ${amt} का बिल सफलतापूर्वक चुकाया गया।`;
    }
  }

  // Pattern 6: Order #KOT-104 dispatched to kitchen for Table 02
  if (clean.includes('dispatched to kitchen') || clean.includes('sent to kitchen')) {
    const kotMatch = clean.match(/#?\s*KOT-?\s*(\d+|[A-Za-z0-9_-]+)/i);
    const tableMatch = clean.match(/Table\s*(\d+)/i);
    const kotNum = kotMatch ? toDevanagari(kotMatch[1]) : '';
    const tNum = tableMatch ? toDevanagari(tableMatch[1]) : '';
    if (language === 'mr') {
      return `ऑर्डर #KOT-${kotNum} टेबल ${tNum} साठी किचनमध्ये पाठवली`;
    } else {
      return `ऑर्डर #KOT-${kotNum} टेबल ${tNum} के लिए किचन में भेजी गई`;
    }
  }

  // Pattern 7: PO-2026-102 created for Namdev Provisions (₹32,340).
  if (clean.includes('created for') || clean.includes('PO-')) {
    const poMatch = clean.match(/(PO-[A-Z0-9-]+)/i);
    const amtMatch = clean.match(/₹\s*([0-9,]+)/);
    const poNum = poMatch ? toDevDigits(poMatch[1]) : '';
    const amt = amtMatch ? toDevanagari(amtMatch[1]) : '';
    if (language === 'mr') {
      return `खरेदी ऑर्डर ${poNum} (₹ ${amt}) यशस्वीरित्या तयार केली.`;
    } else if (language === 'hi') {
      return `खरीद आदेश ${poNum} (₹ ${amt}) सफलतापूर्वक बनाया गया।`;
    }
  }

  // Pattern 8: Paneer & Butter stock below reorder level (2 kg left)
  if (clean.includes('stock below reorder level') || clean.includes('stock reached minimum threshold')) {
    if (language === 'mr') {
      return `साठा किमान पातळीवर पोहोचला आहे (कमी साठा इशारा).`;
    } else {
      return `स्टॉक न्यूनतम स्तर पर पहुंच गया है (कम स्टॉक चेतावनी)।`;
    }
  }

  // Pattern 9: UPI payment of ₹ 1,450 received via PhonePe
  if (clean.includes('UPI payment') || clean.includes('payment of')) {
    const amtMatch = clean.match(/₹\s*([0-9,]+)/);
    const amt = amtMatch ? toDevanagari(amtMatch[1]) : '';
    if (language === 'mr') {
      return `PhonePe द्वारे ₹ ${amt} चे यूपीआय पेमेंट प्राप्त झाले`;
    } else {
      return `PhonePe के माध्यम से ₹ ${amt} का यूपीआई भुगतान प्राप्त हुआ`;
    }
  }

  // Pattern 10: Table 05 sanitized and ready for seating
  if (clean.includes('sanitized and ready') || clean.includes('cleaned and ready')) {
    const tableMatch = clean.match(/Table\s*(\d+)/i);
    const tNum = tableMatch ? toDevanagari(tableMatch[1]) : '';
    if (language === 'mr') {
      return `टेबल ${tNum} सॅनिटाईज करून बसण्यासाठी तयार आहे`;
    } else {
      return `टेबल ${tNum} सैनिटाइज होकर बैठने के लिए तैयार है`;
    }
  }

  // Pattern 11: Subscription Plan Expiry & Upgrade (<= 10 days remaining / expired)
  const planExpMatch = clean.match(/Your\s+subscription\s+plan\s+will\s+expire\s+in\s+(\d+)\s+days/i);
  if (planExpMatch) {
    const days = toDevDigits(planExpMatch[1]);
    if (language === 'hi') {
      return `आपके सब्सक्रिप्शन प्लान के केवल ${days} दिन शेष हैं। निर्बाध सेवा के लिए कृपया तुरंत अपना प्लान अपग्रेड करें।`;
    } else {
      return `तुमच्या सबस्क्रिप्शन प्लॅनचे फक्त ${days} दिवस बाकी आहेत. अखंड सेवेसाठी कृपया तुमचा प्लॅन त्वरित अपग्रेड करा.`;
    }
  }

  if (clean.includes('Your hotel subscription plan has expired')) {
    if (language === 'hi') {
      return 'आपका सब्सक्रिप्शन प्लान समाप्त हो गया है! सभी फीचर्स जारी रखने के लिए कृपया अभी अपना प्लान रिन्यू या अपग्रेड करें।';
    } else {
      return 'तुमचा सबस्क्रिप्शन प्लॅन संपला आहे! सर्व फीचर्स सुरू ठेवण्यासाठी कृपया आत्ताच प्लॅन रिन्यू किंवा अपग्रेड करा.';
    }
  }

  return toDevDigits(clean);
};

export const getOpenScreenActionText = (targetScreen?: string, language: AppLanguage = 'en'): string => {
  if (!targetScreen) return '';
  const screenMap: Record<string, { mr: string; hi: string; en: string }> = {
    Billing: { mr: 'बिलिंग उघडा →', hi: 'बिलिंग खोलें →', en: 'Open Billing →' },
    KOT: { mr: 'केओटी उघडा →', hi: 'केओटी खोलें →', en: 'Open KOT →' },
    Purchase: { mr: 'खरेदी उघडा →', hi: 'खरीद खोलें →', en: 'Open Purchase →' },
    Payments: { mr: 'पेमेंट्स उघडा →', hi: 'भुगतान खोलें →', en: 'Open Payments →' },
    Tables: { mr: 'टेबल्स उघडा →', hi: 'टेबल्स खोलें →', en: 'Open Tables →' },
    Overview: { mr: 'डॅशबोर्ड उघडा →', hi: 'डैशबोर्ड खोलें →', en: 'Open Dashboard →' },
    Settings: { mr: 'प्लॅन अपग्रेड करा →', hi: 'प्लान अपग्रेड करें →', en: 'Upgrade Plan →' },
    Plan: { mr: 'प्लॅन अपग्रेड करा →', hi: 'प्लान अपग्रेड करें →', en: 'Upgrade Plan →' },
  };
  if (screenMap[targetScreen]) {
    return screenMap[targetScreen][language];
  }
  if (language === 'mr') return `${targetScreen} उघडा →`;
  if (language === 'hi') return `${targetScreen} खोलें →`;
  return `Open ${targetScreen} →`;
};
