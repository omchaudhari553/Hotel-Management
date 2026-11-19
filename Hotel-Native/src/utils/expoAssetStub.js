/**
 * expoAssetStub.js
 * Safe no-op replacement for expo-asset that prevents the
 * "Cannot find native module 'ExpoAsset'" crash in Expo Go.
 *
 * All APIs that the app or any expo package might call are stubbed out
 * so they simply succeed without touching any native module.
 */

'use strict';

// --- Asset class stub ---
function Asset(opts) {
  this.uri = (opts && opts.uri) || null;
  this.localUri = (opts && opts.uri) || null;
  this.width = (opts && opts.width) || 0;
  this.height = (opts && opts.height) || 0;
  this.name = (opts && opts.name) || '';
  this.type = (opts && opts.type) || '';
  this.downloaded = true;
}

Asset.fromModule = function (module) {
  return new Asset({ uri: typeof module === 'string' ? module : '' });
};

Asset.fromURI = function (uri) {
  return new Asset({ uri: uri });
};

Asset.loadAsync = async function () {
  return [];
};

Asset.prototype.downloadAsync = async function () {
  return this;
};

// --- module-level helpers ---
function fromModule(module) {
  return Asset.fromModule(module);
}

function fromURI(uri) {
  return Asset.fromURI(uri);
}

async function loadAsync() {
  return [];
}

// CommonJS exports (what most imports expect)
module.exports = {
  Asset,
  fromModule,
  fromURI,
  loadAsync,
  default: { Asset, fromModule, fromURI, loadAsync },
};

