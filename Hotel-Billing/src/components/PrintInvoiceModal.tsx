import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  ReceiptIndianRupee,
  Eye,
  Download,
  Settings2,
  Loader2,
  Check,
} from 'lucide-react';
import {
  UniversalInvoicePrintData,
  PaperSize,
  PrintMethod,
  BluetoothPrinterDevice,
  BluetoothState,
  UsbPrinterDevice,
  UsbState,
} from '../types/printing';
import { generateInvoiceHtml } from '../services/invoicePrintRenderer';
import { webBluetoothPrinter } from '../services/webBluetoothPrinter';
import { webUsbPrinter } from '../services/webUsbPrinter';
import { webWifiPrinter } from '../services/webWifiPrinter';
import { printService } from '../services/printService';
import { useToast } from '../context/ToastContext';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: UniversalInvoicePrintData | null;
  onPrinted?: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceData,
  onPrinted,
}) => {
  const { showToast } = useToast();

  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [printMethod, setPrintMethod] = useState<PrintMethod>('browser');
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isConnectingBt, setIsConnectingBt] = useState<boolean>(false);
  const [btDevice, setBtDevice] = useState<BluetoothPrinterDevice | null>(null);
  const [btState, setBtState] = useState<BluetoothState>('disconnected');
  const [isBtSupported, setIsBtSupported] = useState<boolean>(false);

  // USB Printer State
  const [usbDevice, setUsbDevice] = useState<UsbPrinterDevice | null>(null);
  const [usbState, setUsbState] = useState<UsbState>('disconnected');
  const [isConnectingUsb, setIsConnectingUsb] = useState<boolean>(false);
  const isUsbSupported = webUsbPrinter.isSupported();

  // Wi-Fi / Network Printer State
  const [wifiIp, setWifiIp] = useState<string>(() => webWifiPrinter.getIp());
  const [wifiPort, setWifiPort] = useState<number>(() => webWifiPrinter.getPort());
  const [isEditingWifi, setIsEditingWifi] = useState<boolean>(false);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(380);

  // Initialize preferences & Printer states
  useEffect(() => {
    if (isOpen) {
      setPaperSize(printService.getDefaultPaperSize());
      setPrintMethod(printService.getDefaultPrintMethod());
      setIsBtSupported(webBluetoothPrinter.isSupported());
      setBtState(webBluetoothPrinter.getState());
      setBtDevice(webBluetoothPrinter.getConnectedPrinter());
      setUsbState(webUsbPrinter.getState());
      setUsbDevice(webUsbPrinter.getConnectedPrinter());
      setWifiIp(webWifiPrinter.getIp());
      setWifiPort(webWifiPrinter.getPort());
    }
  }, [isOpen]);

  // Subscribe to Bluetooth device changes
  useEffect(() => {
    const unsubscribe = webBluetoothPrinter.subscribe((state, device) => {
      setBtState(state);
      setBtDevice(device);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to USB device changes
  useEffect(() => {
    const unsubscribe = webUsbPrinter.subscribe((state, device) => {
      setUsbState(state);
      setUsbDevice(device);
    });
    return () => unsubscribe();
  }, []);

  // Compute live preview HTML
  const previewHtml = useMemo(() => {
    if (!invoiceData) return '';
    return generateInvoiceHtml(invoiceData, paperSize);
  }, [invoiceData, paperSize]);

  // Measure and adjust iframe height safely
  const syncIframeHeight = (frameElement?: HTMLIFrameElement | null) => {
    try {
      const frame = frameElement || previewIframeRef.current;
      if (!frame) return;
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (doc?.body) {
        // Fallback in case srcdoc was delayed or cleared
        if (!doc.body.innerHTML || doc.body.innerHTML.trim() === '') {
          if (previewHtml) {
            doc.open();
            doc.write(previewHtml);
            doc.close();
          }
        }
        const bHeight = Math.ceil(doc.body.scrollHeight || doc.body.offsetHeight || 0);
        if (bHeight > 40) {
          setIframeHeight(paperSize === 'A4' ? 520 : bHeight + 10);
        }
      }
    } catch {
      // fallback
    }
  };

  // Sync preview iframe content & height
  useEffect(() => {
    if (!isOpen || !previewHtml) return;

    const t1 = setTimeout(() => syncIframeHeight(), 50);
    const t2 = setTimeout(() => syncIframeHeight(), 180);
    const t3 = setTimeout(() => syncIframeHeight(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [previewHtml, paperSize, isOpen]);

  if (!isOpen || !invoiceData) return null;

  // Handle Bluetooth Connect
  const handleConnectBluetooth = async () => {
    try {
      setIsConnectingBt(true);
      const dev = await webBluetoothPrinter.connect();
      setBtDevice(dev);
      showToast('success', `Connected to ${dev.name}!`);
    } catch (err: any) {
      showToast('error', err.message || 'Could not connect to Bluetooth printer');
    } finally {
      setIsConnectingBt(false);
    }
  };

  // Handle Bluetooth Disconnect
  const handleDisconnectBluetooth = async () => {
    try {
      await webBluetoothPrinter.disconnect();
      setBtDevice(null);
      showToast('info', 'Bluetooth printer disconnected.');
    } catch (err: any) {
      showToast('error', err.message || 'Error disconnecting');
    }
  };

  // Handle USB Connect
  const handleConnectUsb = async () => {
    try {
      setIsConnectingUsb(true);
      const dev = await webUsbPrinter.connect();
      setUsbDevice(dev);
      showToast('success', `Connected to USB Printer (${dev.name})!`);
    } catch (err: any) {
      showToast('error', err.message || 'Could not connect to USB printer');
    } finally {
      setIsConnectingUsb(false);
    }
  };

  // Handle USB Disconnect
  const handleDisconnectUsb = async () => {
    try {
      await webUsbPrinter.disconnect();
      setUsbDevice(null);
      showToast('info', 'USB printer disconnected.');
    } catch (err: any) {
      showToast('error', err.message || 'Error disconnecting');
    }
  };

  // Handle Test Print
  const handleTestPrint = async () => {
    try {
      setIsPrinting(true);
      if (printMethod === 'bluetooth') {
        if (!btDevice || btState !== 'connected') {
          showToast('error', 'Please connect a Bluetooth printer first.');
          return;
        }
        await webBluetoothPrinter.testPrint(paperSize);
        showToast('success', `Test slip printed to ${btDevice.name}!`);
      } else if (printMethod === 'wifi') {
        if (!wifiIp) {
          showToast('error', 'Please enter a valid Wi-Fi printer IP address.');
          return;
        }
        await webWifiPrinter.testPrint(paperSize, wifiIp, wifiPort);
        showToast('success', `Test slip sent to Wi-Fi printer (${wifiIp}:${wifiPort})!`);
      } else if (printMethod === 'usb') {
        if (!webUsbPrinter.isConnected()) {
          showToast('error', 'Please click "Connect USB" to pair your USB thermal printer.');
          return;
        }
        await webUsbPrinter.testPrint(paperSize);
        showToast('success', `Test slip printed to ${usbDevice?.name || 'USB Thermal Printer'}!`);
      } else {
        const testHtml = generateInvoiceHtml(invoiceData, paperSize);
        await printService.printViaBrowser(testHtml);
        showToast('success', 'Test print sent to system print spooler.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Test print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle Confirm Print
  const handlePrint = async () => {
    try {
      setIsPrinting(true);

      // Validate A4 on Thermal modes
      if ((printMethod === 'bluetooth' || printMethod === 'wifi' || printMethod === 'usb') && paperSize === 'A4') {
        showToast(
          'error',
          'Thermal roll printers only support 58mm or 80mm rolls. Select System/Browser Print for A4 documents.'
        );
        return;
      }

      if (saveAsDefault) {
        printService.setDefaultPaperSize(paperSize);
        printService.setDefaultPrintMethod(printMethod);
      }

      await printService.executePrint(invoiceData, {
        paperSize,
        method: printMethod,
      });

      showToast('success', `Print job sent (${paperSize.toUpperCase()} via ${printMethod.toUpperCase()})`);
      if (onPrinted) onPrinted();
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to print invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 0, 64, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #090040 0%, #17076A 100%)',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Printer size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {invoiceData.invoiceNumber?.toUpperCase().startsWith('KOT') && !invoiceData.invoiceNumber?.toUpperCase().startsWith('INV') ? 'Print KOT Ticket' : 'Print Tax Invoice'} #{invoiceData.invoiceNumber}
                </h3>
                <span
                  style={{
                    backgroundColor: invoiceData.paymentStatus === 'PAID' ? '#10B981' : '#F59E0B',
                    color: '#FFFFFF',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {invoiceData.paymentStatus || 'PAID'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#E2E8F0', marginTop: '2px' }}>
                Select paper roll format (58mm / 80mm / A4) and printer output destination
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Left Controls (40%) + Right Live Preview (60%) */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
            minHeight: '480px',
          }}
        >
          {/* Controls Column */}
          <div
            style={{
              width: '360px',
              borderRight: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              overflowY: 'auto',
              backgroundColor: '#F8FAFC',
            }}
          >
            {/* 1. Paper Size Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#090040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Select Paper Size
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: '58mm' as PaperSize, label: '58mm', desc: '2" Pocket' },
                  { id: '80mm' as PaperSize, label: '80mm', desc: '3" Standard' },
                  { id: 'A4' as PaperSize, label: 'A4', desc: 'Full Sheet' },
                ].map((tier) => {
                  const isSelected = paperSize === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setPaperSize(tier.id)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #090040' : '1px solid #CBD5E1',
                        backgroundColor: isSelected ? '#FFFFFF' : '#F1F5F9',
                        boxShadow: isSelected ? '0 4px 10px rgba(9, 0, 64, 0.12)' : 'none',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: isSelected ? '#090040' : '#475569' }}>
                        {tier.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isSelected ? '#1E293B' : '#64748B', marginTop: '2px' }}>
                        {tier.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Destination / Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#090040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Output Destination
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Option A: System / Browser Print */}
                <div
                  onClick={() => setPrintMethod('browser')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: printMethod === 'browser' ? '2px solid #090040' : '1px solid #CBD5E1',
                    backgroundColor: printMethod === 'browser' ? '#FFFFFF' : '#F1F5F9',
                    boxShadow: printMethod === 'browser' ? '0 3px 8px rgba(9, 0, 64, 0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: printMethod === 'browser' ? '#090040' : '#E2E8F0',
                      color: printMethod === 'browser' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Printer size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#090040' }}>
                      System / Browser Print Spooler
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      USB, Wi-Fi, Network & Virtual PDF printers
                    </div>
                  </div>
                  {printMethod === 'browser' && <Check size={16} color="#090040" strokeWidth={3} />}
                </div>

                {/* Option B: Direct Bluetooth Thermal */}
                <div
                  onClick={() => {
                    if (paperSize === 'A4') {
                      setPaperSize('80mm');
                    }
                    setPrintMethod('bluetooth');
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: printMethod === 'bluetooth' ? '2px solid #090040' : '1px solid #CBD5E1',
                    backgroundColor: printMethod === 'bluetooth' ? '#FFFFFF' : '#F1F5F9',
                    boxShadow: printMethod === 'bluetooth' ? '0 3px 8px rgba(9, 0, 64, 0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: printMethod === 'bluetooth' ? '#090040' : '#E2E8F0',
                      color: printMethod === 'bluetooth' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bluetooth size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#090040' }}>
                      Direct Bluetooth Thermal (ESC/POS)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Pair with 58mm/80mm BLE thermal printers
                    </div>
                  </div>
                  {printMethod === 'bluetooth' && <Check size={16} color="#090040" strokeWidth={3} />}
                </div>

                {/* Option C: Direct Wi-Fi / Network Thermal */}
                <div
                  onClick={() => {
                    if (paperSize === 'A4') {
                      setPaperSize('80mm');
                    }
                    setPrintMethod('wifi');
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: printMethod === 'wifi' ? '2px solid #090040' : '1px solid #CBD5E1',
                    backgroundColor: printMethod === 'wifi' ? '#FFFFFF' : '#F1F5F9',
                    boxShadow: printMethod === 'wifi' ? '0 3px 8px rgba(9, 0, 64, 0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: printMethod === 'wifi' ? '#090040' : '#E2E8F0',
                      color: printMethod === 'wifi' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Wifi size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#090040' }}>
                      Wi-Fi / Network Thermal (ESC/POS)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      LAN / Wi-Fi IP: {wifiIp}:{wifiPort}
                    </div>
                  </div>
                  {printMethod === 'wifi' && <Check size={16} color="#090040" strokeWidth={3} />}
                </div>

                {/* Option D: Direct USB Thermal */}
                <div
                  onClick={() => {
                    if (paperSize === 'A4') {
                      setPaperSize('80mm');
                    }
                    setPrintMethod('usb');
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: printMethod === 'usb' ? '2px solid #090040' : '1px solid #CBD5E1',
                    backgroundColor: printMethod === 'usb' ? '#FFFFFF' : '#F1F5F9',
                    boxShadow: printMethod === 'usb' ? '0 3px 8px rgba(9, 0, 64, 0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: printMethod === 'usb' ? '#090040' : '#E2E8F0',
                      color: printMethod === 'usb' ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Usb size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#090040' }}>
                      Direct USB Thermal (ESC/POS)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {usbState === 'connected' ? `Connected: ${usbDevice?.name}` : 'Pair with USB thermal printer'}
                    </div>
                  </div>
                  {printMethod === 'usb' && <Check size={16} color="#090040" strokeWidth={3} />}
                </div>
              </div>

              {/* Interface Quick Configuration Sub-panels */}
              {printMethod === 'bluetooth' && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: btState === 'connected' ? '#166534' : '#1E40AF' }}>
                    {btState === 'connected' ? `● Connected: ${btDevice?.name}` : 'Bluetooth: Disconnected'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {btState !== 'connected' ? (
                      <button
                        type="button"
                        onClick={handleConnectBluetooth}
                        disabled={isConnectingBt}
                        style={{ padding: '4px 10px', borderRadius: 6, background: '#090040', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isConnectingBt ? 'Connecting...' : 'Connect'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDisconnectBluetooth}
                        style={{ padding: '4px 8px', borderRadius: 6, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Disconnect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTestPrint}
                      disabled={isPrinting}
                      style={{ padding: '4px 8px', borderRadius: 6, background: '#FFFFFF', color: '#090040', border: '1px solid #CBD5E1', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Test
                    </button>
                  </div>
                </div>
              )}

              {printMethod === 'wifi' && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                      Wi-Fi Printer: {wifiIp}:{wifiPort}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingWifi(!isEditingWifi)}
                      style={{ fontSize: '0.72rem', color: '#166534', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {isEditingWifi ? 'Done' : 'Change IP'}
                    </button>
                  </div>
                  {isEditingWifi && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input
                        type="text"
                        value={wifiIp}
                        placeholder="192.168.1.100"
                        onChange={(e) => {
                          setWifiIp(e.target.value);
                          webWifiPrinter.setIp(e.target.value);
                        }}
                        style={{ flex: 2, padding: '4px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.75rem' }}
                      />
                      <input
                        type="number"
                        value={wifiPort}
                        placeholder="9100"
                        onChange={(e) => {
                          const p = Number(e.target.value) || 9100;
                          setWifiPort(p);
                          webWifiPrinter.setPort(p);
                        }}
                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.75rem' }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleTestPrint}
                      disabled={isPrinting}
                      style={{ padding: '4px 10px', borderRadius: 6, background: '#FFFFFF', color: '#166534', border: '1px solid #BBF7D0', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Test Slip
                    </button>
                  </div>
                </div>
              )}

              {printMethod === 'usb' && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#FEF9C3', border: '1px solid #FEF08A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: usbState === 'connected' ? '#166534' : '#854D0E' }}>
                    {usbState === 'connected' ? `● Connected: ${usbDevice?.name}` : 'USB: Not Connected'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {usbState !== 'connected' ? (
                      <button
                        type="button"
                        onClick={handleConnectUsb}
                        disabled={isConnectingUsb}
                        style={{ padding: '4px 10px', borderRadius: 6, background: '#090040', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isConnectingUsb ? 'Connecting...' : 'Connect USB'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDisconnectUsb}
                        style={{ padding: '4px 8px', borderRadius: 6, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Disconnect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTestPrint}
                      disabled={isPrinting}
                      style={{ padding: '4px 8px', borderRadius: 6, background: '#FFFFFF', color: '#854D0E', border: '1px solid #CBD5E1', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Test
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Quick Summary Box */}
            <div
              style={{
                marginTop: 'auto',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '4px' }}>
                <span>Subtotal ({invoiceData.items?.length || 0} items):</span>
                <span>₹{Number(invoiceData.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '4px' }}>
                <span>Taxes (GST):</span>
                <span>+ ₹{Number(invoiceData.totalTax || 0).toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  color: '#090040',
                  borderTop: '1px dashed #CBD5E1',
                  paddingTop: '6px',
                  marginTop: '4px',
                }}
              >
                <span>Grand Total:</span>
                <span>₹{Number(invoiceData.grandTotal || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Remember Preference Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Remember my paper size ({paperSize}) for future prints
            </label>
          </div>

          {/* Right Column: Live High-Fidelity Preview */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#E2E8F0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Eye size={14} /> Live Print Preview ({paperSize} Format)
            </div>

            {/* Simulated Receipt / Paper Container - Fits content with zero extra space */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
                borderRadius: paperSize === 'A4' ? '4px' : '3px',
                width: paperSize === '58mm' ? '228px' : paperSize === '80mm' ? '320px' : '100%',
                maxWidth: paperSize === 'A4' ? '520px' : undefined,
                minHeight: paperSize === 'A4' ? '520px' : '320px',
                height: `${iframeHeight}px`,
                overflow: 'hidden',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                margin: '0 auto',
                border: '1px solid #E2E8F0',
              }}
            >
              <iframe
                ref={previewIframeRef}
                title="Invoice Preview"
                srcDoc={previewHtml}
                onLoad={(e) => syncIframeHeight(e.currentTarget)}
                style={{
                  width: '100%',
                  height: `${iframeHeight}px`,
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                  display: 'block',
                  overflow: 'hidden',
                }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Target: <strong>{paperSize}</strong> • Method: <strong>{printMethod === 'bluetooth' ? 'Bluetooth ESC/POS' : printMethod === 'wifi' ? 'Wi-Fi Network ESC/POS' : printMethod === 'usb' ? 'Direct USB ESC/POS' : 'System Spooler'}</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrint}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#090040',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(9, 0, 64, 0.25)',
              }}
            >
              {isPrinting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer size={16} />
                  Confirm & Print {paperSize}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintInvoiceModal;

