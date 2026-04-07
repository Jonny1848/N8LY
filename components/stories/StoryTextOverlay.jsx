/**
 * Verschiebbare Text-Bloecke auf der Story (PanResponder).
 * Tap ohne Bewegung: Parent oeffnet die Texteingabe (Instagram: direkt tippen).
 */
import { useRef } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';
import { storyFontFamilyForKey } from '../../constants/storyEditorFonts';

/**
 * @param {{
 *   items: Array<{
 *     id: string,
 *     text: string,
 *     x: number,
 *     y: number,
 *     color: string,
 *     fontSize?: number,
 *     fontKey?: string,
 *     textAlign?: 'left'|'center'|'right',
 *     pillColor?: string|null,
 *   }>,
 *   onItemChange: (id: string, patch: object) => void,
 *   selectedId: string|null,
 *   onSelect: (id: string) => void,
 *   canvasW: number,
 *   canvasH: number,
 * }} props
 */
export default function StoryTextOverlay({ items, onItemChange, selectedId, onSelect, canvasW, canvasH }) {
  return (
    <>
      {items.map((item) => (
        <DraggableTextBlock
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onChange={(patch) => onItemChange(item.id, patch)}
          onSelectBlock={() => onSelect(item.id)}
          canvasW={canvasW}
          canvasH={canvasH}
        />
      ))}
    </>
  );
}

function DraggableTextBlock({ item, selected, onChange, onSelectBlock, canvasW, canvasH }) {
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const fontSize = item.fontSize ?? 22;
  const fontFamily = storyFontFamilyForKey(item.fontKey ?? 'manropeBold');
  const textAlign = item.textAlign ?? 'left';
  const pillColor = item.pillColor ?? null;

  /**
   * Feste Zeilenbreite von x bis zum rechten Rand (8px Rand): erst so wirkt textAlign
   * (ohne volle Breite bleibt Text immer „optisch“ linksbuendig wie ein schmales RN-Text-Element).
   */
  const maxBlockW = Math.max(28, canvasW - item.x - 8);

  // Grobe Blockhoehe fuer Clamp (eine Zeile Minimum; mehrzeilig bleibt innerhalb maxWidth).
  const blockH = Math.max(28, fontSize * 1.35);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moved.current = false;
        start.current = { x: item.x, y: item.y };
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) moved.current = true;
        const nx = Math.max(0, Math.min(canvasW - 32, start.current.x + gestureState.dx));
        const ny = Math.max(0, Math.min(canvasH - blockH, start.current.y + gestureState.dy));
        onChange({ x: nx, y: ny });
      },
      onPanResponderRelease: () => {
        if (!moved.current) onSelectBlock();
      },
    })
  ).current;

  const textStyle = [
    styles.txt,
    {
      color: item.color,
      fontSize,
      fontFamily,
      textAlign,
      width: '100%',
    },
  ];

  // Pill im definierten Streifen je nach Modus einruecken (Canvas-Band bleibt gleich breit).
  const pillBandAlign =
    textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';

  const inner = pillColor ? (
    <View style={[styles.pillBand, { alignItems: pillBandAlign }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: pillColor,
          },
        ]}
      >
        <Text style={textStyle}>{item.text}</Text>
      </View>
    </View>
  ) : (
    <Text style={textStyle}>{item.text}</Text>
  );

  return (
    <View
      style={[
        styles.abs,
        {
          left: item.x,
          top: item.y,
          width: maxBlockW,
          maxWidth: canvasW - 16,
          zIndex: 5,
        },
        selected && styles.selectedRing,
      ]}
      {...pan.panHandlers}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  selectedRing: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 10,
    padding: 2,
  },
  /** Volle Bandbreite, damit die Pill selbst links/mitte/rechts sitzen kann */
  pillBand: {
    width: '100%',
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  txt: {
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
