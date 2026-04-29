import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View, FlatList, Dimensions } from 'react-native';
import type { Event } from '@/components/EventCard';
import type {
  DiscoverQuickFilter,
  DiscoverShowcaseSection,
} from '@/lib/discoverData';
import { getEventStateLabel, isEventLiveNow } from '@/lib/eventState';
import { theme } from '@/constants/theme';

const FALLBACK_IMAGE = require('../../assets/pexels-apasaric-2078071.jpg');
const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_CARD_WIDTH = Math.min(SCREEN_WIDTH - 64, 390);
const HERO_ITEM_SPACING = 12;
const HERO_SNAP_INTERVAL = HERO_CARD_WIDTH + HERO_ITEM_SPACING;
const HERO_SIDE_INSET = (SCREEN_WIDTH - HERO_CARD_WIDTH) / 2;

const quickFilters: { key: DiscoverQuickFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Alle', icon: 'sparkles' },
  { key: 'now', label: 'Jetzt', icon: 'radio' },
  { key: 'nearby', label: 'Nähe', icon: 'navigate' },
  { key: 'weekend', label: 'Wochenende', icon: 'calendar' },
];

const font = {
  regular: { fontFamily: 'Arial' },
  medium: { fontFamily: 'Arial', fontWeight: '500' as const },
  semibold: { fontFamily: 'Arial', fontWeight: '600' as const },
  bold: { fontFamily: 'Arial', fontWeight: '700' as const },
};

type ShowcaseSectionProps = {
  section: DiscoverShowcaseSection;
  activeQuickFilter: DiscoverQuickFilter;
  onQuickFilterPress: (filter: DiscoverQuickFilter) => void;
  onEventPress: (event: Event) => void;
};

function formatDate(event: Event): string {
  const date = new Date(event.date);
  if (Number.isNaN(date.getTime())) return event.city;

  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function eventImage(event: Event) {
  return event.image_urls?.[0] ? { uri: event.image_urls[0] } : FALLBACK_IMAGE;
}

function SectionHeader({ section }: { section: DiscoverShowcaseSection }) {
  if (section.type === 'quickFilters') return null;

  return (
    <View className="mb-3 px-5">
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[22px] leading-7 text-primary-dark" style={font.bold}>
            {section.title}
          </Text>
          {section.subtitle ? (
            <Text className="mt-1 text-[13px] leading-5 text-secondary" style={font.regular}>
              {section.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function QuickFilterSection({
  activeQuickFilter,
  onQuickFilterPress,
}: Pick<ShowcaseSectionProps, 'activeQuickFilter' | 'onQuickFilterPress'>) {
  return (
    <View className="mb-7">
      <FlatList
        horizontal
        data={quickFilters}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFilterContent}
        renderItem={({ item }) => {
          const active = item.key === activeQuickFilter;
          return (
            <Pressable
              onPress={() => onQuickFilterPress(item.key)}
              className={`mr-2.5 flex-row items-center rounded-full border px-4 py-2.5 ${
                active
                  ? 'border-primary bg-primary'
                  : 'border-secondary-lighter bg-white'
              }`}
              style={({ pressed }) => [styles.chipShadow, pressed && styles.pressed]}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={active ? theme.colors.neutral.white : theme.colors.neutral.gray[700]}
              />
              <Text
                className={`ml-1.5 text-[13px] ${active ? 'text-white' : 'text-primary-light'}`}
                style={font.semibold}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function HeroCard({ event, onPress }: { event: Event; onPress: (event: Event) => void }) {
  const live = isEventLiveNow(event);

  return (
    <Pressable
      onPress={() => onPress(event)}
      className="overflow-hidden rounded-[28px] bg-primary-dark"
      style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}
    >
      <Image source={eventImage(event)} className="absolute h-full w-full" resizeMode="cover" />
      <View className="absolute inset-0 bg-black/30" />
      <View className="flex-1 justify-between p-5" style={styles.heroContent}>
        <View className="flex-row items-center self-start rounded-full bg-white/90 px-3 py-1.5">
          <View
            className={`mr-2 h-2 w-2 rounded-full ${live ? 'bg-red-500' : 'bg-accent'}`}
          />
          <Text className="text-[12px] text-primary-dark" style={font.bold}>
            {getEventStateLabel(event)}
          </Text>
        </View>

        <View className="overflow-hidden" style={styles.heroTextBlock}>
          <Text
            className="text-[28px] leading-9 text-white"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[font.bold, styles.heroTitle]}
          >
            {event.title}
          </Text>
          <Text
            className="mt-2 text-[14px] leading-5 text-white/80"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[font.medium, styles.heroMeta]}
          >
            {formatDate(event)} - {event.venue_name ?? event.city}
          </Text>
          <View className="mt-4 flex-row items-center overflow-hidden">
            <View className="mr-2 rounded-full bg-white/20 px-3 py-1.5">
              <Text className="text-[12px] text-white" style={font.semibold}>
                {event.interested_count ?? 0} interessiert
              </Text>
            </View>
            {event.music_genres?.[0] ? (
              <View className="min-w-0 flex-1 rounded-full bg-white/20 px-3 py-1.5">
                <Text className="text-[12px] text-white" numberOfLines={1} style={font.semibold}>
                  {event.music_genres[0]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function EventShowcaseCard({
  event,
  layout,
  onPress,
}: {
  event: Event;
  layout: DiscoverShowcaseSection['layout'];
  onPress: (event: Event) => void;
}) {
  const isWide = layout === 'wide' || layout === 'spotlight';
  const isCompact = layout === 'compact';
  const imageStyle = isWide ? styles.wideImage : isCompact ? styles.compactImage : styles.posterImage;
  const cardStyle = isWide ? styles.wideCard : isCompact ? styles.compactCard : styles.posterCard;

  return (
    <Pressable
      onPress={() => onPress(event)}
      className="mr-3 overflow-hidden rounded-[22px] border border-secondary-lighter bg-white"
      style={({ pressed }) => [cardStyle, styles.cardShadow, pressed && styles.pressed]}
    >
      <View>
        <Image source={eventImage(event)} style={imageStyle} resizeMode="cover" />
        <View className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1">
          <Text className="text-[11px] text-primary-dark" style={font.bold}>
            {getEventStateLabel(event)}
          </Text>
        </View>
        {event.is_boosted ? (
          <View className="absolute right-2 top-2 rounded-full bg-accent px-2 py-1">
            <Ionicons name="flash" size={12} color={theme.colors.neutral.white} />
          </View>
        ) : null}
      </View>

      <View className={isWide ? 'p-4' : 'p-3'}>
        <Text
          className={isWide ? 'text-[18px] leading-6 text-primary-dark' : 'text-[14px] leading-5 text-primary-dark'}
          numberOfLines={2}
          style={font.bold}
        >
          {event.title}
        </Text>
        <Text
          className="mt-1 text-[12px] leading-4 text-secondary"
          numberOfLines={1}
          style={font.regular}
        >
          {formatDate(event)} - {event.city}
        </Text>
        <View className="mt-2 flex-row items-center">
          <Ionicons name="flame" size={13} color={theme.colors.accent.main} />
          <Text className="ml-1 text-[12px] text-secondary-dark" style={font.semibold}>
            {event.interested_count ?? 0} interessiert
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ShowcaseSection({
  section,
  activeQuickFilter,
  onQuickFilterPress,
  onEventPress,
}: ShowcaseSectionProps) {
  if (section.type === 'quickFilters') {
    return (
      <QuickFilterSection
        activeQuickFilter={activeQuickFilter}
        onQuickFilterPress={onQuickFilterPress}
      />
    );
  }

  if (section.type === 'hero') {
    return (
      <View className="mb-8">
        <SectionHeader section={section} />
        <FlatList
          horizontal
          data={section.events}
          keyExtractor={(item) => `${section.key}-${item.id}`}
          showsHorizontalScrollIndicator={false}
          snapToInterval={HERO_CARD_WIDTH + HERO_ITEM_SPACING}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          contentContainerStyle={styles.heroRailContent}
          ItemSeparatorComponent={() => <View style={styles.heroSeparator} />}
          getItemLayout={(_, index) => ({
            length: HERO_SNAP_INTERVAL,
            offset: HERO_SNAP_INTERVAL * index,
            index,
          })}
          renderItem={({ item }) => <HeroCard event={item} onPress={onEventPress} />}
        />
      </View>
    );
  }

  return (
    <View className="mb-8">
      <SectionHeader section={section} />
      <FlatList
        horizontal
        data={section.events}
        keyExtractor={(item) => `${section.key}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
        renderItem={({ item }) => (
          <EventShowcaseCard event={item} layout={section.layout} onPress={onEventPress} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  railContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  heroRailContent: {
    paddingLeft: HERO_SIDE_INSET,
    paddingRight: HERO_SIDE_INSET,
  },
  quickFilterContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  heroCard: {
    width: HERO_CARD_WIDTH,
    height: 440,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  heroSeparator: {
    width: HERO_ITEM_SPACING,
  },
  heroContent: {
    width: HERO_CARD_WIDTH,
  },
  heroTextBlock: {
    width: HERO_CARD_WIDTH - 40,
  },
  heroTitle: {
    width: HERO_CARD_WIDTH - 40,
    overflow: 'hidden',
  },
  heroMeta: {
    width: HERO_CARD_WIDTH - 40,
    overflow: 'hidden',
  },
  posterCard: {
    width: 158,
  },
  wideCard: {
    width: 270,
  },
  compactCard: {
    width: 136,
  },
  posterImage: {
    width: '100%',
    height: 190,
  },
  wideImage: {
    width: '100%',
    height: 150,
  },
  compactImage: {
    width: '100%',
    height: 112,
  },
  chipShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
