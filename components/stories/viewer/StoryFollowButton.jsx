import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckIcon } from 'react-native-heroicons/solid';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  STORY_FOLLOW_BLUE,
  STORY_PRESS_IN_MS,
  STORY_PRESS_IN_OPACITY,
  STORY_PRESS_IN_SCALE,
  STORY_PRESS_SPRING_CONFIG,
  storyViewerFontArial,
} from './constants';

/**
 * Folgen ↔ Gefolgt: Farbmorph, Label-Crossfade, kurzer Pop beim ersten Folgen.
 */
export function StoryFollowButton({ followed, onToggle }) {
  const progress = useSharedValue(followed ? 1 : 0);
  const pressScale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);
  const celebrate = useSharedValue(0);
  const prevFollowedRef = useRef(followed);

  useEffect(() => {
    progress.value = withSpring(followed ? 1 : 0, { damping: 17, stiffness: 400, mass: 0.5 });
    if (followed && !prevFollowedRef.current) {
      celebrate.value = 0;
      celebrate.value = withSequence(
        withSpring(1, { damping: 9, stiffness: 420, mass: 0.38 }),
        withSpring(0, { damping: 14, stiffness: 340, mass: 0.45 })
      );
    }
    prevFollowedRef.current = followed;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SharedValues sind stabile Refs
  }, [followed]);

  const onPressIn = () => {
    pressScale.value = withTiming(STORY_PRESS_IN_SCALE, { duration: STORY_PRESS_IN_MS });
    pressOpacity.value = withTiming(STORY_PRESS_IN_OPACITY, { duration: STORY_PRESS_IN_MS });
  };
  const onPressOut = () => {
    pressScale.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
    pressOpacity.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
  };

  const shellStyle = useAnimatedStyle(() => {
    const pop = 1 + 0.11 * celebrate.value;
    return {
      transform: [{ scale: pressScale.value * pop }],
      opacity: pressOpacity.value,
    };
  });

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(0,0,0,0.52)', STORY_FOLLOW_BLUE]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.5)']
    ),
  }));

  const labelFolgenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -11]) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.86]) },
    ],
  }));

  const labelGefolgtRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.38, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [12, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.88, 1]) },
    ],
  }));

  const checkPopStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.65, 1], [0.15, 1.22, 1]) }],
  }));

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={followed ? 'Gefolgt — erneut tippen zum Entfolgen' : 'Folgen'}
      accessibilityState={{ selected: followed }}
    >
      <Animated.View style={shellStyle} className="self-start mt-1.5">
        <Animated.View style={[bgStyle, { borderWidth: 1 }]} className="rounded-full px-3.5 py-1">
          <View className="relative items-center justify-center">
            <View className="flex-row items-center gap-1.5 opacity-0" pointerEvents="none">
              <CheckIcon size={12} color="#FFFFFF" />
              <Text className="text-white text-xs" style={storyViewerFontArial}>
                Gefolgt
              </Text>
            </View>
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              <Animated.Text
                style={[
                  labelFolgenStyle,
                  storyViewerFontArial,
                  { color: '#fff', fontSize: 12, position: 'absolute' },
                ]}
              >
                Folgen
              </Animated.Text>
              <Animated.View
                style={[
                  labelGefolgtRowStyle,
                  { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
                ]}
                className="gap-1.5"
              >
                <Animated.View style={checkPopStyle}>
                  <CheckIcon size={12} color="#FFFFFF" />
                </Animated.View>
                <Text className="text-white text-xs" style={storyViewerFontArial}>
                  Gefolgt
                </Text>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
