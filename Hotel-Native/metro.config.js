// metro.config.js — Expo SDK 58 / React Native 0.88
// Resolves the "Cannot find native module 'ExpoAsset'" crash in Expo Go
// by redirecting expo-asset to a safe stub at bundle time.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Stub path ────────────────────────────────────────────────────────────────
// We write a lightweight stub so Metro never loads the real expo-asset
// (which calls requireNativeModule('ExpoAsset') and crashes Expo Go).
const EXPO_ASSET_STUB = path.resolve(__dirname, 'src/utils/expoAssetStub.js');

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'expo-asset': EXPO_ASSET_STUB,
};

// Also resolve any deep import of expo-asset/build/* to our stub
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'expo-asset' ||
    moduleName.startsWith('expo-asset/') ||
    moduleName.includes('/expo-asset/')
  ) {
    return { filePath: EXPO_ASSET_STUB, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

