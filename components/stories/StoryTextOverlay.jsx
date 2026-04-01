/**
 * Verschiebbare Text-Bloecke auf der Story (PanResponder).
 */
import { useRef } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';

/**
 * @param {{ items: Array<{ id: string, text: string, x: number, y: number, color: string }>, onItemChange: (id: string, patch: object) => void, canvasW: number, canvasH: number }} props
 */
export default function StoryTextOverlay({ items, onItemChange, canvasW, canvasH }) {
  return (
    <>
      {items.map((item) => (
        <DraggableTextBlock
          key={item.id}
          item={item}
          onChange={(patch) => onItemChange(item.id, patch)}
          canvasW={canvasW}
          canvasH={canvasH}
        />
      ))}
    </>
  );
}

function DraggableTextBlock({ item, onChange, canvasW, canvasH }) {
  const start = useRef({ x: 0, y: 0 });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start.current = { x: item.x, y: item.y };
      },
      onPanResponderMove: (_, gestureState) => {
        const nx = Math.max(0, Math.min(canvasW - 40, start.current.x + gestureState.dx));
        const ny = Math.max(0, Math.min(canvasH - 24, start.current.y + gestureState.dy));
        onChange({ x: nx, y: ny });
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.abs,
        {
          left: item.x,
          top: item.y,
          maxWidth: canvasW - 16,
        },
      ]}
      {...pan.panHandlers}
    >
      <Text style={[styles.txt, { color: item.color }]}>{item.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', zIndex: 5 },
  txt: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
