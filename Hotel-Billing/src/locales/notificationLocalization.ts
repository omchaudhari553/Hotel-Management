// Master Notification Localization Engine for Ajalkar Hotel Management POS
// Supports full translation for Marathi ('mr'), Hindi ('hi'), and English ('en')

export type NotificationLanguage = 'en' | 'mr' | 'hi' | string;

export const toDevanagariDigits = (input: string | number): string => {
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

const translatePaymentMethod = (method: string, lang: NotificationLanguage): string => {
  if (!method) return '';
  const upper = method.trim().toUpperCase();
  const match = PAYMENT_METHODS_DICT[upper];
  if (match) {
    return lang === 'hi' ? match.hi : match.mr;
  }
  return method;
};

// Title dictionary mapping exact titles to Marathi and Hindi
const TITLE_DICTIONARY: Record<string, { mr: string; hi: string }> = {
  // Payments & Settlements
  'Payment Received': { mr: 'पेमेंट प्राप्त झाले', hi: 'भुगतान प्राप्त हुआ' },
  'Payment Successful': { mr: 'पेमेंट यशस्वी झाले', hi: 'भुगतान सफल रहा' },
  'Payment Failed': { mr: 'पेमेंट अयशस्वी झाले', hi: 'भुगतान विफल रहा' },
  'Payment Settlement': { mr: 'पेमेंट जमा झाले', hi: 'भुगतान निपटान' },

  // Billing
  'New Bill Generated': { mr: 'नवीन बिल तयार झाले', hi: 'नया बिल बनाया गया' },
  'Bill Generated': { mr: 'बिल तयार झाले', hi: 'बिल बनाया गया' },
  'Bill Settled': { mr: 'बिल भरले', hi: 'बिल चुकता हुआ' },
  'New Bill Settled': { mr: 'नवीन बिल भरले', hi: 'नया बिल चुकता हुआ' },
  'New Bill Request': { mr: 'नवीन बिल विनंती', hi: 'नए बिल का अनुरोध' },
  'Bill Request': { mr: 'बिल विनंती', hi: 'बिल अनुरोध' },

  // Orders & KOT
  'New Dine-In Order Placed': { mr: 'नवीन डायन-इन ऑर्डर प्राप्त', hi: 'नया डाइन-इन ऑर्डर प्राप्त' },
  'New Order Placed': { mr: 'नवीन ऑर्डर प्राप्त', hi: 'नया ऑर्डर प्राप्त' },
  'Order Placed': { mr: 'ऑर्डर प्राप्त', hi: 'ऑर्डर प्राप्त हुआ' },
  'New Kitchen Order (KOT)': { mr: 'नवीन केओटी (KOT) पाठवले', hi: 'नया केओटी (KOT) भेजा गया' },
  'Kitchen Order (KOT)': { mr: 'केओटी (KOT) पाठवले', hi: 'केओटी (KOT) भेजा गया' },
  'KOT Dispatched': { mr: 'केओटी पाठवले', hi: 'केओटी भेजा गया' },
  'KOT Sent': { mr: 'केओटी पाठवले', hi: 'केओटी भेजा गया' },

  // Stock & Inventory
  'Low Stock Alert': { mr: 'कमी साठा इशारा', hi: 'कम स्टॉक अलर्ट' },
  'Low Inventory Alert': { mr: 'कमी साठा इशारा', hi: 'कम स्टॉक अलर्ट' },
  'Stock Alert': { mr: 'साठा इशारा', hi: 'स्टॉक अलर्ट' },

  // Staff & Attendance
  'Staff Attendance': { mr: 'कर्मचारी उपस्थिती', hi: 'कर्मचारी उपस्थिति' },
  'Attendance Updated': { mr: 'उपस्थिती अद्ययावत', hi: 'उपस्थिति अपडेट' },

  // Delivery
  'Delivery Order Dispatched': { mr: 'डिलिव्हरी ऑर्डर पाठवली', hi: 'डिलीवरी ऑर्डर भेजा गया' },
  'Order Dispatched': { mr: 'ऑर्डर पाठवली', hi: 'ऑर्डर भेजा गया' },

  // Offers
  'New Offer Published': { mr: 'नवीन ऑफर प्रसिद्ध केली', hi: 'नया ऑफ़र प्रकाशित किया' },
  'New Offer Added': { mr: 'नवीन ऑफर जोडली', hi: 'नया ऑफ़र जोड़ा गया' },
  'New Offer Created': { mr: 'नवीन ऑफर तयार केली', hi: 'नया ऑफ़र बनाया गया' },
  'Offer Activated': { mr: 'ऑफर सक्रिय झाली', hi: 'ऑफ़र सक्रिय हुआ' },
  'Special Offer Active': { mr: 'विशेष ऑफर सक्रिय', hi: 'विशेष ऑफ़र सक्रिय' },

  // Subscriptions & Plans
  'Plan Activated Successfully': { mr: 'प्लॅन यशस्वीरित्या सक्रिय झाला', hi: 'प्लान सफलतापूर्वक सक्रिय हुआ' },
  'Plan Activated': { mr: 'प्लॅन सक्रिय झाला', hi: 'प्लान सक्रिय हुआ' },
  '28-Day Free Trial Activated': { mr: '२८-दिवसांची मोफत चाचणी सक्रिय', hi: '२८-दिन का निःशुल्क परीक्षण सक्रिय' },
  'Free Trial Expired': { mr: 'मोफत चाचणी संपली', hi: 'निःशुल्क परीक्षण समाप्त' },
  'Subscription Expired': { mr: 'सदस्यता संपली', hi: 'सदस्यता समाप्त' },
  'Subscription Upgraded / Renewed': { mr: 'सदस्यता नूतनीकरण / अपग्रेड', hi: 'सदस्यता नवीनीकृत / अपग्रेड' },
  'Subscription Renewed': { mr: 'सदस्यता नूतनीकरण झाले', hi: 'सदस्यता नवीनीकृत हुई' },
  'Subscription Expiring Soon': { mr: 'सदस्यता लवकरच संपत आहे', hi: 'सदस्यता जल्द समाप्त हो रही है' },
  'Free Trial Expiring Soon': { mr: 'मोफत चाचणी लवकरच संपत आहे', hi: 'निःशुल्क परीक्षण जल्द समाप्त हो रहा है' },
  'Plan Upgrade Required': { mr: 'प्लॅन अपग्रेड आवश्यक', hi: 'प्लान अपग्रेड आवश्यक' },
  'Subscription Plan Expired - Upgrade Now': { mr: 'सबस्क्रिप्शन प्लॅन संपला - आत्ताच अपग्रेड करा', hi: 'सब्सक्रिप्शन प्लान समाप्त - अभी अपग्रेड करें' },

  // Purchase & Suppliers
  'Purchase Order Created': { mr: 'खरेदी ऑर्डर तयार केली', hi: 'खरीद आदेश बनाया गया' },
  'Purchase Invoice Created': { mr: 'खरेदी इनव्हॉइस तयार केले', hi: 'खरीद इनवॉइस बनाया गया' },
  'Goods Received': { mr: 'माल प्राप्त झाला', hi: 'माल प्राप्त हुआ' },

  // Tables
  'Table Cleaned': { mr: 'टेबल स्वच्छ केले', hi: 'टेबल साफ किया गया' },
  'Table Sanitized': { mr: 'टेबल स्वच्छ केले', hi: 'टेबल साफ किया गया' },

  // Fallbacks
  'New Notification': { mr: 'नवीन सूचना', hi: 'नई सूचना' },
};

/**
 * Translates notification title to Marathi or Hindi.
 */
export const translateNotificationTitle = (title: string, language: NotificationLanguage): string => {
  if (!title || language === 'en') return title || '';
  const clean = title.trim();

  // 1. Exact match
  const exact = TITLE_DICTIONARY[clean];
  if (exact) {
    return language === 'hi' ? exact.hi : exact.mr;
  }

  // 2. Case-insensitive match
  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(TITLE_DICTIONARY)) {
    if (k.toLowerCase() === lower) {
      return language === 'hi' ? v.hi : v.mr;
    }
  }

  // 3. Substring matching fallbacks
  const planUpgradeMatch = clean.match(/Plan\s+Upgrade\s+Required\s*(?:\((\d+)\s+Days\s+Left\))?/i);
  if (planUpgradeMatch) {
    const days = planUpgradeMatch[1] ? toDevanagariDigits(planUpgradeMatch[1]) : '';
    if (language === 'hi') {
      return days ? `प्लान अपग्रेड करें (${days} दिन शेष)` : 'प्लान अपग्रेड आवश्यक';
    } else {
      return days ? `प्लॅन अपग्रेड करा (${days} दिवस बाकी)` : 'प्लॅन अपग्रेड आवश्यक';
    }
  }

  if (lower.includes('payment received')) return language === 'hi' ? 'भुगतान प्राप्त हुआ' : 'पेमेंट प्राप्त झाले';
  if (lower.includes('payment successful')) return language === 'hi' ? 'भुगतान सफल रहा' : 'पेमेंट यशस्वी झाले';
  if (lower.includes('payment failed')) return language === 'hi' ? 'भुगतान विफल रहा' : 'पेमेंट अयशस्वी झाले';
  if (lower.includes('new bill') || lower.includes('bill generated')) return language === 'hi' ? 'नया बिल बनाया गया' : 'नवीन बिल तयार झाले';
  if (lower.includes('bill settled')) return language === 'hi' ? 'बिल चुकता हुआ' : 'बिल भरले';
  if (lower.includes('order placed')) return language === 'hi' ? 'ऑर्डर प्राप्त हुआ' : 'नवीन ऑर्डर प्राप्त';
  if (lower.includes('kot')) return language === 'hi' ? 'केओटी भेजा गया' : 'केओटी पाठवले';
  if (lower.includes('low stock') || lower.includes('low inventory')) return language === 'hi' ? 'कम स्टॉक अलर्ट' : 'कमी साठा इशारा';
  if (lower.includes('attendance')) return language === 'hi' ? 'कर्मचारी उपस्थिति' : 'कर्मचारी उपस्थिती';
  if (lower.includes('delivery')) return language === 'hi' ? 'डिलीवरी ऑर्डर भेजा गया' : 'डिलिव्हरी ऑर्डर पाठवली';
  if (lower.includes('offer')) return language === 'hi' ? 'ऑफ़र अपडेट' : 'ऑफर अपडेट';
  if (lower.includes('trial') || lower.includes('subscription')) return language === 'hi' ? 'सदस्यता सूचना' : 'सदस्यता सूचना';

  return clean;
};

const cleanAmount = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(/[₹?\s]/g, '').replace(/\.+$/, '');
};

/**
 * Translates notification message description to Marathi or Hindi.
 */
export const translateNotificationMessage = (message: string, language: NotificationLanguage): string => {
  if (!message || language === 'en') return message || '';
  const clean = message.trim();

  // -------------------------------------------------------------
  // Pattern 1: Payment Settlement (Settled for ₹... via CASH / UPI / Ref)
  // E.g.: "Bill #INV-1016 settled for ₹651.00 via CASH (Ref: CASH/REC-269)."
  // -------------------------------------------------------------
  const payMatch1 = clean.match(
    /Bill\s*#?([A-Za-z0-9_-]+)\s+settled\s+for\s+[₹?]?\s*([0-9,.]+)\s+via\s+([A-Za-z0-9_-]+)(?:\s*\((?:Ref:\s*)?([^)]+)\))?/i
  );
  if (payMatch1) {
    const inv = toDevanagariDigits(payMatch1[1]);
    const amt = toDevanagariDigits(cleanAmount(payMatch1[2]));
    const method = translatePaymentMethod(payMatch1[3], language);
    const rawRef = payMatch1[4] ? payMatch1[4].trim() : '';
    const ref = rawRef ? toDevanagariDigits(rawRef) : '';

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

  // E.g.: "Bill #INV-2024-001 settled via UPI for ₹1,450."
  const payMatch2 = clean.match(
    /Bill\s*#?([A-Za-z0-9_-]+)\s+settled\s+via\s+([A-Za-z0-9_-]+)\s+for\s+[₹?]?\s*([0-9,.]+)/i
  );
  if (payMatch2) {
    const inv = toDevanagariDigits(payMatch2[1]);
    const method = translatePaymentMethod(payMatch2[2], language);
    const amt = toDevanagariDigits(cleanAmount(payMatch2[3]));

    if (language === 'hi') {
      return `बिल #${inv} का ₹${amt} भुगतान ${method} द्वारा प्राप्त हुआ।`;
    } else {
      return `बिल #${inv} चे ₹${amt} पेमेंट ${method} द्वारे भरले.`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 2: Bill Generated (with Table and Amount)
  // E.g.: "Bill #INV-1016 for Table Table 01 generated for amount ₹651.00."
  // E.g.: "Bill #INV-2026-089 generated for Table 6. Total ₹1,850."
  // E.g.: "Bill #INV-1016 generated for amount ₹651.00."
  // -------------------------------------------------------------
  const billGenMatch = clean.match(
    /Bill\s*#?([A-Za-z0-9_-]+)(?:\s+(?:for\s+Table|for)\s+(?:Table\s+)?([^,.]+?))?\s+generated(?:\s+(?:for\s+amount|for\s+Table\s+([^,.]+?)\.\s*Total))?\s*[₹?]?\s*([0-9,.]+)/i
  );
  if (billGenMatch) {
    const inv = toDevanagariDigits(billGenMatch[1]);
    let rawTable = billGenMatch[2] || billGenMatch[3] || '';
    rawTable = rawTable.replace(/Table/gi, '').trim();
    const amt = toDevanagariDigits(cleanAmount(billGenMatch[4]));

    if (rawTable) {
      const tNum = toDevanagariDigits(rawTable);
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

  // -------------------------------------------------------------
  // Pattern 3: Dine-In Order Placed
  // E.g.: "Table 4 created order #ORD-104 with 3 items."
  // -------------------------------------------------------------
  const orderMatch = clean.match(
    /Table\s*([A-Za-z0-9-]+)\s+created\s+order\s*#?([A-Za-z0-9_-]+)(?:\s+with\s+(\d+)\s+items?)?/i
  );
  if (orderMatch) {
    const tNum = toDevanagariDigits(orderMatch[1]);
    const ord = toDevanagariDigits(orderMatch[2]);
    const items = orderMatch[3] ? toDevanagariDigits(orderMatch[3]) : '';

    if (language === 'hi') {
      return items
        ? `टेबल ${tNum} ने ऑर्डर #${ord} (${items} वस्तुएं) दिया।`
        : `टेबल ${tNum} ने ऑर्डर #${ord} दिया।`;
    } else {
      return items
        ? `टेबल ${tNum} ने ${items} वस्तूंसाठी ऑर्डर #${ord} दिली.`
        : `टेबल ${tNum} ने ऑर्डर #${ord} दिली.`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 4: Kitchen Order (KOT)
  // E.g.: "KOT #14 sent to Kitchen for Table 2."
  // E.g.: "Order #KOT-104 dispatched to kitchen for Table 02"
  // -------------------------------------------------------------
  const kotMatch = clean.match(
    /(?:Order\s*)?#?\s*KOT\s*#?-?\s*([A-Za-z0-9_-]+)\s+(?:sent|dispatched)\s+to\s+kitchen(?:\s+for\s+Table\s*([A-Za-z0-9-]+))?/i
  );
  if (kotMatch) {
    const kot = toDevanagariDigits(kotMatch[1]);
    const tNum = kotMatch[2] ? toDevanagariDigits(kotMatch[2]) : '';

    if (tNum) {
      if (language === 'hi') return `टेबल ${tNum} के लिए KOT #${kot} रसोई में भेजा गया।`;
      return `टेबल ${tNum} साठी KOT #${kot} किचनमध्ये पाठवले.`;
    } else {
      if (language === 'hi') return `KOT #${kot} रसोई में भेजा गया।`;
      return `KOT #${kot} किचनमध्ये पाठवले.`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 5: Low Stock Alert
  // E.g.: "Coffee Beans (Arabica) stock reached minimum threshold."
  // E.g.: "Paneer & Butter stock below reorder level (2 kg left)"
  // -------------------------------------------------------------
  const stockMatch = clean.match(
    /(.+?)\s+(?:stock\s+(?:reached\s+minimum\s+threshold|below\s+reorder\s+level)|is\s+low)/i
  );
  if (stockMatch) {
    const item = stockMatch[1].trim();
    if (language === 'hi') {
      return `${item} का स्टॉक न्यूनतम स्तर पर पहुंच गया है।`;
    } else {
      return `${item} चा साठा किमान मर्यादेवर पोहोचला आहे.`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 6: Staff Attendance
  // E.g.: "Monthly staff attendance report is updated for this month."
  // -------------------------------------------------------------
  if (/staff\s+attendance.*updated/i.test(clean)) {
    if (language === 'hi') {
      return 'चालू माह की मासिक कर्मचारी उपस्थिति रिपोर्ट अपडेट की गई है।';
    } else {
      return 'या महिन्याचा मासिक कर्मचारी उपस्थिती अहवाल अद्ययावत केला आहे.';
    }
  }

  // -------------------------------------------------------------
  // Pattern 7: Delivery Order Dispatched
  // E.g.: "Delivery order #DEL-ZOM-882 handed over to rider."
  // -------------------------------------------------------------
  const delMatch = clean.match(/Delivery\s+order\s*#?([A-Za-z0-9_-]+)\s+handed\s+over\s+to\s+rider/i);
  if (delMatch) {
    const ord = toDevanagariDigits(delMatch[1]);
    if (language === 'hi') {
      return `डिलीवरी ऑर्डर #${ord} राइडर को सौंप दिया गया।`;
    } else {
      return `डिलिव्हरी ऑर्डर #${ord} रायडरकडे सुपूर्द केली.`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 8: Offers
  // E.g.: 'Offer "Summer Special" (SUMMER20 - 20% OFF) has been successfully activated.'
  // -------------------------------------------------------------
  const offerMatch = clean.match(/Offer\s*"([^"]+)"\s*(?:\(([^)]+)\))?\s*has\s+been\s+successfully\s+activated/i);
  if (offerMatch) {
    const name = offerMatch[1];
    let details = offerMatch[2] ? offerMatch[2].trim() : '';
    details = details
      .replace(/OFF/gi, language === 'hi' ? 'छूट' : 'सूट')
      .replace(/PERCENTAGE/gi, '%');
    details = toDevanagariDigits(details);

    if (language === 'hi') {
      return `ऑफ़र "${name}" (${details}) सफलतापूर्वक सक्रिय हुआ।`;
    } else {
      return `ऑफर "${name}" (${details}) यशस्वीरित्या सक्रिय झाली.`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 9: Plan Activation
  // E.g.: "Enterprise Plan has been activated. Validity valid for 360 days."
  // -------------------------------------------------------------
  const planMatch = clean.match(/(.+?)\s+has\s+been\s+activated\.\s*Validity\s+valid\s+for\s+(\d+)\s+days/i);
  if (planMatch) {
    const plan = planMatch[1].trim();
    const days = toDevanagariDigits(planMatch[2]);
    if (language === 'hi') {
      return `${plan} सक्रिय हो गया है (वैधता: ${days} दिन)।`;
    } else {
      return `${plan} सक्रिय झाला आहे (वैधता: ${days} दिवस).`;
    }
  }

  // -------------------------------------------------------------
  // Pattern 10: Subscription & Trial Notifications
  // -------------------------------------------------------------
  if (clean.includes('Welcome to Ajalkar Hotel Management POS!') && clean.includes('trial has been activated')) {
    const dateMatch = clean.match(/until\s+([0-9-]+)/i);
    const dStr = dateMatch ? toDevanagariDigits(dateMatch[1]) : '';
    if (language === 'hi') {
      return dStr
        ? `अजळकर होटल मैनेजमेंट POS में आपका स्वागत है! आपका २८-दिन का निःशुल्क परीक्षण सक्रिय हो गया है (${dStr} तक)।`
        : 'अजळकर होटल मैनेजमेंट POS में आपका स्वागत है! आपका २८-दिन का निःशुल्क परीक्षण सक्रिय हो गया है।';
    } else {
      return dStr
        ? `अजळकर हॉटेल मॅनेजमेंट POS मध्ये आपले स्वागत आहे! तुमची २८-दिवसांची मोफत चाचणी सक्रिय झाली आहे (${dStr} पर्यंत).`
        : 'अजळकर हॉटेल मॅनेजमेंट POS मध्ये आपले स्वागत आहे! तुमची २८-दिवसांची मोफत चाचणी सक्रिय झाली आहे.';
    }
  }

  if (clean.startsWith('Your free trial expired on')) {
    const dMatch = clean.match(/expired\s+on\s+([^.]+)/i);
    const dStr = dMatch ? toDevanagariDigits(dMatch[1].trim()) : '';
    if (language === 'hi') {
      return `आपका निःशुल्क परीक्षण ${dStr} को समाप्त हो गया। सभी प्रीमियम सुविधाओं के लिए प्लान सब्सक्राइब करें।`;
    } else {
      return `तुमची मोफत चाचणी ${dStr} रोजी संपली. सर्व प्रीमियम वैशिष्ट्यांसाठी प्लॅनची सदस्यता घ्या.`;
    }
  }

  if (clean.startsWith('Your subscription plan expired on')) {
    const dMatch = clean.match(/expired\s+on\s+([^.]+)/i);
    const dStr = dMatch ? toDevanagariDigits(dMatch[1].trim()) : '';
    if (language === 'hi') {
      return `आपका सदस्यता प्लान ${dStr} को समाप्त हो गया। सेवा जारी रखने के लिए अपने प्लान को रिन्यू करें।`;
    } else {
      return `तुमचा सदस्यता प्लॅन ${dStr} रोजी संपला. सेवा सुरू ठेवण्यासाठी प्लॅनचे नूतनीकरण करा.`;
    }
  }

  const subPayMatch = clean.match(
    /Subscription\s+payment\s+of\s+[₹?]?\s*([0-9,.]+)\s*\((.+?)\s+plan\s*-\s*(\d+)\s+months\)\s+has\s+been\s+received\.(?:\s*Transaction ID:\s*([^.]+))?/i
  );
  if (subPayMatch) {
    const amt = toDevanagariDigits(cleanAmount(subPayMatch[1]));
    const plan = subPayMatch[2].trim();
    const months = toDevanagariDigits(subPayMatch[3]);
    const txn = subPayMatch[4] ? toDevanagariDigits(subPayMatch[4].trim()) : '';

    if (language === 'hi') {
      return txn
        ? `₹${amt} का सदस्यता भुगतान (${plan} प्लान - ${months} महीने) प्राप्त हुआ (ट्रांजेक्शन आईडी: ${txn})।`
        : `₹${amt} का सदस्यता भुगतान (${plan} प्लान - ${months} महीने) प्राप्त हुआ।`;
    } else {
      return txn
        ? `₹${amt} चे सदस्यता पेमेंट (${plan} प्लॅन - ${months} महिने) प्राप्त झाले (व्यवहार आयडी: ${txn}).`
        : `₹${amt} चे सदस्यता पेमेंट (${plan} प्लॅन - ${months} महिने) प्राप्त झाले.`;
    }
  }

  const subRenewMatch = clean.match(
    /Your\s+(.+?)\s+subscription\s+has\s+been\s+successfully\s+activated\s+until\s+([^.]+)/i
  );
  if (subRenewMatch) {
    const plan = subRenewMatch[1].trim();
    const until = toDevanagariDigits(subRenewMatch[2].trim());
    if (language === 'hi') {
      return `आपकी ${plan} सदस्यता ${until} तक सफलतापूर्वक सक्रिय हो गई है। धन्यवाद!`;
    } else {
      return `तुमची ${plan} सदस्यता ${until} पर्यंत यशस्वीरित्या सक्रिय झाली आहे. धन्यवाद!`;
    }
  }

  if (clean.includes('will expire in') && (clean.includes('trial') || clean.includes('subscription'))) {
    const daysMatch = clean.match(/in\s+(\d+)\s+days/i);
    const days = daysMatch ? toDevanagariDigits(daysMatch[1]) : '';
    const isTrial = clean.includes('trial');
    if (language === 'hi') {
      return isTrial
        ? `आपका निःशुल्क परीक्षण ${days} दिनों में समाप्त हो जाएगा। निर्बाध सेवा के लिए प्लान रिन्यू करें।`
        : `आपकी सदस्यता ${days} दिनों में समाप्त हो जाएगी। निर्बाध सेवा के लिए प्लान रिन्यू करें।`;
    } else {
      return isTrial
        ? `तुमची मोफत चाचणी ${days} दिवसांत संपेल. अखंड सेवेसाठी प्लॅनचे नूतनीकरण करा.`
        : `तुमची सदस्यता ${days} दिवसांत संपेल. अखंड सेवेसाठी प्लॅनचे नूतनीकरण करा.`;
    }
  }

  if (clean.includes('days left on your') && (clean.includes('trial') || clean.includes('subscription'))) {
    const daysMatch = clean.match(/Only\s+(\d+)\s+days\s+left/i);
    const days = daysMatch ? toDevanagariDigits(daysMatch[1]) : '';
    const isTrial = clean.includes('trial');
    if (language === 'hi') {
      return isTrial
        ? `आपके निःशुल्क परीक्षण के केवल ${days} दिन शेष हैं। अभी अपग्रेड या रिन्यू करें।`
        : `आपकी सदस्यता के केवल ${days} दिन शेष हैं। अभी अपग्रेड या रिन्यू करें।`;
    } else {
      return isTrial
        ? `तुमच्या मोफत चाचणीचे फक्त ${days} दिवस शिल्लक आहेत. आता अपग्रेड किंवा नूतनीकरण करा.`
        : `तुमच्या सदस्यतेचे फक्त ${days} दिवस शिल्लक आहेत. आता अपग्रेड किंवा नूतनीकरण करा.`;
    }
  }

  if (clean.includes('expires tomorrow') && (clean.includes('trial') || clean.includes('subscription'))) {
    const isTrial = clean.includes('trial');
    if (language === 'hi') {
      return isTrial
        ? 'आपका निःशुल्क परीक्षण कल समाप्त हो रहा है। आज ही नवीनीकरण पूरा करें।'
        : 'आपकी सदस्यता कल समाप्त हो रही है। आज ही नवीनीकरण पूरा करें।';
    } else {
      return isTrial
        ? 'तुमची मोफत चाचणी उद्या संपत आहे. आजच नूतनीकरण पूर्ण करा.'
        : 'तुमची सदस्यता उद्या संपत आहे. आजच नूतनीकरण पूर्ण करा.';
    }
  }

  // -------------------------------------------------------------
  // Pattern 11: Table Cleaned / Sanitized
  // E.g.: "Table 05 sanitized and ready for seating"
  // -------------------------------------------------------------
  if (clean.includes('sanitized and ready') || clean.includes('cleaned and ready')) {
    const tMatch = clean.match(/Table\s*([A-Za-z0-9-]+)/i);
    const tNum = tMatch ? toDevanagariDigits(tMatch[1]) : '';
    if (language === 'hi') {
      return tNum ? `टेबल ${tNum} साफ कर दिया गया है और बैठने के लिए तैयार है।` : 'टेबल साफ कर दिया गया है और तैयार है।';
    } else {
      return tNum ? `टेबल ${tNum} स्वच्छ केले असून बसण्यासाठी तयार आहे.` : 'टेबल स्वच्छ केले असून तयार आहे.';
    }
  }

  // -------------------------------------------------------------
  // Pattern 12: Subscription Plan Expiry & Upgrade (<= 10 days remaining / expired)
  // -------------------------------------------------------------
  const planExpMatch = clean.match(/Your\s+subscription\s+plan\s+will\s+expire\s+in\s+(\d+)\s+days/i);
  if (planExpMatch) {
    const days = toDevanagariDigits(planExpMatch[1]);
    if (language === 'hi') {
      return `आपके सब्सक्रिप्शन प्लान के केवल ${days} दिन शेष हैं। कृपया निर्बाध सेवा के लिए अपना प्लान तुरंत अपग्रेड करें।`;
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

  // -------------------------------------------------------------
  // Fallback: translate common keywords & convert numbers to Devanagari
  // -------------------------------------------------------------
  let translated = clean;
  if (language === 'mr') {
    translated = translated
      .replace(/Table\s*Table/gi, 'टेबल')
      .replace(/for Table/gi, 'टेबल साठी')
      .replace(/Table/gi, 'टेबल')
      .replace(/Bill #/gi, 'बिल #')
      .replace(/Order #/gi, 'ऑर्डर #')
      .replace(/KOT #/gi, 'केओटी #')
      .replace(/settled for/gi, 'साठी भरले')
      .replace(/generated for amount/gi, 'रक्कम तयार झाले')
      .replace(/generated for/gi, 'तयार झाले')
      .replace(/via CASH/gi, 'कॅश (रोख) द्वारे')
      .replace(/via UPI/gi, 'यूपीआय द्वारे')
      .replace(/via CARD/gi, 'कार्ड द्वारे')
      .replace(/Ref:/gi, 'संदर्भ:');
  } else if (language === 'hi') {
    translated = translated
      .replace(/Table\s*Table/gi, 'टेबल')
      .replace(/for Table/gi, 'टेबल के लिए')
      .replace(/Table/gi, 'टेबल')
      .replace(/Bill #/gi, 'बिल #')
      .replace(/Order #/gi, 'ऑर्डर #')
      .replace(/KOT #/gi, 'केओटी #')
      .replace(/settled for/gi, 'के लिए चुकता')
      .replace(/generated for amount/gi, 'राशि बनाया गया')
      .replace(/generated for/gi, 'बनाया गया')
      .replace(/via CASH/gi, 'कैश (नकद) द्वारा')
      .replace(/via UPI/gi, 'यूपीआई द्वारा')
      .replace(/via CARD/gi, 'कार्ड द्वारा')
      .replace(/Ref:/gi, 'संदर्भ:');
  }

  return toDevanagariDigits(translated);
};
