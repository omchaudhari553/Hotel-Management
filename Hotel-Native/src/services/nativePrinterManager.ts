import { NativeModules, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { UniversalInvoicePrintData, PaperSize } from '../types/printing';
import { MobilePrintService } from './mobilePrintService';
import { webBluetoothPrinter } from './webBluetoothPrinter';

export type PrinterInterfaceType = 'BLUETOOTH' | 'NETWORK' | 'USB';
export type PrinterPaperSize = '58mm' | '80mm' | 'A4';
export type PrinterPurpose = 'RECEIPT' | 'KOT' | 'PURCHASE' | 'GENERAL';

export interface DiscoveredPrinter {
  name: string;
  address: string;
  type: PrinterInterfaceType;
  isPrinter?: boolean;
  productId?: number;
  vendorId?: number;
  deviceName?: string;
}

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

const STORAGE_KEY_PRINTER_CONFIGS = '@hotel_printer_configs_cache';
const STORAGE_KEY_DEFAULT_RECEIPT = '@hotel_default_printer_receipt';
const STORAGE_KEY_DEFAULT_KOT = '@hotel_default_printer_kot';
const STORAGE_KEY_DEFAULT_PURCHASE = '@hotel_default_printer_purchase';

// Native module reference
const { HotelPrinterModule } = NativeModules;

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;

class EscPosBuffer {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  public init(): EscPosBuffer {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  public alignLeft(): EscPosBuffer {
    this.buffer.push(ESC, 0x61, 0x00);
    return this;
  }

  public alignCenter(): EscPosBuffer {
    this.buffer.push(ESC, 0x61, 0x01);
    return this;
  }

  public alignRight(): EscPosBuffer {
    this.buffer.push(ESC, 0x61, 0x02);
    return this;
  }

  public bold(enable: boolean = true): EscPosBuffer {
    this.buffer.push(ESC, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  public doubleSize(): EscPosBuffer {
    this.buffer.push(GS, 0x21, 0x11); // Double width & height
    return this;
  }

  public doubleHeight(): EscPosBuffer {
    this.buffer.push(GS, 0x21, 0x01);
    return this;
  }

  public doubleWidth(): EscPosBuffer {
    this.buffer.push(GS, 0x21, 0x10);
    return this;
  }

  public normalSize(): EscPosBuffer {
    this.buffer.push(GS, 0x21, 0x00);
    return this;
  }

  public feed(lines: number = 1): EscPosBuffer {
    this.buffer.push(ESC, 0x64, lines);
    return this;
  }

  public cut(full: boolean = false): EscPosBuffer {
    this.feed(3);
    this.buffer.push(GS, 0x56, full ? 0x00 : 0x01);
    return this;
  }

  public drawerKick(): EscPosBuffer {
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  public text(str: string): EscPosBuffer {
    if (!str) return this;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Clean non-ASCII or rupee sign conversion
      if (code === 0x20b9) {
        // Rs.
        this.buffer.push(0x52, 0x73, 0x2e); // 'Rs.'
      } else if (code <= 0x7f) {
        this.buffer.push(code);
      } else {
        // Fallback ASCII representation
        this.buffer.push(0x20); // space or replace
      }
    }
    return this;
  }

  public textLine(str: string): EscPosBuffer {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  public separator(width: number, char: string = '-'): EscPosBuffer {
    this.textLine(char.repeat(width));
    return this;
  }

  public row(left: string, right: string, totalWidth: number): EscPosBuffer {
    const r = right || '';
    const available = totalWidth - r.length;
    let l = left || '';
    if (l.length > available - 1) {
      l = l.substring(0, available - 1);
    }
    const spaces = Math.max(1, totalWidth - l.length - r.length);
    this.textLine(l + ' '.repeat(spaces) + r);
    return this;
  }

  public row3(col1: string, col2: string, col3: string, totalWidth: number): EscPosBuffer {
    // col1: item name (variable), col2: qty, col3: price
    const c2 = col2 || '';
    const c3 = col3 || '';
    const rightPart = '  ' + c2.padEnd(5) + c3.padStart(8);
    const leftMax = totalWidth - rightPart.length;
    let c1 = col1 || '';
    if (c1.length > leftMax) {
      c1 = c1.substring(0, leftMax);
    }
    const spaces = Math.max(1, totalWidth - c1.length - rightPart.length);
    this.textLine(c1 + ' '.repeat(spaces) + rightPart);
    return this;
  }

  public toBase64(): string {
    const binary = String.fromCharCode.apply(null, this.buffer);
    if (typeof btoa === 'function') {
      return btoa(binary);
    }
    // Fallback base64
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < this.buffer.length; i += 3) {
      const b1 = this.buffer[i];
      const b2 = i + 1 < this.buffer.length ? this.buffer[i + 1] : NaN;
      const b3 = i + 2 < this.buffer.length ? this.buffer[i + 2] : NaN;

      const enc1 = b1 >> 2;
      const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
      let enc3 = ((b2 & 15) << 2) | (b3 >> 6);
      let enc4 = b3 & 63;

      if (isNaN(b2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(b3)) {
        enc4 = 64;
      }

      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    return output;
  }
}

export class NativePrinterManager {
  /**
   * Check if Native Hotel Printer module is available on current runtime
   */
  public static isNativeAvailable(): boolean {
    return Platform.OS === 'android' && !!HotelPrinterModule;
  }




  /**
   * Scan for paired Bluetooth printers
   */
  public static async scanBluetoothPrinters(): Promise<DiscoveredPrinter[]> {
    // 1. Web Bluetooth in modern browsers (Chrome / Edge / Opera on Windows, Android, Mac)
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            0x18f0,
            0xff00,
          ],
        });
        if (device) {
          (globalThis as any).__lastWebBluetoothDevice = device;
          return [{
            name: device.name || 'Bluetooth Thermal Printer',
            address: device.id || 'BT_CONNECTED',
            type: 'BLUETOOTH' as PrinterInterfaceType,
            isPrinter: true,
          }];
        }
      } catch (err: any) {
        if (err?.name === 'NotFoundError') {
          return [];
        }
        console.warn('Web Bluetooth error:', err);
      }
    }

    // 2. Standalone Android App via native module
    if (this.isNativeAvailable()) {
      try {
        const list = await HotelPrinterModule.scanBluetoothPrinters();
        return (list || []).map((d: any) => ({
          name: d.name || 'Bluetooth Printer',
          address: d.address,
          type: 'BLUETOOTH' as PrinterInterfaceType,
          isPrinter: !!d.isPrinter,
        }));
      } catch (err) {
        console.warn('scanBluetoothPrinters error:', err);
        return [];
      }
    }

    return [];
  }

  /**
   * Scan for USB thermal printers
   */
  public static async scanUsbPrinters(): Promise<DiscoveredPrinter[]> {
    if (!this.isNativeAvailable()) {
      return [];
    }
    try {
      const list = await HotelPrinterModule.scanUsbPrinters();
      return (list || []).map((d: any) => ({
        name: d.deviceName || `USB Printer (${d.vendorId}:${d.productId})`,
        address: d.deviceName || `${d.vendorId}:${d.productId}`,
        type: 'USB' as PrinterInterfaceType,
        vendorId: d.vendorId,
        productId: d.productId,
        deviceName: d.deviceName,
      }));
    } catch (err) {
      console.warn('scanUsbPrinters error:', err);
      return [];
    }
  }

  /**
   * Scan for network thermal printers on port 9100
   */
  public static async scanNetworkPrinters(subnet?: string): Promise<DiscoveredPrinter[]> {
    if (!this.isNativeAvailable()) {
      return [];
    }
    try {
      const list = await HotelPrinterModule.scanNetworkPrinters(subnet || '');
      return (list || []).map((d: any) => ({
        name: d.name || `Network Printer (${d.ipAddress})`,
        address: d.ipAddress,
        type: 'NETWORK' as PrinterInterfaceType,
      }));
    } catch (err) {
      console.warn('scanNetworkPrinters error:', err);
      return [];
    }
  }

  /**
   * Helper to print via Android RawBT thermal service if installed
   */
  public static async printViaRawBt(base64Data: string): Promise<{ success: boolean; message: string }> {
    const rawbtUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;
    try {
      // First attempt direct URL open (bypasses canOpenURL restrictions in Android 11+ on Expo Go)
      await Linking.openURL(rawbtUrl);
      return {
        success: true,
        message: 'Print job dispatched directly to thermal printer via RawBT',
      };
    } catch (err1: any) {
      console.warn('Direct rawbt: openURL failed, trying rawbt:base64 scheme:', err1);
      try {
        await Linking.openURL(`rawbt:base64,${base64Data}`);
        return {
          success: true,
          message: 'Print job dispatched directly to thermal printer via RawBT',
        };
      } catch (err2: any) {
        console.warn('RawBT base64 scheme failed, trying intent scheme:', err2);
        try {
          const intentUrl = `intent:data:application/octet-stream;base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprint;end;`;
          await Linking.openURL(intentUrl);
          return {
            success: true,
            message: 'Print job dispatched directly to thermal printer via RawBT Intent',
          };
        } catch (err3: any) {
          console.warn('RawBT intent scheme failed:', err3);
        }
      }
    }
    return { success: false, message: 'RAWBT_NOT_INSTALLED' };
  }

  /**
   * Helper to open RawBT app or Google Play Store
   */
  public static async openRawBtAppOrStore(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL('rawbt:');
      } catch {
        try {
          await Linking.openURL('market://details?id=ru.a402d.rawbtprint');
        } catch {
          try {
            await Linking.openURL('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprint');
          } catch { }
        }
      }
    }
  }

  /**
   * Dispatch raw ESC/POS Base64 command to target printer.
   * Works on both Standalone APK (via native module) and Expo Go (via Wi-Fi server socket or RawBT).
   */
  public static async printEscPos(
    printerType: PrinterInterfaceType,
    target: string,
    base64Data: string
  ): Promise<{ success: boolean; message: string }> {
    // 0. Direct Web Bluetooth write if connected
    if (Platform.OS === 'web' && printerType === "BLUETOOTH" && webBluetoothPrinter.isConnected()) {
      try {
        const rawBinary = atob(base64Data);
        const bytes = new Uint8Array(rawBinary.length);
        for (let i = 0; i < rawBinary.length; i++) {
          bytes[i] = rawBinary.charCodeAt(i);
        }
        await webBluetoothPrinter.printEscPos(bytes);
        return {
          success: true,
          message: "Direct print sent to Bluetooth thermal printer via Web Bluetooth",
        };
      } catch (wbErr: any) {
        console.warn("webBluetoothPrinter print error:", wbErr);
      }
    }

    // 0. Web Bluetooth GATT write if connected
    if (Platform.OS === 'web' && printerType === 'BLUETOOTH' && (globalThis as any).__lastWebBluetoothDevice) {
      try {
        const device = (globalThis as any).__lastWebBluetoothDevice;
        if (!device.gatt.connected) {
          await device.gatt.connect();
        }
        const server = device.gatt;
        const services = await server.getPrimaryServices();
        let writeChar: any = null;
        for (const service of services) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        }

        if (writeChar) {
          const rawBinary = atob(base64Data);
          const bytes = new Uint8Array(rawBinary.length);
          for (let i = 0; i < rawBinary.length; i++) {
            bytes[i] = rawBinary.charCodeAt(i);
          }
          const chunkSize = 512;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            if (writeChar.writeValueWithoutResponse) {
              await writeChar.writeValueWithoutResponse(chunk);
            } else {
              await writeChar.writeValue(chunk);
            }
          }
          return {
            success: true,
            message: `Print sent to ${device.name || 'Bluetooth printer'} via Web Bluetooth`,
          };
        }
      } catch (wbErr: any) {
        console.warn('Web Bluetooth GATT print error, falling back:', wbErr);
      }
    }

    // 1. If native module is available (standalone build)
    if (this.isNativeAvailable()) {
      try {
        const res = await HotelPrinterModule.printEscPos(printerType, target, base64Data);
        if (res?.success) {
          return {
            success: true,
            message: res.message || 'Print job sent successfully',
          };
        }
      } catch (err: any) {
        console.warn('Native HotelPrinterModule printEscPos error, trying fallback:', err);
      }
    }

    // 2. Wi-Fi / NETWORK printer: Use backend TCP socket proxy (Port 9100)
    // Works 100% reliably in Expo Go, Android, iOS, and Web across local network!
    if (printerType === 'NETWORK') {
      try {
        const cleanTarget = (target || '').replace(/^tcp:\/\/|^http:\/\//, '');
        const [ip, portStr] = cleanTarget.split(':');
        const port = portStr ? parseInt(portStr, 10) : 9100;
        if (!ip || !ip.trim()) {
          return { success: false, message: 'Wi-Fi printer IP address is required' };
        }
        const res = await apiClient.post('/hotel/printers/network-print', {
          ip: ip.trim(),
          port: isNaN(port) ? 9100 : port,
          base64Data: base64Data,
        });
        if (res.data && res.data.success !== false) {
          return {
            success: true,
            message: res.data?.data?.message || res.data?.message || `Print job delivered to Wi-Fi printer (${ip}:${port})`,
          };
        }
        return {
          success: false,
          message: res.data?.message || 'Failed to print to Wi-Fi printer',
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Could not connect to Wi-Fi printer via server socket',
        };
      }
    }

    // 3. Bluetooth or USB in Expo Go: Try RawBT thermal intent
    if (printerType === 'BLUETOOTH' || printerType === 'USB') {
      const rawbtRes = await this.printViaRawBt(base64Data);
      if (rawbtRes.success) {
        return rawbtRes;
      }
      return { success: false, message: 'USE_EXPO_FALLBACK' };
    }

    return { success: false, message: 'USE_EXPO_FALLBACK' };
  }

  /**
   * Perform hardware test print.
   * Supports Bluetooth, Wi-Fi, and USB on both Standalone APK and Expo Go!
   */
  public static async testPrint(
    printerType: PrinterInterfaceType,
    target: string,
    paperSize: PrinterPaperSize = '80mm'
  ): Promise<{ success: boolean; message: string }> {
    // 0. Direct Web Bluetooth test print if connected
    if (Platform.OS === 'web' && printerType === "BLUETOOTH" && webBluetoothPrinter.isConnected()) {
      try {
        await webBluetoothPrinter.testPrint(paperSize === "58mm" ? "58mm" : "80mm");
        return {
          success: true,
          message: "Direct ESC/POS test slip printed via Bluetooth",
        };
      } catch (wbErr: any) {
        console.warn("webBluetoothPrinter testPrint error:", wbErr);
      }
    }

    // 1. If native module is available
    if (this.isNativeAvailable()) {
      try {
        const res = await HotelPrinterModule.testPrint(printerType, target, paperSize);
        if (res?.success) {
          return {
            success: true,
            message: res.message || 'Test print sent',
          };
        }
      } catch (err: any) {
        console.warn('Native testPrint error, falling back:', err);
      }
    }

    // 2. Wi-Fi / NETWORK printer: Use backend socket test (Port 9100)
    if (printerType === 'NETWORK') {
      try {
        const cleanTarget = (target || '').replace(/^tcp:\/\/|^http:\/\//, '');
        const [ip, portStr] = cleanTarget.split(':');
        const port = portStr ? parseInt(portStr, 10) : 9100;
        if (!ip || !ip.trim()) {
          return { success: false, message: 'Wi-Fi printer IP address is required' };
        }
        const res = await apiClient.post('/hotel/printers/test', {
          printerType: 'NETWORK',
          connectionString: ip.trim(),
          port: isNaN(port) ? 9100 : port,
          paperSize: paperSize,
        });
        const data = res.data?.data || res.data;
        if (data && (data.status === 'SUCCESS' || data.success === true)) {
          return {
            success: true,
            message: data.message || `Test print sent to Wi-Fi printer (${ip}:${port})`,
          };
        }
        return {
          success: false,
          message: data?.message || 'Wi-Fi printer socket test failed. Verify printer IP and Wi-Fi connection.',
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Could not reach Wi-Fi printer via server socket',
        };
      }
    }

    // 3. Bluetooth or USB in Expo Go:
    // First try RawBT test ESC/POS slip
    try {
      const testBuf = new EscPosBuffer();
      testBuf.alignCenter().bold(true).doubleHeight();
      testBuf.textLine('THERMAL PRINTER TEST');
      testBuf.normalSize().bold(false);
      testBuf.separator(paperSize === '58mm' ? 32 : 48, '=');
      testBuf.alignLeft();
      testBuf.textLine(`Type: ${printerType}`);
      testBuf.textLine(`Device: ${target || 'Thermal Device'}`);
      testBuf.textLine(`Format: ${paperSize}`);
      testBuf.textLine(`Time: ${new Date().toLocaleTimeString('en-IN')}`);
      testBuf.separator(paperSize === '58mm' ? 32 : 48, '-');
      testBuf.alignCenter();
      testBuf.textLine('STATUS: WORKING (EXPO GO)');
      testBuf.textLine('Ajalkar POS Billing Solution');
      testBuf.cut(false);

      const rawbtRes = await this.printViaRawBt(testBuf.toBase64());
      if (rawbtRes.success) {
        return { success: true, message: `Test slip sent to ${printerType} printer via RawBT` };
      }
    } catch { }

    // If Bluetooth/USB on Android in Expo Go, do NOT open the system print spooler preview dialog!
    if (Platform.OS === 'android' && (printerType === 'BLUETOOTH' || printerType === 'USB')) {
      return { success: false, message: 'RAWBT_NOT_INSTALLED' };
    }

    // Fallback: Dispatch test slip via MobilePrintService (Android System Print Spooler)
    try {
      const pSize = paperSize === '58mm' ? '58mm' : paperSize === 'A4' ? 'A4' : '80mm';
      const spoolerRes = await MobilePrintService.testPrint(pSize);
      if (spoolerRes.success) {
        return {
          success: true,
          message: `Test print sent to Android Print Spooler. Select your ${printerType} printer from the dialog.`,
        };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to dispatch test print' };
    }

    return { success: false, message: 'Could not dispatch test print to printer' };
  }

  /**
   * Open Android System Settings -> Printing
   */
  public static async openAndroidPrintSettings(): Promise<void> {
    if (this.isNativeAvailable()) {
      try {
        await HotelPrinterModule.openAndroidPrintSettings();
        return;
      } catch (err) {
        console.warn('openAndroidPrintSettings error:', err);
      }
    }

    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.PRINT_SETTINGS');
      } catch {
        try {
          await Linking.openSettings();
        } catch { }
      }
    } else if (Platform.OS === 'ios') {
      try {
        await Linking.openURL('App-Prefs:root=General');
      } catch {
        try {
          await Linking.openSettings();
        } catch { }
      }
    }
  }

  public static async openBluetoothSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
      } catch {
        try {
          await Linking.openSettings();
        } catch { }
      }
    } else if (Platform.OS === 'ios') {
      try {
        await Linking.openURL('App-Prefs:root=Bluetooth');
      } catch {
        try {
          await Linking.openSettings();
        } catch { }
      }
    }
  }

  // ==========================================
  // CONFIGURATION & BACKEND MANAGEMENT
  // ==========================================

  public static async getPrinterConfigs(branchId?: number): Promise<PrinterConfig[]> {
    try {
      const res = await apiClient.get('/hotel/printers', {
        params: branchId ? { branchId } : {},
      });
      if (Array.isArray(res.data)) {
        await AsyncStorage.setItem(STORAGE_KEY_PRINTER_CONFIGS, JSON.stringify(res.data));
        return res.data;
      }
    } catch (err) {
      // Fallback to cached configs
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_PRINTER_CONFIGS);
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return [];
  }

  public static async savePrinterConfig(config: PrinterConfig): Promise<PrinterConfig> {
    const res = await apiClient.post('/hotel/printers', config);
    // Refresh local cache
    this.getPrinterConfigs(config.branchId).catch(() => { });
    return res.data;
  }

  public static async updatePrinterConfig(
    id: number,
    config: Partial<PrinterConfig>
  ): Promise<PrinterConfig> {
    const res = await apiClient.put(`/hotel/printers/${id}`, config);
    this.getPrinterConfigs().catch(() => { });
    return res.data;
  }

  public static async deletePrinterConfig(id: number): Promise<void> {
    await apiClient.delete(`/hotel/printers/${id}`);
    this.getPrinterConfigs().catch(() => { });
  }

  public static async setDefaultPrinter(
    id: number,
    purpose: PrinterPurpose
  ): Promise<PrinterConfig> {
    const res = await apiClient.post(`/hotel/printers/default`, { id, purpose });
    // Update local default key
    if (purpose === 'RECEIPT') {
      await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_RECEIPT, JSON.stringify(res.data));
    } else if (purpose === 'KOT') {
      await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_KOT, JSON.stringify(res.data));
    } else if (purpose === 'PURCHASE') {
      await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_PURCHASE, JSON.stringify(res.data));
    }
    return res.data;
  }

  public static async getDefaultPrinter(
    purpose: PrinterPurpose = 'RECEIPT',
    branchId?: number
  ): Promise<PrinterConfig | null> {
    try {
      const res = await apiClient.get('/hotel/printers/default', {
        params: { purpose, ...(branchId ? { branchId } : {}) },
      });
      if (res.data) return res.data;
    } catch {
      // Fallback from cache
      try {
        const storageKey =
          purpose === 'RECEIPT'
            ? STORAGE_KEY_DEFAULT_RECEIPT
            : purpose === 'KOT'
              ? STORAGE_KEY_DEFAULT_KOT
              : STORAGE_KEY_DEFAULT_PURCHASE;
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return null;
  }

  // ==========================================
  // ESC/POS BILL & RECEIPT GENERATOR
  // ==========================================

  public static generateBillEscPos(
    data: UniversalInvoicePrintData,
    paperSize: '58mm' | '80mm' = '80mm',
    autoCut: boolean = true,
    openDrawer: boolean = false
  ): string {
    const width = paperSize === '58mm' ? 32 : 48;
    const buf = new EscPosBuffer();

    if (openDrawer) {
      buf.drawerKick();
    }

    // Header
    buf.alignCenter();
    buf.bold(true).doubleHeight();
    buf.textLine(data.hotelName || 'HOTEL MANAGEMENT POS');
    buf.normalSize().bold(false);

    if (data.hotelAddress) {
      buf.textLine(data.hotelAddress);
    }
    if (data.hotelPhone) {
      buf.textLine('Tel: ' + data.hotelPhone);
    }
    if (data.gstin) {
      buf.textLine('GSTIN: ' + data.gstin);
    }
    if (data.fssai) {
      buf.textLine('FSSAI: ' + data.fssai);
    }

    buf.separator(width, '=');
    buf.bold(true);
    buf.textLine(data.gstin ? 'TAX INVOICE' : 'RETAIL BILL');
    buf.bold(false);
    buf.separator(width, '-');

    // Bill Info
    buf.alignLeft();
    buf.row('Invoice: #' + data.invoiceNumber, 'Date: ' + data.invoiceDate, width);
    if (data.tableName) {
      buf.row('Table: ' + data.tableName, 'Staff: ' + (data.serverName || 'Staff'), width);
    }
    if (data.orderNumber) {
      buf.textLine('Order No: #' + data.orderNumber);
    }
    if (data.customerName && data.customerName !== 'Walk-in' && data.customerName !== 'Guest') {
      buf.row('Customer: ' + data.customerName, data.customerPhone || '', width);
    }

    buf.separator(width, '-');

    // Column Headers
    buf.bold(true);
    buf.row3('ITEM', 'QTY', 'AMOUNT', width);
    buf.bold(false);
    buf.separator(width, '-');

    // Items
    for (const item of data.items || []) {
      const name = item.name;
      const qty = `${item.quantity}`;
      const amount = `Rs.${(item.totalPrice || item.quantity * item.unitPrice).toFixed(2)}`;
      buf.row3(name, qty, amount, width);
    }

    buf.separator(width, '-');

    // Totals
    buf.alignLeft();
    buf.row('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`, width);

    if (data.discountAmount && data.discountAmount > 0) {
      buf.row('Discount:', `-Rs.${data.discountAmount.toFixed(2)}`, width);
    }
    if (data.cgstAmount && data.cgstAmount > 0) {
      buf.row('CGST:', `Rs.${data.cgstAmount.toFixed(2)}`, width);
    }
    if (data.sgstAmount && data.sgstAmount > 0) {
      buf.row('SGST:', `Rs.${data.sgstAmount.toFixed(2)}`, width);
    }
    if (data.totalTax && data.totalTax > 0 && !data.cgstAmount) {
      buf.row('Taxes:', `Rs.${data.totalTax.toFixed(2)}`, width);
    }

    buf.separator(width, '=');
    buf.bold(true).doubleHeight();
    buf.row('NET TOTAL:', `Rs.${data.grandTotal.toFixed(2)}`, width);
    buf.normalSize().bold(false);
    buf.separator(width, '=');

    // Payment Details
    if (data.paymentMethod) {
      buf.row('Payment Mode:', data.paymentMethod, width);
    }

    // Footer
    buf.alignCenter();
    buf.feed(1);
    buf.textLine('*** THANK YOU! VISIT AGAIN ***');
    buf.textLine('Software: Ajalkar POS');

    if (autoCut) {
      buf.cut(false);
    } else {
      buf.feed(3);
    }

    return buf.toBase64();
  }

  public static generateKotEscPos(
    kotData: {
      orderId: string | number;
      tableNo: string;
      orderType?: string;
      waiterName?: string;
      date?: string;
      time?: string;
      items: Array<{ name: string; quantity: number; notes?: string }>;
    },
    paperSize: '58mm' | '80mm' = '80mm',
    autoCut: boolean = true
  ): string {
    const width = paperSize === '58mm' ? 32 : 48;
    const buf = new EscPosBuffer();

    buf.alignCenter();
    buf.bold(true).doubleSize();
    buf.textLine('KITCHEN ORDER TICKET (KOT)');
    buf.normalSize().bold(false);
    buf.separator(width, '=');

    buf.alignLeft();
    buf.bold(true);
    buf.row('KOT / Order: #' + kotData.orderId, 'Table: ' + kotData.tableNo, width);
    buf.bold(false);
    buf.row('Type: ' + (kotData.orderType || 'Dine-In'), 'Waiter: ' + (kotData.waiterName || 'Staff'), width);
    buf.row('Date: ' + (kotData.date || new Date().toLocaleDateString()), 'Time: ' + (kotData.time || new Date().toLocaleTimeString()), width);

    buf.separator(width, '-');
    buf.bold(true);
    buf.row('ITEM DESCRIPTION', 'QTY', width);
    buf.bold(false);
    buf.separator(width, '-');

    for (const item of kotData.items || []) {
      buf.bold(true);
      buf.row(item.name, `  [ ${item.quantity} ]`, width);
      buf.bold(false);
      if (item.notes) {
        buf.textLine(`  * Note: ${item.notes}`);
      }
    }

    buf.separator(width, '=');
    buf.alignCenter();
    buf.feed(1);

    if (autoCut) {
      buf.cut(false);
    } else {
      buf.feed(3);
    }

    return buf.toBase64();
  }

  public static generatePurchaseEscPos(
    purchaseData: {
      title: string; // 'PURCHASE ORDER' | 'PURCHASE INVOICE' | 'PURCHASE RETURN'
      referenceNo: string;
      supplierName: string;
      supplierPhone?: string;
      supplierGstin?: string;
      date: string;
      items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
      subtotal: number;
      taxTotal?: number;
      netTotal: number;
      notes?: string;
    },
    paperSize: '58mm' | '80mm' = '80mm',
    autoCut: boolean = true
  ): string {
    const width = paperSize === '58mm' ? 32 : 48;
    const buf = new EscPosBuffer();

    buf.alignCenter();
    buf.bold(true).doubleHeight();
    buf.textLine(purchaseData.title);
    buf.normalSize().bold(false);
    buf.separator(width, '=');

    buf.alignLeft();
    buf.row('Ref No: #' + purchaseData.referenceNo, 'Date: ' + purchaseData.date, width);
    buf.textLine('Supplier: ' + purchaseData.supplierName);
    if (purchaseData.supplierPhone) buf.textLine('Phone: ' + purchaseData.supplierPhone);
    if (purchaseData.supplierGstin) buf.textLine('GSTIN: ' + purchaseData.supplierGstin);

    buf.separator(width, '-');
    buf.bold(true);
    buf.row3('ITEM', 'QTY', 'AMOUNT', width);
    buf.bold(false);
    buf.separator(width, '-');

    for (const item of purchaseData.items || []) {
      buf.row3(item.name, `${item.quantity}`, `Rs.${item.total.toFixed(2)}`, width);
    }

    buf.separator(width, '-');
    buf.row('Subtotal:', `Rs.${purchaseData.subtotal.toFixed(2)}`, width);
    if (purchaseData.taxTotal && purchaseData.taxTotal > 0) {
      buf.row('GST Tax:', `Rs.${purchaseData.taxTotal.toFixed(2)}`, width);
    }
    buf.separator(width, '=');
    buf.bold(true).doubleHeight();
    buf.row('TOTAL:', `Rs.${purchaseData.netTotal.toFixed(2)}`, width);
    buf.normalSize().bold(false);
    buf.separator(width, '=');

    if (purchaseData.notes) {
      buf.textLine('Notes: ' + purchaseData.notes);
    }

    buf.alignCenter();
    buf.feed(1);
    buf.textLine('Generated by Ajalkar POS Purchase System');

    if (autoCut) {
      buf.cut(false);
    } else {
      buf.feed(3);
    }

    return buf.toBase64();
  }

  /**
   * Direct high-level print method:
   * If a native printer is configured / available, print directly via ESC/POS Bluetooth/USB/Network.
   * On Expo Go:
   * - NETWORK (Wi-Fi) printers print directly via server TCP socket!
   * - BLUETOOTH / USB print via RawBT if installed, or fall back to Android Print Spooler.
   */
  public static async printDirectThermalInvoice(
    invoiceData: UniversalInvoicePrintData,
    paperSize: '58mm' | '80mm' | 'A4' = '80mm',
    printerConfig?: PrinterConfig | null
  ): Promise<{ success: boolean; message: string }> {
    if (paperSize === 'A4') {
      return { success: false, message: 'USE_EXPO_FALLBACK' };
    }

    try {
      // Find default printer if not provided
      let targetPrinter = printerConfig;
      if (!targetPrinter) {
        targetPrinter = await this.getDefaultPrinter('RECEIPT');
      }

      // If we have a NETWORK (Wi-Fi) printer configured:
      if (targetPrinter && targetPrinter.printerType === 'NETWORK') {
        const ip = targetPrinter.ipAddress || '';
        const port = targetPrinter.port || 9100;
        if (ip) {
          const base64EscPos = this.generateBillEscPos(
            invoiceData,
            paperSize === '58mm' ? '58mm' : '80mm',
            targetPrinter.autoCut ?? true,
            targetPrinter.openDrawer ?? false
          );
          return await this.printEscPos('NETWORK', `${ip}:${port}`, base64EscPos);
        }
      }

      // If native module is available (standalone APK)
      if (this.isNativeAvailable()) {
        let printerType: PrinterInterfaceType = 'BLUETOOTH';
        let target = '';

        if (targetPrinter) {
          printerType = targetPrinter.printerType;
          target =
            targetPrinter.printerType === 'BLUETOOTH'
              ? targetPrinter.macAddress || ''
              : targetPrinter.printerType === 'NETWORK'
                ? `${targetPrinter.ipAddress}:${targetPrinter.port || 9100}`
                : targetPrinter.usbIdentifier || '';
        } else {
          const paired = await this.scanBluetoothPrinters();
          if (paired && paired.length > 0) {
            target = paired[0].address;
            printerType = 'BLUETOOTH';
          }
        }

        if (target) {
          const base64EscPos = this.generateBillEscPos(
            invoiceData,
            paperSize === '58mm' ? '58mm' : '80mm',
            targetPrinter?.autoCut ?? true,
            targetPrinter?.openDrawer ?? false
          );
          return await this.printEscPos(printerType, target, base64EscPos);
        }
      }

      // Expo Go mode: Try RawBT ESC/POS for Bluetooth or USB
      const base64EscPos = this.generateBillEscPos(
        invoiceData,
        paperSize === '58mm' ? '58mm' : '80mm',
        targetPrinter?.autoCut ?? true,
        targetPrinter?.openDrawer ?? false
      );
      const rawbtRes = await this.printViaRawBt(base64EscPos);
      if (rawbtRes.success) {
        return rawbtRes;
      }

      // Otherwise signal caller to dispatch via Android System Print Spooler (expo-print)
      return { success: false, message: 'USE_EXPO_FALLBACK' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Direct thermal print failed' };
    }
  }
}
