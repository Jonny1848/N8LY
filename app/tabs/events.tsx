import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Event } from '@/components/EventCard';
import ShowcaseSection from '@/components/discover/ShowcaseSection';
import { theme } from '@/constants/theme';
import { useDiscoverShowcase } from '@/hooks/useDiscoverRails';
import type { DiscoverShowcaseSection } from '@/lib/discoverData';

const SCROLL_BOTTOM_PADDING = 100;
const font = {
  regular: { fontFamily: 'Arial' },
  semibold: { fontFamily: 'Arial', fontWeight: '600' as const },
  bold: { fontFamily: 'Arial', fontWeight: '700' as const },
};

export default function EventsScreen() {
  const router = useRouter();
  const {
    sections,
    loading,
    refreshing,
    error,
    activeQuickFilter,
    setActiveQuickFilter,
    refresh,
  } = useDiscoverShowcase();
  const hasEventSections = sections.some((section) => section.events.length > 0);

  const onEventPress = (event: Event) => {
    router.push({
      pathname: '/event/[id]',
      params: { id: event.id },
    });
  };

  const renderSection: ListRenderItem<DiscoverShowcaseSection> = ({ item }) => (
    <ShowcaseSection
      section={item}
      activeQuickFilter={activeQuickFilter}
      onQuickFilterPress={setActiveQuickFilter}
      onEventPress={onEventPress}
    />
  );

  const listHeader = (
    <>
      <View className="flex-row items-center px-5 pb-4 pt-3">
        <View className="h-11 w-11" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-[28px] text-primary-dark" style={font.bold}>
            Events
          </Text>
        </View>
        <View className="h-11 w-11" />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading && !hasEventSections ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : null}
    </>
  );

  const listFooter =
    !loading && !hasEventSections && !error ? (
      <View className="mx-5 mt-1 rounded-[28px] border border-secondary-lighter bg-white px-6 py-10">
        <Text className="text-center text-[18px] text-primary-dark" style={font.bold}>
          Keine Events gefunden
        </Text>
        <Text className="mt-2 text-center text-[14px] leading-5 text-secondary" style={font.regular}>
          Wähle oben einen anderen Filter.
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-neutral-white" edges={['top']}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.primary.main}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = {
  scrollContent: {
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  loaderWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorText: {
    marginHorizontal: 20,
    marginBottom: 12,
    fontFamily: 'Arial',
    fontWeight: '500',
    fontSize: 14,
    color: theme.colors.error,
  },
} as const;
