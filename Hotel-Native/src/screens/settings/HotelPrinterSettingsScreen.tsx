
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppTheme } from '../../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import {
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  Search,
  Plus,
  RefreshCw,
  Check,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronLeft,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Info,
  Radio,
  Zap,
  Download,
} from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useBranch } from '../../context/BranchContext';
import {
  NativePrinterManager,
  PrinterConfig,
  DiscoveredPrinter,
  PrinterInterfaceType,
  PrinterPaperSize,
  PrinterPurpose,
} from '../../services/nativePrinterManager';
import { webBluetoothPrinter } from '../../services/webBluetoothPrinter';
import { webUsbPrinter } from '../../services/webUsbPrinter';
import { MobilePrintService } from '../../services/mobilePrintService';
import {
  BluetoothPrinterDevice,
  BluetoothState,
  UsbPrinterDevice,
  UsbState,
} from '../../types/printing';

interface Props {
  navigation?: any;
  onBack?: () => void;
}

export const HotelPrinterSettingsScreen: React.FC<Props> = ({ navigation, onBack }) => {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const { language } = useLanguage();
  const { activeBranchNumId } = useBranch();
  const isEmbedded = Boolean(onBack);

  // State
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanType, setScanType] = useState<PrinterInterfaceType>('BLUETOOTH');
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredPrinter[]>([]);
  const [testPrintingId, setTestPrintingId] = useState<number | string | null>(null);

  // Web Bluetooth state
  const [btDevice, setBtDevice] = useState<BluetoothPrinterDevice | null>(() =>
    webBluetoothPrinter.getConnectedPrinter()
  );
  const [btState, setBtState] = useState<BluetoothState>(() =>
    webBluetoothPrinter.getState()
  );
  const [isConnectingBt, setIsConnectingBt] = useState<boolean>(false);
  const isBtSupported = webBluetoothPrinter.isSupported();

  // Web USB state
  const [usbDevice, setUsbDevice] = useState<UsbPrinterDevice | null>(() =>
    webUsbPrinter.getConnectedPrinter()
  );
  const [usbState, setUsbState] = useState<UsbState>(() =>
    webUsbPrinter.getState()
  );
  const [isConnectingUsb, setIsConnectingUsb] = useState<boolean>(false);
  const isUsbSupported = webUsbPrinter.isSupported();

  // iOS AirPrint thermal direct printer state
  const [iosPrinter, setIosPrinter] = useState<{ url: string; name: string } | null>(null);

  const loadIosPrinter = useCallback(async () => {
    if (Platform.OS === 'ios') {
      const p = await MobilePrintService.getSavedIosPrinter();
      setIosPrinter(p);
    }
  }, []);

  useEffect(() => {
    loadIosPrinter();
  }, [loadIosPrinter]);

  const handleSelectIosPrinter = async () => {
    try {
      const p = await MobilePrintService.selectAndSaveIosPrinter();
      if (p) {
        setIosPrinter(p);
        Alert.alert(
          isMr ? 'प्रिंटर जोडला!' : 'Printer Connected!',
          isMr
            ? `"${p.name}" जोडला आहे. आता बिल प्रिंट करताना कोणतीही स्क्रीन न येता थेट प्रिंट निघेल!`
            : `✓ "${p.name}" connected! Bills will now print directly without any preview dialog.`
        );
      }
    } catch (e: any) {
      Alert.alert('Notice', e?.message || 'Could not select printer');
    }
  };

  const handleClearIosPrinter = async () => {
    await MobilePrintService.clearSavedIosPrinter();
    setIosPrinter(null);
    Alert.alert('Disconnected', isMr ? 'iOS प्रिंटर डिस्कनेक्ट केला.' : 'iOS printer disconnected.');
  };

  // Modal State for Add / Edit Printer
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<PrinterInterfaceType>('BLUETOOTH');
  const [formMac, setFormMac] = useState<string>('');
  const [formIp, setFormIp] = useState<string>('192.168.1.100');
  const [formPort, setFormPort] = useState<string>('9100');
  const [formUsbId, setFormUsbId] = useState<string>('');
  const [formPaperSize, setFormPaperSize] = useState<PrinterPaperSize>('80mm');
  const [formIsDefaultReceipt, setFormIsDefaultReceipt] = useState<boolean>(false);
  const [formIsDefaultKot, setFormIsDefaultKot] = useState<boolean>(false);
  const [formIsDefaultPurchase, setFormIsDefaultPurchase] = useState<boolean>(false);
  const [formAutoCut, setFormAutoCut] = useState<boolean>(true);
  const [formOpenDrawer, setFormOpenDrawer] = useState<boolean>(false);

  // Check if running on web with insecure host (Chrome blocks Web Bluetooth on HTTP over non-localhost IP like 192.168.1.45)
  const isInsecureWebOrigin =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    Boolean(window?.location) &&
    window.location.protocol === 'http:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  const currentHost =
    Platform.OS === 'web' && typeof window !== 'undefined' && window?.location?.host
      ? window.location.host
      : '';

  // Labels based on language
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const t = {
    title: isMr ? 'प्रिंटर व्यवस्थापन (Printer Settings)' : isHi ? 'प्रिंटर सेटिंग्स (Printer Settings)' : 'Printer Management',
    subtitle: isMr
      ? 'ब्लूटूथ, वाय-फाय, USB थर्मल आणि सिस्टीम प्रिंटर सेट करा'
      : isHi
        ? 'ब्लूटूथ, वाई-फाई, USB थर्मल और सिस्टम प्रिंटर सेट करें'
        : 'Configure Bluetooth, Wi-Fi, USB Thermal & System Printers (Android, iOS & Web)',
    configuredPrinters: isMr ? 'कॉन्फिगर केलेले प्रिंटर' : isHi ? 'कॉन्फिगर किए गए प्रिंटर' : 'Configured Printers',
    discoverPrinters: isMr ? 'प्रिंटर शोधा व कनेक्ट करा' : isHi ? 'प्रिंटर खोजें और कनेक्ट करें' : 'Discover & Connect Thermal Printers',
    addPrinterText: isMr ? 'नवीन प्रिंटर जोडा' : isHi ? 'नया प्रिंटर जोड़ें' : 'Add Printer',
    bluetooth: isMr ? 'ब्लूटूथ (Bluetooth)' : isHi ? 'ब्लूटूथ (Bluetooth)' : 'Bluetooth',
    wifi: isMr ? 'वाय-फाय नेटवर्क (Wi-Fi)' : isHi ? 'वाई-फाई नेटवर्क (Wi-Fi)' : 'Wi-Fi / Network',
    usb: 'USB / OTG',
    testPrint: isMr ? 'टेस्ट प्रिंट' : isHi ? 'टेस्ट प्रिंट' : 'Test Print',
    setAsDefault: isMr ? 'डिफॉल्ट करा' : isHi ? 'डिफ़ॉल्ट बनाएं' : 'Set Default',
    defaultReceipt: isMr ? 'डिफॉल्ट बिल' : isHi ? 'डिफ़ॉल्ट बिल' : 'Default Bill',
    defaultKot: isMr ? 'डिफॉल्ट KOT' : isHi ? 'डिफ़ॉल्ट KOT' : 'Default KOT',
    defaultPurchase: isMr ? 'डिफॉल्ट खरेदी' : isHi ? 'डिफ़ॉल्ट खरीद' : 'Default Purchase',
    paperSize: isMr ? 'कागदाचा आकार (Paper Size)' : isHi ? 'कागज का आकार' : 'Paper Size',
    androidServiceBannerTitle: isMr ? 'थर्मल प्रिंटर सपोर्ट (Android, iOS आणि Web)' : isHi ? 'थर्मल प्रिंटर सपोर्ट (Android, iOS और Web)' : 'Thermal Printer Support (Android, iOS & Web)',
    openBluetoothSettings: isMr ? 'ब्लूटूथ सेटिंग्ज' : isHi ? 'ब्लूटूथ सेटिंग्स' : 'Bluetooth Settings',
    openAndroidSettings: isMr ? 'सिस्टीम प्रिंट सेटिंग्ज' : isHi ? 'सिस्टम प्रिंट सेटिंग्स' : 'System Print Settings',
    noPrintersYet: isMr ? 'कोणतेही प्रिंटर जोडलेले नाहीत. खालील क्विक बटण किंवा स्कॅन वापरा.' : isHi ? 'कोई प्रिंटर कॉन्फिगर नहीं है। नीचे क्विक बटन या स्कैन का उपयोग करें।' : 'No thermal printers configured yet. Use quick setup or scan below.',
    save: isMr ? 'जतन करा (Save)' : isHi ? 'सहेजें (Save)' : 'Save Printer',
    cancel: isMr ? 'रद्द करा' : isHi ? 'रद्द करें' : 'Cancel',
  };

  // Subscribe to Web Bluetooth & USB events
  useEffect(() => {
    const unsubBt = webBluetoothPrinter.subscribe((st, dev) => {
      setBtState(st);
      setBtDevice(dev);
    });
    const unsubUsb = webUsbPrinter.subscribe((st, dev) => {
      setUsbState(st);
      setUsbDevice(dev);
    });
    return () => {
      unsubBt();
      unsubUsb();
    };
  }, []);

  // Load configured printers
  const loadPrinters = useCallback(async () => {
    try {
      setLoading(true);
      const list = await NativePrinterManager.getPrinterConfigs(activeBranchNumId);
      setPrinters(list);
    } catch (err) {
      console.warn('Failed to load printers:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBranchNumId]);

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  // Switch to localhost (for Chrome Web Bluetooth permission on Windows/PC)
  const handleSwitchToLocalhost = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window?.location) {
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `http://localhost${port}${window.location.pathname}${window.location.search}${window.location.hash}`;
    }
  };

  // Connect Web Bluetooth directly (triggers Chrome native Bluetooth Device Chooser popup)
  const handleConnectBt = async () => {
    if (isInsecureWebOrigin) {
      Alert.alert(
        'Chrome Security Requirement',
        'Chrome requires http://localhost:8081 or HTTPS to allow Bluetooth device pairing.\n\nWould you like to switch to localhost:8081 right now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open localhost:8081', onPress: handleSwitchToLocalhost },
        ]
      );
      return;
    }

    try {
      setIsConnectingBt(true);
      const dev = await webBluetoothPrinter.connect();
      Alert.alert(
        isMr ? 'यशस्वी!' : 'Connected!',
        isMr
          ? `ब्लूटूथ थर्मल प्रिंटर "${dev.name || 'Printer'}" यशस्वीरित्या कनेक्ट झाला आहे.`
          : `✓ Connected to "${dev.name || 'Printer'}" successfully!`
      );

      // Auto save printer configuration if not present
      const exists = printers.find(
        (p) => p.printerType === 'BLUETOOTH' && (p.printerName === dev.name || p.macAddress === dev.id)
      );
      if (!exists && dev.name) {
        await NativePrinterManager.savePrinterConfig({
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
          branchId: activeBranchNumId,
        });
        loadPrinters();
      }
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') {
        Alert.alert('Bluetooth Notice', err?.message || 'Could not connect to Bluetooth printer');
      }
    } finally {
      setIsConnectingBt(false);
    }
  };

  // Disconnect Web Bluetooth
  const handleDisconnectBt = async () => {
    try {
      await webBluetoothPrinter.disconnect();
      Alert.alert('Disconnected', 'Bluetooth printer has been disconnected.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Disconnect failed');
    }
  };

  // Connect Web USB
  const handleConnectUsb = async () => {
    try {
      setIsConnectingUsb(true);
      const dev = await webUsbPrinter.connect();
      Alert.alert(
        isMr ? 'यशस्वी!' : 'Connected!',
        `✓ Connected to USB printer: ${dev.name || 'USB Thermal'}`
      );
      const exists = printers.find((p) => p.printerType === 'USB');
      if (!exists && dev.name) {
        await NativePrinterManager.savePrinterConfig({
          printerName: dev.name,
          printerType: 'USB',
          usbIdentifier: 'USB_DIRECT',
          paperSize: '80mm',
          isDefaultReceipt: printers.length === 0,
          isDefaultKot: false,
          isDefaultPurchase: false,
          autoCut: true,
          openDrawer: false,
          copies: 1,
          branchId: activeBranchNumId,
        });
        loadPrinters();
      }
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') {
        Alert.alert('USB Connection Notice', err?.message || 'Could not connect to USB device');
      }
    } finally {
      setIsConnectingUsb(false);
    }
  };

  // Scan for printers
  const handleScan = async (type: PrinterInterfaceType = scanType) => {
    setScanning(true);
    setScanType(type);
    setDiscoveredDevices([]);

    try {
      if (type === 'BLUETOOTH') {
        // On Web: directly trigger native Chrome Bluetooth device picker!
        if (Platform.OS === 'web') {
          if (isInsecureWebOrigin) {
            Alert.alert(
              'Chrome Bluetooth Security',
              `Chrome blocks Bluetooth on IP addresses like ${currentHost}.\n\nPlease switch to http://localhost:8081 to discover and pair Bluetooth printers.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Switch to localhost:8081', onPress: handleSwitchToLocalhost },
              ]
            );
            setScanning(false);
            return;
          }
          await handleConnectBt();
          setScanning(false);
          return;
        }

        // Native Android / iOS
        const found = await NativePrinterManager.scanBluetoothPrinters();
        setDiscoveredDevices(found);
        if (found.length === 0) {
          Alert.alert(
            isMr ? 'ब्लूटूथ प्रिंटर जोडा (Bluetooth Printer)' : 'Bluetooth Printer Setup',
            isMr
              ? 'ब्लूटूथ थर्मल प्रिंटर वापरण्यासाठी:\n\n1. फोन/सिस्टीमच्या Settings > Bluetooth मध्ये जाऊन थर्मल प्रिंटर (उदा. POS-80 / POS-58 / MPT-II) Pair करा (PIN: 0000 किंवा 1234).\n2. खालील "+ Quick Add POS-80" वर क्लिक करून प्रिंटर त्वरित जोडा.\n3. जोडल्यावर "टेस्ट प्रिंट" बटण दाबून खात्री करा.'
              : 'To connect your Bluetooth Thermal Printer:\n\n1. Pair your printer (e.g. POS-80 / POS-58, PIN: 0000 or 1234) in your phone/device Bluetooth Settings.\n2. Tap "+ Quick Add POS-80 (Bluetooth)" below to add it in 1 tap.\n3. Tap "Test Print" to verify.',
            [
              { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
              {
                text: isMr ? '+ POS-80 जोडा' : '+ Quick Add POS-80',
                onPress: () =>
                  openAddModal({
                    name: 'POS-80 Bluetooth Printer',
                    address: '00:11:22:33:44:55',
                    type: 'BLUETOOTH',
                  }),
              },
            ]
          );
        }
      } else if (type === 'USB') {
        if (Platform.OS === 'web' && isUsbSupported) {
          await handleConnectUsb();
          setScanning(false);
          return;
        }

        const found = await NativePrinterManager.scanUsbPrinters();
        setDiscoveredDevices(found);
        if (found.length === 0) {
          Alert.alert(
            isMr ? 'USB प्रिंटर जोडा (USB Thermal Printer)' : 'USB Thermal Printer Setup',
            isMr
              ? 'USB थर्मल प्रिंटर वापरण्यासाठी:\n\n1. OTG अडॅप्टरने USB प्रिंटर फोनला जोडा.\n2. फोनच्या Settings मध्ये "OTG" चालू करा.\n3. खालील "+ Add Printer" वर क्लिक करून सेव्ह करा.'
              : 'To connect USB Thermal Printer:\n\n1. Connect USB thermal printer via OTG adapter.\n2. Enable OTG in your phone settings if required.\n3. Tap "+ Add Printer" below to configure.',
            [
              { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
              {
                text: isMr ? '+ USB प्रिंटर जोडा' : '+ Add USB Printer',
                onPress: () =>
                  openAddModal({
                    name: 'USB Thermal Printer',
                    address: 'USB_POS_PRINTER',
                    type: 'USB',
                  }),
              },
            ]
          );
        }
      } else if (type === 'NETWORK') {
        const found = await NativePrinterManager.scanNetworkPrinters();
        setDiscoveredDevices(found);
        if (found.length === 0) {
          Alert.alert(
            isMr ? 'वाय-फाय प्रिंटर जोडा (Wi-Fi Printer)' : 'Wi-Fi Thermal Printer Setup',
            isMr
              ? 'वाय-फाय थर्मल प्रिंटर स्थानिक नेटवर्कवर (Port 9100) थेट प्रिंट करतो!\n\nखालील "+ Add Printer" वर क्लिक करून प्रिंटरचा IP (उदा. 192.168.1.100) टाका.'
              : 'Wi-Fi thermal printers print directly via local server TCP socket (Port 9100)!\n\nTap "+ Add Printer" to enter your printer IP address (e.g. 192.168.1.100).',
            [
              { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
              {
                text: isMr ? '+ वाय-फाय प्रिंटर जोडा' : '+ Add Wi-Fi Printer',
                onPress: () =>
                  openAddModal({
                    name: 'Wi-Fi Thermal Printer',
                    address: '192.168.1.100',
                    type: 'NETWORK',
                  }),
              },
            ]
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Scan Notice', err?.message || 'Error scanning devices');
    } finally {
      setScanning(false);
    }
  };

  // Perform Direct Hardware Test Print (Bypasses browser print preview!)
  const handleTestPrint = async (printer: PrinterConfig | DiscoveredPrinter) => {
    const isConfig = 'id' in printer;
    const idKey = isConfig ? (printer.id || 'temp') : (printer as DiscoveredPrinter).address;
    setTestPrintingId(idKey);
    try {
      const type: PrinterInterfaceType = isConfig ? (printer as PrinterConfig).printerType : (printer as DiscoveredPrinter).type;
      const paperSize: PrinterPaperSize = isConfig ? ((printer as PrinterConfig).paperSize || '80mm') : '80mm';

      // 0. Direct iOS AirPrint saved printer test print
      if (Platform.OS === 'ios' && iosPrinter) {
        await MobilePrintService.testPrint(paperSize === '58mm' ? '58mm' : '80mm');
        Alert.alert(
          isMr ? 'प्रिंट यशस्वी!' : 'Print Sent!',
          isMr
            ? `"${iosPrinter.name}" वर थेट टेस्ट प्रिंट पाठवले आहे.`
            : `✓ Direct test slip printed on ${iosPrinter.name}!`
        );
        return;
      }

      // 1. Direct Web Bluetooth ESC/POS print
      if (type === 'BLUETOOTH' && webBluetoothPrinter.isConnected()) {
        await webBluetoothPrinter.testPrint(paperSize === '58mm' ? '58mm' : '80mm');
        Alert.alert(
          isMr ? 'प्रिंट यशस्वी!' : 'Print Sent!',
          isMr
            ? 'ब्लूटूथ थर्मल प्रिंटरवर थेट टेस्ट स्लिप प्रिंट झाली आहे.'
            : '✓ Direct ESC/POS test slip printed on your Bluetooth printer!'
        );
        return;
      }

      // If Bluetooth on web but disconnected, prompt to pair
      if (type === 'BLUETOOTH' && Platform.OS === 'web' && !webBluetoothPrinter.isConnected()) {
        Alert.alert(
          'Bluetooth Printer Not Connected',
          'Please pair your Bluetooth thermal printer first to test print.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Pair Now', onPress: handleConnectBt },
          ]
        );
        return;
      }

      // 2. Direct Web USB ESC/POS print
      if (type === 'USB' && webUsbPrinter.isConnected()) {
        await webUsbPrinter.testPrint(paperSize === '58mm' ? '58mm' : '80mm');
        Alert.alert(
          isMr ? 'प्रिंट यशस्वी!' : 'Print Sent!',
          '✓ Direct ESC/POS test slip printed on your USB printer!'
        );
        return;
      }

      // 3. Fallback to NativePrinterManager (handles Wi-Fi TCP Port 9100, Android native module, RawBT)
      const target = isConfig
        ? (type === 'BLUETOOTH'
          ? (printer as PrinterConfig).macAddress || ''
          : type === 'NETWORK'
            ? (printer as PrinterConfig).ipAddress || ''
            : (printer as PrinterConfig).usbIdentifier || '')
        : (printer as DiscoveredPrinter).address;

      const res = await NativePrinterManager.testPrint(type, target, paperSize);
      if (res.success) {
        Alert.alert(
          isMr ? 'प्रिंट यशस्वी!' : 'Print Sent!',
          res.message || (isMr ? 'टेस्ट प्रिंट स्लिप प्रिंटरवर पाठवली आहे.' : 'Test print sent successfully.')
        );
      } else if (res.message === 'RAWBT_NOT_INSTALLED') {
        Alert.alert(
          isMr ? 'RawBT प्रिंट ड्रायव्हर आवश्यक आहे' : 'RawBT Print Driver Required',
          isMr
            ? 'Android वर ब्लूटूथ प्रिंटरवरून प्रिव्ह्यू स्क्रीन न येता थेट प्रिंट काढण्यासाठी "RawBT Print Service" ॲप आवश्यक आहे.\n\nPlay Store वरून RawBT इन्स्टॉल करा.'
            : 'To print directly to Bluetooth thermal printers on Android without preview dialogs, RawBT Print Service is required.\n\nPlease install RawBT from Google Play Store.',
          [
            { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
            {
              text: isMr ? '📲 Play Store उघडा (RawBT)' : '📲 Open Play Store (RawBT)',
              onPress: () => NativePrinterManager.openRawBtAppOrStore(),
            },
            {
              text: isMr ? '📶 फोन ब्लूटूथ सेटिंग्स' : '📶 Phone Bluetooth Settings',
              onPress: () => NativePrinterManager.openBluetoothSettings(),
            },
          ]
        );
      } else {
        Alert.alert('Test Print Notice', res.message);
      }
    } catch (err: any) {
      Alert.alert('Test Print Error', err?.message || 'Failed to print test slip');
    } finally {
      setTestPrintingId(null);
    }
  };

  // Open Add/Edit Modal
  const openAddModal = (discovered?: DiscoveredPrinter) => {
    if (discovered) {
      setEditingId(null);
      setFormName(discovered.name || 'Thermal Printer');
      setFormType(discovered.type);
      setFormMac(discovered.type === 'BLUETOOTH' ? discovered.address : '');
      setFormIp(discovered.type === 'NETWORK' ? discovered.address : '192.168.1.100');
      setFormPort('9100');
      setFormUsbId(discovered.type === 'USB' ? discovered.address : '');
      setFormPaperSize('80mm');
      setFormIsDefaultReceipt(printers.length === 0);
      setFormIsDefaultKot(printers.length === 0);
      setFormIsDefaultPurchase(printers.length === 0);
    } else {
      setEditingId(null);
      setFormName('');
      setFormType('BLUETOOTH');
      setFormMac('');
      setFormIp('192.168.1.100');
      setFormPort('9100');
      setFormUsbId('');
      setFormPaperSize('80mm');
      setFormIsDefaultReceipt(false);
      setFormIsDefaultKot(false);
      setFormIsDefaultPurchase(false);
    }
    setFormAutoCut(true);
    setFormOpenDrawer(false);
    setModalVisible(true);
  };

  const openQuickPreset = (presetType: 'POS-80' | 'POS-58' | 'WIFI') => {
    setEditingId(null);
    if (presetType === 'WIFI') {
      setFormName('Wi-Fi Thermal Printer (TCP 9100)');
      setFormType('NETWORK');
      setFormIp('192.168.1.100');
      setFormPort('9100');
      setFormPaperSize('80mm');
    } else {
      setFormName(`${presetType} Bluetooth Thermal Printer`);
      setFormType('BLUETOOTH');
      setFormMac('00:11:22:33:44:55');
      setFormPaperSize(presetType === 'POS-58' ? '58mm' : '80mm');
    }
    setFormIsDefaultReceipt(true);
    setFormIsDefaultKot(true);
    setFormIsDefaultPurchase(true);
    setFormAutoCut(true);
    setFormOpenDrawer(false);
    setModalVisible(true);
  };

  const openEditModal = (p: PrinterConfig) => {
    setEditingId(p.id || null);
    setFormName(p.printerName);
    setFormType(p.printerType);
    setFormMac(p.macAddress || '');
    setFormIp(p.ipAddress || '192.168.1.100');
    setFormPort(p.port ? String(p.port) : '9100');
    setFormUsbId(p.usbIdentifier || '');
    setFormPaperSize(p.paperSize || '80mm');
    setFormIsDefaultReceipt(!!p.isDefaultReceipt);
    setFormIsDefaultKot(!!p.isDefaultKot);
    setFormIsDefaultPurchase(!!p.isDefaultPurchase);
    setFormAutoCut(p.autoCut ?? true);
    setFormOpenDrawer(p.openDrawer ?? false);
    setModalVisible(true);
  };

  // Save Printer Configuration
  const handleSavePrinter = async () => {
    if (!formName.trim()) {
      Alert.alert('Required', isMr ? 'कृपया प्रिंटरचे नाव टाका.' : 'Please enter printer name');
      return;
    }

    const payload: PrinterConfig = {
      printerName: formName.trim(),
      printerType: formType,
      paperSize: formPaperSize,
      isDefaultReceipt: formIsDefaultReceipt,
      isDefaultKot: formIsDefaultKot,
      isDefaultPurchase: formIsDefaultPurchase,
      autoCut: formAutoCut,
      openDrawer: formOpenDrawer,
      copies: 1,
      branchId: activeBranchNumId,
    };

    if (formType === 'BLUETOOTH') {
      payload.macAddress = formMac.trim() || '00:11:22:33:44:55';
    } else if (formType === 'NETWORK') {
      if (!formIp.trim()) {
        Alert.alert('Required', 'Please enter printer IP address');
        return;
      }
      payload.ipAddress = formIp.trim();
      payload.port = parseInt(formPort) || 9100;
    } else if (formType === 'USB') {
      payload.usbIdentifier = formUsbId.trim() || 'USB_DEFAULT';
    }

    try {
      if (editingId) {
        await NativePrinterManager.updatePrinterConfig(editingId, payload);
      } else {
        await NativePrinterManager.savePrinterConfig(payload);
      }
      setModalVisible(false);
      loadPrinters();
      Alert.alert(isMr ? 'यशस्वी!' : 'Success', isMr ? 'प्रिंटर जतन केला आहे!' : 'Printer configuration saved!');
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Failed to save printer');
    }
  };

  // Delete printer
  const handleDeletePrinter = (id: number) => {
    Alert.alert(
      isMr ? 'प्रिंटर हटवा?' : 'Delete Printer?',
      isMr ? 'तुम्हाला हा प्रिंटर काढून टाकायचा आहे का?' : 'Are you sure you want to remove this printer?',
      [
        { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
        {
          text: isMr ? 'हटवा' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await NativePrinterManager.deletePrinterConfig(id);
              loadPrinters();
            } catch (err: any) {
              Alert.alert('Delete Error', err?.message || 'Could not delete printer');
            }
          },
        },
      ]
    );
  };

  // Set Default
  const handleSetDefault = async (id: number, purpose: PrinterPurpose) => {
    try {
      await NativePrinterManager.setDefaultPrinter(id, purpose);
      loadPrinters();
    } catch (err: any) {
      Alert.alert('Set Default Error', err?.message || 'Failed to set default printer');
    }
  };

  return (
    <View style={[styles.container, isEmbedded && styles.containerEmbedded]}>
      {/* Top Header */}
      <View style={[styles.header, isEmbedded && styles.headerEmbedded]}>
        <TouchableOpacity
          onPress={() => (onBack ? onBack() : navigation?.goBack?.())}
          style={[styles.backBtn, isEmbedded && styles.backBtnEmbedded]}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={isEmbedded ? '#7C2D12' : '#FFFFFF'} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, isEmbedded && styles.headerTitleEmbedded]}>{t.title}</Text>
        </View>
        <TouchableOpacity
          onPress={loadPrinters}
          style={[styles.refreshBtn, isEmbedded && styles.refreshBtnEmbedded]}
          activeOpacity={0.7}
        >
          <RefreshCw size={17} color={isEmbedded ? '#7C2D12' : '#FFFFFF'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isEmbedded && styles.scrollContentEmbedded]}
        showsVerticalScrollIndicator={false}
      >
        {/* Insecure Chrome Origin Warning (If accessed on 192.168.1.45 instead of localhost) */}
        {isInsecureWebOrigin && (
          <View style={styles.insecureWarningCard}>
            <View style={styles.insecureWarningIcon}>
              <AlertCircle size={20} color="#C2410C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insecureWarningTitle}>Chrome Security Note (Bluetooth Pairing)</Text>
              <Text style={styles.insecureWarningText}>
                Chrome blocks Bluetooth device pairing on HTTP IP addresses ({currentHost}). Open on{' '}
                <Text style={{ fontWeight: '700' }}>http://localhost:8081</Text> to enable 1-Click Bluetooth pairing.
              </Text>
              <TouchableOpacity
                style={styles.insecureWarningBtn}
                onPress={handleSwitchToLocalhost}
                activeOpacity={0.85}
              >
                <ExternalLink size={14} color="#FFFFFF" />
                <Text style={styles.insecureWarningBtnText}>Switch to http://localhost:8081</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Unified Direct Thermal Status & Platform Controls Card */}
        <View style={[styles.heroCard, (btState === 'connected' || iosPrinter) && styles.heroCardActive]}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.heroIconWrap,
                (btState === 'connected' || iosPrinter || Platform.OS === 'android') && styles.heroIconWrapActive,
              ]}
            >
              {Platform.OS === 'web' ? (
                <Bluetooth size={22} color={btState === 'connected' ? '#16A34A' : '#7C2D12'} />
              ) : Platform.OS === 'ios' ? (
                <Printer size={22} color={iosPrinter ? '#16A34A' : '#7C2D12'} />
              ) : (
                <Bluetooth size={22} color="#16A34A" />
              )}
            </View>

            <View style={{ flex: 1, minWidth: 200 }}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>
                  {Platform.OS === 'web'
                    ? 'Bluetooth Thermal Direct (ESC/POS)'
                    : Platform.OS === 'ios'
                    ? (isMr ? 'iOS थर्मल प्रिंटर (थेट प्रिंट)' : 'iOS Thermal Direct Print')
                    : (isMr ? 'Android ब्लूटूथ थर्मल प्रिंटर (थेट प्रिंट)' : 'Android Bluetooth Thermal Direct')}
                </Text>

                <View style={styles.heroStatusPill}>
                  <View style={styles.heroStatusDot} />
                  <Text style={styles.heroStatusText}>
                    {Platform.OS === 'web'
                      ? btState === 'connected'
                        ? `Connected: ${btDevice?.name || 'Printer'}`
                        : 'Web Bluetooth Ready'
                      : Platform.OS === 'ios'
                      ? iosPrinter
                        ? `Connected: ${iosPrinter.name}`
                        : 'AirPrint Ready'
                      : 'Direct ESC/POS Ready'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroSubtitle}>
                {Platform.OS === 'web'
                  ? 'Direct raw ESC/POS printing over Bluetooth (Instant slip, no preview dialog).'
                  : Platform.OS === 'ios'
                  ? (isMr
                    ? 'थर्मल प्रिंटरवरून प्रिव्ह्यू स्क्रीन न येता थेट प्रिंट (Silent Direct Print).'
                    : 'Direct silent thermal printing without AirPrint preview sheets.')
                  : (isMr
                    ? 'थर्मल प्रिंटरवरून प्रिव्ह्यू स्क्रीन न येता थेट प्रिंट (No Preview Dialog).'
                    : 'Direct raw ESC/POS printing over Bluetooth without system preview dialogs.')}
              </Text>
            </View>
          </View>

          {/* Android 3-Step Setup Guidance (Only on Android) */}
          {Platform.OS === 'android' && (
            <View style={styles.androidStepsBox}>
              <Text style={styles.androidStepTitle}>
                {isMr ? '📌 ब्लूटूथ प्रिंटर जोडण्यासाठी ३ सोप्या पायऱ्या:' : '📌 3 Steps to Connect Bluetooth Thermal Printer:'}
              </Text>
              <Text style={styles.androidStepText}>
                {isMr
                  ? '१. फोनच्या Bluetooth मध्ये जाऊन प्रिंटर Pair करा (उदा. POS-80 / POS-58, PIN: 0000 किंवा 1234).\n२. "RawBT ॲप" उघडा आणि त्यात तुमचा ब्लूटूथ प्रिंटर सिलेक्ट करा.\n३. आता "Confirm & Print" वर क्लिक केल्यास थेट प्रिंटरमधून बिल बाहेर येईल!'
                  : '1. Pair your printer (e.g. POS-80 / POS-58, PIN: 0000 or 1234) in Phone Bluetooth Settings.\n2. Open "RawBT Print Service" and select your paired Bluetooth printer.\n3. Tap "Confirm & Print" to print directly with ZERO preview dialogs!'}
              </Text>
            </View>
          )}

          {/* Action Buttons Row */}
          <View style={styles.heroActionsRow}>
            {Platform.OS === 'web' ? (
              btState === 'connected' ? (
                <>
                  <TouchableOpacity
                    style={styles.heroPrimaryBtn}
                    onPress={() => webBluetoothPrinter.testPrint('80mm')}
                    activeOpacity={0.85}
                  >
                    <Printer size={15} color="#FFFFFF" />
                    <Text style={styles.heroPrimaryBtnText}>Direct Test Print (80mm)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heroDisconnectBtn}
                    onPress={handleDisconnectBt}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroDisconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.heroPrimaryBtn,
                    (!isBtSupported && !isInsecureWebOrigin) && styles.heroBtnDisabled,
                  ]}
                  onPress={handleConnectBt}
                  disabled={isConnectingBt}
                  activeOpacity={0.85}
                >
                  {isConnectingBt ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Bluetooth size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.heroPrimaryBtnText}>
                    {isConnectingBt
                      ? 'Connecting to Bluetooth...'
                      : isBtSupported || isInsecureWebOrigin
                      ? '📶 Pair Bluetooth Thermal Printer'
                      : 'Web Bluetooth Not Supported'}
                  </Text>
                </TouchableOpacity>
              )
            ) : Platform.OS === 'ios' ? (
              iosPrinter ? (
                <>
                  <TouchableOpacity
                    style={styles.heroPrimaryBtn}
                    onPress={() => handleTestPrint({ printerName: iosPrinter.name, printerType: 'BLUETOOTH', paperSize: '80mm' } as any)}
                    activeOpacity={0.85}
                  >
                    <Printer size={15} color="#FFFFFF" />
                    <Text style={styles.heroPrimaryBtnText}>{isMr ? 'थेट टेस्ट प्रिंट' : 'Direct Test Print'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heroOutlineBtn}
                    onPress={handleSelectIosPrinter}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroOutlineBtnText}>{isMr ? 'प्रिंटर बदला' : 'Change'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heroDisconnectBtn}
                    onPress={handleClearIosPrinter}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroDisconnectBtnText}>{isMr ? 'काढून टाका' : 'Disconnect'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.heroPrimaryBtn}
                  onPress={handleSelectIosPrinter}
                  activeOpacity={0.85}
                >
                  <Printer size={16} color="#FFFFFF" />
                  <Text style={styles.heroPrimaryBtnText}>
                    {isMr ? '🖨️ iOS थर्मल प्रिंटर निवडा व सेव्ह करा' : '🖨️ Select & Save iOS Thermal Printer'}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              /* Android Actions */
              <>
                <TouchableOpacity
                  style={[styles.heroPrimaryBtn, { backgroundColor: '#1E3A8A' }]}
                  onPress={() => NativePrinterManager.openBluetoothSettings()}
                  activeOpacity={0.85}
                >
                  <Bluetooth size={15} color="#FFFFFF" />
                  <Text style={styles.heroPrimaryBtnText}>
                    {isMr ? '१. फोन ब्लूटूथ' : '1. Phone Bluetooth'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroPrimaryBtn, { backgroundColor: '#D97706' }]}
                  onPress={() => NativePrinterManager.openRawBtAppOrStore()}
                  activeOpacity={0.85}
                >
                  <Download size={15} color="#FFFFFF" />
                  <Text style={styles.heroPrimaryBtnText}>
                    {isMr ? '२. RawBT ॲप' : '2. RawBT App'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroOutlineBtn, { borderColor: '#86EFAC' }]}
                  onPress={() => handleTestPrint({ printerName: 'Android Bluetooth Thermal', printerType: 'BLUETOOTH', paperSize: '80mm' } as any)}
                  activeOpacity={0.85}
                >
                  <Printer size={15} color="#15803D" />
                  <Text style={[styles.heroOutlineBtnText, { color: '#15803D' }]}>
                    {isMr ? 'थेट टेस्ट प्रिंट' : 'Test Print'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Quick Hardware Capability Badges */}
          <View style={styles.heroCapabilitiesRow}>
            <View style={styles.capabilityPill}>
              <Bluetooth size={12} color="#2563EB" />
              <Text style={styles.capabilityPillText}>Bluetooth (PIN 0000/1234)</Text>
            </View>
            <View style={styles.capabilityPill}>
              <Wifi size={12} color="#16A34A" />
              <Text style={styles.capabilityPillText}>Wi-Fi Port 9100</Text>
            </View>
            <View style={styles.capabilityPill}>
              <Usb size={12} color="#D97706" />
              <Text style={styles.capabilityPillText}>USB OTG Direct</Text>
            </View>
          </View>
        </View>

        {/* Configured Printers Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Printer size={20} color="#7C2D12" />
            <Text style={styles.sectionTitle}>{t.configuredPrinters}</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{printers.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => openAddModal()}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t.addPrinterText}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#EA580C" />
          </View>
        ) : printers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Printer size={32} color="#D97706" />
            </View>
            <Text style={styles.emptyTitle}>No Thermal Printers Configured Yet</Text>
            <Text style={styles.emptyText}>{t.noPrintersYet}</Text>

            {/* Quick 1-Tap Preset Buttons */}
            <View style={styles.quickPresetsRow}>
              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={() => openQuickPreset('POS-80')}
                activeOpacity={0.8}
              >
                <Zap size={13} color="#C2410C" />
                <Text style={styles.quickPresetText}>+ POS-80 (3" Bluetooth)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={() => openQuickPreset('POS-58')}
                activeOpacity={0.8}
              >
                <Zap size={13} color="#C2410C" />
                <Text style={styles.quickPresetText}>+ POS-58 (2" Bluetooth)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={() => openQuickPreset('WIFI')}
                activeOpacity={0.8}
              >
                <Wifi size={13} color="#16A34A" />
                <Text style={styles.quickPresetText}>+ Wi-Fi (Port 9100)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          printers.map((p) => {
            const isTestBusy = testPrintingId === p.id;
            return (
              <View key={p.id} style={styles.printerCard}>
                <View style={styles.printerCardTop}>
                  <View
                    style={[
                      styles.printerIconWrap,
                      p.printerType === 'BLUETOOTH'
                        ? { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }
                        : p.printerType === 'NETWORK'
                        ? { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }
                        : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
                    ]}
                  >
                    {p.printerType === 'BLUETOOTH' ? (
                      <Bluetooth size={22} color="#2563EB" />
                    ) : p.printerType === 'NETWORK' ? (
                      <Wifi size={22} color="#16A34A" />
                    ) : (
                      <Usb size={22} color="#D97706" />
                    )}
                  </View>

                  <View style={styles.printerMainInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.printerNameText}>{p.printerName}</Text>
                      <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Ready</Text>
                      </View>
                    </View>

                    <Text style={styles.printerAddressText}>
                      {p.printerType === 'BLUETOOTH'
                        ? `MAC / ID: ${p.macAddress || 'Bluetooth Spooler'}`
                        : p.printerType === 'NETWORK'
                        ? `IP: ${p.ipAddress}:${p.port || 9100}`
                        : `USB: ${p.usbIdentifier || 'Default Device'}`}
                    </Text>
                  </View>

                  <View style={styles.paperBadge}>
                    <Text style={styles.paperBadgeText}>{p.paperSize}</Text>
                  </View>
                </View>

                {/* Badges for Default roles */}
                <View style={styles.defaultBadgesRow}>
                  {p.isDefaultReceipt && (
                    <View style={[styles.defaultBadge, { backgroundColor: '#DCFCE7' }]}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <Text style={[styles.defaultBadgeText, { color: '#15803D' }]}>
                        {t.defaultReceipt}
                      </Text>
                    </View>
                  )}
                  {p.isDefaultKot && (
                    <View style={[styles.defaultBadge, { backgroundColor: '#FEF3C7' }]}>
                      <CheckCircle2 size={12} color="#B45309" />
                      <Text style={[styles.defaultBadgeText, { color: '#B45309' }]}>
                        {t.defaultKot}
                      </Text>
                    </View>
                  )}
                  {p.isDefaultPurchase && (
                    <View style={[styles.defaultBadge, { backgroundColor: '#E0E7FF' }]}>
                      <CheckCircle2 size={12} color="#4338CA" />
                      <Text style={[styles.defaultBadgeText, { color: '#4338CA' }]}>
                        {t.defaultPurchase}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Card Action Buttons */}
                <View style={styles.printerActionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.testPrintBtn]}
                    onPress={() => handleTestPrint(p)}
                    disabled={isTestBusy}
                    activeOpacity={0.8}
                  >
                    {isTestBusy ? (
                      <ActivityIndicator size="small" color="#7C2D12" />
                    ) : (
                      <>
                        <Printer size={14} color="#7C2D12" />
                        <Text style={styles.testPrintBtnText}>{t.testPrint}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {!p.isDefaultReceipt && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => p.id && handleSetDefault(p.id, 'RECEIPT')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnText}>+ Bill Default</Text>
                    </TouchableOpacity>
                  )}

                  {!p.isDefaultKot && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => p.id && handleSetDefault(p.id, 'KOT')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnText}>+ KOT Default</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => openEditModal(p)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => p.id && handleDeletePrinter(p.id)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Discovery & Scan Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <View style={styles.sectionTitleWrap}>
            <Search size={20} color="#7C2D12" />
            <Text style={styles.sectionTitle}>{t.discoverPrinters}</Text>
          </View>
        </View>

        {/* Interface Switcher (Bluetooth / USB / Network) */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, scanType === 'BLUETOOTH' && styles.tabBtnActive]}
            onPress={() => handleScan('BLUETOOTH')}
            activeOpacity={0.8}
          >
            <Bluetooth size={16} color={scanType === 'BLUETOOTH' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabBtnText, scanType === 'BLUETOOTH' && styles.tabBtnTextActive]}>
              {t.bluetooth}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, scanType === 'NETWORK' && styles.tabBtnActive]}
            onPress={() => handleScan('NETWORK')}
            activeOpacity={0.8}
          >
            <Wifi size={16} color={scanType === 'NETWORK' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabBtnText, scanType === 'NETWORK' && styles.tabBtnTextActive]}>
              {t.wifi}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, scanType === 'USB' && styles.tabBtnActive]}
            onPress={() => handleScan('USB')}
            activeOpacity={0.8}
          >
            <Usb size={16} color={scanType === 'USB' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabBtnText, scanType === 'USB' && styles.tabBtnTextActive]}>
              {t.usb}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scan Status & Trigger */}
        <View style={styles.scanTriggerBox}>
          <TouchableOpacity
            style={styles.scanTriggerBtn}
            onPress={() => handleScan(scanType)}
            disabled={scanning}
            activeOpacity={0.85}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Search size={16} color="#FFFFFF" />
                <Text style={styles.scanTriggerBtnText}>
                  {scanning ? 'Searching...' : `Scan & Connect ${scanType === 'BLUETOOTH' ? 'Bluetooth' : scanType === 'NETWORK' ? 'Wi-Fi' : 'USB'} Printers`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.scanTipBox}>
            <Info size={14} color="#64748B" />
            <Text style={styles.scanTipText}>
              {scanType === 'BLUETOOTH'
                ? 'Turn on your Bluetooth printer (PIN: 0000 or 1234). Tap above to pair directly via browser/system Bluetooth.'
                : scanType === 'NETWORK'
                ? 'Ensure your thermal printer is connected to the same Wi-Fi router / local network.'
                : 'Plug the USB cable into your device using a USB-OTG adapter.'}
            </Text>
          </View>
        </View>

        {/* Discovered Devices List */}
        {discoveredDevices.length > 0 ? (
          <View style={styles.discoveredContainer}>
            <Text style={styles.discoveredCountTitle}>
              Found {discoveredDevices.length} device(s):
            </Text>
            {discoveredDevices.map((dev, idx) => (
              <View key={idx} style={styles.discoveredRow}>
                <View style={styles.discoveredInfo}>
                  <Text style={styles.discoveredName}>{dev.name}</Text>
                  <Text style={styles.discoveredAddress}>{dev.address}</Text>
                  {dev.isPrinter && (
                    <Text style={styles.printerVerifiedTag}>Thermal Printer Verified</Text>
                  )}
                </View>

                <View style={styles.discoveredActions}>
                  <TouchableOpacity
                    style={styles.discoveredAddBtn}
                    onPress={() => openAddModal(dev)}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color="#FFFFFF" />
                    <Text style={styles.discoveredAddBtnText}>Connect & Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Add / Edit Printer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit Thermal Printer' : 'Add Thermal Printer'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Configure printer connection and paper settings
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Printer Name */}
              <Text style={styles.inputLabel}>Printer Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Counter Bill Printer, Kitchen KOT"
                value={formName}
                onChangeText={setFormName}
                placeholderTextColor="#94A3B8"
              />

              {/* Interface Type */}
              <Text style={styles.inputLabel}>Connection Interface *</Text>
              <View style={styles.formTypeRow}>
                {(['BLUETOOTH', 'NETWORK', 'USB'] as PrinterInterfaceType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.formTypeBtn, formType === type && styles.formTypeBtnActive]}
                    onPress={() => setFormType(type)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.formTypeBtnText,
                        formType === type && styles.formTypeBtnTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Address Inputs */}
              {formType === 'BLUETOOTH' ? (
                <>
                  <Text style={styles.inputLabel}>Bluetooth MAC / Device Name</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 00:11:22:33:44:55 or POS-80"
                    value={formMac}
                    onChangeText={setFormMac}
                    autoCapitalize="characters"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.inputHelpText}>
                    Tip: If using Web Bluetooth or Android Spooler, leave as default.
                  </Text>
                </>
              ) : formType === 'NETWORK' ? (
                <View style={styles.rowInputs}>
                  <View style={{ flex: 3 }}>
                    <Text style={styles.inputLabel}>IP Address *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="192.168.1.100"
                      value={formIp}
                      onChangeText={setFormIp}
                      keyboardType="numeric"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Port</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="9100"
                      value={formPort}
                      onChangeText={setFormPort}
                      keyboardType="numeric"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>USB Device Identifier / Name</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. USB_THERMAL_POS"
                    value={formUsbId}
                    onChangeText={setFormUsbId}
                    placeholderTextColor="#94A3B8"
                  />
                </>
              )}

              {/* Paper Size */}
              <Text style={styles.inputLabel}>{t.paperSize} *</Text>
              <View style={styles.formTypeRow}>
                {(['58mm', '80mm', 'A4'] as PrinterPaperSize[]).map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.formTypeBtn, formPaperSize === sz && styles.formTypeBtnActive]}
                    onPress={() => setFormPaperSize(sz)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.formTypeBtnText,
                        formPaperSize === sz && styles.formTypeBtnTextActive,
                      ]}
                    >
                      {sz === '58mm' ? '58mm (2")' : sz === '80mm' ? '80mm (3")' : 'A4 Sheet'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Default Purpose Toggles */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Default Assignments</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Default Receipt / Bill Printer</Text>
                  <Text style={styles.switchSubLabel}>Auto-selected for counter invoices</Text>
                </View>
                <Switch
                  value={formIsDefaultReceipt}
                  onValueChange={setFormIsDefaultReceipt}
                  trackColor={{ false: '#CBD5E1', true: '#EA580C' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Default KOT (Kitchen) Printer</Text>
                  <Text style={styles.switchSubLabel}>Auto-selected when sending orders to kitchen</Text>
                </View>
                <Switch
                  value={formIsDefaultKot}
                  onValueChange={setFormIsDefaultKot}
                  trackColor={{ false: '#CBD5E1', true: '#EA580C' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Auto Cut Paper after print</Text>
                  <Text style={styles.switchSubLabel}>Triggers full/partial cutter if supported</Text>
                </View>
                <Switch
                  value={formAutoCut}
                  onValueChange={setFormAutoCut}
                  trackColor={{ false: '#CBD5E1', true: '#EA580C' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Open Cash Drawer (Kick)</Text>
                  <Text style={styles.switchSubLabel}>Sends drawer kick command on bill print</Text>
                </View>
                <Switch
                  value={formOpenDrawer}
                  onValueChange={setFormOpenDrawer}
                  trackColor={{ false: '#CBD5E1', true: '#EA580C' }}
                />
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSavePrinter}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveBtnText}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#161F36' : '#FFFFFF';
  const cardBorder = isDark ? '#2A364F' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#1C1917';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const textMuted = isDark ? '#64748B' : '#A8A29E';
  const dividerColor = isDark ? '#2A364F' : '#F1F5F9';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';
  const subBg = isDark ? '#1E293B' : '#F8FAFC';

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0B0F19' : '#F8FAFC',
  },
  containerEmbedded: {
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: '#7C2D12',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerEmbedded: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 13,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#462B1C',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnEmbedded: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerTitleEmbedded: {
    color: '#302722',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FED7AA',
    marginTop: 2,
    fontWeight: '500',
  },
  headerSubtitleEmbedded: {
    color: '#96877F',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnEmbedded: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContentEmbedded: {
    padding: 0,
    paddingBottom: 24,
  },
  insecureWarningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insecureWarningIcon: {
    marginTop: 2,
  },
  insecureWarningTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  insecureWarningText: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 3,
    lineHeight: 18,
  },
  insecureWarningBtn: {
    marginTop: 10,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  insecureWarningBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#462B1C',
    shadowOpacity: 0.035,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  heroCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconWrapActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#302722',
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  heroStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  heroSubtitle: {
    fontSize: 11.5,
    color: '#96877F',
    marginTop: 3,
    lineHeight: 16,
  },
  androidStepsBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  androidStepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  androidStepText: {
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 17,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C2D12',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minHeight: 38,
  },
  heroPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: cardBg,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 38,
  },
  heroOutlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: textPrimary,
  },
  heroDisconnectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  heroDisconnectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  heroBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  heroCapabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  capabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: cardBorder,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  capabilityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#302722',
  },
  badgeCount: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: cardBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C2D12',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#7C2D12',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loaderBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 13,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#462B1C',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 440,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  quickPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickPresetText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#9A3412',
  },
  printerCard: {
    backgroundColor: cardBg,
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    marginBottom: 12,
    shadowColor: '#462B1C',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  printerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  printerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  printerMainInfo: {
    flex: 1,
  },
  printerNameText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#302722',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  printerAddressText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  paperBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  paperBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: textPrimary,
  },
  defaultBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  printerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: subBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: textPrimary,
  },
  testPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },
  testPrintBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7C2D12',
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#7C2D12',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  scanTriggerBox: {
    marginBottom: 14,
  },
  scanTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C2D12',
    paddingVertical: 11,
    borderRadius: 10,
    shadowColor: '#7C2D12',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  scanTriggerBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  scanTipText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
  },
  discoveredContainer: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 13,
    padding: 14,
    shadowColor: '#462B1C',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  discoveredCountTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#302722',
    marginBottom: 8,
  },
  discoveredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  discoveredInfo: {
    flex: 1,
  },
  discoveredName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#302722',
  },
  discoveredAddress: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  printerVerifiedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  discoveredActions: {
    flexDirection: 'row',
    gap: 6,
  },
  discoveredAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 7,
  },
  discoveredAddBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: cardBg,
    borderRadius: 16,
    maxWidth: 480,
    width: '100%',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: subBg,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#302722',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#96877F',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    color: textSecondary,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: textPrimary,
    marginBottom: 5,
    marginTop: 8,
  },
  inputHelpText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  inputField: {
    backgroundColor: subBg,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: textPrimary,
  },
  formTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  formTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: cardBg,
  },
  formTypeBtnActive: {
    backgroundColor: '#7C2D12',
    borderColor: '#7C2D12',
  },
  formTypeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: textSecondary,
  },
  formTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  switchLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: textPrimary,
  },
  switchSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: subBg,
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: cardBg,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7C2D12',
    alignItems: 'center',
    shadowColor: '#7C2D12',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  });
};
