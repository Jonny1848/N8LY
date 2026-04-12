/**
 * Neuer Chat – Schritt 2: Name und Bild fuer Mehrpersonen-Chat, dann Erstellen.
 *
 * Referenz-Design:
 * - Header: umrandeter Zurück-Button + „Chat einrichten" + „Erstellen" (blau)
 * - „CHATNAME" Uppercase-Label + Eingabe mit UserGroup-Icon + blaue Unterlinie
 * - „CHATBILD" Uppercase-Label + Upload-Card (110×110)
 * - „Participants: N" + horizontale Avatare mit ×-Badge
 *
 * Styling durchgehend NativeWind/Tailwind.
 */
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeftIcon,
  XMarkIcon,
  PhotoIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';
import { Image } from 'expo-image';
import { File } from 'expo-file-system';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../stores/useAuthStore';
import useChatStore from '../stores/useChatStore';
import { supabase } from '../lib/supabase';

/** RN: fetch().blob() liefert oft 0 Bytes — gleiche Strategie wie storageService.js */
async function readLocalUriAsArrayBuffer(uri) {
  const file = new File(uri);
  return file.arrayBuffer();
}

// ── Avatar-Hilfsfunktionen ──

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

export default function NewChatDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const createGroupChat = useChatStore((s) => s.createGroupChat);

  /** Mitglieder aus Schritt 1 (JSON-String im Query-Param) */
  const raw = useLocalSearchParams().members;
  const initialMembers = useMemo(() => {
    try {
      return JSON.parse(typeof raw === 'string' ? raw : '[]');
    } catch {
      return [];
    }
  }, [raw]);

  const [chatName, setChatName] = useState('');
  const [members, setMembers] = useState(initialMembers);
  const [chatImageUri, setChatImageUri] = useState(null);
  const [creating, setCreating] = useState(false);

  /** Chat-Bild per ImagePicker waehlen */
  const pickChatImage = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung', 'Zugriff auf die Mediathek wurde verweigert.', [{ text: 'OK' }]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setChatImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('[NEW CHAT] ImagePicker:', e);
      Alert.alert('Fehler', 'Das Bild konnte nicht geladen werden.', [{ text: 'OK' }]);
    }
  };

  /** Bild in Supabase Storage hochladen → public URL */
  const uploadChatImage = async () => {
    if (!chatImageUri) return null;
    try {
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const arrayBuffer = await readLocalUriAsArrayBuffer(chatImageUri);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error('[NEW CHAT] Upload Fehler:', uploadError);
        return null;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return urlData?.publicUrl ?? null;
    } catch (e) {
      console.error('[NEW CHAT] Upload:', e);
      return null;
    }
  };

  /** Mehrpersonen-Chat erstellen (Name + optionaler Avatar-Upload) */
  const onCreate = async () => {
    const name = chatName.trim();
    if (!userId || !name) {
      Alert.alert('Chat', 'Bitte gib einen Chatnamen ein.', [{ text: 'OK' }]);
      return;
    }
    if (members.length === 0) {
      Alert.alert('Chat', 'Mindestens ein Mitglied erforderlich.', [{ text: 'OK' }]);
      return;
    }
    setCreating(true);
    try {
      const avatarUrl = await uploadChatImage();
      const conversationId = await createGroupChat(
        userId,
        name,
        members.map((m) => m.id),
        avatarUrl,
      );
      if (!conversationId) {
        Alert.alert('Chat', 'Der Chat konnte nicht erstellt werden.', [{ text: 'OK' }]);
        return;
      }
      router.replace(`/chat/${conversationId}`);
    } finally {
      setCreating(false);
    }
  };

  const canCreate = chatName.trim().length > 0 && members.length > 0;
  /** Wie MessageInput Send: aktiv auch waehrend creating, sonst faellt das Gradient sofort zurueck */
  const createLooksActive = canCreate || creating;

  /** Gleiches Muster wie MessageInput: Skalierung + Crossfade zweier LinearGradients */
  const createActive = useSharedValue(0);
  useEffect(() => {
    createActive.value = withTiming(createLooksActive ? 1 : 0, { duration: 260 });
  }, [createLooksActive]);

  const createBtnScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createActive.value * 0.06 + 0.94 }],
  }));

  const createInactiveGradOpacity = useAnimatedStyle(() => ({
    opacity: 1 - createActive.value,
  }));

  const createActiveGradOpacity = useAnimatedStyle(() => ({
    opacity: createActive.value,
  }));

  const createLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      createActive.value,
      [0, 1],
      [theme.colors.neutral.gray[500], '#ffffff'],
    ),
  }));

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3">
        {/* Zurück-Button mit Umrandung */}
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-xl border-[1.5px] border-gray-200"
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <ChevronLeftIcon size={20} color={theme.colors.neutral.gray[700]} />
        </Pressable>
        <Text
          className="flex-1 text-2xl text-gray-800 ml-3"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          Chat einrichten
        </Text>
        {/* „Erstellen": wie MessageInput-Sendebutton — Animated.View + LinearGradient-Crossfade */}
        <Pressable onPress={onCreate} disabled={!canCreate || creating}>
          <Animated.View
            className="rounded-full overflow-hidden px-5 py-2.5 items-center justify-center min-w-[104px]"
            style={createBtnScaleStyle}
          >
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, createInactiveGradOpacity]}
            >
              <LinearGradient
                colors={[theme.colors.neutral.gray[300], theme.colors.neutral.gray[200]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, createActiveGradOpacity]}
            >
              <LinearGradient
                colors={[theme.colors.primary.main, theme.colors.primary.main2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            {creating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Animated.Text
                style={[
                  { fontFamily: 'Manrope_700Bold', fontSize: 15 },
                  createLabelStyle,
                ]}
              >
                Erstellen
              </Animated.Text>
            )}
          </Animated.View>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── CHATNAME ── */}
        <Text
          className="px-4 mt-5 mb-2 text-xs tracking-widest text-gray-400"
          style={{ fontFamily: 'Manrope_600SemiBold' }}
        >
          CHATNAME
        </Text>
        <View className="mx-4 flex-row items-center border-b-[1.5px] pb-3 border-blue-800">
          <UserGroupIcon size={24} color={theme.colors.neutral.gray[400]} />
          <TextInput
            className="flex-1 ml-3 text-lg text-gray-900"
            placeholder="z. B. Wochenend-Trip"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            value={chatName}
            onChangeText={setChatName}
            autoFocus
            style={{ fontFamily: 'Manrope_400Regular', paddingVertical: 0 }}
          />
        </View>

        {/* ── CHATBILD (zentriert, rund wie finales Avatar) ── */}
        <Text
          className="px-4 mt-8 mb-4 text-xs tracking-widest text-gray-400"
          style={{ fontFamily: 'Manrope_600SemiBold' }}
        >
          CHATBILD
        </Text>
        <Pressable onPress={pickChatImage} className="self-center">
          {chatImageUri ? (
            <View className="rounded-full overflow-hidden w-[180px] h-[180px]">
              <Image
                source={{ uri: chatImageUri }}
                style={{ width: 180, height: 180 }}
                contentFit="cover"
              />
            </View>
          ) : (
            <View className="rounded-full items-center justify-center w-[180px] h-[180px] bg-gray-50 border-2 border-dashed border-gray-300">
              <PhotoIcon size={36} color={theme.colors.neutral.gray[800]} />
              <Text
                className="mt-2 text-center text-xs leading-4 text-gray-400"
                style={{ fontFamily: 'Manrope_500Medium' }}
              >
                Bild hochladen
              </Text>
            </View>
          )}
        </Pressable>

        {/* ── TEILNEHMER ── */}
        <Text
          className="px-4 mt-8 mb-4 text-xl text-gray-800"
          style={{ fontFamily: 'Manrope_600SemiBold' }}
        >
          Teilnehmer: {members.length}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ overflow: 'visible' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
        >
          {members.map((m) => (
            <View key={m.id} className="items-center mr-4" style={{ overflow: 'visible' }}>
              <View style={{ overflow: 'visible' }}>
                <RoundAvatar url={m.avatar_url} name={m.username} size={56} />
              </View>
              <Text
                numberOfLines={1}
                className="text-[11px] mt-1.5 max-w-[64px] text-center text-gray-500"
                style={{ fontFamily: 'Manrope_500Medium' }}
              >
                {m.username}
              </Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}
