/**
 * polyfillExpo.ts
 * Must be the VERY FIRST import in index.js / App.tsx.
 *
 * Patches two things:
 *  1. globalThis.expo.modules.ExpoAsset  — runtime proxy
 *  2. TurboModuleRegistry.get / requireNativeModule — intercepts
 *     any attempt to load 'ExpoAsset' so it never reaches the
 *     missing native side and throws.
 */

const g = (typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
  ? window
  : {}) as any;

// ─── 0. Suppress React 18 / React Native Web DOM event warnings in browser console ──
if (typeof console !== 'undefined') {
  const isIgnored = (args: any[]): boolean => {
    try {
      const text = args
        .map((a) => (typeof a === 'string' ? a : (a && (a.message || (typeof a.toString === 'function' ? a.toString() : ''))) || ''))
        .join(' ');
      return (
        text.includes('onStartShouldSetResponder') ||
        text.includes('onResponderTerminationRequest') ||
        text.includes('onResponderGrant') ||
        text.includes('onResponderMove') ||
        text.includes('onResponderRelease') ||
        text.includes('onResponderTerminate') ||
        text.includes('Cannot record touch end without a touch start') ||
        text.includes('transform-origin') ||
        text.includes('fetch offline')
      );
    } catch {
      return false;
    }
  };

  const origError = console.error;
  console.error = function (...args: any[]) {
    if (isIgnored(args)) return;
    return origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (isIgnored(args)) return;
    return origWarn.apply(console, args);
  };
}

// ─── Safe stub objects ────────────────────────────────────────────────────────

class SafeEventEmitter {
  addListener() { return { remove: () => {} }; }
  removeListener() {}
  emit() {}
  removeAllListeners() {}
}

const safeExpoAsset = {
  downloadAsync: async (url: string) => url,
  fromModule: (mod: any) => ({ uri: mod, localUri: mod, downloaded: true, downloadAsync: async () => ({}) }),
  loadAsync: async () => [],
};

// ─── 1. TurboModuleRegistry patch (intercept requireNativeModule) ─────────────
try {
  const { TurboModuleRegistry } = require('react-native');
  if (TurboModuleRegistry) {
    const _originalGet = TurboModuleRegistry.get?.bind(TurboModuleRegistry);
    const _originalGetEnforcing = TurboModuleRegistry.getEnforcing?.bind(TurboModuleRegistry);

    TurboModuleRegistry.get = (name: string) => {
      if (name === 'ExpoAsset') return safeExpoAsset;
      try {
        return _originalGet ? _originalGet(name) : null;
      } catch (_e) { return null; }
    };

    TurboModuleRegistry.getEnforcing = (name: string) => {
      if (name === 'ExpoAsset') return safeExpoAsset;
      try {
        return _originalGetEnforcing ? _originalGetEnforcing(name) : safeExpoAsset;
      } catch (_e) { return safeExpoAsset; }
    };
  }
} catch (_e) {}

// Also patch global requireNativeModule if it exists (older Expo Go versions)
try {
  if (typeof (g as any).requireNativeModule === 'function') {
    const _orig = (g as any).requireNativeModule;
    (g as any).requireNativeModule = (name: string) => {
      if (name === 'ExpoAsset') return safeExpoAsset;
      return _orig(name);
    };
  }
} catch (_e) {}

// ─── 2. globalThis.expo.modules.ExpoAsset patch ───────────────────────────────

if (!g.expo) {
  try {
    const { TurboModuleRegistry } = require('react-native');
    TurboModuleRegistry?.get?.('ExpoModulesCore')?.installModules?.();
  } catch (_e) {}
}

if (!g.expo) {
  g.expo = {
    EventEmitter: SafeEventEmitter,
    NativeModule: class SafeNativeModule {},
    SharedObject: class SafeSharedObject {},
    SharedRef: class SafeSharedRef {},
    modules: { ExpoAsset: safeExpoAsset },
    getViewConfig: () => ({}),
    reloadAppAsync: async () => {},
  };
} else {
  if (!g.expo.EventEmitter) g.expo.EventEmitter = SafeEventEmitter;
  if (!g.expo.NativeModule) g.expo.NativeModule = class SafeNativeModule {};
  if (!g.expo.SharedObject) g.expo.SharedObject = class SafeSharedObject {};
  if (!g.expo.SharedRef) g.expo.SharedRef = class SafeSharedRef {};
  if (!g.expo.modules) g.expo.modules = {};
}

// Ensure ExpoAsset is always available even if g.expo.modules is sealed/frozen
try {
  if (g.expo?.modules) {
    try {
      g.expo.modules.ExpoAsset = g.expo.modules.ExpoAsset || safeExpoAsset;
    } catch (_e1) {}

    const baseModules = g.expo.modules;
    const modulesProxy = new Proxy(baseModules, {
      get(target: any, prop: string | symbol) {
        if (prop === 'ExpoAsset') return target.ExpoAsset || safeExpoAsset;
        return target[prop];
      },
      has(target: any, prop: string | symbol) {
        if (prop === 'ExpoAsset') return true;
        return prop in target;
      },
    });

    try {
      g.expo.modules = modulesProxy;
    } catch (_e2) {
      const origExpo = g.expo;
      g.expo = new Proxy(origExpo, {
        get(target: any, prop: string | symbol) {
          if (prop === 'modules') return modulesProxy;
          return target[prop];
        },
      });
    }
  }
} catch (_e) {}

// ─── 3. Enforce consistent uniform typography across all screens in Native ──
try {
  const { Text, TextInput, Platform } = require('react-native');
  const APP_FONT_FAMILY = Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  });

  if (Text) {
    if ((Text as any).defaultProps == null) {
      (Text as any).defaultProps = {};
    }
    (Text as any).defaultProps.style = [{ fontFamily: APP_FONT_FAMILY }, (Text as any).defaultProps.style];
  }

  if (TextInput) {
    if ((TextInput as any).defaultProps == null) {
      (TextInput as any).defaultProps = {};
    }
    (TextInput as any).defaultProps.style = [{ fontFamily: APP_FONT_FAMILY }, (TextInput as any).defaultProps.style];
  }
} catch (_e) {}

export default g.expo;
