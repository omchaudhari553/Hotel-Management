import { UniversalInvoicePrintData, PaperSize, PrintMethod } from '../types/printing';
import { generateInvoiceHtml } from './invoicePrintRenderer';
import { encodeInvoiceEscPos } from './escposGenerator';
import { webBluetoothPrinter } from './webBluetoothPrinter';

export interface PrintExecutionOptions {
  paperSize: PaperSize;
  method: PrintMethod;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export class PrintService {
  /**
   * Retrieves saved preferred paper size from localStorage (default: 80mm)
   */
  public getDefaultPaperSize(): PaperSize {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ajalkar_default_paper_size') as PaperSize;
      if (saved && (saved === '58mm' || saved === '80mm' || saved === 'A4')) {
        return saved;
      }
    }
    return '80mm';
  }

  /**
   * Saves preferred paper size to localStorage
   */
  public setDefaultPaperSize(size: PaperSize): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ajalkar_default_paper_size', size);
    }
  }

  /**
   * Retrieves saved default print method (browser, bluetooth, pdf)
   */
  public getDefaultPrintMethod(): PrintMethod {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ajalkar_default_print_method') as PrintMethod;
      if (saved && (saved === 'browser' || saved === 'bluetooth' || saved === 'pdf')) {
        return saved;
      }
    }
    return 'browser';
  }

  /**
   * Saves default print method
   */
  public setDefaultPrintMethod(method: PrintMethod): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ajalkar_default_print_method', method);
    }
  }

  /**
   * Prints the invoice HTML using an isolated hidden iframe
   * Guarantees 0 page UI leakage (no navbar, sidebar, buttons)
   */
  public async printViaBrowser(htmlContent: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';

        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!doc) {
          document.body.removeChild(iframe);
          throw new Error('Failed to create printing iframe context.');
        }

        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Allow styles & fonts to render before invoking print
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            resolve(true);
          } catch (err) {
            reject(err);
          } finally {
            // Clean up iframe after a safe delay
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }
        }, 300);
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Executes invoice printing based on selected paper size and method
   */
  public async executePrint(data: UniversalInvoicePrintData, options: PrintExecutionOptions): Promise<boolean> {
    const { paperSize, method } = options;

    if (method === 'bluetooth') {
      if (paperSize === 'A4') {
        throw new Error(
          'Thermal Bluetooth printers do not support standard A4 paper. Please choose 58mm or 80mm for thermal printing, or select System/Browser Print for A4 documents.'
        );
      }
      const escPosBytes = encodeInvoiceEscPos(data, paperSize);
      return webBluetoothPrinter.printEscPos(escPosBytes);
    }

    // Default: Browser / System Print
    const html = generateInvoiceHtml(data, paperSize);
    return this.printViaBrowser(html);
  }
}

export const printService = new PrintService();

