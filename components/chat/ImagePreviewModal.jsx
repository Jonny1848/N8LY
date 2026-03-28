/**
 * ImagePreviewModal – Vollbild-Vorschau fuer Chat-Bilder
 */
import { useState, useEffect } from 'react';
import { Modal, View, Pressable, useWindowDimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';

/** Gleiche Rundung wie die Bild-Bubble in ChatBubble */
const RADIUS = 12;

export default function ImagePreviewModal({ visible, imageUri, onClose }) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Echtes Seitenverhaeltnis des Bildes – 4:3 als Fallback bis onLoad feuert
  const [ratio, setRatio] = useState(4 / 3);

  // Ratio zuruecksetzen bei neuem Bild (verhindert Flicker vom vorherigen Wert)
  useEffect(() => { setRatio(4 / 3); }, [imageUri]);

  // Rahmen: so gross wie moeglich, mit minimalem Rand fuer den Dismiss-Tap drumherum
  const maxW = screenW - 24;
  const maxH = screenH * 0.78;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <StatusBar style="dark" />

      <View className="flex-1">
        {/* Blur-Hintergrund – nur visuell, kein Touch (pointerEvents none) */}
        <BlurView
          pointerEvents="none"
          intensity={70}
          tint="light"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Ganzer Bildschirm: Tap schliesst die Vorschau */}
        <Pressable
          className="absolute top-0 bottom-0 left-0 right-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Vorschau schliessen"
        />

        {/* Bild zentriert; box-none laesst Taps neben dem Bild zur Pressable durch */}
        <View
          className="absolute top-0 bottom-0 left-0 right-0 justify-center items-center"
          pointerEvents="box-none"
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              cachePolicy="disk"
              contentFit="cover"
              onLoad={(e) => {
                const { width: iw, height: ih } = e.source;
                if (iw && ih) setRatio(iw / ih);
              }}
              style={{
                width: w,
                height: h,
                borderRadius: RADIUS,
                ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' } : {}),
              }}
              accessibilityLabel="Vergrössertes Chat-Bild"
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
