/**
 * Vertikale Werkzeugleiste rechts (Instagram-Stil): Text, Sticker, Musik, Effekte, Mehr.
 * „Mehr“ klappt mit Reanimated (Feder + Einblenden) auf und zu.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

const COLORS = ['#ffffff', '#000000', '#ff3040', '#ffdc00', '#4cd964', '#5856d6'];

/** Maximale Hoehe des aufgeklappten „Mehr“-Blocks (genug fuer Stift + Farben + Undo) */
const MORE_PANEL_MAX_H = 268;

const SPRING_CFG = {
  damping: 18,
  stiffness: 220,
  mass: 0.85,
};

/**
 * @param {{
 *   mode: 'none'|'text'|'sticker'|'draw',
 *   onModeChange: (m: 'none'|'text'|'sticker'|'draw') => void,
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

  return (
    <View style={styles.column}>
      {/* Aa: oeffnet Vollbild-Texteingabe; erneuter Tap schliesst Editor inkl. Modal (wie IG abbrechen) */}
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

      <Pressable
        onPress={() => onModeChange(mode === 'sticker' ? 'none' : 'sticker')}
        style={styles.hit}
        hitSlop={8}
      >
        <FaceSmileIcon size={28} color="#fff" style={styles.iconShadow} />
      </Pressable>

      {/* Musik: noch ohne Aktion – spaeter z. B. Audio aus Bibliothek */}
      <Pressable style={styles.hit} hitSlop={8} onPress={() => undefined} accessibilityLabel="Musik (bald)">
        <MusicalNoteIcon size={28} color="#fff" style={styles.iconShadow} />
      </Pressable>

      {/* Effekte: oeffnet die Filter-Leiste unten (Farbtueberlagerungen wie IG-Light) */}
      <Pressable
        style={styles.hit}
        hitSlop={8}
        onPress={() => onOpenEffects?.()}
        accessibilityLabel="Effekte und Filter"
      >
        <SparklesIcon
          size={28}
          color={effectsActive ? '#7eb6ff' : '#fff'}
          style={styles.iconShadow}
        />
      </Pressable>

      <Animated.View
        style={[styles.moreOuter, morePanelStyle]}
        pointerEvents={moreOpen ? 'auto' : 'none'}
      >
        <View style={styles.moreBlock}>
          <Pressable
            onPress={() => onModeChange(mode === 'draw' ? 'none' : 'draw')}
            style={styles.hit}
            hitSlop={8}
          >
            <PencilIcon size={26} color={mode === 'draw' ? '#7eb6ff' : '#fff'} style={styles.iconShadow} />
          </Pressable>
          <View style={styles.colorStack}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => onColorChange(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  strokeColor === c && styles.colorDotRing,
                ]}
              />
            ))}
          </View>
          <Pressable onPress={onUndo} disabled={!canUndo} style={[styles.hit, !canUndo && styles.disabled]}>
            <Text style={styles.undoTxt}>Undo</Text>
          </Pressable>
        </View>
      </Animated.View>

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
    gap: 14,
    paddingVertical: 6,
  },
  colorStack: { flexDirection: 'column', gap: 8, alignItems: 'center' },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorDotRing: {
    borderWidth: 2,
    borderColor: '#fff',
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
