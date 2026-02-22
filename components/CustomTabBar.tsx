import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import useChatStore from '../stores/useChatStore';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../constants/theme';

// Solid Icons
import { HomeIcon as HomeIconSolid } from 'react-native-heroicons/solid';
import { CalendarIcon as CalendarIconSolid } from 'react-native-heroicons/solid';
import { ChatBubbleBottomCenterTextIcon as ChatBubbleLeftIconSolid } from 'react-native-heroicons/solid';
import { GlobeAltIcon as GlobeAltIconSolid } from 'react-native-heroicons/solid';
import { UserIcon as UserIconSolid } from 'react-native-heroicons/solid';

// Outline Icons
import { HomeIcon as HomeIconOutline } from 'react-native-heroicons/outline';
import { CalendarIcon as CalendarIconOutline } from 'react-native-heroicons/outline';
import { ChatBubbleBottomCenterTextIcon as ChatBubbleLeftIconOutline } from 'react-native-heroicons/outline';
import { GlobeAltIcon as GlobeAltIconOutline } from 'react-native-heroicons/outline';
import { UserIcon as UserIconOutline } from 'react-native-heroicons/outline';

const iconMap: Record<string, { solid: any; outline: any }> = {
  home: { solid: HomeIconSolid, outline: HomeIconOutline },
  events: { solid: CalendarIconSolid, outline: CalendarIconOutline },
  social: { solid: ChatBubbleLeftIconSolid, outline: ChatBubbleLeftIconOutline },
  discover: { solid: GlobeAltIconSolid, outline: GlobeAltIconOutline },
  profile: { solid: UserIconSolid, outline: UserIconOutline },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const totalUnread = useChatStore((s) =>
    s.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Einfache, schnelle Animationen für Tab-Bar
        const animatedStyle = useAnimatedStyle(() => {
          const scale = withTiming(isFocused ? 1.08 : 1, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
          const translateY = withTiming(isFocused ? -2 : 0, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
          
          return {
            transform: [{ scale }, { translateY }],
          };
        });

        const iconColorStyle = useAnimatedStyle(() => {
          const opacity = withTiming(isFocused ? 1 : 0.5, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
          return { opacity };
        });

        const IconComponent = isFocused 
          ? iconMap[route.name]?.solid 
          : iconMap[route.name]?.outline;

        const color = isFocused 
          ? theme.colors.primary.main 
          : theme.colors.neutral.gray[400];

        const badge =
          route.name === 'social' && totalUnread > 0
            ? totalUnread > 99
              ? '99+'
              : totalUnread
            : undefined;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <Animated.View style={[styles.tabContent, animatedStyle]}>
              <Animated.View style={[styles.iconContainer, iconColorStyle]}>
                {IconComponent && <IconComponent size={24} color={color} />}
                {badge !== undefined && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: "white",
    height: 65,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: theme.colors.primary.main,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
});