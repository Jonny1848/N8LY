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
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Zustand: Globale Stores fuer Auth und Chat
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';
import { uploadVoiceMessage } from '../../services/storageService';

// Wiederverwendbare Chat-Komponenten
import ChatHeader from '../../components/chat/ChatHeader';
import ChatBubble from '../../components/chat/ChatBubble';
import MessageInput from '../../components/chat/MessageInput';
import ShareSheet from '../../components/chat/ShareSheet';

export default function ChatDetailScreen() {
  // Konversations-ID aus der Route
  const { id: conversationId } = useLocalSearchParams();
  const router = useRouter();

  // ============================
  // Globale Stores: Auth und Chat
  // ============================
  const userId = useAuthStore((s) => s.userId);

  // Chat-State aus dem globalen Store (nur diese Felder – kein ganzes Store-Abo!)
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] || []);
  const conversation = useChatStore((s) => s.activeConversation);
  const loading = useChatStore((s) => s.messagesLoading[conversationId] ?? true);

  // ============================
  // Lokaler UI-State
  // ============================
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const flatListRef = useRef(null);

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
  const handleSendVoice = useCallback(async (localUri) => {
    if (!userId) return;
    const publicUrl = await uploadVoiceMessage(conversationId, localUri, 'audio/m4a');
    await useChatStore.getState().sendMediaMessage(conversationId, userId, publicUrl, 'voice');
  }, [conversationId, userId]);

  /** Share Sheet Optionsauswahl verarbeiten */
  const handleShareSelect = useCallback((key) => {
    // TODO: Jeweilige Aktion implementieren (Dokument, Medien, Standort etc.)
    console.log('[SHARE] Option gewaehlt:', key);
  }, []);

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
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#FFFFFF' }}
        />

        {/* Input Bar: Text, Sprachaufnahme, Preview */}
        <MessageInput
          onSendText={handleSendText}
          onSendVoice={handleSendVoice}
          onOpenShareSheet={() => setShareSheetVisible(true)}
        />

        {/* SafeArea-Padding unten (Home-Indicator) */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF' }} />
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
