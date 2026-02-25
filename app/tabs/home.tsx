import { View, Text, Pressable, Image, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { MapPinIcon, MagnifyingGlassIcon } from 'react-native-heroicons/solid';
import { AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconOutline } from 'react-native-heroicons/outline';
import { theme } from '../../constants/theme';
import MapboxGL from "@rnmapbox/maps";
import * as Location from 'expo-location';
import { useAudioPlayer } from 'expo-audio';
import { FilterBottomSheet } from '../../components/FilterBottomSheet';
import { supabase } from '../../lib/supabase';
import { useGeneralStore } from '../store/generalStore';
import { useEventStore } from '../store/eventStore';
import MapEventCard from '@/components/home/MapEventCard';
import { useFilterStore } from '../store/filterStore';
import { useFilteredEvents } from '../../hooks/useFilteredEvents';

const MAPBOX_ACCESS_TOKEN = "sk.eyJ1Ijoiam9ubnkyMDA1IiwiYSI6ImNtZ3R0MDVwODA3MTMyanI3eTRiM2k0bHEifQ.JDKw4aOqKw_UNLKok4gvOQ";

MapboxGL.setAccessToken("sk.eyJ1Ijoiam9ubnkyMDA1IiwiYSI6ImNtZ3R0MDVwODA3MTMyanI3eTRiM2k0bHEifQ.JDKw4aOqKw_UNLKok4gvOQ");

const MAP_STYLE_DARK = "mapbox://styles/jonny2005/cmiag4rgh00eb01s90y2r7qw0";
const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";

/** 6am–6pm: Light | 6pm–6am: Dark */
const getMapStyleForHour = (hour: number) =>
  hour >= 6 && hour < 18 ? MAP_STYLE_LIGHT : MAP_STYLE_DARK;

export default function HomeScreen() {
  // Zustand Stores
  const { searchQuery, setSearchQuery, userLocation, setUserLocation } = useGeneralStore();
  const { events, setEvents, loadingEvents, setLoadingEvents, selectedEvent, setSelectedEvent } = useEventStore();
  const { filterVisible, setFilterVisible } = useFilterStore();
  const filteredEvents = useFilteredEvents();

  const [mapStyleUrl, setMapStyleUrl] = useState(() =>
    getMapStyleForHour(new Date().getHours())
  );

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const flightPlayer = useAudioPlayer(require('../../assets/flight.mp3'));

  const BERLIN_COORDS = { latitude: 52.520008, longitude: 13.404954 };

  //Prefetch marker images so they appear immediately
  useEffect(() => {
    if (!events?.length) return;
    events.forEach((ev) => {
      const url = ev?.image_urls?.[0];
      if (url) {
        Image.prefetch(url);
      }
    });
  }, [events]);


  // Map-Style: 6am–6pm Light, 6pm–6am Dark
  useEffect(() => {
    const updateStyle = () => {
      const next = getMapStyleForHour(new Date().getHours());
      setMapStyleUrl((prev) => (prev !== next ? next : prev));
    };
    updateStyle();
    const id = setInterval(updateStyle, 60000); // jede Minute prüfen
    return () => clearInterval(id);
  }, []);

  // ============================
  // Nutzerposition holen
  // ============================
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUserLocation(BERLIN_COORDS);
          return;
        }

        // Erstposition
        const loc = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        };

        setUserLocation(coords);

        // Live-Tracking
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
          (newLoc) => {
            setUserLocation({
              latitude: newLoc.coords.latitude,
              longitude: newLoc.coords.longitude
            });
          }
        );
      } catch (e) {
        setUserLocation(BERLIN_COORDS);
      }
    };

    start();
    return () => sub?.remove();
  }, []);

  // ============================
  // Supabase: Events laden basierend auf Map-Bounds
  // ============================
  const fetchEventsInBounds = async (bounds: any) => {
    if (!bounds) return;

    // bounds: [[lng1, lat1], [lng2, lat2]]
    const [[lng1, lat1], [lng2, lat2]] = bounds;

    const swLat = Math.min(lat1, lat2);
    const neLat = Math.max(lat1, lat2);
    const swLng = Math.min(lng1, lng2);
    const neLng = Math.max(lng1, lng2);

    setLoadingEvents(true);

    const { data, error } = await supabase.rpc("get_events_in_bounds", {
      sw_lat: swLat,
      sw_lng: swLng,
      ne_lat: neLat,
      ne_lng: neLng,
    });

    if (error) {
      console.error("RPC Fehler get_events_in_bounds:", error);
    } else {
      setEvents(data ?? []);
    }

    setLoadingEvents(false);
  };

  // Wenn sich die Map bewegt → neue Events laden
  const handleRegionChange = async () => {
    try {
      const bounds = await mapRef.current?.getVisibleBounds();
      if (bounds) fetchEventsInBounds(bounds);
    } catch (e) {
      console.log("bounds error", e);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      cameraRef.current?.setCamera({
        centerCoordinate: [selectedEvent.location_lng, selectedEvent.location_lat - 0.0015],
        zoomLevel: 15,
        animationDuration: 500,
      });
    }
  }, [selectedEvent]);

  // ============================
  // Fluggeräusch & Locate Button
  // ============================
  const playFlightSound = () => {
    try {
      flightPlayer.seekTo(0);
      flightPlayer.play();
    } catch { }
  };

  const handleLocatePress = () => {
    if (!userLocation) return;
    //playFlightSound();
    cameraRef.current?.setCamera({
      centerCoordinate: [userLocation.longitude, userLocation.latitude],
      zoomLevel: 15,
      animationDuration: 1000,
    });
  };

  // ============================
  // 🔎 Suche über Mapbox Geocoding
  // ============================
  const searchCity = async (city: string) => {
    if (!city.trim()) return;

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );

    const data = await res.json();
    if (!data.features?.length) return;

    const [lng, lat] = data.features[0].center;

    //playFlightSound();
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 12,
      animationDuration: 1500,
    });

    Keyboard.dismiss();
  };

  // ==================================
  // RENDER
  // ==================================

  return (
    <View className="flex-1 bg-white">

      {/* MAP */}
      {/* ADD mapReady && Map (Component) */}
      <MapboxGL.MapView
        ref={mapRef}
        style={{ flex: 1 }}
        styleURL={mapStyleUrl}
        onMapIdle={handleRegionChange}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        rotateEnabled={false}
        onPress={() => setSelectedEvent(null)}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={14}
          centerCoordinate={
            userLocation
              ? [userLocation.longitude, userLocation.latitude]
              : [13.404954, 52.520008]
          }
          animationMode="flyTo"
          animationDuration={1000}
        />

        <MapboxGL.UserLocation visible={true} showsUserHeadingIndicator={true} />

        {/* ⭐ EVENT MARKER */}
        {filteredEvents.map((event) => (
          <MapboxGL.MarkerView
            key={event.id}
            id={event.id}
            coordinate={[event.location_lng, event.location_lat]}
            allowOverlap={true}

          >
            <Pressable onPress={() => setSelectedEvent(event)}>
              <View
                style={{
                  width: selectedEvent?.id === event.id ? 56 : 44,
                  height: selectedEvent?.id === event.id ? 56 : 44,
                  borderRadius: selectedEvent?.id === event.id ? 28 : 22,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: 'white',
                  backgroundColor: '#eee',
                  transform: [{ scale: selectedEvent?.id === event.id ? 1.15 : 1 }],
                  shadowColor: '#000',
                  shadowOpacity: selectedEvent?.id === event.id ? 0.35 : 0.2,
                  shadowRadius: selectedEvent?.id === event.id ? 6 : 3,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: selectedEvent?.id === event.id ? 8 : 4,
                }}
              >
                <Image
                  source={{ uri: event.image_urls?.[0] }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Logo zentral oben */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 items-center" style={{ zIndex: 10, top: -12 }}>
        <Image
          source={require('../../assets/N8LY9.png')}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />
      </SafeAreaView>

      {/* Filter */}
      <SafeAreaView edges={['top']} className="absolute top-0 right-0" style={{ zIndex: 10 }}>
        <View className="p-5 pt-6">
          <Pressable
            className="w-12 h-12 rounded-2xl justify-center items-center shadow-lg bg-white"
            style={{ backgroundColor: theme.colors.neutral.gray[50] }}
            onPress={() => setFilterVisible(true)}
          >
            <AdjustmentsHorizontalIconOutline size={24} color="black" />
          </Pressable>
        </View>
      </SafeAreaView>

      {selectedEvent && <MapEventCard selectedEvent={selectedEvent} />}

      {/* Locate Button */}
      <View className="absolute bottom-32 left-5" style={{ zIndex: 10 }}>
        <Pressable
          className="w-14 h-14 rounded-full justify-center items-center shadow-xl"
          style={{ backgroundColor: theme.colors.primary.main2 }}
          onPress={handleLocatePress}
        >
          <MapPinIcon size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Suche */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0" style={{ zIndex: 5 }}>
        <View className="px-5 pb-2 mb-1">
          <View className="flex-row items-center bg-white rounded-full px-5 py-4 shadow-xl space-x-10">
            <MagnifyingGlassIcon size={22} color={theme.colors.neutral.gray[500]} />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="Wohin möchtest du?"
              placeholderTextColor={theme.colors.neutral.gray[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                searchCity(searchQuery);
                setSearchQuery('');
              }}
              style={{ fontFamily: 'Manrope_400Regular' }}
            />
          </View>
        </View>
      </SafeAreaView>

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={() => { }}
        onReset={() => { }}
      />
    </View>
  );
}