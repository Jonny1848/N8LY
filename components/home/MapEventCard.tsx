import { View, Text, Pressable, StyleSheet, Animated, Easing, Image } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router';

const MapEventCard = ({ selectedEvent }: any) => {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const formatEventDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d) + ' Uhr';
  };

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ translateY }] }]}>
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push(`/event/${selectedEvent.id}`)
      }
    >
      {selectedEvent?.image_urls?.[0] && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: encodeURI(selectedEvent.image_urls[0]) }}
            style={styles.image}
          />
          <View style={styles.imageFade} />
        </View>
      )}
      <Text style={styles.cardTitle}>
        {selectedEvent?.title} @ {selectedEvent?.venue_name}
      </Text>

      <Text style={styles.cardMeta}>
        {formatEventDate(selectedEvent?.date)}
      </Text>

    </Pressable>
  </Animated.View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    bottom: 110, // sits above the search bar
    left: 20,
    right: 20,
    zIndex: 20,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  imageWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  cardMeta: {
    marginTop: 4,
    color: '#666',
  }
})

export default MapEventCard