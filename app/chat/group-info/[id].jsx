/**
 * Gruppeninfo — WhatsApp-inspiriert: Hero, Quick-Actions, Medien-Zeile, Mitgliederliste mit Bio.
 * Daten: getConversationById (inkl. profiles.bio), Medien-Zaehlung separat.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import {
  getConversationById,
  countGroupSharedMediaMessages,
} from '../../../services/chatService';
import { uploadChatImage } from '../../../services/storageService';
import { theme } from '../../../constants/theme';

import GroupInfoNavBar from '../../../components/chat/group-info/GroupInfoNavBar';
import GroupInfoHero from '../../../components/chat/group-info/GroupInfoHero';
import GroupInfoQuickActions from '../../../components/chat/group-info/GroupInfoQuickActions';
import GroupInfoDescriptionCard from '../../../components/chat/group-info/GroupInfoDescriptionCard';
import GroupInfoDescriptionModal from '../../../components/chat/group-info/GroupInfoDescriptionModal';
import GroupInfoStatsRow from '../../../components/chat/group-info/GroupInfoStatsRow';
import GroupInfoMemberRow, {
  GROUP_MEMBER_ROW_TEXT_INSET,
} from '../../../components/chat/group-info/GroupInfoMemberRow';
import { MagnifyingGlassIcon } from 'react-native-heroicons/solid';
import GroupInfoEditModal from '../../../components/chat/group-info/GroupInfoEditModal';

export default function GroupInfoScreen() {
  const router = useRouter();
  const rawConvId = useLocalSearchParams().id;
  const conversationId = Array.isArray(rawConvId) ? rawConvId[0] : rawConvId;
  const userId = useAuthStore((s) => s.userId);
  const updateGroupConversation = useChatStore((s) => s.updateGroupConversation);

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [mediaCount, setMediaCount] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [localImageUri, setLocalImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const [descModalOpen, setDescModalOpen] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  /** Konversation frisch laden (inkl. Bios der Teilnehmer) */
  const reload = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const conv = await getConversationById(conversationId);
      if (!conv || conv.type !== 'group') {
        setConversation(null);
        return;
      }
      const displayName = conv.name || 'Gruppe';
      const displayAvatar =
        conv.avatar_url != null && String(conv.avatar_url).trim() !== ''
          ? String(conv.avatar_url).trim()
          : null;
      setConversation({ ...conv, displayName, displayAvatar });
      const n = await countGroupSharedMediaMessages(conversationId);
      setMediaCount(n);
    } catch (e) {
      console.error('[GroupInfo] reload:', e);
      Alert.alert('Fehler', 'Gruppendaten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const membersSorted = useMemo(() => {
    const parts = conversation?.conversation_participants || [];
    return [...parts].sort((a, b) => {
      const ra = a.role === 'admin' ? 0 : 1;
      const rb = b.role === 'admin' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const ua = a.profiles?.username || '';
      const ub = b.profiles?.username || '';
      return ua.localeCompare(ub, undefined, { sensitivity: 'base' });
    });
  }, [conversation]);

  const openEdit = useCallback(() => {
    setEditName(conversation?.name || '');
    setLocalImageUri(null);
    setEditOpen(true);
  }, [conversation?.name]);

  const pickImage = useCallback(async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung', 'Zugriff auf die Mediathek wurde verweigert.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('[GroupInfo] ImagePicker:', e);
    }
  }, []);

  const handleSaveEdit = useCallback(async () => {
    const name = String(editName || '').trim();
    if (!name || !userId || !conversationId) return;
    setSaving(true);
    try {
      let avatarUrl = conversation?.avatar_url ?? null;
      if (localImageUri) {
        avatarUrl = await uploadChatImage(conversationId, localImageUri, 'image/jpeg');
      }
      await updateGroupConversation(conversationId, userId, {
        name,
        avatar_url: avatarUrl,
      });
      setEditOpen(false);
      setLocalImageUri(null);
      await reload();
    } catch (e) {
      console.error('[GroupInfo] save:', e);
      Alert.alert(
        'Speichern fehlgeschlagen',
        'Bitte prüfe deine Berechtigung (z. B. nur Gruppenersteller kann ändern) oder versuche es erneut.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    editName,
    userId,
    conversationId,
    conversation?.avatar_url,
    localImageUri,
    updateGroupConversation,
    reload,
  ]);

  const onMemberPress = useCallback(
    (memberUserId) => {
      router.push(`/user/${memberUserId}`);
    },
    [router],
  );

  /** Gruppenbeschreibung speichern (Supabase `description`) */
  const handleSaveDescription = useCallback(
    async (description) => {
      if (!userId || !conversationId) return;
      setSavingDescription(true);
      try {
        await updateGroupConversation(conversationId, userId, { description });
        setDescModalOpen(false);
        await reload();
      } catch (e) {
        console.error('[GroupInfo] description save:', e);
        Alert.alert(
          'Speichern fehlgeschlagen',
          'Bitte prüfe deine Berechtigung (Admin oder Ersteller) oder versuche es erneut.',
        );
      } finally {
        setSavingDescription(false);
      }
    },
    [userId, conversationId, updateGroupConversation, reload],
  );

  if (loading && !conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <GroupInfoNavBar onBack={() => router.back()} onEdit={() => {}} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <GroupInfoNavBar onBack={() => router.back()} onEdit={() => {}} />
        <View style={styles.center}>
          <Text style={styles.errText}>Gruppe nicht gefunden.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GroupInfoNavBar onBack={() => router.back()} onEdit={openEdit} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBottom}
      >
        <GroupInfoHero
          groupName={conversation.displayName || conversation.name}
          memberCount={membersSorted.length}
          avatarUrl={conversation.displayAvatar || conversation.avatar_url}
        />

        <GroupInfoQuickActions
          onAudio={() => Alert.alert('Audio', 'Gruppenanruf folgt in einer späteren Version.')}
          onVideo={() => Alert.alert('Video', 'Gruppen-Videoanruf folgt in einer späteren Version.')}
          onN8Pics={() =>
            Alert.alert('N8-Pics', 'Hier kommt euer USP — Inhalt folgt.')
          }
          onSearch={() => Alert.alert('Suche', 'Chat-Suche folgt in einer späteren Version.')}
        />

        <GroupInfoDescriptionCard
          description={conversation.description}
          onPressEdit={() => setDescModalOpen(true)}
        />

        <GroupInfoStatsRow
          mediaCount={mediaCount}
          onPress={() =>
            Alert.alert('Medien', 'Gemeinsame Medien — Detailansicht folgt.')
          }
        />

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.memberBlock}
        >
          {/* Wie WhatsApp: „N Mitglieder“ links, Suche rechts über der Karte */}
          <View style={styles.memberListHeader}>
            <Text style={styles.memberHeaderText}>
              {membersSorted.length} Mitglieder
            </Text>
          </View>
          <View style={styles.memberCard}>
            {membersSorted.map((p, idx) => {
              const prof = p.profiles;
              const uid = p.user_id;
              const isAdmin = p.role === 'admin';
              return (
                <View key={uid} style={styles.memberRowWrap}>
                  <GroupInfoMemberRow
                    username={prof?.username}
                    bio={prof?.bio}
                    avatarUrl={prof?.avatar_url}
                    isAdmin={isAdmin}
                    onPress={() => onMemberPress(uid)}
                  />
                  {idx < membersSorted.length - 1 ? (
                    <View style={styles.sep} />
                  ) : null}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      <GroupInfoEditModal
        visible={editOpen}
        onClose={() => {
          setEditOpen(false);
          setLocalImageUri(null);
        }}
        initialName={conversation.name || ''}
        initialAvatarUrl={conversation.avatar_url}
        localPreviewUri={localImageUri}
        onChangeName={setEditName}
        onPickImage={pickImage}
        onSave={handleSaveEdit}
        saving={saving}
        name={editName}
      />

      <GroupInfoDescriptionModal
        visible={descModalOpen}
        onClose={() => setDescModalOpen(false)}
        initialDescription={conversation.description}
        onSave={handleSaveDescription}
        saving={savingDescription}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errText: {
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.neutral.gray[600],
  },
  scrollBottom: {
    paddingBottom: 32,
  },
  memberBlock: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  memberListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  memberHeaderText: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 14,
    color: theme.colors.neutral.gray[600],
  },
  memberCard: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.white,
    overflow: 'hidden',
    alignSelf: 'stretch',
    width: '100%',
    ...theme.shadows.sm,
  },
  /** Volle Breite pro Zeile — verhindert Schrumpfen der Row auf die Avatarbreite */
  memberRowWrap: {
    width: '100%',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.neutral.gray[200],
    marginLeft: GROUP_MEMBER_ROW_TEXT_INSET,
  },
});
