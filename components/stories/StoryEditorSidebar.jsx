/**
 * Vertikale Werkzeugleiste rechts (Instagram-Stil): Text, Sticker, Musik, Effekte, Mehr.
 * „Mehr" klappt mit Reanimated auf — enthält Stift, Farbspektrum-Slider und Undo.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import ColorPicker, { HueSlider } from 'reanimated-color-picker';
import {
  FaceSmileIcon,
  MusicalNoteIcon,
  SparklesIcon,
  ChevronDownIcon,
  PencilIcon,
} from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';

const MORE_PANEL_MAX_H = 300;

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
      ? 'rgba(255,255,255,0.2)' : 'transparent',
    transform: [{ scale: interpolate(penActive.value, [0, 1], [1, 1.12], Extrapolation.CLAMP) }],
  }));

  /** Color Picker: nimmt Farbwechsel entgegen */
  const handleColorComplete = useCallback(({ hex }) => {
    onColorChange(hex);
  }, [onColorChange]);

  return (
    <View style={styles.column}>
      {/* Aa */}
      <Pressable
        onPress={() => {
          if (mode === 'text') {
            onDismissTextEditor?.();
          } else {
            onOpenText();
          }
        }}
        style={styles.hit}
        hitSlop={8}
      >
        <Text style={[styles.aa, mode === 'text' && styles.aaActive]}>Aa</Text>
      </Pressable>

      {/* Sticker */}
      <Pressable
        onPress={() => onModeChange(mode === 'sticker' ? 'none' : 'sticker')}
        style={styles.hit}
        hitSlop={8}
      >
        <FaceSmileIcon size={28} color="#fff" style={styles.iconShadow} />
      </Pressable>

      {/* Musik (Platzhalter) */}
      <Pressable style={styles.hit} hitSlop={8} onPress={() => undefined} accessibilityLabel="Musik (bald)">
        <MusicalNoteIcon size={28} color="#fff" style={styles.iconShadow} />
      </Pressable>

      {/* Effekte */}
      <Pressable
        style={styles.hit}
        hitSlop={8}
        onPress={() => onOpenEffects?.()}
        accessibilityLabel="Effekte und Filter"
      >
        <SparklesIcon
          size={28}
          color={effectsActive ? theme.colors.primary.main2 : '#fff'}
          style={styles.iconShadow}
        />
      </Pressable>

      {/* „Mehr"-Block: Stift + Farbspektrum + Undo */}
      <Animated.View
        style={[styles.moreOuter, morePanelStyle]}
        pointerEvents={moreOpen ? 'auto' : 'none'}
      >
        <View style={styles.moreBlock}>
          {/* Stift-Button mit Animierung */}
          <Pressable
            onPress={() => onModeChange(mode === 'draw' ? 'none' : 'draw')}
            hitSlop={8}
          >
            <Animated.View style={[styles.penBtn, penBtnStyle]}>
              <PencilIcon
                size={24}
                color={mode === 'draw' ? theme.colors.primary.main2 : '#fff'}
                style={styles.iconShadow}
              />
            </Animated.View>
          </Pressable>

          {/* Aktive Farbvorschau */}
          <View style={[styles.activeColorPreview, { backgroundColor: strokeColor }]} />

          {/* Farbspektrum-Slider (Hue) statt 6 Farbpunkte */}
          <View style={styles.hueSliderWrap}>
            <ColorPicker
              value={strokeColor}
              onCompleteJS={handleColorComplete}
              style={styles.colorPickerContainer}
            >
              <HueSlider
                vertical
                style={styles.hueSlider}
                thumbShape="circle"
                thumbSize={18}
                thumbColor="#fff"
                sliderThickness={14}
              />
            </ColorPicker>
          </View>

          {/* Undo */}
          <Pressable onPress={onUndo} disabled={!canUndo} style={[styles.hit, !canUndo && styles.disabled]}>
            <Text style={styles.undoTxt}>Undo</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Chevron: Mehr auf/zu */}
      <Pressable
        onPress={() => setMoreOpen((v) => !v)}
        style={styles.hit}
        hitSlop={8}
        accessibilityLabel="Mehr Werkzeuge"
      >
        <Animated.View style={chevronRotateStyle}>
          <ChevronDownIcon size={28} color="#fff" style={styles.iconShadow} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: 22,
  },
  hit: { padding: 4 },
  disabled: { opacity: 0.35 },
  aa: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  aaActive: { opacity: 1, transform: [{ scale: 1.06 }] },
  iconShadow: { opacity: 1 },
  moreOuter: {
    alignItems: 'center',
    width: '100%',
  },
  moreBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  penBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Kleine runde Vorschau der aktuellen Stiftfarbe */
  activeColorPreview: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
  },
  /** Container fuer den vertikalen Hue-Slider */
  hueSliderWrap: {
    width: 36,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerContainer: {
    width: 36,
    height: 120,
  },
  hueSlider: {
    width: 14,
    height: 120,
    borderRadius: 7,
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
