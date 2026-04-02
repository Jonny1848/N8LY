/**
 * Vordefinierte Bild-Effekte (Farbtueberlagerungen) als IG-Filter-Light:
 * keine echten LUTs, aber schnelle, konsistente Stimmungen fuer den Export.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

/** Story-Effekt-IDs; 'none' = keine Ueberlagerung */
export const STORY_IMAGE_EFFECT_IDS = [
  'none',
  'warm',
  'cool',
  'mono',
  'sunset',
  'vivid',
  'midnight',
  'fade',
];

/** Kurzbeschriftung fuer die UI */
export const STORY_EFFECT_LABELS = {
  none: 'Normal',
  warm: 'Warm',
  cool: 'Kuehl',
  mono: 'Mono',
  sunset: 'Sunset',
  vivid: 'Lebendig',
  midnight: 'Night',
  fade: 'Weich',
};

/**
 * Halbtransparente Verlaeufe ueber dem Foto (pointerEvents none fuer Touch-Durchreichung).
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
        <View
          style={[
            common,
            {
              backgroundColor: 'rgba(128,128,128,0.42)',
              // Grau-Overlay entsaettigt optisch (echtes Desaturate waere teurer).
            },
          ]}
        />
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
    default:
      return null;
  }
}
