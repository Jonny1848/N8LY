import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Event } from '@/components/EventCard';
import EventRail from '@/components/discover/EventRail';
import { theme } from '@/constants/theme';
import { useDiscoverRails } from '@/hooks/useDiscoverRails';
import type { DiscoverRail } from '@/lib/discoverData';

/** Abstand zur Tab-Bar, damit die letzte Rail nicht abgeschnitten wirkt */
const SCROLL_BOTTOM_PADDING = 100;

/**
 * Entdecken: vertikal scrollbare Seite mit mehreren horizontalen „Rails“
 * (Streaming-Apps als Vorbild). Daten über `useDiscoverRails` / `lib/discoverData`.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const { rails, loading, refreshing, error, refresh } = useDiscoverRails();

  const onEventPress = (event: Event) => {
    router.push({
      pathname: '/event/[id]',
      params: { id: event.id },
    });
  };

  const renderRail: ListRenderItem<DiscoverRail> = ({ item }) => (
    <EventRail
      railKey={item.key}
      title={item.title}
      events={item.events}
      onEventPress={onEventPress}
    />
  );

  const listHeader = (
    <>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Entdecken</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading && rails.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : null}
      {!loading && rails.length === 0 && !error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Noch keine Events</Text>
          <Text style={styles.emptyBody}>
            Sobald Events in der Datenbank liegen, erscheinen sie hier.
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={rails}
        keyExtractor={(item) => item.key}
        renderItem={renderRail}
        ListHeaderComponent={listHeader}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
  },
  scrollContent: {
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 32,
    color: theme.colors.neutral.gray[900],
  },
  heroSubtitle: {
    marginTop: 6,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 15,
    color: theme.colors.neutral.gray[500],
  },
  loaderWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorText: {
    marginHorizontal: 20,
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 14,
    color: theme.colors.error,
  },
  empty: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 17,
    color: theme.colors.neutral.gray[700],
  },
  emptyBody: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.neutral.gray[500],
  },
});
