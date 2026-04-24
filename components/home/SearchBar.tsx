import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MagnifyingGlassIcon } from 'react-native-heroicons/solid';
import { XMarkIcon as XMarkIconOutline } from 'react-native-heroicons/outline';
import { theme } from '../../constants/theme';
import { useGeneralStore } from '@/app/store/generalStore';

const ICON_W = 22;
const SEARCH_HORIZONTAL_PAD = 20;
const SEARCH_MORPH_EXPANDED_H = 52;
const SEARCH_ICON_TO_INPUT_GAP = 20;
const CLOSED_SIZE = 56;
const SEARCH_SPRING = { damping: 20, stiffness: 260, mass: 0.9 } as const;

let GlassViewComponent: any = null;
let isNativeGlassAvailable = false;
if (Platform.OS === 'ios') {
  try {
    const glassModule = require('expo-glass-effect');
    GlassViewComponent = glassModule.GlassView;
    isNativeGlassAvailable = Boolean(glassModule.isGlassEffectAPIAvailable?.());
  } catch {}
}

export default function SearchBar() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { setSearchQuery, searchEdit, setSearchEdit } = useGeneralStore();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const canLiquidGlass = Platform.OS === 'ios' && isNativeGlassAvailable && !!GlassViewComponent;
  const leftPad = insets.left + 12;
  const rightPad = SEARCH_HORIZONTAL_PAD;
  const expandedWidth = Math.max(0, windowWidth - leftPad - rightPad);
  const searchMorphMaxWidth = Math.max(CLOSED_SIZE, expandedWidth);
  const searchMorph = useSharedValue(0);

  useEffect(() => {
    if (!searchExpanded) {
      return;
    }
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(focusTimer);
  }, [searchExpanded]);

  const expandSearch = () => {
    searchMorph.value = withSpring(1, SEARCH_SPRING);
    setSearchExpanded(true);
  };

  const collapseSearch = () => {
    searchMorph.value = withSpring(0, SEARCH_SPRING);
    setSearchExpanded(false);
    setSearchEdit('');
    Keyboard.dismiss();
  };

  const morphContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(
      searchMorph.value,
      [0, 1],
      [CLOSED_SIZE, searchMorphMaxWidth],
      Extrapolation.CLAMP
    );
    const height = interpolate(
      searchMorph.value,
      [0, 1],
      [CLOSED_SIZE, SEARCH_MORPH_EXPANDED_H],
      Extrapolation.CLAMP
    );
    const borderRadius = Math.min(width, height) / 2;
    return { width, height, borderRadius };
  }, [searchMorphMaxWidth]);

  const iconLeadStyle = useAnimatedStyle(() => ({
    marginLeft: interpolate(
      searchMorph.value,
      [0, 1],
      [(CLOSED_SIZE - ICON_W) / 2, 12],
      Extrapolation.CLAMP
    ),
  }));

  const inputSlotStyle = useAnimatedStyle(() => ({
    flexGrow: interpolate(searchMorph.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    opacity: interpolate(searchMorph.value, [0, 0.22, 1], [0, 0, 1], Extrapolation.CLAMP),
    marginLeft: interpolate(
      searchMorph.value,
      [0, 1],
      [0, SEARCH_ICON_TO_INPUT_GAP],
      Extrapolation.CLAMP
    ),
  }));

  const xSlotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchMorph.value, [0, 0.35, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(searchMorph.value, [0, 1], [0.65, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={searchExpanded ? undefined : 'Suche öffnen'}
      style={{ flex: 1 }}
      pointerEvents={searchExpanded ? 'box-none' : 'auto'}
      onPress={() => {
        if (!searchExpanded) {
          expandSearch();
        }
      }}
    >
      <View className="flex-1 flex-row items-center">
        <Animated.View style={iconLeadStyle}>
          <MagnifyingGlassIcon size={ICON_W} color={theme.colors.neutral.gray[700]} />
        </Animated.View>
        <Animated.View style={inputSlotStyle}>
          <TextInput
            ref={searchInputRef}
            className="text-base"
            placeholder="Wohin möchtest du?"
            placeholderTextColor={theme.colors.neutral.gray[500]}
            value={searchEdit}
            onChangeText={setSearchEdit}
            returnKeyType="search"
            editable={searchExpanded}
            pointerEvents={searchExpanded ? 'auto' : 'none'}
            onSubmitEditing={() => {
              const query = searchEdit.trim();
              if (!query) {
                return;
              }
              setSearchQuery(query);
              collapseSearch();
            }}
            style={{
              fontFamily: 'Manrope_400Regular',
              paddingVertical: 6,
              marginRight: 4,
              minWidth: 0,
              color: theme.colors.neutral.gray[900],
            }}
          />
        </Animated.View>
        <Animated.View style={[xSlotStyle, { marginRight: 4 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Suche schließen"
            hitSlop={12}
            onPress={collapseSearch}
            className="p-1"
          >
            <XMarkIconOutline size={22} color={theme.colors.neutral.gray[600]} />
          </Pressable>
        </Animated.View>
      </View>
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingLeft: leftPad,
        paddingRight: rightPad,
        paddingBottom: 8,
      }}
    >
      <Animated.View style={[morphContainerStyle, { overflow: 'hidden' }]}>
        {canLiquidGlass ? (
          <GlassViewComponent
            glassEffectStyle="regular"
            isInteractive={false}
            colorScheme="light"
            style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}
          >
            {content}
          </GlassViewComponent>
        ) : (
          <BlurView
            intensity={Platform.OS === 'ios' ? 42 : 58}
            tint="light"
            style={{ width: '100%', height: '100%', overflow: 'hidden' }}
          >
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: 'rgba(255,255,255,0.28)' },
              ]}
            />
            {content}
          </BlurView>
        )}
      </Animated.View>
    </View>
  );
}