/**
 * Neue Gruppe – Schritt 2: Gruppenname, Gruppenbild und Erstellen.
 *
 * Referenz-Design:
 * - Header: umrandeter Zurueck-Button + „Neue Gruppe" + „Erstellen" (blau)
 * - „GROUP NAME" Uppercase-Label + Eingabe mit UserGroup-Icon + blaue Unterlinie
 * - „GROUP IMAGE" Uppercase-Label + Upload-Card (110×110)
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
import { theme } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import useChatStore from '../stores/useChatStore';
import { supabase } from '../lib/supabase';

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

export default function NewGroupDetailsScreen() {
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

  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(initialMembers);
  const [groupImageUri, setGroupImageUri] = useState(null);
  const [creating, setCreating] = useState(false);

  const removeMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  /** Gruppenbild per ImagePicker waehlen */
  const pickGroupImage = async () => {
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
        setGroupImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('[NEW GROUP] ImagePicker:', e);
      Alert.alert('Fehler', 'Das Bild konnte nicht geladen werden.', [{ text: 'OK' }]);
    }
  };

  /** Gruppenbild in Supabase Storage hochladen → public URL */
  const uploadGroupImage = async () => {
    if (!groupImageUri) return null;
    try {
      const fileName = `group_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const response = await fetch(groupImageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error('[NEW GROUP] Upload Fehler:', uploadError);
        return null;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return publicUrl;
    } catch (e) {
      console.error('[NEW GROUP] Upload:', e);
      return null;
    }
  };

  /** Gruppe erstellen (Name + optionaler Avatar-Upload) */
  const onCreate = async () => {
    const name = groupName.trim();
    if (!userId || !name) {
      Alert.alert('Gruppe', 'Bitte gib einen Gruppennamen ein.', [{ text: 'OK' }]);
      return;
    }
    if (members.length === 0) {
      Alert.alert('Gruppe', 'Mindestens ein Mitglied erforderlich.', [{ text: 'OK' }]);
      return;
    }
    setCreating(true);
    try {
      const avatarUrl = await uploadGroupImage();
      const conversationId = await createGroupChat(
        userId,
        name,
        members.map((m) => m.id),
        avatarUrl,
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

  const canCreate = groupName.trim().length > 0 && members.length > 0;

  /** Animierter Uebergang fuer den „Erstellen"-Button (Opacity + Hintergrund) */
  const createActive = useSharedValue(0);
  useEffect(() => {
    createActive.value = withTiming(canCreate ? 1 : 0, { duration: 300 });
  }, [canCreate]);

  const createBtnStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      createActive.value,
      [0, 1],
      [theme.colors.neutral.gray[100], theme.colors.primary.main],
    ),
    transform: [{ scale: createActive.value * 0.05 + 0.95 }],
  }));

  const createLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      createActive.value,
      [0, 1],
      [theme.colors.neutral.gray[400], '#ffffff'],
    ),
  }));

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3">
        {/* Zurueck-Button mit Umrandung */}
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-xl border-[1.5px] border-gray-200"
          accessibilityRole="button"
          accessibilityLabel="Zurueck"
        >
          <ChevronLeftIcon size={20} color={theme.colors.neutral.gray[700]} />
        </Pressable>
        <Text
          className="flex-1 text-2xl text-gray-800 ml-3"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          Neue Gruppe
        </Text>
        {/* „Erstellen" als gefuellter Pill-Button */}
        <Pressable onPress={onCreate} disabled={!canCreate || creating}>
          <Animated.View
            className="rounded-full px-5 py-2.5"
            style={createBtnStyle}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
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
        {/* ── GRUPPENNAME ── */}
        <Text
          className="px-4 mt-5 mb-2 text-xs tracking-widest text-gray-400"
          style={{ fontFamily: 'Manrope_600SemiBold' }}
        >
          GRUPPENNAME
        </Text>
        <View className="mx-4 flex-row items-center border-b-[1.5px] pb-3 border-blue-400">
          <UserGroupIcon size={24} color={theme.colors.neutral.gray[400]} />
          <TextInput
            className="flex-1 ml-3 text-lg text-gray-900"
            placeholder="z. B. Wochenend-Trip"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
            style={{ fontFamily: 'Manrope_400Regular', paddingVertical: 0 }}
          />
        </View>

        {/* ── GRUPPENBILD (zentriert, rund wie finales Avatar) ── */}
        <Text
          className="px-4 mt-8 mb-4 text-xs tracking-widest text-gray-400"
          style={{ fontFamily: 'Manrope_600SemiBold' }}
        >
          GRUPPENBILD
        </Text>
        <Pressable onPress={pickGroupImage} className="self-center">
          {groupImageUri ? (
            <View className="rounded-full overflow-hidden w-[180px] h-[180px]">
              <Image
                source={{ uri: groupImageUri }}
                style={{ width: 180, height: 180 }}
                contentFit="cover"
              />
            </View>
          ) : (
            <View className="rounded-full items-center justify-center w-[180px] h-[180px] bg-gray-50 border-2 border-dashed border-gray-300">
              <PhotoIcon size={36} color={theme.colors.primary.main2} />
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
