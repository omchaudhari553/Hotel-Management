import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { UniversalInvoicePrintData, PaperSize } from '../types/printing';
import { generateInvoiceHtml } from './invoicePrintRenderer';

const STORAGE_KEY_DEFAULT_PAPER_SIZE = 'ajalkar_mobile_default_paper_size';
const STORAGE_KEY_IOS_PRINTER_URL = 'ajalkar_ios_printer_url';
const STORAGE_KEY_IOS_PRINTER_NAME = 'ajalkar_ios_printer_name';

export class MobilePrintService {
  /**
   * Retrieves saved iOS AirPrint printer details
   */
  public static async getSavedIosPrinter(): Promise<{ url: string; name: string } | null> {
    if (Platform.OS !== 'ios') return null;
    try {
      const url = await AsyncStorage.getItem(STORAGE_KEY_IOS_PRINTER_URL);
      const name = (await AsyncStorage.getItem(STORAGE_KEY_IOS_PRINTER_NAME)) || 'Thermal AirPrint';
      if (url) {
        return { url, name };
      }
    } catch {}
    return null;
  }

  /**
   * Allows user to select an iOS AirPrint printer once and saves it for silent direct printing
   */
  public static async selectAndSaveIosPrinter(): Promise<{ url: string; name: string } | null> {
    if (Platform.OS !== 'ios') return null;
    try {
      const selectFn =
        (typeof Print?.selectPrinterAsync === 'function' ? Print.selectPrinterAsync : null) ||
        (typeof (Print as any)?.default?.selectPrinterAsync === 'function' ? (Print as any).default.selectPrinterAsync : null);

      if (selectFn) {
        const printer = await selectFn();
        if (printer && printer.url) {
          await AsyncStorage.setItem(STORAGE_KEY_IOS_PRINTER_URL, printer.url);
          await AsyncStorage.setItem(STORAGE_KEY_IOS_PRINTER_NAME, printer.name || 'AirPrint Thermal');
          return { url: printer.url, name: printer.name || 'AirPrint Thermal' };
        }
      }
    } catch (err: any) {
      console.warn('selectAndSaveIosPrinter notice:', err);
    }
    return null;
  }

  /**
   * Removes saved iOS AirPrint printer
   */
  public static async clearSavedIosPrinter(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_IOS_PRINTER_URL);
      await AsyncStorage.removeItem(STORAGE_KEY_IOS_PRINTER_NAME);
    } catch {}
  }
  /**
   * Retrieves saved preferred paper size from AsyncStorage (default: 80mm)
   */
  public static async getDefaultPaperSize(): Promise<PaperSize> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_DEFAULT_PAPER_SIZE);
      if (saved && (saved === '58mm' || saved === '80mm' || saved === 'A4')) {
        return saved as PaperSize;
      }
    } catch {
      // Fallback
    }
    return '80mm';
  }

  /**
   * Saves preferred paper size to AsyncStorage
   */
  public static async setDefaultPaperSize(size: PaperSize): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_PAPER_SIZE, size);
    } catch {
      // Ignore storage error
    }
  }

  /**
   * Prints the invoice using Expo Print / Android Print Spooler.
   * Compatible with:
   * 1. Paired Bluetooth thermal receipt printers (Direct Bluetooth / System Spooler)
   * 2. Wi-Fi & LAN network thermal printers
   * 3. Standard A4 printers via Wi-Fi/Mopria/AirPrint
   * 4. Virtual PDF generation
   */
  public static async printInvoice(
    data: UniversalInvoicePrintData,
    paperSize: PaperSize
  ): Promise<{ success: boolean; message: string }> {
    const html = generateInvoiceHtml(data, paperSize);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        let printFrame = document.getElementById('ajalkar-thermal-print-frame') as HTMLIFrameElement;
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = 'ajalkar-thermal-print-frame';
          printFrame.style.position = 'fixed';
          printFrame.style.top = '-9999px';
          printFrame.style.left = '-9999px';
          printFrame.style.width = '80mm';
          printFrame.style.height = '100px';
          printFrame.style.border = 'none';
          document.body.appendChild(printFrame);
        }

        const frameDoc = printFrame.contentWindow?.document;
        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(html);
          frameDoc.close();
          setTimeout(() => {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          }, 350);
          return { success: true, message: 'Print job dispatched to thermal printer' };
        }
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 350);
        return { success: true, message: 'Web print window opened' };
      }
      throw new Error('Please allow popups to print invoices');
    }

    try {
      const printFn =
        (typeof Print?.printAsync === 'function' ? Print.printAsync : null) ||
        (typeof (Print as any)?.default?.printAsync === 'function' ? (Print as any).default.printAsync : null);

      if (printFn) {
        let printerUrl: string | undefined = undefined;
        if (Platform.OS === 'ios') {
          const saved = await this.getSavedIosPrinter();
          if (saved && saved.url) {
            printerUrl = saved.url;
          }
        }

        // On iOS: passing printerUrl prints directly and silently WITHOUT the AirPrint sheet!
        await printFn({
          html,
          printerUrl,
        });
        return { success: true, message: 'Print job dispatched directly to printer' };
      }

      // Fallback: print to PDF and share
      return await this.exportAndSharePdf(data, paperSize).then(() => ({
        success: true,
        message: 'Print job sent via PDF share',
      }));
    } catch (err: any) {
      if (err.message && err.message.includes('User canceled')) {
        return { success: false, message: 'Print canceled by user' };
      }
      throw new Error(err.message || 'Failed to dispatch print job');
    }
  }

  /**
   * Exports the invoice to a high-fidelity PDF and opens the native Share dialog.
   * Allows opening in Bluetooth Thermal printer utility apps or sending via WhatsApp/Email.
   */
  public static async exportAndSharePdf(
    data: UniversalInvoicePrintData,
    paperSize: PaperSize
  ): Promise<{ success: boolean; uri: string }> {
    const html = generateInvoiceHtml(data, paperSize);

    const { uri, base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    let shareUri = uri;
    try {
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (baseDir) {
        const cleanInv = (data.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
        const targetUri = `${baseDir}Invoice_${cleanInv}.pdf`;
        if (base64) {
          await FileSystem.writeAsStringAsync(targetUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          shareUri = targetUri;
        } else if (uri) {
          await FileSystem.copyAsync({ from: uri, to: targetUri });
          shareUri = targetUri;
        }
      }
    } catch (fsErr) {
      console.warn('Failed to relocate PDF to cacheDirectory in exportAndSharePdf:', fsErr);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Tax Invoice #${data.invoiceNumber} (${paperSize})`,
        UTI: 'com.adobe.pdf',
      });
      return { success: true, uri: shareUri };
    } else {
      throw new Error('Sharing is not available on this mobile device.');
    }
  }

  /**
   * Generates a test print slip
   */
  public static async testPrint(paperSize: PaperSize): Promise<{ success: boolean; message: string }> {
    const testData: UniversalInvoicePrintData = {
      invoiceNumber: 'TEST-001',
      invoiceDate: new Date().toLocaleDateString('en-IN'),
      hotelName: 'AJALKAR HOTEL MANAGEMENT',
      hotelAddress: 'Pune, Maharashtra',
      hotelPhone: '+91 98765 43210',
      gstin: '27AAKCA1234F1Z5',
      fssai: '11521034000123',
      tableName: 'TEST TBL',
      customerName: 'Printer Connectivity Test',
      items: [
        { name: 'Paper Test Item 1', quantity: 1, unitPrice: 100, totalPrice: 100 },
        { name: 'Thermal Font Test 2', quantity: 2, unitPrice: 50, totalPrice: 100 },
      ],
      subtotal: 200,
      totalTax: 10,
      cgstAmount: 5,
      sgstAmount: 5,
      grandTotal: 210,
      paymentMethod: 'TEST_MODE',
      paymentStatus: 'PAID',
      footerMessage: `*** PRINTER TEST OK (${paperSize}) ***`,
    };

    return this.printInvoice(testData, paperSize);
  }
}

