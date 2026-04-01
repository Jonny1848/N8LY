/**
 * Einfache Sticker: vorgegebene Emoji, per Tap aus der Leiste hinzugefuegt, verschiebbar.
 */
import { useRef } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';

/** Fester Satz Sticker (ohne externes Asset – reicht fuer MVP) */
export const STORY_STICKER_EMOJIS = ['❤️', '🔥', '😂', '✨', '👍', '🎉', '💯', '🙌'];

/**
 * @param {{ stickers: Array<{ id: string, emoji: string, x: number, y: number }>, onStickerChange: (id: string, patch: object) => void, canvasW: number, canvasH: number }} props
 */
export default function StoryStickerLayer({ stickers, onStickerChange, canvasW, canvasH }) {
  return (
    <>
      {stickers.map((s) => (
        <DraggableSticker
          key={s.id}
          sticker={s}
          onChange={(patch) => onStickerChange(s.id, patch)}
          canvasW={canvasW}
          canvasH={canvasH}
        />
      ))}
    </>
  );
}

function DraggableSticker({ sticker, onChange, canvasW, canvasH }) {
  const start = useRef({ x: 0, y: 0 });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start.current = { x: sticker.x, y: sticker.y };
      },
      onPanResponderMove: (_, gestureState) => {
        const size = 48;
        const nx = Math.max(0, Math.min(canvasW - size, start.current.x + gestureState.dx));
        const ny = Math.max(0, Math.min(canvasH - size, start.current.y + gestureState.dy));
        onChange({ x: nx, y: ny });
      },
    })
  ).current;

  return (
    <View style={[styles.abs, { left: sticker.x, top: sticker.y }]} {...pan.panHandlers}>
      <Text style={styles.emoji}>{sticker.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', zIndex: 6 },
  emoji: { fontSize: 42 },
});
