import api from './api';

export type PrinterInterfaceType = 'BLUETOOTH' | 'NETWORK' | 'USB';
export type PrinterPaperSize = '58mm' | '80mm' | 'A4';
export type PrinterPurpose = 'RECEIPT' | 'KOT' | 'PURCHASE' | 'GENERAL';

export interface PrinterConfig {
  id?: number;
  printerName: string;
  printerType: PrinterInterfaceType;
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  usbIdentifier?: string;
  paperSize: PrinterPaperSize;
  isDefaultReceipt: boolean;
  isDefaultKot: boolean;
  isDefaultPurchase: boolean;
  autoCut: boolean;
  openDrawer: boolean;
  copies: number;
  characterSet?: string;
  branchId?: number;
  businessId?: number;
  status?: string;
}

const STORAGE_CACHE_KEY = 'ajalkar_cached_printers';
const STORAGE_DEFAULT_RECEIPT = 'ajalkar_default_receipt_printer';

export class PrinterApiService {
  /**
   * Fetch all configured printers from Spring Boot
   */
  public static async getPrinters(branchId?: number): Promise<PrinterConfig[]> {
    try {
      const res = await api.get('/hotel/printers', {
        params: branchId ? { branchId } : {},
      });
      if (Array.isArray(res.data)) {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(res.data));
        return res.data;
      }
    } catch (err) {
      console.warn('Backend printer fetch failed, using local cache:', err);
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return [];
  }

  /**
   * Save new printer
   */
  public static async savePrinter(config: PrinterConfig): Promise<PrinterConfig> {
    const res = await api.post('/hotel/printers', config);
    return res.data;
  }

  /**
   * Update existing printer
   */
  public static async updatePrinter(id: number, config: Partial<PrinterConfig>): Promise<PrinterConfig> {
    const res = await api.put(`/hotel/printers/${id}`, config);
    return res.data;
  }

  /**
   * Delete printer
   */
  public static async deletePrinter(id: number): Promise<void> {
    await api.delete(`/hotel/printers/${id}`);
  }

  /**
   * Set default printer for a purpose (RECEIPT, KOT, PURCHASE)
   */
  public static async setDefault(id: number, purpose: PrinterPurpose): Promise<PrinterConfig> {
    const res = await api.post('/hotel/printers/default', { id, purpose });
    if (purpose === 'RECEIPT') {
      localStorage.setItem(STORAGE_DEFAULT_RECEIPT, JSON.stringify(res.data));
    }
    return res.data;
  }

  /**
   * Get default printer for a purpose
   */
  public static async getDefault(purpose: PrinterPurpose = 'RECEIPT', branchId?: number): Promise<PrinterConfig | null> {
    try {
      const res = await api.get('/hotel/printers/default', {
        params: { purpose, ...(branchId ? { branchId } : {}) },
      });
      if (res.data) return res.data;
    } catch {
      if (purpose === 'RECEIPT') {
        const cached = localStorage.getItem(STORAGE_DEFAULT_RECEIPT);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {}
        }
      }
    }
    return null;
  }

  /**
   * Test print via backend socket or Web Bluetooth
   */
  public static async testPrint(
    printerType: PrinterInterfaceType,
    target: string,
    paperSize: PrinterPaperSize = '80mm',
    port: number = 9100
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post('/hotel/printers/test', {
        printerType,
        target,
        paperSize,
        port,
      });
      return {
        success: !!res.data?.success,
        message: res.data?.message || 'Test print sent',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Test print failed',
      };
    }
  }

  /**
   * Send raw ESC/POS bytes to Wi-Fi / Network thermal printer via backend socket
   */
  public static async printNetworkEscPos(
    ip: string,
    port: number,
    base64Data: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post('/hotel/printers/network-print', {
        ip,
        port,
        base64Data,
      });
      return {
        success: true,
        message: res.data?.message || 'Print job delivered to Wi-Fi printer',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to send print job to Wi-Fi printer',
      };
    }
  }
}

