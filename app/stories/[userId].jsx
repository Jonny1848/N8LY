/**
 * Story-Viewer – zeigt alle aktiven Stories eines Nutzers, markiert Aufrufe in story_views.
 * Videos: expo-video (VideoView); Bilder: expo-image.
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
import { useEffect, useState, useCallback } from 'react';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import useAuthStore from '../../stores/useAuthStore';
import { getActiveStories, markStoryAsViewed } from '../../services/storyService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Ein Video pro Slide: eigener Hook-Aufruf (Regeln von React). */
function StoryVideoBody({ uri, storyId, isOwn, onMarkViewed, width, height }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    // Sobald die Slide sichtbar ist, als gesehen zaehlen (ohne komplexes Status-Event)
    const t = setTimeout(() => {
      onMarkViewed(storyId, isOwn);
    }, 500);
    return () => clearTimeout(t);
  }, [storyId, isOwn, onMarkViewed]);

  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function StoryViewerScreen() {
  const raw = useLocalSearchParams().userId;
  const authorUserId = Array.isArray(raw) ? raw[0] : raw;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.userId);

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [headerName, setHeaderName] = useState('');

  const onMarkViewed = useCallback(
    async (storyId, isOwn) => {
      if (!currentUserId || isOwn) return;
      await markStoryAsViewed(storyId, currentUserId);
    },
    [currentUserId]
  );

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
        // UUID aus der Route kann anders formatiert sein als Supabase — case-insensitive vergleichen
        const authorNorm = (authorUserId || '').trim().toLowerCase();
        const bundle = groups.find(
          (g) => (g.user?.id || '').trim().toLowerCase() === authorNorm
        );
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
  const slideHeight = SCREEN_H - insets.top - insets.bottom - 56;

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
        {stories.map((story) => {
          const isVideo = String(story.media_type || '').toLowerCase() === 'video';
          const mediaUri = story.media_url;
          return (
          <View
            key={story.id}
            style={{ width: SCREEN_W, height: slideHeight, backgroundColor: '#000' }}
            className="items-center justify-center"
          >
            {!mediaUri ? (
              <Text className="text-white/60 px-6 text-center" style={{ fontFamily: 'Manrope_400Regular' }}>
                Kein Medium fuer diese Story.
              </Text>
            ) : isVideo ? (
              <StoryVideoBody
                uri={mediaUri}
                storyId={story.id}
                isOwn={isOwn}
                onMarkViewed={onMarkViewed}
                width={SCREEN_W}
                height={slideHeight}
              />
            ) : (
              <Image
                source={{ uri: mediaUri }}
                style={{ width: SCREEN_W, height: slideHeight }}
                contentFit="cover"
                onLoad={() => onMarkViewed(story.id, isOwn)}
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
          );
        })}
      </ScrollView>
    </View>
  );
}
