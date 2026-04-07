/**
 * Neuer Einzelchat – Suche nach Username, dann createDirectConversation + Navigation zum Chat.
 */
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { UserIcon } from 'react-native-heroicons/solid';
import { Image } from 'expo-image';
import { theme } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import useChatStore from '../stores/useChatStore';
import { searchUsers } from '../services/chatService';

export default function NewChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const createDirectChat = useChatStore((s) => s.createDirectChat);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);

  /** User-Suche (min. 2 Zeichen) – debounced ueber onSubmitEditing / Button moeglich; hier bei jedem Query mit Verzoegerung */
  const runSearch = useCallback(async () => {
    if (!userId || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchUsers(query.trim(), userId, 20);
      setResults(data || []);
    } catch (e) {
      console.error('[NEW CHAT] Suche:', e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, userId]);

  /** Chat mit gewaehltem Profil oeffnen (bestehend oder neu) */
  const onPickUser = async (otherId) => {
    if (!userId || starting) return;
    setStarting(true);
    try {
      const conversationId = await createDirectChat(userId, otherId);
      if (!conversationId) {
        Alert.alert('Chat', 'Der Chat konnte nicht gestartet werden.', [{ text: 'OK' }]);
        return;
      }
      router.replace(`/chat/${conversationId}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-1"
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <ChevronLeftIcon size={26} color={theme.colors.neutral.gray[800]} />
        </Pressable>
        <Text
          className="flex-1 text-center text-lg text-gray-900 -mr-9"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          Neuer Chat
        </Text>
      </View>

      <View className="px-4 pt-4">
        <TextInput
          className="rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900"
          placeholder="Nutzernamen suchen (mind. 2 Zeichen)..."
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
          className="mt-3 rounded-xl py-3 items-center"
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

      {starting ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.length >= 2 && !searching ? (
              <Text
                className="text-center text-gray-500 mt-8"
                style={{ fontFamily: 'Manrope_400Regular' }}
              >
                Keine Treffer. Andere Schreibweise versuchen.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => onPickUser(item.id)}
            >
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                />
              ) : (
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.colors.neutral.gray[100] }}
                >
                  <UserIcon size={22} color={theme.colors.neutral.gray[400]} />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-base text-gray-900" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                  {item.username}
                </Text>
                {item.bio ? (
                  <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                    {item.bio}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
