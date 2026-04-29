import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { UserIcon } from 'react-native-heroicons/outline';
import { CheckBadgeIcon } from 'react-native-heroicons/solid';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../constants/theme';
import { StoryFollowButton } from './StoryFollowButton';
import { StorySpeakerGlassButton } from './StorySpeakerGlassButton';
import { storyViewerFontArial } from './constants';

/** Verlauf am Avatar-Ring: Primary/Akzent aus `theme.js` (IG-Style-Ring, aber N8LY-Farben). */
const AVATAR_RING_GRADIENT_COLORS = [
  theme.colors.primary.main3,
  theme.colors.primary.main,
  theme.colors.accent.light,
  theme.colors.accent.dark,
];

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
  /* Nach URL-Wechsel oder Ladefehler: Platzhalter statt schwarzer Fläche (expo-image onError). */
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  const showAvatar = !!(avatarUrl && !avatarLoadFailed);

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
          colors={AVATAR_RING_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 46, height: 46, borderRadius: 23, padding: 2 }}
        >
          {/* Kein bg-black: sonst wirkt ein nicht geladenes Bild wie „löchriger“ schwarzer Kreis */}
          <View
            className="w-full h-full rounded-full overflow-hidden items-center justify-center"
            style={{ backgroundColor: theme.colors.neutral.gray[700] }}
          >
            {showAvatar ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <UserIcon size={22} color={theme.colors.neutral.gray[400]} />
            )}
          </View>
        </LinearGradient>

        <View className="flex-1 ml-2.5 justify-center min-h-[46px]">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-white text-[16px] font-bold" style={storyViewerFontArial} numberOfLines={1}>
              {displayName}
            </Text>
            <View className="ml-1">
              <CheckBadgeIcon size={18} color={theme.colors.primary.main} />
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
