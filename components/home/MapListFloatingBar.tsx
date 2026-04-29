import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FunnelIcon, QueueListIcon } from 'react-native-heroicons/outline';
import { theme } from '@/constants/theme';

/** Sichtmodus: Karte oder Event-Liste (gleiche Datenbasis wie Pins). */
export type HomeViewMode = 'map' | 'list';

// Höhe der CustomTabBar (s. components/CustomTabBar.tsx) + Abstand zur Pill
const TAB_BAR_HEIGHT = 65;
const PILL_GAP_ABOVE_TAB = 12;

type MapListFloatingBarProps = {
  viewMode: HomeViewMode;
  onToggleViewMode: () => void;
  onOpenFilter: () => void;
};

/**
 * Schwimmende Pill-Leiste: Filter öffnet das Bottom-Sheet, Liste wechselt Karte/Liste.
 * Liegt oberhalb der Tab-Bar, zentriert mit Safe-Area-Berücksichtigung.
 * Layout über NativeWind (`className`); Schatten auf Android zusätzlich per elevation.
 */
export default function MapListFloatingBar({
  viewMode,
  onToggleViewMode,
  onOpenFilter,
}: MapListFloatingBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = TAB_BAR_HEIGHT + PILL_GAP_ABOVE_TAB + insets.bottom;

  const listActive = viewMode === 'list';

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 z-[25] items-center"
      style={{ bottom: bottomOffset }}
    >
      <View
        className="min-w-[280px] max-w-[360px] flex-row items-center overflow-hidden rounded-full bg-white"
      >
        {/* Filter: nur Aktion, kein „aktiver“ Modus */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter öffnen"
          onPress={onOpenFilter}
          className="flex-1 flex-row items-center justify-center gap-2 px-4 py-3.5 active:opacity-90"
        >
          <FunnelIcon size={22} color={theme.colors.neutral.gray[800]} />
          <Text
            className="text-[15px] text-gray-800"
            style={{ fontFamily: 'Manrope_600SemiBold' }}
          >
            Filter
          </Text>
        </Pressable>

        <View className="w-px self-stretch bg-gray-200" />

        {/* Liste: Toggle; in Listenansicht optisch hervorgehoben */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listActive ? 'Zur Karte wechseln' : 'Listenansicht'}
          onPress={onToggleViewMode}
          className={`flex-1 flex-row items-center justify-center gap-2 px-4 py-3.5 active:opacity-90 ${
            listActive ? 'bg-gray-50' : ''
          }`}
        >
          <QueueListIcon
            size={22}
            color={
              listActive ? theme.colors.primary.main : theme.colors.neutral.gray[800]
            }
          />
          <Text
            className="text-[15px]"
            style={{
              fontFamily: listActive ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
              color: listActive
                ? theme.colors.primary.main
                : theme.colors.neutral.gray[800],
            }}
          >
            Liste
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
