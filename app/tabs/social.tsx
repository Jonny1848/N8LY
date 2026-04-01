/**
 * Social Screen – Chat-Uebersicht mit Stories (Supabase storyService) und Konversationsliste.
 * Menue: Neuer Chat / Neue Gruppe / Einstellungen (Profil-Tab); Story-Ring laedt bei Tab-Fokus neu.
 */
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { UserIcon, PlusIcon } from 'react-native-heroicons/solid';
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';
import { getActiveStories } from '../../services/storyService';

const SEARCH_BAR_HEIGHT = 56;

export default function SocialScreen() {
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.conversationsLoading);
  const { loadConversations, subscribeChatList, unsubscribeChatList } = useChatStore();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  /** Story-Ring: Gruppen aus getActiveStories (eigene + andere Nutzer) */
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  
  const searchAnim = useSharedValue(0);

  // ============================
  // Konversationen laden und Realtime abonnieren
  // ============================
  useEffect(() => {
    if (!userId) return;
    loadConversations(userId);
    subscribeChatList(userId);
    return () => unsubscribeChatList();
  }, [userId]);

  /** Stories bei jedem Tab-Fokus neu laden (Ring aktuell nach Upload / Ablauf) */
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      (async () => {
        setStoriesLoading(true);
        try {
          const data = await getActiveStories(userId);
          if (active) setStoryGroups(data || []);
        } catch (e) {
          console.error('[SOCIAL] Stories laden:', e);
          if (active) setStoryGroups([]);
        } finally {
          if (active) setStoriesLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [userId]),
  );

  /**
   * Suchleiste ein-/ausblenden mit Reanimated 
   */
  const onSearchCloseComplete = useCallback(() => {
    setSearchQuery('');
    setSearchVisible(false);
  }, []);

  const toggleSearch = useCallback(() => {
    if (searchVisible) {
      // Schliessen: animieren, danach State zuruecksetzen
      searchAnim.value = withTiming(
        0,
        { duration: 220, easing: Easing.out(Easing.ease) },
        (finished) => {
          if (finished) runOnJS(onSearchCloseComplete)();
        }
      );
    } else {
      setSearchVisible(true);
      searchAnim.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [searchVisible, searchAnim, onSearchCloseComplete]);

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
      case 'file': {
        const label = msg.content?.trim();
        if (!label) return '📎 Datei';
        return msg.content.length > 36 ? `📎 ${msg.content.substring(0, 36)}…` : `📎 ${msg.content}`;
      }
       case 'system':
        return msg.content || 'Systemnachricht';
      default:
        return msg.content?.length > 40
          ? msg.content.substring(0, 40) + '...'
          : msg.content || '';
    }
  };

  /** Plus-Button: oeffnet den kombinierten Neuer-Chat/Neue-Gruppe Screen */
  const onNewChatPress = useCallback(() => {
    router.push('/new-group');
  }, [router]);

  // ============================
  // HEADER: Suchbutton links, "Chats" Mitte, Optionen rechts
  // ============================
  const renderHeader = () => (
    <View className="flex-row items-center px-5 pt-2 pb-1">
      {/* Suchbutton links */}
      <Pressable
        className="w-10 h-10 items-center justify-center"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={toggleSearch}
      >
        <MagnifyingGlassIcon size={24} color={theme.colors.neutral.gray[800]} />
      </Pressable>

      {/* Titel zentriert */}
      <View className="flex-1 items-center justify-center">
        <Text
          className="text-[28px]"
          style={{ fontFamily: 'Manrope_700Bold', color: theme.colors.neutral.gray[900] }}
        >
          Chats
        </Text>
      </View>

      {/* Plus-Button: blauer Kreis mit weissem Plus */}
      <Pressable
        onPress={onNewChatPress}
        className="w-10 h-10 items-center justify-center rounded-full"
        style={{ backgroundColor: theme.colors.primary.main }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <PlusIcon size={22} color="#fff" />
      </Pressable>
    </View>
  );

    // SUCHLEISTE: Immer gerendert, Opacity + Hoehe per Reanimated animiert

  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchAnim.value,
    maxHeight: searchAnim.value * SEARCH_BAR_HEIGHT,
    overflow: 'hidden' as const,
  }));

  const renderSearchBar = () => (
    <Animated.View style={[{ paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 }, searchBarAnimatedStyle]}>
      <View
        className="flex-row items-center rounded-xl px-4"
        style={{
          backgroundColor: "white",
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
          editable={searchVisible}
          style={{
            fontFamily: 'Manrope_400Regular',
            paddingVertical: 0,
            color: theme.colors.neutral.gray[900],
          }}
        />
        <Pressable onPress={toggleSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <XMarkIcon size={20} color={theme.colors.neutral.gray[500]} />
        </Pressable>
      </View>
    </Animated.View>
  );

  // ============================
  // STORY-BEREICH: Kreisrunde Avatare (horizontal scrollbar)
  // ============================
  const renderStorySection = () => {
    const ownBundle = storyGroups.find((g) => g.isOwn);
    const others = storyGroups.filter((g) => !g.isOwn);
    const storyRowItems: any[] = [
      {
        id: 'self',
        type: 'self',
        bundle: ownBundle,
      },
      ...others.map((g, idx) => ({
        id: g.user?.id ?? `story-other-${idx}`,
        type: 'other',
        bundle: g,
      })),
    ];

    return (
      <View className="pb-4 pt-2">
        {storiesLoading && storyGroups.length === 0 ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          </View>
        ) : null}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          data={storyRowItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: any }) => {
            // Erste Kachel: eigene Story (Ring wenn aktiv) oder „Deine Story“ zum Erstellen
            if (item.type === 'self') {
              const hasOwnStories = item.bundle?.stories?.length > 0;
              const ringActive = item.bundle?.hasUnviewed;
              if (!hasOwnStories) {
                return (
                  <Pressable
                    className="items-center mr-5"
                    onPress={() => router.push('/stories/create')}
                  >
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
              const u = item.bundle.user;
              return (
                <Pressable
                  className="items-center mr-5"
                  onPress={() => userId && router.push(`/stories/${userId}`)}
                >
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center"
                    style={{
                      borderWidth: 2.5,
                      borderColor: ringActive
                        ? theme.colors.primary.main
                        : theme.colors.neutral.gray[300],
                    }}
                  >
                    {u?.avatar_url ? (
                      <Image
                        source={{ uri: u.avatar_url }}
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
                    Deine Story
                  </Text>
                </Pressable>
              );
            }

            const g = item.bundle;
            const u = g?.user;
            return (
              <Pressable
                className="items-center mr-5"
                onPress={() => u?.id && router.push(`/stories/${u.id}`)}
              >
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{
                    borderWidth: 2.5,
                    borderColor: g?.hasUnviewed
                      ? theme.colors.primary.main
                      : theme.colors.neutral.gray[300],
                  }}
                >
                  {u?.avatar_url ? (
                    <Image
                      source={{ uri: u.avatar_url }}
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
                  className="text-xs mt-1.5 max-w-[64px]"
                  style={{
                    fontFamily: 'Manrope_500Medium',
                    color: theme.colors.neutral.gray[700],
                  }}
                  numberOfLines={1}
                >
                  {u?.username || 'Story'}
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
      </View>

      {/* Chat-Info: Name + Vorschau links, Zeitstempel + Unread-Badge rechts untereinander */}
      <View className="flex-1 ml-3.5">
        <View className="flex-row items-start justify-between">
          {/* Links: Name und Nachrichtenvorschau */}
          <View className="flex-1 mr-3 min-w-0">
            <Text
              className="text-[16px] mb-0.5"
              style={{
                fontFamily: item.unreadCount > 0 ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
                color: theme.colors.neutral.gray[900],
              }}
              numberOfLines={1}
            >
              {item.displayName || 'Unbekannt'}
            </Text>
            <Text
              className="text-sm"
              style={{
                fontFamily: item.unreadCount > 0 ? 'Manrope_500Medium' : 'Manrope_400Regular',
                color: theme.colors.neutral.gray[500],
              }}
              numberOfLines={1}
            >
              {getMessagePreview(item.lastMessage)}
            </Text>
          </View>

          {/* Rechts: Zeitstempel oben, Unread-Badge darunter (wie im Screenshot) */}
          <View className="items-end">
            <Text
              className="text-xs"
              style={{
                fontFamily: 'Manrope_400Regular',
                color: theme.colors.neutral.gray[400],
              }}
            >
              {formatTime(item.lastMessage?.created_at)}
            </Text>
            {item.unreadCount > 0 && (
              <View
                className="min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5 mt-1"
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



  return (
    <View className="flex-1 bg-white">
      {/* Oberer Bereich hervorgehoben: SafeArea + Header + Suchleiste + Stories (grau bis ganz oben) */}
      <View
        style={{
          backgroundColor: theme.colors.neutral.gray[100],
          paddingTop: insets.top,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          // Dezenter Schatten zur Hervorhebung
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        {renderHeader()}
        {renderSearchBar()}
        {renderStorySection()}
      </View>

      

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
            <View className="h-px bg-gray-200 mx-5" />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredConversations.length === 0 ? { flex: 1 } : { paddingBottom: 24 }
          }
          onRefresh={() => userId && loadConversations(userId)}
          refreshing={loading}
        />
      )}
    </View>
  );
}
