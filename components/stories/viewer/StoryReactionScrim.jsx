import { Platform, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FaceSmileIcon } from 'react-native-heroicons/solid';
import {
  REACTION_BOTTOM_PAD,
  REACTION_SCRIM_HEIGHT,
  storyViewerFontArial,
} from './constants';
import { StoryReactionGlassChip } from './StoryReactionGlassChip';

/**
 * Unterer Verlauf + zentrierte Emoji-Pills (nur wenn bundleEng und nicht eigenes Profil).
 */
export function StoryReactionScrim({
  insets,
  activeStory,
  bundleEng,
  isOwn,
  useGlass,
  visibleReactionPresets,
  bundleReactions,
  formatReactionCount,
  onToggleHeart,
  onBumpReaction,
  onOpenPicker,
}) {
  const showPills = !!(activeStory && bundleEng && !isOwn);

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 bottom-0 z-20"
      style={{ height: REACTION_SCRIM_HEIGHT + insets.bottom + REACTION_BOTTOM_PAD }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.008)',
          'rgba(0,0,0,0.02)',
          'rgba(0,0,0,0.045)',
          'rgba(0,0,0,0.08)',
          'rgba(0,0,0,0.13)',
          'rgba(0,0,0,0.20)',
          'rgba(0,0,0,0.30)',
          'rgba(0,0,0,0.42)',
          'rgba(0,0,0,0.52)',
        ]}
        locations={[0, 0.08, 0.18, 0.30, 0.42, 0.54, 0.66, 0.78, 0.88, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: REACTION_SCRIM_HEIGHT + insets.bottom + REACTION_BOTTOM_PAD,
        }}
      />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          paddingBottom: insets.bottom + REACTION_BOTTOM_PAD,
        }}
      >
        {showPills ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 12,
            }}
          >
            {visibleReactionPresets.map((preset) => (
              <View key={preset.key} className="mr-2">
                <StoryReactionGlassChip
                  useGlass={useGlass}
                  isRound={false}
                  isSelected={
                    preset.key === 'heart'
                      ? !!bundleEng?.liked
                      : bundleEng?.myEmojiReactionKey === preset.key
                  }
                  accessibilityLabel={`Reaktion ${preset.label}${
                    (preset.key === 'heart' ? bundleEng?.liked : bundleEng?.myEmojiReactionKey === preset.key)
                      ? ', ausgewaehlt'
                      : ''
                  }`}
                  onPress={() =>
                    preset.key === 'heart' ? onToggleHeart() : onBumpReaction(preset.key)
                  }
                >
                  <Text
                    className="text-lg leading-6"
                    style={Platform.OS === 'android' ? { includeFontPadding: false } : undefined}
                  >
                    {preset.emoji}
                  </Text>
                  <Text className="text-white text-xs min-w-[22px] text-center" style={storyViewerFontArial}>
                    {formatReactionCount(bundleReactions[preset.key] ?? 0)}
                  </Text>
                </StoryReactionGlassChip>
              </View>
            ))}
            {/* Smiley oeffnet nur den Katalog — kein Auswahl-Ring (besonderer Aktions-Button) */}
            <StoryReactionGlassChip
              useGlass={useGlass}
              isRound
              onPress={onOpenPicker}
              accessibilityLabel={
                bundleEng?.myEmojiReactionKey
                  ? 'Emoji-Reaktion aendern'
                  : 'Reaktion hinzufuegen'
              }
            >
              <FaceSmileIcon size={24} color="#FFFFFF" />
            </StoryReactionGlassChip>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
