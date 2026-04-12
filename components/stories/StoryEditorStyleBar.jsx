/**
 * Untere Leiste fuer Story-Editor:
 * - Text: Font-Pills + vertikaler Groessen-Regler + Farbpalette.
 * - Sticker: Groessen-Slider.
 * - Effekte: huebsche animierte Kapseln mit Emoji + Label.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { STORY_TEXT_FONT_PRESETS } from '../../constants/storyEditorFonts';
import { STORY_IMAGE_EFFECT_IDS, STORY_EFFECT_LABELS, STORY_EFFECT_EMOJI } from '../../constants/storyImageEffects';
import { STORY_COLORS_HORIZONTAL_ORDER } from '../../constants/storyTextColors';
import { theme } from '../../constants/theme';

const VERTICAL_SLIDER_HEIGHT = 88;
const VERTICAL_SLIDER_THICKNESS = 34;

/**
 * Einzelner Effekt-Button mit animiertem aktiv/inaktiv-Uebergang.
 */
function EffectButton({ id, label, emoji, isActive, onPress }) {
  const active = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    active.value = withTiming(isActive ? 1 : 0, { duration: 220 });
  }, [isActive, active]);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      active.value,
      [0, 1],
      ['rgba(50,50,55,0.85)', theme.colors.primary.main2],
    ),
    transform: [{ scale: active.value * 0.06 + 0.94 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(active.value, [0, 1], ['#cccccc', '#ffffff']),
  }));

  return (
    <Pressable onPress={() => onPress(id)}>
      <Animated.View style={[styles.effectChip, chipStyle]}>
        <Text style={styles.effectEmoji}>{emoji}</Text>
        <Animated.Text style={[styles.effectLabel, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function StoryEditorStyleBar({
  visible,
  variant,
  textSelectionKey,
  fontKey,
  onFontKeyChange,
  fontSize = 24,
  onFontSizeChange,
  onFontSizeCommit,
  textColor,
  onTextColorChange,
  textAlign = 'left',
  onTextAlignChange,
  stickerScale = 1,
  onStickerScaleChange,
  onStickerScaleCommit,
  effectId,
  onEffectChange,
  liftAboveFooterPx = 0,
}) {
  const [textPanel, setTextPanel] = useState('font');
  const [colorScrollDotIdx, setColorScrollDotIdx] = useState(0);

  useEffect(() => {
    if (variant === 'text') setTextPanel('font');
  }, [textSelectionKey, variant]);

  useEffect(() => {
    setColorScrollDotIdx(0);
  }, [textPanel]);

  if (!visible) return null;

  const normHex = (c) => (c || '').trim().toLowerCase();

  const onColorRowScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxScroll = Math.max(0, contentSize.width - layoutMeasurement.width);
    if (maxScroll <= 0) { setColorScrollDotIdx(0); return; }
    const ratio = contentOffset.x / maxScroll;
    setColorScrollDotIdx(ratio < 0.34 ? 0 : ratio < 0.67 ? 1 : 2);
  };

  return (
    <View style={[styles.wrap, { bottom: liftAboveFooterPx }]} pointerEvents="box-none">
      {variant === 'text' ? (
        <>
          {textPanel === 'font' ? (
            <View style={styles.fontLayout}>
              <View style={styles.verticalSliderColumn}>
                <Text style={styles.sizeCap}>A</Text>
                <View style={styles.verticalSliderHost}>
                  <Slider
                    style={styles.verticalSliderRotated}
                    minimumValue={14}
                    maximumValue={52}
                    step={1}
                    value={fontSize}
                    onValueChange={onFontSizeChange}
                    onSlidingComplete={onFontSizeCommit}
                    minimumTrackTintColor={theme.colors.primary.main2}
                    maximumTrackTintColor="rgba(120,120,120,0.45)"
                    thumbTintColor="#ffffff"
                  />
                </View>
                <Text style={styles.sizeCapSmall}>a</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fontRow}
                style={styles.fontScrollFlex}
              >
                {STORY_TEXT_FONT_PRESETS.map((p) => {
                  const active = fontKey === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => onFontKeyChange?.(p.id)}
                      style={[styles.fontChip, active ? styles.fontChipOnIg : styles.fontChipOffIg]}
                    >
                      <Text
                        style={[
                          styles.fontChipLabel,
                          { fontFamily: p.fontFamily },
                          active ? styles.fontChipLabelOnIg : styles.fontChipLabelOffIg,
                        ]}
                        numberOfLines={1}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {textPanel === 'color' ? (
            <View style={styles.colorRowSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={onColorRowScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.colorRowScrollContent}
              >
                {STORY_COLORS_HORIZONTAL_ORDER.map((c) => {
                  const active = normHex(textColor) === normHex(c);
                  const isWhite = normHex(c) === '#ffffff';
                  return (
                    <Pressable
                      key={c}
                      onPress={() => onTextColorChange?.(c)}
                      style={[
                        styles.swatchTile,
                        { backgroundColor: c },
                        active && styles.swatchTileActive,
                        isWhite && styles.swatchTileWhite,
                      ]}
                      accessibilityLabel={`Farbe ${c}`}
                      accessibilityRole="button"
                    />
                  );
                })}
              </ScrollView>
              <View style={styles.colorPageDots} pointerEvents="none">
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[styles.colorPageDot, i === colorScrollDotIdx && styles.colorPageDotActive]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Untere Icon-Leiste: Schrift, Farbe, Ausrichtung */}
          <View style={styles.textIconToolbar}>
            <Pressable
              onPress={() => setTextPanel('font')}
              style={[styles.iconCircle, textPanel === 'font' && styles.iconCircleActive]}
              accessibilityLabel="Schrift und Groesse"
              accessibilityRole="button"
            >
              <Text style={styles.iconAa}>Aa</Text>
            </Pressable>
            <Pressable
              onPress={() => setTextPanel('color')}
              style={[styles.iconCircle, textPanel === 'color' && styles.iconCircleActive]}
              accessibilityLabel="Textfarbe"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#ff0040', '#ffcc00', '#00f5a0', '#00cfff', '#7b2cbf', '#ff0040']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rainbowDisk}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                const order = ['left', 'center', 'right'];
                const cur = order.includes(textAlign) ? textAlign : 'left';
                const next = order[(order.indexOf(cur) + 1) % order.length];
                onTextAlignChange?.(next);
              }}
              style={styles.iconCircle}
              accessibilityLabel="Textausrichtung"
              accessibilityRole="button"
            >
              <TextAlignIgIcon align={textAlign} />
            </Pressable>
          </View>
        </>
      ) : null}

      {variant === 'sticker' ? (
        <>
          <Text style={styles.sectionLabel}>Emoji-Groesse</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderHint}>Klein</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.35}
              maximumValue={2.2}
              step={0.05}
              value={stickerScale}
              onValueChange={onStickerScaleChange}
              onSlidingComplete={onStickerScaleCommit}
              minimumTrackTintColor={theme.colors.primary.main2}
              maximumTrackTintColor="#444"
              thumbTintColor="#fff"
            />
            <Text style={styles.sliderHint}>Gross</Text>
          </View>
        </>
      ) : null}

      {variant === 'effects' ? (
        <>
          <Text style={styles.sectionLabel}>Effekte</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.effectRow}
          >
            {STORY_IMAGE_EFFECT_IDS.map((id) => (
              <EffectButton
                key={id}
                id={id}
                label={STORY_EFFECT_LABELS[id] ?? id}
                emoji={STORY_EFFECT_EMOJI[id] ?? '●'}
                isActive={effectId === id}
                onPress={onEffectChange}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function TextAlignIgIcon({ align }) {
  const rowAlign =
    align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  const widths =
    align === 'center' ? [0.72, 1, 0.78] : align === 'right' ? [0.62, 0.88, 0.74] : [1, 0.76, 0.58];
  return (
    <View style={styles.alignIconBox}>
      {widths.map((w, i) => (
        <View
          key={i}
          style={[
            styles.alignIconLine,
            { width: `${Math.round(w * 100)}%`, alignSelf: rowAlign },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 5,
    backgroundColor: 'rgba(18,18,22,0.94)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 18,
    maxHeight: 220,
  },
  fontLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: VERTICAL_SLIDER_HEIGHT + 2,
    marginBottom: 3,
  },
  verticalSliderColumn: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  sizeCap: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 1,
  },
  sizeCapSmall: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 1,
  },
  verticalSliderHost: {
    width: VERTICAL_SLIDER_THICKNESS + 8,
    height: VERTICAL_SLIDER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  verticalSliderRotated: {
    width: VERTICAL_SLIDER_HEIGHT,
    height: VERTICAL_SLIDER_THICKNESS,
    transform: [{ rotate: '90deg' }],
  },
  fontScrollFlex: { flex: 1 },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
    paddingRight: 4,
  },
  fontChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    maxHeight: 32,
    justifyContent: 'center',
  },
  fontChipOffIg: { backgroundColor: '#2c2c2e' },
  fontChipOnIg: { backgroundColor: '#f2f2f7' },
  fontChipLabel: { fontSize: 12 },
  fontChipLabelOffIg: { color: '#f5f5f7' },
  fontChipLabelOnIg: { color: '#1c1c1e' },
  colorRowSection: { marginBottom: 3, paddingTop: 2 },
  colorRowScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  swatchTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    marginRight: 7,
  },
  swatchTileActive: {
    borderWidth: 4.5,
    transform: [{ scale: 1.07 }],
  },
  swatchTileWhite: {
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  colorPageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 2,
  },
  colorPageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3.5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  colorPageDotActive: {
    backgroundColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  textIconToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 1,
    paddingBottom: 0,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(60,60,67,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  iconAa: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
  },
  rainbowDisk: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  alignIconBox: {
    width: 22,
    height: 15,
    justifyContent: 'space-between',
  },
  alignIconLine: {
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#ffffff',
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  slider: { flex: 1, height: 36 },
  sliderHint: { color: '#888', fontSize: 10, width: 40, fontFamily: 'Manrope_400Regular' },
  effectRow: {
    gap: 10,
    paddingBottom: 10,
    paddingRight: 8,
    flexDirection: 'row',
  },
  /** Effekt-Kapsel mit Emoji + Label */
  effectChip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 64,
    gap: 3,
  },
  effectEmoji: {
    fontSize: 20,
    textAlign: 'center',
  },
  effectLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
  },
});
