import { Platform } from 'react-native';
import { UsbPrinterDevice, UsbState, PaperSize } from '../types/printing';
import { encodeTestPrintEscPos } from './escposGenerator';

class WebUsbPrinterService {
  private device: any | null = null;
  private endpointNumber: number = 1;
  private interfaceNumber: number = 0;
  private state: UsbState = 'disconnected';
  private listeners: Array<(state: UsbState, device: UsbPrinterDevice | null) => void> = [];

  constructor() {
    // If a USB device was previously remembered, register disconnect listener
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'usb' in navigator) {
      (navigator as any).usb.addEventListener('disconnect', (event: any) => {
        if (this.device && event.device === this.device) {
          this.handleDisconnectEvent();
        }
      });
    }
  }

  public isSupported(): boolean {
    return Platform.OS === 'web' && typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  public getState(): UsbState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'connected' && this.device !== null && Boolean(this.device.opened);
  }

  public getConnectedPrinter(): UsbPrinterDevice | null {
    if (!this.device) {
      // Check if previously connected name was stored
      const cachedName = typeof localStorage !== 'undefined' ? localStorage.getItem('ajalkar_usb_printer_name') : null;
      if (cachedName) {
        return {
          name: cachedName,
          connected: false,
        };
      }
      return null;
    }
    return {
      id: `${this.device.vendorId}_${this.device.productId}`,
      name: this.device.productName || 'USB Thermal Printer',
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      connected: this.isConnected(),
      rawDevice: this.device,
    };
  }

  public subscribe(cb: (state: UsbState, device: UsbPrinterDevice | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.state, this.getConnectedPrinter());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const printer = this.getConnectedPrinter();
    this.listeners.forEach((l) => l(this.state, printer));
  }

  private handleDisconnectEvent() {
    this.device = null;
    this.state = 'disconnected';
    this.notify();
  }

  public async connect(): Promise<UsbPrinterDevice> {
    if (!this.isSupported()) {
      throw new Error(
        'WebUSB is not supported in this browser. Please use Google Chrome or Microsoft Edge on Windows/Mac/Android.'
      );
    }

    try {
      this.state = 'connecting';
      this.notify();

      const navUsb = (navigator as any).usb;
      // Request any USB device so the user can select their thermal receipt printer
      const device = await navUsb.requestDevice({ filters: [] });

      if (!device) {
        throw new Error('No USB printer was selected.');
      }

      await device.open();

      // Ensure a configuration is selected
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find the interface with an OUT endpoint (for writing ESC/POS commands)
      let foundOutEndpoint = false;
      let targetInterface = 0;
      let targetOutEndpoint = 1;

      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out') {
              targetInterface = iface.interfaceNumber;
              targetOutEndpoint = ep.endpointNumber;
              foundOutEndpoint = true;
              break;
            }
          }
          if (foundOutEndpoint) break;
        }
        if (foundOutEndpoint) break;
      }

      try {
        await device.claimInterface(targetInterface);
      } catch (claimErr: any) {
        // If the OS driver (e.g. Windows USB Print Spooler) is currently locking the USB device interface:
        console.warn('WebUSB claimInterface error:', claimErr);
        throw new Error(
          `Connected to ${device.productName || 'USB device'}, but interface is reserved by Windows OS print driver. If this happens, you can also print directly using "System / Browser Spooler".`
        );
      }

      this.device = device;
      this.interfaceNumber = targetInterface;
      this.endpointNumber = targetOutEndpoint;
      this.state = 'connected';
      this.notify();

      const printerName = device.productName || 'USB Thermal Receipt Printer';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ajalkar_usb_printer_name', printerName);
      }

      return {
        id: `${device.vendorId}_${device.productId}`,
        name: printerName,
        vendorId: device.vendorId,
        productId: device.productId,
        connected: true,
      };
    } catch (err: any) {
      this.state = 'error';
      this.notify();
      throw new Error(err.message || 'Failed to connect to USB printer');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device) {
      try {
        if (this.device.opened) {
          await this.device.releaseInterface(this.interfaceNumber);
          await this.device.close();
        }
      } catch (e) {
        // ignore
      }
    }
    this.device = null;
    this.state = 'disconnected';
    this.notify();
  }

  public async printEscPos(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected() || !this.device) {
      // Attempt silent re-open if device is available
      if (this.device) {
        try {
          await this.device.open();
          if (this.device.configuration === null) await this.device.selectConfiguration(1);
          await this.device.claimInterface(this.interfaceNumber);
          this.state = 'connected';
          this.notify();
        } catch {
          throw new Error('USB thermal printer is disconnected. Please click "Connect USB" in settings.');
        }
      } else {
        throw new Error('USB thermal printer is not connected. Please connect your USB printer first.');
      }
    }

    try {
      // Preamble: clear command buffer and reset hardware
      const preamble = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x18, 0x1b, 0x40]);
      await this.device.transferOut(this.endpointNumber, preamble);
      await new Promise((r) => setTimeout(r, 80));

      // Chunk payload into 32-byte USB packets (prevents FIFO overrun on USB-serial bridges like CH340)
      const chunkSize = 32;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await this.device.transferOut(this.endpointNumber, chunk);
        const hasLF = chunk.some((b: number) => b === 0x0a || b === 0x1d);
        await new Promise((r) => setTimeout(r, hasLF ? 35 : 15));
      }
      await new Promise((r) => setTimeout(r, 120));
      return true;
    } catch (err: any) {
      console.error('USB transferOut error:', err);
      throw new Error('Failed to send print commands to USB printer: ' + err.message);
    }
  }

  public async testPrint(paperSize: PaperSize): Promise<boolean> {
    const bytes = encodeTestPrintEscPos(paperSize, this.device?.productName || 'USB Thermal Printer');
    return this.printEscPos(bytes);
  }
}

export const webUsbPrinter = new WebUsbPrinterService();

