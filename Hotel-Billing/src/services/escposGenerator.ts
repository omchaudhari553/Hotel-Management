import { UniversalInvoicePrintData, PaperSize } from '../types/printing';

/**
 * Robust ASCII Sanitizer for Thermal Printers
 * Replaces non-ASCII unicode, accents, Marathi/Devanagari phrases, and currency symbols
 * to ensure 100% clean rendering on ESC/POS printers without mojibake or garbage symbols.
 */
export function sanitizeAscii(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  let str = String(input);

  // Common Indian Currency & Typography symbols
  str = str
    .replace(/₹/g, 'Rs.')
    .replace(/[•●▪]/g, ' ')
    .replace(/[–—―]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[✓✔]/g, 'OK')
    .replace(/[✗✘]/g, 'X');

  // Devanagari numerals to standard Arabic numerals
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  for (let d = 0; d < 10; d++) {
    str = str.replace(new RegExp(devanagariDigits[d], 'g'), String(d));
  }

  // Common Marathi / Hindi POS Terminology Mappings
  str = str
    .replace(/कर पावती/g, 'TAX INVOICE')
    .replace(/किचन ऑर्डर तिकीट/g, 'KITCHEN ORDER TICKET')
    .replace(/टेबल/g, 'Table')
    .replace(/बिल/g, 'Bill')
    .replace(/तारीख/g, 'Date')
    .replace(/वेळ/g, 'Time')
    .replace(/ग्राहक/g, 'Guest')
    .replace(/वेटर/g, 'Waiter')
    .replace(/स्टुअर्ड/g, 'Steward')
    .replace(/एकूण/g, 'Total')
    .replace(/उप-एकूण/g, 'Subtotal')
    .replace(/सूट/g, 'Discount')
    .replace(/बाकी/g, 'UNPAID')
    .replace(/पूर्ण/g, 'PAID')
    .replace(/रोख/g, 'CASH')
    .replace(/कार्ड/g, 'CARD')
    .replace(/पदार्थ/g, 'Item')
    .replace(/प्रमाण/g, 'Qty')
    .replace(/दर/g, 'Rate')
    .replace(/रक्कम/g, 'Amt')
    .replace(/धन्यवाद! पुन्हा या\./g, 'Thank you! Visit again.')
    .replace(/धन्यवाद/g, 'Thank you')
    .replace(/पुन्हा या/g, 'Visit again');

  // Replace special whitespace & non-breaking spaces
  str = str.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');

  // Normalize diacritics / accents (e.g., é -> e)
  str = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Strip all non-ASCII characters (> 127) or control characters (< 32 except newline/carriage return)
  str = str.replace(/[^\x20-\x7E\r\n]/g, '');

  return str.trim();
}

/**
 * Cleanly wraps text onto lines within maxWidth characters, breaking on spaces
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const clean = sanitizeAscii(text);
  if (!clean) return [];
  if (clean.length <= maxWidth) return [clean];

  const words = clean.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (word.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.substring(i, i + maxWidth));
      }
      continue;
    }

    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Robust ESC/POS Command Encoder for 58mm and 80mm Thermal Receipt Printers
 */
export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  public init(): this {
    // 1. Send 4 null bytes to clear any pending multi-byte parameter state from interrupted print jobs
    this.buffer.push(0x00, 0x00, 0x00, 0x00);
    // 2. CAN (0x18) - Cancel current line buffer in printer memory
    this.buffer.push(0x18);
    // 3. ESC @ - Initialize printer hardware
    this.buffer.push(0x1b, 0x40);
    // 4. ESC t 0 - Select standard character code table 0 (PC437: USA)
    this.buffer.push(0x1b, 0x74, 0x00);
    // 5. ESC R 0 - Select USA character set
    this.buffer.push(0x1b, 0x52, 0x00);
    // 6. ESC 2 - Default line spacing (1/6 inch)
    this.buffer.push(0x1b, 0x32);
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00);
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01);
    return this;
  }

  public alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02);
    return this;
  }

  public bold(enable: boolean): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  public textDouble(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  public textDoubleHeight(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  public text(str: string): this {
    const cleanStr = sanitizeAscii(str);
    for (let i = 0; i < cleanStr.length; i++) {
      const code = cleanStr.charCodeAt(i);
      if (code === 0x0a) {
        this.buffer.push(0x0a); // Allow newline LF
      } else if (code >= 0x20 && code <= 0x7e) {
        this.buffer.push(code);
      }
    }
    return this;
  }

  public line(str: string = ''): this {
    if (str) {
      this.text(str);
    }
    this.buffer.push(0x0a); // LF
    return this;
  }

  public lineFeed(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  public separator(char: string = '-', width: number = 30): this {
    this.line(char.repeat(width));
    return this;
  }

  public cut(partial: boolean = true): this {
    // 3 Line feeds ensure manual tear-off printers clear the cutting/tear bar
    this.lineFeed(3);
    // GS V 66 0 - Partial cut
    this.buffer.push(0x1d, 0x56, partial ? 0x42 : 0x41, 0x00);
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Left-justify one string and right-justify another, padding to fit exactly colWidth.
 * Never truncates text. If overflowing colWidth, moves right string to next line right-aligned.
 */
export function justifyRow(left: string, right: string, colWidth: number): string {
  const cleanLeft = sanitizeAscii(left);
  const cleanRight = sanitizeAscii(right);

  const availableSpace = colWidth - cleanLeft.length - cleanRight.length;
  if (availableSpace > 0) {
    return cleanLeft + ' '.repeat(availableSpace) + cleanRight;
  }
  if (cleanLeft.length + cleanRight.length === colWidth) {
    return cleanLeft + cleanRight;
  }
  // When overflowing, right-align cleanRight on line 2 so neither left nor right gets truncated!
  const rightPad = Math.max(0, colWidth - cleanRight.length);
  return cleanLeft + '\n' + ' '.repeat(rightPad) + cleanRight;
}

/**
 * 58mm Item Row Formatter (Safe 30 columns total)
 * Never overflows 30 columns, preventing auto-wrap corruption.
 * Fits: ITEM (14) + ' ' (1) + QTY (4) + ' ' (1) + AMT (10) = 30
 */
export function formatItemRow58mm(name: string, qty: string | number, amt: string | number): string[] {
  const cleanName = sanitizeAscii(name);
  const cleanQty = String(qty).padStart(4);
  const cleanAmt = String(amt).padStart(10);

  if (cleanName.length <= 14) {
    return [`${cleanName.padEnd(14)} ${cleanQty} ${cleanAmt}`];
  }

  const nameLines = wrapText(cleanName, 30);
  return [
    ...nameLines,
    `${' '.repeat(14)} ${cleanQty} ${cleanAmt}`
  ];
}

/**
 * 80mm Item Row Formatter (Safe 44 columns total)
 * Fits: ITEM (20) + ' ' (1) + QTY (4) + ' ' (1) + RATE (8) + ' ' (1) + TOTAL (9) = 44
 */
export function formatItemRow80mm(name: string, qty: string | number, rate: string | number, total: string | number): string[] {
  const cleanName = sanitizeAscii(name);
  const cleanQty = String(qty).padStart(4);
  const cleanRate = String(rate).padStart(8);
  const cleanTotal = String(total).padStart(9);

  if (cleanName.length <= 20) {
    return [`${cleanName.padEnd(20)} ${cleanQty} ${cleanRate} ${cleanTotal}`];
  }

  const nameLines = wrapText(cleanName, 44);
  return [
    ...nameLines,
    `${' '.repeat(20)} ${cleanQty} ${cleanRate} ${cleanTotal}`
  ];
}

/**
 * Encodes complete invoice or KOT ticket into ESC/POS binary for 58mm (30 chars safe) or 80mm (44 chars safe)
 * Outputs 1:1 identical layout to the on-screen receipt preview.
 */
export function encodeInvoiceEscPos(data: UniversalInvoicePrintData, paperSize: PaperSize): Uint8Array {
  const encoder = new EscPosEncoder();
  // Safe margins: 30 chars for 58mm, 44 chars for 80mm (fits all printer firmware without auto-wrap glitches)
  const colWidth = paperSize === '58mm' ? 30 : 44;

  // 1. Header (Centered)
  encoder.alignCenter();
  const hotelName = (data.hotelName || 'HOTEL MANAGEMENT').trim();
  encoder.bold(true).line(hotelName).bold(false);

  if (data.hotelAddress && data.hotelAddress.trim()) {
    wrapText(data.hotelAddress.trim(), colWidth).forEach((line) => encoder.line(line));
  }
  if (data.hotelPhone && data.hotelPhone.trim()) {
    encoder.line(`Tel: ${data.hotelPhone.trim()}`);
  }
  if (data.gstin && data.gstin.trim()) {
    encoder.bold(true).line(`GSTIN: ${data.gstin.trim()}`).bold(false);
  }
  if (data.fssai && data.fssai.trim()) {
    encoder.line(`FSSAI: ${data.fssai.trim()}`);
  }

  const isKot = Boolean(
    (data.invoiceNumber && data.invoiceNumber.toUpperCase().startsWith('KOT')) ||
    (data.kotNumber) ||
    (data.footerMessage && data.footerMessage.includes('Kitchen Copy'))
  );

  // 2. Title with Dividers
  encoder.separator('-', colWidth);
  const receiptTitle = isKot
    ? (paperSize === '58mm' ? '*** KOT TICKET (58mm) ***' : '*** KITCHEN ORDER TICKET (80mm) ***')
    : (paperSize === '58mm' ? 'TAX INVOICE (58mm)' : 'TAX INVOICE / BILL OF SUPPLY');
  encoder.bold(true).line(receiptTitle).bold(false);
  encoder.separator('-', colWidth);

  // 3. Metadata (Left aligned)
  encoder.alignLeft();
  const invPrefix = isKot ? 'KOT: #' : 'INV: #';
  const invStr = `${invPrefix}${data.invoiceNumber || 'KOT-001'}`;
  const dateStr = data.invoiceDate || '';
  if (invStr.length + dateStr.length + 1 <= colWidth) {
    encoder.line(justifyRow(invStr, dateStr, colWidth));
  } else {
    encoder.line(invStr);
    if (dateStr) {
      encoder.line(justifyRow('', dateStr, colWidth));
    }
  }

  // Table and Order Number
  const tableNameStr = data.tableName ? (data.tableName.toLowerCase().startsWith('table') ? data.tableName : `Table: ${data.tableName}`) : '';
  const orderNumStr = data.orderNumber && data.orderNumber !== '-' ? `Ord: ${data.orderNumber}` : '';

  if (tableNameStr && orderNumStr) {
    if (tableNameStr.length + orderNumStr.length + 1 <= colWidth) {
      encoder.line(justifyRow(tableNameStr, orderNumStr, colWidth));
    } else {
      encoder.line(tableNameStr);
      encoder.line(orderNumStr);
    }
  } else if (tableNameStr) {
    encoder.line(tableNameStr);
  } else if (orderNumStr) {
    encoder.line(orderNumStr);
  }

  if (data.customerName) {
    encoder.line(`Guest: ${data.customerName}`);
  }
  if (data.serverName) {
    encoder.line(`Steward: ${data.serverName}`);
  }

  encoder.separator('-', colWidth);

  // 4. Items Table
  if (paperSize === '58mm') {
    if (isKot) {
      encoder.line(`${'ITEM'.padEnd(24)} ${'QTY'.padStart(5)}`);
      encoder.separator('-', colWidth);
      (data.items || []).forEach((it) => {
        const name = it.name || it.description || 'Item';
        const qty = String(it.quantity || 1).padStart(5);
        const cleanName = sanitizeAscii(name);
        if (cleanName.length <= 24) {
          encoder.line(`${cleanName.padEnd(24)} ${qty}`);
        } else {
          wrapText(cleanName, 24).forEach((nl, i, arr) => {
            if (i === arr.length - 1) {
              encoder.line(`${nl.padEnd(24)} ${qty}`);
            } else {
              encoder.line(nl);
            }
          });
        }
        if (it.notes) {
          wrapText(`* ${it.notes}`, colWidth).forEach((nl) => encoder.line(`  ${nl}`));
        }
      });
    } else {
      // 30 cols: ITEM (14) + ' ' (1) + QTY (4) + ' ' (1) + AMT (10) = 30
      encoder.line(`${'ITEM'.padEnd(14)} ${'QTY'.padStart(4)} ${'AMT'.padStart(10)}`);
      encoder.separator('-', colWidth);
      (data.items || []).forEach((it) => {
        const name = it.name || it.description || 'Item';
        const qty = it.quantity || 1;
        const total = Number(it.totalPrice ?? (Number(it.quantity || 1) * Number(it.unitPrice || 0))).toFixed(2);
        const rows = formatItemRow58mm(name, qty, total);
        rows.forEach((row) => encoder.line(row));
        if (it.notes) {
          wrapText(`* ${it.notes}`, colWidth).forEach((nl) => encoder.line(`  ${nl}`));
        }
      });
    }
  } else {
    if (isKot) {
      encoder.line(`${'ITEM'.padEnd(36)} ${'QTY'.padStart(7)}`);
      encoder.separator('-', colWidth);
      (data.items || []).forEach((it) => {
        const name = it.name || it.description || 'Item';
        const qty = String(it.quantity || 1).padStart(7);
        const cleanName = sanitizeAscii(name);
        if (cleanName.length <= 36) {
          encoder.line(`${cleanName.padEnd(36)} ${qty}`);
        } else {
          wrapText(cleanName, 36).forEach((nl, i, arr) => {
            if (i === arr.length - 1) {
              encoder.line(`${nl.padEnd(36)} ${qty}`);
            } else {
              encoder.line(nl);
            }
          });
        }
        if (it.notes) {
          wrapText(`* ${it.notes}`, colWidth).forEach((nl) => encoder.line(`  ${nl}`));
        }
      });
    } else {
      // 44 cols: ITEM (20) + ' ' (1) + QTY (4) + ' ' (1) + RATE (8) + ' ' (1) + TOTAL (9) = 44
      encoder.line(`${'ITEM'.padEnd(20)} ${'QTY'.padStart(4)} ${'RATE'.padStart(8)} ${'TOTAL'.padStart(9)}`);
      encoder.separator('-', colWidth);
      (data.items || []).forEach((it) => {
        const name = it.name || it.description || 'Item';
        const qty = it.quantity || 1;
        const rate = Number(it.unitPrice || 0).toFixed(2);
        const total = Number(it.totalPrice ?? (Number(it.quantity || 1) * Number(it.unitPrice || 0))).toFixed(2);
        const rows = formatItemRow80mm(name, qty, rate, total);
        rows.forEach((row) => encoder.line(row));
        if (it.notes) {
          wrapText(`* ${it.notes}`, colWidth).forEach((nl) => encoder.line(`  ${nl}`));
        }
      });
    }
  }

  encoder.separator('-', colWidth);

  if (!isKot) {
    // 5. Totals (Taxable Amount, Discount, GST Taxes, Round Off)
    encoder.line(justifyRow('Taxable Amount:', `Rs.${Number(data.subtotal || 0).toFixed(2)}`, colWidth));

    if (data.discountAmount && data.discountAmount > 0) {
      encoder.line(justifyRow('Discount:', `-Rs.${Number(data.discountAmount).toFixed(2)}`, colWidth));
    }
    if (data.cgstAmount && data.cgstAmount > 0) {
      encoder.line(justifyRow(`CGST (${data.cgstRate || 2.5}%):`, `+ Rs.${Number(data.cgstAmount).toFixed(2)}`, colWidth));
    }
    if (data.sgstAmount && data.sgstAmount > 0) {
      encoder.line(justifyRow(`SGST (${data.sgstRate || 2.5}%):`, `+ Rs.${Number(data.sgstAmount).toFixed(2)}`, colWidth));
    }
    if (data.igstAmount && data.igstAmount > 0) {
      encoder.line(justifyRow(`IGST (${data.igstRate || 5}%):`, `+ Rs.${Number(data.igstAmount).toFixed(2)}`, colWidth));
    }
    if (data.roundOff && data.roundOff !== 0) {
      encoder.line(justifyRow('Round Off:', `${data.roundOff > 0 ? '+' : ''}Rs.${Number(data.roundOff).toFixed(2)}`, colWidth));
    }

    // 6. Grand Total
    encoder.separator('-', colWidth);
    encoder.bold(true);
    const totalLabel = paperSize === '58mm' ? 'TOTAL:' : 'GRAND TOTAL:';
    encoder.line(justifyRow(totalLabel, `Rs.${Number(data.grandTotal || 0).toFixed(2)}`, colWidth));
    encoder.bold(false);
    encoder.separator('-', colWidth);

    // 7. Payment details & Status
    encoder.line(justifyRow(`Pay Mode: ${data.paymentMethod || 'CASH'}`, `[${data.paymentStatus || 'UNPAID'}]`, colWidth));

    if (data.paidAmount !== undefined && data.paidAmount !== null && Number(data.paidAmount) > 0 && Number(data.outstandingAmount || 0) > 0) {
      encoder.line(justifyRow(`Paid: Rs.${Number(data.paidAmount).toFixed(2)}`, `Due: Rs.${Number(data.outstandingAmount).toFixed(2)}`, colWidth));
    }
  } else {
    const totalCount = (data.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    encoder.bold(true);
    encoder.line(justifyRow('TOTAL ITEMS:', String(totalCount), colWidth));
    encoder.bold(false);
  }

  // 8. Footer Message
  encoder.separator('-', colWidth);
  encoder.alignCenter();
  const footer = data.footerMessage || 'Thank you for dining with us! Please visit again.';
  wrapText(footer, colWidth).forEach((fLine) => encoder.line(fLine));

  // 9. Paper Cut with 3 feed lines
  encoder.cut(true);

  return encoder.getBytes();
}

/**
 * Encodes a quick test ticket to verify thermal printer connectivity
 */
export function encodeTestPrintEscPos(paperSize: PaperSize, printerName: string = 'Thermal Printer'): Uint8Array {
  const encoder = new EscPosEncoder();
  const colWidth = paperSize === '58mm' ? 30 : 44;

  encoder.alignCenter();
  encoder.bold(true);
  encoder.line('*** PRINTER TEST OK ***');
  encoder.bold(false);
  encoder.separator('-', colWidth);

  encoder.alignLeft();
  encoder.line(`Device: ${sanitizeAscii(printerName)}`);
  encoder.line(`Paper: ${paperSize}`);
  encoder.line(`Cols: ${colWidth} Characters`);
  encoder.line(`Date: ${new Date().toLocaleDateString('en-IN')}`);
  encoder.line(`Protocol: ESC/POS Direct`);
  encoder.separator('-', colWidth);

  encoder.alignCenter();
  encoder.line('1234567890123456789012345678901234567890'.substring(0, colWidth));
  encoder.bold(true).line('Bold Alignment Test OK').bold(false);
  encoder.line('Ajalkar POS System Ready.');
  encoder.separator('=', colWidth);

  encoder.cut(true);
  return encoder.getBytes();
}
