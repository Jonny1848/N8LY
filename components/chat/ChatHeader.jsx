/**
 * ChatHeader – Wiederverwendbarer Header fuer den Chat-Detail-Screen
 *
 * Zeigt: Zurueck-Pfeil, Avatar, Name, Online-Status / Teilnehmerzahl,
 * und einen Options-Button (drei Punkte).
 *
 * Props:
 *  - conversation: Objekt mit displayName, displayAvatar, type, conversation_participants
 *  - onBack: Callback fuer den Zurueck-Button
 *  - onOptions: Callback fuer den Options-Button (optional)
 */
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { ChevronLeftIcon, EllipsisHorizontalIcon } from 'react-native-heroicons/outline';
import { UserIcon } from 'react-native-heroicons/solid';

export default function ChatHeader({ conversation, onBack, onOptions }) {
  /**
   * Untertitel: "Online" bei Einzelchats, "X Teilnehmer" bei Gruppen.
   */
  const getSubtitle = () => {
    if (!conversation) return '';
    if (conversation.type === 'direct') return 'Online';
    const count = conversation.conversation_participants?.length || 0;
    return `${count} Teilnehmer`;
  };

  return (
    <View style={styles.header}>
      {/* Zurueck-Pfeil */}
      <Pressable style={styles.headerBtn} onPress={onBack}>
        <ChevronLeftIcon size={28} color={theme.colors.neutral.gray[900]} strokeWidth={2.5} />
      </Pressable>

      {/* Avatar + Name + Status (tappbar fuer Profil-Info) */}
      <Pressable style={styles.headerProfile}>
        {conversation?.displayAvatar ? (
          <Image
            source={{ uri: conversation.displayAvatar }}
            style={styles.headerAvatar}
          />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
            <UserIcon size={22} color={theme.colors.neutral.gray[400]} />
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
      </Pressable>

      {/* N8LY-Logo rechts oben (Einzel- und Gruppenchats) */}
      <View style={styles.headerLogoContainer}>
        <Image
          source={require('../../assets/N8LY9.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    width: 40,
    height: 40,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 17,
    color: theme.colors.neutral.gray[900],
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
    fontSize: 12,
    color: theme.colors.neutral.gray[500],
    fontFamily: 'Manrope_400Regular',
  },
  // N8LY-Logo rechts oben im Header
  headerLogoContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
});
