/**
 * ChatBubble – Einzelne Nachrichten-Bubble im Chatbox-Style
 *
 * Rendert eine Nachricht als Bubble mit optionalem Datumsseparator,
 * System-Nachrichten und Gruppen-Avatar/Name.
 * Unterstuetzt Text- und Sprachnachrichten.
 *
 * Props:
 *  - item: Nachricht-Objekt (aus messages-Tabelle)
 *  - index: Index in der FlatList
 *  - messages: Gesamtes Messages-Array (fuer Datumsseparator-Check)
 *  - userId: ID des aktuellen Users
 *  - conversation: Konversation-Objekt (fuer Gruppeninfo)
 */
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { UserIcon } from 'react-native-heroicons/solid';
import VoiceMessageBubble from './VoiceMessageBubble';

/**
 * Formatiert den Zeitstempel einer Nachricht (z.B. "14:30").
 */
function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Prueft ob ein Datumsseparator zwischen zwei Nachrichten angezeigt werden soll.
 * Vergleicht die Tage der beiden Nachrichten.
 */
function shouldShowDateSeparator(currentMsg, nextMsg) {
  if (!nextMsg) return true;
  const currentDate = new Date(currentMsg.created_at).toDateString();
  const nextDate = new Date(nextMsg.created_at).toDateString();
  return currentDate !== nextDate;
}

/**
 * Formatiert ein Datum fuer den Separator (Heute / Gestern / volles Datum).
 */
function formatDateSeparator(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChatBubble({ item, index, messages, userId, conversation }) {
  const isOwn = item.sender_id === userId;
  const isSystem = item.message_type === 'system';

  // Datumsseparator: Pruefen ob der Tag sich aendert (FlatList ist inverted)
  const nextMsg = messages[index + 1];
  const showDate = shouldShowDateSeparator(item, nextMsg);

  return (
    <View>
      {/* Datumsseparator: Zentriertes Datum-Badge */}
      {showDate && (
        <View className="items-center py-4">
          <View className="px-4 py-1.5 rounded-full" style={{ backgroundColor: theme.colors.neutral.gray[100] }}>
            <Text
              className="text-xs text-gray-500"
              style={{ fontFamily: 'Manrope_500Medium' }}
            >
              {formatDateSeparator(item.created_at)}
            </Text>
          </View>
        </View>
      )}

      {/* System-Nachricht (zentriert, dezent) */}
      {isSystem ? (
        <View className="items-center py-2 px-10">
          <Text
            className="text-xs text-gray-400 text-center"
            style={{ fontFamily: 'Manrope_400Regular' }}
          >
            {item.content}
          </Text>
        </View>
      ) : (
        /* Chatbox-Style Message Bubble */
        <View className={`flex-row px-4 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {/* Avatar links (nur bei fremden Nachrichten in Gruppenchats) */}
          {!isOwn && conversation?.type === 'group' && (
            <View className="mr-2.5 self-end mb-1">
              {item.profiles?.avatar_url ? (
                <Image
                  source={{ uri: item.profiles.avatar_url }}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <UserIcon size={16} color={theme.colors.neutral.gray[400]} />
                </View>
              )}
            </View>
          )}

          {/* Bubble: Chatbox-typisch mit einer flachen Ecke */}
          <View
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
            ]}
          >
            {/* Absender-Name in Gruppenchats */}
            {!isOwn && conversation?.type === 'group' && item.profiles?.username && (
              <Text style={[styles.senderName, { color: theme.colors.primary.main }]}>
                {item.profiles.username}
              </Text>
            )}

            {/* Nachrichteninhalt: Text oder Sprachnachricht */}
            {item.message_type === 'voice' && item.media_url ? (
              <VoiceMessageBubble
                mediaUrl={item.media_url}
                waveformData={item.waveform_data}
                isOwn={isOwn}
              />
            ) : (
              <Text
                style={[
                  styles.messageText,
                  { color: isOwn ? '#FFFFFF' : theme.colors.neutral.gray[900] },
                ]}
              >
                {item.content}
              </Text>
            )}

            {/* Zeitstempel rechts unten */}
            <Text
              style={[
                styles.timestamp,
                {
                  color: isOwn
                    ? 'rgba(255,255,255,0.6)'
                    : theme.colors.neutral.gray[400],
                },
              ]}
            >
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: theme.colors.primary.main,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: theme.colors.neutral.gray[100],
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Manrope_400Regular',
  },
  timestamp: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
