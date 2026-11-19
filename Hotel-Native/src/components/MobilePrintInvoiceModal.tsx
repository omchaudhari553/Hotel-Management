import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  Share2,
  Check,
  X,
  Eye,
} from 'lucide-react-native';
import { UniversalInvoicePrintData, PaperSize } from '../types/printing';
import { MobilePrintService } from '../services/mobilePrintService';
import { NativePrinterManager, PrinterConfig } from '../services/nativePrinterManager';
import { generateInvoiceHtml, numberToWordsINR } from '../services/invoicePrintRenderer';
import { webBluetoothPrinter } from '../services/webBluetoothPrinter';
import { encodeInvoiceEscPos, uint8ArrayToBase64 } from '../services/escposGenerator';
import { useLanguage } from '../context/LanguageContext';

export type OutputDestination = 'SPOOLER' | 'BLUETOOTH' | 'WIFI' | 'USB';

interface MobilePrintInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  invoiceData: UniversalInvoicePrintData | null;
  onPrinted?: () => void;
  titleOverride?: string;
  isKot?: boolean;
}

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export const MobilePrintInvoiceModal: React.FC<MobilePrintInvoiceModalProps> = ({
  visible,
  onClose,
  invoiceData,
  onPrinted,
  titleOverride,
  isKot,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isWide = SCREEN_WIDTH >= 768;
  const { language, t, toDevanagari, formatTableName, localizeGuestName } = useLanguage();

  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [destination, setDestination] = useState<OutputDestination>('BLUETOOTH');
  const [loading, setLoading] = useState<boolean>(false);
  const [defaultPrinter, setDefaultPrinter] = useState<PrinterConfig | null>(null);
  const [wifiIp, setWifiIp] = useState<string>('192.168.1.100');
  const [wifiPort, setWifiPort] = useState<number>(9100);
  const [btConnected, setBtConnected] = useState<boolean>(() => webBluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState<string>(() => webBluetoothPrinter.getConnectedPrinter()?.name || '');
  const [iosPrinter, setIosPrinter] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    const unsub = webBluetoothPrinter.subscribe((st, dev) => {
      const isConn = st === 'connected' && Boolean(dev);
      setBtConnected(isConn);
      if (dev?.name) setBtDeviceName(dev.name);
      if (isConn) {
        setDestination('BLUETOOTH');
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (visible) {
      if (webBluetoothPrinter.isConnected()) {
        setDestination('BLUETOOTH');
      }
      MobilePrintService.getDefaultPaperSize().then(setPaperSize).catch(() => { });
      NativePrinterManager.getDefaultPrinter(isKot ? 'KOT' : 'RECEIPT')
        .then((p) => {
          if (p) {
            setDefaultPrinter(p);
            if (p.ipAddress) setWifiIp(p.ipAddress);
            if (p.port) setWifiPort(p.port);
            if (p.printerType === 'BLUETOOTH') setDestination('BLUETOOTH');
            else if (p.printerType === 'NETWORK') setDestination('WIFI');
            else if (p.printerType === 'USB') setDestination('USB');
          } else if (webBluetoothPrinter.isConnected()) {
            setDestination('BLUETOOTH');
          }
        })
        .catch(() => { });

      if (Platform.OS === 'ios') {
        MobilePrintService.getSavedIosPrinter().then((saved) => {
          setIosPrinter(saved);
          if (saved) {
            setDestination('BLUETOOTH');
          }
        });
      }
    }
  }, [visible, isKot]);

  const previewHtml = useMemo(() => {
    if (!invoiceData) return '';
    return generateInvoiceHtml(invoiceData, paperSize);
  }, [invoiceData, paperSize]);

  if (!visible || !invoiceData) return null;

  const currentLang = invoiceData?.language || language || 'en';
  const isMr = currentLang === 'mr';
  const isHi = currentLang === 'hi';

  const isActuallyKot = Boolean(
    isKot ||
    (invoiceData.kotNumber && !String(invoiceData.invoiceNumber).startsWith('INV')) ||
    String(invoiceData.invoiceNumber).startsWith('KOT') ||
    (invoiceData.footerMessage && invoiceData.footerMessage.includes('Kitchen Copy'))
  );

  const ticketTitle = titleOverride
    ? titleOverride
    : isActuallyKot
      ? `${isMr ? 'किचन ऑर्डर तिकीट (KOT) प्रिंट करा' : isHi ? 'किचन ऑर्डर टिकट (KOT) प्रिंट करें' : 'Print KOT Ticket'} #${invoiceData.kotNumber || invoiceData.invoiceNumber}`
      : `${isMr ? 'टॅक्स इन्व्हॉइस प्रिंट करा' : isHi ? 'टैक्स इनवॉयस प्रिंट करें' : 'Print Tax Invoice'} #${invoiceData.invoiceNumber}`;

  const isPaid = (invoiceData.paymentStatus || 'UNPAID').toUpperCase() === 'PAID';
  const paymentBadgeText = isPaid
    ? (isMr ? 'भरले (PAID)' : isHi ? 'भुगतान (PAID)' : 'PAID')
    : (isMr ? 'बाकी (UNPAID)' : isHi ? 'बकाया (UNPAID)' : 'UNPAID');

  const methodLabel =
    destination === 'SPOOLER'
      ? (isMr ? 'सिस्टिम प्रिंट स्पूलर' : isHi ? 'सिस्टम प्रिंट स्पूलर' : 'System Print Spooler')
      : destination === 'BLUETOOTH'
        ? (isMr ? 'ब्लूटूथ ESC/POS' : isHi ? 'ब्लूटूथ ESC/POS' : 'Bluetooth ESC/POS')
        : destination === 'WIFI'
          ? (isMr ? 'वाय-फाय नेटवर्क ESC/POS' : isHi ? 'वाई-फाई नेटवर्क ESC/POS' : 'Wi-Fi Network ESC/POS')
          : (isMr ? 'USB ESC/POS' : isHi ? 'USB ESC/POS' : 'USB ESC/POS');

  const rawOrderNo = invoiceData.orderNumber || '';
  const cleanOrderNo = rawOrderNo.replace(/^ORD-temp-ord-/, 'ORD-').replace(/^temp-ord-/, 'ORD-');

  const items = invoiceData.items || [];
  const subtotal = Number(invoiceData.subtotal || 0);
  const cgst = Number(invoiceData.cgstAmount || 0);
  const sgst = Number(invoiceData.sgstAmount || 0);
  const discount = Number(invoiceData.discountAmount || 0);
  const total = Number(invoiceData.grandTotal || subtotal + cgst + sgst - discount);
  const hotelName = invoiceData.hotelName || 'AJALKAR HOTEL & RESTAURANT';
  const hotelAddress = invoiceData.hotelAddress || 'Hotel Premises, Pune, Maharashtra - 411004';
  const hotelPhone = invoiceData.hotelPhone || '+91 98765 43210';
  const gstin = invoiceData.gstin || '27AAKCA1234F1Z5';
  const fssai = invoiceData.fssai || '11521034000123';

  const handleConfirmPrint = async () => {
    try {
      setLoading(true);
      await MobilePrintService.setDefaultPaperSize(paperSize);

      // 1. Direct Web Bluetooth Print (DIRECT RAW ESC/POS - NO BROWSER PRINT PREVIEW!)
      if (destination === 'BLUETOOTH' || webBluetoothPrinter.isConnected()) {
        const escPosBytes = encodeInvoiceEscPos(invoiceData, paperSize);

        if (webBluetoothPrinter.isConnected()) {
          await webBluetoothPrinter.printEscPos(escPosBytes);
          Alert.alert(
            isMr ? 'यशस्वी' : isHi ? 'सफलता' : 'Success',
            isMr ? 'ब्लूटूथ थर्मल प्रिंटरवर थेट बिल प्रिंट पाठवले आहे.' : isHi ? 'ब्लूटूथ थर्मल प्रिंटर पर सीधा बिल भेजा गया है।' : 'Direct print sent to Bluetooth thermal printer.'
          );
          if (onPrinted) onPrinted();
          onClose();
          return;
        }

        // Try connecting if Web Bluetooth supported
        if (Platform.OS === 'web' && webBluetoothPrinter.isSupported()) {
          try {
            await webBluetoothPrinter.connect();
            await webBluetoothPrinter.printEscPos(escPosBytes);
            Alert.alert(
              isMr ? 'यशस्वी' : isHi ? 'सफलता' : 'Success',
              isMr ? 'ब्लूटूथ थर्मल प्रिंटरवर थेट बिल प्रिंट पाठवले आहे.' : isHi ? 'ब्लूटूथ थर्मल प्रिंटर पर सीधा बिल भेजा गया है।' : 'Direct print sent to Bluetooth thermal printer.'
            );
            if (onPrinted) onPrinted();
            onClose();
            return;
          } catch (btErr: any) {
            Alert.alert(
              isMr ? 'ब्लूटूथ सूचना' : isHi ? 'ब्लूटूथ सूचना' : 'Bluetooth Notice',
              btErr.message || (isMr ? 'कृपया ब्लूटूथ प्रिंटर जोडा' : 'Please connect Bluetooth printer')
            );
            return;
          }
        }

        // Native Android APK
        if (NativePrinterManager.isNativeAvailable()) {
          const targetAddress = defaultPrinter?.macAddress || 'DEFAULT';
          const base64EscPos = uint8ArrayToBase64(escPosBytes);
          const res = await NativePrinterManager.printEscPos('BLUETOOTH', targetAddress, base64EscPos);
          if (res.success) {
            Alert.alert(
              isMr ? 'यशस्वी' : isHi ? 'सफलता' : 'Success',
              isMr ? 'ब्लूटूथ प्रिंटरवर थेट बिल प्रिंट पाठवले आहे.' : isHi ? 'ब्लूटूथ प्रिंटर पर सीधा बिल भेजा गया है।' : 'Direct print sent to Bluetooth printer.'
            );
            if (onPrinted) onPrinted();
            onClose();
            return;
          }
        }

        // Android RawBT Direct Intent (no print preview dialog)
        if (Platform.OS === 'android') {
          const rawbtRes = await NativePrinterManager.printViaRawBt(uint8ArrayToBase64(escPosBytes));
          if (rawbtRes.success) {
            if (onPrinted) onPrinted();
            onClose();
            return;
          }

          // If RawBT is not installed on Android:
          // Offer instant System Spooler direct print or Play Store RawBT
          Alert.alert(
            isMr ? 'ब्लूटूथ थर्मल प्रिंटर' : isHi ? 'ब्लूटूथ थर्मल प्रिंटर' : 'Bluetooth Thermal Printer',
            isMr
              ? 'थर्मल प्रिंटरवरून थेट प्रिंट काढण्यासाठी सिस्टिम प्रिंट वापरा किंवा RawBT ॲप इन्स्टॉल करा.'
              : isHi
                ? 'थर्मल प्रिंटर से सीधा प्रिंट निकालने के लिए सिस्टम प्रिंट का उपयोग करें या RawBT ऐप इंस्टॉल करें।'
                : 'To print directly to your Bluetooth thermal printer, choose System Print or install RawBT for direct silent ESC/POS.',
            [
              {
                text: isMr ? 'रद्द करा' : isHi ? 'रद्द करें' : 'Cancel',
                style: 'cancel',
              },
              {
                text: isMr ? '🖨️ सिस्टिम प्रिंट (थेट प्रिंट)' : isHi ? '🖨️ सिस्टम प्रिंट (सीधा प्रिंट)' : '🖨️ Print via System Spooler',
                onPress: async () => {
                  try {
                    const fallbackRes = await MobilePrintService.printInvoice(invoiceData, paperSize);
                    if (fallbackRes.success) {
                      if (onPrinted) onPrinted();
                      onClose();
                    }
                  } catch (e: any) {
                    Alert.alert(isMr ? 'त्रुटी' : isHi ? 'त्रुटि' : 'Error', e?.message || 'Print error');
                  }
                },
              },
              {
                text: isMr ? '📲 Play Store (RawBT)' : isHi ? '📲 Play Store (RawBT)' : '📲 Play Store (RawBT)',
                onPress: () => NativePrinterManager.openRawBtAppOrStore(),
              },
            ]
          );
          return;
        }

        // On Web: DO NOT open browser print preview when printing to Bluetooth!
        if (Platform.OS === 'web') {
          if (!webBluetoothPrinter.isSupported()) {
            Alert.alert(
              'Chrome Bluetooth Security',
              'Chrome restricts Web Bluetooth on IP addresses (like 192.168.1.45).\n\nPlease switch to http://localhost:8081 to pair and print directly to your Bluetooth thermal printer without opening print preview.'
            );
            return;
          }
          Alert.alert(
            'Bluetooth Printer Disconnected',
            'Your Bluetooth thermal printer is not connected. Please connect it first or pair via Printer Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Connect Now',
                onPress: async () => {
                  try {
                    await webBluetoothPrinter.connect();
                    await webBluetoothPrinter.printEscPos(escPosBytes);
                    Alert.alert('यशस्वी', 'ब्लूटूथ थर्मल प्रिंटरवर थेट बिल प्रिंट पाठवले आहे.');
                    if (onPrinted) onPrinted();
                    onClose();
                  } catch (e: any) {
                    Alert.alert('Notice', e?.message || 'Bluetooth connection failed');
                  }
                },
              },
            ]
          );
          return;
        }

        // On iOS: Check if user has saved an AirPrint thermal printer for silent direct print!
        if (Platform.OS === 'ios') {
          const savedIos = iosPrinter || (await MobilePrintService.getSavedIosPrinter());
          if (savedIos && savedIos.url) {
            // Direct silent print to saved thermal printer - NO AIRPRINT SHEET!
            const printRes = await MobilePrintService.printInvoice(invoiceData, paperSize);
            if (printRes.success) {
              Alert.alert('यशस्वी', `थर्मल प्रिंटर "${savedIos.name}" वर थेट प्रिंट पाठवले आहे.`);
              if (onPrinted) onPrinted();
              onClose();
              return;
            }
          }

          // If no printer saved yet on iOS: prompt user to pick their printer ONCE!
          Alert.alert(
            isMr ? 'थर्मल प्रिंटर निवडा (Direct Print)' : isHi ? 'थर्मल प्रिंटर चुनें (Direct Print)' : 'Select Thermal Printer (Direct Print)',
            isMr
              ? 'थर्मल प्रिंटरवरून प्रिव्ह्यू स्क्रीन न येता थेट प्रिंट काढण्यासाठी:\n\nखालील "प्रिंटर निवडा" वर क्लिक करून तुमचा प्रिंटर १ वेळा सेव्ह करा.'
              : isHi
                ? 'थर्मल प्रिंटर से बिना प्रिव्यू सीधा प्रिंट निकालने के लिए:\n\nनीचे "प्रिंटर चुनें" पर क्लिक करके प्रिंटर सेव करें।'
                : 'To print directly without preview dialogs:\n\nTap "Select Printer" below to link your thermal printer once.',
            [
              { text: isMr ? 'रद्द करा' : isHi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
              {
                text: isMr ? '🖨️ प्रिंटर निवडा' : isHi ? '🖨️ प्रिंटर चुनें' : '🖨️ Select Printer',
                onPress: async () => {
                  try {
                    const picked = await MobilePrintService.selectAndSaveIosPrinter();
                    if (picked) {
                      setIosPrinter(picked);
                      await MobilePrintService.printInvoice(invoiceData, paperSize);
                      Alert.alert(
                        isMr ? 'यशस्वी' : isHi ? 'सफलता' : 'Success',
                        isMr ? `थर्मल प्रिंटर "${picked.name}" वर थेट प्रिंट पाठवले आहे.` : isHi ? `थर्मल प्रिंटर "${picked.name}" पर सीधा प्रिंट भेजा गया है।` : `Direct print sent to "${picked.name}".`
                      );
                      if (onPrinted) onPrinted();
                      onClose();
                    }
                  } catch (e: any) {
                    Alert.alert(isMr ? 'सूचना' : isHi ? 'सूचना' : 'Notice', e?.message || 'Print canceled');
                  }
                },
              },
            ]
          );
          return;
        }

        // Fallback to spooler on Native Android only
        const fallbackRes = await MobilePrintService.printInvoice(invoiceData, paperSize);
        if (fallbackRes.success) {
          if (onPrinted) onPrinted();
          onClose();
        }
        return;
      }

      if (destination === 'WIFI') {
        try {
          const escPosBytes = encodeInvoiceEscPos(invoiceData, paperSize);
          const base64EscPos = uint8ArrayToBase64(escPosBytes);
          const res = await NativePrinterManager.printEscPos('NETWORK', wifiIp + ':' + wifiPort, base64EscPos);
          if (res.success) {
            Alert.alert(
              isMr ? 'यशस्वी' : isHi ? 'सफलता' : 'Success',
              isMr ? 'वाय-फाय प्रिंटरवर थेट प्रिंट पाठवले आहे.' : isHi ? 'वाई-फाई प्रिंटर पर सीधा प्रिंट भेजा गया है।' : 'Direct print sent to Wi-Fi printer.'
            );
            if (onPrinted) onPrinted();
            onClose();
            return;
          }
        } catch { }

        const fallbackRes = await MobilePrintService.printInvoice(invoiceData, paperSize);
        if (fallbackRes.success) {
          if (onPrinted) onPrinted();
          onClose();
        }
        return;
      }

      if (destination === 'USB') {
        const fallbackRes = await MobilePrintService.printInvoice(invoiceData, paperSize);
        if (fallbackRes.success) {
          if (onPrinted) onPrinted();
          onClose();
        }
        return;
      }

      if (destination === 'SPOOLER') {
        const res = await MobilePrintService.printInvoice(invoiceData, paperSize);
        if (res.success) {
          if (onPrinted) onPrinted();
          onClose();
        }
        return;
      }
    } catch (err: any) {
      Alert.alert(isMr ? 'प्रिंटिंग त्रुटी' : isHi ? 'प्रिंटिंग त्रुटि' : 'Printing Error', err.message || 'Could not dispatch print job.');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePdf = async () => {
    try {
      setLoading(true);
      await MobilePrintService.exportAndSharePdf(invoiceData, paperSize);
    } catch (err: any) {
      Alert.alert(isMr ? 'PDF त्रुटी' : isHi ? 'PDF त्रुटि' : 'PDF Export Error', err.message || 'Could not export PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      setLoading(true);
      if (destination === 'BLUETOOTH' || destination === 'USB') {
        const testRes = await NativePrinterManager.testPrint(
          destination,
          'Thermal Printer',
          paperSize === '58mm' ? '58mm' : '80mm'
        );
        if (testRes.success) {
          Alert.alert(isMr ? 'यशस्वी' : isHi ? 'सफलता' : 'Success', testRes.message);
          return;
        } else if (testRes.message === 'RAWBT_NOT_INSTALLED') {
          Alert.alert(
            isMr ? 'ब्लूटूथ थर्मल प्रिंटर' : isHi ? 'ब्लूटूथ थर्मल प्रिंटर' : 'Bluetooth Thermal Printer',
            isMr
              ? 'थर्मल प्रिंटरवरून थेट प्रिंट काढण्यासाठी सिस्टिम प्रिंट वापरा किंवा RawBT ॲप इन्स्टॉल करा.'
              : isHi
                ? 'थर्मल प्रिंटर से सीधा प्रिंट निकालने के लिए सिस्टम प्रिंट का उपयोग करें या RawBT ऐप इंस्टॉल करें।'
                : 'To print directly to your Bluetooth thermal printer, choose System Print or install RawBT.',
            [
              { text: isMr ? 'रद्द करा' : isHi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
              {
                text: isMr ? '🖨️ सिस्टिम टेस्ट प्रिंट' : isHi ? '🖨️ सिस्टम टेस्ट प्रिंट' : '🖨️ System Test Print',
                onPress: () => MobilePrintService.testPrint(paperSize),
              },
              {
                text: isMr ? '📲 Play Store (RawBT)' : isHi ? '📲 Play Store (RawBT)' : '📲 Play Store (RawBT)',
                onPress: () => NativePrinterManager.openRawBtAppOrStore(),
              },
            ]
          );
          return;
        }
      }
      await MobilePrintService.testPrint(paperSize);
    } catch (err: any) {
      Alert.alert(isMr ? 'चाचणी त्रुटी' : isHi ? 'परीक्षण त्रुटि' : 'Test Print Error', err.message || 'Test print failed.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Left Column Controls (Paper Size, Output Destination, Status)
  // -------------------------------------------------------------
  const renderControls = () => (
    <View style={isWide ? styles.wideControlsCol : styles.mobileControlsBox}>
      {/* 1. SELECT PAPER SIZE */}
      <Text style={styles.sectionHeader}>
        {isMr ? '१. कागदाचा आकार निवडा' : isHi ? '१. पेपर का आकार चुनें' : '1. SELECT PAPER SIZE'}
      </Text>
      <View style={styles.paperSizeGrid}>
        {[
          { id: '58mm' as PaperSize, title: '58mm', sub: isMr ? '२" पॉकेट' : isHi ? '२" पॉकेट' : '2" Pocket' },
          { id: '80mm' as PaperSize, title: '80mm', sub: isMr ? '३" स्टँडर्ड' : isHi ? '३" स्टैंडर्ड' : '3" Standard' },
          { id: 'A4' as PaperSize, title: 'A4', sub: isMr ? 'फुल शीट' : isHi ? 'फुल शीट' : 'Full Sheet' },
        ].map((p) => {
          const isActive = paperSize === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.paperSizeCard, isActive && styles.paperSizeCardActive]}
              onPress={() => setPaperSize(p.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.paperSizeTitle, isActive && styles.paperSizeTitleActive]}>{p.title}</Text>
              <Text style={[styles.paperSizeSub, isActive && styles.paperSizeSubActive]}>{p.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. OUTPUT DESTINATION */}
      <Text style={[styles.sectionHeader, { marginTop: 14 }]}>
        {isMr ? '२. प्रिंटर प्रकार निवडा' : isHi ? '२. प्रिंटर प्रकार चुनें' : '2. OUTPUT DESTINATION'}
      </Text>
      <View style={styles.destinationList}>
        <TouchableOpacity
          style={[styles.destCard, destination === 'SPOOLER' && styles.destCardActive]}
          onPress={() => setDestination('SPOOLER')}
          activeOpacity={0.8}
        >
          <View style={styles.destIconWrap}>
            <Printer size={18} color={destination === 'SPOOLER' ? '#2563EB' : '#475569'} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.destTitle, destination === 'SPOOLER' && styles.destTitleActive]}>
              {isMr ? 'सिस्टिम / ब्राउझर प्रिंट स्पूलर' : isHi ? 'सिस्टम / ब्राउज़र प्रिंट स्पूलर' : 'System / Browser Print Spooler'}
            </Text>
            <Text style={styles.destSub}>
              {isMr ? 'USB, वाय-फाय नेटवर्क आणि PDF प्रिंटर्स' : isHi ? 'USB, वाई-फाई नेटवर्क और PDF प्रिंटर्स' : 'USB, Wi-Fi Network & Virtual PDF printers'}
            </Text>
          </View>
          {destination === 'SPOOLER' && <Check size={18} color="#2563EB" style={styles.checkIcon} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.destCard, destination === 'BLUETOOTH' && styles.destCardActive]}
          onPress={() => {
            if (paperSize === 'A4') setPaperSize('80mm');
            setDestination('BLUETOOTH');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.destIconWrap}>
            <Bluetooth size={18} color={destination === 'BLUETOOTH' ? '#2563EB' : '#475569'} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.destTitle, destination === 'BLUETOOTH' && styles.destTitleActive]}>
              {isMr ? 'थेट ब्लूटूथ थर्मल (ESC/POS)' : isHi ? 'सीधा ब्लूटूथ थर्मल (ESC/POS)' : 'Direct Bluetooth Thermal (ESC/POS)'}
            </Text>
            <Text style={styles.destSub}>
              {Platform.OS === 'ios'
                ? iosPrinter
                  ? `🟢 Active iOS Printer: ${iosPrinter.name}`
                  : (isMr ? 'थर्मल प्रिंटर सेव्ह करा (Silent Direct Print)' : 'Tap to connect thermal printer (Silent Direct Print)')
                : btConnected
                  ? `🟢 ${isMr ? 'कनेक्टेड:' : 'Connected:'} ${btDeviceName || 'Bluetooth Printer'}`
                  : defaultPrinter
                    ? `${isMr ? 'पेअर केलेले:' : 'Paired:'} ${defaultPrinter.printerName}`
                    : (isMr ? 'थेट raw ESC/POS प्रिंट (कोणताही प्रिव्ह्यू डायलॉग नाही)' : 'Direct raw ESC/POS (No browser preview dialog)')}
            </Text>
          </View>
          {destination === 'BLUETOOTH' && <Check size={18} color="#2563EB" style={styles.checkIcon} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.destCard, destination === 'WIFI' && styles.destCardActive]}
          onPress={() => {
            if (paperSize === 'A4') setPaperSize('80mm');
            setDestination('WIFI');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.destIconWrap}>
            <Wifi size={18} color={destination === 'WIFI' ? '#2563EB' : '#475569'} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.destTitle, destination === 'WIFI' && styles.destTitleActive]}>
              {isMr ? 'वाय-फाय / नेटवर्क थर्मल (ESC/POS)' : isHi ? 'वाई-फाई / नेटवर्क थर्मल (ESC/POS)' : 'Wi-Fi / Network Thermal (ESC/POS)'}
            </Text>
            <Text style={styles.destSub}>LAN / Wi-Fi IP: {wifiIp}:{wifiPort}</Text>
          </View>
          {destination === 'WIFI' && <Check size={18} color="#2563EB" style={styles.checkIcon} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.destCard, destination === 'USB' && styles.destCardActive]}
          onPress={() => {
            if (paperSize === 'A4') setPaperSize('80mm');
            setDestination('USB');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.destIconWrap}>
            <Usb size={18} color={destination === 'USB' ? '#2563EB' : '#475569'} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.destTitle, destination === 'USB' && styles.destTitleActive]}>
              {isMr ? 'थेट USB थर्मल (ESC/POS)' : isHi ? 'सीधा USB थर्मल (ESC/POS)' : 'Direct USB Thermal (ESC/POS)'}
            </Text>
            <Text style={styles.destSub}>
              {isMr ? 'OTG द्वारे USB थर्मल प्रिंटर जोडा' : isHi ? 'OTG द्वारा USB थर्मल प्रिंटर जोड़ें' : 'Pair with USB thermal printer via OTG'}
            </Text>
          </View>
          {destination === 'USB' && <Check size={18} color="#2563EB" style={styles.checkIcon} />}
        </TouchableOpacity>
      </View>

      {/* Interface Status bar */}
      <View style={styles.statusBarRow}>
        <Text style={styles.statusBarText}>
          {isMr ? 'ब्लूटूथ:' : isHi ? 'ब्लूटूथ:' : 'Bluetooth:'} {defaultPrinter?.printerType === 'BLUETOOTH' ? defaultPrinter.printerName : (isMr ? 'डिसकनेक्टेड' : isHi ? 'डिस्कनेक्टेड' : 'Disconnected')}
        </Text>
        <View style={styles.statusBtnGroup}>
          <TouchableOpacity style={styles.statusMiniBtn} onPress={handleSharePdf}>
            <Share2 size={12} color="#0F172A" />
            <Text style={styles.statusMiniBtnText}>{isMr ? 'PDF शेअर' : isHi ? 'PDF शेयर' : 'Share PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statusMiniBtn} onPress={handleTestPrint}>
            <Text style={styles.statusMiniBtnText}>{isMr ? 'चाचणी' : isHi ? 'परीक्षण' : 'Test'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Summary Card */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {isMr ? `उपएकूण (${items.length} आयटम):` : isHi ? `उपकुल (${items.length} आइटम):` : `Subtotal (${items.length} items):`}
          </Text>
          <Text style={styles.summaryVal}>₹{subtotal.toFixed(2)}</Text>
        </View>
        {(cgst > 0 || sgst > 0) && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{isMr ? 'कर (GST):' : isHi ? 'कर (GST):' : 'Taxes (GST):'}</Text>
            <Text style={styles.summaryVal}>+ ₹{(cgst + sgst).toFixed(2)}</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{isMr ? 'सूट (Discount):' : isHi ? 'छूट (Discount):' : 'Discount:'}</Text>
            <Text style={[styles.summaryVal, { color: '#DC2626' }]}>- ₹{discount.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>{isMr ? 'एकूण देय:' : isHi ? 'कुल देय:' : 'Grand Total:'}</Text>
          <Text style={styles.summaryTotalVal}>₹{total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // High-Fidelity 58mm Native Receipt Preview (Matching Image 2)
  // -------------------------------------------------------------
  const render58mmNativePreview = () => (
    <View style={styles.receipt58mmCard}>
      <Text style={styles.r58Hotel}>{hotelName.replace(' & ', ' &\n')}</Text>
      <Text style={styles.r58Sub}>{hotelAddress}</Text>
      <Text style={styles.r58Sub}>Tel: {hotelPhone}</Text>
      <Text style={[styles.r58Sub, { fontWeight: '700' }]}>GSTIN: {gstin}</Text>
      <Text style={styles.r58Sub}>FSSAI: {fssai}</Text>

      <View style={styles.r58DividerLine} />
      <Text style={styles.r58Banner}>
        {isActuallyKot
          ? (isMr ? 'केओटी तिकीट (58mm)' : isHi ? 'केओटी टिकट (58mm)' : 'KOT TICKET (58mm)')
          : (isMr ? 'कर बीजक (58mm)' : isHi ? 'कर चालान (58mm)' : 'TAX INVOICE (58mm)')}
      </Text>
      <View style={styles.r58DividerLine} />

      <View style={styles.r58Row}>
        <Text style={styles.r58Mono}>{isActuallyKot ? (isMr ? 'KOT:' : isHi ? 'KOT:' : 'KOT:') : (isMr ? 'INV:' : isHi ? 'INV:' : 'INV:')} #{invoiceData.invoiceNumber}</Text>
        <Text style={styles.r58Mono}>{invoiceData.invoiceDate}</Text>
      </View>
      <View style={styles.r58Row}>
        <Text style={[styles.r58Mono, { flex: 1 }]} numberOfLines={1}>
          {isMr ? 'टेबल:' : isHi ? 'टेबल:' : 'Table:'} {invoiceData.tableName || 'Table 01'}
        </Text>
        {cleanOrderNo ? (
          <Text style={[styles.r58Mono, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
            {isMr ? 'ऑर्डर:' : isHi ? 'ऑर्डर:' : 'Ord:'} {cleanOrderNo}
          </Text>
        ) : null}
      </View>
      {invoiceData.customerName ? (
        <View style={styles.r58Row}>
          <Text style={[styles.r58Mono, { flex: 1 }]} numberOfLines={1}>
            {isMr ? 'ग्राहक:' : isHi ? 'ग्राहक:' : 'Guest:'} {invoiceData.customerName}
          </Text>
        </View>
      ) : null}

      <View style={styles.r58DividerLine} />
      <View style={styles.r58Row}>
        <Text style={[styles.r58Mono, { flex: 2, fontWeight: '700' }]}>{isMr ? 'पदार्थ' : isHi ? 'मद' : 'ITEM'}</Text>
        <Text style={[styles.r58Mono, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>{isMr ? 'प्रमाण' : isHi ? 'मात्रा' : 'QTY'}</Text>
        <Text style={[styles.r58Mono, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>{isMr ? 'रक्कम' : isHi ? 'रकम' : 'AMT'}</Text>
      </View>
      <View style={styles.r58DividerLine} />

      {items.map((it, idx) => (
        <View key={idx} style={styles.r58Row}>
          <Text style={[styles.r58Mono, { flex: 2 }]} numberOfLines={2}>
            {it.name || it.description || 'Dish'}
          </Text>
          <Text style={[styles.r58Mono, { flex: 1, textAlign: 'center' }]}>{it.quantity}</Text>
          <Text style={[styles.r58Mono, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>
            {(it.totalPrice || it.unitPrice * it.quantity || 0).toFixed(2)}
          </Text>
        </View>
      ))}

      <View style={styles.r58DividerLine} />
      <View style={styles.r58Row}>
        <Text style={styles.r58Mono}>{isMr ? 'उपएकूण:' : isHi ? 'उपकुल:' : 'Subtotal:'}</Text>
        <Text style={styles.r58Mono}>₹{subtotal.toFixed(2)}</Text>
      </View>
      {cgst > 0 && (
        <View style={styles.r58Row}>
          <Text style={styles.r58Mono}>CGST (2.5%):</Text>
          <Text style={styles.r58Mono}>+ ₹{cgst.toFixed(2)}</Text>
        </View>
      )}
      {sgst > 0 && (
        <View style={styles.r58Row}>
          <Text style={styles.r58Mono}>SGST (2.5%):</Text>
          <Text style={styles.r58Mono}>+ ₹{sgst.toFixed(2)}</Text>
        </View>
      )}
      {discount > 0 && (
        <View style={styles.r58Row}>
          <Text style={styles.r58Mono}>{isMr ? 'सूट:' : isHi ? 'छूट:' : 'Discount:'}</Text>
          <Text style={styles.r58Mono}>- ₹{discount.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.r58DividerLine} />
      <View style={styles.r58Row}>
        <Text style={[styles.r58Mono, { fontSize: 13, fontWeight: '800' }]}>{isMr ? 'एकूण देय:' : isHi ? 'कुल देय:' : 'TOTAL:'}</Text>
        <Text style={[styles.r58Mono, { fontSize: 13, fontWeight: '800' }]}>₹{total.toFixed(2)}</Text>
      </View>
      <View style={styles.r58DividerLine} />

      <View style={styles.r58Row}>
        <Text style={styles.r58Mono}>{isMr ? 'पेमेंट प्रकार:' : isHi ? 'भुगतान प्रकार:' : 'Pay Mode:'} {invoiceData.paymentMethod || 'UPI'}</Text>
        <Text style={[styles.r58Mono, { fontWeight: '700' }]}>[{paymentBadgeText}]</Text>
      </View>
      <View style={styles.r58DividerLine} />

      <Text style={styles.r58Footer}>
        {invoiceData.footerMessage || (isActuallyKot ? (isMr ? 'किचन कॉपी - KOT' : 'Kitchen Copy - KOT') : (isMr ? 'आमच्याकडे जेवणाचा आनंद घेतल्याबद्दल धन्यवाद!\nपुन्हा अवश्य भेट द्या.' : isHi ? 'हमारे यहाँ भोजन करने के लिए धन्यवाद!\nफिर पधारें।' : 'Thank you for dining with us!\nPlease visit again.'))}
      </Text>
    </View>
  );

  // -------------------------------------------------------------
  // High-Fidelity 80mm Native Receipt Preview (Vite Standard POS)
  // -------------------------------------------------------------
  const render80mmNativePreview = () => (
    <View style={styles.receipt80mmCard}>
      <Text style={styles.r80Hotel}>{hotelName}</Text>
      <Text style={styles.r80Sub}>{hotelAddress}</Text>
      <Text style={styles.r80Sub}>Phone: {hotelPhone}</Text>
      <Text style={[styles.r80Sub, { fontWeight: '700' }]}>GSTIN: {gstin}</Text>
      <Text style={styles.r80Sub}>FSSAI Lic. No: {fssai}</Text>

      <View style={styles.r80DividerLine} />
      <Text style={styles.r80Banner}>
        {isActuallyKot
          ? (isMr ? 'किचन ऑर्डर तिकीट (80mm)' : isHi ? 'किचन ऑर्डर टिकट (80mm)' : 'KOT TICKET (80mm)')
          : (isMr ? 'टॅक्स इन्व्हॉइस (80mm)' : isHi ? 'टैक्स इनवॉयस (80mm)' : 'TAX INVOICE (80mm)')}
      </Text>
      <View style={styles.r80DividerLine} />

      <View style={styles.r80Row}>
        <Text style={styles.r80Mono}>{isMr ? 'बीजक क्रमांक:' : isHi ? 'चालान संख्या:' : 'INV NO:'} #{invoiceData.invoiceNumber}</Text>
        <Text style={styles.r80Mono}>{isMr ? 'दिनांक:' : isHi ? 'दिनांक:' : 'DATE:'} {invoiceData.invoiceDate}</Text>
      </View>
      <View style={styles.r80Row}>
        <Text style={[styles.r80Mono, { flex: 1 }]} numberOfLines={1}>
          {isMr ? 'टेबल:' : isHi ? 'टेबल:' : 'TABLE:'} {invoiceData.tableName || 'Table 01'}
        </Text>
        {cleanOrderNo ? (
          <Text style={[styles.r80Mono, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
            {isMr ? 'ऑर्डर:' : isHi ? 'ऑर्डर:' : 'ORD:'} {cleanOrderNo}
          </Text>
        ) : null}
      </View>
      {invoiceData.customerName ? (
        <View style={styles.r80Row}>
          <Text style={[styles.r80Mono, { flex: 1 }]} numberOfLines={1}>
            {isMr ? 'ग्राहक:' : isHi ? 'ग्राहक:' : 'CUSTOMER:'} {invoiceData.customerName}
          </Text>
          {invoiceData.customerPhone ? <Text style={styles.r80Mono}>{invoiceData.customerPhone}</Text> : null}
        </View>
      ) : null}

      <View style={styles.r80DividerLine} />
      <View style={styles.r80Row}>
        <Text style={[styles.r80Mono, { flex: 2.2, fontWeight: '700' }]}>{isMr ? 'पदार्थ' : isHi ? 'मद' : 'ITEM'}</Text>
        <Text style={[styles.r80Mono, { flex: 0.8, textAlign: 'center', fontWeight: '700' }]}>{isMr ? 'प्रमाण' : isHi ? 'मात्रा' : 'QTY'}</Text>
        <Text style={[styles.r80Mono, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>{isMr ? 'दर' : isHi ? 'दर' : 'RATE'}</Text>
        <Text style={[styles.r80Mono, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>{isMr ? 'एकूण' : isHi ? 'कुल' : 'TOTAL'}</Text>
      </View>
      <View style={styles.r80DividerLine} />

      {items.map((it, idx) => (
        <View key={idx} style={styles.r80Row}>
          <Text style={[styles.r80Mono, { flex: 2.2 }]} numberOfLines={2}>
            {it.name || it.description || 'Dish'}
          </Text>
          <Text style={[styles.r80Mono, { flex: 0.8, textAlign: 'center' }]}>{it.quantity}</Text>
          <Text style={[styles.r80Mono, { flex: 1, textAlign: 'right' }]}>{Number(it.unitPrice || 0).toFixed(2)}</Text>
          <Text style={[styles.r80Mono, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>
            {(it.totalPrice || it.unitPrice * it.quantity || 0).toFixed(2)}
          </Text>
        </View>
      ))}

      <View style={styles.r80DividerLine} />
      <View style={styles.r80Row}>
        <Text style={styles.r80Mono}>{isMr ? 'उपएकूण:' : isHi ? 'उपकुल:' : 'Subtotal:'}</Text>
        <Text style={styles.r80Mono}>₹{subtotal.toFixed(2)}</Text>
      </View>
      {discount > 0 && (
        <View style={styles.r80Row}>
          <Text style={styles.r80Mono}>{isMr ? 'सूट:' : isHi ? 'छूट:' : 'Discount:'}</Text>
          <Text style={[styles.r80Mono, { color: '#DC2626' }]}>- ₹{discount.toFixed(2)}</Text>
        </View>
      )}
      {cgst > 0 && (
        <View style={styles.r80Row}>
          <Text style={styles.r80Mono}>CGST (2.5%):</Text>
          <Text style={styles.r80Mono}>+ ₹{cgst.toFixed(2)}</Text>
        </View>
      )}
      {sgst > 0 && (
        <View style={styles.r80Row}>
          <Text style={styles.r80Mono}>SGST (2.5%):</Text>
          <Text style={styles.r80Mono}>+ ₹{sgst.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.r80DoubleDividerLine} />
      <View style={styles.r80Row}>
        <Text style={[styles.r80Mono, { fontSize: 14, fontWeight: '800' }]}>{isMr ? 'एकूण देय रक्कम:' : isHi ? 'कुल देय राशि:' : 'GRAND TOTAL:'}</Text>
        <Text style={[styles.r80Mono, { fontSize: 14, fontWeight: '800' }]}>₹{total.toFixed(2)}</Text>
      </View>
      <View style={styles.r80DoubleDividerLine} />

      <View style={styles.r80Row}>
        <Text style={styles.r80Mono}>{isMr ? 'पेमेंट माध्यम:' : isHi ? 'भुगतान माध्यम:' : 'Payment Mode:'} {invoiceData.paymentMethod || 'CASH'}</Text>
        <Text style={[styles.r80Mono, { fontWeight: '700' }]}>[{paymentBadgeText}]</Text>
      </View>
      <View style={styles.r80DividerLine} />

      <Text style={styles.r80Footer}>
        {invoiceData.footerMessage || (isActuallyKot ? (isMr ? 'किचन कॉपी - KOT' : 'Kitchen Copy - KOT') : (isMr ? 'आमच्याकडे जेवणाचा आनंद घेतल्याबद्दल धन्यवाद!\nपुन्हा अवश्य भेट द्या.' : isHi ? 'हमारे यहाँ भोजन करने के लिए धन्यवाद!\nफिर पधारें।' : 'Thank you for dining with us! Please visit again.'))}
      </Text>
    </View>
  );

  // -------------------------------------------------------------
  // High-Fidelity A4 Native Preview (Official Tax Invoice)
  // -------------------------------------------------------------
  const renderA4NativePreview = () => (
    <View style={styles.receiptA4Card}>
      {/* Top Header Banner */}
      <View style={styles.a4Header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.a4CompanyTitle}>{hotelName}</Text>
          <Text style={styles.a4Sub}>{hotelAddress}</Text>
          <Text style={styles.a4Sub}>Phone: {hotelPhone}</Text>
          <Text style={[styles.a4Sub, { fontWeight: '700', color: '#090040' }]}>
            GSTIN: {gstin} • FSSAI: {fssai}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.a4Pill}>
            <Text style={styles.a4PillText}>TAX INVOICE</Text>
          </View>
          <Text style={styles.a4InvNum}>#{invoiceData.invoiceNumber}</Text>
          <Text style={styles.a4DateText}>Date: {invoiceData.invoiceDate}</Text>
          <View style={[styles.a4StatusBadge, isPaid ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.a4StatusText, isPaid ? { color: '#166534' } : { color: '#92400E' }]}>
              {isPaid ? '✓ FULLY PAID' : 'PENDING PAYMENT'}
            </Text>
          </View>
        </View>
      </View>

      {/* Meta cards */}
      <View style={styles.a4Grid}>
        <View style={styles.a4InfoCard}>
          <Text style={styles.a4CardTitle}>BILLED TO (CUSTOMER DETAILS)</Text>
          <Text style={styles.a4CardName}>{invoiceData.customerName || 'Walk-in Guest'}</Text>
          {invoiceData.customerPhone ? <Text style={styles.a4Sub}>Mobile: {invoiceData.customerPhone}</Text> : null}
        </View>
        <View style={styles.a4InfoCard}>
          <Text style={styles.a4CardTitle}>SERVICE & DINING REFERENCE</Text>
          <Text style={styles.a4Sub}>Table: {invoiceData.tableName || 'Counter'}</Text>
          <Text style={styles.a4Sub}>Order Ref: {invoiceData.orderNumber || '-'}</Text>
          <Text style={styles.a4Sub}>Pay Mode: {invoiceData.paymentMethod || 'CASH'}</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.a4TableHead}>
        <Text style={[styles.a4Th, { flex: 0.5, textAlign: 'center' }]}>#</Text>
        <Text style={[styles.a4Th, { flex: 2.5 }]}>ITEM DESCRIPTION</Text>
        <Text style={[styles.a4Th, { flex: 0.8, textAlign: 'center' }]}>QTY</Text>
        <Text style={[styles.a4Th, { flex: 1, textAlign: 'right' }]}>RATE</Text>
        <Text style={[styles.a4Th, { flex: 1.2, textAlign: 'right' }]}>TOTAL</Text>
      </View>
      {items.map((it, idx) => (
        <View key={idx} style={styles.a4TableRow}>
          <Text style={[styles.a4Td, { flex: 0.5, textAlign: 'center' }]}>{idx + 1}</Text>
          <Text style={[styles.a4Td, { flex: 2.5, fontWeight: '600' }]}>{it.name || it.description}</Text>
          <Text style={[styles.a4Td, { flex: 0.8, textAlign: 'center' }]}>{it.quantity}</Text>
          <Text style={[styles.a4Td, { flex: 1, textAlign: 'right' }]}>₹{Number(it.unitPrice || 0).toFixed(2)}</Text>
          <Text style={[styles.a4Td, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>
            ₹{(it.totalPrice || it.unitPrice * it.quantity || 0).toFixed(2)}
          </Text>
        </View>
      ))}

      {/* Totals & Signatory */}
      <View style={styles.a4BottomSection}>
        <View style={{ flex: 1, marginRight: 14 }}>
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#475569' }}>AMOUNT IN WORDS:</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E3A8A', fontStyle: 'italic', marginTop: 2 }}>
            {numberToWordsINR(total)}
          </Text>
        </View>

        <View style={{ width: 170 }}>
          <View style={styles.a4SummaryRow}>
            <Text style={styles.a4Sub}>Subtotal:</Text>
            <Text style={[styles.a4Sub, { fontWeight: '700' }]}>₹{subtotal.toFixed(2)}</Text>
          </View>
          {cgst > 0 && (
            <View style={styles.a4SummaryRow}>
              <Text style={styles.a4Sub}>CGST (2.5%):</Text>
              <Text style={styles.a4Sub}>+ ₹{cgst.toFixed(2)}</Text>
            </View>
          )}
          {sgst > 0 && (
            <View style={styles.a4SummaryRow}>
              <Text style={styles.a4Sub}>SGST (2.5%):</Text>
              <Text style={styles.a4Sub}>+ ₹{sgst.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.a4SummaryRow, { borderTopWidth: 1.5, borderColor: '#090040', paddingTop: 4, marginTop: 4 }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#090040' }}>Grand Total:</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#090040' }}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // Live Preview Section (Web iframe or Native Monospace Card)
  // -------------------------------------------------------------
  const renderPreviewSection = () => {
    const cardWidth =
      paperSize === '58mm'
        ? 228
        : paperSize === '80mm'
          ? Math.min(SCREEN_WIDTH - 32, 320)
          : Math.min(SCREEN_WIDTH - 24, 520);

    return (
      <View style={isWide ? styles.widePreviewCol : styles.mobilePreviewBox}>
        <View style={styles.previewHeaderLabelRow}>
          <Eye size={14} color="#475569" />
          <Text style={styles.previewHeaderLabel}>
            {isMr ? `थेट प्रिंट प्रिव्ह्यू (${paperSize.toUpperCase()})` : isHi ? `लाइव प्रिंट प्रिव्यू (${paperSize.toUpperCase()})` : `LIVE PRINT PREVIEW (${paperSize.toUpperCase()} FORMAT)`}
          </Text>
        </View>

        {Platform.OS === 'web' ? (
          <View
            style={[
              styles.webIframeWrapper,
              {
                width: cardWidth,
                minHeight: paperSize === 'A4' ? 620 : paperSize === '80mm' ? 480 : 420,
              },
            ]}
          >
            {/* On Web: iframe renders the exact HTML generated by invoicePrintRenderer */}
            <iframe
              srcDoc={previewHtml}
              title="Invoice Preview"
              style={{
                width: '100%',
                height: paperSize === 'A4' ? '620px' : paperSize === '80mm' ? '480px' : '420px',
                border: 'none',
                backgroundColor: '#FFFFFF',
                display: 'block',
              }}
            />
          </View>
        ) : (
          <View style={{ alignItems: 'center', width: '100%' }}>
            {paperSize === '58mm' && render58mmNativePreview()}
            {paperSize === '80mm' && render80mmNativePreview()}
            {paperSize === 'A4' && renderA4NativePreview()}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, isWide && styles.wideModalCard]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Printer size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {ticketTitle}
                  </Text>
                  <View style={[styles.badgePill, isPaid ? styles.badgePaid : styles.badgeUnpaid]}>
                    <Text style={[styles.badgeText, isPaid ? styles.badgeTextPaid : styles.badgeTextUnpaid]}>
                      {paymentBadgeText}
                    </Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>
                  {isMr ? 'कागदाचा रोल (58mm / 80mm / A4) आणि प्रिंटर निवडा' : isHi ? 'पेपर रोल (58mm / 80mm / A4) और प्रिंटर चुनें' : 'Select paper roll format (58mm / 80mm / A4) and printer output destination'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {isWide ? (
            <View style={styles.wideBodyRow}>
              <ScrollView style={{ width: 350 }} contentContainerStyle={{ padding: 16 }}>
                {renderControls()}
              </ScrollView>
              <ScrollView style={{ flex: 1, backgroundColor: '#E2E8F0' }} contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
                {renderPreviewSection()}
              </ScrollView>
            </View>
          ) : (
            <ScrollView style={styles.mobileScrollBody} contentContainerStyle={styles.mobileScrollContent}>
              {renderControls()}
              {renderPreviewSection()}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* Bottom Sticky Action Bar */}
          <View style={[styles.bottomBar, !isWide && styles.bottomBarMobile]}>
            <View style={[styles.bottomInfoColumn, !isWide && styles.bottomInfoColumnMobile]}>
              <Text style={styles.bottomSubtotalText}>
                {isMr ? `उपएकूण (${items.length} आयटम):` : isHi ? `उपकुल (${items.length} आइटम):` : `Subtotal (${items.length} items):`}{' '}
                <Text style={{ fontWeight: '800' }}>₹{subtotal.toFixed(2)}</Text>
              </Text>
              <Text style={styles.bottomTargetText}>
                {isMr ? 'लक्ष्य:' : isHi ? 'लक्ष्य:' : 'Target:'} {paperSize} • {isMr ? 'पद्धत:' : isHi ? 'माध्यम:' : 'Method:'} {methodLabel}
              </Text>
            </View>

            <View style={[styles.bottomBtnRow, !isWide && styles.bottomBtnRowMobile]}>
              <TouchableOpacity
                style={[styles.cancelBtn, !isWide && styles.cancelBtnMobile]}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{isMr ? 'रद्द करा' : isHi ? 'रद्द करें' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmPrintBtn, !isWide && styles.confirmPrintBtnMobile]}
                onPress={handleConfirmPrint}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Printer size={16} color="#FFFFFF" />
                    <Text style={styles.confirmPrintBtnText}>
                      {isMr ? `प्रिंट करा (${paperSize})` : isHi ? `प्रिंट करें (${paperSize})` : `Confirm & Print ${paperSize}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 0, 64, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '92%',
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  wideModalCard: {
    maxWidth: 960,
    width: '90%',
    maxHeight: '88%',
    height: '88%',
    alignSelf: 'center',
    borderRadius: 16,
    marginVertical: 'auto',
  },
  header: {
    backgroundColor: '#090040',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePaid: {
    backgroundColor: '#22C55E',
  },
  badgeUnpaid: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  badgeTextPaid: {
    color: '#FFFFFF',
  },
  badgeTextUnpaid: {
    color: '#000000',
  },
  headerSubtitle: {
    color: '#CBD5E1',
    fontSize: 10.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  wideBodyRow: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  wideControlsCol: {
    gap: 12,
  },
  mobileControlsBox: {
    marginBottom: 16,
  },
  mobileScrollBody: {
    flex: 1,
  },
  mobileScrollContent: {
    padding: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#090040',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paperSizeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  paperSizeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  paperSizeCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paperSizeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  paperSizeTitleActive: {
    color: '#2563EB',
  },
  paperSizeSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  paperSizeSubActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  destinationList: {
    gap: 8,
  },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  destCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  destIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  destTitleActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  destSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  checkIcon: {
    marginLeft: 6,
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  statusBarText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  statusBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusMiniBtnText: {
    fontSize: 10.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 4,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#090040',
  },
  summaryTotalVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#090040',
  },

  // Preview container
  widePreviewCol: {
    alignItems: 'center',
    width: '100%',
  },
  mobilePreviewBox: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  previewHeaderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  webIframeWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },

  // -------------------------------------------------------------
  // 58mm Styling
  // -------------------------------------------------------------
  receipt58mmCard: {
    width: '100%',
    maxWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  r58Hotel: {
    fontFamily: MONO_FONT,
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },
  r58Sub: {
    fontFamily: MONO_FONT,
    fontSize: 8.5,
    textAlign: 'center',
    color: '#000000',
    marginTop: 1,
  },
  r58Banner: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },
  r58DividerLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#000000',
    marginVertical: 4,
  },
  r58Divider: {
    fontFamily: MONO_FONT,
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    marginVertical: 2,
  },
  r58Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1,
    overflow: 'hidden',
  },
  r58Mono: {
    fontFamily: MONO_FONT,
    fontSize: 9.5,
    color: '#000000',
  },
  r58Footer: {
    fontFamily: MONO_FONT,
    fontSize: 8.5,
    textAlign: 'center',
    color: '#000000',
    marginTop: 4,
    lineHeight: 12,
  },

  // -------------------------------------------------------------
  // 80mm Styling
  // -------------------------------------------------------------
  receipt80mmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  r80Hotel: {
    fontFamily: MONO_FONT,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },
  r80Sub: {
    fontFamily: MONO_FONT,
    fontSize: 9.5,
    textAlign: 'center',
    color: '#000000',
    marginTop: 1,
  },
  r80Banner: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },
  r80DividerLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#000000',
    marginVertical: 5,
  },
  r80DoubleDividerLine: {
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#000000',
    marginVertical: 6,
  },
  r80Divider: {
    fontFamily: MONO_FONT,
    fontSize: 9,
    color: '#000000',
    textAlign: 'center',
    marginVertical: 3,
  },
  r80Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1,
    overflow: 'hidden',
  },
  r80Mono: {
    fontFamily: MONO_FONT,
    fontSize: 10.5,
    color: '#000000',
  },
  r80Footer: {
    fontFamily: MONO_FONT,
    fontSize: 9.5,
    textAlign: 'center',
    color: '#000000',
    marginTop: 4,
    lineHeight: 13,
  },

  // -------------------------------------------------------------
  // A4 Styling
  // -------------------------------------------------------------
  receiptA4Card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  a4Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderColor: '#1E3A8A',
    paddingBottom: 10,
    marginBottom: 10,
  },
  a4CompanyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  a4Sub: {
    fontSize: 9.5,
    color: '#4B5563',
    marginTop: 1,
  },
  a4Pill: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
  },
  a4PillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  a4InvNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  a4DateText: {
    fontSize: 9.5,
    color: '#4B5563',
  },
  a4StatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 4,
  },
  a4StatusText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  a4Grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  a4InfoCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 8,
  },
  a4CardTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#6B7280',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 2,
    marginBottom: 4,
  },
  a4CardName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  a4TableHead: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  a4Th: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  a4TableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  a4Td: {
    fontSize: 9.5,
    color: '#1F2937',
  },
  a4BottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 8,
  },
  a4SummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  // Bottom action bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bottomInfoColumn: {
    flex: 1,
    marginRight: 12,
  },
  bottomInfoColumnMobile: {
    marginRight: 0,
    width: '100%',
  },
  bottomSubtotalText: {
    fontSize: 12,
    color: '#475569',
  },
  bottomTargetText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  bottomBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bottomBtnRowMobile: {
    width: '100%',
    flexDirection: 'row',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cancelBtnMobile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  confirmPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#090040',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  confirmPrintBtnMobile: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrintBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
