/**
 * Gruppeninfo — WhatsApp-inspiriert: Hero, Quick-Actions, Medien-Zeile, Mitgliederliste mit Bio.
 * Daten: getConversationById (inkl. profiles.bio), Medien-Zaehlung separat.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

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
import { UserPlusIcon } from 'react-native-heroicons/solid';
import { LinearGradient } from 'expo-linear-gradient';
import GroupInfoEditModal from '../../../components/chat/group-info/GroupInfoEditModal';
import MemberActionSheet from '../../../components/chat/group-info/MemberActionSheet';
import AddMembersModal from '../../../components/chat/group-info/AddMembersModal';

export default function GroupInfoScreen() {
  const router = useRouter();
  const rawConvId = useLocalSearchParams().id;
  const conversationId = Array.isArray(rawConvId) ? rawConvId[0] : rawConvId;
  const userId = useAuthStore((s) => s.userId);
  const updateGroupConversation = useChatStore((s) => s.updateGroupConversation);
  const makeAdmin = useChatStore((s) => s.makeAdmin);
  const removeAdmin = useChatStore((s) => s.removeAdmin);
  const removeParticipant = useChatStore((s) => s.removeParticipant);
  const addParticipants = useChatStore((s) => s.addParticipants);
  /** Einzelchat finden/anlegen — liefert conversation_id fuer Route /chat/[id] (nicht user_id). */
  const createDirectChat = useChatStore((s) => s.createDirectChat);

  /** Abstand zum Home-Indikator: Inhalt (insb. Mitglieder-Block) endet sichtbar oberhalb der Safe Area. */
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [mediaCount, setMediaCount] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [localImageUri, setLocalImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const [descModalOpen, setDescModalOpen] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  // Teilnehmer hinzufügen
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  /** Ausgewähltes Mitglied (bleibt gesetzt bis nach der Schliess-Animation, damit kein Flicker) */
  const [selectedMember, setSelectedMember] = useState(null);
  /**
   * Sichtbarkeit des Sheets – separater Boolean, identisch zu `shareSheetVisible` im Chat-Screen.
   * Blur und Sheet animieren auf diesen Wert, NICHT direkt auf selectedMember.
   * So starten Blur-Fade-out und Sheet-Slide-down exakt gleichzeitig.
   */
  const [memberSheetOpen, setMemberSheetOpen] = useState(false);

  /**
   * Blur-Overlay: animiert 200ms parallel zum Gluestack-Actionsheet ein/aus.
   * Basiert auf memberSheetOpen – identisch zum Chat-Screen (shareSheetBlurOpacity).
   */
  const memberSheetBlurOpacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(memberSheetBlurOpacity, {
      toValue: memberSheetOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [memberSheetOpen, memberSheetBlurOpacity]);

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

  /** Ist der aktuell eingeloggte User ein Admin dieser Gruppe? */
  const isCurrentUserAdmin = useMemo(() => {
    const parts = conversation?.conversation_participants || [];
    return parts.some((p) => p.user_id === userId && p.role === 'admin');
  }, [conversation, userId]);

  /** Öffnet das MemberActionSheet für das angetippte Mitglied */
  const onMemberPress = useCallback((participantObj) => {
    setSelectedMember(participantObj);
    setMemberSheetOpen(true);   // Blur + Sheet fahren hoch
  }, []);

  /**
   * Schließt das Sheet – setzt nur den Sichtbarkeits-Boolean.
   * selectedMember bleibt gesetzt, damit das Sheet während der Schliess-Animation
   * keine leeren Daten rendert (gleiche Strategie wie ShareSheet).
   */
  const closeMemberSheet = useCallback(() => setMemberSheetOpen(false), []);

  /** Navigiert zum Profil des ausgewählten Mitglieds */
  const handleNavigateToProfile = useCallback(() => {
    if (!selectedMember) return;
    router.push(`/user/${selectedMember.user_id}`);
  }, [router, selectedMember]);

  /** Ernennt das ausgewählte Mitglied zum Admin (mit Bestätigungsdialog) */
  const handleMakeAdmin = useCallback(() => {
    if (!selectedMember) return;
    const name = selectedMember.profiles?.username || 'Mitglied';
    Alert.alert(
      'Zu Gruppenadmin ernennen',
      `Möchtest du ${name} zum Gruppenadmin ernennen? Admins können Gruppenmitglieder hinzufügen und entfernen.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ernennen',
          onPress: async () => {
            try {
              await makeAdmin(conversationId, selectedMember.user_id);
              await reload();
            } catch (e) {
              console.error('[handleMakeAdmin]', e);
              Alert.alert('Fehler', e?.message || 'Admin-Ernennung fehlgeschlagen. Bitte erneut versuchen.');
            }
          },
        },
      ],
    );
  }, [selectedMember, makeAdmin, conversationId, reload]);

  /** Entzieht dem ausgewählten Mitglied die Admin-Rechte */
  const handleRemoveAdmin = useCallback(() => {
    if (!selectedMember) return;
    const name = selectedMember.profiles?.username || 'Mitglied';
    Alert.alert(
      'Adminrechte entziehen',
      `Möchtest du ${name} die Adminrechte entziehen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entziehen',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAdmin(conversationId, selectedMember.user_id);
              await reload();
            } catch (e) {
              console.error('[handleRemoveAdmin]', e);
              Alert.alert('Fehler', e?.message || 'Adminrechte konnten nicht entzogen werden.');
            }
          },
        },
      ],
    );
  }, [selectedMember, removeAdmin, conversationId, reload]);

  /** Entfernt das ausgewählte Mitglied aus der Gruppe */
  const handleRemoveMember = useCallback(() => {
    if (!selectedMember) return;
    const name = selectedMember.profiles?.username || 'Mitglied';
    Alert.alert(
      'Aus Gruppe entfernen',
      `Möchtest du ${name} aus der Gruppe entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeParticipant(conversationId, selectedMember.user_id);
              await reload();
            } catch (e) {
              console.error('[handleRemoveMember]', e);
              Alert.alert('Fehler', e?.message || 'Mitglied konnte nicht entfernt werden.');
            }
          },
        },
      ],
    );
  }, [selectedMember, removeParticipant, conversationId, reload]);

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

  /**
   * Schnellaktion „Nachricht“: 1:1-Chat oeffnen.
   * Wichtig: /chat/[id] ist conversations.id — niemals user_id navigieren (sonst PGRST116 in getConversationById).
   */
  /** Neue Mitglieder zur Gruppe hinzufuegen */
  const handleAddMembers = useCallback(
    async (memberIds) => {
      if (!conversationId || memberIds.length === 0) return;
      setAddingMembers(true);
      try {
        await addParticipants(conversationId, memberIds);
        setAddMembersOpen(false);
        await reload();
      } catch (e) {
        console.error("[GroupInfo] addMembers:", e);
        Alert.alert("Fehler", e?.message || "Mitglieder konnten nicht hinzugefuegt werden.");
      } finally {
        setAddingMembers(false);
      }
    },
    [conversationId, addParticipants, reload],
  );

  const openSelectedMemberChat = useCallback(async () => {
    if (!selectedMember || !userId) return;
    const otherId = selectedMember.user_id;
    if (otherId === userId) return;
    try {
      const convId = await createDirectChat(userId, otherId);
      if (!convId) {
        Alert.alert('Fehler', 'Der Einzelchat konnte nicht geöffnet werden.');
        return;
      }
      router.push(`/chat/${convId}`);
    } catch (e) {
      console.error('[GroupInfo] openSelectedMemberChat:', e);
      Alert.alert('Fehler', e?.message || 'Chat konnte nicht geöffnet werden.');
    }
  }, [selectedMember, userId, createDirectChat, router]);

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
    /* Äusserer Container: Blur und Sheet liegen als Geschwister der SafeAreaView,
       damit sie den gesamten Bildschirm inkl. Statusleiste überdecken. */
    <View style={styles.outerContainer}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GroupInfoNavBar onBack={() => router.back()} onEdit={openEdit} />

      <ScrollView
        style={styles.scrollFill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
      >
        <GroupInfoHero
          groupName={conversation.displayName || conversation.name}
          memberCount={membersSorted.length}
          avatarUrl={conversation.displayAvatar || conversation.avatar_url}
        />

        {/* N8-Pics öffnet USP-Seite /chat/group-n8-pics; gemeinsame Medien weiter über „Medien“. */}
        <GroupInfoQuickActions
          onAudio={() => Alert.alert('Gruppenanruf', 'Gruppenanrufe werden bald unterstützt.')}
          onVideo={() => Alert.alert('Video-Gruppenanruf', 'Video-Gruppenanrufe werden bald unterstützt.')}
          onN8Pics={() => router.push(`/chat/group-n8-pics/${conversationId}`)}
          onSearch={() => router.push(`/chat/${conversationId}`)}
        />

        <GroupInfoDescriptionCard
          description={conversation.description}
          onPressEdit={() => setDescModalOpen(true)}
        />

        {/* Medien-Zeile: öffnet die Galerie-Seite */}
        <GroupInfoStatsRow
          mediaCount={mediaCount}
          onPress={() => router.push(`/chat/group-media/${conversationId}`)}
        />

        {/*
          Grauer Streifen: nur Padding, kein marginTop (margin waere auf weissem ScrollView sichtbar
          = "weisser Strich" zwischen Medien- und Mitgliederbereich).
        */}
        <View style={styles.statsToMembersDivider} />

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.memberOuter}
        >
          {/*
            Eine weisse Kachel (Radius + Schatten) wie Medien/Beschreibung: Überschrift + Zeilen
            gemeinsam abgerundet, seitlich gray[50] sichtbar.
          */}
          <View style={styles.memberShell}>
            <View style={styles.memberListHeader}>
              <Text style={styles.memberHeaderText}>
                {membersSorted.length} Mitglieder
              </Text>
              {/* Admins dürfen neue Mitglieder einladen */}
              {isCurrentUserAdmin && (
                <Pressable
                  onPress={() => setAddMembersOpen(true)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.88 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Teilnehmer hinzufügen"
                  hitSlop={8}
                >
                  {/*
                    Klar gegenüber „Bearbeiten“ oben rechts abgehoben: gefüllter Gradient-Pill
                    mit Icon — wirkt aktiv / primär, nicht wie reiner Link-Text.
                  */}
                  <LinearGradient
                    colors={[theme.colors.primary.main, theme.colors.primary.main2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.addMemberPillGradient}
                  >
                    <UserPlusIcon size={17} color={theme.colors.neutral.white} strokeWidth={2.2} />
                    <Text style={styles.addMemberPillLabel}>Hinzufügen</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
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
                    onPress={() => onMemberPress(p)}
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

      {/* Teilnehmer hinzufügen (nur für Admins sichtbar) */}
      <AddMembersModal
        visible={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        onAdd={handleAddMembers}
        loading={addingMembers}
        existingIds={membersSorted.map((p) => p.user_id)}
      />

    </SafeAreaView>

    {/*
      Unschärfe über dem gesamten Screen (inkl. Statusleiste/Notch), animiert 200ms parallel
      zum Sheet — identisch zum Chat-Screen. pointerEvents none, damit Tippen auf den Hintergrund
      das Sheet schließt (der Backdrop des Actionsheet übernimmt diesen Touch).
    */}
    <RNAnimated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity: memberSheetBlurOpacity }]}
    >
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
    </RNAnimated.View>

    {/* MemberActionSheet: öffnet sich beim Antippen eines Mitglieds */}
    <MemberActionSheet
      visible={memberSheetOpen}
      onClose={closeMemberSheet}
      member={selectedMember}
      isCurrentUserAdmin={isCurrentUserAdmin}
      isSelf={selectedMember?.user_id === userId}
      onNavigateToProfile={handleNavigateToProfile}
      onMessage={() => {
        openSelectedMemberChat();
      }}
      onMakeAdmin={handleMakeAdmin}
      onRemoveAdmin={handleRemoveAdmin}
      onRemoveMember={handleRemoveMember}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Äusserer Wrapper: Blur + Sheet liegen als Siblings der SafeAreaView */
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  safe: {
    flex: 1,
    backgroundColor: "white",
  },
  /** Gleicher gray[50]-Grund wie die Kacheln — verhindert weisse Luecken zwischen Blöcken (z. B. durch margin). */
  scrollFill: {
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
  /**
   * Volle Breite, gray[50] — nur vertikaler Puffer, kein marginTop (sonst weisser Streifen).
   */
  statsToMembersDivider: {
    width: '100%',
    backgroundColor: theme.colors.neutral.gray[50],
    paddingVertical: 8,
  },
  /** gray[50] links/rechts wie die anderen Kachel-outer; unten Abstand via scroll paddingBottom + insets. */
  memberOuter: {
    paddingHorizontal: 16,
    paddingTop: 0,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  /** Eine Kachel: Überschrift + Mitgliederzeilen, gemeinsame abgerundete Ecken. */
  memberShell: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.white,
    overflow: 'hidden',
    alignSelf: 'stretch',
    width: '100%',
    ...theme.shadows.sm,
  },
  memberListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  memberHeaderText: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 14,
    color: theme.colors.neutral.gray[600],
  },
  addMemberPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    ...theme.shadows.sm,
    shadowColor: theme.colors.primary.main,
    shadowOpacity: 0.22,
    elevation: 3,
  },
  addMemberPillLabel: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 13,
    color: theme.colors.neutral.white,
    letterSpacing: 0.2,
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
