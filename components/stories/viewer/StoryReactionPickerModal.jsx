import { Modal, Pressable, Text, View } from 'react-native';
import { STORY_REACTION_PRESETS, storyViewerFontArial } from './constants';
import { StoryPressableScale } from './StoryPressableScale';

/**
 * Raster aller Preset-Emojis — Auswahl ruft onPick(reactionKey) (Bundle-Zaehler).
 */
export function StoryReactionPickerModal({ visible, onRequestClose, onPick }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/70"
          onPress={onRequestClose}
          accessibilityLabel="Schliessen"
        />
        <View className="bg-neutral-900 rounded-t-2xl px-4 pt-4 pb-8 border-t border-white/10">
          <Text className="text-white text-base mb-4" style={storyViewerFontArial}>
            Reaktion waehlen
          </Text>
          <View className="flex-row flex-wrap">
            {STORY_REACTION_PRESETS.map((p) => (
              <StoryPressableScale
                key={p.key}
                onPress={() => onPick(p.key)}
                className="w-14 h-14 rounded-2xl bg-white/10 mr-3 mb-3"
                innerClassName="h-full w-full items-center justify-center"
                accessibilityLabel={p.label}
              >
                <Text style={{ fontSize: 30 }}>{p.emoji}</Text>
              </StoryPressableScale>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
