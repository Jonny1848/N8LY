import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookmarkIcon as BookmarkIconSolid } from 'react-native-heroicons/solid';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  STORY_PRESS_IN_MS,
  STORY_PRESS_IN_OPACITY,
  STORY_PRESS_IN_SCALE,
  STORY_PRESS_SPRING_CONFIG,
  storyViewerFontArial,
} from './constants';

/**
 * Bookmark mit Weiss/Rot-Crossfade passend zur Rail.
 */
export function SideStackBookmarkAction({ bookmarked, onPress, countLabel, size }) {
  const tint = useSharedValue(bookmarked ? 1 : 0);
  const scale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  useEffect(() => {
    tint.value = withTiming(bookmarked ? 1 : 0, { duration: 280 });
  }, [bookmarked, tint]);

  const whiteLayerStyle = useAnimatedStyle(() => ({ opacity: 1 - tint.value }));
  const redLayerStyle = useAnimatedStyle(() => ({ opacity: tint.value }));
  const rowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: pressOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Bookmark"
      onPressIn={() => {
        scale.value = withTiming(STORY_PRESS_IN_SCALE, { duration: STORY_PRESS_IN_MS });
        pressOpacity.value = withTiming(STORY_PRESS_IN_OPACITY, { duration: STORY_PRESS_IN_MS });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
        pressOpacity.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
      }}
      className="items-center mb-5"
    >
      <Animated.View style={rowAnimStyle} className="items-center">
        <View style={{ width: size, height: size }} className="items-center justify-center">
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }, whiteLayerStyle]}
          >
            <BookmarkIconSolid size={size} color="#FFFFFF" />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }, redLayerStyle]}
          >
            <BookmarkIconSolid size={size} color="#FF3040" />
          </Animated.View>
        </View>
        <Text className="text-white text-xs mt-1" style={storyViewerFontArial}>
          {countLabel}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
