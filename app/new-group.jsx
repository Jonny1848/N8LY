/**
 * Neue Gruppe – Name + Mitglieder per User-Suche waehlen, dann createGroupConversation.
 */
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { UserIcon } from 'react-native-heroicons/solid';
import { Image } from 'expo-image';
import { theme } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import useChatStore from '../stores/useChatStore';
import { searchUsers } from '../services/chatService';

export default function NewGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const createGroupChat = useChatStore((s) => s.createGroupChat);

  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState([]);
  const [creating, setCreating] = useState(false);

  const runSearch = useCallback(async () => {
    if (!userId || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchUsers(query.trim(), userId, 20);
      const excluded = new Set(members.map((m) => m.id));
      setResults((data || []).filter((u) => !excluded.has(u.id)));
    } catch (e) {
      console.error('[NEW GROUP] Suche:', e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, userId, members]);

  const addMember = (u) => {
    setMembers((prev) => [...prev, { id: u.id, username: u.username, avatar_url: u.avatar_url }]);
    setResults((prev) => prev.filter((r) => r.id !== u.id));
    setQuery('');
  };

  const removeMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const onCreate = async () => {
    const name = groupName.trim();
    if (!userId || !name) {
      Alert.alert('Gruppe', 'Bitte gib einen Gruppennamen ein.', [{ text: 'OK' }]);
      return;
    }
    if (members.length === 0) {
      Alert.alert('Gruppe', 'Bitte fuege mindestens ein Mitglied hinzu.', [{ text: 'OK' }]);
      return;
    }
    setCreating(true);
    try {
      const conversationId = await createGroupChat(
        userId,
        name,
        members.map((m) => m.id),
        null,
      );
      if (!conversationId) {
        Alert.alert('Gruppe', 'Die Gruppe konnte nicht erstellt werden.', [{ text: 'OK' }]);
        return;
      }
      router.replace(`/chat/${conversationId}`);
    } finally {
      setCreating(false);
    }
  };

  const renderHeader = () => (
    <View className="px-4 pb-2">
      <Text className="text-sm text-gray-600 mt-2 mb-1" style={{ fontFamily: 'Manrope_500Medium' }}>
        Gruppenname
      </Text>
      <TextInput
        className="rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900"
        placeholder="z. B. Wochenend-Trip"
        placeholderTextColor={theme.colors.neutral.gray[400]}
        value={groupName}
        onChangeText={setGroupName}
        style={{ fontFamily: 'Manrope_400Regular' }}
      />

      <Text className="text-sm text-gray-600 mt-5 mb-1" style={{ fontFamily: 'Manrope_500Medium' }}>
        Mitglieder
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 min-h-[44px]">
        {members.length === 0 ? (
          <Text className="text-gray-400 text-sm py-2" style={{ fontFamily: 'Manrope_400Regular' }}>
            Noch niemand ausgewaehlt
          </Text>
        ) : (
          members.map((m) => (
            <View
              key={m.id}
              className="flex-row items-center rounded-full px-3 py-1.5 mr-2 mb-1"
              style={{ backgroundColor: theme.colors.neutral.gray[100] }}
            >
              <Text className="text-sm text-gray-800 mr-1" style={{ fontFamily: 'Manrope_500Medium' }}>
                @{m.username}
              </Text>
              <Pressable onPress={() => removeMember(m.id)} hitSlop={8}>
                <XMarkIcon size={16} color={theme.colors.neutral.gray[600]} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <TextInput
        className="rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900"
        placeholder="Nutzer suchen (mind. 2 Zeichen)..."
        placeholderTextColor={theme.colors.neutral.gray[400]}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={runSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ fontFamily: 'Manrope_400Regular' }}
      />
      <Pressable
        onPress={runSearch}
        disabled={searching || query.trim().length < 2}
        className="mt-2 rounded-xl py-3 items-center mb-2"
        style={{
          backgroundColor:
            query.trim().length < 2 ? theme.colors.neutral.gray[200] : theme.colors.primary.main,
        }}
      >
        {searching ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white" style={{ fontFamily: 'Manrope_600SemiBold' }}>
            Suchen
          </Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-1"
          accessibilityRole="button"
          accessibilityLabel="Zurueck"
        >
          <ChevronLeftIcon size={26} color={theme.colors.neutral.gray[800]} />
        </Pressable>
        <Text
          className="flex-1 text-center text-lg text-gray-900 -mr-9"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          Neue Gruppe
        </Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            className="flex-row items-center py-3 px-4 border-b border-gray-100"
            onPress={() => addMember(item)}
          >
            {item.avatar_url ? (
              <Image
                source={{ uri: item.avatar_url }}
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: theme.colors.neutral.gray[100] }}
              />
            ) : (
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.colors.neutral.gray[100] }}
              >
                <UserIcon size={20} color={theme.colors.neutral.gray[400]} />
              </View>
            )}
            <Text className="ml-3 text-base text-gray-900" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              {item.username}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <Text
              className="text-center text-gray-500 px-4 mt-4"
              style={{ fontFamily: 'Manrope_400Regular' }}
            >
              Keine weiteren Treffer oder Suche ausfuehren.
            </Text>
          ) : null
        }
      />

      <View
        className="absolute left-0 right-0 px-4 bg-white border-t border-gray-100 pt-3"
        style={{ bottom: 0, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={onCreate}
          disabled={creating}
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: theme.colors.primary.main }}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
              Gruppe erstellen
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
