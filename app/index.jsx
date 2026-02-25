import { StyleSheet, View, ActivityIndicator, Image } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import 'react-native-url-polyfill/auto';
import { theme } from '../constants/theme';
import { useGeneralStore } from './store/generalStore';

/**
 * Intro/LogoScreen – Logo einblenden, dann Übergang.
 * Navigiert NICHT zu /login – _layout übernimmt das Routing nach Auth-Check.
 */
export default function LogoScreen() {
  const { setIntroCompleted } = useGeneralStore();
  const hasCompletedRef = useRef(false);
  const [showLoading, setShowLoading] = useState(false);

  const handleIntroComplete = () => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      console.log('[INTRO] Intro abgeschlossen – _layout übernimmt Routing');
      setIntroCompleted(true);
      setShowLoading(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleIntroComplete, 3000); // Logo 1,5s anzeigen
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {showLoading ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : (
        <Image
          source={require("../assets/N8LY9.png")}
          style={styles.logo}
          resizeMode="fill"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  logo: {
    width: 160,
    height: 160,
  },
  loadingOverlay: {
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
});
