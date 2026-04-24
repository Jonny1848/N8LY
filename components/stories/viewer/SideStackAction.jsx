import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  STORY_PRESS_IN_MS,
  STORY_PRESS_IN_OPACITY,
  STORY_PRESS_IN_SCALE,
  STORY_PRESS_SPRING_CONFIG,
  storyViewerFontArial,
} from './constants';

/**
 * Rechte Rail: Icon mit Zahl darunter (Kommentare, Teilen, …).
 */
export function SideStackAction({ onPress, icon, countLabel, accessibilityLabel }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="items-center mb-5"
      onPressIn={() => {
        scale.value = withTiming(STORY_PRESS_IN_SCALE, { duration: STORY_PRESS_IN_MS });
        opacity.value = withTiming(STORY_PRESS_IN_OPACITY, { duration: STORY_PRESS_IN_MS });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
        opacity.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
      }}
    >
      <Animated.View className="items-center" style={rowStyle}>
        {icon}
        <Text className="text-white text-xs mt-1" style={storyViewerFontArial}>
          {countLabel}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
