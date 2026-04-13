import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Event } from '@/components/EventCard';
import { theme } from '@/constants/theme';

const CARD_WIDTH = 148;

type EventRailCardProps = {
  event: Event;
  onPress?: (event: Event) => void;
};

/**
 * Kompakte „Poster“-Karte für horizontale Rails (Disney+-artig: Bild dominant).
 */
export default function EventRailCard({ event, onPress }: EventRailCardProps) {
  const eventDate = new Date(event.date);
  const dateLabel = eventDate.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <Pressable
      onPress={() => onPress?.(event)}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={styles.imageBox}>
        <Image
          source={
            event.image_urls?.[0]
              ? { uri: event.image_urls[0] }
              : require('../../assets/pexels-apasaric-2078071.jpg')
          }
          style={styles.image}
        />
        {event.is_boosted && (
          <View style={styles.boostDot} accessibilityLabel="Boost" />
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {dateLabel} · {event.city}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  pressed: {
    opacity: 0.88,
  },
  imageBox: {
    position: 'relative',
    marginBottom: 8,
  },
  image: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 14,
    backgroundColor: theme.colors.neutral.gray[200],
  },
  boostDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent.main,
    borderWidth: 2,
    borderColor: theme.colors.neutral.white,
  },
  title: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 14,
    color: theme.colors.neutral.gray[900],
    lineHeight: 18,
  },
  meta: {
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.neutral.gray[500],
  },
});
