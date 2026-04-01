/**
 * Uebersicht aller Draft-Clips vor dem Teilen: Thumbnails, Bearbeiten, Entfernen, Massen-Upload.
 */
import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../../../stores/useAuthStore';
import { useStoryDraftStore } from '../../../stores/useStoryDraftStore';
import { publishStoryDrafts } from '../../../services/publishStoryDrafts';

const THUMB = 72;

export default function StoryReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const clips = useStoryDraftStore((s) => s.clips);
  const removeClip = useStoryDraftStore((s) => s.removeClip);
  const clearDraft = useStoryDraftStore((s) => s.clearDraft);

  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const openEditor = (clipId) => {
    router.push({ pathname: '/stories/create/editor', params: { clipId } });
  };

  const addMore = () => {
    router.push('/stories/create');
  };

  const onShare = async () => {
    if (!userId || clips.length === 0) return;
    try {
      setPosting(true);
      setProgress({ done: 0, total: clips.length });
      await publishStoryDrafts(userId, clips, {
        onClipDone: (done, total) => setProgress({ done, total }),
      });
      clearDraft();
      // Gesamten Create-Flow schliessen und zur Social-Tab mit Story-Ring zurueck
      router.replace('/tabs/social');
    } catch (e) {
      console.error('[STORY REVIEW]', e);
      Alert.alert('Story', 'Upload ist fehlgeschlagen.', [{ text: 'OK' }]);
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Zurueck</Text>
        </Pressable>
        <Text style={styles.title}>Deine Story</Text>
        <View style={{ width: 64 }} />
      </View>

      <Text style={styles.sub}>
        {clips.length} {clips.length === 1 ? 'Slide' : 'Slides'} – 24h sichtbar
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
        {clips.map((c) => (
          <View key={c.id} style={styles.thumbWrap}>
            <Pressable onPress={() => openEditor(c.id)}>
              {c.kind === 'video' ? (
                <View style={[styles.thumb, styles.thumbVideo]}>
                  <Text style={styles.videoLbl}>Video</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: c.exportUri || c.localUri }}
                  style={styles.thumb}
                />
              )}
            </Pressable>
            <Pressable onPress={() => removeClip(c.id)} style={styles.rm}>
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
        style={[styles.share, (posting || clips.length === 0) && styles.shareOff]}
      >
        <Text style={styles.shareTxt}>Zu deiner Story teilen</Text>
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
  sub: { color: '#999', paddingHorizontal: 16, marginBottom: 12, fontFamily: 'Manrope_400Regular' },
  strip: { flexGrow: 0, paddingHorizontal: 12, marginBottom: 24 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb: {
    width: THUMB,
    height: THUMB * (16 / 9),
    borderRadius: 10,
    backgroundColor: '#333',
  },
  thumbVideo: { alignItems: 'center', justifyContent: 'center' },
  videoLbl: { color: '#fff', fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  addMore: {
    borderWidth: 2,
    borderColor: '#555',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreTxt: { color: '#888', fontSize: 32, fontFamily: 'Manrope_400Regular' },
  rm: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  progress: { alignItems: 'center', marginBottom: 16 },
  progressTxt: { color: '#ccc', marginTop: 8, fontFamily: 'Manrope_400Regular' },
  share: {
    marginHorizontal: 16,
    marginBottom: Math.max(24, Dimensions.get('window').height * 0.04),
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#5b8cff',
    alignItems: 'center',
  },
  shareOff: { opacity: 0.45 },
  shareTxt: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 17 },
});
