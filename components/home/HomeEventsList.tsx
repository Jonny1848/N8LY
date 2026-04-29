import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import EventCard, { Event } from '@/components/EventCard';
import { useFilteredEvents } from '@/hooks/useFilteredEvents';
import { useEventStore } from '@/app/store/eventStore';
import { theme } from '@/constants/theme';

/** Abstand nach unten, damit die schwebende Pill-Leiste die Liste nicht überdeckt */
const LIST_BOTTOM_INSET = 120;

type HomeEventsListProps = {
  /** Im `ListeBottomSheet`: kein großer Titel (steht im Sheet-Header), nur Untertitel. */
  embedded?: boolean;
  onEventPress?: (event: Event) => void;
};

/**
 * Listenansicht auf Home: gleiche Event-Menge wie die Karten-Pins (`useFilteredEvents`).
 * Layout über NativeWind/Tailwind (`className`), Schrift wie im restlichen Screen über Manrope.
 */
export default function HomeEventsList({
  embedded = false,
  onEventPress,
}: HomeEventsListProps) {
  const filteredEvents = useFilteredEvents();
  const { loadingEvents } = useEventStore();
  const router = useRouter();

  const handleEventPress = (event: Event) => {
    if (onEventPress) {
      onEventPress(event);
      return;
    }

    router.push({
      pathname: '/event/[id]',
      params: { id: event.id },
    });
  };

  const empty = loadingEvents ? (
    <View className="items-center py-8">
      <ActivityIndicator size="small" color={theme.colors.primary.main} />
    </View>
  ) : (
    <View className="px-6 pt-12">
      <Text
        className="text-center text-[15px] text-gray-400"
        style={{ fontFamily: 'Manrope_400Regular' }}
      >
        Keine Events.
      </Text>
    </View>
  );

  const list = (
    <FlatList
      className="flex-1"
      data={filteredEvents}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <EventCard event={item} onPress={handleEventPress} />
      )}
      ItemSeparatorComponent={() => (
        <View className="mx-6 h-px bg-gray-200/70" />
      )}
      contentContainerStyle={{ paddingBottom: LIST_BOTTOM_INSET }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={empty}
    />
  );

  if (embedded) {
    return <View className="flex-1 bg-white">{list}</View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {list}
    </SafeAreaView>
  );
}
