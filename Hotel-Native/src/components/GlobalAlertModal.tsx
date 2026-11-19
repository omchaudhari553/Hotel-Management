import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Alert as RNAlert,
  Platform,
  StatusBar,
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface GlobalAlertData {
  id: string;
  title: string;
  message?: string;
  buttonText?: string;
  onPress?: () => void;
  type: AlertType;
  duration?: number;
}

type AlertListener = (alert: GlobalAlertData | null) => void;
let currentListener: AlertListener | null = null;
let activeAlertTimer: any = null;

export const globalAlertManager = {
  show: (
    title: string,
    message?: string,
    button?: { text?: string; onPress?: () => void; style?: string },
    explicitType?: AlertType,
    durationMs: number = 2000
  ) => {
    if (activeAlertTimer) {
      clearTimeout(activeAlertTimer);
      activeAlertTimer = null;
    }

    const inferType = (): AlertType => {
      if (explicitType) return explicitType;
      const combined = `${title || ''} ${message || ''}`.toLowerCase();
      if (
        combined.includes('success') ||
        combined.includes('settled') ||
        combined.includes('paid') ||
        combined.includes('saved') ||
        combined.includes('created') ||
        combined.includes('updated') ||
        combined.includes('यशस्वी') ||
        combined.includes('सफल')
      ) {
        return 'success';
      }
      if (
        combined.includes('fail') ||
        combined.includes('error') ||
        combined.includes('cannot') ||
        combined.includes('unable') ||
        combined.includes('त्रुटी') ||
        combined.includes('त्रुटि')
      ) {
        return 'error';
      }
      if (
        combined.includes('warn') ||
        combined.includes('attention') ||
        combined.includes('invalid') ||
        combined.includes('required') ||
        combined.includes('please')
      ) {
        return 'warning';
      }
      return 'info';
    };

    const type = inferType();
    const data: GlobalAlertData = {
      id: Math.random().toString(36).slice(2),
      title: title || 'Notice',
      message: message || '',
      buttonText: button?.text || 'OK',
      onPress: button?.onPress,
      type,
      duration: durationMs,
    };

    if (currentListener) {
      currentListener(data);
    }
  },

  dismiss: () => {
    if (activeAlertTimer) {
      clearTimeout(activeAlertTimer);
      activeAlertTimer = null;
    }
    if (currentListener) {
      currentListener(null);
    }
  },
};

// Polyfill react-native's Alert.alert globally for single-button OK alerts
const originalAlert = RNAlert.alert;
(RNAlert as any).__originalAlert = originalAlert;

RNAlert.alert = (
  title: string,
  message?: string,
  buttons?: Array<{ text?: string; onPress?: () => void; style?: any }>,
  options?: any
) => {
  // If there are 2 or more buttons (e.g. Cancel & Delete/Confirm), keep native OS dialog for safety
  if (buttons && buttons.length > 1) {
    return originalAlert(title, message, buttons, options);
  }

  // Single button or default "OK" alert -> Show 2-second auto-closing popup
  const singleButton = buttons && buttons.length === 1 ? buttons[0] : { text: 'OK' };
  globalAlertManager.show(title, message, singleButton, undefined, 2000);
};

export const GlobalAlertModal: React.FC = () => {
  const [alertData, setAlertData] = useState<GlobalAlertData | null>(null);
  const alertDataRef = useRef<GlobalAlertData | null>(null);
  const isClosingRef = useRef<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-35)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const closeAlert = useCallback(() => {
    const currentAlert = alertDataRef.current;
    if (!currentAlert || isClosingRef.current) return;
    isClosingRef.current = true;

    if (activeAlertTimer) {
      clearTimeout(activeAlertTimer);
      activeAlertTimer = null;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -35,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      alertDataRef.current = null;
      isClosingRef.current = false;
      setAlertData(null);
      if (currentAlert.onPress) {
        try {
          currentAlert.onPress();
        } catch (e) {
          console.error('Error executing alert onPress:', e);
        }
      }
    });
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    currentListener = (data) => {
      if (activeAlertTimer) {
        clearTimeout(activeAlertTimer);
        activeAlertTimer = null;
      }

      if (!data) {
        alertDataRef.current = null;
        isClosingRef.current = false;
        setAlertData(null);
        return;
      }

      alertDataRef.current = data;
      isClosingRef.current = false;
      setAlertData(data);

      fadeAnim.setValue(0);
      slideAnim.setValue(-35);
      progressAnim.setValue(1);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: data.duration || 2000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start();

      activeAlertTimer = setTimeout(() => {
        closeAlert();
      }, data.duration || 2000);
    };

    return () => {
      currentListener = null;
      if (activeAlertTimer) {
        clearTimeout(activeAlertTimer);
        activeAlertTimer = null;
      }
    };
  }, [closeAlert, fadeAnim, slideAnim, progressAnim]);

  if (!alertData) return null;

  const getIcon = () => {
    switch (alertData.type) {
      case 'success':
        return (
          <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
            <CheckCircle2 size={18} color="#059669" />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.iconWrap, styles.iconWrapError]}>
            <AlertCircle size={18} color="#DC2626" />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconWrap, styles.iconWrapWarning]}>
            <AlertTriangle size={18} color="#D97706" />
          </View>
        );
      case 'info':
      default:
        return (
          <View style={[styles.iconWrap, styles.iconWrapInfo]}>
            <Info size={18} color="#2563EB" />
          </View>
        );
    }
  };

  const getBorderColor = () => {
    switch (alertData.type) {
      case 'success':
        return '#86EFAC';
      case 'error':
        return '#FECACA';
      case 'warning':
        return '#FDE68A';
      case 'info':
      default:
        return '#BFDBFE';
    }
  };

  const getTimerBarColor = () => {
    switch (alertData.type) {
      case 'error':
        return '#DC2626';
      case 'warning':
        return '#D97706';
      case 'info':
        return '#2563EB';
      case 'success':
      default:
        return '#059669';
    }
  };

  return (
    <Modal
      transparent
      visible={Boolean(alertData)}
      animationType="none"
      onRequestClose={closeAlert}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={closeAlert}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: getBorderColor(),
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cardContent}
            activeOpacity={0.85}
            onPress={closeAlert}
          >
            {getIcon()}
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>
                {alertData.title}
              </Text>
              {Boolean(alertData.message) && (
                <Text style={styles.messageText} numberOfLines={2}>
                  {alertData.message}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Shrinking 2s bottom timer bar */}
          <View style={styles.timerTrack}>
            <Animated.View
              style={[
                styles.timerFill,
                {
                  backgroundColor: getTimerBarColor(),
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const topPadding = Platform.OS === 'android'
  ? (StatusBar.currentHeight ? StatusBar.currentHeight + 14 : 44)
  : 54;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: topPadding,
    paddingHorizontal: 16,
  },
  card: {
    alignSelf: 'center',
    minWidth: 190,
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  iconWrapError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  iconWrapWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  iconWrapInfo: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  textContainer: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  messageText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  timerTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    width: '100%',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
  },
});
