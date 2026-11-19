import { PaperSize } from '../types/printing';
import { encodeTestPrintEscPos } from './escposGenerator';
import { PrinterApiService } from './printerApiService';

class WebWifiPrinterService {
  private defaultIpKey = 'ajalkar_wifi_printer_ip';
  private defaultPortKey = 'ajalkar_wifi_printer_port';

  public getIp(): string {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.defaultIpKey) || '192.168.1.100';
    }
    return '192.168.1.100';
  }

  public setIp(ip: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.defaultIpKey, ip.trim());
    }
  }

  public getPort(): number {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(this.defaultPortKey);
      if (val && !isNaN(Number(val))) {
        return Number(val);
      }
    }
    return 9100;
  }

  public setPort(port: number): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.defaultPortKey, String(port));
    }
  }

  /**
   * Helper to convert Uint8Array bytes to Base64
   */
  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Send ESC/POS raw bytes to Wi-Fi / Network thermal printer via TCP socket
   */
  public async printEscPos(bytes: Uint8Array, targetIp?: string, targetPort?: number): Promise<boolean> {
    const ip = targetIp || this.getIp();
    const port = targetPort || this.getPort();

    if (!ip) {
      throw new Error('Please configure the Wi-Fi printer IP address in Settings.');
    }

    const base64Data = this.bytesToBase64(bytes);
    const result = await PrinterApiService.printNetworkEscPos(ip, port, base64Data);

    if (!result.success) {
      throw new Error(result.message || `Failed to print to Wi-Fi printer at ${ip}:${port}`);
    }

    return true;
  }

  /**
   * Sends ESC/POS test slip to Wi-Fi printer
   */
  public async testPrint(paperSize: PaperSize, targetIp?: string, targetPort?: number): Promise<boolean> {
    const ip = targetIp || this.getIp();
    const port = targetPort || this.getPort();

    const bytes = encodeTestPrintEscPos(paperSize, `Wi-Fi Printer (${ip})`);
    return this.printEscPos(bytes, ip, port);
  }
}

export const webWifiPrinter = new WebWifiPrinterService();

