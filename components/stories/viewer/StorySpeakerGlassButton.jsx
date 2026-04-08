import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from 'react-native-heroicons/solid';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  STORY_PRESS_IN_MS,
  STORY_PRESS_IN_OPACITY,
  STORY_PRESS_IN_SCALE,
  STORY_PRESS_SPRING_CONFIG,
  STORY_SPEAKER_GLASS_SIZE,
} from './constants';

/**
 * Stumm-Schalter im Header: gleiche Glass/Blur-Aesthetik wie die Reaktions-Chips.
 */
export function StorySpeakerGlassButton({ useGlass, isMuted, onPress }) {
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

  const wrapStyle = {
    width: STORY_SPEAKER_GLASS_SIZE,
    height: STORY_SPEAKER_GLASS_SIZE,
    borderRadius: STORY_SPEAKER_GLASS_SIZE / 2,
    overflow: 'hidden',
  };
  const a11y = isMuted ? 'Ton einschalten' : 'Ton stummschalten';

  const icon = isMuted ? (
    <SpeakerXMarkIcon size={22} color="#FFFFFF" />
  ) : (
    <SpeakerWaveIcon size={22} color="#FFFFFF" />
  );

  if (useGlass) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={false} colorScheme="dark" style={wrapStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          className="h-full w-full"
        >
          <Animated.View style={[{ flex: 1 }, feedbackStyle]} className="items-center justify-center">
            {icon}
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
        accessibilityLabel={a11y}
        className="h-full w-full"
      >
        <Animated.View style={[{ flex: 1 }, feedbackStyle]} className="items-center justify-center">
          {icon}
        </Animated.View>
      </Pressable>
    </BlurView>
  );
}
