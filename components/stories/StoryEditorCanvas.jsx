/**
 * Flacher Bereich fuer View-Shot: Hintergrundbild + Overlay-Kind-Knoten.
 * collapsable={false}: noetig damit Android den Snapshot rendert.
 * Tap auf leere Flaeche (unter Text/Sticker) kann Selection aufheben.
 */
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { StoryImageEffectOverlay } from '../../constants/storyImageEffects';

/**
 * @param {{
 *   width: number,
 *   height: number,
 *   shotRef: any,
 *   imageUri: string,
 *   borderRadius?: number,
 *   effectId?: string,
 *   onBackdropPress?: () => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function StoryEditorCanvas({
  width,
  height,
  shotRef,
  imageUri,
  children,
  borderRadius = 18,
  effectId = 'none',
  onBackdropPress,
}) {
  return (
    <View ref={shotRef} collapsable={false} style={[styles.box, { width, height, borderRadius }]}>
      <Image source={{ uri: imageUri }} style={{ width, height, borderRadius }} contentFit="cover" />
      <StoryImageEffectOverlay effectId={effectId} width={width} height={height} borderRadius={borderRadius} />
      {onBackdropPress ? (
        <Pressable
          onPress={onBackdropPress}
          style={[styles.backdrop, { width, height, borderRadius }]}
          accessibilityRole="button"
          accessibilityLabel="Hintergrund antippen"
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#000',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  /** Liegt unter Text/Sticker; faengt nur Touches auf dem Bild (zIndex niedriger als Layer) */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
