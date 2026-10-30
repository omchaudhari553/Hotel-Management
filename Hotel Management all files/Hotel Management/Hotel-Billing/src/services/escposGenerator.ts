import { UniversalInvoicePrintData, PaperSize } from '../types/printing';

/**
 * Robust ESC/POS Command Encoder for 58mm and 80mm Thermal Receipt Printers
 */
export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  public init(): this {
    // ESC @ - Initialize printer
    this.buffer.push(0x1b, 0x40);
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
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // double width + double height
    return this;
  }

  public textDoubleHeight(enable: boolean): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  public text(str: string): this {
    // Convert to ASCII / Latin1 safe bytes
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Map rupee symbol ₹ (0x20B9) to 'Rs.' for standard ESC/POS code pages
      if (code === 0x20b9) {
        this.buffer.push(0x52, 0x73, 0x2e); // 'Rs.'
      } else if (code <= 0x7f) {
        this.buffer.push(code);
      } else {
        this.buffer.push(0x3f); // '?' for unmapped unicode
      }
    }
    return this;
  }

  public line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public lineFeed(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  public separator(char: string = '-', width: number = 32): this {
    this.line(char.repeat(width));
    return this;
  }

  public cut(partial: boolean = true): this {
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
 * Pads left and right strings to fit exactly colWidth (e.g., 32 or 48)
 */
function justifyRow(left: string, right: string, colWidth: number): string {
  const availableSpace = colWidth - left.length - right.length;
  if (availableSpace <= 0) {
    return left.substring(0, colWidth - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(availableSpace) + right;
}

/**
 * Encodes complete invoice into ESC/POS binary for 58mm (32 chars) or 80mm (48 chars)
 */
export function encodeInvoiceEscPos(data: UniversalInvoicePrintData, paperSize: PaperSize): Uint8Array {
  const encoder = new EscPosEncoder();
  const colWidth = paperSize === '58mm' ? 32 : 48;

  // 1. Header (Centered)
  encoder.alignCenter();
  encoder.bold(true);
  encoder.textDoubleHeight(true);
  encoder.line(data.hotelName || 'HOTEL MANAGEMENT');
  encoder.textDoubleHeight(false);
  encoder.bold(false);

  if (data.hotelAddress) encoder.line(data.hotelAddress);
  if (data.hotelPhone) encoder.line(`Tel: ${data.hotelPhone}`);
  if (data.gstin) encoder.bold(true).line(`GSTIN: ${data.gstin}`).bold(false);
  if (data.fssai) encoder.line(`FSSAI: ${data.fssai}`);

  encoder.separator('=', colWidth);
  encoder.bold(true).line('TAX INVOICE').bold(false);
  encoder.separator('-', colWidth);

  // 2. Metadata (Left aligned)
  encoder.alignLeft();
  encoder.line(justifyRow(`INV: #${data.invoiceNumber}`, `DT: ${data.invoiceDate}`, colWidth));
  if (data.tableName) {
    encoder.line(justifyRow(`Table: ${data.tableName}`, data.orderNumber ? `Ord: ${data.orderNumber}` : '', colWidth));
  }
  if (data.customerName) {
    encoder.line(`Guest: ${data.customerName}`);
  }
  if (data.serverName) {
    encoder.line(`Steward: ${data.serverName}`);
  }

  encoder.separator('-', colWidth);

  // 3. Items Table
  if (paperSize === '58mm') {
    // 32 chars: Item (16) Qty (4) Amt (10)
    encoder.line(justifyRow('ITEM', 'QTY   AMT', colWidth));
    encoder.separator('-', colWidth);
    (data.items || []).forEach((it) => {
      const name = (it.name || it.description || 'Item').substring(0, 16);
      const qty = String(it.quantity || 1).padStart(3);
      const total = Number(it.totalPrice ?? (it.quantity * it.unitPrice)).toFixed(2);
      encoder.line(justifyRow(name, `${qty}  ${total}`, colWidth));
    });
  } else {
    // 48 chars: Item (24) Qty (6) Rate (8) Amt (10)
    encoder.line(justifyRow('ITEM', 'QTY    RATE     TOTAL', colWidth));
    encoder.separator('-', colWidth);
    (data.items || []).forEach((it) => {
      const name = (it.name || it.description || 'Item').substring(0, 22);
      const qty = String(it.quantity || 1).padStart(4);
      const rate = Number(it.unitPrice || 0).toFixed(2).padStart(8);
      const total = Number(it.totalPrice ?? (it.quantity * it.unitPrice)).toFixed(2).padStart(9);
      encoder.line(justifyRow(name, `${qty} ${rate} ${total}`, colWidth));
    });
  }

  encoder.separator('-', colWidth);

  // 4. Totals (Right-justified)
  encoder.line(justifyRow('Subtotal:', `Rs.${Number(data.subtotal || 0).toFixed(2)}`, colWidth));
  if (data.discountAmount && data.discountAmount > 0) {
    encoder.line(justifyRow('Discount:', `-Rs.${Number(data.discountAmount).toFixed(2)}`, colWidth));
  }
  if (data.cgstAmount && data.cgstAmount > 0) {
    encoder.line(justifyRow(`CGST (${data.cgstRate || 2.5}%):`, `+Rs.${Number(data.cgstAmount).toFixed(2)}`, colWidth));
  }
  if (data.sgstAmount && data.sgstAmount > 0) {
    encoder.line(justifyRow(`SGST (${data.sgstRate || 2.5}%):`, `+Rs.${Number(data.sgstAmount).toFixed(2)}`, colWidth));
  }
  if (data.igstAmount && data.igstAmount > 0) {
    encoder.line(justifyRow(`IGST (${data.igstRate || 5}%):`, `+Rs.${Number(data.igstAmount).toFixed(2)}`, colWidth));
  }
  if (data.roundOff && data.roundOff !== 0) {
    encoder.line(justifyRow('Round Off:', `${data.roundOff > 0 ? '+' : ''}Rs.${Number(data.roundOff).toFixed(2)}`, colWidth));
  }

  encoder.separator('=', colWidth);
  encoder.bold(true).textDoubleHeight(true);
  encoder.line(justifyRow('GRAND TOTAL:', `Rs.${Number(data.grandTotal || 0).toFixed(2)}`, colWidth));
  encoder.textDoubleHeight(false).bold(false);
  encoder.separator('=', colWidth);

  // 5. Payment details & Footer
  encoder.line(justifyRow(`Pay: ${data.paymentMethod || 'CASH'}`, `Status: [${data.paymentStatus || 'PAID'}]`, colWidth));
  encoder.lineFeed(1);

  encoder.alignCenter();
  encoder.bold(true).line(data.footerMessage || 'Thank you! Visit again.').bold(false);
  encoder.line(`[${paperSize} Thermal Slip • Ajalkar POS]`);

  // 6. Paper Cut
  encoder.cut(true);

  return encoder.getBytes();
}

/**
 * Encodes a quick test ticket to verify thermal printer connectivity
 */
export function encodeTestPrintEscPos(paperSize: PaperSize, printerName: string = 'Thermal Printer'): Uint8Array {
  const encoder = new EscPosEncoder();
  const colWidth = paperSize === '58mm' ? 32 : 48;

  encoder.alignCenter();
  encoder.bold(true).textDoubleHeight(true);
  encoder.line('*** PRINTER TEST OK ***');
  encoder.textDoubleHeight(false).bold(false);
  encoder.separator('-', colWidth);

  encoder.alignLeft();
  encoder.line(`Device: ${printerName}`);
  encoder.line(`Paper: ${paperSize}`);
  encoder.line(`Cols: ${colWidth} Characters`);
  encoder.line(`Date: ${new Date().toLocaleString('en-IN')}`);
  encoder.line(`Protocol: ESC/POS Direct`);
  encoder.separator('-', colWidth);

  encoder.alignCenter();
  encoder.line('1234567890123456789012345678901234567890'.substring(0, colWidth));
  encoder.bold(true).line('Bold Text Test OK').bold(false);
  encoder.line('Ajalkar POS Printing System Ready.');
  encoder.separator('=', colWidth);

  encoder.cut(true);
  return encoder.getBytes();
}

