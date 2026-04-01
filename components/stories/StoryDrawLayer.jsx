/**
 * Freihand-Zeichnung ueber dem Story-Bild (SVG-Polyline).
 * PanResponder nutzt Refs fuer Callbacks, damit Farbe/Stiftweite ohne veraltete Closures funktionieren.
 */
import { useRef, useState, useEffect } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

/**
 * @param {{ width: number, height: number, paths: Array<{ id: string, points: string, color: string, strokeWidth: number }>, onAddStroke: (stroke: { id: string, points: string, color: string, strokeWidth: number }) => void, active: boolean, strokeColor: string, strokeWidth?: number }} props
 */
export default function StoryDrawLayer({
  width,
  height,
  paths,
  onAddStroke,
  active,
  strokeColor,
  strokeWidth = 4,
}) {
  const [draftPoints, setDraftPoints] = useState([]);
  const draftRef = useRef([]);
  const colorRef = useRef(strokeColor);
  const widthRef = useRef(strokeWidth);
  const onAddRef = useRef(onAddStroke);
  const activeRef = useRef(active);

  useEffect(() => {
    colorRef.current = strokeColor;
    widthRef.current = strokeWidth;
    onAddRef.current = onAddStroke;
    activeRef.current = active;
  }, [strokeColor, strokeWidth, onAddStroke, active]);

  const finishStroke = () => {
    const pts = draftRef.current;
    draftRef.current = [];
    setDraftPoints([]);
    if (pts.length < 4) return;
    const id = `path_${Date.now()}`;
    onAddRef.current({
      id,
      points: pts.join(' '),
      color: colorRef.current,
      strokeWidth: widthRef.current,
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeRef.current,
      onMoveShouldSetPanResponder: () => activeRef.current,
      onPanResponderGrant: (evt) => {
        if (!activeRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        draftRef.current = [locationX, locationY];
        setDraftPoints([locationX, locationY]);
      },
      onPanResponderMove: (evt) => {
        if (!activeRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        draftRef.current.push(locationX, locationY);
        setDraftPoints((prev) => [...prev, locationX, locationY]);
      },
      onPanResponderRelease: () => {
        finishStroke();
      },
      onPanResponderTerminate: () => {
        finishStroke();
      },
    })
  ).current;

  if (width <= 0 || height <= 0) return null;

  const draftStr = draftPoints.length >= 4 ? draftPoints.join(' ') : '';

  return (
    <View
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents={active ? 'auto' : 'none'}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {paths.map((p) => (
          <Polyline
            key={p.id}
            points={p.points}
            fill="none"
            stroke={p.color}
            strokeWidth={p.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {draftStr ? (
          <Polyline
            points={draftStr}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}
