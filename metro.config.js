// Metro: NativeWind v4 (global.css) + Fix fuer RN-Barrel-StyleSheet (siehe lib/react-native-proxy.js)
const path = require("path");
const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const nativeWindConfig = withNativeWind(config, { input: "./global.css" });

// Wenn `expo start` / Metro scheinbar nichts tut: oft blockiert oder kaputt angemeldetes Watchman.
// Mit EXPO_NO_WATCHMAN=1 nutzt Metro den langsameren Node-Dateicrawler statt Watchman (stabil).
// Danach optional Watchman reparieren: `watchman shutdown-server` (oder Homebrew-Reinstall).
if (process.env.EXPO_NO_WATCHMAN === "1") {
  nativeWindConfig.resolver = {
    ...nativeWindConfig.resolver,
    useWatchman: false,
  };
}

const proxyPath = path.resolve(__dirname, "lib/react-native-proxy.js");
const origResolveRequest = nativeWindConfig.resolver.resolveRequest;

/**
 * Auf iOS/Android: `react-native` auf unseren Proxy legen (nur echtes StyleSheet durchreichen).
 * Auf Web: unveraendert lassen (Expo nutzt typischerweise react-native-web).
 */
nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const isWeb = platform === "web";
  const loadedFromProxy =
    context.originModulePath?.includes("react-native-proxy.js") ?? false;

  if (!isWeb && moduleName === "react-native" && !loadedFromProxy) {
    return { type: "sourceFile", filePath: proxyPath };
  }
  if (origResolveRequest) {
    return origResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = nativeWindConfig;
