import { View, Text, Pressable, Animated, Easing, Image } from 'react-native'
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
    <Animated.View style={{ transform: [{ translateY }] }} className="absolute bottom-[110px] left-5 right-5 z-20">
      <Pressable
        className="bg-white rounded-2xl p-4 shadow-black shadow-opacity-15 shadow-lg elevation-5"
        onPress={() =>
          router.push(`/event/${selectedEvent.id}`)
        }
      >
        {selectedEvent?.image_urls?.[0] && (
          <View className="w-full h-[140px] rounded-xl overflow-hidden mb-2.5">
            <Image
              source={{ uri: encodeURI(selectedEvent.image_urls[0]) }}
              className="w-full h-full"
            />
            <View className="absolute inset-0 bg-black bg-opacity-15" />
          </View>
        )}
        <Text className="text-lg font-extrabold">
          {selectedEvent?.title} @ {selectedEvent?.venue_name}
        </Text>

        <Text className="mt-1 text-gray-600">
          {formatEventDate(selectedEvent?.date)}
        </Text>

      </Pressable>
    </Animated.View>
  )
}

export default MapEventCard