/**
 * Untere Leiste fuer Story-Editor:
 * - Text: Instagram-aehnlich — „Aa“ oeffnet Schrift-Pills + vertikalen Groessen-Regler;
 *   Regenbogen-Knopf oeffnet grosses Farbraster.
 * - Sticker / Effekte: wie zuvor kompakt.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { STORY_TEXT_FONT_PRESETS } from '../../constants/storyEditorFonts';
import { STORY_IMAGE_EFFECT_IDS, STORY_EFFECT_LABELS } from '../../constants/storyImageEffects';
import { STORY_COLORS_HORIZONTAL_ORDER } from '../../constants/storyTextColors';

/**
 * Hoehe des vertikalen Groessen-Reglers (optisch wie IG-Rahmen im Screenshot).
 * Hinweis: @react-native-community/slider v5 hat kein `vertical`-Prop mehr — wir drehen
 * einen horizontalen Slider per transform, damit er auf iOS und Android senkrecht wirkt.
 * +90°: oben großes „A“ = hoher fontSize (Maximum), unten kleines „a“ = Minimum.
 */
const VERTICAL_SLIDER_HEIGHT = 88;
/** Sensibler Querschnitt des gedrehten Sliders (Touch / Daumen) */
const VERTICAL_SLIDER_THICKNESS = 34;

// liftAboveFooterPx: Abstand vom unteren Rand, damit die Leiste ueber dem Weiter-FAB sitzt.

/**
 * @param {{
 *   visible: boolean,
 *   variant: 'text' | 'sticker' | 'effects',
 *   textSelectionKey?: string | null,
 *   fontKey?: string,
 *   onFontKeyChange?: (key: string) => void,
 *   fontSize?: number,
 *   onFontSizeChange?: (n: number) => void,
 *   onFontSizeCommit?: () => void,
 *   textColor?: string,
 *   onTextColorChange?: (c: string) => void,
 *   textAlign?: 'left'|'center'|'right',
 *   onTextAlignChange?: (a: 'left'|'center'|'right') => void,
 *   stickerScale?: number,
 *   onStickerScaleChange?: (n: number) => void,
 *   onStickerScaleCommit?: () => void,
 *   effectId?: string,
 *   onEffectChange?: (id: string) => void,
 *   liftAboveFooterPx?: number,
 * }} props
 */
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
  /** Welcher Text-Unterdialog aktiv ist (wie Instagram: Schrift vs. Farbe) */
  const [textPanel, setTextPanel] = useState(/** @type {'font'|'color'} */ ('font'));
  /** Scroll-Fortschritt der Farbleiste fuer die Punkt-Navigation unter der Reihe */
  const [colorScrollDotIdx, setColorScrollDotIdx] = useState(0);

  useEffect(() => {
    if (variant === 'text') setTextPanel('font');
  }, [textSelectionKey, variant]);

  useEffect(() => {
    setColorScrollDotIdx(0);
  }, [textPanel]);

  // Alle Hooks muessen VOR jedem bedingten return laufen (Scroll-Handler ist keine Hook-Funktion).
  if (!visible) return null;

  const normHex = (c) => (c || '').trim().toLowerCase();

  /** Mappt Scroll-Position grob auf 3 Punkte (wie im Story-Screenshot); kein Hook, darf nach dem visible-Guard stehen. */
  const onColorRowScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxScroll = Math.max(0, contentSize.width - layoutMeasurement.width);
    if (maxScroll <= 0) {
      setColorScrollDotIdx(0);
      return;
    }
    const ratio = contentOffset.x / maxScroll;
    const idx = ratio < 0.34 ? 0 : ratio < 0.67 ? 1 : 2;
    setColorScrollDotIdx(idx);
  };

  return (
    <View style={[styles.wrap, { bottom: liftAboveFooterPx }]} pointerEvents="box-none">
      {variant === 'text' ? (
        <>
          {/* Schrift: links vertikaler Groessen-Regler, rechts horizontal durch die Fonts scrollen */}
          {textPanel === 'font' ? (
            <View style={styles.fontLayout}>
              <View style={styles.verticalSliderColumn}>
                <Text style={styles.sizeCap}>A</Text>
                {/* Horizontaler Slider, -90° gedreht = zuverlaessig vertikal (v5 API) */}
                <View style={styles.verticalSliderHost}>
                  <Slider
                    style={styles.verticalSliderRotated}
                    minimumValue={14}
                    maximumValue={52}
                    step={1}
                    value={fontSize}
                    onValueChange={onFontSizeChange}
                    onSlidingComplete={onFontSizeCommit}
                    minimumTrackTintColor="theme.colors.primary.main2"
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

          {/* Farbe: horizontale Leiste mit weissem Rand um jede Kachel (Instagram-Stil) */}
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

          {/* Untere Icon-Leiste: Schrift, Farbe, Ausrichtung (Zyklus wie Instagram) */}
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
            {/* Ein Tipp schaltet links → mitte → rechts (kein extra Panel, nur Zustand am Text) */}
            <Pressable
              onPress={() => {
                const order = /** @type {const} */ (['left', 'center', 'right']);
                const cur = order.includes(textAlign) ? textAlign : 'left';
                const next = order[(order.indexOf(cur) + 1) % order.length];
                onTextAlignChange?.(next);
              }}
              style={styles.iconCircle}
              accessibilityLabel={
                textAlign === 'center'
                  ? 'Textausrichtung Mitte — tippe fuer Rechts'
                  : textAlign === 'right'
                    ? 'Textausrichtung Rechts — tippe fuer Links'
                    : 'Textausrichtung Links — tippe fuer Mitte'
              }
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
              minimumTrackTintColor="#7eb6ff"
              maximumTrackTintColor="#444"
              thumbTintColor="#fff"
            />
            <Text style={styles.sliderHint}>Gross</Text>
          </View>
        </>
      ) : null}

      {variant === 'effects' ? (
        <>
          <Text style={styles.sectionLabel}>Effekte (Filter)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.effectRow}>
            {STORY_IMAGE_EFFECT_IDS.map((id) => (
              <Pressable
                key={id}
                onPress={() => onEffectChange?.(id)}
                style={[styles.effectChip, effectId === id && styles.effectChipOn]}
              >
                <Text style={[styles.effectChipTxt, effectId === id && styles.effectChipTxtOn]}>
                  {STORY_EFFECT_LABELS[id] ?? id}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

/**
 * Drei Linien wie im Instagram-Story-Editor; gemeinsame Kanten spiegeln links / mitte / rechts.
 */
function TextAlignIgIcon({ align }) {
  const rowAlign =
    align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  // Leicht unterschiedliche Laengen pro Zeile (klassisches „Text“-Symbol)
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
    maxHeight: 198,
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
  /** Platz fuer gedrehten Slider: Breite/Hoehe nach Rotation ~ vertikal */
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
  fontScrollFlex: {
    flex: 1,
  },
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
  /** Inaktiv: dunkle Kapsel / aktiv: helle Kapsel wie Instagram */
  fontChipOffIg: {
    backgroundColor: '#2c2c2e',
  },
  fontChipOnIg: {
    backgroundColor: '#f2f2f7',
  },
  fontChipLabel: {
    fontSize: 12,
  },
  fontChipLabelOffIg: {
    color: '#f5f5f7',
  },
  fontChipLabelOnIg: {
    color: '#1c1c1e',
  },
  colorRowSection: {
    marginBottom: 3,
    paddingTop: 2,
  },
  colorRowScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  /** Weisser Kreis mit Pipette wie im Story-Screenshot */
  eyedropperBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  /**
   * Abgerundetes Quadrat mit kraeftigem weissen Rand wie im Story-Screenshot.
   */
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
  /** Reine Weiss-Kachel: duenner Rand nach aussen, damit sie vom Hintergrund loesbar bleibt */
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
  iconCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
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
  /** Feste Breite: Prozent-Linien im Ausrichtungs-Icon */
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
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 6,
    marginTop: 4,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  slider: { flex: 1, height: 36 },
  sliderHint: { color: '#888', fontSize: 10, width: 40, fontFamily: 'Manrope_400Regular' },
  effectRow: { gap: 8, paddingBottom: 8, flexDirection: 'row' },
  effectChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  effectChipOn: { backgroundColor: '#5b8cff' },
  effectChipTxt: { color: '#ddd', fontSize: 12, fontFamily: 'Manrope_500Medium' },
  effectChipTxtOn: { color: '#fff' },
});
