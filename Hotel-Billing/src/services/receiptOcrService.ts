/**
 * Receipt & Photo List OCR Parser Service
 * Extracts grocery/inventory items from images of handwritten lists, thermal bills, or supplier invoices.
 */

// Tesseract OCR loader (dynamically resolved if available)
const getTesseract = async (): Promise<any> => {
  try {
    const mod = await (Function('return import("tesseract.js")')() as Promise<any>);
    return mod.default || mod;
  } catch {
    throw new Error('tesseract.js is not installed');
  }
};

export interface ParsedPurchaseItem {
  id: number;
  name: string;
  unit: 'Kg' | 'Ltr' | 'Pcs' | 'Box' | 'Pack';
  qty: number;
  rate: number;
  discount: number;
  tax: number;
}

// Convert Devanagari numerals (०-९) to Arabic numerals (0-9)
export function normalizeDevanagariDigits(str: string): string {
  const devDigits = '०१२३४५६७८९';
  return str.replace(/[०-९]/g, d => devDigits.indexOf(d).toString());
}

// Words to ignore from header/footer of receipts/bills
const IGNORE_KEYWORDS = [
  'tax invoice', 'invoice', 'cash memo', 'bill no', 'date', 'time',
  'total', 'grand total', 'subtotal', 'sub total', 'gst', 'gstin',
  'cgst', 'sgst', 'igst', 'thank you', 'thanks', 'visit again',
  'phone', 'ph no', 'mobile', 'address', 'balance', 'paid', 'payment',
  'cash', 'upi', 'card', 'customer', 'supplier', 'sr no', 'sr. no',
  'sr.no', 'particulars', 'description', 'qty', 'rate', 'amount',
  'net amount', 'signature', 'authorised', 'auth sign', 'order no',
  'terms & conditions', 'terms', 'conditions', 'e&oe', 'round off'
];

/**
 * Parses raw text extracted from a photo/receipt into structured purchase order items.
 */
export function parseReceiptText(rawText: string): ParsedPurchaseItem[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: ParsedPurchaseItem[] = [];

  for (const rawLine of lines) {
    let line = normalizeDevanagariDigits(rawLine);
    const lower = line.toLowerCase();

    // Skip short or empty lines
    if (line.length < 2) continue;

    // Skip lines that match header/footer noise
    const isNoise = IGNORE_KEYWORDS.some(kw => {
      return lower === kw || lower.startsWith(kw + ':') || lower.startsWith(kw + ' ') || (lower.startsWith(kw) && lower.length < kw.length + 4);
    });
    if (isNoise) continue;

    // Strip leading list numbers like "1.", "1)", "1 -", "#1", "•", "-"
    line = line.replace(/^[\#\*\•\-\d]+[\.\)\-\:\s]+/, '').trim();
    if (line.length < 2) continue;

    // Detect unit
    let unit: 'Kg' | 'Ltr' | 'Pcs' | 'Box' | 'Pack' = 'Kg';
    if (/\b(ltr|litre|litres|लिटर|लीटर|ml)\b/i.test(line)) {
      unit = 'Ltr';
    } else if (/\b(box|boxes|कार्टन|ctn|crate)\b/i.test(line)) {
      unit = 'Box';
    } else if (/\b(pack|packs|packet|packets|पॅकेट|bag|bags|पोते|बोरी)\b/i.test(line)) {
      unit = 'Pack';
    } else if (/\b(pcs|pc|piece|pieces|नग|nos|no|plate|plates)\b/i.test(line)) {
      unit = 'Pcs';
    } else if (/\b(kg|kgs|kilo|किलो|gm|gram|grams|ग्रॅम)\b/i.test(line)) {
      unit = 'Kg';
    }

    // Unit word pattern for removal
    const unitRegex = /\b(kg|kgs|kilo|किलो|ltr|litre|litres|लिटर|लीटर|pcs|pc|piece|pieces|नग|nos|no|box|boxes|pack|packs|packet|packets|पॅकेट|bag|bags|gm|gram|grams|ग्रॅम)\b/gi;

    let qty = 1;
    let rate = 0;

    // Try finding quantity attached to or directly before/after unit (e.g., "5kg", "5 kg", "10 ltr")
    const qtyWithUnitMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|किलो|ltr|litre|litres|लिटर|लीटर|pcs|pc|piece|pieces|नग|nos|no|box|boxes|pack|packs|packet|packets|पॅकेट|bag|bags|gm|gram|grams|ग्रॅम)/i);
    let lineRemaining = line;

    if (qtyWithUnitMatch) {
      qty = parseFloat(qtyWithUnitMatch[1]) || 1;
      // If gm, convert to kg
      if (/gm|gram|ग्रॅम/i.test(qtyWithUnitMatch[0]) && qty >= 50) {
        qty = Number((qty / 1000).toFixed(3));
      }
      lineRemaining = line.replace(qtyWithUnitMatch[0], ' ');
    }

    // Look for all numbers in the remaining line
    const remainingNumbers = [...lineRemaining.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(m => parseFloat(m[0]));

    if (!qtyWithUnitMatch && remainingNumbers.length > 0) {
      qty = remainingNumbers[0];
      if (remainingNumbers.length > 1) {
        rate = remainingNumbers[1];
      }
    } else if (remainingNumbers.length > 0) {
      // The remaining number is rate or price
      rate = remainingNumbers[0];
    }

    // Clean up Item Name
    let name = lineRemaining
      .replace(unitRegex, '')
      .replace(/\b\d+(?:\.\d+)?\b/g, '')
      .replace(/[@#xX*+\-\:\=\/\\|\[\]\(\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If cleaned name is valid (at least 2 letters and not purely symbols)
    if (name.length >= 2 && !/^[\d\W]+$/.test(name)) {
      // Capitalize first letter if latin
      name = name.charAt(0).toUpperCase() + name.slice(1);

      items.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        name,
        unit,
        qty: Math.max(0.1, Number(qty) || 1),
        rate: Math.max(0, Number(rate) || 0),
        discount: 0,
        tax: 5
      });
    }
  }

  return items;
}

/**
 * Perform OCR on an image file or data URL using Tesseract.js.
 */
export async function recognizeItemsFromImage(
  imageSource: string | File | Blob,
  onProgress?: (progress: number, statusText: string) => void
): Promise<{ text: string; items: ParsedPurchaseItem[] }> {
  onProgress?.(10, 'Initializing OCR engine...');

  const Tesseract = await getTesseract();
  const result = await Tesseract.recognize(
    imageSource,
    'eng+mar+hin',
    {
      logger: (m: any) => {
        if (m && typeof m.progress === 'number') {
          const pct = Math.round(m.progress * 100);
          onProgress?.(pct, m.status || 'Processing image...');
        }
      }
    }
  ).catch(async (primaryErr: any) => {
    console.warn('Multilingual OCR fallback to English:', primaryErr);
    onProgress?.(30, 'Retrying with English OCR...');
    return await Tesseract.recognize(imageSource, 'eng', {
      logger: (m: any) => {
        if (m && typeof m.progress === 'number') {
          const pct = Math.round(m.progress * 100);
          onProgress?.(pct, m.status || 'Processing image...');
        }
      }
    });
  });

  const rawText = result.data?.text || '';
  const parsedItems = parseReceiptText(rawText);

  return {
    text: rawText,
    items: parsedItems
  };
}

export default {
  parseReceiptText,
  recognizeItemsFromImage
};
