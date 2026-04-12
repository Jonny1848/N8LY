/**
 * Vordefinierte Bild-Effekte (Farbtueberlagerungen) als IG-Filter-Light:
 * keine echten LUTs, aber schnelle, konsistente Stimmungen fuer den Export.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export const STORY_IMAGE_EFFECT_IDS = [
  'none',
  'warm',
  'cool',
  'mono',
  'sunset',
  'vivid',
  'midnight',
  'fade',
  'sepia',
  'teal',
  'rose',
  'golden',
  'arctic',
  'neon',
];

/** Kurzbeschriftung + Emoji fuer die UI */
export const STORY_EFFECT_LABELS = {
  none: 'Normal',
  warm: 'Warm',
  cool: 'Kuehl',
  mono: 'Mono',
  sunset: 'Sunset',
  vivid: 'Lebendig',
  midnight: 'Night',
  fade: 'Weich',
  sepia: 'Sepia',
  teal: 'Ocean',
  rose: 'Rosé',
  golden: 'Gold',
  arctic: 'Arktis',
  neon: 'Neon',
};

/** Emoji pro Effekt fuer visuelle Vorschau in den Buttons */
export const STORY_EFFECT_EMOJI = {
  none: '○',
  warm: '☀️',
  cool: '❄️',
  mono: '⚫',
  sunset: '🌅',
  vivid: '🌈',
  midnight: '🌙',
  fade: '🌫️',
  sepia: '📜',
  teal: '🌊',
  rose: '🌸',
  golden: '✨',
  arctic: '🧊',
  neon: '💜',
};

/**
 * Halbtransparente Verlaeufe ueber dem Foto.
 * @param {{ effectId: string, width: number, height: number, borderRadius?: number }} props
 */
export function StoryImageEffectOverlay({ effectId, width, height, borderRadius = 18 }) {
  if (!effectId || effectId === 'none') return null;

  const common = {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
    borderRadius,
    pointerEvents: 'none',
  };

  switch (effectId) {
    case 'warm':
      return (
        <LinearGradient
          colors={['rgba(255,200,120,0.38)', 'rgba(180,80,40,0.22)', 'transparent']}
          style={common}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      );
    case 'cool':
      return (
        <LinearGradient
          colors={['rgba(120,170,255,0.32)', 'rgba(40,60,140,0.25)', 'rgba(20,30,80,0.12)']}
          style={common}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    case 'mono':
      return (
        <View style={[common, { backgroundColor: 'rgba(128,128,128,0.42)' }]} />
      );
    case 'sunset':
      return (
        <LinearGradient
          colors={['rgba(255,120,80,0.35)', 'rgba(140,60,180,0.28)', 'rgba(40,20,60,0.35)']}
          style={common}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    case 'vivid':
      return (
        <LinearGradient
          colors={['rgba(255,60,140,0.18)', 'rgba(40,255,200,0.12)', 'transparent']}
          style={common}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
        />
      );
    case 'midnight':
      return (
        <LinearGradient
          colors={['rgba(10,20,50,0.55)', 'rgba(5,5,20,0.35)', 'transparent']}
          style={common}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      );
    case 'fade':
      return (
        <LinearGradient
          colors={['rgba(255,250,245,0.45)', 'rgba(255,255,255,0.08)', 'transparent']}
          style={common}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      );
    case 'sepia':
      return (
        <LinearGradient
          colors={['rgba(180,130,70,0.35)', 'rgba(120,80,40,0.28)', 'rgba(80,50,20,0.15)']}
          style={common}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      );
    case 'teal':
      return (
        <LinearGradient
          colors={['rgba(0,180,180,0.28)', 'rgba(0,100,120,0.22)', 'transparent']}
          style={common}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    case 'rose':
      return (
        <LinearGradient
          colors={['rgba(255,150,180,0.30)', 'rgba(200,100,140,0.22)', 'transparent']}
          style={common}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    case 'golden':
      return (
        <LinearGradient
          colors={['rgba(255,215,0,0.30)', 'rgba(255,180,50,0.20)', 'transparent']}
          style={common}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      );
    case 'arctic':
      return (
        <LinearGradient
          colors={['rgba(200,230,255,0.40)', 'rgba(150,200,240,0.25)', 'rgba(100,150,220,0.12)']}
          style={common}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      );
    case 'neon':
      return (
        <LinearGradient
          colors={['rgba(180,0,255,0.22)', 'rgba(0,255,200,0.15)', 'rgba(255,0,100,0.12)']}
          style={common}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    default:
      return null;
  }
}
