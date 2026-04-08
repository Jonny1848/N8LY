import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  STORY_PRESS_IN_MS,
  STORY_PRESS_IN_OPACITY,
  STORY_PRESS_IN_SCALE,
  STORY_PRESS_SPRING_CONFIG,
} from './constants';

/**
 * Emoji-Kapsel: iOS Liquid Glass wenn verfuegbar, sonst Blur + mattes Overlay.
 */
export function StoryReactionGlassChip({ useGlass, isRound, onPress, accessibilityLabel, children }) {
  const scale = useSharedValue(1);
  const opacitySv = useSharedValue(1);
  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacitySv.value,
  }));

  const onPressIn = () => {
    scale.value = withTiming(STORY_PRESS_IN_SCALE, { duration: STORY_PRESS_IN_MS });
    opacitySv.value = withTiming(STORY_PRESS_IN_OPACITY, { duration: STORY_PRESS_IN_MS });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
    opacitySv.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
  };

  const wrapStyle = isRound
    ? { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }
    : { borderRadius: 22, overflow: 'hidden', alignSelf: 'flex-start' };

  const innerLayoutClass = isRound
    ? 'flex-1 items-center justify-center'
    : 'flex-row items-center justify-center py-2.5 px-3.5 gap-2';

  const pressableShellClass = 'h-full w-full';

  if (useGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={false}
        colorScheme="dark"
        style={wrapStyle}
      >
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          className={pressableShellClass}
        >
          <Animated.View
            style={[{ flex: isRound ? 1 : undefined }, feedbackStyle]}
            className={innerLayoutClass}
          >
            {children}
          </Animated.View>
        </Pressable>
      </GlassView>
    );
  }

  return (
    <BlurView intensity={Platform.OS === 'ios' ? 38 : 52} tint="dark" style={wrapStyle}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(28,28,34,0.38)' }]}
      />
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={pressableShellClass}
      >
        <Animated.View
          style={[{ flex: isRound ? 1 : undefined }, feedbackStyle]}
          className={innerLayoutClass}
        >
          {children}
        </Animated.View>
      </Pressable>
    </BlurView>
  );
}
