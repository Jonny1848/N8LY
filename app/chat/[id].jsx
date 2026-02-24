/**
 * Chat Detail Screen – Orchestrierungs-Ebene
 *
 * Dieser Screen nutzt ausschliesslich wiederverwendbare Komponenten aus
 * components/chat/ und den globalen Zustand aus den Zustand-Stores.
 * Er selbst enthaelt KEINE Darstellungslogik – nur Datenfluss und Callbacks.
 *
 * Komponenten:
 *  - ChatHeader: Zurueck-Pfeil, Avatar, Name, Online-Status
 *  - ChatBubble: Nachrichten-Bubbles mit Datumsseparator
 *  - MessageInput: 3-Modi Input Bar (Normal, Recording, Preview)
 *  - ShareSheet: "Inhalt teilen" Bottom Sheet
 *
 * Route: /chat/[id] – Die ID ist die conversation_id aus Supabase.
 */
import { FlatList, KeyboardAvoidingView, Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Zustand: Globale Stores fuer Auth und Chat
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';
import { uploadVoiceMessage, uploadChatImage } from '../../services/storageService';

// Wiederverwendbare Chat-Komponenten
import ChatHeader from '../../components/chat/ChatHeader';
import ChatBubble from '../../components/chat/ChatBubble';
import MessageInput from '../../components/chat/MessageInput';
import ShareSheet from '../../components/chat/ShareSheet';
import { theme } from '../../constants/theme';

// Stabiler Fallback – verhindert Update-Loop bei leerem messagesByConversation
const EMPTY_MESSAGES = [];

export default function ChatDetailScreen() {
  // Konversations-ID aus der Route
  const { id: conversationId } = useLocalSearchParams();
  const router = useRouter();

  // ============================
  // Globale Stores: Auth und Chat
  // ============================
  const userId = useAuthStore((s) => s.userId);
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES);
  const conversation = useChatStore((s) => s.activeConversation);
  const loading = useChatStore((s) => s.messagesLoading[conversationId] ?? true);

  // ============================
  // Lokaler UI-State
  // ============================
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const flatListRef = useRef(null);
  const messageInputRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Reduzierter Abstand unten: max. 12px statt vollem Safe-Area-Inset (34px+)
  const bottomPadding = Math.min(insets.bottom, 12);

  // ============================
  // Initialisierung: Chat-Daten laden und Realtime abonnieren
  // WICHTIG: Store-Actions ueber getState() – verhindert Update-Loop,
  // da wir nicht auf den gesamten Store subscriben (inkl. _messageChannels).
  // ============================
  useEffect(() => {
    if (!userId || !conversationId) return;

    const store = useChatStore.getState();
    store.loadConversationDetails(conversationId, userId);
    store.loadMessages(conversationId);
    store.markAsRead(conversationId, userId);
    store.subscribeMessages(conversationId, userId);

    return () => {
      store.unsubscribeMessages(conversationId);
      store.clearActiveConversation();
    };
  }, [conversationId, userId]);

  // ============================
  // Callbacks fuer Kinder-Komponenten (stabil via useCallback)
  // Store-Actions ueber getState() – keine Store-Subscription noetig.
  // ============================

  /** Text-Nachricht senden (wird an MessageInput weitergegeben) */
  const handleSendText = useCallback(async (text) => {
    if (!userId) return;
    await useChatStore.getState().sendTextMessage(conversationId, userId, text);
  }, [conversationId, userId]);

  /** Sprachnachricht hochladen + senden (wird an MessageInput weitergegeben) */
  const handleSendVoice = useCallback(async (localUri, waveformData = null) => {
    if (!userId) return;
    const publicUrl = await uploadVoiceMessage(conversationId, localUri, 'audio/m4a');
    await useChatStore.getState().sendMediaMessage(
      conversationId,
      userId,
      publicUrl,
      'voice',
      waveformData,
    );
  }, [conversationId, userId]);

  /** Foto aus Kamera hochladen + als Bildnachricht senden */
  const handleSendImage = useCallback(async (localUri) => {
    if (!userId) return;
    const publicUrl = await uploadChatImage(conversationId, localUri, 'image/jpeg');
    await useChatStore.getState().sendMediaMessage(
      conversationId,
      userId,
      publicUrl,
      'image',
    );
  }, [conversationId, userId]);

  /** Share Sheet Optionsauswahl – Kamera, Medien, Sprachnachricht an MessageInput weiterleiten */
  const handleShareSelect = useCallback((key) => {
    if (key === 'camera') {
      setTimeout(() => messageInputRef.current?.openCamera?.(), 300);
    } else if (key === 'media') {
      setTimeout(() => messageInputRef.current?.openMediaLibrary?.(), 300);
    } else if (key === 'voice') {
      setTimeout(() => messageInputRef.current?.startVoiceRecording?.(), 300);
    } else {
      console.log('[SHARE] Option gewaehlt:', key);
    }
  }, []);

  // Empty-State mit Schatten: Loading oder freundlicher Hinweis bei leerem Chat
  const renderEmptyList = () => {
    const content = loading ? (
      <View style={styles.centerContent}>
        <View style={[styles.emptyCard, styles.emptyCardShadow]}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.emptyText}>Nachrichten werden geladen...</Text>
        </View>
      </View>
    ) : (
      <View style={styles.centerContent}>
        <View style={[styles.emptyCard, styles.emptyCardShadow]}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Schreib die erste Nachricht</Text>
          <Text style={styles.emptySubtitle}>Sag Hallo und starte die Unterhaltung</Text>
        </View>
      </View>
    );
    return <View style={styles.emptyWrapper}>{content}</View>;
  };

  // ============================
  // RENDER
  // ============================
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header: Avatar, Name, Online-Status, Optionen */}
        <ChatHeader
          conversation={conversation}
          onBack={() => router.back()}
        />

        {/* Nachrichten-Liste (inverted FlatList – neueste unten) */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ChatBubble
              item={item}
              index={index}
              messages={messages}
              userId={userId}
              conversation={conversation}
            />
          )}
          inverted
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          ListEmptyComponent={renderEmptyList}
        />

        {/* Input Bar: + | Input | Send (wie Screenshot) – Kamera/Voice ueber ShareSheet */}
        <MessageInput
          ref={messageInputRef}
          onSendText={handleSendText}
          onSendVoice={handleSendVoice}
          onSendImage={handleSendImage}
          onOpenShareSheet={() => setShareSheetVisible(true)}
        />

        {/* Reduzierter Abstand unten (statt vollem Safe-Area-Inset) */}
        <View style={{ height: bottomPadding, backgroundColor: '#FFFFFF' }} />
      </KeyboardAvoidingView>

      {/* "Inhalt teilen" Bottom Sheet */}
      <ShareSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        conversationType={conversation?.type}
        onSelect={handleShareSelect}
      />
    </SafeAreaView>
  );
}

// ============================
// Styles – Loading/Empty State mit Schatten
// ============================
const styles = StyleSheet.create({
  list: {
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyWrapper: {
    flex: 1,
    transform: [{ scaleY: -1 }],
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCard: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  emptyCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.neutral.gray[700],
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: theme.colors.neutral.gray[500],
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: theme.colors.neutral.gray[500],
    marginTop: 12,
  },
});
