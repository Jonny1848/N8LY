import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

// Typescript Interface for events
export interface Event {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  music_genres: string[] | null;
  date: string; // ISO Timestamp
  end_date: string | null;
  image_urls: string[] | null;
  ticket_price: number;
  ticket_available: number;
  ticket_sold: number;
  external_ticket_url: string | null;
  is_boosted: boolean;
  boost_expires_at: string | null;
  status: string | null;
  min_age: number | null;
  max_capacity: number | null;
  venue_name: string;
  city: string;
  address: string;
  lineup: string[] | null;
  interested_count: number;
  created_at: string;
  updated_at: string;
}

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  const formattedTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable 
      onPress={() => onPress?.(event)} 
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={
            event.image_urls && event.image_urls.length > 0
              ? { uri: event.image_urls[0] }
              : require('../assets/pexels-apasaric-2078071.jpg') 
          }
          style={styles.image}
        />
        {event.is_boosted && (
          <View style={styles.boostBadge}>
            <Ionicons name="flash" size={10} color="white" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.dateText}>{`${formattedDate}, ${formattedTime}`}</Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        
        <View style={styles.locationRow}>
          <Text style={styles.locationText} numberOfLines={1}>
            {event.venue_name} • {event.city}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.interestedBox}>
            <Ionicons name="flame" size={14} color={theme.colors.accent.main} />
            <Text style={styles.interestedText}>{event.interested_count} Buzz</Text>
          </View>
          
          {!!(event.ticket_available < 20 && event.ticket_available > 0) && (
            <Text style={styles.limitedText}>Fast ausverkauft!</Text>
          )}
        </View>
      </View>

      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral.gray[300]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[100],
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.gray[200],
  },
  boostBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: theme.colors.accent.main,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary.main,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.neutral.gray[900],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.neutral.gray[900],
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interestedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  interestedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent.main,
    marginLeft: 4,
  },
  limitedText: {
    fontSize: 10,
    color: theme.colors.error,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  }
});