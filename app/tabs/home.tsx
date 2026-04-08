import {
  View,
  Pressable,
  Image,
  TextInput,
  Keyboard,
  useWindowDimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { MapPinIcon } from 'react-native-heroicons/solid';
import {
  AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconOutline,
  XMarkIcon as XMarkIconOutline,
} from 'react-native-heroicons/outline';
import {MagnifyingGlassIcon} from 'react-native-heroicons/solid';
import { theme, getMapChromeIconColor } from '../../constants/theme';
import MapboxGL from "@rnmapbox/maps";
import * as Location from 'expo-location';
import { useAudioPlayer } from 'expo-audio';
import { FilterBottomSheet } from '../../components/FilterBottomSheet';
import { supabase } from '../../lib/supabase';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';

// Mapbox Access Token aus Umgebungsvariable lesen (definiert in .env)
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
// Nur bei gesetztem Token registrieren (leerer String am Modul-Anfang kann Native-Seite instabil machen)
if (MAPBOX_ACCESS_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

const MAP_STYLE_DARK = "mapbox://styles/jonny2005/cmiag4rgh00eb01s90y2r7qw0";
const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";

/** 6am–6pm: Light | 6pm–6am: Dark */
const getMapStyleForHour = (hour: number) =>
  hour >= 6 && hour < 18 ? MAP_STYLE_LIGHT : MAP_STYLE_DARK;

/**
 * Abstand vom unteren Rand bis unter die Suchleiste (volle schwebende Tab-Pille + Labels + iOS-Abstand).
 * Zu klein → Suche verschwindet unter der nativen Tab-Bar (die liegt immer über RN).
 */
const FLOATING_TAB_CLEARANCE_PT = 118;

const ICON_W = 22;
const SEARCH_HORIZONTAL_PAD = 20; // entspricht px-5

/** Spring: weich ineinander, nicht abrupt */
const SEARCH_SPRING = { damping: 20, stiffness: 260, mass: 0.9 } as const;

/** Standort & zugeklappte Suche: gleicher Kreisdurchmesser (beide „perfekt rund“) */
const LOCATE_BTN_SIZE = 56;
/** Sichtbarer Abstand zwischen den zwei getrennten GlassViews (kein Liquid-Merge) */
const GAP_LOCATE_SEARCH = 14;
/** Suchzeile aufgeklappt: Höhe der Kapsel */
const SEARCH_MORPH_EXPANDED_H = 52;
/**
 * Abstand Lupe → Textfeld (RN: `space-x-*` auf der Row greift oft nicht / kollidiert mit Reanimated-margins).
 */
const SEARCH_ICON_TO_INPUT_GAP = 20;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  /**
   * Map-Chrome links bündig zum Rand (nur Safe-Area), rechts klassisches Padding —
   * max. Suchbreite = Display minus diese Ränder.
   */
  const mapChromePadLeft = insets.left + 12;
  const mapChromePadRight = SEARCH_HORIZONTAL_PAD;
  const searchExpandedWidth = Math.max(
    0,
    windowWidth - mapChromePadLeft - mapChromePadRight
  );
  /** Such-Morph aufgeklappt: bis zum rechten Padding, nicht breiter als Fenster */
  const searchMorphMaxWidth = Math.max(LOCATE_BTN_SIZE, searchExpandedWidth);
  const canLiquidGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  /** Unterkante Such-UI: Safe Area + geschätzte Tab-Pille (schwebend) */
  const bottomInsetAboveTabBar = insets.bottom + FLOATING_TAB_CLEARANCE_PT;
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [logo, setLogo] = useState(() =>
    getMapStyleForHour(new Date().getHours()) === MAP_STYLE_LIGHT ? 
    require('../../assets/N8LY9.png') : require('../../assets/N8LY9.png'));
  const [mapStyleUrl, setMapStyleUrl] = useState(() =>
    getMapStyleForHour(new Date().getHours())
  );
  const mapIsLight = mapStyleUrl === MAP_STYLE_LIGHT;
  // Map-Buttons: neutral (Theme-Helper), nicht Markenblau — sonst zu viel Blau mit Logo + Tabs
  const glassChromeIconColor = getMapChromeIconColor(mapIsLight);
  /**
   * Suchfeld: bei heller Karte dunkle Schrift (Lesbarkeit auf hellem Glas),
   * bei dunkler Karte weiterhin hell.
   */
  const glassChromeInputTextColor = mapIsLight
    ? theme.colors.neutral.gray[900]
    : '#FFFFFF';
  const glassChromePlaceholderColor = mapIsLight
    ? theme.colors.neutral.gray[500]
    : theme.colors.neutral.gray[400];

  /** 0 = Kreis, 1 = Leiste — steuert Morph-Grenzen */
  const searchMorph = useSharedValue(0);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const flightPlayer = useAudioPlayer(require('../../assets/flight.mp3'), { updateInterval: 16 });

  /**
   * Zweites GlassView: zugeklappt gleicher Kreis wie Standort (56×56), aufgeklappt Kapsel.
   * borderRadius = min(w,h)/2 → Kreis bzw. Stadium-Enden.
   */
  const morphContainerStyle = useAnimatedStyle(() => {
    const w = interpolate(
      searchMorph.value,
      [0, 1],
      [LOCATE_BTN_SIZE, searchMorphMaxWidth],
      Extrapolation.CLAMP
    );
    const h = interpolate(
      searchMorph.value,
      [0, 1],
      [LOCATE_BTN_SIZE, SEARCH_MORPH_EXPANDED_H],
      Extrapolation.CLAMP
    );
    const r = Math.min(w, h) / 2;
    return { width: w, height: h, borderRadius: r };
  }, [searchMorphMaxWidth]);

  const iconLeadStyle = useAnimatedStyle(() => ({
    marginLeft: interpolate(
      searchMorph.value,
      [0, 1],
      [(LOCATE_BTN_SIZE - ICON_W) / 2, 12],
      Extrapolation.CLAMP
    ),
  }));

  const inputSlotStyle = useAnimatedStyle(() => ({
    flexGrow: interpolate(searchMorph.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    opacity: interpolate(searchMorph.value, [0, 0.22, 1], [0, 0, 1], Extrapolation.CLAMP),
    // Sichtbarer Zwischenraum erst wenn die Zeile aufgeht (zugeklappt = 0)
    marginLeft: interpolate(
      searchMorph.value,
      [0, 1],
      [0, SEARCH_ICON_TO_INPUT_GAP],
      Extrapolation.CLAMP
    ),
  }));

  const xSlotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchMorph.value, [0, 0.35, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(searchMorph.value, [0, 1], [0.65, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const BERLIN_COORDS = { latitude: 52.520008, longitude: 13.404954 };

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

  // Suchfeld nach Aufklappen fokussieren
  useEffect(() => {
    if (!searchExpanded) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [searchExpanded]);

  /**
   * Suche zuklappen (X oder nach abgeschlossener Ortssuche).
   */
  const collapseSearch = () => {
    searchMorph.value = withSpring(0, SEARCH_SPRING);
    setSearchExpanded(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const expandSearch = () => {
    searchMorph.value = withSpring(1, SEARCH_SPRING);
    setSearchExpanded(true);
  };

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
      /// console.log("Events aus Supabase:", data);
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

  // ============================
  // Fluggeräusch & Locate Button
  // ============================
  const playFlightSound = () => {
    try {
      flightPlayer.volume = 0.2;
      flightPlayer.seekTo(0);
      flightPlayer.play();
    } catch {}
  };

  const handleLocatePress = () => {
    if (!userLocation) return;
    playFlightSound();
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

    playFlightSound();
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 12,
      animationDuration: 1500,
    });

    Keyboard.dismiss();
    searchMorph.value = withSpring(0, SEARCH_SPRING);
    setSearchExpanded(false);
    setSearchQuery('');
  };

  // ==================================
  // RENDER
  // ==================================

  /** Inhalt des Such-GlassViews (Morph) — gleiche Zeile für Liquid-Glass und Blur */
  const mapSearchMorphInner = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={searchExpanded ? undefined : 'Suche öffnen'}
      style={{ flex: 1 }}
      pointerEvents={searchExpanded ? 'box-none' : 'auto'}
      onPress={() => {
        if (!searchExpanded) expandSearch();
      }}
    >
      <View className="flex-1 flex-row items-center">
        <Animated.View style={iconLeadStyle}>
          <MagnifyingGlassIcon size={ICON_W} color={glassChromeIconColor} />
        </Animated.View>
        <Animated.View style={inputSlotStyle}>
          <TextInput
            ref={searchInputRef}
            className="text-base"
            placeholder="Wohin möchtest du?"
            placeholderTextColor={glassChromePlaceholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            editable={searchExpanded}
            pointerEvents={searchExpanded ? 'auto' : 'none'}
            onSubmitEditing={() => {
              const q = searchQuery.trim();
              if (q) searchCity(q);
            }}
            style={{
              fontFamily: 'Manrope_400Regular',
              paddingVertical: 6,
              marginRight: 4,
              minWidth: 0,
              color: glassChromeInputTextColor,
            }}
          />
        </Animated.View>
        <Animated.View style={[xSlotStyle, { marginRight: 4 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Suche schließen"
            hitSlop={12}
            onPress={collapseSearch}
            className="p-1"
          >
            <XMarkIconOutline size={22} color={theme.colors.neutral.gray[600]} />
          </Pressable>
        </Animated.View>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-white">
      
      {/* MAP */}
      <MapboxGL.MapView
        ref={mapRef}
        style={{ flex: 1 }}
        styleURL={mapStyleUrl}
        onRegionDidChange={handleRegionChange}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
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
        {events.map((event) => (
          <MapboxGL.PointAnnotation
            key={event.id}
            id={event.id}
            coordinate={[event.location_lng, event.location_lat]}
          >
            <View className="w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Logo zentral oben */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 items-center" style={{ zIndex: 10, top: -12 }}>
        <Image
          source={logo}
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

      {/* Zwei getrennte runde GlassViews + Abstand — kein GlassContainer (sonst Liquid-Blob) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomInsetAboveTabBar,
          zIndex: 10,
          paddingLeft: mapChromePadLeft,
          paddingRight: mapChromePadRight,
          paddingBottom: 8,
          alignItems: 'flex-start',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 8,
        }}
        pointerEvents="box-none"
      >
        {canLiquidGlass ? (
          <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <GlassView
              glassEffectStyle="regular"
              isInteractive={false}
              colorScheme={mapIsLight ? 'light' : 'dark'}
              style={{
                width: LOCATE_BTN_SIZE,
                height: LOCATE_BTN_SIZE,
                borderRadius: LOCATE_BTN_SIZE / 2,
                overflow: 'hidden',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Karte auf Standort zentrieren"
                className="h-full w-full items-center justify-center"
                onPress={handleLocatePress}
              >
                <MapPinIcon size={24} color={glassChromeIconColor} />
              </Pressable>
            </GlassView>

            <Animated.View
              style={[
                morphContainerStyle,
                { overflow: 'hidden', marginTop: GAP_LOCATE_SEARCH },
              ]}
            >
              <GlassView
                glassEffectStyle="regular"
                isInteractive={false}
                colorScheme={mapIsLight ? 'light' : 'dark'}
                style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}
              >
                {mapSearchMorphInner}
              </GlassView>
            </Animated.View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 42 : 58}
              tint={mapIsLight ? 'light' : 'dark'}
              style={{
                width: LOCATE_BTN_SIZE,
                height: LOCATE_BTN_SIZE,
                borderRadius: LOCATE_BTN_SIZE / 2,
                overflow: 'hidden',
              }}
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: mapIsLight
                      ? 'rgba(255,255,255,0.28)'
                      : 'rgba(28,28,34,0.4)',
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Karte auf Standort zentrieren"
                className="h-full w-full items-center justify-center"
                onPress={handleLocatePress}
              >
                <MapPinIcon size={24} color={glassChromeIconColor} />
              </Pressable>
            </BlurView>

            <View style={{ height: GAP_LOCATE_SEARCH }} />

            <Animated.View
              style={[morphContainerStyle, { overflow: 'hidden' }]}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 42 : 58}
                tint={mapIsLight ? 'light' : 'dark'}
                style={{ width: '100%', height: '100%', overflow: 'hidden' }}
              >
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: mapIsLight
                        ? 'rgba(255,255,255,0.28)'
                        : 'rgba(28,28,34,0.4)',
                    },
                  ]}
                />
                {mapSearchMorphInner}
              </BlurView>
            </Animated.View>
          </View>
        )}
      </View>

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={() => {}}
        onReset={() => {}}
      />
    </View>
  );
}