import React, { useState, useEffect } from 'react';
import {
  Database,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Server,
  Laptop,
  ArrowRight,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  getCentralServerHost,
  setCentralServerHost,
  testServerConnection,
  DEFAULT_CENTRAL_HOST,
} from '../services/api';

interface CentralServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHostChanged?: (newHost: string) => void;
}

export const CentralServerModal: React.FC<CentralServerModalProps> = ({
  isOpen,
  onClose,
  onHostChanged,
}) => {
  const [currentHost, setCurrentHost] = useState(getCentralServerHost());
  const [inputHost, setInputHost] = useState(getCentralServerHost());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
  } | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const host = getCentralServerHost();
      setCurrentHost(host);
      setInputHost(host);
      runPingTest(host);
    }
  }, [isOpen]);

  const runPingTest = async (hostToTest: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testServerConnection(hostToTest);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed',
        latencyMs: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = inputHost.trim();
    if (!trimmed) return;
    setCentralServerHost(trimmed);
    setCurrentHost(trimmed);
    setSavedSuccessMessage(`Central Server Host set to: ${trimmed}`);
    if (onHostChanged) {
      onHostChanged(trimmed);
    }
    runPingTest(trimmed);
    setTimeout(() => {
      setSavedSuccessMessage(null);
    }, 4000);
  };

  const handleReset = () => {
    const defaultHost = window.location?.hostname || DEFAULT_CENTRAL_HOST;
    setCentralServerHost('');
    setCurrentHost(defaultHost);
    setInputHost(defaultHost);
    setSavedSuccessMessage(`Reset to default host: ${defaultHost}`);
    if (onHostChanged) {
      onHostChanged(defaultHost);
    }
    runPingTest(defaultHost);
    setTimeout(() => {
      setSavedSuccessMessage(null);
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #FAF5FF, #EFF6FF)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1F2937' }}>
                Central Database Connectivity
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
                Microsoft SQL Server &bull; Single Hotel Database: <strong>hotel_management</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
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

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Status Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: testResult?.success ? '#F0FDF4' : testResult ? '#FEF2F2' : '#F9FAFB',
              border: `1.5px solid ${
                testResult?.success ? '#86EFAC' : testResult ? '#FECACA' : '#E5E7EB'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: testResult?.success ? '#22C55E' : testResult ? '#EF4444' : '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                {isTesting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : testResult?.success ? (
                  <Wifi size={18} />
                ) : (
                  <WifiOff size={18} />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: testResult?.success ? '#15803D' : testResult ? '#B91C1C' : '#374151',
                    }}
                  >
                    {isTesting
                      ? 'Testing connection...'
                      : testResult?.success
                      ? 'Connected & Synchronized'
                      : 'Connection Offline'}
                  </span>
                  {testResult?.latencyMs ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        fontWeight: 600,
                      }}
                    >
                      {testResult.latencyMs} ms
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                  Central Host: <strong>{currentHost}</strong> &bull; API: <strong>{currentHost}:8080</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => runPingTest(inputHost)}
              disabled={isTesting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
              Ping
            </button>
          </div>

          {savedSuccessMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} color="#059669" />
              {savedSuccessMessage}
            </div>
          )}

          {/* Configuration Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
              Central Server IP Address / Hostname
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputHost}
                onChange={(e) => setInputHost(e.target.value)}
                placeholder="e.g. localhost or 10.173.104.1"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #D1D5DB',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  color: '#111827',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Save size={15} />
                Save
              </button>
              <button
                onClick={handleReset}
                title="Reset to default host"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#4B5563',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} />
                Default
              </button>
            </div>
          </div>

          {/* Multi-Laptop Architecture & Instructions Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 700, fontSize: '0.88rem' }}>
              <Laptop size={16} color="#475569" />
              How to Connect Laptop B to Laptop A:
            </div>

            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#7C3AED' }}>1.</span>
                <span>
                  <strong>Laptop A (Host):</strong> Houses the authoritative SQL Server database (<code>hotel_management</code>) at IP/host <code>{window.location?.hostname || 'localhost'}</code>.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#7C3AED' }}>2.</span>
                <span>
                  <strong>Laptop B (Client):</strong> Connect both laptops to the same Wi-Fi. On Laptop B, open:
                  <div style={{ marginTop: '4px' }}>
                    <code
                      style={{
                        backgroundColor: '#EDE9FE',
                        color: '#6D28D9',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}
                    >
                      {`http://${window.location?.hostname || 'localhost'}:5173`}
                    </code>
                  </div>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#7C3AED' }}>3.</span>
                <span>
                  <strong>Automatic Real-Time Sync:</strong> The frontend polls every 4-5 seconds. Any order, KOT, bill, or customer added on Laptop B immediately shows on Laptop A!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #F3F4F6',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#1F2937',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default CentralServerModal;
