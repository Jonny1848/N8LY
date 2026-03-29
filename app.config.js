/**
 * Expo App-Konfiguration – dynamisch statt statisches app.json
 *
 * Liest sensible Tokens aus .env-Datei (wird von Expo CLI automatisch geladen).
 * So landen keine Secrets im Git-Repository.
 *
 * Hinweis: Expo SDK 49+ laedt .env-Dateien automatisch bevor diese Datei
 * ausgewertet wird, daher funktioniert process.env.* hier direkt.
 */
export default {
  expo: {
    scheme: "n8tly",
    name: "N8TLY_App",
    slug: "N8TLY_App",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/N8LY9.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,

    // Splash Screen Konfiguration
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    // iOS-spezifische Einstellungen
    ios: {
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Diese App benötigt deinen Standort, um Events in deiner Nähe anzuzeigen.",
        ITSAppUsesNonExemptEncryption: false,
      },
      usesAppleSignIn: true,
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.n8tlyapp",
      associatedDomains: ["applinks:n8tly.app"],
    },

    // Android-spezifische Einstellungen
    android: {
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
      package: "com.anonymous.n8tlyapp",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "n8tly",
              host: "auth",
              pathPrefix: "/callback",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },

    // Web-Bundler
    web: {
      bundler: "metro",
    },

    // Plugins (Mapbox, Auth, Router etc.)
    plugins: [
      // iOS: fmt-Pod mit neuerem Xcode/Clang (consteval-Fehler in format-inl.h umgehen)
      "./plugins/withFmtPodConstevalFix.js",
      "expo-apple-authentication",
      "expo-router",
      "expo-video",
      [
        "expo-audio",
        {
          // iOS Mikrofon-Permission fuer Sprachnachrichten
          microphonePermission:
            "N8TLY benoetigt Zugriff auf dein Mikrofon fuer Sprachnachrichten.",
        },
      ],
      [
        "expo-contacts",
        {
          contactsPermission:
            "N8TLY benoetigt Zugriff auf deine Kontakte fuer den Kontakt-Teilen-Dialog.",
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
        },
      ],
      "expo-font",
    ],

    // Extra-Daten: Tokens aus Umgebungsvariablen lesen (NICHT hardcoden!)
    extra: {
      MAPBOX_PUBLIC_TOKEN: process.env.MAPBOX_PUBLIC_TOKEN,
      router: {},
      eas: {
        projectId: "c91253ed-f61e-4bf6-a3ea-e2b57d559545",
      },
    },
  },
};
