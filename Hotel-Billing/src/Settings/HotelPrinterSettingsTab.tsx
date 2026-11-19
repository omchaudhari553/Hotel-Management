import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  Radio,
} from 'lucide-react';
import {
  PrinterApiService,
  PrinterConfig,
  PrinterInterfaceType,
  PrinterPaperSize,
  PrinterPurpose,
} from '../services/printerApiService';
import { webBluetoothPrinter } from '../services/webBluetoothPrinter';
import { BluetoothPrinterDevice, BluetoothState } from '../types/printing';

interface Props {
  showToast: (msg: string) => void;
}

export const HotelPrinterSettingsTab: React.FC<Props> = ({ showToast }) => {
  // State
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingId, setTestingId] = useState<number | null>(null);

  // Web Bluetooth state
  const [btDevice, setBtDevice] = useState<BluetoothPrinterDevice | null>(() =>
    webBluetoothPrinter.getConnectedPrinter()
  );
  const [btState, setBtState] = useState<BluetoothState>(() =>
    webBluetoothPrinter.getState()
  );
  const [isConnectingBt, setIsConnectingBt] = useState<boolean>(false);
  const isBtSupported = webBluetoothPrinter.isSupported();

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<PrinterInterfaceType>('BLUETOOTH');
  const [formIp, setFormIp] = useState<string>('192.168.1.100');
  const [formPort, setFormPort] = useState<string>('9100');
  const [formMac, setFormMac] = useState<string>('');
  const [formUsbId, setFormUsbId] = useState<string>('');
  const [formPaper, setFormPaper] = useState<PrinterPaperSize>('80mm');
  const [formDefaultReceipt, setFormDefaultReceipt] = useState<boolean>(false);
  const [formDefaultKot, setFormDefaultKot] = useState<boolean>(false);
  const [formDefaultPurchase, setFormDefaultPurchase] = useState<boolean>(false);
  const [formAutoCut, setFormAutoCut] = useState<boolean>(true);
  const [formOpenDrawer, setFormOpenDrawer] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Subscribe to Web Bluetooth events
  useEffect(() => {
    const unsub = webBluetoothPrinter.subscribe((st, dev) => {
      setBtState(st);
      setBtDevice(dev);
    });
    return unsub;
  }, []);

  // Load configured printers
  const loadPrinters = useCallback(async () => {
    try {
      setLoading(true);
      const list = await PrinterApiService.getPrinters();
      setPrinters(list);
    } catch (err) {
      console.warn('Error loading printers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  // Connect Web Bluetooth
  const handleConnectBt = async () => {
    try {
      setIsConnectingBt(true);
      const dev = await webBluetoothPrinter.connect();
      showToast(`✓ Connected to ${dev.name || 'Bluetooth Printer'} successfully!`);

      // Auto create or update printer in backend if not exists
      const existing = printers.find(
        (p) => p.printerType === 'BLUETOOTH' && (p.printerName === dev.name || p.macAddress === dev.id)
      );
      if (!existing && dev.name) {
        await PrinterApiService.savePrinter({
          printerName: dev.name,
          printerType: 'BLUETOOTH',
          macAddress: dev.id,
          paperSize: '80mm',
          isDefaultReceipt: printers.length === 0,
          isDefaultKot: false,
          isDefaultPurchase: false,
          autoCut: true,
          openDrawer: false,
          copies: 1,
        });
        loadPrinters();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to connect to Bluetooth printer');
    } finally {
      setIsConnectingBt(false);
    }
  };

  // Disconnect Web Bluetooth
  const handleDisconnectBt = async () => {
    try {
      await webBluetoothPrinter.disconnect();
      showToast('Bluetooth printer disconnected');
    } catch (err: any) {
      showToast(err.message || 'Error disconnecting');
    }
  };

  // Test Print
  const handleTestPrint = async (printer: PrinterConfig) => {
    if (!printer.id) return;
    setTestingId(printer.id);
    try {
      if (printer.printerType === 'BLUETOOTH') {
        if (webBluetoothPrinter.isConnected()) {
          await webBluetoothPrinter.testPrint(printer.paperSize === '58mm' ? '58mm' : '80mm');
          showToast(`✓ Test print sent to ${printer.printerName}!`);
        } else {
          showToast('Please connect Web Bluetooth first using the button above.');
        }
      } else {
        const target = printer.printerType === 'NETWORK' ? (printer.ipAddress || '') : (printer.usbIdentifier || '');
        const res = await PrinterApiService.testPrint(
          printer.printerType,
          target,
          printer.paperSize,
          printer.port || 9100
        );
        if (res.success) {
          showToast(`✓ Test print dispatched to ${printer.printerName}`);
        } else {
          showToast(res.message);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Test print failed');
    } finally {
      setTestingId(null);
    }
  };

  // Set Default
  const handleSetDefault = async (printerId: number, purpose: PrinterPurpose) => {
    try {
      await PrinterApiService.setDefault(printerId, purpose);
      showToast(`✓ Default ${purpose} printer updated!`);
      loadPrinters();
    } catch (err: any) {
      showToast(err.message || 'Failed to set default printer');
    }
  };

  // Delete printer
  const handleDelete = async (printerId: number) => {
    if (!window.confirm('Are you sure you want to delete this printer configuration?')) return;
    try {
      await PrinterApiService.deletePrinter(printerId);
      showToast('Printer configuration removed');
      loadPrinters();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete printer');
    }
  };

  // Open modal for add
  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormType('BLUETOOTH');
    setFormIp('192.168.1.100');
    setFormPort('9100');
    setFormMac('');
    setFormUsbId('');
    setFormPaper('80mm');
    setFormDefaultReceipt(printers.length === 0);
    setFormDefaultKot(false);
    setFormDefaultPurchase(false);
    setFormAutoCut(true);
    setFormOpenDrawer(false);
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (p: PrinterConfig) => {
    setEditingId(p.id || null);
    setFormName(p.printerName);
    setFormType(p.printerType);
    setFormIp(p.ipAddress || '192.168.1.100');
    setFormPort(p.port ? String(p.port) : '9100');
    setFormMac(p.macAddress || '');
    setFormUsbId(p.usbIdentifier || '');
    setFormPaper(p.paperSize || '80mm');
    setFormDefaultReceipt(!!p.isDefaultReceipt);
    setFormDefaultKot(!!p.isDefaultKot);
    setFormDefaultPurchase(!!p.isDefaultPurchase);
    setFormAutoCut(p.autoCut ?? true);
    setFormOpenDrawer(p.openDrawer ?? false);
    setModalOpen(true);
  };

  // Save printer
  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter a printer name');
      return;
    }

    const payload: PrinterConfig = {
      printerName: formName.trim(),
      printerType: formType,
      paperSize: formPaper,
      isDefaultReceipt: formDefaultReceipt,
      isDefaultKot: formDefaultKot,
      isDefaultPurchase: formDefaultPurchase,
      autoCut: formAutoCut,
      openDrawer: formOpenDrawer,
      copies: 1,
    };

    if (formType === 'BLUETOOTH') {
      payload.macAddress = formMac.trim();
    } else if (formType === 'NETWORK') {
      payload.ipAddress = formIp.trim();
      payload.port = parseInt(formPort) || 9100;
    } else if (formType === 'USB') {
      payload.usbIdentifier = formUsbId.trim();
    }

    try {
      setSaving(true);
      if (editingId) {
        await PrinterApiService.updatePrinter(editingId, payload);
        showToast('✓ Printer configuration updated!');
      } else {
        await PrinterApiService.savePrinter(payload);
        showToast('✓ New printer registered!');
      }
      setModalOpen(false);
      loadPrinters();
    } catch (err: any) {
      showToast(err.message || 'Failed to save printer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#FFEDD5',
                  color: '#C2410C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Printer size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Printer Management System
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Bluetooth Classic/BLE, Wi-Fi Network & USB Thermal ESC/POS printers
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={loadPrinters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={openAddModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#7C2D12',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Add Printer
            </button>
          </div>
        </div>

        {/* Web Bluetooth Live Widget */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            background: btState === 'connected' ? '#F0FDF4' : '#F8FAFC',
            border: `1px solid ${btState === 'connected' ? '#BBF7D0' : '#E2E8F0'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: btState === 'connected' ? '#DCFCE7' : '#E2E8F0',
                color: btState === 'connected' ? '#16A34A' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bluetooth size={20} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                Web Bluetooth Thermal Direct
                {btState === 'connected' ? (
                  <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    Connected: {btDevice?.name || 'Thermal Printer'}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 12 }}>
                    Disconnected
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Pair directly via Chrome/Edge browser for high-speed ESC/POS receipt generation
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {btState === 'connected' ? (
              <>
                <button
                  onClick={() => webBluetoothPrinter.testPrint('80mm')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Test Print Slip
                </button>
                <button
                  onClick={handleDisconnectBt}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #FCA5A5',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectBt}
                disabled={isConnectingBt || !isBtSupported}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: isBtSupported ? '#2563EB' : '#94A3B8',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isBtSupported ? 'pointer' : 'not-allowed',
                }}
              >
                {isConnectingBt ? <Loader2 size={13} className="animate-spin" /> : <Bluetooth size={14} />}
                {isBtSupported ? 'Pair Bluetooth Printer' : 'Web Bluetooth Not Supported'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Configured Printers Grid */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
          Configured Printers ({printers.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Loading printer configurations...
          </div>
        ) : printers.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px dashed #CBD5E1',
              borderRadius: 14,
              padding: 40,
              textAlign: 'center',
            }}
          >
            <Printer size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: 0, fontSize: 15, color: '#334155' }}>No Printers Configured</h4>
            <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#64748B' }}>
              Add your thermal receipt, KOT kitchen, or billing printers.
            </p>
            <button
              onClick={openAddModal}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#7C2D12',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + Add First Printer
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {printers.map((p) => {
              const isTesting = testingId === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid #E2E8F0',
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <div>
                    {/* Card Top */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background:
                              p.printerType === 'BLUETOOTH'
                                ? '#EFF6FF'
                                : p.printerType === 'NETWORK'
                                ? '#F0FDF4'
                                : '#FEF3C7',
                            color:
                              p.printerType === 'BLUETOOTH'
                                ? '#2563EB'
                                : p.printerType === 'NETWORK'
                                ? '#16A34A'
                                : '#D97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {p.printerType === 'BLUETOOTH' ? (
                            <Bluetooth size={20} />
                          ) : p.printerType === 'NETWORK' ? (
                            <Wifi size={20} />
                          ) : (
                            <Usb size={20} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{p.printerName}</div>
                          <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 1 }}>
                            {p.printerType === 'BLUETOOTH'
                              ? `MAC: ${p.macAddress || 'N/A'}`
                              : p.printerType === 'NETWORK'
                              ? `IP: ${p.ipAddress}:${p.port || 9100}`
                              : `USB: ${p.usbIdentifier || 'Default'}`}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {p.paperSize}
                      </span>
                    </div>

                    {/* Default Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {p.isDefaultReceipt && (
                        <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                          ✓ Default Bill
                        </span>
                      )}
                      {p.isDefaultKot && (
                        <span style={{ fontSize: 11, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                          ✓ Default KOT
                        </span>
                      )}
                      {p.isDefaultPurchase && (
                        <span style={{ fontSize: 11, background: '#E0E7FF', color: '#4338CA', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                          ✓ Default Purchase
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleTestPrint(p)}
                        disabled={isTesting}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: '1px solid #FDBA74',
                          background: '#FFF7ED',
                          color: '#9A3412',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isTesting ? <Loader2 size={11} className="animate-spin" /> : <Printer size={11} />}
                        Test Print
                      </button>

                      {!p.isDefaultReceipt && p.id && (
                        <button
                          onClick={() => handleSetDefault(p.id!, 'RECEIPT')}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#F8FAFC',
                            color: '#334155',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          + Bill Default
                        </button>
                      )}

                      {!p.isDefaultKot && p.id && (
                        <button
                          onClick={() => handleSetDefault(p.id!, 'KOT')}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#F8FAFC',
                            color: '#334155',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          + KOT
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => openEditModal(p)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => p.id && handleDelete(p.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                {editingId ? 'Edit Printer Configuration' : 'Add New Printer'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrinter} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Printer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter Bill Thermal 80mm"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Interface Type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Interface Type *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['BLUETOOTH', 'NETWORK', 'USB'] as PrinterInterfaceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${formType === t ? '#7C2D12' : '#CBD5E1'}`,
                        background: formType === t ? '#7C2D12' : '#fff',
                        color: formType === t ? '#fff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interface specific params */}
              {formType === 'NETWORK' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      IP Address *
                    </label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        padding: '0 10px',
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Port
                    </label>
                    <input
                      type="text"
                      placeholder="9100"
                      value={formPort}
                      onChange={(e) => setFormPort(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        padding: '0 10px',
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              ) : formType === 'BLUETOOTH' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Bluetooth MAC / Device ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 66:22:BB:77:88:99"
                    value={formMac}
                    onChange={(e) => setFormMac(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      padding: '0 10px',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    USB Identifier / Port
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. USB001"
                    value={formUsbId}
                    onChange={(e) => setFormUsbId(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      padding: '0 10px',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Paper Size */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Paper Size *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['58mm', '80mm', 'A4'] as PrinterPaperSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFormPaper(sz)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${formPaper === sz ? '#7C2D12' : '#CBD5E1'}`,
                        background: formPaper === sz ? '#7C2D12' : '#fff',
                        color: formPaper === sz ? '#fff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Defaults & Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formDefaultReceipt}
                    onChange={(e) => setFormDefaultReceipt(e.target.checked)}
                  />
                  Set as Default Bill / Invoice Printer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formDefaultKot}
                    onChange={(e) => setFormDefaultKot(e.target.checked)}
                  />
                  Set as Default Kitchen Order (KOT) Printer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formDefaultPurchase}
                    onChange={(e) => setFormDefaultPurchase(e.target.checked)}
                  />
                  Set as Default Purchase Orders Printer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formAutoCut}
                    onChange={(e) => setFormAutoCut(e.target.checked)}
                  />
                  Auto Cut Paper after printing
                </label>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    color: '#64748B',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    height: 40,
                    borderRadius: 8,
                    border: 'none',
                    background: '#7C2D12',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Printer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
