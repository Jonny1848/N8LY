import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';
import { Event } from '../../components/EventCard';
import { Share } from 'react-native';
import { Avatar } from '@/components/Avatar';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [host, setHost] = useState<any>(null); // Later Type for consistency
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      setEvent(data);
      fetchHost(data.host_id);
    }
    setLoading(false);
  };

  const fetchHost = async (host_id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', host_id)
      .single();

    if (data) setHost(data);
    setLoading(false);
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out this event: ${event?.title} at ${event?.venue_name}!`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary.main} />;
  if (!event) return <Text>Event nicht gefunden.</Text>;

  const eventDate = new Date(event.date);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image
            source={event.image_urls?.[0] ? { uri: event.image_urls[0] } : require('../../assets/pexels-apasaric-2078071.jpg')}
            style={styles.headerImage}
          />

          {/* Music Genre Badges */}
          {event.music_genres && event.music_genres.length > 0 && (
            <View style={styles.genreSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreContainer}>
                {event.music_genres.map((genre, index) => (
                  <View key={index} style={styles.genreBadge}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>

          {/* Action Buttons: Top Right */}
          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsSaved(!isSaved)}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isSaved ? theme.colors.primary.main : "black"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { marginTop: 12 }]}
              onPress={onShare}
            >
              <Ionicons name="share-social-outline" size={22} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title & Badge */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{event.event_type.toUpperCase()}</Text>
            </View>
          </View>
          {/* Info Row: Date & Time */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary.main} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Datum & Uhrzeit</Text>
              <Text style={styles.infoValue}>
                {eventDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
              </Text>
              <Text style={styles.infoSubValue}>{eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</Text>
            </View>
          </View>

          {/* Info Row: Location */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={20} color={theme.colors.primary.main} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.venue_name}</Text>
              <Text style={styles.infoSubValue}>{event.address}, {event.city}</Text>
            </View>
          </View>

          {/* Info Row: Host */}
          <View style={styles.infoRow}>
            <Avatar url={host?.avatar_url ? host.avatar_url : null} size={40} borderColor={theme.colors.neutral.gray[50]} />
            <View style={{ marginLeft: 20 }}>
              <Text style={styles.infoLabel}>Veranstalter</Text>
              <Text style={styles.infoValue}>{host?.username || 'Unbekannter Veranstalter'}</Text>
              {/* TODO: Put some actual useful info here */}
              <Text style={styles.infoSubValue}>fruchtiger Herr</Text>
            </View>
          </View>

          {/* Lineup Section */}
          {event.lineup && event.lineup.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lineup</Text>
              <View style={styles.lineupContainer}>
                {event.lineup.map((artist, index) => (
                  <View key={index} style={styles.artistBadge}>
                    <Text style={styles.artistText}>{artist}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Über dieses Event</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer Action Bar */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPriceLabel}>Ticketpreis</Text>
          <Text style={styles.footerPrice}>{event.ticket_price > 0 ? `${event.ticket_price}€` : 'Free'}</Text>
        </View>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => event.external_ticket_url && Linking.openURL(event.external_ticket_url)}
        >
          <Text style={styles.buyButtonText}>Tickets sichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout & Loader
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25
  },

  // Header Image & Buttons
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 350
  },
  headerImage: {
    width: '100%',
    height: '100%'
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rightActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Genre Badges
  genreOverlay: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  genreScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  genreGlassBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  genreGlassText: {
    color: theme.colors.neutral.gray[900],
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Main Content
  content: {
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.neutral.gray[900],
    flex: 1
  },
  typeBadge: {
    backgroundColor: theme.colors.primary.main + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: theme.colors.primary.main,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: theme.colors.neutral.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.neutral.gray[500],
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.neutral.gray[800]
  },
  infoSubValue: {
    fontSize: 14,
    color: theme.colors.neutral.gray[500]
  },

  // Sections (Lineup & Description)
  section: {
    marginTop: 25
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  lineupContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  artistBadge: {
    backgroundColor: theme.colors.neutral.gray[900],
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12
  },
  artistText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.neutral.gray[600]
  },

  // Sticky Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.gray[100],
    backgroundColor: 'white'
  },
  footerPriceLabel: {
    fontSize: 12,
    color: theme.colors.neutral.gray[500]
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.neutral.gray[900]
  },
  buyButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16
  },
  buyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16
  },
  genreSection: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  genreContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  genreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  genreText: {
    color: theme.colors.neutral.gray[900],
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});