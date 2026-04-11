import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  STORY_PRESS_IN_OPACITY,
  STORY_PRESS_SPRING_CONFIG,
  STORY_REACTION_PRESS_IN_MS,
  STORY_REACTION_PRESS_IN_SCALE,
  STORY_REACTION_PRESS_POP_SPRING,
  STORY_REACTION_PRESS_SETTLE_SPRING,
  STORY_REACTION_SELECTED_SCALE,
  STORY_REACTION_SELECTED_SPRING,
} from './constants';

/**
 * Emoji-Kapsel: iOS Liquid Glass wenn verfuegbar, sonst Blur + mattes Overlay.
 * isSelected: Ring + leichte Skalierung (eigene Reaktion bzw. Smiley wenn schon gewaehlt).
 * Press: tieferes Eindruecken, kurzer Pop beim Loslassen.
 */
export function StoryReactionGlassChip({
  useGlass,
  isRound,
  isSelected = false,
  onPress,
  accessibilityLabel,
  children,
}) {
  const scale = useSharedValue(1);
  const opacitySv = useSharedValue(1);
  const selectedBoost = useSharedValue(isSelected ? STORY_REACTION_SELECTED_SCALE : 1);

  useEffect(() => {
    selectedBoost.value = withSpring(
      isSelected ? STORY_REACTION_SELECTED_SCALE : 1,
      STORY_REACTION_SELECTED_SPRING
    );
  }, [isSelected, selectedBoost]);

  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * selectedBoost.value }],
    opacity: opacitySv.value,
  }));

  const onPressIn = () => {
    scale.value = withTiming(STORY_REACTION_PRESS_IN_SCALE, { duration: STORY_REACTION_PRESS_IN_MS });
    opacitySv.value = withTiming(STORY_PRESS_IN_OPACITY, { duration: STORY_REACTION_PRESS_IN_MS });
  };
  const onPressOut = () => {
    opacitySv.value = withSpring(1, STORY_PRESS_SPRING_CONFIG);
    scale.value = withSequence(
      withSpring(1.1, STORY_REACTION_PRESS_POP_SPRING),
      withSpring(1, STORY_REACTION_PRESS_SETTLE_SPRING)
    );
  };

  const wrapStyle = isRound
    ? { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }
    : { borderRadius: 22, overflow: 'hidden', alignSelf: 'flex-start' };

  const selectedRingStyle = isSelected
    ? {
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.92)',
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: '#ffffff',
              shadowOpacity: 0.45,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            }
          : { elevation: 8 }),
      }
    : { borderWidth: 0, borderColor: 'transparent' };

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
        style={[wrapStyle, selectedRingStyle]}
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
    <BlurView intensity={Platform.OS === 'ios' ? 38 : 52} tint="dark" style={[wrapStyle, selectedRingStyle]}>
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
