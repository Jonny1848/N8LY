/**
 * Uebersicht aller Draft-Clips vor dem Teilen:
 * - Grosse Vorschau (jeweils ein Slide, Story-Kantverhältnis 9:16)
 * - Swipe links/rechts (Gesture.Pan) oder Thumbnail-Tap zum Blaettern
 * - Kompakte Thumbnail-Leiste zum Springen, Bearbeiten, Entfernen
 * - Massen-Upload beim Teilen
 *
 * HINWEIS: Kein horizontaler ScrollView/FlatList als Pager — auf iOS (Fabric/New Arch,
 * RN 0.81) wird borderRadius in horizontalen pagingEnabled-ScrollViews ignoriert.
 * Stattdessen zeigen wir nur das aktive Slide und unterstuetzen Swipe via
 * react-native-gesture-handler.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { VideoCameraIcon } from 'react-native-heroicons/solid';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { theme } from '../../../../constants/theme';
import useAuthStore from '../../../../stores/useAuthStore';
import { useStoryDraftStore } from '../../../../stores/useStoryDraftStore';
import { publishStoryDrafts } from '../../../../services/publishStoryDrafts';

const THUMB = 56;
const SLIDE_CORNER_RADIUS = 18;
/** Mindest-Swipe-Distanz (px) bevor ein Slide-Wechsel ausgelöst wird */
const SWIPE_THRESHOLD = 50;

/**
 * Video-Slide: wrapper View clippt das native Video-Layer.
 */
function ReviewVideoSlide({ uri, width, height, slideStyle }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={slideStyle}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}

export default function StoryReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const userId = useAuthStore((s) => s.userId);
  const clips = useStoryDraftStore((s) => s.clips);
  const removeClip = useStoryDraftStore((s) => s.removeClip);
  const clearDraft = useStoryDraftStore((s) => s.clearDraft);

  const [activeIndex, setActiveIndex] = useState(0);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  /* Swipe-Offset fuer die Slide-Animation */
  const translateX = useSharedValue(0);

  const cardHorizontalPad = 16;
  const maxCardW = Math.max(0, windowW - cardHorizontalPad * 2);

  /**
   * Verfuegbare Hoehe fuer das Slide-Bild:
   * Bildschirmhoehe minus Header, Sub, Thumbnail-Leiste, Abstand, Share, Safe-Area.
   */
  const HEADER_H = 54;
  const SUB_H = 28;
  const GAP = 20;
  const THUMB_AREA_H = 130;
  const SHARE_H = 70;
  const availableH = windowH - insets.top - HEADER_H - SUB_H - GAP - THUMB_AREA_H - SHARE_H - insets.bottom;

  const idealH = maxCardW * (16 / 9);
  const cardH = Math.min(idealH, Math.max(200, availableH));
  const cardW = Math.min(maxCardW, cardH * (9 / 16));

  /**
   * Einzelnes StyleSheet-Objekt via useMemo — Fabric ignoriert borderRadius
   * in style-Arrays und horizontalen ScrollViews.
   */
  const slideStyle = useMemo(
    () =>
      StyleSheet.create({
        s: {
          width: cardW,
          height: cardH,
          borderRadius: SLIDE_CORNER_RADIUS,
          overflow: 'hidden',
          backgroundColor: '#333',
        },
      }).s,
    [cardW, cardH]
  );

  /** Nach Löschen: Index begrenzen */
  useEffect(() => {
    if (clips.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((i) => Math.min(i, clips.length - 1));
  }, [clips.length]);

  const openEditor = useCallback(
    (clipId) => {
      router.push({ pathname: '/chat/stories/create/editor', params: { clipId } });
    },
    [router]
  );

  const addMore = () => {
    router.push('/chat/stories/create');
  };

  /** Clip entfernen und aktiven Index konsistent halten */
  const onRemoveClip = useCallback(
    (id) => {
      const idx = clips.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const nextLen = clips.length - 1;
      removeClip(id);
      setActiveIndex((prev) => {
        if (nextLen === 0) return 0;
        if (idx < prev) return prev - 1;
        if (idx === prev) return Math.min(prev, nextLen - 1);
        return prev;
      });
    },
    [clips, removeClip]
  );

  const onShare = async () => {
    if (!userId || clips.length === 0) return;
    try {
      setPosting(true);
      setProgress({ done: 0, total: clips.length });
      await publishStoryDrafts(userId, clips, {
        onClipDone: (done, total) => setProgress({ done, total }),
      });
      clearDraft();
      router.replace('/tabs/social');
    } catch (e) {
      console.error('[STORY REVIEW]', e);
      Alert.alert('Story', 'Upload ist fehlgeschlagen.', [{ text: 'OK' }]);
    } finally {
      setPosting(false);
    }
  };

  /* ── Swipe + Tap Gesten ── */

  const goNext = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, clips.length - 1));
  }, [clips.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  /** Horizontaler Pan: Slide-Wechsel bei genuegend Distanz, sonst zurueckschnappen */
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .onUpdate((e) => {
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          if (e.translationX < -SWIPE_THRESHOLD && activeIndex < clips.length - 1) {
            runOnJS(goNext)();
          } else if (e.translationX > SWIPE_THRESHOLD && activeIndex > 0) {
            runOnJS(goPrev)();
          }
          translateX.value = withTiming(0, { duration: 200 });
        }),
    [activeIndex, clips.length, goNext, goPrev, translateX]
  );

  /** Single-Tap oeffnet den Editor */
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd((_e, success) => {
          if (success && clips[activeIndex]) {
            runOnJS(openEditor)(clips[activeIndex].id);
          }
        }),
    [activeIndex, clips, openEditor]
  );

  /** Pan hat Vorrang vor Tap */
  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture]
  );

  const slideAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  /** Thumbnail antippen: direkt zu dem Slide springen */
  const jumpToIndex = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const activeClip = clips[activeIndex];

  return (
    <GestureHandlerRootView style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <ChevronLeftIcon size={28} color={theme.colors.primary.main3} />
        </Pressable>
        <Text style={styles.title}>Deine Story</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.sub}>
        {clips.length} {clips.length === 1 ? 'Slide' : 'Slides'}
        {clips.length > 0 ? ` · ${activeIndex + 1}/${clips.length}` : ''}
      </Text>

      {/* ── Grosse Vorschau des aktiven Slides ── */}
      {activeClip ? (
        <View style={styles.pagerHost}>
          <View style={styles.page}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={slideAnimStyle}>
                {activeClip.kind === 'video' ? (
                  <ReviewVideoSlide
                    uri={activeClip.localUri}
                    width={cardW}
                    height={cardH}
                    slideStyle={slideStyle}
                  />
                ) : (
                  <Image
                    source={{ uri: activeClip.exportUri || activeClip.localUri }}
                    style={slideStyle}
                    resizeMode="cover"
                  />
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      ) : (
        <View style={styles.pagerEmpty}>
          <Text style={styles.pagerEmptyTxt}>Noch keine Slides – füge Fotos oder Videos hinzu.</Text>
        </View>
      )}

      {/* ── Kompakte Thumbnail-Leiste ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
        {clips.map((c, i) => (
          <View key={c.id} style={styles.thumbWrap}>
            <Pressable
              onPress={() => jumpToIndex(i)}
              style={[styles.thumbPress, i === activeIndex && styles.thumbPressActive]}
            >
              {c.kind === 'video' ? (
                <View style={[styles.thumb, styles.thumbVideo]}>
                  <VideoCameraIcon size={24} color="#fff" />
                </View>
              ) : (
                <Image source={{ uri: c.exportUri || c.localUri }} style={styles.thumb} />
              )}
            </Pressable>
            <Pressable onPress={() => onRemoveClip(c.id)} style={styles.rm}>
              <Text style={styles.rmTxt}>×</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addMore} style={[styles.thumb, styles.addMore]}>
          <Text style={styles.addMoreTxt}>+</Text>
        </Pressable>
      </ScrollView>

      {posting ? (
        <View style={styles.progress}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.progressTxt}>
            Lade hoch {progress.done}/{progress.total}…
          </Text>
        </View>
      ) : null}

      {/* ── Share-Button ── */}
      <Pressable
        onPress={onShare}
        disabled={posting || clips.length === 0 || !userId}
        style={[
          styles.share,
          (posting || clips.length === 0) && styles.shareOff,
          { marginBottom: Math.max(16, insets.bottom + 8) },
        ]}
      >
        <LinearGradient
          colors={[theme.colors.primary.main, theme.colors.primary.main2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.shareGradient}
        >
          <Text style={styles.shareTxt}>Veröffentlichen</Text>
        </LinearGradient>
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  title: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 17 },
  sub: { color: '#999', paddingHorizontal: 16, marginBottom: 8, fontFamily: 'Manrope_400Regular' },
  pagerHost: {
    flexShrink: 1,
    flexGrow: 1,
  },
  pagerEmpty: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  pagerEmptyTxt: { color: '#888', textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* paddingTop fuer den absolute X-Button (top: -4), marginTop fuer Abstand zum Bild */
  strip: { flexGrow: 0, paddingHorizontal: 12, paddingTop: 8, marginTop: 16, marginBottom: 12 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumbPress: { borderRadius: 10, padding: 2 },
  thumbPressActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary.main,
  },
  thumb: {
    width: THUMB,
    height: THUMB * (16 / 9),
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbVideo: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent.main},
  videoLbl: { color: '#fff', fontFamily: 'Manrope_600SemiBold', fontSize: 10 },
  addMore: {
    borderWidth: 2,
    borderColor: '#555',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreTxt: { color: '#888', fontSize: 28, fontFamily: 'Manrope_400Regular' },
  rm: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  progress: { alignItems: 'center', marginBottom: 12 },
  progressTxt: { color: '#ccc', marginTop: 8, fontFamily: 'Manrope_400Regular' },
  share: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareOff: { opacity: 0.45 },
  shareTxt: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 17 },
});
