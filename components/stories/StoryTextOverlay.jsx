/**
 * Verschiebbare Text-Bloecke auf der Story (PanResponder).
 * Tap ohne Bewegung: Parent oeffnet die Texteingabe (Instagram: direkt tippen).
 * Die „Eingabepille" ist nur waehrend der aktiven Textbearbeitung (Modal) als
 * gestrichelter Rahmen sichtbar — keine Fuellung, damit der Export/Viewer keinen
 * dauerhaften Pill-Hintergrund zeigt.
 */
import { useRef, useEffect } from 'react';
import { View, Text, PanResponder, StyleSheet, Platform } from 'react-native';
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
 *   onSelect: (id: string) => void,
 *   canvasW: number,
 *   canvasH: number,
 *   editingTextId?: string|null,
 *   textModalOpen?: boolean,
 * }} props
 */
export default function StoryTextOverlay({
  items,
  onItemChange,
  onSelect,
  canvasW,
  canvasH,
  editingTextId = null,
  textModalOpen = false,
}) {
  return (
    <>
      {items.map((item) => (
        <DraggableTextBlock
          key={item.id}
          item={item}
          showDashedEditChrome={Boolean(textModalOpen && editingTextId === item.id)}
          onChange={(patch) => onItemChange(item.id, patch)}
          onSelectBlock={() => onSelect(item.id)}
          canvasW={canvasW}
          canvasH={canvasH}
        />
      ))}
    </>
  );
}

function DraggableTextBlock({ item, showDashedEditChrome, onChange, onSelectBlock, canvasW, canvasH }) {
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  /** Aktuelle Position als Ref — verhindert stale closure im PanResponder */
  const posRef = useRef({ x: item.x, y: item.y });
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelectBlock);

  useEffect(() => { posRef.current = { x: item.x, y: item.y }; }, [item.x, item.y]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSelectRef.current = onSelectBlock; }, [onSelectBlock]);

  const fontSize = item.fontSize ?? 22;
  const fontFamily = storyFontFamilyForKey(item.fontKey ?? 'manropeBold');
  const textAlign = item.textAlign ?? 'left';

  const maxBlockW = Math.max(28, canvasW - item.x - 8);
  const blockH = Math.max(28, fontSize * 1.35);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moved.current = false;
        start.current = { x: posRef.current.x, y: posRef.current.y };
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) moved.current = true;
        const nx = Math.max(0, Math.min(canvasW - 32, start.current.x + gestureState.dx));
        const ny = Math.max(0, Math.min(canvasH - blockH, start.current.y + gestureState.dy));
        onChangeRef.current({ x: nx, y: ny });
      },
      onPanResponderRelease: () => {
        if (!moved.current) onSelectRef.current();
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

  const pillBandAlign =
    textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';

  const inner = showDashedEditChrome ? (
    <View style={[styles.pillBand, { alignItems: pillBandAlign }]}>
      <View style={styles.dashedEditChrome}>
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
      ]}
      {...pan.panHandlers}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  pillBand: {
    width: '100%',
  },
  dashedEditChrome: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
    borderWidth: Platform.OS === 'android' ? 1.5 : 1,
    borderColor: 'rgba(255,255,255,0.92)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  txt: {
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
