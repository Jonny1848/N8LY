/**
 * Story-Viewer – zeigt alle aktiven Stories eines Nutzers, markiert Aufrufe in story_views.
 */
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { Image } from 'expo-image';
import useAuthStore from '../../stores/useAuthStore';
import { getActiveStories, markStoryAsViewed } from '../../services/storyService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const raw = useLocalSearchParams().userId;
  const authorUserId = Array.isArray(raw) ? raw[0] : raw;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.userId);

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [headerName, setHeaderName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUserId || !authorUserId) {
        setLoading(false);
        return;
      }
      try {
        const groups = await getActiveStories(currentUserId);
        if (cancelled) return;
        const bundle = groups.find((g) => g.user?.id === authorUserId);
        setHeaderName(bundle?.user?.username || 'Story');
        setStories(bundle?.stories || []);
      } catch (e) {
        console.error('[STORY VIEWER]', e);
        setStories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authorUserId, currentUserId]);

  /** Beim Anzeigen einer Story als gesehen markieren (eigene Stories auslassen) */
  const onStoryLayout = async (storyId, isOwn) => {
    if (!currentUserId || isOwn) return;
    await markStoryAsViewed(storyId, currentUserId);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-center mb-6">Keine aktiven Stories mehr.</Text>
        <Pressable onPress={() => router.back()} className="px-6 py-3 rounded-full bg-white/20">
          <Text className="text-white">Schliessen</Text>
        </Pressable>
      </View>
    );
  }

  const isOwn = authorUserId === currentUserId;

  return (
    <View className="flex-1 bg-black">
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Text className="text-white text-base flex-1" style={{ fontFamily: 'Manrope_600SemiBold' }}>
          {headerName}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-black/40"
          accessibilityRole="button"
          accessibilityLabel="Schliessen"
        >
          <XMarkIcon size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SCREEN_W}
        snapToAlignment="center"
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {stories.map((story) => (
          <View
            key={story.id}
            style={{ width: SCREEN_W, height: SCREEN_H - insets.top - insets.bottom - 56 }}
            className="justify-center"
          >
            {story.media_type === 'video' ? (
              <Text className="text-white text-center px-4">
                Video-Stories werden in einer spaeteren Version abgespielt.
              </Text>
            ) : (
              <Image
                source={{ uri: story.media_url }}
                style={{ width: SCREEN_W, flex: 1 }}
                contentFit="contain"
                onLoad={() => onStoryLayout(story.id, isOwn)}
              />
            )}
            {story.caption ? (
              <View className="absolute bottom-12 left-4 right-4">
                <Text className="text-white text-center" style={{ fontFamily: 'Manrope_400Regular' }}>
                  {story.caption}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
