/**
 * ChatHeader – Wiederverwendbarer Header fuer den Chat-Detail-Screen
 *
 * Zeigt: Zurück-Pfeil, Avatar, Name, Online-Status / Teilnehmerzahl,
 * und einen Options-Button (drei Punkte).
 *
 * Props:
 *  - conversation: Objekt mit displayName, displayAvatar, type, conversation_participants
 *  - onBack: Callback fuer den Zurück-Button
 *  - onOptions: Callback fuer den Options-Button (optional)
 *  - onPressProfile: Tipp auf Avatar/Name (z. B. Gruppeninfo bei type === 'group')
 */
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { ChevronLeftIcon, VideoCameraIcon, PhoneIcon } from 'react-native-heroicons/solid';
import { UserIcon } from 'react-native-heroicons/solid';

export default function ChatHeader({ conversation, onBack, onOptions, onPressProfile }) {
  /** Gruppen-Avatar: displayAvatar oder direkt avatar_url aus der Konversation */
  const headerAvatarUri =
    (conversation?.displayAvatar && String(conversation.displayAvatar).trim()) ||
    (conversation?.type === 'group' &&
    conversation?.avatar_url &&
    String(conversation.avatar_url).trim()) ||
    '';

  /**
   * Untertitel: "Online" bei Einzelchats, "X Teilnehmer" bei Gruppen.
   */
  const getSubtitle = () => {
    if (!conversation) return '';
    if (conversation.type === 'direct') return 'Online';
    const count = conversation.conversation_participants?.length || 0;
    return `${count} Teilnehmer`;
  };

  /** Avatar + Text: bei Gruppen tappbar (ohne disabled-Styling), sonst statisches View */
  const profileBlock = (
    <>
      {headerAvatarUri ? (
        <Image
          source={{ uri: headerAvatarUri }}
          style={styles.headerAvatar}
        />
      ) : (
        <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
          <UserIcon size={24} color={theme.colors.neutral.gray[400]} />
        </View>
      )}

      <View style={styles.headerInfo}>
        <Text style={styles.headerName} numberOfLines={1}>
          {conversation?.displayName || 'Chat'}
        </Text>
        <View style={styles.headerStatusRow}>
          {/* Gruener Online-Punkt bei Einzelchats */}
          {conversation?.type === 'direct' && (
            <View style={styles.onlineDot} />
          )}
          <Text style={styles.headerStatus}>
            {getSubtitle()}
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.header}>
      {/* Zurück-Pfeil */}
      <Pressable style={styles.headerBtn} onPress={onBack}>
        <ChevronLeftIcon size={30} color={"black"} strokeWidth={2.5} />
      </Pressable>

      {/* Avatar + Name + Status — bei Gruppen: onPressProfile oeffnet Gruppeninfo */}
      {onPressProfile ? (
        <Pressable style={styles.headerProfile} onPress={onPressProfile}>
          {profileBlock}
        </Pressable>
      ) : (
        <View style={styles.headerProfile}>{profileBlock}</View>
      )}

      {/* Video-Anruf + Telefon Icons – grösser fuer bessere Erreichbarkeit */}
      <View className="flex-row items-center gap-2">
        <Pressable className="w-12 h-12 items-center justify-center">
          <VideoCameraIcon size={28} strokeWidth={2} color={"black"} />
        </Pressable>
        <Pressable className="w-12 h-12 items-center justify-center">
          <PhoneIcon size={28} strokeWidth={2} color={"black"} />
        </Pressable>
      </View>
    </View>
  );
}

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[100],
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neutral.gray[100],
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    color: "black",
    fontFamily: 'Manrope_700Bold',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
    marginRight: 5,
  },
  headerStatus: {
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
    fontFamily: 'Manrope_400Regular',
  },
});
