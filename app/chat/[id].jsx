/**
 * Chat Detail Screen – Orchestrierungs-Ebene
 *
 * Dieser Screen nutzt ausschliesslich wiederverwendbare Komponenten aus
 * components/chat/ und den globalen Zustand aus den Zustand-Stores.
 * Er selbst enthaelt KEINE Darstellungslogik – nur Datenfluss und Callbacks.
 *
 * Komponenten:
 *  - ChatHeader: Zurück-Pfeil, Avatar, Name, Online-Status
 *  - ChatBubble: Nachrichten-Bubbles mit Datumsseparator
 *  - MessageInput: 3-Modi Input Bar (Normal, Recording, Preview)
 *  - ShareSheet: "Inhalt teilen" Bottom Sheet (bei Offenheit Unschaerfe ueber Chat, wie Figma-Make)
 *  - ImagePreviewModal: Vollbild beim Tippen auf eine Bildnachricht
 *
 * Route: /chat/[id] – Die ID ist die conversation_id aus Supabase.
 */
import { FlatList, KeyboardAvoidingView, Platform, View, Text, ActivityIndicator, StyleSheet, Animated as RNAnimated } from 'react-native';
import Reanimated, { useAnimatedKeyboard, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Zustand: Globale Stores fuer Auth und Chat
import useAuthStore from '../../stores/useAuthStore';
import useChatStore from '../../stores/useChatStore';
import { uploadVoiceMessage, uploadChatImage, uploadChatFile } from '../../services/storageService';

// Wiederverwendbare Chat-Komponenten
import ChatHeader from '../../components/chat/ChatHeader';
import ChatBubble from '../../components/chat/ChatBubble';
import MessageInput from '../../components/chat/MessageInput';
import ShareSheet from '../../components/chat/ShareSheet';
import ImagePreviewModal from '../../components/chat/ImagePreviewModal';
import PollCreationModal from '../../components/chat/PollCreationModal';
import { theme } from '../../constants/theme';

// Stabiler Fallback – verhindert Update-Loop bei leerem messagesByConversation
const EMPTY_MESSAGES = [];

export default function ChatDetailScreen() {
  // Konversations-ID aus der Route (expo-router kann string | string[] liefern)
  const rawId = useLocalSearchParams().id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
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
  const [imagePreviewUri, setImagePreviewUri] = useState(null);
  // Poll-Erstellungs-Modal: sichtbar + Ladeindikator waehrend des Sendens
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollSending, setPollSending] = useState(false);
  const flatListRef = useRef(null);
  const messageInputRef = useRef(null);
  const insets = useSafeAreaInsets();

  /**
   * iOS: Tastatur-Höhe als animierter Shared Value — folgt der nativen Keyboard-Kurve
   * (weicher als KeyboardAvoidingView/padding allein). Android bleibt bei resize/KAV.
   */
  const keyboard = useAnimatedKeyboard();
  const keyboardLiftStyle = useAnimatedStyle(() => ({
    // paddingBottom schiebt Liste + Eingabezeile stufenlos nach oben, sync mit System-Animation
    paddingBottom: keyboard.height.value,
  }));

  /**
   * Blur-Opacity parallel zum Gluestack-Actionsheet (timing 200ms im Creator),
   * damit keine harte Kante zwischen voller Unschaerfe und noch nicht animiertem Overlay entsteht.
   */
  const shareSheetBlurOpacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(shareSheetBlurOpacity, {
      toValue: shareSheetVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [shareSheetVisible, shareSheetBlurOpacity]);

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
  // Store-Actions über getState() – keine Store-Subscription nötig.
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
      { waveformData },
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

  /**
   * Dokument aus dem System-Dateiauswahldialog hochladen und als Datei-Nachricht senden.
   * Der angezeigte Name kommt in content (Caption), die URL in media_url.
   */
  const handleSendFile = useCallback(
    async (localUri, { name, mimeType } = {}) => {
      if (!userId || !localUri) return;
      const displayName = (name && String(name).trim()) || 'Datei';
      const publicUrl = await uploadChatFile(
        conversationId,
        localUri,
        mimeType || 'application/octet-stream',
        displayName,
      );
      await useChatStore.getState().sendMediaMessage(
        conversationId,
        userId,
        publicUrl,
        'file',
        { caption: displayName },
      );
    },
    [conversationId, userId],
  );

  /**
   * Kontakt aus dem Share-Sheet: als Text-Nachricht (Name + Nummer) – spaeter ggf. eigenes message_type.
   */
  const handleSendContact = useCallback(
    async ({ displayName, phone }) => {
      if (!userId || !phone?.trim()) return;
      const label = (displayName && String(displayName).trim()) || 'Kontakt';
      const body = `Kontakt: ${label}\n${phone.trim()}`;
      await useChatStore.getState().sendTextMessage(conversationId, userId, body);
    },
    [conversationId, userId],
  );

  /** Share Sheet Optionsauswahl – Kamera, Medien, Umfrage, Dokumente an MessageInput */
  const handleShareSelect = useCallback((key) => {
    if (key === 'camera') {
      setTimeout(() => messageInputRef.current?.openCamera?.(), 300);
    } else if (key === 'media') {
      setTimeout(() => messageInputRef.current?.openMediaLibrary?.(), 300);
    } else if (key === 'documents') {
      setTimeout(() => messageInputRef.current?.openDocumentPicker?.(), 300);
    } else if (key === 'contact') {
      setTimeout(() => messageInputRef.current?.openContactsPicker?.(), 300);
    } else if (key === 'poll') {
      // Poll-Erstellungs-Modal oeffnen (kurze Verzoegerung nach Sheet-Close fuer smoother UX)
      setTimeout(() => setPollModalVisible(true), 300);
    } else {
      console.log('[SHARE] Option gewaehlt:', key);
    }
  }, []);

  /**
   * Callback fuer ChatBubble: Bild antippen öffnet die Vorschau.
   * HIER wird das Callback gesetzt und an jede Bubble durchgereicht (renderItem).
   */
  const handleImagePress = useCallback((uri) => {
    if (uri) setImagePreviewUri(uri);
  }, []);

  /**
   * Umfrage senden: Nachrichten-Store aufrufen, Modal schliessen.
   * pollData: { question, options, allow_multiple, is_anonymous }
   */
  const handleSendPoll = useCallback(async (pollData) => {
    if (!userId) return;
    setPollSending(true);
    try {
      await useChatStore.getState().sendPollMessage(conversationId, userId, pollData);
      setPollModalVisible(false);
    } catch (err) {
      console.error('[CHAT] Fehler beim Senden der Umfrage:', err);
    } finally {
      setPollSending(false);
    }
  }, [conversationId, userId]);

  /** Gruppeninfo öffnen — gleiche Ziel-Route wie Tipp auf Header (Avatar/Name) */
  const openGroupInfo = useCallback(() => {
    if (conversation?.type === 'group' && conversationId) {
      router.push(`/chat/group-info/${conversationId}`);
    }
  }, [conversation?.type, conversationId, router]);

  /**
   * Rechter Rand: Wisch von rechts nach links öffnet die Gruppeninfo (nur Gruppenchats).
   * Schmales Overlay, damit die Nachrichtenliste weiterhin normal scrollt.
   */
  const edgeOpenGroupGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!conversationId && conversation?.type === 'group')
        .activeOffsetX(-12)
        .failOffsetY([-12, 12])
        .onEnd((e) => {
          if (e.translationX < -48) {
            runOnJS(openGroupInfo)();
          }
        }),
    [conversation?.type, conversationId, openGroupInfo],
  );

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

  // Liste + Eingabe: einmal definiert, iOS/Android nur Wrapper unterschiedlich (Keyboard-Animation vs. resize)
  const chatListAndInput = (
    <>
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
            onImagePress={handleImagePress}
          />
        )}
        inverted
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={renderEmptyList}
      />
      <MessageInput
        ref={messageInputRef}
        onSendText={handleSendText}
        onSendVoice={handleSendVoice}
        onSendImage={handleSendImage}
        onSendFile={handleSendFile}
        onSendContact={handleSendContact}
        onOpenShareSheet={() => setShareSheetVisible(true)}
      />
      <View style={{ height: bottomPadding, backgroundColor: '#FFFFFF' }} />
    </>
  );

  // ============================
  // RENDER
  // ============================
  return (
    /*
     * Aeusserer Container: Blur als Geschwister von SafeAreaView mit absoluteFill deckt den
     * kompletten Bildschirm inkl. Statusleiste/Notch ab (SafeAreaView puffert nur den Chat-Inhalt).
     */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-white">
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          {/*
           * Kein overflow-hidden um den KeyboardAvoidingView: Auf iOS (und teils Android)
           * kann clipping am Parent verhindern, dass das Layout korrekt nach oben geschoben wird,
           * wenn die Tastatur erscheint — dann liegt das Eingabefeld visuell / interaktiv unter der Tastatur.
           */}
          <View className="flex-1">
            {/* Rechter Rand: Wisch-Geste fuer Gruppeninfo */}
            {conversation?.type === 'group' ? (
              <GestureDetector gesture={edgeOpenGroupGesture}>
                <View
                  pointerEvents="box-only"
                  style={styles.edgeSwipeStrip}
                  collapsable={false}
                />
              </GestureDetector>
            ) : null}

            {/* Header ausserhalb des Keyboard-Wrappers: bleibt oben fix, darunter animiert nur Chat + Input */}
            <ChatHeader
              conversation={conversation}
              onBack={() => router.back()}
              onPressProfile={conversation?.type === 'group' ? openGroupInfo : undefined}
            />

          {Platform.OS === 'ios' ? (
            /*
             * iOS: Reanimated useAnimatedKeyboard — gleiche Timing-Kurve wie die System-Tastatur
             * (eleganter Aufschub als reines KeyboardAvoidingView).
             */
            <Reanimated.View style={[{ flex: 1 }, keyboardLiftStyle]}>{chatListAndInput}</Reanimated.View>
          ) : (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              // Android: Fenster-resize (adjustResize) — kein zusätzliches behavior nötig
              behavior={undefined}
              keyboardVerticalOffset={0}
            >
              {chatListAndInput}
            </KeyboardAvoidingView>
          )}
          </View>
        </SafeAreaView>

      {/*
        Unschaerfe ueber dem gesamten Screen (inkl. Top-Safe-Area), animiert wie Sheet (200ms).
        Liegt unter dem Actionsheet; pointerEvents none.
      */}
      <RNAnimated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: shareSheetBlurOpacity }]}
      >
        {/* Kraeftiger Blur mit dunklem Tint: klarer Kontrast zum weissen Sheet (wie Referenz-Design) */}
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
      </RNAnimated.View>

      {/* "Inhalt teilen" Bottom Sheet */}
      <ShareSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        conversationType={conversation?.type}
        onSelect={handleShareSelect}
      />

      <ImagePreviewModal
        visible={!!imagePreviewUri}
        imageUri={imagePreviewUri}
        onClose={() => setImagePreviewUri(null)}
      />

      {/* Umfrage-Erstellungs-Modal (pageSheet, schiebt sich von unten) */}
      <PollCreationModal
        visible={pollModalVisible}
        onClose={() => setPollModalVisible(false)}
        onSend={handleSendPoll}
        loading={pollSending}
      />
      </View>
    </GestureHandlerRootView>
  );
}

// ============================
// Styles – Loading/Empty State mit Schatten
// ============================
const styles = StyleSheet.create({
  /** Schmaler Streifen am rechten Rand fuer Pan-Geste (Gruppeninfo) */
  edgeSwipeStrip: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 20,
  },
  list: {
    flex: 1,
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
