import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { IndustryProvider } from './src/context/IndustryContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { BranchProvider } from './src/context/BranchContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Suppress development connection warnings & LogBox banners from interrupting app UI on phone
LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  'Disconnected from Metro',
  'Bundle Splitting',
  'values(): Iterator<T>',
]);

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Crash Error Caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App encountered an issue</Text>
          <Text style={styles.errorSub}>Details below:</Text>
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorMsg}>{this.state.error?.toString()}</Text>
            <Text style={styles.errorStack}>{this.state.errorInfo?.componentStack}</Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <Text style={styles.retryText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Global uncaught error handler
const gAny = globalThis as any;
if (typeof gAny.ErrorUtils !== 'undefined') {
  const origHandler = gAny.ErrorUtils.getGlobalHandler();
  gAny.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('GLOBAL_EXCEPTION_LOGGED:', error?.message, error?.stack);
    if (origHandler) {
      origHandler(error, isFatal);
    }
  });
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthProvider>
            <IndustryProvider>
              <LanguageProvider>
                <BranchProvider>
                  <AppNavigator />
                  <StatusBar style="light" />
                </BranchProvider>
              </LanguageProvider>
            </IndustryProvider>
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    padding: 24,
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C2D12',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  errorBox: {
    maxHeight: 300,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  errorMsg: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  errorStack: {
    color: '#4B5563',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  retryBtn: {
    backgroundColor: '#7C2D12',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
