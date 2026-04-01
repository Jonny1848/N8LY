/**
 * Werkzeugleiste im Story-Editor: Modi Text, Sticker, Stift, Farben, Undo.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';

const COLORS = ['#ffffff', '#000000', '#ff3040', '#ffdc00', '#4cd964', '#5856d6'];

/**
 * @param {{ mode: 'none'|'text'|'sticker'|'draw', onModeChange: (m: any) => void, strokeColor: string, onColorChange: (c: string) => void, onUndo: () => void, canUndo: boolean }} props
 */
export default function StoryToolbar({
  mode,
  onModeChange,
  strokeColor,
  onColorChange,
  onUndo,
  canUndo,
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onModeChange(mode === 'text' ? 'none' : 'text')}
        style={[styles.chip, mode === 'text' && styles.chipOn]}
      >
        <Text style={styles.chipTxt}>Aa</Text>
      </Pressable>
      <Pressable
        onPress={() => onModeChange(mode === 'sticker' ? 'none' : 'sticker')}
        style={[styles.chip, mode === 'sticker' && styles.chipOn]}
      >
        <Text style={styles.chipTxt}>Sticker</Text>
      </Pressable>
      <Pressable
        onPress={() => onModeChange(mode === 'draw' ? 'none' : 'draw')}
        style={[styles.chip, mode === 'draw' && styles.chipOn]}
      >
        <Text style={styles.chipTxt}>Stift</Text>
      </Pressable>
      <Pressable onPress={onUndo} disabled={!canUndo} style={[styles.chip, !canUndo && styles.chipDisabled]}>
        <Text style={styles.chipTxt}>Undo</Text>
      </Pressable>
      <View style={styles.colors}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColorChange(c)}
            style={[
              styles.dot,
              { backgroundColor: c },
              strokeColor === c && styles.dotRing,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.35)' },
  chipDisabled: { opacity: 0.4 },
  chipTxt: { color: '#fff', fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  colors: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 22, height: 22, borderRadius: 11 },
  dotRing: { borderWidth: 2, borderColor: '#fff' },
});
