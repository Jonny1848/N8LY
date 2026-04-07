/**
 * Neue Gruppe – Schritt 1: Teilnehmer auswaehlen.
 *
 * Referenz-Design:
 * - Header: umrandeter Zurück-Button + „Gruppe erstellen" + „Weiter" (blau)
 * - Suchleiste: weiss, graue Umrandung, dunkle Lupe
 * - Ausgewaehlte Mitglieder: runde Avatare horizontal mit ×-Badge + Name
 * - Trennstrich → „Teilnehmer hinzufuegen" → Kontaktliste mit Checkbox
 *
 * Alles in einer einzigen FlatList (kein verschachteltes Scrolling).
 * Styling durchgehend mit NativeWind / Tailwind-className.
 */
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  ChevronLeftIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from 'react-native-heroicons/outline';
import { Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { theme } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import useChatStore from '../stores/useChatStore';
import { searchUsers, getKnownContacts } from '../services/chatService';
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
} from '../components/ui/checkbox';

// ── Avatar-Hilfsfunktionen ──

/** Stabile Hintergrundfarben fuer Avatare ohne Bild (Hash-basiert) */
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#2563eb', '#7c3aed', '#db2777',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Prueft ob eine avatar_url tatsaechlich nutzbar ist (nicht null, nicht leer) */
function hasAvatar(url) {
  return typeof url === 'string' && url.trim().length > 0;
}

// ── Avatar-Komponente (benoetigt style wegen dynamischer size-Props) ──

function RoundAvatar({ url, name, size = 48 }) {
  if (hasAvatar(url)) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.neutral.gray[200],
        }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontFamily: 'Manrope_700Bold',
          fontSize: size * 0.36,
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ── Komponente ──

export default function NewGroupSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);

  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState([]);
  const [navigating, setNavigating] = useState(false);
  const createDirectChat = useChatStore((s) => s.createDirectChat);

  const memberSet = new Set(members.map((m) => m.id));

  /** Dynamischer Titel: ab 2 Teilnehmern → „Neue Gruppe" */
  const isGroupMode = members.length >= 2;
  const screenTitle = isGroupMode ? 'Neue Gruppe' : 'Neuer Chat';

  /** Animierter Farbuebergang fuer „Weiter" (grau → blau) */
  const nextActive = useSharedValue(0);
  useEffect(() => {
    nextActive.value = withTiming(members.length > 0 ? 1 : 0, { duration: 250 });
  }, [members.length > 0]);

  const nextTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      nextActive.value,
      [0, 1],
      [theme.colors.neutral.gray[300], theme.colors.primary.main],
    ),
  }));

  // ── Beim Mount alle bekannten Kontakte laden ──
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        const data = await getKnownContacts(userId);
        if (active) setContacts(data || []);
      } catch {
        if (active) setContacts([]);
      } finally {
        if (active) setContactsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  // ── Live-Suche (Debounce 300ms, ab 2 Zeichen) ──
  useEffect(() => {
    if (!userId || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchUsers(query.trim(), userId, 30);
        if (active) setSearchResults(data || []);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, userId]);

  /** Angezeigte Liste: leer → alle Kontakte, Eingabe → lokal + DB dedupliziert */
  const displayList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    const localMatches = contacts.filter((c) => c.username?.toLowerCase().includes(q));
    const localIds = new Set(localMatches.map((c) => c.id));
    const extra = searchResults.filter((r) => !localIds.has(r.id));
    return [...localMatches, ...extra];
  }, [query, contacts, searchResults]);

  const toggleMember = (user) => {
    if (memberSet.has(user.id)) {
      setMembers((prev) => prev.filter((m) => m.id !== user.id));
    } else {
      setMembers((prev) => [
        ...prev,
        { id: user.id, username: user.username, avatar_url: user.avatar_url },
      ]);
    }
  };

  /**
   * Weiter-Aktion:
   * - 1 Teilnehmer → Direktchat erstellen/oeffnen
   * - 2+ Teilnehmer → Gruppen-Details Screen
   */
  const handleNext = async () => {
    if (members.length === 0) return;

    if (members.length === 1) {
      setNavigating(true);
      try {
        const conversationId = await createDirectChat(userId, members[0].id);
        if (conversationId) {
          router.replace(`/chat/${conversationId}`);
        }
      } finally {
        setNavigating(false);
      }
      return;
    }

    router.push({
      pathname: '/new-group-details',
      params: { members: JSON.stringify(members) },
    });
  };

  // ── ListHeaderComponent ──
  const ListHeader = () => (
    <View>
      {/* Suchleiste: weiss, graue Umrandung, dunkle Lupe */}
      <View className="px-4 mb-5 pt-3">
        <View className="flex-row items-center h-[52px] rounded-2xl px-4 bg-white border-[1.5px] border-gray-300">
          <MagnifyingGlassIcon size={30} color={theme.colors.neutral.gray[600]} />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-500"
            placeholder="Suchen..."
            placeholderTextColor={theme.colors.neutral.gray[400]}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ fontFamily: 'Manrope_400Regular', paddingVertical: 0 }}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <XMarkIcon size={18} color={theme.colors.neutral.gray[500]} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Ausgewaehlte Mitglieder: horizontale Avatar-Reihe */}
      {members.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ overflow: 'visible' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6 }}
        >
          {members.map((m) => (
            <View key={m.id} className="items-center mr-4" style={{ overflow: 'visible' }}>
              <View style={{ overflow: 'visible' }}>
                <RoundAvatar url={m.avatar_url} name={m.username} size={56} />
                {/* × Badge oben rechts */}
                <Pressable
                  onPress={() => toggleMember(m)}
                  hitSlop={6}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center bg-black"
                >
                  <XMarkIcon size={12} strokeWidth={3} color="#fff" />
                </Pressable>
              </View>
              <Text
                numberOfLines={1}
                className="text-[11px] mt-1 max-w-[64px] text-center text-gray-600"
                style={{ fontFamily: 'Manrope_500Medium' }}
              >
                {m.username}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* Trennstrich nur sichtbar wenn mindestens eine Person ausgewaehlt */}
      {members.length > 0 ? (
        <View className="h-px bg-gray-200 mx-4 mt-3" />
      ) : null}

      {/* Ueberschrift */}
      <Text
        className="px-4 pb-3 pt-5 text-xl text-gray-800"
        style={{ fontFamily: 'Manrope_700Bold' }}
      >
        Teilnehmer hinzufügen
      </Text>
    </View>
  );

  // ============================
  // UI
  // ============================
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3">
        {/* Zurück-Button mit Umrandung (Referenz-Screenshot) */}
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-xl border-[1.5px] border-gray-200"
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <ChevronLeftIcon size={20} color={theme.colors.neutral.gray[700]} />
        </Pressable>
        {/* Titel mit Fade-Uebergang bei Wechsel Neuer Chat ↔ Neue Gruppe */}
        <View className="flex-1 ml-3">
          <Animated.Text
            key={screenTitle}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="text-2xl text-gray-800"
            style={{ fontFamily: 'Manrope_700Bold' }}
          >
            {screenTitle}
          </Animated.Text>
        </View>
        <Pressable
          onPress={handleNext}
          disabled={members.length === 0 || navigating}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {navigating ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : (
            <Animated.Text
              style={[
                { fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
                nextTextStyle,
              ]}
            >
              Weiter
            </Animated.Text>
          )}
        </Pressable>
      </View>

      {/* ── Kontaktliste (alles in einer FlatList) ── */}
      {contactsLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={theme.colors.primary.main2} />
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 32 }}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-200 mx-4" />
          )}
          renderItem={({ item }) => {
            const selected = memberSet.has(item.id);
            return (
              <Pressable
                onPress={() => toggleMember(item)}
                className="flex-row items-center py-4 px-4"
              >
                {/* Avatar */}
                <RoundAvatar url={item.avatar_url} name={item.username} size={48} />
                {/* Username: grauer Ton wie im Referenz-Design */}
                <Text
                  className="flex-1 ml-3 text-[15px] text-gray-500"
                  style={{ fontFamily: 'Manrope_500Medium' }}
                >
                  {item.username}
                </Text>
                {/* Checkbox: nur visuell, Toggle ueber die umgebende Pressable */}
                <View pointerEvents="none">
                  <Checkbox value={item.id} isChecked={selected} size="lg">
                    <CheckboxIndicator
                      className="rounded-lg border-2 border-outline-300"
                      style={
                        selected
                          ? {
                              backgroundColor: theme.colors.primary.main3,
                              borderColor: theme.colors.primary.main3,
                            }
                          : undefined
                      }
                    >
                      <CheckboxIcon as={Check} className="text-white" />
                    </CheckboxIndicator>
                  </Checkbox>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            searching ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={theme.colors.primary.main2} />
              </View>
            ) : query.length > 0 ? (
              <Text
                className="text-center text-gray-500 px-4 mt-8"
                style={{ fontFamily: 'Manrope_400Regular' }}
              >
                Keine Treffer gefunden.
              </Text>
            ) : (
              <Text
                className="text-center text-gray-400 px-6 mt-8"
                style={{ fontFamily: 'Manrope_400Regular' }}
              >
                Noch keine Kontakte vorhanden.
              </Text>
            )
          }
        />
      )}
    </View>
  );
}
