import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Info,
  X,
  Loader2,
  Edit3,
} from 'lucide-react';

export type DialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'prompt';

export interface DialogOptions {
  id?: string;
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  promptDefaultValue?: string;
  promptPlaceholder?: string;
  promptInputType?: string;
  onConfirm?: (inputValue?: string) => Promise<boolean | void> | boolean | void;
  onCancel?: () => void;
}

interface InternalDialogState extends DialogOptions {
  id: string;
  resolve?: (value: any) => void;
}

interface DialogContextType {
  showAlert: (optionsOrMessage: string | DialogOptions) => Promise<void>;
  showConfirm: (optionsOrMessage: string | DialogOptions) => Promise<boolean>;
  showPrompt: (optionsOrMessage: string | DialogOptions) => Promise<string | null>;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

// Global bridge for non-react or top-level calls
type DialogHandler = (state: InternalDialogState) => void;
let globalDialogHandler: DialogHandler | null = null;

export const dialogService = {
  alert: (optionsOrMessage: string | DialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      const opts: DialogOptions =
        typeof optionsOrMessage === 'string'
          ? {
            message: optionsOrMessage,
            type: inferType(optionsOrMessage),
          }
          : optionsOrMessage;

      const state: InternalDialogState = {
        ...opts,
        id: Math.random().toString(36).slice(2),
        type: opts.type || inferType(opts.message),
        title: opts.title || defaultTitle(opts.type || inferType(opts.message)),
        confirmText: opts.confirmText || 'OK',
        resolve: () => resolve(),
      };

      if (globalDialogHandler) {
        globalDialogHandler(state);
      } else {
        console.warn('dialogService called before DialogProvider mounted:', state.message);
        resolve();
      }
    });
  },

  confirm: (optionsOrMessage: string | DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: DialogOptions =
        typeof optionsOrMessage === 'string'
          ? {
            message: optionsOrMessage,
            type: 'confirm',
          }
          : { ...optionsOrMessage, type: optionsOrMessage.type || 'confirm' };

      const state: InternalDialogState = {
        ...opts,
        id: Math.random().toString(36).slice(2),
        title: opts.title || 'Confirm Action',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        resolve: (val: boolean) => resolve(Boolean(val)),
      };

      if (globalDialogHandler) {
        globalDialogHandler(state);
      } else {
        console.warn('dialogService.confirm called before DialogProvider mounted');
        resolve(false);
      }
    });
  },

  prompt: (optionsOrMessage: string | DialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      const opts: DialogOptions =
        typeof optionsOrMessage === 'string'
          ? {
            message: optionsOrMessage,
            type: 'prompt',
          }
          : { ...optionsOrMessage, type: 'prompt' };

      const state: InternalDialogState = {
        ...opts,
        id: Math.random().toString(36).slice(2),
        title: opts.title || 'Input Required',
        confirmText: opts.confirmText || 'Save',
        cancelText: opts.cancelText || 'Cancel',
        resolve: (val: string | null) => resolve(val),
      };

      if (globalDialogHandler) {
        globalDialogHandler(state);
      } else {
        console.warn('dialogService.prompt called before DialogProvider mounted');
        resolve(null);
      }
    });
  },
};

// Polyfill window.alert to intercept any stray native alerts
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = (message?: any) => {
    dialogService.alert(String(message ?? ''));
  };
  // Store original in case needed
  (window as any).__originalAlert = originalAlert;
}

function inferType(message: string): DialogType {
  const lower = (message || '').toLowerCase();
  if (lower.includes('success') || lower.includes('saved') || lower.includes('activated') || lower.includes('created') || lower.includes('confirmed')) {
    return 'success';
  }
  if (lower.includes('fail') || lower.includes('error') || lower.includes('cannot') || lower.includes('unable') || lower.includes('prohibited') || lower.includes('exceed')) {
    return 'error';
  }
  if (lower.includes('please') || lower.includes('warning') || lower.includes('required') || lower.includes('invalid') || lower.includes('already')) {
    return 'warning';
  }
  return 'info';
}

function defaultTitle(type?: DialogType): string {
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error Occurred';
    case 'warning':
      return 'Attention';
    case 'confirm':
      return 'Confirmation';
    case 'prompt':
      return 'Input Required';
    case 'info':
    default:
      return 'Notice';
  }
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLanguage, t, formatTableName, translateStatus } = useLanguage();
  const [currentDialog, setCurrentDialog] = useState<InternalDialogState | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getLocalizedTitle = (rawTitle?: string, type?: DialogType): string => {
    if (!rawTitle) {
      switch (type) {
        case 'success':
          return currentLanguage === 'mr' ? 'यशस्वी' : currentLanguage === 'hi' ? 'सफल' : 'Success';
        case 'error':
          return currentLanguage === 'mr' ? 'त्रुटी आढळली' : currentLanguage === 'hi' ? 'त्रुटि हुई' : 'Error Occurred';
        case 'warning':
          return currentLanguage === 'mr' ? 'लक्ष द्या' : currentLanguage === 'hi' ? 'ध्यान दें' : 'Attention';
        case 'confirm':
          return currentLanguage === 'mr' ? 'पुष्टीकरण' : currentLanguage === 'hi' ? 'पुष्टिकरण' : 'Confirmation';
        case 'prompt':
          return currentLanguage === 'mr' ? 'माहिती आवश्यक' : currentLanguage === 'hi' ? 'जानकारी आवश्यक' : 'Input Required';
        case 'info':
        default:
          return currentLanguage === 'mr' ? 'सूचना' : currentLanguage === 'hi' ? 'सूचना' : 'Notice';
      }
    }

    const trimmed = rawTitle.trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'order placed successfully' || lower === 'ऑर्डर यशस्वीरित्या दिली' || lower === 'ऑर्डर सफलतापूर्वक दर्ज की गई') {
      return currentLanguage === 'mr' ? 'ऑर्डर यशस्वीरित्या दिली' : currentLanguage === 'hi' ? 'ऑर्डर सफलतापूर्वक दर्ज की गई' : 'Order Placed Successfully';
    }
    if (lower === 'cannot delete table' || lower === 'टेबल हटवता येत नाही' || lower === 'टेबल नहीं हटा सकते') {
      return currentLanguage === 'mr' ? 'टेबल हटवता येत नाही' : currentLanguage === 'hi' ? 'टेबल नहीं हटा सकते' : 'Cannot Delete Table';
    }
    if (lower === 'delete table' || lower === 'टेबल हटवा' || lower === 'टेबल हटाएं') {
      return currentLanguage === 'mr' ? 'टेबल हटवा' : currentLanguage === 'hi' ? 'टेबल हटाएं' : 'Delete Table';
    }
    if (lower === 'failed to save table' || lower === 'टेबल जतन करण्यात अयशस्वी' || lower === 'टेबल सहेजने में विफल') {
      return currentLanguage === 'mr' ? 'टेबल जतन करण्यात अयशस्वी' : currentLanguage === 'hi' ? 'टेबल सहेजने में विफल' : 'Failed to Save Table';
    }
    if (lower === 'failed to update table' || lower === 'टेबल अपडेट करण्यात अयशस्वी' || lower === 'टेबल अपडेट करने में विफल') {
      return currentLanguage === 'mr' ? 'टेबल अपडेट करण्यात अयशस्वी' : currentLanguage === 'hi' ? 'टेबल अपडेट करने में विफल' : 'Failed to Update Table';
    }
    if (lower === 'failed to delete table' || lower === 'टेबल हटवण्यात अयशस्वी' || lower === 'टेबल हटाने में विफल') {
      return currentLanguage === 'mr' ? 'टेबल हटवण्यात अयशस्वी' : currentLanguage === 'hi' ? 'टेबल हटाने में विफल' : 'Failed to Delete Table';
    }
    if (lower === 'payment failed' || lower === 'पेमेंट अयशस्वी' || lower === 'भुगतान विफल') {
      return currentLanguage === 'mr' ? 'पेमेंट अयशस्वी' : currentLanguage === 'hi' ? 'भुगतान विफल' : 'Payment Failed';
    }
    if (lower === 'bill generation failed' || lower === 'बिल तयार करण्यात अयशस्वी' || lower === 'बिल निर्माण विफल') {
      return currentLanguage === 'mr' ? 'बिल तयार करण्यात अयशस्वी' : currentLanguage === 'hi' ? 'बिल निर्माण विफल' : 'Bill Generation Failed';
    }
    if (lower === 'billing error' || lower === 'बिलिंग त्रुटी' || lower === 'बिलिंग त्रुटि') {
      return currentLanguage === 'mr' ? 'बिलिंग त्रुटी' : currentLanguage === 'hi' ? 'बिलिंग त्रुटि' : 'Billing Error';
    }
    if (lower === 'success' || lower === 'यशस्वी' || lower === 'सफल') {
      return currentLanguage === 'mr' ? 'यशस्वी' : currentLanguage === 'hi' ? 'सफल' : 'Success';
    }
    if (lower === 'error occurred' || lower === 'त्रुटी आढळली' || lower === 'त्रुटि हुई' || lower === 'error' || lower === 'त्रुटी' || lower === 'त्रुटि') {
      return currentLanguage === 'mr' ? 'त्रुटी आढळली' : currentLanguage === 'hi' ? 'त्रुटि हुई' : 'Error Occurred';
    }
    if (lower === 'attention' || lower === 'लक्ष द्या' || lower === 'ध्यान दें' || lower === 'warning' || lower === 'चेतावणी' || lower === 'चेतावनी') {
      return currentLanguage === 'mr' ? 'लक्ष द्या' : currentLanguage === 'hi' ? 'ध्यान दें' : 'Attention';
    }
    if (lower === 'confirmation' || lower === 'पुष्टीकरण' || lower === 'पुष्टिकरण' || lower === 'confirm action') {
      return currentLanguage === 'mr' ? 'पुष्टीकरण' : currentLanguage === 'hi' ? 'पुष्टिकरण' : 'Confirmation';
    }
    if (lower === 'input required' || lower === 'माहिती आवश्यक' || lower === 'जानकारी आवश्यक') {
      return currentLanguage === 'mr' ? 'माहिती आवश्यक' : currentLanguage === 'hi' ? 'जानकारी आवश्यक' : 'Input Required';
    }
    if (lower === 'notice' || lower === 'सूचना') {
      return currentLanguage === 'mr' ? 'सूचना' : currentLanguage === 'hi' ? 'सूचना' : 'Notice';
    }

    return t(trimmed, trimmed);
  };

  const getLocalizedMessage = (rawMsg: string): string => {
    if (!rawMsg) return '';
    const trimmed = rawMsg.trim();

    // Pattern 1: Order successfully created for Table No: ...! Table is now OCCUPIED.
    const orderMatchEn = trimmed.match(/^Order successfully created for Table(?: No)?:?\s*(.*?)(?:!\s*Table is now OCCUPIED\.?|\.?$)/i);
    const orderMatchMr = trimmed.match(/^(.*?)\s*साठी ऑर्डर यशस्वीरित्या (?:तयार केली|नोंदवली)!\s*टेबल आता (?:भरलेले \(व्यस्त\)|व्यस्त|OCCUPIED) आहे\.?$/);
    const orderMatchHi = trimmed.match(/^(.*?)\s*के लिए ऑर्डर सफलतापूर्वक (?:बनाया गया|दर्ज की गई)!\s*टेबल अब (?:व्यस्त|भरलेले \(व्यस्त\)|OCCUPIED) है\.?$/);

    if (orderMatchEn || orderMatchMr || orderMatchHi) {
      const capturedTable = (orderMatchEn?.[1] || orderMatchMr?.[1] || orderMatchHi?.[1] || '').trim();
      const localizedTable = formatTableName(capturedTable, currentLanguage);
      const occupiedStatus = translateStatus('OCCUPIED');
      if (currentLanguage === 'mr') {
        return `${localizedTable} साठी ऑर्डर यशस्वीरित्या तयार केली! टेबल आता ${occupiedStatus} आहे.`;
      }
      if (currentLanguage === 'hi') {
        return `${localizedTable} के लिए ऑर्डर सफलतापूर्वक बनाया गया! टेबल अब ${occupiedStatus} है.`;
      }
      return `Order successfully created for Table No: ${formatTableName(capturedTable, 'en')}! Table is now OCCUPIED.`;
    }

    // Pattern 2: Cannot delete table
    const cannotDeleteMatch = trimmed.match(/^Table\s*["']?(.*?)["']?\s*is currently\s*(\w+)\.\s*Only Available or Cleaning tables can be deleted\.?$/i);
    if (cannotDeleteMatch) {
      const tbl = cannotDeleteMatch[1];
      const st = cannotDeleteMatch[2];
      if (currentLanguage === 'mr') {
        return `"${formatTableName(tbl, 'mr')}" हे सध्या ${translateStatus(st)} स्थितीत आहे. फक्त उपलब्ध किंवा स्वच्छता स्थितीतील टेबल हटवले जाऊ शकतात.`;
      }
      if (currentLanguage === 'hi') {
        return `"${formatTableName(tbl, 'hi')}" वर्तमान में ${translateStatus(st)} स्थिति में है। केवल उपलब्ध या सफाई स्थिति वाली टेबल हटाई जा सकती हैं।`;
      }
      return `Table "${formatTableName(tbl, 'en')}" is currently ${st}. Only Available or Cleaning tables can be deleted.`;
    }

    // Pattern 3: Confirm delete table
    const confirmDeleteMatch = trimmed.match(/^Are you sure you want to delete Table\s*["']?(.*?)["']?\?\s*This action cannot be undone\.?$/i);
    if (confirmDeleteMatch) {
      const tbl = confirmDeleteMatch[1];
      if (currentLanguage === 'mr') {
        return `तुम्हाला खात्री आहे की आपण "${formatTableName(tbl, 'mr')}" टेबल हटवू इच्छिता? ही क्रिया पूर्ववत केली जाऊ शकत नाही.`;
      }
      if (currentLanguage === 'hi') {
        return `क्या आप वाकई "${formatTableName(tbl, 'hi')}" टेबल हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।`;
      }
      return `Are you sure you want to delete Table "${formatTableName(tbl, 'en')}"? This action cannot be undone.`;
    }

    // Pattern 4: Connection error
    if (trimmed.toLowerCase() === 'please check connection and retry') {
      if (currentLanguage === 'mr') return 'कृपया इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा';
      if (currentLanguage === 'hi') return 'कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें';
      return 'Please check connection and retry';
    }

    return t(trimmed, trimmed);
  };

  const getLocalizedConfirmText = (text?: string): string => {
    if (!text || text.toLowerCase() === 'ok' || text === 'ठीक आहे' || text === 'ठीक है') {
      return currentLanguage === 'mr' ? 'ठीक आहे' : currentLanguage === 'hi' ? 'ठीक है' : 'OK';
    }
    const lower = text.trim().toLowerCase();
    if (lower === 'confirm' || lower === 'पुष्टी करा' || lower === 'पुष्टि करें') {
      return currentLanguage === 'mr' ? 'पुष्टी करा' : currentLanguage === 'hi' ? 'पुष्टि करें' : 'Confirm';
    }
    if (lower === 'save' || lower === 'जतन करा' || lower === 'सहेजें') {
      return currentLanguage === 'mr' ? 'जतन करा' : currentLanguage === 'hi' ? 'सहेजें' : 'Save';
    }
    if (lower === 'delete table' || lower === 'टेबल हटवा' || lower === 'टेबल हटाएं') {
      return currentLanguage === 'mr' ? 'टेबल हटवा' : currentLanguage === 'hi' ? 'टेबल हटाएं' : 'Delete Table';
    }
    return t(text, text);
  };

  const getLocalizedCancelText = (text?: string): string => {
    if (!text || text.toLowerCase() === 'cancel' || text === 'रद्द करा' || text === 'रद्द करें') {
      return currentLanguage === 'mr' ? 'रद्द करा' : currentLanguage === 'hi' ? 'रद्द करें' : 'Cancel';
    }
    const lower = text.trim().toLowerCase();
    if (lower === 'close' || lower === 'बंद करा' || lower === 'बंद करें') {
      return currentLanguage === 'mr' ? 'बंद करा' : currentLanguage === 'hi' ? 'बंद करें' : 'Close';
    }
    return t(text, text);
  };

  const openDialog = useCallback((state: InternalDialogState) => {
    setCurrentDialog(state);
    setInputValue(state.promptDefaultValue || '');
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    globalDialogHandler = openDialog;
    return () => {
      globalDialogHandler = null;
    };
  }, [openDialog]);

  useEffect(() => {
    if (currentDialog?.type === 'prompt') {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [currentDialog]);

  const handleClose = useCallback(
    (resultValue: any = null) => {
      if (!currentDialog) return;
      const { resolve, onCancel } = currentDialog;
      if (onCancel) {
        try {
          onCancel();
        } catch (e) {
          console.error(e);
        }
      }
      if (resolve) {
        resolve(resultValue);
      }
      setCurrentDialog(null);
      setIsSubmitting(false);
    },
    [currentDialog]
  );

  const handleConfirm = useCallback(async () => {
    if (!currentDialog || isSubmitting) return;

    const valToPass = currentDialog.type === 'prompt' ? inputValue : undefined;

    if (currentDialog.onConfirm) {
      try {
        setIsSubmitting(true);
        const shouldClose = await currentDialog.onConfirm(valToPass);
        if (shouldClose !== false) {
          if (currentDialog.resolve) {
            currentDialog.resolve(currentDialog.type === 'prompt' ? inputValue : true);
          }
          setCurrentDialog(null);
        }
      } catch (err) {
        console.error('Error during dialog confirmation:', err);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (currentDialog.resolve) {
        currentDialog.resolve(currentDialog.type === 'prompt' ? inputValue : true);
      }
      setCurrentDialog(null);
    }
  }, [currentDialog, inputValue, isSubmitting]);

  const showAlert = useCallback((optionsOrMessage: string | DialogOptions) => {
    return dialogService.alert(optionsOrMessage);
  }, []);

  const showConfirm = useCallback((optionsOrMessage: string | DialogOptions) => {
    return dialogService.confirm(optionsOrMessage);
  }, []);

  const showPrompt = useCallback((optionsOrMessage: string | DialogOptions) => {
    return dialogService.prompt(optionsOrMessage);
  }, []);

  // Keyboard support: Escape closes, Enter in prompt confirms
  useEffect(() => {
    if (!currentDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose(currentDialog.type === 'confirm' ? false : null);
      } else if (e.key === 'Enter' && currentDialog.type === 'prompt' && !isSubmitting) {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDialog, isSubmitting, handleClose, handleConfirm]);

  const renderIcon = () => {
    if (!currentDialog) return null;
    const size = 30;
    switch (currentDialog.type) {
      case 'success':
        return (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={size} color="#059669" />
          </div>
        );
      case 'error':
        return (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={size} color="#DC2626" />
          </div>
        );
      case 'warning':
        return (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={size} color="#D97706" />
          </div>
        );
      case 'confirm':
        return (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FFF7ED',
              border: '1px solid #FED7AA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HelpCircle size={size} color="#C2410C" />
          </div>
        );
      case 'prompt':
        return (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Edit3 size={size} color="#2563EB" />
          </div>
        );
      case 'info':
      default:
        return (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={size} color="#2563EB" />
          </div>
        );
    }
  };

  const isConfirmType = currentDialog?.type === 'confirm';
  const isPromptType = currentDialog?.type === 'prompt';
  const hasCancel = isConfirmType || isPromptType;

  return (
    <DialogContext.Provider
      value={{
        showAlert,
        showConfirm,
        showPrompt,
        closeDialog: () => handleClose(isConfirmType ? false : null),
      }}
    >
      {children}

      {currentDialog && (
        <div
          className="app-dialog-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => {
            if (!isSubmitting) {
              handleClose(isConfirmType ? false : null);
            }
          }}
        >
          <div
            className="app-dialog-card"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar with Close button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '12px 16px 0 16px',
              }}
            >
              <button
                type="button"
                onClick={() => handleClose(isConfirmType ? false : null)}
                disabled={isSubmitting}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: '#64748B',
                  transition: 'all 0.15s ease',
                }}
                title={currentLanguage === 'mr' ? 'बंद करा' : currentLanguage === 'hi' ? 'बंद करें' : 'Close'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0 24px 20px 24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {renderIcon()}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#090040',
                      fontFamily: "'Outfit', 'Inter', sans-serif",
                      lineHeight: 1.25,
                    }}
                  >
                    {getLocalizedTitle(currentDialog.title, currentDialog.type)}
                  </h3>
                  <div
                    style={{
                      color: '#475569',
                      fontSize: '0.94rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '40vh',
                      overflowY: 'auto',
                    }}
                  >
                    {getLocalizedMessage(currentDialog.message)}
                  </div>

                  {/* Prompt Input */}
                  {isPromptType && (
                    <div style={{ marginTop: '16px' }}>
                      <input
                        ref={inputRef}
                        type={currentDialog.promptInputType || 'text'}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={
                          currentDialog.promptPlaceholder
                            ? t(currentDialog.promptPlaceholder, currentDialog.promptPlaceholder)
                            : (currentLanguage === 'mr' ? 'मूल्य प्रविष्ट करा...' : currentLanguage === 'hi' ? 'मान दर्ज करें...' : 'Enter value...')
                        }
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          color: '#1E293B',
                          backgroundColor: '#F8FAFC',
                          transition: 'border-color 0.15s ease',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#B45309')}
                        onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                padding: '14px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              {hasCancel && (
                <button
                  type="button"
                  onClick={() => handleClose(isConfirmType ? false : null)}
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {getLocalizedCancelText(currentDialog.cancelText)}
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: currentDialog.confirmVariant === 'danger' ? '1px solid #DC2626' : '1px solid #FED7AA',
                  background:
                    currentDialog.confirmVariant === 'danger'
                      ? '#DC2626'
                      : 'linear-gradient(135deg, #7C2D12 0%, #B45309 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow:
                    currentDialog.confirmVariant === 'danger'
                      ? '0 2px 8px rgba(220, 38, 38, 0.35)'
                      : '0 2px 8px rgba(124, 45, 18, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  opacity: isSubmitting ? 0.75 : 1,
                }}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>{getLocalizedConfirmText(currentDialog.confirmText)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
