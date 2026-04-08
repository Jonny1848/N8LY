/**
 * Story-Viewer Route: laedt Bundle, orchestriert Slides und Overlays.
 * UI-Bausteine unter `components/stories/viewer/`.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Share, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import {
  REACTION_BOTTOM_PAD,
  REACTION_ROW_PILL_HEIGHT,
  REACTION_TO_SIDE_RAIL_GAP,
  SIDE_RAIL_EXTRA_LIFT,
  STORY_TAP_LEFT_ZONE_RATIO,
  STORY_VIEWER_SCREEN_W,
  storyViewerFontArial,
} from '../../components/stories/viewer/constants';
import { StoryPressableScale } from '../../components/stories/viewer/StoryPressableScale';
import { StoryViewerSlide } from '../../components/stories/viewer/StoryViewerSlide';
import { StoryHeaderOverlay } from '../../components/stories/viewer/StoryHeaderOverlay';
import { StorySideRail } from '../../components/stories/viewer/StorySideRail';
import { StoryReactionScrim } from '../../components/stories/viewer/StoryReactionScrim';
import { StoryCommentModal } from '../../components/stories/viewer/StoryCommentModal';
import { StoryReactionPickerModal } from '../../components/stories/viewer/StoryReactionPickerModal';
import { useStoryViewerEngagement } from '../../components/stories/viewer/useStoryViewerEngagement';
import { formatReactionCount, formatStoryCount } from '../../components/stories/viewer/utils';
import useAuthStore from '../../stores/useAuthStore';
import { getActiveStories, markStoryAsViewed } from '../../services/storyService';

export default function StoryViewerScreen() {
  const raw = useLocalSearchParams().userId;
  const authorUserId = Array.isArray(raw) ? raw[0] : raw;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.userId);

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [bundleUser, setBundleUser] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [followingAuthor, setFollowingAuthor] = useState(false);

  const authorNorm = (authorUserId || '').trim().toLowerCase();
  const isOwn = authorNorm === (currentUserId || '').trim().toLowerCase();

  const {
    bundleEng,
    bundleReactions,
    visibleReactionPresets,
    handleDoubleTapLike,
    toggleHeartReaction,
    bumpReaction,
    openCommentModal,
    submitComment,
    commentModalVisible,
    setCommentModalVisible,
    commentDraft,
    setCommentDraft,
    recordShare,
    toggleBookmark,
    reactionPickVisible,
    setReactionPickVisible,
    openReactionPicker,
    pickReactionEmoji,
  } = useStoryViewerEngagement({ authorNorm, isOwn, stories });

  const onMarkViewed = useCallback(
    async (storyId, own) => {
      if (!currentUserId || own) return;
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
        const bundle = groups.find((g) => (g.user?.id || '').trim().toLowerCase() === authorNorm);
        setBundleUser(bundle?.user || null);
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
  }, [authorNorm, authorUserId, currentUserId]);

  const username = bundleUser?.username || 'user';
  const avatarUrl = bundleUser?.avatar_url || null;
  const displayName = `@${username}`;

  const shareStory = useCallback(
    async (story) => {
      const url = story?.media_url || '';
      try {
        await Share.share({
          message: url ? `${displayName} — ${url}` : `${displayName}`,
          url: Platform.OS === 'ios' ? url : undefined,
        });
        recordShare();
      } catch {
        /* Abbruch: kein Zaehler */
      }
    },
    [displayName, recordShare]
  );

  const dismissStoryViewer = useCallback(() => {
    router.back();
  }, [router]);

  const handleStoryTapZone = useCallback(
    (x) => {
      if (x < STORY_VIEWER_SCREEN_W * STORY_TAP_LEFT_ZONE_RATIO) {
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      }
      setActiveIndex((i) => {
        if (i >= stories.length - 1) {
          router.back();
          return i;
        }
        return i + 1;
      });
    },
    [router, stories.length]
  );

  useEffect(() => {
    if (stories.length === 0) return;
    setActiveIndex((i) => Math.min(Math.max(i, 0), stories.length - 1));
  }, [stories.length]);

  const canStoryReactionGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
  const sideRailBottomOffset =
    insets.bottom +
    REACTION_BOTTOM_PAD +
    (isOwn ? 8 : REACTION_ROW_PILL_HEIGHT + REACTION_TO_SIDE_RAIL_GAP) +
    SIDE_RAIL_EXTRA_LIFT;

  const activeStory = stories[activeIndex];

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
        <Text className="text-white text-center mb-6" style={storyViewerFontArial}>
          Keine aktiven Stories mehr.
        </Text>
        <StoryPressableScale
          onPress={() => router.back()}
          className="px-6 py-3 rounded-full bg-white/20"
          innerClassName="items-center justify-center"
          accessibilityLabel="Schliessen"
        >
          <Text className="text-white" style={storyViewerFontArial}>
            Schliessen
          </Text>
        </StoryPressableScale>
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      <View className="flex-1 bg-black">
        <StoryViewerSlide
          story={activeStory}
          isOwn={isOwn}
          isMuted={isMuted}
          onMarkViewed={onMarkViewed}
          doubleTapLikeEnabled={!isOwn}
          onTriggerLike={handleDoubleTapLike}
          onTapZone={handleStoryTapZone}
          onDismiss={dismissStoryViewer}
        />

        <StoryHeaderOverlay
          insets={insets}
          avatarUrl={avatarUrl}
          displayName={displayName}
          isOwn={isOwn}
          followingAuthor={followingAuthor}
          onToggleFollow={() => setFollowingAuthor((f) => !f)}
          useSpeakerGlass={canStoryReactionGlass}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
        />

        <StorySideRail
          bottomOffset={sideRailBottomOffset}
          isOwn={isOwn}
          bundleEng={bundleEng}
          activeStory={activeStory}
          formatStoryCount={formatStoryCount}
          onComment={openCommentModal}
          onBookmark={toggleBookmark}
          onShare={shareStory}
        />

        <StoryReactionScrim
          insets={insets}
          activeStory={activeStory}
          bundleEng={bundleEng}
          isOwn={isOwn}
          useGlass={canStoryReactionGlass}
          visibleReactionPresets={visibleReactionPresets}
          bundleReactions={bundleReactions}
          formatReactionCount={formatReactionCount}
          onToggleHeart={toggleHeartReaction}
          onBumpReaction={bumpReaction}
          onOpenPicker={openReactionPicker}
        />

        <StoryCommentModal
          visible={commentModalVisible}
          draft={commentDraft}
          onChangeDraft={setCommentDraft}
          onRequestClose={() => setCommentModalVisible(false)}
          onSubmit={submitComment}
        />

        <StoryReactionPickerModal
          visible={reactionPickVisible}
          onRequestClose={() => setReactionPickVisible(false)}
          onPick={pickReactionEmoji}
        />
      </View>
    </GestureHandlerRootView>
  );
}
