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
  private keepAliveInterval: any = null;
  private reconnectTimer: any = null;
  private userInitiatedDisconnect = false;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getState(): BluetoothState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'connected' && this.device !== null && this.characteristic !== null && Boolean(this.device.gatt?.connected);
  }

  public getConnectedPrinter(): BluetoothPrinterDevice | null {
    if (!this.device) return null;
    return {
      id: this.device.id,
      name: this.device.name || 'Bluetooth Thermal Printer',
      connected: this.state === 'connected',
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

  private startKeepAlive() {
    this.stopKeepAlive();
    // Heartbeat every 12 seconds to prevent Windows BLE sleep timer from dropping connection
    this.keepAliveInterval = setInterval(async () => {
      if (this.isConnected() && this.characteristic) {
        try {
          // Send innocuous real-time status query (DLE EOT 1: Transmit printer status)
          const ping = new Uint8Array([0x10, 0x04, 0x01]);
          if (this.characteristic.writeValueWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(ping);
          } else {
            await this.characteristic.writeValue(ping);
          }
        } catch {
          // If ping fails, trigger silent reconnect
          this.handleDisconnectEvent();
        }
      }
    }, 12000);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private handleDisconnectEvent() {
    this.stopKeepAlive();
    this.characteristic = null;
    this.state = 'disconnected';
    this.notify();

    // Auto-reconnect if device is known and user didn't explicitly disconnect
    if (!this.userInitiatedDisconnect && this.device) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(async () => {
        try {
          console.log('[Bluetooth] Auto-reconnecting to paired device:', this.device?.name);
          await this.reconnectToDevice(this.device);
        } catch (e) {
          console.log('[Bluetooth] Silent reconnect will retry on print');
        }
      }, 2000);
    }
  }

  private async discoverCharacteristic(server: any): Promise<any> {
    for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      } catch {
        // continue
      }
    }

    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public async reconnectToDevice(device: any): Promise<boolean> {
    if (!device || !device.gatt) return false;
    try {
      this.state = 'connecting';
      this.notify();
      const server = await device.gatt.connect();
      const char = await this.discoverCharacteristic(server);
      if (char) {
        this.device = device;
        this.characteristic = char;
        this.state = 'connected';
        this.startKeepAlive();
        this.notify();
        return true;
      }
    } catch (err) {
      console.warn('[Bluetooth] Reconnect failed:', err);
    }
    this.state = 'disconnected';
    this.notify();
    return false;
  }

  public async connect(): Promise<BluetoothPrinterDevice> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge (Desktop/Android).'
      );
    }

    this.userInitiatedDisconnect = false;

    try {
      this.state = 'connecting';
      this.notify();

      const nav: any = navigator;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      if (!device) {
        throw new Error('No Bluetooth printer selected.');
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnectEvent();
      });

      const server = await device.gatt.connect();
      const char = await this.discoverCharacteristic(server);

      if (!char) {
        await device.gatt.disconnect();
        throw new Error(
          'Connected to ' + (device.name || 'device') + ', but could not locate ESC/POS writable service. Ensure printer is in BLE mode.'
        );
      }

      this.device = device;
      this.characteristic = char;
      this.state = 'connected';
      this.startKeepAlive();
      this.notify();

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
    this.userInitiatedDisconnect = true;
    this.stopKeepAlive();
    clearTimeout(this.reconnectTimer);

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        await this.device.gatt.disconnect();
      } catch (e) {}
    }
    this.device = null;
    this.characteristic = null;
    this.state = 'disconnected';
    this.notify();
  }

  public async printEscPos(bytes: Uint8Array): Promise<boolean> {
    // If connection was dropped by OS idle timer, silently re-establish GATT session immediately!
    if (!this.isConnected() && this.device) {
      console.log('[Bluetooth] Resuming GATT connection for print job...');
      const reconnected = await this.reconnectToDevice(this.device);
      if (!reconnected) {
        throw new Error('Bluetooth thermal printer is disconnected. Please re-connect in Billing Settings.');
      }
    }

    if (!this.characteristic || this.state !== 'connected') {
      throw new Error('Bluetooth printer is not connected. Please enable and connect in Billing Settings.');
    }

    try {
      const chunkSize = 64;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
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
