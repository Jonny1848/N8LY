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
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { MapPinIcon } from 'react-native-heroicons/solid';
import { MagnifyingGlassIcon } from 'react-native-heroicons/solid';
import { XMarkIcon as XMarkIconOutline } from 'react-native-heroicons/outline';
import { theme, getMapChromeIconColor } from '../../constants/theme';
import { useGeneralStore } from '@/app/store/generalStore';

/**
 * Abstand bis unter die Such-UI (schwebende Tab-Pille + Labels + Safe Area).
 * Zu klein → UI verschwindet unter der nativen Tab-Bar.
 */
const FLOATING_TAB_CLEARANCE_PT = 118;

const ICON_W = 22;
const SEARCH_HORIZONTAL_PAD = 20;
const LOCATE_BTN_SIZE = 56;
const GAP_LOCATE_SEARCH = 14;
const SEARCH_MORPH_EXPANDED_H = 52;
const SEARCH_ICON_TO_INPUT_GAP = 20;
const SEARCH_SPRING = { damping: 20, stiffness: 260, mass: 0.9 } as const;

type SearchBarProps = {
  onLocatePress: () => void;
};

export default function SearchBar({ onLocatePress }: SearchBarProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const mapIsLight = useGeneralStore((s) => s.mapIsLight);
  const { setSearchQuery, searchEdit, setSearchEdit } = useGeneralStore();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchMorph = useSharedValue(0);

  const canLiquidGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  const mapChromePadLeft = insets.left + 12;
  const mapChromePadRight = SEARCH_HORIZONTAL_PAD;
  const searchExpandedWidth = Math.max(
    0,
    windowWidth - mapChromePadLeft - mapChromePadRight
  );
  const searchMorphMaxWidth = Math.max(LOCATE_BTN_SIZE, searchExpandedWidth);
  const bottomInsetAboveTabBar = insets.bottom + FLOATING_TAB_CLEARANCE_PT;

  const glassChromeIconColor = getMapChromeIconColor(mapIsLight);
  const glassChromeInputTextColor = mapIsLight
    ? theme.colors.neutral.gray[900]
    : '#FFFFFF';
  const glassChromePlaceholderColor = mapIsLight
    ? theme.colors.neutral.gray[500]
    : theme.colors.neutral.gray[400];

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
    const w = interpolate(
      searchMorph.value,
      [0, 1],
      [LOCATE_BTN_SIZE, searchMorphMaxWidth],
      Extrapolation.CLAMP
    );
    const h = interpolate(
      searchMorph.value,
      [0, 1],
      [LOCATE_BTN_SIZE, SEARCH_MORPH_EXPANDED_H],
      Extrapolation.CLAMP
    );
    const r = Math.min(w, h) / 2;
    return { width: w, height: h, borderRadius: r };
  }, [searchMorphMaxWidth]);

  const iconLeadStyle = useAnimatedStyle(() => ({
    marginLeft: interpolate(
      searchMorph.value,
      [0, 1],
      [(LOCATE_BTN_SIZE - ICON_W) / 2, 12],
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

  const mapSearchMorphInner = (
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
          <MagnifyingGlassIcon size={ICON_W} color={glassChromeIconColor} />
        </Animated.View>
        <Animated.View style={inputSlotStyle}>
          <TextInput
            ref={searchInputRef}
            className="text-base"
            placeholder="Wohin möchtest du?"
            placeholderTextColor={glassChromePlaceholderColor}
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
              color: glassChromeInputTextColor,
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
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottomInsetAboveTabBar,
        zIndex: 15,
        paddingLeft: mapChromePadLeft,
        paddingRight: mapChromePadRight,
        paddingBottom: 8,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      {canLiquidGlass ? (
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <GlassView
            glassEffectStyle="regular"
            isInteractive={false}
            colorScheme={mapIsLight ? 'light' : 'dark'}
            style={{
              width: LOCATE_BTN_SIZE,
              height: LOCATE_BTN_SIZE,
              borderRadius: LOCATE_BTN_SIZE / 2,
              overflow: 'hidden',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Karte auf Standort zentrieren"
              className="h-full w-full items-center justify-center"
              onPress={onLocatePress}
            >
              <MapPinIcon size={24} color={glassChromeIconColor} />
            </Pressable>
          </GlassView>

          <Animated.View
            style={[
              morphContainerStyle,
              { overflow: 'hidden', marginTop: GAP_LOCATE_SEARCH },
            ]}
          >
            <GlassView
              glassEffectStyle="regular"
              isInteractive={false}
              colorScheme={mapIsLight ? 'light' : 'dark'}
              style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}
            >
              {mapSearchMorphInner}
            </GlassView>
          </Animated.View>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
          }}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 42 : 58}
            tint={mapIsLight ? 'light' : 'dark'}
            style={{
              width: LOCATE_BTN_SIZE,
              height: LOCATE_BTN_SIZE,
              borderRadius: LOCATE_BTN_SIZE / 2,
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: mapIsLight
                    ? 'rgba(255,255,255,0.28)'
                    : 'rgba(28,28,34,0.4)',
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Karte auf Standort zentrieren"
              className="h-full w-full items-center justify-center"
              onPress={onLocatePress}
            >
              <MapPinIcon size={24} color={glassChromeIconColor} />
            </Pressable>
          </BlurView>

          <View style={{ height: GAP_LOCATE_SEARCH }} />

          <Animated.View style={[morphContainerStyle, { overflow: 'hidden' }]}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 42 : 58}
              tint={mapIsLight ? 'light' : 'dark'}
              style={{ width: '100%', height: '100%', overflow: 'hidden' }}
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: mapIsLight
                      ? 'rgba(255,255,255,0.28)'
                      : 'rgba(28,28,34,0.4)',
                  },
                ]}
              />
              {mapSearchMorphInner}
            </BlurView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
