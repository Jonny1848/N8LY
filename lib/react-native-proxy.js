/**
 * Ersatz-Entry fuer `import … from 'react-native'` (nur wenn Metro diesen Proxy statt des Barrels aufloest).
 *
 * Hintergrund NativeWind v4: Aus dem oeffentlichen `react-native`-Export kann sich ein StyleSheet
 * ohne `.create` einklinken → "Cannot read property 'create' of undefined" bei `StyleSheet.create`.
 * Das echte API-Objekt kommt aus `Libraries/StyleSheet/StyleSheet` und besitzt `.create`, `absoluteFill`, …
 *
 * WICHTIG: Hier KEIN bare `require('react-native')` — sonst Zirkel mit diesem Proxy. Daher relative
 * Pfade zu `node_modules` (Standard-Expo-Layout unter dem Projektroot).
 */
'use strict';

const RealReactNative = require('../node_modules/react-native/index.js');
// RN 0.81: `StyleSheet.js` is ESM `export default` → Metro `require` yields `{ default: api }`.
// Ohne `.default` waere `StyleSheet.create` undefined (Terminal: StyleSheet.create is not a function).
const StyleSheetModule = require('../node_modules/react-native/Libraries/StyleSheet/StyleSheet');
const RealStyleSheet = StyleSheetModule.default ?? StyleSheetModule;

module.exports = new Proxy(RealReactNative, {
  get(target, prop, receiver) {
    if (prop === 'StyleSheet') {
      return RealStyleSheet;
    }
    return Reflect.get(target, prop, receiver);
  },
});
