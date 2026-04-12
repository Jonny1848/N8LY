import { EmojiPickerModal, emojiData } from '@hiraku-ai/react-native-emoji-picker';

/**
 * Voller Emoji-Katalog; das ausgewaehlte Zeichen (getrimmt) ist der reactionKey im Bundle.
 * Legacy-Demo-Keys (heart, joy, …) kommen nur noch aus buildDefaultReactions, nicht aus einer Preset-Liste.
 */
export function StoryReactionPickerModal({ visible, onRequestClose, onPick }) {
  return (
    <EmojiPickerModal
      visible={visible}
      onClose={onRequestClose}
      onEmojiSelect={(emoji) => {
        const trimmed = typeof emoji === 'string' ? emoji.trim() : '';
        if (trimmed) onPick(trimmed);
      }}
      emojis={emojiData}
      darkMode
      modalTitle="Reaktion waehlen"
      searchPlaceholder="Emoji suchen…"
      modalHeightPercentage={72}
    />
  );
}
