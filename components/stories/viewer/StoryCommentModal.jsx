import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from 'react-native';
import { storyViewerFontArial } from './constants';
import { StoryPressableScale } from './StoryPressableScale';

/**
 * Kommentar-Sheet: erhoeht Bundle-Kommentarzaehler bei erfolgreichem Senden (via onSubmit).
 */
export function StoryCommentModal({
  visible,
  draft,
  onChangeDraft,
  onRequestClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onRequestClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-neutral-900 rounded-t-2xl px-4 pt-4 pb-8 border-t border-white/10">
          <Text className="text-white text-base mb-3" style={storyViewerFontArial}>
            Kommentar
          </Text>
          <TextInput
            value={draft}
            onChangeText={onChangeDraft}
            placeholder="Schreib etwas …"
            placeholderTextColor="rgba(255,255,255,0.4)"
            className="text-white border border-white/20 rounded-xl px-3 py-3 mb-4 min-h-[88px]"
            style={storyViewerFontArial}
            multiline
          />
          <View className="flex-row">
            <StoryPressableScale
              onPress={onRequestClose}
              className="flex-1 mr-2 py-3 rounded-xl bg-white/10"
              innerClassName="items-center justify-center"
              accessibilityLabel="Abbrechen"
            >
              <Text className="text-white" style={storyViewerFontArial}>
                Abbrechen
              </Text>
            </StoryPressableScale>
            <StoryPressableScale
              onPress={onSubmit}
              className="flex-1 ml-2 py-3 rounded-xl bg-white"
              innerClassName="items-center justify-center"
              accessibilityLabel="Senden"
            >
              <Text className="text-black font-medium" style={storyViewerFontArial}>
                Senden
              </Text>
            </StoryPressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
