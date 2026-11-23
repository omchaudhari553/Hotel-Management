import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Info, X } from 'lucide-react';

export interface PopupOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface SuperAdminPopupContextType {
  showPopup: (opts: PopupOptions) => void;
  showAlert: (message: string, title?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, confirmText?: string) => void;
  closePopup: () => void;
}

const SuperAdminPopupContext = createContext<SuperAdminPopupContextType | undefined>(undefined);

export const SuperAdminPopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [popup, setPopup] = useState<PopupOptions | null>(null);

  const showPopup = (opts: PopupOptions) => {
    setPopup(opts);
  };

  const showAlert = (message: string, title: string = 'Notice', type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setPopup({
      title,
      message,
      type,
      confirmText: 'OK',
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'Confirm Action', confirmText: string = 'Proceed') => {
    setPopup({
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText: 'Cancel',
      onConfirm: () => {
        onConfirm();
        setPopup(null);
      },
      onCancel: () => {
        setPopup(null);
      }
    });
  };

  const closePopup = () => {
    if (popup?.onCancel) {
      popup.onCancel();
    }
    setPopup(null);
  };

  const handleConfirm = () => {
    if (popup?.onConfirm) {
      popup.onConfirm();
    }
    setPopup(null);
  };

  return (
    <SuperAdminPopupContext.Provider value={{ showPopup, showAlert, showConfirm, closePopup }}>
      {children}

      {/* RENDER ACTIVE POPUP DIALOG */}
      {popup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePopup();
          }}
        >
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: '#F8FAFC',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {/* Header with Type Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor:
                      popup.type === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : popup.type === 'error'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : popup.type === 'warning'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                    color:
                      popup.type === 'success'
                        ? '#34D399'
                        : popup.type === 'error'
                        ? '#F87171'
                        : popup.type === 'warning'
                        ? '#FBBF24'
                        : '#818CF8',
                  }}
                >
                  {popup.type === 'success' && <CheckCircle2 style={{ width: '24px', height: '24px' }} />}
                  {popup.type === 'error' && <XCircle style={{ width: '24px', height: '24px' }} />}
                  {popup.type === 'warning' && <AlertTriangle style={{ width: '24px', height: '24px' }} />}
                  {popup.type === 'confirm' && <HelpCircle style={{ width: '24px', height: '24px' }} />}
                  {(!popup.type || popup.type === 'info') && <Info style={{ width: '24px', height: '24px' }} />}
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>
                    {popup.title}
                  </h3>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Super Admin Platform
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closePopup}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Message Body */}
            <div style={{ fontSize: '0.86rem', color: '#CBD5E1', lineHeight: 1.5, margin: '12px 0 20px 0' }}>
              {popup.message}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              {popup.type === 'confirm' && (
                <button
                  type="button"
                  onClick={closePopup}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#1E293B',
                    color: '#94A3B8',
                    border: '1px solid #334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {popup.cancelText || 'Cancel'}
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  backgroundColor: popup.type === 'error' ? '#DC2626' : '#4F46E5',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: popup.type === 'error' ? '0 4px 14px rgba(220, 38, 38, 0.4)' : '0 4px 14px rgba(79, 70, 229, 0.4)',
                  transition: 'all 0.15s ease',
                }}
              >
                {popup.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminPopupContext.Provider>
  );
};

export const useSuperAdminPopup = () => {
  const ctx = useContext(SuperAdminPopupContext);
  if (!ctx) {
    throw new Error('useSuperAdminPopup must be used within a SuperAdminPopupProvider');
  }
  return ctx;
};
