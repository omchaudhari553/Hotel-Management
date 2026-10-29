import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { UniversalInvoicePrintData, PaperSize } from '../types/printing';
import { generateInvoiceHtml } from './invoicePrintRenderer';

const STORAGE_KEY_DEFAULT_PAPER_SIZE = 'ajalkar_mobile_default_paper_size';

export class MobilePrintService {
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
   * 1. Paired Bluetooth thermal receipt printers (via Bluetooth Print Service or RawBT)
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
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
        return { success: true, message: 'Web print window opened' };
      }
      throw new Error('Please allow popups to print invoices');
    }

    try {
      await Print.printAsync({
        html,
        orientation: Print.Orientation.portrait,
      });
      return { success: true, message: 'Print job dispatched to system print spooler' };
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

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Tax Invoice #${data.invoiceNumber} (${paperSize})`,
        UTI: 'com.adobe.pdf',
      });
      return { success: true, uri };
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

