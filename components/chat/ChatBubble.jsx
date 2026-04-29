/**
 * ChatBubble – Einzelne Nachrichten-Bubble im Chatbox-Style
 *
 * Rendert eine Nachricht als Bubble mit optionalem Datumsseparator,
 * System-Nachrichten und Gruppen-Avatar/Name.
 * Unterstuetzt Text-, Sprachnachrichten und Bildnachrichten.
 *
 * Props:
 *  - item: Nachricht-Objekt (aus messages-Tabelle)
 *  - index: Index in der FlatList
 *  - messages: Gesamtes Messages-Array (fuer Datumsseparator-Check)
 *  - userId: ID des aktuellen Users
 *  - conversation: Konversation-Objekt (fuer Gruppeninfo)
 *  - onImagePress: optional (uri) => void – Tipp auf Bildnachricht (Vorschau im Parent)
 */
import { View, Text, useWindowDimensions, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../constants/theme';
import { UserIcon } from 'react-native-heroicons/solid';
import { PaperClipIcon } from 'react-native-heroicons/outline';
import VoiceMessageBubble from './VoiceMessageBubble';
import PollBubble from './PollBubble';

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
 * Prueft ob zwei Nachrichten in derselben Minute gesendet wurden.
 * Vergleicht Stunde + Minute des Zeitstempels.
 */
function sameMinute(a, b) {
  if (!a?.created_at || !b?.created_at) return false;
  const da = new Date(a.created_at);
  const db = new Date(b.created_at);
  return da.getHours() === db.getHours() && da.getMinutes() === db.getMinutes()
    && da.toDateString() === db.toDateString();
}

/**
 * Prueft ob die aktuelle Nachricht den Zeitstempel anzeigen soll.
 * Nur die LETZTE Nachricht einer Gruppe (gleicher Absender, gleiche Minute)
 * bekommt den Stempel. In der inverted FlatList ist „darunter" = index - 1.
 */
function shouldShowTimestamp(currentMsg, msgBelow) {
  if (!msgBelow) return true;
  if (currentMsg.sender_id !== msgBelow.sender_id) return true;
  return !sameMinute(currentMsg, msgBelow);
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

export default function ChatBubble({ item, index, messages, userId, conversation, onImagePress }) {
  const { width: screenWidth } = useWindowDimensions();
  const isOwn = item.sender_id === userId;
  const isSystem = item.message_type === 'system';
  const isImage = item.message_type === 'image';
  const isVoice = item.message_type === 'voice';
  const isFile = item.message_type === 'file';
  const isPoll = item.message_type === 'poll';

  // Bildbreite: max. 65% Bildschirmbreite, maximal 260px (wie vorher mit StyleSheet)
  const imageWidth = Math.min(screenWidth * 0.65, 260);

  // Datumsseparator: Pruefen ob der Tag sich aendert (FlatList ist inverted)
  const nextMsg = messages[index + 1];
  const showDate = shouldShowDateSeparator(item, nextMsg);

  // Zeitstempel nur bei der letzten Nachricht einer Gruppe (gleicher Sender, gleiche Minute)
  const msgBelow = messages[index - 1];
  const showTime = shouldShowTimestamp(item, msgBelow);
  // Engerer Abstand wenn die naechste Bubble zur selben Gruppe gehoert
  const isGrouped = msgBelow && msgBelow.sender_id === item.sender_id && sameMinute(item, msgBelow);

  // ── Poll-Nachrichten: eigenes Layout (breite Karte, weisser Hintergrund) ──
  if (isPoll) {
    return (
      <View>
        {/* Datumsseparator */}
        {shouldShowDateSeparator(item, messages[index + 1]) && (
          <View className="items-center py-4">
            <View className="px-4 py-1.5 rounded-full bg-gray-100">
              <Text className="text-xs text-gray-500" style={{ fontFamily: 'Manrope_500Medium' }}>
                {formatDateSeparator(item.created_at)}
              </Text>
            </View>
          </View>
        )}

        {/* Poll-Karte: linksseitig bei fremden Nachrichten, rechtsseitig bei eigenen */}
        <View
          className={`px-4 ${isOwn ? 'items-end' : 'items-start'} ${
            shouldShowTimestamp(item, messages[index - 1]) ? 'mb-5' : 'mb-1.5'
          }`}
        >
          {/* Gruppenavatar des Absenders (nur bei Gruppen-Chats + fremde Nachricht) */}
          {!isOwn && conversation?.type === 'group' && (
            <View className="flex-row items-end mb-1 gap-2.5">
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
                {item.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: item.profiles.avatar_url }}
                    style={{ width: 32, height: 32 }}
                    cachePolicy="disk"
                    contentFit="cover"
                  />
                ) : (
                  <UserIcon size={16} color={theme.colors.neutral.gray[400]} />
                )}
              </View>
              {item.profiles?.username && (
                <Text
                  className="text-xs text-N8LY-blue mb-1"
                  style={{ fontFamily: 'Manrope_600SemiBold' }}
                >
                  {item.profiles.username}
                </Text>
              )}
            </View>
          )}

          {/* Polls belegen 90% der Chatbreite fuer gute Lesbarkeit */}
          <View style={{ width: '90%' }}>
            <PollBubble message={item} userId={userId} isOwn={isOwn} />
          </View>

          {/* Zeitstempel unter der Karte */}
          {shouldShowTimestamp(item, messages[index - 1]) && (
            <Text
              className={`text-xs text-gray-500 mt-1.5 ${isOwn ? 'text-right' : 'text-left'}`}
              style={{ fontFamily: 'Manrope_400Regular' }}
            >
              {formatMessageTime(item.created_at)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Tailwind-Klassen fuer die Bubble – dynamisch je nach Nachrichtentyp
  const bubbleBaseClasses =
    'rounded-2xl max-w-full ' +
    (isImage
      ? 'bg-transparent p-0 overflow-hidden'
      : isVoice
        ? 'py-2 pl-2.5 pr-4 ' + (isOwn ? 'bg-N8LY-blue rounded-br-[4px]' : 'bg-gray-100 rounded-bl-[4px]')
        : 'px-3.5 py-2.5 ' +
          (isOwn ? 'bg-N8LY-blue rounded-br-[4px]' : 'bg-gray-100 rounded-bl-[4px]'));

  return (
    <View>
      {/* Datumsseparator: Zentriertes Datum-Badge */}
      {showDate && (
        <View className="items-center py-4">
          <View className="px-4 py-1.5 rounded-full bg-gray-100">
            <Text className="text-xs text-gray-500" style={{ fontFamily: 'Manrope_500Medium' }}>
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
        /* Chatbox-Style: Bubble mit Zeitstempel innen */
        <View
          className={`flex-row px-4 items-end ${isGrouped ? 'mb-1.5' : 'mb-5'} ${isOwn ? 'justify-end' : 'justify-start'}`}
        >
          {!isOwn && conversation?.type === 'group' && (
            <View className="mr-2.5 mb-1">
              {item.profiles?.avatar_url ? (
                <Image
                  source={{ uri: item.profiles.avatar_url }}
                  cachePolicy="disk"
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              ) : (
                <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <UserIcon size={16} color={theme.colors.neutral.gray[400]} />
                </View>
              )}
            </View>
          )}

          {/* Wrapper fuer Bubble + Zeitstempel – max. 75% Chat-Breite */}
          <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* Absendername bei Bildnachrichten AUSSERHALB der Bubble, damit overflow-hidden ihn nicht abschneidet */}
            {!isOwn && conversation?.type === 'group' && item.profiles?.username && isImage && (
              <Text
                className="text-xs mb-1 text-N8LY-blue"
                style={{ fontFamily: 'Manrope_600SemiBold' }}
              >
                {item.profiles.username}
              </Text>
            )}

            <View className={bubbleBaseClasses}>
              {/* Absendername bei Nicht-Bild-Nachrichten innerhalb der Bubble */}
              {!isOwn && conversation?.type === 'group' && item.profiles?.username && !isImage && (
                <Text
                  className="text-xs mb-0.5 text-N8LY-blue"
                  style={{ fontFamily: 'Manrope_600SemiBold' }}
                >
                  {item.profiles.username}
                </Text>
              )}

              {isVoice && item.media_url ? (
                <VoiceMessageBubble
                  mediaUrl={item.media_url}
                  waveformData={item.waveform_data}
                  isOwn={isOwn}
                />
              ) : isFile && item.media_url ? (
                /* Dateianhang: Tipp öffnet die öffentliche Storage-URL im System (Browser / Viewer) */
                <Pressable
                  onPress={() => Linking.openURL(item.media_url)}
                  accessibilityRole="button"
                  accessibilityLabel="Datei öffnen"
                  className="flex-row items-center gap-2 active:opacity-80"
                >
                  <PaperClipIcon
                    size={22}
                    strokeWidth={2}
                    color={isOwn ? '#FFFFFF' : theme.colors.neutral.gray[700]}
                  />
                  <Text
                    className={`text-[15px] leading-[21px] flex-1 ${isOwn ? 'text-white' : 'text-gray-900'}`}
                    style={{ fontFamily: 'Manrope_500Medium' }}
                    numberOfLines={2}
                  >
                    {item.content || 'Datei'}
                  </Text>
                </Pressable>
              ) : isImage && item.media_url ? (
                /* Bildnachricht: Foto mit optionalem Caption – Zeitstempel unter der Bubble */
                <>
                  {/* Tipp öffnet Vollbild; Callback kommt vom Chat-Screen (imagePreviewUri) */}
                  <Pressable
                    onPress={() => onImagePress?.(item.media_url)}
                    disabled={!onImagePress}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Bild in Vollbild anzeigen"
                  >
                    <Image
                      source={{ uri: item.media_url }}
                      cachePolicy="disk"
                      style={{
                        width: imageWidth,
                        aspectRatio: 4 / 3,
                        borderRadius: 12,
                      }}
                      contentFit="cover"
                    />
                  </Pressable>
                  {item.content ? (
                    <Text
                      className={`text-sm mt-1.5 leading-5 ${isOwn ? 'text-white' : 'text-gray-900'}`}
                      style={{ fontFamily: 'Manrope_500Medium' }}
                    >
                      {item.content}
                    </Text>
                  ) : null}
                </>
              ) : (
                /* Textnachricht – nur Inhalt, Zeitstempel unter der Bubble */
                <Text
                  className={`text-[15px] leading-[21px] ${isOwn ? 'text-white' : 'text-gray-900'}`}
                  style={{ fontFamily: 'Manrope_500Medium' }}
                >
                  {item.content}
                </Text>
              )}
            </View>

            {/* Zeitstempel nur bei der letzten Bubble einer Minute/Sender-Gruppe */}
            {showTime && (
              <Text
                className={`text-xs text-gray-500 mt-1.5 ${isOwn ? 'text-right' : 'text-left'}`}
                style={{ fontFamily: 'Manrope_400Regular' }}
              >
                {formatMessageTime(item.created_at)}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
