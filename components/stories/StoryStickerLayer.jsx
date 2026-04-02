/**
 * Sticker: Emoji-Schicht (Zeichen aus Emoji-Picker), verschiebbar; optional Skalierung (Groesse).
 */
import { useRef } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';

const BASE_EMOJI_PX = 42;

/**
 * @param {{
 *   stickers: Array<{ id: string, emoji: string, x: number, y: number, scale?: number }>,
 *   onStickerChange: (id: string, patch: object) => void,
 *   selectedId: string|null,
 *   onSelect: (id: string) => void,
 *   canvasW: number,
 *   canvasH: number,
 * }} props
 */
export default function StoryStickerLayer({ stickers, onStickerChange, selectedId, onSelect, canvasW, canvasH }) {
  return (
    <>
      {stickers.map((s) => (
        <DraggableSticker
          key={s.id}
          sticker={s}
          selected={selectedId === s.id}
          onChange={(patch) => onStickerChange(s.id, patch)}
          onSelectSticker={() => onSelect(s.id)}
          canvasW={canvasW}
          canvasH={canvasH}
        />
      ))}
    </>
  );
}

function DraggableSticker({ sticker, selected, onChange, onSelectSticker, canvasW, canvasH }) {
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const scale = sticker.scale ?? 1;
  const fontSize = BASE_EMOJI_PX * scale;
  const hit = Math.max(36, fontSize + 8);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moved.current = false;
        start.current = { x: sticker.x, y: sticker.y };
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) moved.current = true;
        const nx = Math.max(0, Math.min(canvasW - hit, start.current.x + gestureState.dx));
        const ny = Math.max(0, Math.min(canvasH - hit, start.current.y + gestureState.dy));
        onChange({ x: nx, y: ny });
      },
      onPanResponderRelease: () => {
        if (!moved.current) onSelectSticker();
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.abs,
        { left: sticker.x, top: sticker.y, zIndex: 6 },
        selected && styles.selectedRing,
      ]}
      {...pan.panHandlers}
    >
      <Text style={[styles.emoji, { fontSize }]}>{sticker.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  selectedRing: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 12,
    padding: 2,
  },
  emoji: {},
});
