/**
 * Flacher Bereich fuer View-Shot: Hintergrundbild + Overlay-Kind-Knoten.
 * collapsable={false}: noetig damit Android den Snapshot rendert.
 */
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

/**
 * @param {{ width: number, height: number, shotRef: any, imageUri: string, children: import('react').ReactNode }} props
 */
export default function StoryEditorCanvas({ width, height, shotRef, imageUri, children }) {
  return (
    <View ref={shotRef} collapsable={false} style={[styles.box, { width, height }]}>
      <Image source={{ uri: imageUri }} style={{ width, height }} contentFit="cover" />
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
});
