import { BluetoothPrinterDevice, BluetoothState, PaperSize } from '../types/printing';
import { encodeTestPrintEscPos } from './escposGenerator';

// Common Bluetooth Low Energy (BLE) Thermal Printer Service UUIDs
const PRINTER_SERVICE_UUIDS = [
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (ManeMess-Printer, Xprinter, etc.)
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART TX/RX
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common Generic Thermal Printer
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent POS BLE
  '0000af30-0000-1000-8000-00805f9b34fb', // Xprinter / Hoin BLE
  '000018f1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
];

class WebBluetoothPrinterService {
  private device: any | null = null;
  private characteristic: any | null = null;
  private state: BluetoothState = 'disconnected';
  private listeners: Array<(state: BluetoothState, device: BluetoothPrinterDevice | null) => void> = [];

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getState(): BluetoothState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'connected' && this.device !== null;
  }

  public getConnectedPrinter(): BluetoothPrinterDevice | null {
    if (!this.device || this.state !== 'connected') return null;
    return {
      id: this.device.id,
      name: this.device.name || 'Bluetooth Thermal Printer',
      connected: true,
      rawDevice: this.device,
    };
  }

  public subscribe(cb: (state: BluetoothState, device: BluetoothPrinterDevice | null) => void): () => void {
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

  public async connect(): Promise<BluetoothPrinterDevice> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge (Desktop/Android) over HTTPS or localhost.'
      );
    }

    try {
      this.state = 'connecting';
      this.notify();

      // Request Bluetooth Device
      const nav: any = navigator;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      if (!device) {
        throw new Error('No Bluetooth printer selected.');
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.device = null;
        this.characteristic = null;
        this.state = 'disconnected';
        this.notify();
      });

      // Connect to GATT Server
      const server = await device.gatt.connect();

      // Find writable characteristic in any supported service
      let targetCharacteristic: any = null;

      for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // Continue scanning services
        }
      }

      if (!targetCharacteristic) {
        // Fallback: search all primary services if permitted
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                targetCharacteristic = char;
                break;
              }
            }
            if (targetCharacteristic) break;
          }
        } catch (err) {
          console.warn('Could not enumerate all services:', err);
        }
      }

      if (!targetCharacteristic) {
        await device.gatt.disconnect();
        throw new Error(
          'Connected to ' + (device.name || 'device') + ', but could not locate an ESC/POS writable service. Ensure your thermal printer is turned on in BLE mode.'
        );
      }

      this.device = device;
      this.characteristic = targetCharacteristic;
      this.state = 'connected';
      this.notify();

      // Save last printer name in localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ajalkar_bt_printer_name', device.name || 'Bluetooth Thermal Printer');
      }

      return {
        id: device.id,
        name: device.name || 'Bluetooth Thermal Printer',
        connected: true,
      };
    } catch (err: any) {
      this.state = 'error';
      this.notify();
      throw new Error(err.message || 'Failed to connect to Bluetooth printer');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.state = 'disconnected';
    this.notify();
  }

  public async printEscPos(bytes: Uint8Array): Promise<boolean> {
    if (!this.characteristic || this.state !== 'connected') {
      throw new Error('Bluetooth printer is not connected. Please connect the printer first.');
    }

    try {
      // Chunk writing to prevent BLE buffer overflow (chunk size 64 bytes)
      const chunkSize = 64;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        // Small 15ms sleep between packets for buffer processing on small microcontrollers
        await new Promise((r) => setTimeout(r, 15));
      }
      return true;
    } catch (err: any) {
      console.error('Bluetooth write error:', err);
      throw new Error('Failed to send print commands to Bluetooth printer: ' + err.message);
    }
  }

  public async testPrint(paperSize: PaperSize): Promise<boolean> {
    const bytes = encodeTestPrintEscPos(paperSize, this.device?.name || 'Bluetooth Printer');
    return this.printEscPos(bytes);
  }
}

export const webBluetoothPrinter = new WebBluetoothPrinterService();
