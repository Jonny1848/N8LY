/**
 * Social Screen – Chat-Uebersicht mit Stories und Konversationsliste
 *
 * Zeigt oben einen horizontalen Story-Ring, darunter eine Suchleiste
 * und eine Liste aller Konversationen des eingeloggten Users.
 * Jeder Chat-Eintrag zeigt Avatar, Name, letzte Nachricht, Zeitstempel
 * und einen Unread-Badge an.
 *
 * Realtime: Die Chat-Liste aktualisiert sich automatisch bei neuen Nachrichten.
 */
import { View, Text, FlatList, Pressable, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { MagnifyingGlassIcon } from 'react-native-heroicons/outline';
import { PencilSquareIcon } from 'react-native-heroicons/outline';
import { UserIcon } from 'react-native-heroicons/solid';
import { PlusIcon } from 'react-native-heroicons/solid';
// Zustand: Globale Stores fuer Auth und Chat
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';

export default function SocialScreen() {
  // User-ID aus dem globalen Auth-Store
  const userId = useAuthStore((s) => s.userId);

  // Chat-State aus dem globalen Chat-Store
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.conversationsLoading);
  const { loadConversations, subscribeChatList, unsubscribeChatList } = useChatStore();

  // Lokaler State: Nur noch die Suche (rein UI-bezogen)
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // ============================
  // Konversationen laden und Realtime abonnieren
  // ============================
  useEffect(() => {
    if (!userId) return;

    // Konversationen ueber den Store laden (cached und global verfuegbar)
    loadConversations(userId);

    // Realtime-Abo starten (Store verwaltet den Channel intern)
    subscribeChatList(userId);

    // Aufraumen beim Unmount
    return () => {
      unsubscribeChatList();
    };
  }, [userId]);

  /**
   * Filtert Konversationen nach Suchbegriff (lokal im State).
   * Durchsucht den Anzeigenamen des Chats.
   */
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    return conv.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  /**
   * Formatiert den Zeitstempel der letzten Nachricht.
   * Heute: "14:30", Gestern: "Gestern", Aelter: "12.02."
   */
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Heute: Uhrzeit anzeigen
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      // Innerhalb einer Woche: Wochentag
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    } else {
      // Aelter: Datum
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  /**
   * Kuerzt den Vorschautext der letzten Nachricht.
   * Bilder/Voice werden als Platzhalter angezeigt.
   */
  const getMessagePreview = (msg: any) => {
    if (!msg) return 'Noch keine Nachrichten';
    switch (msg.message_type) {
      case 'image':
        return '📷 Bild';
      case 'voice':
        return '🎤 Sprachnachricht';
      case 'system':
        return msg.content || 'Systemnachricht';
      default:
        // Text auf 40 Zeichen kuerzen
        return msg.content?.length > 40
          ? msg.content.substring(0, 40) + '...'
          : msg.content || '';
    }
  };

  /**
   * Erstellt Story-Daten aus den geladenen Konversationen.
   * Sammelt alle einzigartigen Chat-Partner mit ihren Profilbildern.
   */
  const getStoryUsers = () => {
    const seen = new Set<string>();
    const users: any[] = [];

    conversations.forEach((conv) => {
      conv.conversation_participants?.forEach((p: any) => {
        // Eigenes Profil und Duplikate ueberspringen
        if (p.user_id === userId || seen.has(p.user_id)) return;
        seen.add(p.user_id);
        users.push({
          id: p.user_id,
          username: p.profiles?.username || 'User',
          avatar_url: p.profiles?.avatar_url || null,
          hasUnviewed: true, // TODO: Echte Story-Views integrieren
        });
      });
    });

    return users;
  };

  // ============================
  // Story-Ring Bereich (oben im Screen)
  // Zeigt Chat-Partner mit echten Profilbildern
  // ============================
  const renderStorySection = () => (
    <View className="py-3 border-b border-gray-100">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        data={[{ id: 'add', type: 'add' }, ...getStoryUsers()]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: any }) => {
          // "Neue Story erstellen"-Button
          if (item.type === 'add') {
            return (
              <Pressable className="items-center mr-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center border-2 border-dashed"
                  style={{ borderColor: theme.colors.neutral.gray[300] }}
                >
                  <PlusIcon size={24} color={theme.colors.neutral.gray[400]} />
                </View>
                <Text
                  className="text-xs mt-1.5 text-gray-500"
                  style={{ fontFamily: 'Manrope_500Medium' }}
                >
                  Deine Story
                </Text>
              </Pressable>
            );
          }

          // Story-Ring eines Users mit echtem Profilbild
          return (
            <Pressable className="items-center mr-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{
                  // Ring-Farbe: Blau wenn ungesehen, Grau wenn gesehen
                  borderWidth: 2.5,
                  borderColor: item.hasUnviewed
                    ? theme.colors.primary.main
                    : theme.colors.neutral.gray[300],
                }}
              >
                {/* Profilbild oder Fallback-Icon */}
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    className="w-[52px] h-[52px] rounded-full"
                    style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                  />
                ) : (
                  <View className="w-[52px] h-[52px] rounded-full bg-gray-100 items-center justify-center">
                    <UserIcon size={24} color={theme.colors.neutral.gray[400]} />
                  </View>
                )}
              </View>
              <Text
                className="text-xs mt-1.5 text-gray-700"
                style={{ fontFamily: 'Manrope_500Medium' }}
                numberOfLines={1}
              >
                {item.username}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  // ============================
  // Einzelne Chat-Zeile in der Liste
  // ============================
  const renderConversationItem = ({ item }: { item: any }) => (
    <Pressable
      className="flex-row items-center px-5 py-3.5"
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      {/* Avatar */}
      <View className="relative">
        {item.displayAvatar ? (
          <Image
            source={{ uri: item.displayAvatar }}
            className="w-14 h-14 rounded-full"
            style={{ backgroundColor: theme.colors.neutral.gray[100] }}
          />
        ) : (
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.neutral.gray[100] }}
          >
            <UserIcon size={28} color={theme.colors.neutral.gray[400]} />
          </View>
        )}

        {/* Gruppen-Indikator: Kleines Badge fuer Gruppenchats */}
        {item.type === 'group' && (
          <View
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full items-center justify-center border-2 border-white"
            style={{ backgroundColor: theme.colors.primary.main }}
          >
            <Text className="text-white text-[8px] font-bold">
              {item.conversation_participants?.length || 0}
            </Text>
          </View>
        )}
      </View>

      {/* Chat-Info: Name, letzte Nachricht, Zeitstempel */}
      <View className="flex-1 ml-3.5">
        <View className="flex-row items-center justify-between mb-1">
          {/* Chat-Name */}
          <Text
            className="text-base text-gray-900 flex-1 mr-2"
            style={{
              fontFamily: item.unreadCount > 0 ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
            }}
            numberOfLines={1}
          >
            {item.displayName || 'Unbekannt'}
          </Text>

          {/* Zeitstempel der letzten Nachricht */}
          <Text
            className="text-xs"
            style={{
              color: item.unreadCount > 0
                ? theme.colors.primary.main
                : theme.colors.neutral.gray[400],
              fontFamily: 'Manrope_400Regular',
            }}
          >
            {formatTime(item.lastMessage?.created_at)}
          </Text>
        </View>

        {/* Letzte Nachricht Vorschau + Unread Badge */}
        <View className="flex-row items-center justify-between">
          <Text
            className="text-sm flex-1 mr-2"
            style={{
              color: item.unreadCount > 0
                ? theme.colors.neutral.gray[800]
                : theme.colors.neutral.gray[500],
              fontFamily: item.unreadCount > 0 ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
            }}
            numberOfLines={1}
          >
            {getMessagePreview(item.lastMessage)}
          </Text>

          {/* Unread-Badge: Zeigt Anzahl ungelesener Nachrichten */}
          {item.unreadCount > 0 && (
            <View
              className="min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5"
              style={{ backgroundColor: theme.colors.primary.main }}
            >
              <Text
                className="text-white text-xs font-bold"
                style={{ fontFamily: 'Manrope_700Bold' }}
              >
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  // ============================
  // Leerer Zustand (keine Chats vorhanden)
  // ============================
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${theme.colors.primary.main}10` }}
      >
        <PencilSquareIcon size={36} color={theme.colors.primary.main} />
      </View>
      <Text
        className="text-lg text-gray-900 mb-2"
        style={{ fontFamily: 'Manrope_700Bold' }}
      >
        Noch keine Chats
      </Text>
      <Text
        className="text-sm text-gray-500 text-center px-10"
        style={{ fontFamily: 'Manrope_400Regular' }}
      >
        Starte eine Unterhaltung mit jemandem aus deiner Community
      </Text>
    </View>
  );

  // ============================
  // RENDER
  // ============================
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header: Titel + Neuer Chat Button */}
      <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
        <Text
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          Chats
        </Text>
        <Pressable
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: theme.colors.neutral.gray[100] }}
          onPress={() => {
            // TODO: Neuen Chat erstellen (User-Suche oeffnen)
          }}
        >
          <PencilSquareIcon size={22} color={theme.colors.neutral.gray[700]} />
        </Pressable>
      </View>

      {/* Suchleiste */}
      <View className="px-5 pb-2">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
          <MagnifyingGlassIcon size={20} color={theme.colors.neutral.gray[400]} />
          <TextInput
            className="flex-1 ml-2.5 text-base text-gray-900"
            placeholder="Suchen..."
            placeholderTextColor={theme.colors.neutral.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontFamily: 'Manrope_400Regular', paddingVertical: 0 }}
          />
        </View>
      </View>

      {/* Story-Ring Bereich */}
      {renderStorySection()}

      {/* Chat-Liste */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredConversations.length === 0 ? { flex: 1 } : { paddingBottom: 20 }
          }
          // Pull-to-Refresh: Konversationen ueber den Store neu laden
          onRefresh={() => userId && loadConversations(userId)}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}
