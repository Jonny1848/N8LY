import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';
import { Event } from '../../components/EventCard';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (data) setEvent(data);
    setLoading(false);
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
            source={{ uri: event.image_urls?.[0] || 'https://via.placeholder.com/600' }} 
            style={styles.headerImage} 
          />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          
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
  container: { flex: 1, backgroundColor: 'white' },
  imageContainer: { position: 'relative', width: '100%', height: 350 },
  headerImage: { width: '100%', height: '100%' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 10, borderRadius: 25 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 25, color: theme.colors.neutral.gray[900] },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: theme.colors.neutral.gray[50], justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 12, color: theme.colors.neutral.gray[500], textTransform: 'uppercase', fontWeight: '600' },
  infoValue: { fontSize: 16, fontWeight: '700', color: theme.colors.neutral.gray[800] },
  infoSubValue: { fontSize: 14, color: theme.colors.neutral.gray[500] },
  section: { marginTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  lineupContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  artistBadge: { backgroundColor: theme.colors.neutral.gray[900], paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  artistText: { color: 'white', fontWeight: '600', fontSize: 14 },
  descriptionText: { fontSize: 15, lineHeight: 24, color: theme.colors.neutral.gray[600] },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: theme.colors.neutral.gray[100], backgroundColor: 'white' },
  footerPriceLabel: { fontSize: 12, color: theme.colors.neutral.gray[500] },
  footerPrice: { fontSize: 22, fontWeight: '800', color: theme.colors.neutral.gray[900] },
  buyButton: { backgroundColor: theme.colors.primary.main, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16 },
  buyButtonText: { color: 'white', fontWeight: '700', fontSize: 16 }
});