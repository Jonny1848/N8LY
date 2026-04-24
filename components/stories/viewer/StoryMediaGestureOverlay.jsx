import { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HeartIcon as HeartIconSolid } from 'react-native-heroicons/solid';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  STORY_SWIPE_DISMISS_DISTANCE,
  STORY_SWIPE_DISMISS_VELOCITY,
} from './constants';

/**
 * Vollbild: vertikales Wischen schliesst; Tap-Zonen wechseln Slides; Doppel-Tap optional Like + Herz-Burst.
 */
export function StoryMediaGestureOverlay({ onTriggerLike, onTapZone, onDismiss, doubleTapLikeEnabled }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const playBurst = useCallback(
    (x, y) => {
      if (!doubleTapLikeEnabled) return;
      translateX.value = x - 36;
      translateY.value = y - 36;
      scale.value = 0;
      opacity.value = 1;
      scale.value = withSequence(
        withTiming(1.15, { duration: 280 }),
        withTiming(0.92, { duration: 120 }),
        withTiming(1, { duration: 100 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 350 }),
        withTiming(0, { duration: 420 })
      );
      onTriggerLike();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SharedValues sind stabile Refs
    [doubleTapLikeEnabled, onTriggerLike]
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd((e, success) => {
          if (success) runOnJS(playBurst)(e.x, e.y);
        }),
    [playBurst]
  );

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(280)
        .onEnd((e, success) => {
          if (success) runOnJS(onTapZone)(e.x);
        }),
    [onTapZone]
  );

  const tapComposition = useMemo(
    () => (doubleTapLikeEnabled ? Gesture.Exclusive(doubleTap, singleTap) : singleTap),
    [doubleTapLikeEnabled, doubleTap, singleTap]
  );

  const panDismiss = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-14, 14])
        .failOffsetX([-32, 32])
        .onEnd((e) => {
          const ty = e.translationY;
          const vy = e.velocityY;
          if (
            Math.abs(ty) > STORY_SWIPE_DISMISS_DISTANCE ||
            Math.abs(vy) > STORY_SWIPE_DISMISS_VELOCITY
          ) {
            runOnJS(onDismiss)();
          }
        }),
    [onDismiss]
  );

  const rootGesture = useMemo(
    () => Gesture.Simultaneous(panDismiss, tapComposition),
    [panDismiss, tapComposition]
  );

  return (
    <GestureDetector gesture={rootGesture}>
      <Animated.View pointerEvents="box-only" style={[StyleSheet.absoluteFillObject]}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, animatedStyle]}>
          <HeartIconSolid size={72} color="red" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
