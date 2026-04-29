/**
 * AddMembersModal — gleiche UX wie „Neuer Chat“ (Schritt 1): Auswahl der Gruppenteilnehmer.
 *
 * Entspricht strukturell und optisch app/new-chat.jsx:
 * - Header: umrandeter Zurück-Button (Chevron) + grosser Titel + „Hinzufügen“ rechts (grau → aktiv blau wie „Weiter“)
 * - Suchzeile: weiss mit grauer Rahmenlinie, grosse dunkle Lupe
 * - Ausgewählte Mitglieder: horizontale Avatare 56 px mit ×-Badge oben rechts
 * - Trennstrich → „Teilnehmer hinzufügen“ als Überschrift über der Liste
 * - Kontaktliste: Avatar 48 + Username + Checkbox (Gluestack, wie bei new-chat)
 *
 * Props wie zuvor: visible, onClose, onAdd(ids), loading, existingIds
 */
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { CheckIcon } from 'react-native-heroicons/solid';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { theme } from '../../../constants/theme';
import useAuthStore from '../../../stores/useAuthStore';
import { searchUsers, getKnownContacts } from '../../../services/chatService';
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
} from '../../../components/ui/checkbox';

// ── Avatar-Hilfen (wie new-chat.jsx) ──

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#2563eb', '#7c3aed', '#db2777',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function hasAvatar(url) {
  return typeof url === 'string' && url.trim().length > 0;
}

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
      <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: size * 0.36 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

export default function AddMembersModal({
  visible,
  onClose,
  onAdd,
  loading = false,
  existingIds = [],
}) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);

  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  /** Ausgewaehlte Zeilen gleiche Shape wie new-chat members: { id, username, avatar_url } */
  const [members, setMembers] = useState([]);

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);
  const memberSet = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  useEffect(() => {
    if (!visible || !userId) return;
    setContactsLoading(true);
    let active = true;
    getKnownContacts(userId)
      .then((data) => {
        if (active) setContacts(data || []);
      })
      .catch(() => {
        if (active) setContacts([]);
      })
      .finally(() => {
        if (active) setContactsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, userId]);

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
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, userId]);

  const displayList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? [
          ...contacts.filter((c) => c.username?.toLowerCase().includes(q)),
          ...searchResults.filter((r) => !contacts.some((c) => c.id === r.id)),
        ]
      : contacts;
    return base.filter((u) => !existingSet.has(u.id));
  }, [query, contacts, searchResults, existingSet]);

  const toggleMember = useCallback((user) => {
    if (memberSet.has(user.id)) {
      setMembers((prev) => prev.filter((m) => m.id !== user.id));
    } else {
      setMembers((prev) => [
        ...prev,
        { id: user.id, username: user.username, avatar_url: user.avatar_url },
      ]);
    }
  }, [memberSet]);

  const handleClose = useCallback(() => {
    if (loading) return;
    onClose();
    setTimeout(() => {
      setQuery('');
      setMembers([]);
    }, 300);
  }, [loading, onClose]);

  const handleAdd = useCallback(async () => {
    if (members.length === 0 || loading) return;
    await onAdd(members.map((m) => m.id));
  }, [members, loading, onAdd]);

  // „Weiter“-Animation aus new-chat: grau wenn leer, primary wenn Auswahl oder loading
  const addActive = useSharedValue(0);
  const addLooksActive = members.length > 0 || loading;
  useEffect(() => {
    addActive.value = withTiming(addLooksActive ? 1 : 0, { duration: 260 });
  }, [addLooksActive]);

  const addLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      addActive.value,
      [0, 1],
      [theme.colors.neutral.gray[300], theme.colors.primary.main],
    ),
  }));

  const ListHeader = useCallback(() => (
    <View>
      {/* Suchzeile wie new-chat */}
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
                <Pressable
                  onPress={() => toggleMember(m)}
                  hitSlop={6}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center bg-black"
                  accessibilityRole="button"
                  accessibilityLabel={`${m.username} abwählen`}
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

      {members.length > 0 ? <View className="h-px bg-gray-200 mx-4 mt-3" /> : null}

      <Text className="px-4 pb-3 pt-5 text-xl text-gray-800" style={{ fontFamily: 'Manrope_700Bold' }}>
        Teilnehmer hinzufügen
      </Text>
    </View>
  ), [members, query, toggleMember]);

  const canAdd = members.length > 0 && !loading;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      {/* gleicher Aussenzug wie new-chat: weiss + Safe-Inset */}
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* ── Header: wie new-chat (Zurück-Rahmen + Titel + rechter CTA-Text animiert) ── */}
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-xl border-[1.5px] border-gray-200"
            accessibilityRole="button"
            accessibilityLabel="Schliessen"
            disabled={loading}
          >
            <ChevronLeftIcon size={20} color={theme.colors.neutral.gray[700]} strokeWidth={2} />
          </Pressable>
          <View className="flex-1 ml-3">
            {/*
              Wie bei new-chat („Neuer Chat“ + darunter eigene Sektionsüberschrift):
              Haupttitel oben kurz/halb-anders zum Abschnitt „Teilnehmer hinzufügen“ weiter unten.
            */}
            <Text className="text-2xl text-gray-800" style={{ fontFamily: 'Manrope_700Bold' }}>
              Teilnehmer wählen
            </Text>
          </View>
          <Pressable
            onPress={handleAdd}
            disabled={!canAdd && !loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Ausgewaehlte Nutzer zur Gruppe hinzufügen"
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary.main} />
            ) : (
              <Animated.Text style={[{ fontFamily: 'Manrope_600SemiBold', fontSize: 16 }, addLabelStyle]}>
                Hinzufügen
              </Animated.Text>
            )}
          </Pressable>
        </View>

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
            contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
            ItemSeparatorComponent={() => <View className="h-px bg-gray-200 mx-4" />}
            renderItem={({ item }) => {
              const selected = memberSet.has(item.id);
              return (
                <Pressable
                  onPress={() => toggleMember(item)}
                  className="flex-row items-center py-4 px-4"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <RoundAvatar url={item.avatar_url} name={item.username} size={48} />
                  <Text
                    className="flex-1 ml-3 text-[15px] text-gray-500"
                    style={{ fontFamily: 'Manrope_500Medium' }}
                  >
                    {item.username}
                  </Text>
                  <View pointerEvents="none">
                    <Checkbox value={item.id} isChecked={selected} size="lg">
                      <CheckboxIndicator
                        className="rounded-lg border-2 border-outline-300"
                        style={
                          selected
                            ? {
                                backgroundColor: theme.colors.primary.main,
                                borderColor: theme.colors.primary.main,
                              }
                            : undefined
                        }
                      >
                        <CheckboxIcon as={CheckIcon} className="text-white" />
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
    </Modal>
  );
}
