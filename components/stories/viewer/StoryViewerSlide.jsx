import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { STORY_VIEWER_SCREEN_H, STORY_VIEWER_SCREEN_W, storyViewerFontArial } from './constants';
import { StoryMediaGestureOverlay } from './StoryMediaGestureOverlay';
import { StoryVideoBody } from './StoryVideoBody';

/**
 * Ein aktives Story-Medium (Bild/Video/Placeholder) plus Vollbild-Gesten-Overlay.
 */
export function StoryViewerSlide({
  story,
  isOwn,
  isMuted,
  onMarkViewed,
  doubleTapLikeEnabled,
  onTriggerLike,
  onTapZone,
  onDismiss,
}) {
  if (!story) return null;

  return (
    <View
      key={story.id}
      style={{ flex: 1, width: STORY_VIEWER_SCREEN_W, height: STORY_VIEWER_SCREEN_H, backgroundColor: '#000' }}
    >
      {!story.media_url ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/60 text-center" style={storyViewerFontArial}>
            Kein Medium für diese Story.
          </Text>
        </View>
      ) : String(story.media_type || '').toLowerCase() === 'video' ? (
        <StoryVideoBody
          uri={story.media_url}
          storyId={story.id}
          isOwn={isOwn}
          onMarkViewed={onMarkViewed}
          width={STORY_VIEWER_SCREEN_W}
          height={STORY_VIEWER_SCREEN_H}
          isMuted={isMuted}
          isActive
        />
      ) : (
        <Image
          source={{ uri: story.media_url }}
          style={{ width: STORY_VIEWER_SCREEN_W, height: STORY_VIEWER_SCREEN_H }}
          contentFit="cover"
          onLoad={() => onMarkViewed(story.id, isOwn)}
        />
      )}
      <StoryMediaGestureOverlay
        doubleTapLikeEnabled={doubleTapLikeEnabled}
        onTriggerLike={onTriggerLike}
        onTapZone={onTapZone}
        onDismiss={onDismiss}
      />
    </View>
  );
}
