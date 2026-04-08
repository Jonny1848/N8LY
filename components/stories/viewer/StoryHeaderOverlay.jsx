import { Text, View } from 'react-native';
import { CheckBadgeIcon } from 'react-native-heroicons/solid';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryFollowButton } from './StoryFollowButton';
import { StorySpeakerGlassButton } from './StorySpeakerGlassButton';
import { storyViewerFontArial } from './constants';

/**
 * Oberes Overlay: Avatar-Ring, @-Name, optional Follow, Stumm-Toggle.
 */
export function StoryHeaderOverlay({
  insets,
  avatarUrl,
  displayName,
  isOwn,
  followingAuthor,
  onToggleFollow,
  useSpeakerGlass,
  isMuted,
  onToggleMute,
}) {
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 z-20"
      style={{ top: 0, paddingTop: insets.top + 6 }}
    >
      <View
        pointerEvents="box-none"
        className="flex-row items-start pr-4"
        style={{ paddingLeft: insets.left + 10 }}
      >
        <LinearGradient
          colors={['#F58529', '#DD2A7B', '#8134AF', '#515BD4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 46, height: 46, borderRadius: 23, padding: 2 }}
        >
          <View className="w-full h-full rounded-full bg-black p-[2px]">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-full h-full rounded-full"
                contentFit="cover"
              />
            ) : (
              <View className="w-full h-full rounded-full bg-neutral-700 items-center justify-center" />
            )}
          </View>
        </LinearGradient>

        <View className="flex-1 ml-2.5 justify-center min-h-[46px]">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-white text-[15px]" style={storyViewerFontArial} numberOfLines={1}>
              {displayName}
            </Text>
            <View className="ml-1">
              <CheckBadgeIcon size={18} color="#3897F0" />
            </View>
          </View>
          {!isOwn ? (
            <StoryFollowButton followed={followingAuthor} onToggle={onToggleFollow} />
          ) : null}
        </View>

        <StorySpeakerGlassButton useGlass={useSpeakerGlass} isMuted={isMuted} onPress={onToggleMute} />
      </View>
    </View>
  );
}
