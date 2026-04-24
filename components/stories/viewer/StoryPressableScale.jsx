import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { STORY_PRESS_IN_MS, STORY_PRESS_IN_OPACITY, STORY_PRESS_IN_SCALE, STORY_PRESS_SPRING_CONFIG } from './constants';

/**
 * Einheitliches Tap-Feedback: leichtes Eindruecken + Opacity, Feder zurueck.
 */
export function StoryPressableScale({
  children,
  onPress,
  className,
  innerClassName,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  disabled,
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onIn = () => {
    scale.value = withTiming(STORY_PRESS_IN_SCALE, { duration: STORY_PRESS_IN_MS });
    opacity.value = withTiming(STORY_PRESS_IN_OPACITY, { duration: STORY_PRESS_IN_MS });
  };
  const onOut = () => {
    scale.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
    opacity.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      className={className}
      style={style}
    >
      <Animated.View className={innerClassName} style={animStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
