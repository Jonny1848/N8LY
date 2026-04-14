/**
 * Fullscreen-Overlay mit erweitertem Farbwähler (Bottom-Sheet-Stil).
 * Enthält Panel1 (Sättigung × Helligkeit), HueSlider, OpacitySlider,
 * Schnellauswahl-Swatches und eine Textvorschau des Farbwerts.
 *
 * Wird aus der StoryEditorSidebar geöffnet, wenn der Stift-Button gedrückt wird.
 */
import { useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import ColorPicker, {
  Panel1,
  HueSlider,
  OpacitySlider,
  Swatches,
  PreviewText,
} from 'reanimated-color-picker';
import { CheckIcon } from 'react-native-heroicons/solid';

/* Vordefinierte Farben für schnellen Zugriff (Instagram-Palette) */
const SWATCH_COLORS = [
  '#ffffff',
  '#000000',
  '#ff3040',
  '#ffdc00',
  '#4cd964',
  '#5856d6',
];

/**
 * @param {{
 *   visible: boolean,
 *   color: string,
 *   onColorChange: (hex: string) => void,
 *   onClose: () => void,
 * }} props
 */
export default function StoryColorPickerOverlay({
  visible,
  color,
  onColorChange,
  onClose,
}) {
  const insets = useSafeAreaInsets();

  /* Shared-Value für potenzielle UI-Thread-Vorschau (z. B. Hintergrundfarbe) */
  const currentColor = useSharedValue(color);

  /* Worklet: läuft auf dem UI-Thread bei jeder Farbänderung */
  const onPickerChange = useCallback(
    (c) => {
      'worklet';
      currentColor.value = c.hex;
    },
    [currentColor],
  );

  /* JS-Thread: übergibt den finalen Farbwert an den Parent */
  const onPickerComplete = useCallback(
    (c) => {
      onColorChange(c.hex);
    },
    [onColorChange],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Dunkler Backdrop — Tap schliesst das Overlay */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Karte am unteren Bildschirmrand */}
        <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
          {/* Header mit Titel und Fertig-Button */}
          <View style={styles.header}>
            <Text style={styles.title}>Farbe wählen</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.doneBtn}
              accessibilityRole="button"
              accessibilityLabel="Fertig"
            >
              <CheckIcon size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Reanimated Color Picker mit Panel1, Hue, Opacity und Swatches */}
          <ColorPicker
            value={color}
            sliderThickness={25}
            thumbSize={24}
            thumbShape="circle"
            onChange={onPickerChange}
            onCompleteJS={onPickerComplete}
            style={styles.picker}
            boundedThumb
          >
            {/* Quadratisches Feld: X-Achse = Sättigung, Y-Achse = Helligkeit */}
            <Panel1 style={styles.panel} />

            {/* Farbton-Slider (Regenbogen) */}
            <HueSlider style={styles.slider} />

            {/* Deckkraft-Slider */}
            <OpacitySlider style={styles.slider} />

            {/* Schnellauswahl-Farbdots */}
            <Swatches
              style={styles.swatches}
              swatchStyle={styles.swatch}
              colors={SWATCH_COLORS}
            />

            {/* Aktuelle Farbe als Text (hwba-Format) */}
            <PreviewText style={styles.previewText} colorFormat="hwba" />
          </ColorPicker>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Arial',
  },
  doneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    gap: 16,
  },
  /* Panel1: Quadratisches Sättigungs-/Helligkeitsfeld */
  panel: {
    height: 180,
    borderRadius: 12,
  },
  /* Horizontale Slider (Hue + Opacity) */
  slider: {
    height: 25,
    borderRadius: 12,
  },
  /* Swatch-Reihe */
  swatches: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  /* Farbwert-Text unter den Swatches */
  previewText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Arial',
    textAlign: 'center',
    marginTop: 4,
  },
});
