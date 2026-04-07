/**
 * Uebersicht aller Draft-Clips vor dem Teilen:
 * - Grosse Vorschau im Quer-Swipe (jeweils ein Slide, Story-Kantverhaeltnis)
 * - Kompakte Thumbnail-Leiste zum Springen, Bearbeiten, Entfernen
 * - Massen-Upload beim Teilen
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { theme } from '../../../constants/theme';
import useAuthStore from '../../../stores/useAuthStore';
import { useStoryDraftStore } from '../../../stores/useStoryDraftStore';
import { publishStoryDrafts } from '../../../services/publishStoryDrafts';

const THUMB = 56;
/**
 * Jede Vorschau (Bild/Video) einzeln abrunden — wie Story-Karte im Editor (STORY_CARD_RADIUS).
 * overflow: 'hidden' auf dem Wrapper clippt zuverlaessiger als nur borderRadius am Image/VideoView.
 */
const SLIDE_CORNER_RADIUS = 18;

/**
 * Video-Slide: Rundung kommt vom aeusseren slideCard-View (wie StoryEditorCanvas).
 */
function ReviewVideoSlide({ uri, width, height }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="cover"
      nativeControls
    />
  );
}

export default function StoryReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const userId = useAuthStore((s) => s.userId);
  const clips = useStoryDraftStore((s) => s.clips);
  const removeClip = useStoryDraftStore((s) => s.removeClip);
  const clearDraft = useStoryDraftStore((s) => s.clearDraft);

  const listRef = useRef(/** @type {FlatList | null} */ (null));
  /** Merkt sich die letzte Clip-Id-Signatur, um den Pager nur bei Datenwechsel zu syncen (nicht beim Swipe) */
  const prevClipIdsSig = useRef('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Jede Seite = volle Fensterbreite (Paging); Karte etwas schmaler mit Seitenabstand
  const pageWidth = windowW;
  const cardHorizontalPad = 16;
  const cardW = Math.max(0, pageWidth - cardHorizontalPad * 2);
  /** 9:16 Story-Portraet: Hoehe = Breite * 16/9 (wie im Editor) */
  const cardH = cardW * (16 / 9);

  /** Nach Loeschen: Index begrenzen */
  useEffect(() => {
    if (clips.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((i) => Math.min(i, clips.length - 1));
  }, [clips.length]);

  /**
   * Nur wenn sich die Clip-Menge/Reihenfolge aendert (z. B. Loeschen): Pager ohne Animation
   * auf den aktiven Index setzen. Nicht bei jedem Swipe — sonst wuerde das den Wisch ruckeln.
   */
  const clipIdsSig = clips.map((c) => c.id).join('|');
  useEffect(() => {
    if (clipIdsSig === prevClipIdsSig.current) return;
    prevClipIdsSig.current = clipIdsSig;
    if (clips.length === 0 || !listRef.current) return;
    const idx = Math.min(activeIndex, clips.length - 1);
    listRef.current.scrollToOffset({ offset: idx * pageWidth, animated: false });
  }, [clipIdsSig, clips.length, activeIndex, pageWidth]);

  const openEditor = useCallback(
    (clipId) => {
      router.push({ pathname: '/stories/create/editor', params: { clipId } });
    },
    [router]
  );

  const addMore = () => {
    router.push('/stories/create');
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

  /** Wenn User durch die grosse Vorschau wischt: aktiven Slide merken */
  const onPagerScrollEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / pageWidth);
      if (idx >= 0 && idx < clips.length) setActiveIndex(idx);
    },
    [pageWidth, clips.length]
  );

  /** Thumbnail antippen: zur gleichen Seite im Pager springen */
  const jumpToIndex = useCallback(
    (index) => {
      setActiveIndex(index);
      listRef.current?.scrollToOffset({ offset: index * pageWidth, animated: true });
    },
    [pageWidth]
  );

  const renderSlide = useCallback(
    ({ item: c }) => (
      <View style={[styles.page, { width: pageWidth }]}>
        {/*
          Wie StoryEditorCanvas: zuerst normales View mit overflow + borderRadius + collapsable={false}.
          Pressable NICHT als aeusserster Kasten — auf iOS clippt RNGH/Pressable die Kinder sonst oft nicht.
          Pressable nur innen, fuellt die Karte.
        */}
        <View
          style={[styles.slideCard, { width: cardW, height: cardH }]}
          collapsable={false}
        >
          <Pressable
            onPress={() => openEditor(c.id)}
            style={styles.slidePressFill}
            accessibilityRole="button"
            accessibilityLabel="Clip bearbeiten"
          >
            {/*
              Zusaetzliches Clip-View um das Medium: manche RN-Versionen clippen expo-image
              nicht zuverlaessig, wenn der direkte Parent ein Pressable ist.
            */}
            <View style={styles.slideInnerClip} collapsable={false}>
              {c.kind === 'video' ? (
                <ReviewVideoSlide uri={c.localUri} width={cardW} height={cardH} />
              ) : (
                <ExpoImage
                  source={{ uri: c.exportUri || c.localUri }}
                  style={{ width: cardW, height: cardH }}
                  contentFit="cover"
                  transition={120}
                />
              )}
            </View>
          </Pressable>
        </View>
      </View>
    ),
    [pageWidth, cardW, cardH, openEditor]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Zurück</Text>
        </Pressable>
        <Text style={styles.title}>Deine Story</Text>
        <View style={{ width: 64 }} />
      </View>

      <Text style={styles.sub}>
        {clips.length} {clips.length === 1 ? 'Slide' : 'Slides'} – 24h sichtbar
        {clips.length > 0 ? ` · ${activeIndex + 1}/${clips.length}` : ''}
      </Text>

      {/* Eine grosse Vorschau pro Seite, seitliches Wischen */}
      {clips.length > 0 ? (
        <View style={styles.pagerHost}>
          <FlatList
            ref={listRef}
            data={clips}
            keyExtractor={(c) => c.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            renderItem={renderSlide}
            onMomentumScrollEnd={onPagerScrollEnd}
            /* Sonst koennen abgerundete Child-Views auf Android beim Scrollen abgeschnitten wirken */
            removeClippedSubviews={false}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
          />
        </View>
      ) : (
        <View style={styles.pagerEmpty}>
          <Text style={styles.pagerEmptyTxt}>Noch keine Slides – füge Fotos oder Videos hinzu.</Text>
        </View>
      )}

      {/* Kompakte Thumbnail-Leiste: Auswahl + Bearbeiten + Entfernen */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
        {clips.map((c, i) => (
          <View key={c.id} style={styles.thumbWrap}>
            <Pressable
              onPress={() => jumpToIndex(i)}
              style={[styles.thumbPress, i === activeIndex && styles.thumbPressActive]}
            >
              {c.kind === 'video' ? (
                <View style={[styles.thumb, styles.thumbVideo]}>
                  <Text style={styles.videoLbl}>Video</Text>
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

      <Pressable
        onPress={onShare}
        disabled={posting || clips.length === 0 || !userId}
        style={[
          styles.share,
          (posting || clips.length === 0) && styles.shareOff,
          { marginBottom: Math.max(16, insets.bottom + 8) },
        ]}
      >
        {/* Gleicher Verlauf wie Onboarding „Weiter“ (bio.jsx), Inhalt bleibt der Story-CTA-Text */}
        <LinearGradient
          colors={[theme.colors.primary.main, theme.colors.primary.main2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.shareGradient}
        >
          <Text style={styles.shareTxt}>Zu deiner Story teilen</Text>
        </LinearGradient>
      </Pressable>
    </View>
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
  link: { color: '#7eb6ff', fontFamily: 'Manrope_600SemiBold' },
  title: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 17 },
  sub: { color: '#999', paddingHorizontal: 16, marginBottom: 8, fontFamily: 'Manrope_400Regular' },
  /** Nimmt den Platz zwischen Infozeile und Thumbnails ein */
  pagerHost: {
    flex: 1,
    minHeight: 200,
  },
  pagerEmpty: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  pagerEmptyTxt: { color: '#888', textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Gleiches Clipping-Muster wie StoryEditorCanvas.box */
  slideCard: {
    alignSelf: 'center',
    borderRadius: SLIDE_CORNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  /** Fuellt slideCard */
  slidePressFill: {
    width: '100%',
    height: '100%',
  },
  /** Direkter Container um Bild/Video — masksToBounds-/Clip-Kette wie bei nativer UIImageView */
  slideInnerClip: {
    width: '100%',
    height: '100%',
    borderRadius: SLIDE_CORNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  strip: { flexGrow: 0, paddingHorizontal: 12, marginTop: 12, marginBottom: 12 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  /** Aktives Thumbnail leicht hervorgehoben, damit klar ist welches Slide gross ist */
  thumbPress: { borderRadius: 10, padding: 2 },
  thumbPressActive: {
    borderWidth: 2,
    borderColor: '#5b8cff',
  },
  thumb: {
    width: THUMB,
    height: THUMB * (16 / 9),
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbVideo: { alignItems: 'center', justifyContent: 'center' },
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
