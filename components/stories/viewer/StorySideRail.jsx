import { View } from 'react-native';
import {
  ArrowUturnRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  EllipsisHorizontalIcon,
} from 'react-native-heroicons/solid';
import { SideStackAction } from './SideStackAction';
import { SideStackBookmarkAction } from './SideStackBookmarkAction';
import { StoryPressableScale } from './StoryPressableScale';

const SIDE_RAIL_ICON = 28;

/**
 * Rechte Aktionsspalte: Kommentar/Bookmark nur fuer Fremde; Teilen und ⋯ immer wenn bundleEng da ist.
 */
export function StorySideRail({
  bottomOffset,
  isOwn,
  bundleEng,
  activeStory,
  formatStoryCount,
  onComment,
  onBookmark,
  onShare,
}) {
  if (!activeStory || !bundleEng) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-3 z-[21] items-center"
      style={{ bottom: bottomOffset }}
    >
      {!isOwn ? (
        <SideStackAction
          accessibilityLabel="Kommentare"
          onPress={onComment}
          icon={<ChatBubbleOvalLeftEllipsisIcon size={SIDE_RAIL_ICON} color="#FFFFFF" />}
          countLabel={formatStoryCount(bundleEng.comments)}
        />
      ) : null}
      {!isOwn ? (
        <SideStackBookmarkAction
          bookmarked={bundleEng.bookmarked}
          onPress={onBookmark}
          countLabel={formatStoryCount(bundleEng.bookmarks)}
          size={SIDE_RAIL_ICON}
        />
      ) : null}
      <SideStackAction
        accessibilityLabel="Teilen"
        onPress={() => onShare(activeStory)}
        icon={<ArrowUturnRightIcon size={SIDE_RAIL_ICON} color="#FFFFFF" />}
        countLabel={formatStoryCount(bundleEng.shares)}
      />
      <StoryPressableScale
        onPress={() => {}}
        className="items-center opacity-95"
        innerClassName="items-center justify-center px-0.5 py-0.5"
        accessibilityLabel="Mehr Optionen"
      >
        <EllipsisHorizontalIcon size={SIDE_RAIL_ICON - 2} color="#FFFFFF" />
      </StoryPressableScale>
    </View>
  );
}
