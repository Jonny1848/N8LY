/**
 * Vertikale Werkzeugleiste rechts (Instagram-Stil): Text, Sticker, Musik, Effekte, Mehr.
 * „Mehr" klappt mit Reanimated auf — enthält Stift, Farbvorschau-Dot und Undo.
 * Der Stift-Button öffnet einen erweiterten Farbwähler als Overlay (StoryColorPickerOverlay).
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  FaceSmileIcon,
  MusicalNoteIcon,
  SparklesIcon,
  ChevronDownIcon,
  PencilIcon,
} from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';
import StoryColorPickerOverlay from './StoryColorPickerOverlay';

/* Reduzierte Höhe: ohne inline HueSlider (Panel ist jetzt im Overlay) */
const MORE_PANEL_MAX_H = 160;

const SPRING_CFG = {
  damping: 18,
  stiffness: 220,
  mass: 0.85,
};

/**
 * @param {{
 *   mode: 'none'|'text'|'sticker'|'draw',
 *   onModeChange: (m: string) => void,
 *   onOpenText: () => void,
 *   strokeColor: string,
 *   onColorChange: (c: string) => void,
 *   onUndo: () => void,
 *   canUndo: boolean,
 *   onOpenEffects?: () => void,
 *   effectsActive?: boolean,
 *   onDismissTextEditor?: () => void,
 * }} props
 */
export default function StoryEditorSidebar({
  mode,
  onModeChange,
  onOpenText,
  strokeColor,
  onColorChange,
  onUndo,
  canUndo,
  onOpenEffects,
  effectsActive,
  onDismissTextEditor,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  /* Steuert die Sichtbarkeit des erweiterten Farbwähler-Overlays */
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(moreOpen ? 1 : 0, SPRING_CFG);
  }, [moreOpen, progress]);

  const morePanelStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.12, 1], [0, 0.9, 1], Extrapolation.CLAMP),
      maxHeight: interpolate(p, [0, 1], [0, MORE_PANEL_MAX_H], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0, 1], [14, 0], Extrapolation.CLAMP) },
        { scale: interpolate(p, [0, 1], [0.88, 1], Extrapolation.CLAMP) },
      ],
      overflow: 'hidden',
    };
  });

  const chevronRotateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  /** Stift-Button Aktiv-Animation */
  const penActive = useSharedValue(0);
  useEffect(() => {
    penActive.value = withTiming(mode === 'draw' ? 1 : 0, { duration: 200 });
  }, [mode, penActive]);

  const penBtnStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(penActive.value, [0, 1], [0, 1]) > 0.5
      ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.3)',
    transform: [{ scale: interpolate(penActive.value, [0, 1], [1, 1.12], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={styles.column}>
      {/* Aa — dunkler Kreis-Backdrop garantiert Sichtbarkeit auf jedem Hintergrund */}
      <Pressable
        onPress={() => {
          if (mode === 'text') {
            onDismissTextEditor?.();
          } else {
            onOpenText();
          }
        }}
        style={[styles.iconBtn, mode === 'text' && styles.iconBtnActive]}
        hitSlop={8}
      >
        <Text style={styles.aa}>Aa</Text>
      </Pressable>

      {/* Sticker */}
      <Pressable
        onPress={() => onModeChange(mode === 'sticker' ? 'none' : 'sticker')}
        style={styles.iconBtn}
        hitSlop={8}
      >
        <FaceSmileIcon size={26} color="#fff" />
      </Pressable>

      {/* Musik (Platzhalter) */}
      <Pressable style={styles.iconBtn} hitSlop={8} onPress={() => undefined} accessibilityLabel="Musik (bald)">
        <MusicalNoteIcon size={26} color="#fff" />
      </Pressable>

      {/* Effekte */}
      <Pressable
        style={styles.iconBtn}
        hitSlop={8}
        onPress={() => onOpenEffects?.()}
        accessibilityLabel="Effekte und Filter"
      >
        <SparklesIcon
          size={26}
          color={effectsActive ? theme.colors.primary.main2 : '#fff'}
        />
      </Pressable>

      {/* „Mehr"-Block: Stift + Farbspektrum + Undo */}
      <Animated.View
        style={[styles.moreOuter, morePanelStyle]}
        pointerEvents={moreOpen ? 'auto' : 'none'}
      >
        <View style={styles.moreBlock}>
          {/* Stift-Button: aktiviert Zeichenmodus + öffnet Farbwähler-Overlay */}
          <Pressable
            onPress={() => {
              if (mode === 'draw') {
                onModeChange('none');
              } else {
                onModeChange('draw');
                setColorPickerOpen(true);
              }
            }}
            hitSlop={8}
          >
            <Animated.View style={[styles.penBtn, penBtnStyle]}>
              <PencilIcon
                size={22}
                color={mode === 'draw' ? theme.colors.primary.main2 : '#fff'}
              />
            </Animated.View>
          </Pressable>

          {/* Farbvorschau-Dot: Tap öffnet den erweiterten Farbwähler */}
          <Pressable onPress={() => setColorPickerOpen(true)} hitSlop={6}>
            <View style={[styles.activeColorPreview, { backgroundColor: strokeColor }]} />
          </Pressable>

          {/* Undo */}
          <Pressable onPress={onUndo} disabled={!canUndo} style={[styles.hit, !canUndo && styles.disabled]}>
            <Text style={styles.undoTxt}>Undo</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Chevron: Mehr auf/zu */}
      <Pressable
        onPress={() => setMoreOpen((v) => !v)}
        style={styles.iconBtn}
        hitSlop={8}
        accessibilityLabel="Mehr Werkzeuge"
      >
        <Animated.View style={chevronRotateStyle}>
          <ChevronDownIcon size={26} color="#fff" />
        </Animated.View>
      </Pressable>

      {/* Erweiterter Farbwähler als Overlay (Panel1 + Hue + Opacity + Swatches) */}
      <StoryColorPickerOverlay
        visible={colorPickerOpen}
        color={strokeColor}
        onColorChange={onColorChange}
        onClose={() => setColorPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: 18,
  },
  /** Dunkler Kreis-Backdrop fuer jeden Icon-Button — garantiert Lesbarkeit auf jedem Hintergrund */
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Leichtes Highlight wenn ein Modus aktiv ist (z. B. Text-Modus) */
  iconBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    transform: [{ scale: 1.06 }],
  },
  hit: { padding: 4 },
  disabled: { opacity: 0.35 },
  aa: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moreOuter: {
    alignItems: 'center',
    width: '100%',
  },
  moreBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  /** Stift-Button: gleiche Groesse wie iconBtn, Hintergrund wird per Animation gesteuert */
  penBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Kleine runde Vorschau der aktuellen Stiftfarbe — Tap oeffnet das Picker-Overlay */
  activeColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#fff',
    /* Subtiler Schatten damit der Dot auch auf weissem Hintergrund sichtbar bleibt */
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  undoTxt: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
