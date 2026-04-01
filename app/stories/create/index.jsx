/**
 * Story Capture – Einstieg: Vollbild-Kamera + Galerie (Mehrfachauswahl moeglich).
 * Neue Medien landen im Draft-Store; Navigation zum Editor bzw. Review bei Bulk.
 */
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import StoryCamera from '../../../components/stories/StoryCamera';
import { useStoryDraftStore } from '../../../stores/useStoryDraftStore';

export default function StoryCaptureScreen() {
  const router = useRouter();
  const addClip = useStoryDraftStore((s) => s.addClip);

  const goEditor = (clipId) => {
    router.push({ pathname: '/stories/create/editor', params: { clipId } });
  };

  const onCaptured = ({ uri, kind, mimeType }) => {
    const clipId = addClip({ localUri: uri, kind, mimeType });
    goEditor(clipId);
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Galerie', 'Bitte erlaube Zugriff auf Fotos und Videos.', [{ text: 'OK' }]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      const assets = result.assets;
      let firstId = null;
      assets.forEach((asset, idx) => {
        const isVideo = asset.type === 'video';
        const mime = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
        const id = addClip({
          localUri: asset.uri,
          kind: isVideo ? 'video' : 'photo',
          mimeType: mime,
        });
        if (idx === 0) firstId = id;
      });

      if (assets.length === 1) {
        goEditor(firstId);
      } else {
        router.push('/stories/create/review');
      }
    } catch (e) {
      console.error('[STORY CAPTURE] Galerie', e);
      Alert.alert('Galerie', 'Auswahl nicht moeglich.', [{ text: 'OK' }]);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <StoryCamera
        onCaptured={onCaptured}
        onOpenGallery={openGallery}
        onClose={() => router.back()}
      />
    </View>
  );
}
