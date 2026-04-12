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
    scheme: "N8LY",
    name: "N8LY",
    slug: "N8LY",
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
      bundleIdentifier: "com.anonymous.N8LYapp",
      associatedDomains: ["applinks:N8LY.app"],
    },

    // Android-spezifische Einstellungen
    android: {
      // Fenster verkleinert sich bei geoeffneter Tastatur (adjustResize) — wichtig damit die Chat-Eingabe
      // nicht unter der Tastatur liegt; passt zu KeyboardAvoidingView nur auf iOS im Chat-Screen.
      softwareKeyboardLayoutMode: "resize",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
      package: "com.anonymous.N8LYapp",
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
              scheme: "N8LY",
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
            "N8LY benoetigt Zugriff auf dein Mikrofon fuer Sprachnachrichten.",
        },
      ],
      [
        "expo-contacts",
        {
          contactsPermission:
            "N8LY benoetigt Zugriff auf deine Kontakte fuer den Kontakt-Teilen-Dialog.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "N8LY benoetigt die Kamera, um Fotos und Videos fuer deine Story aufzunehmen.",
          microphonePermission:
            "N8LY benoetigt das Mikrofon fuer Video-Stories.",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-media-library",
        {
          photosPermission:
            "N8LY zeigt dein zuletzt aufgenommenes Foto als Galerie-Vorschau für Stories.",
          savePhotosPermission:
            "N8LY kann optional Aufnahmen in deiner Mediathek speichern.",
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
