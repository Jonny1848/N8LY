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
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UserPlusIcon,
} from 'react-native-heroicons/outline';
import { UserIcon, PlusIcon } from 'react-native-heroicons/solid';
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';
import { getActiveStories } from '../../services/storyService';
import ChatsEmptyStateIllustration from '../../components/chat/ChatsEmptyStateIllustration';

const SEARCH_BAR_HEIGHT = 56;


const AVATAR_RING_GRADIENT_COLORS = [
  theme.colors.primary.main2,
  theme.colors.primary.main,
  theme.colors.accent.main,
  theme.colors.accent.dark,
] as const;



/** Plus im leeren Story-Ring: Goldtoenung wie im Referenz-UI */
const STORY_ADD_PLUS_GOLD = '#F4D03F';

/** Story-Labels auf blauem Grund */
const STORY_LABEL_ON_BLUE = 'rgba(255,255,255,0.88)';

/** Ringe auf blauem Header: inaktiv leicht transparent, neu weiss */
const STORY_RING_IDLE_ON_BLUE = 'rgba(255,255,255,0.5)';

/**
 * Story-Zeile: äußerer Kreis (vorher w-16 = 64px) — leicht größer, damit Avatare nicht wie die Header-Icons wirken.
 * Inner-Idle: proportional zu altem 52/64, damit der weisse Ring gleich aussieht.
 */
const STORY_AVATAR_OUTER_PX = 72;
const STORY_AVATAR_INNER_IDLE_PX = 59;

/**
 * Untere Rundung der blauen Kopf-Karte zum weissen Chat-Bereich darunter.
 */
const HEADER_CARD_BOTTOM_RADIUS = 0;

/** Weissraum unter der Story-Karte, bevor die Chatliste optisch neu beginnt */
const CHAT_LIST_TOP_SPACING = 28;

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
      // Schliessen: animieren, danach State Zurücksetzen
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
      case 'poll': {
        // Poll-Frage aus dem JSON-Content extrahieren
        try {
          const poll = JSON.parse(msg.content ?? '{}');
          const question = poll?.question?.trim();
          if (!question) return '📊 Umfrage';
          return question.length > 36 ? `📊 ${question.substring(0, 36)}…` : `📊 ${question}`;
        } catch {
          return '📊 Umfrage';
        }
      }
      case 'system':
        return msg.content || 'Systemnachricht';
      default:
        return msg.content?.length > 40
          ? msg.content.substring(0, 40) + '...'
          : msg.content || '';
    }
  };

  /** Plus-Button: oeffnet „Neuer Chat" (Einzel- oder Mehrpersonen) */
  const onNewChatPress = useCallback(() => {
    router.push('/new-chat');
  }, [router]);

  // ============================
  // HEADER: weisser Such-Kreis, weisser Titel, dunklerer Blau-Kreis + weisses UserPlusIcon
  // ============================
  const renderHeader = () => (
    <View className="flex-row items-center px-5 pb-2 pt-3">
      {/* Suche: weisser Kreis auf Blau — duenne Kontur hilft auf hellem Blau */}
      <Pressable
        className="h-11 w-11 items-center justify-center rounded-full bg-white"
        style={{
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.07)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={toggleSearch}
      >
        <MagnifyingGlassIcon size={22} color={theme.colors.neutral.gray[900]} />
      </Pressable>

      <View className="flex-1 items-center justify-center">
        <Text
          className="text-[28px]"
          style={{ fontFamily: 'Manrope_700Bold', color: theme.colors.neutral.white }}
        >
          Chats
        </Text>
      </View>

      {/* Etwas dunkleres Blau als die Fläche — subtiler Kontrast zum Header */}
      <Pressable
        onPress={onNewChatPress}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: theme.colors.primary.main2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <UserPlusIcon size={22} color="#fff" />
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
      {/* Weisses Pill-Feld auf blauem Kopf */}
      <View
        className="flex-row items-center rounded-full px-4"
        style={{
          backgroundColor: theme.colors.neutral.white,
          height: 44,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 3,
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
      <View className="pb-5 pt-1">
        {storiesLoading && storyGroups.length === 0 ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color={theme.colors.neutral.white} />
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
                    className="items-center mr-6"
                    onPress={() => router.push('/chat/stories/create')}
                  >
                    <View
                      className="rounded-full items-center justify-center"
                      style={{
                        width: STORY_AVATAR_OUTER_PX,
                        height: STORY_AVATAR_OUTER_PX,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: theme.colors.neutral.white,
                      }}
                    >
                      {/* Plus leicht hoch skaliert mit dem grösseren Ring */}
                      <PlusIcon size={28} color={STORY_ADD_PLUS_GOLD} />
                    </View>
                    <Text
                      className="text-xs mt-1.5"
                      style={{
                        fontFamily: 'Manrope_500Medium',
                        color: STORY_LABEL_ON_BLUE,
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
                  className="items-center mr-6"
                  onPress={() => userId && router.push(`/chat/stories/${userId}`)}
                >
                  {/* Gradient-Ring wie in StoryHeaderOverlay: padding erzeugt den Ring */}
                  <View style={{ width: STORY_AVATAR_OUTER_PX, height: STORY_AVATAR_OUTER_PX }}>
                    <LinearGradient
                      colors={AVATAR_RING_GRADIENT_COLORS}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flex: 1, borderRadius: 9999, padding: 2.5 }}
                    >
                      <View
                        className="w-full h-full rounded-full overflow-hidden items-center justify-center"
                        style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                      >
                        {u?.avatar_url ? (
                          <Image
                            source={{ uri: u.avatar_url }}
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <UserIcon size={28} color={theme.colors.neutral.gray[400]} />
                        )}
                      </View>
                    </LinearGradient>
                  </View>
                  <Text
                    className="text-xs mt-1.5"
                    style={{
                      fontFamily: 'Manrope_500Medium',
                      color: STORY_LABEL_ON_BLUE,
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
                className="items-center mr-6"
                onPress={() => u?.id && router.push(`/chat/stories/${u.id}`)}
              >
                {/* Ungesehen → Gradient-Ring, gesehen → schlichter Idle-Ring */}
                {g?.hasUnviewed ? (
                  <View style={{ width: STORY_AVATAR_OUTER_PX, height: STORY_AVATAR_OUTER_PX }}>
                    <LinearGradient
                      colors={AVATAR_RING_GRADIENT_COLORS}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flex: 1, borderRadius: 9999, padding: 2.5 }}
                    >
                      <View
                        className="w-full h-full rounded-full overflow-hidden items-center justify-center"
                        style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                      >
                        {u?.avatar_url ? (
                          <Image
                            source={{ uri: u.avatar_url }}
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <UserIcon size={28} color={theme.colors.neutral.gray[400]} />
                        )}
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: STORY_AVATAR_OUTER_PX,
                      height: STORY_AVATAR_OUTER_PX,
                      borderWidth: 2.5,
                      borderColor: STORY_RING_IDLE_ON_BLUE,
                    }}
                  >
                    {u?.avatar_url ? (
                      <Image
                        source={{ uri: u.avatar_url }}
                        className="rounded-full"
                        style={{
                          width: STORY_AVATAR_INNER_IDLE_PX,
                          height: STORY_AVATAR_INNER_IDLE_PX,
                          backgroundColor: theme.colors.neutral.gray[100],
                        }}
                      />
                    ) : (
                      <View
                        className="rounded-full items-center justify-center"
                        style={{
                          width: STORY_AVATAR_INNER_IDLE_PX,
                          height: STORY_AVATAR_INNER_IDLE_PX,
                          backgroundColor: theme.colors.neutral.gray[100],
                        }}
                      >
                        <UserIcon size={28} color={theme.colors.neutral.gray[400]} />
                      </View>
                    )}
                  </View>
                )}
                <Text
                  className="text-xs mt-1.5"
                  style={{
                    maxWidth: STORY_AVATAR_OUTER_PX,
                    fontFamily: 'Manrope_500Medium',
                    color: STORY_LABEL_ON_BLUE,
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
  const renderConversationItem = ({ item }: { item: any }) => {
    /** Gruppen: avatar_url aus DB, falls displayAvatar fehlt (z. B. nach Reload) */
    const avatarUri =
      (typeof item.displayAvatar === 'string' && item.displayAvatar.trim()) ||
      (item.type === 'group' && typeof item.avatar_url === 'string' && item.avatar_url.trim()
        ? item.avatar_url.trim()
        : '');

    return (
    <Pressable
      className="flex-row items-center px-5 py-3.5 active:opacity-70"
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      {/* Runder Avatar */}
      <View className="relative">
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
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
  };

  // ============================
  // LEERER ZUSTAND (keine Chats) — Layout wie gaengige „No messages“-Screens:
  // Illustration mit Kreis + Liste, darunter Headline + Subline (zentriert, ohne Rahmenkarte).
  // ============================
  /**
   * Trennt Story-Bereich und Chatliste: Abstand, kleine Sektionszeile, Haarlinie.
   * Nur sichtbar wenn Konversationen vorhanden (sonst Empty State ohne Balken).
   */
  const renderChatListHeader = () => {
    if (filteredConversations.length === 0) return null;
    return (
      <View className="bg-white" style={{ paddingTop: CHAT_LIST_TOP_SPACING }}>
        <View className="px-5 pb-3">
          <Text
            className="text-[13px] mb-3"
            style={{
              fontFamily: 'Manrope_600SemiBold',
              color: theme.colors.neutral.gray[500],
              letterSpacing: 0.3,
            }}
          >
            Konversationen
          </Text>
          <View
            className="h-px w-full"
            style={{ backgroundColor: theme.colors.neutral.gray[200] }}
          />
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6">
      <ChatsEmptyStateIllustration />
      <Text
        className="mt-7 text-center text-[22px] leading-7"
        style={{ fontFamily: 'Manrope_700Bold', color: theme.colors.neutral.gray[900] }}
      >
        Huch! Noch keine Chats
      </Text>
      <Text
        className="mt-2 text-center text-[15px] leading-[22px]"
        style={{
          fontFamily: 'Manrope_400Regular',
          color: theme.colors.neutral.gray[500],
          maxWidth: 300,
        }}
      >
        Lade jemanden aus deiner Community zum Chat ein!
      </Text>
    </View>
  );



  return (
    <View className="flex-1 bg-white">
      {/* Helle Icons in der Statusleiste auf blauem Kopf */}
      <StatusBar style="light" />
      {/*
        Kopf: Schatten auf einem Wrapper (iOS: zuverlaessiger als nur am Gradient).
        LinearGradient innen mit gleicher unterer Rundung.
      */}
      <View
        style={{
          zIndex: 2,
          borderBottomLeftRadius: HEADER_CARD_BOTTOM_RADIUS,
          borderBottomRightRadius: HEADER_CARD_BOTTOM_RADIUS,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.22,
          shadowRadius: 18,
          elevation: 14,
        }}
      >
        <LinearGradient
          colors={[theme.colors.primary.main3, theme.colors.primary.main3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            paddingTop: insets.top,
            borderBottomLeftRadius: HEADER_CARD_BOTTOM_RADIUS,
            borderBottomRightRadius: HEADER_CARD_BOTTOM_RADIUS,
            overflow: 'hidden',
          }}
        >
          {renderHeader()}
          {renderSearchBar()}
          {renderStorySection()}
        </LinearGradient>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: theme.colors.neutral.white }}
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          ListHeaderComponent={renderChatListHeader}
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
