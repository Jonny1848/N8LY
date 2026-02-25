/**
 * Social Screen – Chat-Uebersicht mit Stories und Konversationsliste
 *
 * Inspiriert vom "Chats"-Screenshot: Cleanes, helles Design.
 *
 * LAYOUT (von oben nach unten):
 * 1) Header: "Chats" links gross, Optionen-Icon + Lupe rechts
 * 2) Suchleiste: Standardmaessig ausgeblendet, wird per Lupe eingeblendet
 * 3) Stories: Kreisrunde Avatare (horizontal scrollbar) mit Profilbildern
 * 4) Chat-Liste: Runde Avatare, Name, Nachrichtenvorschau, Zeitstempel, Unread-Badge
 *
 * Realtime: Die Chat-Liste aktualisiert sich automatisch bei neuen Nachrichten.
 */
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import {
  MagnifyingGlassIcon,
  EllipsisHorizontalCircleIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { UserIcon, PlusIcon } from 'react-native-heroicons/solid';
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';

// LayoutAnimation auf Android aktivieren
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SocialScreen() {
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.conversationsLoading);
  const { loadConversations, subscribeChatList, unsubscribeChatList } = useChatStore();

  // Suchleiste ist standardmaessig versteckt
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();

  // ============================
  // Konversationen laden und Realtime abonnieren
  // ============================
  useEffect(() => {
    if (!userId) return;
    loadConversations(userId);
    subscribeChatList(userId);
    return () => unsubscribeChatList();
  }, [userId]);

  /**
   * Suchleiste ein-/ausblenden mit sanfter Animation.
   * Beim Oeffnen wird der Fokus automatisch gesetzt,
   * beim Schliessen wird die Suche zurueckgesetzt.
   */
  const toggleSearch = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (searchVisible) {
      setSearchQuery('');
      setSearchVisible(false);
    } else {
      setSearchVisible(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchVisible]);

  /**
   * Filtert Konversationen nach Suchbegriff.
   */
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    return conv.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  /**
   * Formatiert den Zeitstempel: Heute = Uhrzeit, Gestern = "Gestern", aelter = Datum.
   */
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  /**
   * Vorschautext der letzten Nachricht (Bilder/Voice als Platzhalter).
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
        return msg.content?.length > 40
          ? msg.content.substring(0, 40) + '...'
          : msg.content || '';
    }
  };

  /**
   * Story-Daten aus Konversationen: einzigartige Chat-Partner mit Profilbildern.
   */
  const getStoryUsers = () => {
    const seen = new Set<string>();
    const users: any[] = [];
    conversations.forEach((conv) => {
      conv.conversation_participants?.forEach((p: any) => {
        if (p.user_id === userId || seen.has(p.user_id)) return;
        seen.add(p.user_id);
        users.push({
          id: p.user_id,
          username: p.profiles?.username || 'User',
          avatar_url: p.profiles?.avatar_url || null,
          hasUnviewed: true,
        });
      });
    });
    return users;
  };

  // ============================
  // HEADER: "Chats" links, Optionen + Lupe rechts
  // ============================
  const renderHeader = () => (
    <View className="flex-row items-center justify-between px-5 pt-2 pb-1">
      {/* Titel */}
      <Text
        className="text-[28px]"
        style={{ fontFamily: 'Manrope_700Bold', color: theme.colors.neutral.gray[900] }}
      >
        Chats
      </Text>

      {/* Icon-Gruppe rechts */}
      <View className="flex-row items-center">
        {/* Optionen-Button (fuer Gruppen erstellen, etc.) */}
        <Pressable
          className="w-10 h-10 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => {
            // TODO: ActionSheet oder Modal oeffnen (Neue Gruppe, Neuer Chat, etc.)
          }}
        >
          <EllipsisHorizontalCircleIcon size={26} color={theme.colors.neutral.gray[800]} />
        </Pressable>

        {/* Lupe: Blendet Suchleiste ein/aus */}
        <Pressable
          className="w-10 h-10 items-center justify-center ml-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={toggleSearch}
        >
          <MagnifyingGlassIcon size={24} color={theme.colors.neutral.gray[800]} />
        </Pressable>
      </View>
    </View>
  );

  // ============================
  // SUCHLEISTE: Nur sichtbar wenn searchVisible = true
  // ============================
  const renderSearchBar = () => {
    if (!searchVisible) return null;
    return (
      <View className="px-5 pb-2 pt-1">
        <View
          className="flex-row items-center rounded-xl px-4"
          style={{
            backgroundColor: theme.colors.neutral.gray[100],
            height: 44,
          }}
        >
          <MagnifyingGlassIcon size={18} color={theme.colors.neutral.gray[400]} />
          <TextInput
            ref={searchInputRef}
            className="flex-1 ml-2.5 text-base"
            placeholder="Suchen..."
            placeholderTextColor={theme.colors.neutral.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              fontFamily: 'Manrope_400Regular',
              paddingVertical: 0,
              color: theme.colors.neutral.gray[900],
            }}
          />
          {/* X-Button zum Schliessen der Suche */}
          <Pressable onPress={toggleSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <XMarkIcon size={20} color={theme.colors.neutral.gray[500]} />
          </Pressable>
        </View>
      </View>
    );
  };

  // ============================
  // STORY-BEREICH: Kreisrunde Avatare (horizontal scrollbar)
  // ============================
  const renderStorySection = () => {
    const storyUsers = getStoryUsers();
    const data = [{ id: 'add', type: 'add' } as any, ...storyUsers];

    return (
      <View className="pb-4 pt-2">
        
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: any }) => {
            // "Neue Story erstellen" – Kreis mit gestricheltem Rand
            if (item.type === 'add') {
              return (
                <Pressable className="items-center mr-5">
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center"
                    style={{
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: theme.colors.neutral.gray[300],
                    }}
                  >
                    <PlusIcon size={24} color={theme.colors.neutral.gray[400]} />
                  </View>
                  <Text
                    className="text-xs mt-1.5"
                    style={{
                      fontFamily: 'Manrope_500Medium',
                      color: theme.colors.neutral.gray[600],
                    }}
                  >
                    Deine Story
                  </Text>
                </Pressable>
              );
            }

            // Story-Ring: Kreisrunder Avatar mit farbigem Rand
            return (
              <Pressable className="items-center mr-5">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{
                    borderWidth: 2.5,
                    borderColor: item.hasUnviewed
                      ? theme.colors.primary.main
                      : theme.colors.neutral.gray[300],
                  }}
                >
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      className="w-[52px] h-[52px] rounded-full"
                      style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                    />
                  ) : (
                    <View
                      className="w-[52px] h-[52px] rounded-full items-center justify-center"
                      style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                    >
                      <UserIcon size={24} color={theme.colors.neutral.gray[400]} />
                    </View>
                  )}
                </View>
                <Text
                  className="text-xs mt-1.5"
                  style={{
                    fontFamily: 'Manrope_500Medium',
                    color: theme.colors.neutral.gray[700],
                  }}
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
  };

  // ============================
  // EINZELNE CHAT-ZEILE
  // Runder Avatar, Name, Vorschau, Zeit, Unread-Badge
  // ============================
  const renderConversationItem = ({ item }: { item: any }) => (
    <Pressable
      className="flex-row items-center px-5 py-3.5 active:opacity-70"
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      {/* Runder Avatar */}
      <View className="relative">
        {item.displayAvatar ? (
          <Image
            source={{ uri: item.displayAvatar }}
            className="w-[52px] h-[52px] rounded-full"
            style={{ backgroundColor: theme.colors.neutral.gray[100] }}
          />
        ) : (
          <View
            className="w-[52px] h-[52px] rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.neutral.gray[100] }}
          >
            <UserIcon size={26} color={theme.colors.neutral.gray[400]} />
          </View>
        )}

        {/* Gruppen-Badge: Anzahl Teilnehmer */}
        {item.type === 'group' && (
          <View
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full items-center justify-center border-2 border-white"
            style={{ backgroundColor: theme.colors.primary.main }}
          >
            <Text
              className="text-white text-[8px]"
              style={{ fontFamily: 'Manrope_700Bold' }}
            >
              {item.conversation_participants?.length || 0}
            </Text>
          </View>
        )}
      </View>

      {/* Chat-Info */}
      <View className="flex-1 ml-3.5">
        <View className="flex-row items-center justify-between mb-1">
          {/* Chat-Name: Fett wenn ungelesen */}
          <Text
            className="text-[16px] flex-1 mr-2"
            style={{
              fontFamily: item.unreadCount > 0 ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
              color: theme.colors.neutral.gray[900],
            }}
            numberOfLines={1}
          >
            {item.displayName || 'Unbekannt'}
          </Text>

          {/* Zeitstempel */}
          <Text
            className="text-xs"
            style={{
              fontFamily: 'Manrope_400Regular',
              color: theme.colors.neutral.gray[400],
            }}
          >
            {formatTime(item.lastMessage?.created_at)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          {/* Vorschau der letzten Nachricht */}
          <Text
            className="text-sm flex-1 mr-2"
            style={{
              fontFamily: item.unreadCount > 0 ? 'Manrope_500Medium' : 'Manrope_400Regular',
              color: theme.colors.neutral.gray[500],
            }}
            numberOfLines={1}
          >
            {getMessagePreview(item.lastMessage)}
          </Text>

          {/* Unread-Badge */}
          {item.unreadCount > 0 && (
            <View
              className="min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5"
              style={{ backgroundColor: theme.colors.primary.main }}
            >
              <Text
                className="text-white text-[11px]"
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
  // LEERER ZUSTAND (keine Chats)
  // ============================
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${theme.colors.primary.main}12` }}
      >
        <MagnifyingGlassIcon size={28} color={theme.colors.primary.main} />
      </View>
      <Text
        className="text-lg mb-1.5"
        style={{ fontFamily: 'Manrope_700Bold', color: theme.colors.neutral.gray[900] }}
      >
        Noch keine Chats
      </Text>
      <Text
        className="text-sm text-center px-12"
        style={{ fontFamily: 'Manrope_400Regular', color: theme.colors.neutral.gray[500] }}
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
      {renderHeader()}
      {renderSearchBar()}
      {renderStorySection()}

      {/* Trennlinie zwischen Stories und Chat-Liste */}
      <View
        className="mx-5 mb-1"
        style={{ height: 1, backgroundColor: theme.colors.neutral.gray[100] }}
      />

      {/* Chat-Liste mit Trennlinien zwischen den Eintraegen (nicht bis zum Rand) */}
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
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.neutral.gray[200],
                marginLeft: 20,
                marginRight: 20,
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredConversations.length === 0 ? { flex: 1 } : { paddingBottom: 24 }
          }
          onRefresh={() => userId && loadConversations(userId)}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}
