// Master Indian Name Localization & Transliteration Engine
// Supports bidirectional translation: English ('en'), Marathi ('mr'), Hindi ('hi')

export type SupportedLang = 'en' | 'mr' | 'hi';

interface NameEntry {
  mr: string;
  hi: string;
  en: string;
}

// Master dictionary of common Indian names and surnames
const NAME_DICTIONARY: Record<string, NameEntry> = {
  // Generic / Default
  guest: { mr: 'अतिथी', hi: 'अतिथि', en: 'Guest' },
  'walk-in guest': { mr: 'अतिथी', hi: 'अतिथि', en: 'Guest' },
  'walk in guest': { mr: 'अतिथी', hi: 'अतिथि', en: 'Guest' },
  walkin: { mr: 'अतिथी', hi: 'अतिथि', en: 'Guest' },

  // First Names (from screenshot & popular)
  ram: { mr: 'राम', hi: 'राम', en: 'Ram' },
  sita: { mr: 'सीता', hi: 'सीता', en: 'Sita' },
  ajinkya: { mr: 'अजिंक्य', hi: 'अजिंक्य', en: 'Ajinkya' },
  jayesh: { mr: 'जयेश', hi: 'जयेश', en: 'Jayesh' },
  prajwal: { mr: 'प्रज्वल', hi: 'प्रज्वल', en: 'Prajwal' },
  rahul: { mr: 'राहुल', hi: 'राहुल', en: 'Rahul' },
  akash: { mr: 'आकाश', hi: 'आकाश', en: 'Akash' },
  amit: { mr: 'अमित', hi: 'अमित', en: 'Amit' },
  rohit: { mr: 'रोहित', hi: 'रोहित', en: 'Rohit' },
  sachin: { mr: 'सचिन', hi: 'सचिन', en: 'Sachin' },
  suresh: { mr: 'सुरेश', hi: 'सुरेश', en: 'Suresh' },
  ramesh: { mr: 'रमेश', hi: 'रमेश', en: 'Ramesh' },
  ganesh: { mr: 'गणेश', hi: 'गणेश', en: 'Ganesh' },
  mahesh: { mr: 'महेश', hi: 'महेश', en: 'Mahesh' },
  vikas: { mr: 'विकास', hi: 'विकास', en: 'Vikas' },
  vishal: { mr: 'विशाल', hi: 'विशाल', en: 'Vishal' },
  priya: { mr: 'प्रिया', hi: 'प्रिया', en: 'Priya' },
  pooja: { mr: 'पूजा', hi: 'पूजा', en: 'Pooja' },
  puja: { mr: 'पूजा', hi: 'पूजा', en: 'Pooja' },
  sneha: { mr: 'स्नेहा', hi: 'स्नेहा', en: 'Sneha' },
  neha: { mr: 'नेहा', hi: 'नेहा', en: 'Neha' },
  aniket: { mr: 'अनिकेत', hi: 'अनिकेत', en: 'Aniket' },
  sagar: { mr: 'सागर', hi: 'सागर', en: 'Sagar' },
  swapnil: { mr: 'स्वप्नील', hi: 'स्वप्निल', en: 'Swapnil' },
  sandeep: { mr: 'संदीप', hi: 'संदीप', en: 'Sandeep' },
  pradeep: { mr: 'प्रदीप', hi: 'प्रदीप', en: 'Pradeep' },
  santosh: { mr: 'संतोष', hi: 'संतोष', en: 'Santosh' },
  chetan: { mr: 'चेतन', hi: 'चेतन', en: 'Chetan' },
  nitin: { mr: 'नितीन', hi: 'नितिन', en: 'Nitin' },
  ashish: { mr: 'आशिष', hi: 'आशीष', en: 'Ashish' },
  abhishek: { mr: 'अभिषेक', hi: 'अभिषेक', en: 'Abhishek' },
  deepak: { mr: 'दीपक', hi: 'दीपक', en: 'Deepak' },
  dinesh: { mr: 'दिनेश', hi: 'दिनेश', en: 'Dinesh' },
  manoj: { mr: 'मनोज', hi: 'मनोज', en: 'Manoj' },
  vijay: { mr: 'विजय', hi: 'विजय', en: 'Vijay' },
  ajay: { mr: 'अजय', hi: 'अजय', en: 'Ajay' },
  sanjay: { mr: 'संजय', hi: 'संजय', en: 'Sanjay' },
  sunita: { mr: 'सुनिता', hi: 'सुनीता', en: 'Sunita' },
  anita: { mr: 'अनिता', hi: 'अनीता', en: 'Anita' },
  geeta: { mr: 'गीता', hi: 'गीता', en: 'Geeta' },
  gita: { mr: 'गीता', hi: 'गीता', en: 'Geeta' },
  laxmi: { mr: 'लक्ष्मी', hi: 'लक्ष्मी', en: 'Laxmi' },
  lakshmi: { mr: 'लक्ष्मी', hi: 'लक्ष्मी', en: 'Laxmi' },
  radhika: { mr: 'राधिका', hi: 'राधिका', en: 'Radhika' },
  ritu: { mr: 'ऋतू', hi: 'ऋतु', en: 'Ritu' },
  mayur: { mr: 'मयूर', hi: 'मयूर', en: 'Mayur' },
  gaurav: { mr: 'गौरव', hi: 'गौरव', en: 'Gaurav' },
  nikhil: { mr: 'निखिल', hi: 'निखिल', en: 'Nikhil' },
  omkar: { mr: 'ओमकार', hi: 'ओमकार', en: 'Omkar' },
  shubham: { mr: 'शुभम', hi: 'शुभम', en: 'Shubham' },
  saurabh: { mr: 'सौरभ', hi: 'सौरभ', en: 'Saurabh' },
  sourabh: { mr: 'सौरभ', hi: 'सौरभ', en: 'Saurabh' },
  akshay: { mr: 'अक्षय', hi: 'अक्षय', en: 'Akshay' },
  tejas: { mr: 'तेजस', hi: 'तेजस', en: 'Tejas' },
  aditya: { mr: 'आदित्य', hi: 'आदित्य', en: 'Aditya' },
  rohan: { mr: 'रोहन', hi: 'रोहन', en: 'Rohan' },
  kunal: { mr: 'कुणाल', hi: 'कुणाल', en: 'Kunal' },
  prashant: { mr: 'प्रशांत', hi: 'प्रशांत', en: 'Prashant' },
  tanmay: { mr: 'तन्मय', hi: 'तन्मय', en: 'Tanmay' },
  parth: { mr: 'पार्थ', hi: 'पार्थ', en: 'Parth' },
  vaibhav: { mr: 'वैभव', hi: 'वैभव', en: 'Vaibhav' },
  harsh: { mr: 'हर्ष', hi: 'हर्ष', en: 'Harsh' },
  harshad: { mr: 'हर्षद', hi: 'हर्षद', en: 'Harshad' },
  krishna: { mr: 'कृष्ण', hi: 'कृष्ण', en: 'Krishna' },
  govind: { mr: 'गोविंद', hi: 'गोविंद', en: 'Govind' },
  balaji: { mr: 'बालाजी', hi: 'बालाजी', en: 'Balaji' },
  shrikant: { mr: 'श्रीकांत', hi: 'श्रीकांत', en: 'Shrikant' },
  vivek: { mr: 'विवेक', hi: 'विवेक', en: 'Vivek' },
  om: { mr: 'ओम', hi: 'ओम', en: 'Om' },
  poonam: { mr: 'पूनम', hi: 'पूनम', en: 'Poonam' },
  punam: { mr: 'पूनम', hi: 'पूनम', en: 'Punam' },
  'abhishek rane': { mr: 'अभिषेक राणे', hi: 'अभिषेक राणे', en: 'Abhishek Rane' },
  'om chaudhari': { mr: 'ओम चौधरी', hi: 'ओम चौधरी', en: 'Om Chaudhari' },
  'om chaudhary': { mr: 'ओम चौधरी', hi: 'ओम चौधरी', en: 'Om Chaudhary' },
  'rahul patil': { mr: 'राहुल पाटील', hi: 'राहुल पाटिल', en: 'Rahul Patil' },
  'kalyani patil': { mr: 'कल्याणी पाटील', hi: 'कल्याणी पाटिल', en: 'Kalyani Patil' },
  'prasad ghongte': { mr: 'प्रसाद घोंगटे', hi: 'प्रसाद घोंगटे', en: 'Prasad Ghongte' },
  'sachin tendulkar': { mr: 'सचिन तेंडुलकर', hi: 'सचिन तेंदुलकर', en: 'Sachin Tendulkar' },
  prasad: { mr: 'प्रसाद', hi: 'प्रसाद', en: 'Prasad' },
  ghongte: { mr: 'घोंगटे', hi: 'घोंगटे', en: 'Ghongte' },
  tendulkar: { mr: 'तेंडुलकर', hi: 'तेंदुलकर', en: 'Tendulkar' },
  'shubham chaudhari': { mr: 'शुभम चौधरी', hi: 'शुभम चौधरी', en: 'Shubham Chaudhari' },
  'pavan chaudhari': { mr: 'पवन चौधरी', hi: 'पवन चौधरी', en: 'Pavan Chaudhari' },
  pune: { mr: 'पुणे', hi: 'पुणे', en: 'Pune' },
  mumbai: { mr: 'मुंबई', hi: 'मुंबई', en: 'Mumbai' },
  nashik: { mr: 'नाशिक', hi: 'नासिक', en: 'Nashik' },
  karvenagar: { mr: 'कर्वेनगर', hi: 'कर्वेनगर', en: 'Karvenagar' },
  trimbakeshwar: { mr: 'त्र्यंबकेश्वर', hi: 'त्र्यंबकेश्वर', en: 'Trimbakeshwar' },
  'main branch': { mr: 'मुख्य शाखा', hi: 'मुख्य शाखा', en: 'Main Branch' },
  'karvenagar braanch': { mr: 'कर्वेनगर शाखा', hi: 'कर्वेनगर शाखा', en: 'Karvenagar Branch' },
  'karvenagar branch': { mr: 'कर्वेनगर शाखा', hi: 'कर्वेनगर शाखा', en: 'Karvenagar Branch' },
  'mumbai branch': { mr: 'मुंबई शाखा', hi: 'मुंबई शाखा', en: 'Mumbai Branch' },
  'nashik branch': { mr: 'नाशिक शाखा', hi: 'नासिक शाखा', en: 'Nashik Branch' },
  'city center branch': { mr: 'सिटी सेंटर शाखा', hi: 'सिटी सेंटर शाखा', en: 'City Center Branch' },
  'hotel premises': { mr: 'हॉटेल परिसर', hi: 'होटल परिसर', en: 'Hotel Premises' },
  'near cst': { mr: 'सीएसटी जवळ', hi: 'सीएसटी के पास', en: 'near cst' },
  'nashik bustop': { mr: 'नाशिक बस स्टॉप', hi: 'नासिक बस स्टॉप', en: 'Nashik Bustop' },
  siddhi: { mr: 'सिद्धी', hi: 'सिद्धि', en: 'Siddhi' },
  kavita: { mr: 'कविता', hi: 'कविता', en: 'Kavita' },

  // Surnames (from screenshot & popular)
  rane: { mr: 'राणे', hi: 'राणे', en: 'Rane' },
  chaudhari: { mr: 'चौधरी', hi: 'चौधरी', en: 'Chaudhari' },
  chaudhary: { mr: 'चौधरी', hi: 'चौधरी', en: 'Chaudhary' },
  kolkar: { mr: 'कोलकर', hi: 'कोलकर', en: 'Kolkar' },
  kolte: { mr: 'कोलते', hi: 'कोलते', en: 'Kolte' },
  patil: { mr: 'पाटील', hi: 'पाटिल', en: 'Patil' },
  gaikwad: { mr: 'गायकवाड', hi: 'गायकवाड़', en: 'Gaikwad' },
  gayakwad: { mr: 'गायकवाड', hi: 'गायकवाड़', en: 'Gaikwad' },
  shinde: { mr: 'शिंदे', hi: 'शिंदे', en: 'Shinde' },
  kadam: { mr: 'कदम', hi: 'कदम', en: 'Kadam' },
  jadhav: { mr: 'जाधव', hi: 'जाधव', en: 'Jadhav' },
  pawar: { mr: 'पवार', hi: 'पवार', en: 'Pawar' },
  bhosale: { mr: 'भोसले', hi: 'भोसले', en: 'Bhosale' },
  bhosle: { mr: 'भोसले', hi: 'भोसले', en: 'Bhosle' },
  chopade: { mr: 'चोपडे', hi: 'चोपड़े', en: 'Chopade' },
  chopde: { mr: 'चोपडे', hi: 'चोपड़े', en: 'Chopde' },
  more: { mr: 'मोरे', hi: 'मोरे', en: 'More' },
  chavan: { mr: 'चव्हाण', hi: 'चव्हाण', en: 'Chavan' },
  deshmukh: { mr: 'देशमुख', hi: 'देशमुख', en: 'Deshmukh' },
  kulkarni: { mr: 'कुलकर्णी', hi: 'कुलकर्णी', en: 'Kulkarni' },
  joshi: { mr: 'जोशी', hi: 'जोशी', en: 'Joshi' },
  sharma: { mr: 'शर्मा', hi: 'शर्मा', en: 'Sharma' },
  verma: { mr: 'वर्मा', hi: 'वर्मा', en: 'Verma' },
  gupta: { mr: 'गुप्ता', hi: 'गुप्ता', en: 'Gupta' },
  singh: { mr: 'सिंह', hi: 'सिंह', en: 'Singh' },
  kumar: { mr: 'कुमार', hi: 'कुमार', en: 'Kumar' },
  kale: { mr: 'काळे', hi: 'काले', en: 'Kale' },
  mane: { mr: 'माने', hi: 'माने', en: 'Mane' },
  sawant: { mr: 'सावंत', hi: 'सावंत', en: 'Sawant' },
  salunkhe: { mr: 'साळुंखे', hi: 'सलुंखे', en: 'Salunkhe' },
  mohite: { mr: 'मोहिते', hi: 'मोहिते', en: 'Mohite' },
  jagtap: { mr: 'जगतप', hi: 'जगतप', en: 'Jagtap' },
  namdev: { mr: 'नामदेव', hi: 'नामदेव', en: 'Namdev' },
  ramdev: { mr: 'रामदेव', hi: 'रामदेव', en: 'Ramdev' },
  'dot dot': { mr: 'डॉट डॉट', hi: 'डॉट डॉट', en: 'Dot Dot' },
  'rajesh patil': { mr: 'राजेश पाटील', hi: 'राजेश पाटिल', en: 'Rajesh Patil' },
  'vivek chopade': { mr: 'विवेक चोपडे', hi: 'विवेक चोपड़े', en: 'Vivek Chopade' },
  'balaji traders': { mr: 'बालाजी ट्रेडर्स', hi: 'बालाजी ट्रेडर्स', en: 'Balaji Traders' },
  'jagadamb super market': { mr: 'जगदंब सुपर मार्केट', hi: 'जगदंब सुपर मार्केट', en: 'Jagadamb Super Market' },
  'vivek enterprises': { mr: 'विवेक एंटरप्रायझेस', hi: 'विवेक एंटरप्राइजेज', en: 'Vivek Enterprises' },
  'sahyadri agro supplies': { mr: 'सह्याद्री ॲग्रो सप्लाय', hi: 'सह्याद्री एग्रो सप्लाइज', en: 'Sahyadri Agro Supplies' },
  'store manager': { mr: 'स्टोअर मॅनेजर', hi: 'स्टोर मैनेजर', en: 'Store Manager' },
  'test customer3': { mr: 'चाचणी ग्राहक ३', hi: 'परीक्षण ग्राहक ३', en: 'Test Customer3' },
  'test guest': { mr: 'चाचणी अतिथी', hi: 'परीक्षण अतिथि', en: 'Test Guest' },
  'duplicate test guest': { mr: 'चाचणी अतिथी', hi: 'परीक्षण अतिथि', en: 'Duplicate Test Guest' },
  'workflow test guest': { mr: 'चाचणी अतिथी', hi: 'परीक्षण अतिथि', en: 'Workflow Test Guest' },
  'clean flow test': { mr: 'चाचणी ग्राहक', hi: 'परीक्षण ग्राहक', en: 'Clean Flow Test' },
  'rajesh test': { mr: 'राजेश टेस्ट', hi: 'राजेश टेस्ट', en: 'Rajesh Test' },
  'sanjay test': { mr: 'संजय टेस्ट', hi: 'संजय टेस्ट', en: 'Sanjay Test' },
  'priya & friends': { mr: 'प्रिया आणि मित्र', hi: 'प्रिया और मित्र', en: 'Priya & Friends' },
  kalyani: { mr: 'कल्याणी', hi: 'कल्याणी', en: 'Kalyani' },
  roshan: { mr: 'रोशन', hi: 'रोशन', en: 'Roshan' },
  suman: { mr: 'सुमन', hi: 'सुमन', en: 'Suman' },
  guest4: { mr: 'अतिथी ४', hi: 'अतिथि ४', en: 'Guest4' },
  guest9: { mr: 'अतिथी ९', hi: 'अतिथि ९', en: 'Guest9' },
  guest10: { mr: 'अतिथी १०', hi: 'अतिथि १०', en: 'Guest10' },
  guest11: { mr: 'अतिथी ११', hi: 'अतिथि ११', en: 'Guest11' },
  ddd: { mr: 'अतिथी (ddd)', hi: 'अतिथि (ddd)', en: 'ddd' },
};

// Reverse lookup map from Devanagari to English
const DEVANAGARI_TO_ENGLISH = new Map<string, string>();
Object.values(NAME_DICTIONARY).forEach((entry) => {
  DEVANAGARI_TO_ENGLISH.set(entry.mr.trim(), entry.en);
  DEVANAGARI_TO_ENGLISH.set(entry.hi.trim(), entry.en);
});
// Common generic Devanagari guest terms and alternates
DEVANAGARI_TO_ENGLISH.set('अतिथी', 'Guest');
DEVANAGARI_TO_ENGLISH.set('अतिथि', 'Guest');
DEVANAGARI_TO_ENGLISH.set('कोळकर', 'Kolkar');
DEVANAGARI_TO_ENGLISH.set('कोलकर', 'Kolkar');
DEVANAGARI_TO_ENGLISH.set('कोळते', 'Kolte');
DEVANAGARI_TO_ENGLISH.set('कोलते', 'Kolte');

// Algorithmic phonetic transliteration fallback for Indian names (Latin -> Devanagari)
function phoneticTransliterate(word: string, isMarathi = true): string {
  if (!word) return '';
  const w = word.toLowerCase();

  // Multi-char replacements
  const mapping: [RegExp, string][] = [
    [/ksh/g, 'क्ष'],
    [/dny|jny/g, 'ज्ञ'],
    [/shr/g, 'श्र'],
    [/kh/g, 'ख'],
    [/gh/g, 'घ'],
    [/chh/g, 'छ'],
    [/ch/g, 'च'],
    [/jh/g, 'झ'],
    [/th/g, 'थ'],
    [/dh/g, 'ध'],
    [/ph/g, 'फ'],
    [/bh/g, 'भ'],
    [/sh/g, 'श'],
    [/ee|ii/g, 'ी'],
    [/oo|uu/g, 'ू'],
    [/ai/g, 'ै'],
    [/au|ou/g, 'ौ'],
    [/aa/g, 'ा'],
    [/k/g, 'क'],
    [/g/g, 'ग'],
    [/j/g, 'ज'],
    [/t/g, 'त'],
    [/d/g, 'द'],
    [/n/g, 'न'],
    [/p/g, 'प'],
    [/b/g, 'ब'],
    [/m/g, 'म'],
    [/y/g, 'य'],
    [/r/g, 'र'],
    [/l/g, isMarathi ? 'ळ' : 'ल'],
    [/v|w/g, 'व'],
    [/s/g, 'स'],
    [/h/g, 'ह'],
    [/i/g, 'ि'],
    [/u/g, 'ु'],
    [/e/g, 'े'],
    [/o/g, 'ो'],
    [/a/g, 'ा'],
  ];

  let result = w;
  for (const [pattern, replacement] of mapping) {
    result = result.replace(pattern, replacement);
  }

  // If the word starts with a matra vowel, convert to independent vowel
  const startVowels: [string, string][] = [
    ['ा', 'आ'],
    ['ि', 'इ'],
    ['ी', 'ई'],
    ['ु', 'उ'],
    ['ू', 'ऊ'],
    ['े', 'ए'],
    ['ै', 'ऐ'],
    ['ो', 'ओ'],
    ['ौ', 'औ'],
  ];
  for (const [matra, independent] of startVowels) {
    if (result.startsWith(matra)) {
      result = independent + result.slice(matra.length);
      break;
    }
  }

  return result;
}

/**
 * Localizes a single word name
 */
function localizeSingleWord(word: string, lang: SupportedLang): string {
  const clean = word.trim();
  if (!clean) return '';

  const lower = clean.toLowerCase();

  // 1. Direct dictionary match
  if (NAME_DICTIONARY[lower]) {
    if (lang === 'mr') return NAME_DICTIONARY[lower].mr;
    if (lang === 'hi') return NAME_DICTIONARY[lower].hi;
    return NAME_DICTIONARY[lower].en;
  }

  // 2. If user selected English ('en')
  if (lang === 'en') {
    // If it's already in Devanagari, convert back to English if known
    if (DEVANAGARI_TO_ENGLISH.has(clean)) {
      return DEVANAGARI_TO_ENGLISH.get(clean)!;
    }
    // If it's Latin, keep capitalized original
    return clean;
  }

  // 3. If target is Marathi or Hindi
  // If already Devanagari, adjust for Hindi vs Marathi if known
  if (DEVANAGARI_TO_ENGLISH.has(clean)) {
    const enName = DEVANAGARI_TO_ENGLISH.get(clean)!.toLowerCase();
    if (NAME_DICTIONARY[enName]) {
      return lang === 'mr' ? NAME_DICTIONARY[enName].mr : NAME_DICTIONARY[enName].hi;
    }
    return clean;
  }

  // 4. Phonetic fallback for unknown names
  return phoneticTransliterate(clean, lang === 'mr');
}

/**
 * Main export: Localizes a guest name (single word or full name with first/last names)
 * across English, Marathi, and Hindi.
 */
export function localizeGuestName(name?: string, lang: SupportedLang = 'en'): string {
  if (!name) {
    if (lang === 'mr') return 'अतिथी';
    if (lang === 'hi') return 'अतिथि';
    return 'Guest';
  }

  const trimmed = name.trim();
  if (!trimmed) {
    if (lang === 'mr') return 'अतिथी';
    if (lang === 'hi') return 'अतिथि';
    return 'Guest';
  }

  const lower = trimmed.toLowerCase();

  // Check full multi-word name in dictionary first (e.g. "Ajinkya Kolkar", "Walk-in Guest")
  if (NAME_DICTIONARY[lower]) {
    if (lang === 'mr') return NAME_DICTIONARY[lower].mr;
    if (lang === 'hi') return NAME_DICTIONARY[lower].hi;
    return NAME_DICTIONARY[lower].en;
  }

  // If Devanagari full string matches reverse lookup
  if (DEVANAGARI_TO_ENGLISH.has(trimmed)) {
    const enEquivalent = DEVANAGARI_TO_ENGLISH.get(trimmed)!;
    if (lang === 'en') return enEquivalent;
    const lowerEn = enEquivalent.toLowerCase();
    if (NAME_DICTIONARY[lowerEn]) {
      return lang === 'mr' ? NAME_DICTIONARY[lowerEn].mr : NAME_DICTIONARY[lowerEn].hi;
    }
  }

  // Split into words and localize each token
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => localizeSingleWord(w, lang)).join(' ');
  }

  return localizeSingleWord(trimmed, lang);
}

// Master Menu Item & Dish Name Translations
export const MENU_ITEM_TRANSLATIONS: Record<string, { mr: string; hi: string }> = {
  "paneer tikka": { mr: "पनीर टिक्का", hi: "पनीर टिक्का" },
  "chicken tikka": { mr: "चिकन टिक्का", hi: "चिकन टिक्का" },
  "veg spring rolls": { mr: "व्हेज स्प्रिंग रोल्स", hi: "वेज स्प्रिंग रोल्स" },
  "spring rolls": { mr: "स्प्रिंग रोल्स", hi: "स्प्रिंग रोल्स" },
  "chicken crispy": { mr: "चिकन क्रिस्पी", hi: "चिकन क्रिस्पी" },
  "veg crispy": { mr: "व्हेज क्रिस्पी", hi: "वेज क्रिस्पी" },
  "chicken lollipop": { mr: "चिकन लॉलिपॉप", hi: "चिकन लॉलीपॉप" },
  "chicken 65": { mr: "चिकन ६५", hi: "चिकन ६५" },
  "paneer chilli": { mr: "पनीर चिली", hi: "पनीर चिल्ली" },
  "chicken chilli": { mr: "चिकन चिली", hi: "चिकन चिल्ली" },
  "veg manchurian": { mr: "व्हेज मंचुरियन", hi: "वेज मंचूरियन" },
  "chicken manchurian": { mr: "चिकन मंचुरियन", hi: "चिकन मंचूरियन" },
  "gobi manchurian": { mr: "गोबी मंचुरियन", hi: "गोभी मंचूरियन" },
  "french fries": { mr: "फ्रेंच फ्राईज", hi: "फ्रेंच फ्राइज़" },
  "test burger": { mr: "टेस्ट बर्गर", hi: "टेस्ट बर्गर" },
  "burger": { mr: "बर्गर", hi: "बर्गर" },
  "veg burger": { mr: "व्हेज बर्गर", hi: "वेज बर्गर" },
  "chicken burger": { mr: "चिकन बर्गर", hi: "चिकन बर्गर" },
  "cheese burger": { mr: "चीज बर्गर", hi: "चीज़ बर्गर" },
  "sandwich": { mr: "सँडविच", hi: "सैंडविच" },
  "veg sandwich": { mr: "व्हेज सँडविच", hi: "वेज सैंडविच" },
  "cheese sandwich": { mr: "चीज सँडविच", hi: "चीज़ सैंडविच" },
  "pizza": { mr: "पिझ्झा", hi: "पिज़्ज़ा" },
  "butter chicken": { mr: "बटर चिकन", hi: "बटर चिकन" },
  "chicken biryani": { mr: "चिकन बिर्याणी", hi: "चिकन बिरयानी" },
  "chicken curry": { mr: "चिकन करी", hi: "चिकन करी" },
  "chicken masala": { mr: "चिकन मसाला", hi: "चिकन मसाला" },
  "chicken handi": { mr: "चिकन हांडी", hi: "चिकन हांडी" },
  "chicken sukka": { mr: "चिकन सुक्का", hi: "चिकन सुक्का" },
  "mutton biryani": { mr: "मटन बिर्याणी", hi: "मटन बिरयानी" },
  "mutton curry": { mr: "मटन करी", hi: "मटन करी" },
  "egg biryani": { mr: "अंडे बिर्याणी", hi: "अंडा बिरयानी" },
  "egg curry": { mr: "अंडे करी", hi: "अंडा करी" },
  "fish fry": { mr: "फिश फ्राय", hi: "फिश फ्राई" },
  "dal tadka": { mr: "दाल तडका", hi: "दाल तड़का" },
  "dal fry": { mr: "दाल फ्राय", hi: "दाल फ्राई" },
  "dal makhani": { mr: "दाल मखनी", hi: "दाल मखनी" },
  "paneer butter masala": { mr: "पनीर बटर मसाला", hi: "पनीर बटर मसाला" },
  "kadai paneer": { mr: "कढई पनीर", hi: "कड़ाही पनीर" },
  "shahi paneer": { mr: "शाही पनीर", hi: "शाही पनीर" },
  "matar paneer": { mr: "मटार पनीर", hi: "मटर पनीर" },
  "palak paneer": { mr: "पालक पनीर", hi: "पालक पनीर" },
  "kaju curry": { mr: "काजू करी", hi: "काजू करी" },
  "kaju masala": { mr: "काजू मसाला", hi: "काजू मसाला" },
  "veg biryani": { mr: "व्हेज बिर्याणी", hi: "वेज बिरयानी" },
  "jeera rice": { mr: "जिरा राईस", hi: "जीरा राइस" },
  "steamed rice": { mr: "साधा भात", hi: "सादा चावल" },
  "plain rice": { mr: "साधा भात", hi: "सादा चावल" },
  "dal khichdi": { mr: "दाल खिचडी", hi: "दाल खिचड़ी" },
  "veg fried rice": { mr: "व्हेज फ्राईड राईस", hi: "वेज फ्राइड राइस" },
  "fried rice": { mr: "फ्राईड राईस", hi: "फ्राइड राइस" },
  "chicken fried rice": { mr: "चिकन फ्राईड राईस", hi: "चिकन फ्राइड राइस" },
  "veg hakka noodles": { mr: "व्हेज हक्का नूडल्स", hi: "वेज हक्का नूडल्स" },
  "hakka noodles": { mr: "हक्का नूडल्स", hi: "हक्का नूडल्स" },
  "chicken noodles": { mr: "चिकन नूडल्स", hi: "चिकन नूडल्स" },
  "roti": { mr: "रोटी", hi: "रोटी" },
  "butter roti": { mr: "बटर रोटी", hi: "बटर रोटी" },
  "tandoori roti": { mr: "तंदुरी रोटी", hi: "तंदूरी रोटी" },
  "chapati": { mr: "चपाती", hi: "चपाती" },
  "butter chapati": { mr: "बटर चपाती", hi: "बटर चपाती" },
  "naan": { mr: "नान", hi: "नान" },
  "butter naan": { mr: "बटर नान", hi: "बटर नान" },
  "garlic naan": { mr: "गार्लिक नान", hi: "गार्लिक नान" },
  "papad": { mr: "पापड", hi: "पापड़" },
  "masala papad": { mr: "मसाला पापड", hi: "मसाला पापड़" },
  "roasted papad": { mr: "भाजलेला पापड", hi: "भुना पापड़" },
  "fried papad": { mr: "तळलेला पापड", hi: "तला पापड़" },
  "gulab jamun": { mr: "गुलाब जामुन", hi: "गुलाब जामुन" },
  "ice cream": { mr: "आईस्क्रीम", hi: "आइसक्रीम" },
  "tea": { mr: "चहा", hi: "चाय" },
  "chai": { mr: "चहा", hi: "चाय" },
  "coffee": { mr: "कॉफी", hi: "कॉफी" },
  "cold drink": { mr: "कोल्ड ड्रिंक", hi: "कोल्ड ड्रिंक" },
  "raita": { mr: "रायता", hi: "रायता" },
  "masala dosa": { mr: "मसाला डोसा", hi: "मसाला डोसा" },
  "idli": { mr: "इडली", hi: "इडली" },
  "test dish": { mr: "टेस्ट डिश", hi: "टेस्ट डिश" },
  "water bottle": { mr: "पाण्याची बाटली", hi: "पानी की बोतल" },
  "mineral water": { mr: "मिनरल वॉटर", hi: "मिनरल वाटर" },
  "brownie": { mr: "ब्राउनी", hi: "ब्राउनी" },
  "fresh lime soda": { mr: "फ्रेश लाइम सोडा", hi: "फ्रेश लाइम सोडा" },
  "cold coffee": { mr: "कोल्ड कॉफी", hi: "कोल्ड कॉफी" },
  "rice (basmati)": { mr: "बासमती तांदूळ", hi: "बासमती चावल" },
  "basmati rice": { mr: "बासमती तांदूळ", hi: "बासमती चावल" },
  "rice": { mr: "तांदूळ", hi: "चावल" },
  "cooking oil": { mr: "खाद्यतेल", hi: "खाद्य तेल" },
  "sunflower oil": { mr: "सूर्यफूल तेल", hi: "सूरजमुखी तेल" },
  "gemini sunflower oil": { mr: "जेमिनी सूर्यफूल तेल", hi: "जेमिनी सूरजमुखी तेल" },
  "mustard oil": { mr: "मोहरीचे तेल", hi: "सरसों का तेल" },
  "soybean oil": { mr: "सोयाबीन तेल", hi: "सोयाबीन तेल" },
  "oil": { mr: "तेल", hi: "तेल" },
  "sugar": { mr: "साखर", hi: "चीनी" },
  "shegdana": { mr: "शेंगदाणे", hi: "मूंगफली" },
  "salt": { mr: "मीठ", hi: "नमक" },
  "wheat": { mr: "गहू", hi: "गेहूं" },
  "atta": { mr: "गव्हाचे पीठ", hi: "गेहूं का आटा" },
  "wheat flour": { mr: "गव्हाचे पीठ", hi: "गेहूं का आटा" },
  "maida": { mr: "मैदा", hi: "मैदा" },
  "milk": { mr: "दूध", hi: "दूध" },
  "tea powder": { mr: "चहा पावडर", hi: "चाय पत्ती" },
  "tur dal": { mr: "तूर डाळ", hi: "अरहर दाल" },
  "chana dal": { mr: "चणा डाळ", hi: "चना दाल" },
  "moong dal": { mr: "मूग डाळ", hi: "मूंग दाल" },
  "onion": { mr: "कांदा", hi: "प्याज" },
  "potato": { mr: "बटाटा", hi: "आलू" },
  "tomato": { mr: "टोमॅटो", hi: "टमाटर" },
  "ginger": { mr: "आले", hi: "अदरक" },
  "garlic": { mr: "लसूण", hi: "लहसुन" },
  "paneer": { mr: "पनीर", hi: "पनीर" },
  "butter": { mr: "बटर", hi: "बटर / मक्खन" },
  "cheese": { mr: "चीज", hi: "चीज" },
  "chilli powder": { mr: "मिरची पावडर", hi: "लाल मिर्च पाउडर" },
  "red chilli powder": { mr: "लाल मिरची पावडर", hi: "लाल मिर्च पाउडर" },
  "turmeric": { mr: "हळद", hi: "हल्दी" },
  "turmeric powder": { mr: "हळद पावडर", hi: "हल्दी पाउडर" },
  "coriander": { mr: "कोथिंबीर", hi: "धनिया" },
  "coriander powder": { mr: "धने पावडर", hi: "धनिया पाउडर" },
  "cumin": { mr: "जिरे", hi: "जीरा" },
  "jeera": { mr: "जिरे", hi: "जीरा" },
  "garam masala": { mr: "गरम मसाला", hi: "गरम मसाला" },
};

export const MENU_CANONICAL_EN: Record<string, string> = {
  "rice (basmati)": "Rice (Basmati)",
  "basmati rice": "Rice (Basmati)",
  "rice": "Rice",
  "cooking oil": "Cooking Oil",
  "oil": "Oil",
  "sunflower oil": "Sunflower Oil",
  "gemini sunflower oil": "Gemini Sunflower Oil",
  "mustard oil": "Mustard Oil",
  "soybean oil": "Soybean Oil",
  "sugar": "Sugar",
  "salt": "Salt",
  "shegdana": "Peanuts (Shegdana)",
  "wheat": "Wheat",
  "atta": "Atta (Wheat Flour)",
  "wheat flour": "Wheat Flour",
  "maida": "Maida",
  "milk": "Milk",
  "tea powder": "Tea Powder",
  "tur dal": "Tur Dal",
  "chana dal": "Chana Dal",
  "moong dal": "Moong Dal",
  "onion": "Onion",
  "potato": "Potato",
  "tomato": "Tomato",
  "ginger": "Ginger",
  "garlic": "Garlic",
  "paneer": "Paneer",
  "butter": "Butter",
  "cheese": "Cheese",
  "chilli powder": "Chilli Powder",
  "red chilli powder": "Red Chilli Powder",
  "turmeric": "Turmeric",
  "turmeric powder": "Turmeric Powder",
  "coriander": "Coriander",
  "coriander powder": "Coriander Powder",
  "cumin": "Cumin",
  "jeera": "Jeera",
  "garam masala": "Garam Masala",
};

const DEVANAGARI_TO_MENU_KEY = new Map<string, string>();
Object.entries(MENU_ITEM_TRANSLATIONS).forEach(([enKey, val]) => {
  if (val.mr) DEVANAGARI_TO_MENU_KEY.set(val.mr.trim().toLowerCase(), enKey);
  if (val.hi) DEVANAGARI_TO_MENU_KEY.set(val.hi.trim().toLowerCase(), enKey);
});

const DISH_WORD_MAP: Record<string, { mr: string; hi: string }> = {
  test: { mr: "टेस्ट", hi: "टेस्ट" },
  burger: { mr: "बर्गर", hi: "बर्गर" },
  pizza: { mr: "पिझ्झा", hi: "पिज़्ज़ा" },
  sandwich: { mr: "सँडविच", hi: "सैंडविच" },
  fries: { mr: "फ्राईज", hi: "फ्राइज़" },
  french: { mr: "फ्रेंच", hi: "फ्रेंच" },
  paneer: { mr: "पनीर", hi: "पनीर" },
  chicken: { mr: "चिकन", hi: "चिकन" },
  mutton: { mr: "मटन", hi: "मटन" },
  fish: { mr: "फिश", hi: "फिश" },
  egg: { mr: "अंडे", hi: "अंडा" },
  veg: { mr: "व्हेज", hi: "वेज" },
  tikka: { mr: "टिक्का", hi: "टिक्का" },
  butter: { mr: "बटर", hi: "बटर" },
  biryani: { mr: "बिर्याणी", hi: "बिरयानी" },
  dal: { mr: "दाल", hi: "दाल" },
  tadka: { mr: "तडका", hi: "तड़का" },
  fry: { mr: "फ्राय", hi: "फ्राई" },
  rice: { mr: "राईस", hi: "राइस" },
  roti: { mr: "रोटी", hi: "रोटी" },
  naan: { mr: "नान", hi: "नान" },
  chapati: { mr: "चपाती", hi: "चपाती" },
  masala: { mr: "मसाला", hi: "मसाला" },
  curry: { mr: "करी", hi: "करी" },
  handi: { mr: "हांडी", hi: "हांडी" },
  kadai: { mr: "कढई", hi: "कड़ाही" },
  kaju: { mr: "काजू", hi: "काजू" },
  crispy: { mr: "क्रिस्पी", hi: "क्रिस्पी" },
  manchurian: { mr: "मंचुरियन", hi: "मंचूरियन" },
  noodles: { mr: "नूडल्स", hi: "नूडल्स" },
  spring: { mr: "स्प्रिंग", hi: "स्प्रिंग" },
  rolls: { mr: "रोल्स", hi: "रोल्स" },
  soup: { mr: "सूप", hi: "सूप" },
  salad: { mr: "सॅलड", hi: "सलाद" },
  papad: { mr: "पापड", hi: "पापड़" },
  chaas: { mr: "ताक", hi: "छाछ" },
  lassi: { mr: "लस्सी", hi: "लस्सी" },
  tea: { mr: "चहा", hi: "चाय" },
  chai: { mr: "चहा", hi: "चाय" },
  coffee: { mr: "कॉफी", hi: "कॉफी" },
  brownie: { mr: "ब्राउनी", hi: "ब्राउनी" },
  soda: { mr: "सोडा", hi: "सोडा" },
  special: { mr: "स्पेशल", hi: "स्पेशल" },
  half: { mr: "हाफ", hi: "हाफ" },
  full: { mr: "फुल", hi: "फुल" },
};

export function getLocalizedMenuItemName(name?: string, lang: SupportedLang = "en"): string {
  if (!name) return "";
  const clean = name.trim();
  if (!clean) return "";

  const lower = clean.toLowerCase();

  // Find canonical English key if input is in Devanagari or English
  let canonicalEnKey = lower;
  if (DEVANAGARI_TO_MENU_KEY.has(lower)) {
    canonicalEnKey = DEVANAGARI_TO_MENU_KEY.get(lower)!;
  }

  if (lang === "en") {
    if (MENU_CANONICAL_EN[canonicalEnKey]) {
      return MENU_CANONICAL_EN[canonicalEnKey];
    }
    if (DEVANAGARI_TO_ENGLISH.has(clean)) {
      return DEVANAGARI_TO_ENGLISH.get(clean)!;
    }
    return clean;
  }

  // Target is Marathi or Hindi
  if (MENU_ITEM_TRANSLATIONS[canonicalEnKey]) {
    return MENU_ITEM_TRANSLATIONS[canonicalEnKey][lang];
  }

  // Word-level composite translation
  let translated = clean;
  let hasReplaced = false;

  Object.entries(DISH_WORD_MAP).forEach(([word, translations]) => {
    const reg = new RegExp(`\\b${word}\\b`, "gi");
    if (reg.test(translated)) {
      translated = translated.replace(reg, translations[lang]);
      hasReplaced = true;
    }
  });

  return hasReplaced ? translated : clean;
}

export const MENU_ITEM_DESCRIPTIONS: Record<string, { mr: string; hi: string }> = {
  "char-grilled cottage cheese with spices": { mr: "मसाल्यांसह भाजलेले पनीर", hi: "मसालों के साथ भुना हुआ पनीर" },
  "classic tandoori chicken tikka": { mr: "क्लासिक तंदुरी चिकन टिक्का", hi: "क्लासिक तंदूरी चिकन टिक्का" },
  "crispy rolls with mixed vegetables": { mr: "मिश्र भाज्यांचे कुरकुरीत रोल्स", hi: "मिश्रित सब्जियों के कुरकुरे रोल्स" },
  "creamy tomato-based chicken curry": { mr: "टोमॅटो ग्रेव्हीमधील मलाईदार चिकन करी", hi: "टमाटर ग्रेवी में मलाईदार चिकन करी" },
  "paneer in rich tomato gravy": { mr: "घट्ट टोमॅटो ग्रेव्हीमध्ये पनीर", hi: "गाढ़ी टमाटर ग्रेवी में पनीर" },
  "yellow lentils finished with tempering": { mr: "तडका दिलेली पिवळी डाळ", hi: "तड़के वाली पीली दाल" },
  "fragrant basmati rice and vegetables": { mr: "सुगंधी बासमती तांदूळ आणि भाज्या", hi: "सुगंधित बासमती चावल और सब्जियां" },
  "aromatic basmati chicken biryani": { mr: "सुगंधी बासमती चिकन बिर्याणी", hi: "सुगंधित बासमती चिकन बिरयानी" },
  "long grain steamed basmati rice": { mr: "लांब दाण्याचा उकडलेला बासमती भात", hi: "लंबे दाने वाला उबला बासमती चावल" },
  "soft tandoori naan with butter": { mr: "बटरसह मऊ तंदुरी नान", hi: "मक्खन के साथ नरम तंदूरी नान" },
  "garlic finished tandoori naan": { mr: "लसूण चवीचा तंदुरी नान", hi: "लहसुन के स्वाद वाला तंदूरी नान" },
  "traditional clay oven roti": { mr: "पारंपरिक मातीच्या भट्टीतील रोटी", hi: "पारंपरिक तंदूरी रोटी" },
  "papad topped with onion and tomato": { mr: "कांदा आणि टोमॅटो घातलेला पापड", hi: "प्याज और टमाटर से सजा पापड़" },
  "crispy salted fries": { mr: "कुरकुरीत मीठ घातलेले फ्राईज", hi: "कुरकुरे नमकीन फ्राइज़" },
  "warm syrup-soaked dumplings": { mr: "गरम पाकातील गुलाब जामुन", hi: "गरम चाशनी में डूबे गुलाब जामुन" },
  "warm chocolate brownie": { mr: "गरम चॉकलेट ब्राउनी", hi: "गरम चॉकलेट ब्राउनी" },
  "fresh lime with soda": { mr: "सोडासह ताजे लिंबू पाणी", hi: "सोडा के साथ ताज़ा नींबू पानी" },
  "chilled creamy coffee": { mr: "थंडगार मलाईदार कॉफी", hi: "ठंडी मलाईदार कॉफी" },
};

export function getLocalizedMenuDescription(desc?: string, lang: SupportedLang = "en"): string {
  if (!desc) return "";
  if (lang === "en") return desc;
  const lower = desc.trim().toLowerCase();
  if (MENU_ITEM_DESCRIPTIONS[lower]) {
    return MENU_ITEM_DESCRIPTIONS[lower][lang];
  }
  return desc;
}

export function formatTableName(name?: string, lang: SupportedLang = "en"): string {
  if (!name) return "";
  let clean = name.trim();
  if (!clean || clean === "--" || clean === "Table --" || clean === "टेबल --") {
    return lang === "en" ? "Table --" : "टेबल --";
  }
  const devNums = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

  // Strip all repeated leading prefixes: Table, टेबल, Table No, No., No, #
  while (/^(table|टेबल|no[:.]?|#)+/i.test(clean)) {
    clean = clean.replace(/^(table|टेबल|no[:.]?|#)\s*[:.-]?\s*/i, "").trim();
  }

  // Strip "T-" or "T" prefix if followed by a number (e.g. "T-01" -> "01", "T2" -> "2")
  if (/^t-?\s*\d+/i.test(clean)) {
    clean = clean.replace(/^t-?\s*/i, "").trim();
  }

  if (!clean) return lang === "en" ? "Table" : "टेबल";

  if (lang === "en") {
    let res = clean.replace(/[०-९]/g, (ch) => String(devNums.indexOf(ch)));
    return `Table ${res}`;
  }

  // Marathi / Hindi
  let res = clean.replace(/\d/g, (d) => devNums[Number(d)]);
  return `टेबल ${res}`;
}

/**
 * Safely looks up an exact match in NAME_DICTIONARY without phonetic transliteration.
 * Useful for t() lookup so arbitrary UI text is never mangled.
 */
export function lookupExactName(name?: string, lang: SupportedLang = "en"): string | null {
  if (!name) return null;
  const clean = name.trim();
  if (!clean) return null;

  const lower = clean.toLowerCase();
  if (NAME_DICTIONARY[lower]) {
    if (lang === 'mr') return NAME_DICTIONARY[lower].mr;
    if (lang === 'hi') return NAME_DICTIONARY[lower].hi;
    return NAME_DICTIONARY[lower].en;
  }

  if (DEVANAGARI_TO_ENGLISH.has(clean)) {
    const enName = DEVANAGARI_TO_ENGLISH.get(clean)!.toLowerCase();
    if (NAME_DICTIONARY[enName]) {
      if (lang === 'mr') return NAME_DICTIONARY[enName].mr;
      if (lang === 'hi') return NAME_DICTIONARY[enName].hi;
      return NAME_DICTIONARY[enName].en;
    }
    if (lang === 'en') return DEVANAGARI_TO_ENGLISH.get(clean)!;
  }

  // Check grocery / menu item exact translations
  let canonicalKey = lower;
  if (DEVANAGARI_TO_MENU_KEY.has(lower)) {
    canonicalKey = DEVANAGARI_TO_MENU_KEY.get(lower)!;
  }

  if (MENU_ITEM_TRANSLATIONS[canonicalKey]) {
    if (lang === 'mr') return MENU_ITEM_TRANSLATIONS[canonicalKey].mr;
    if (lang === 'hi') return MENU_ITEM_TRANSLATIONS[canonicalKey].hi;
    return MENU_CANONICAL_EN[canonicalKey] || canonicalKey;
  }

  return null;
}


