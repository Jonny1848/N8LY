/**
 * ============================================================
 * useChatStore – Globaler Chat-State mit Zustand
 * ============================================================
 *
 * Zentraler Store fuer alle Chat-bezogenen Daten:
 * - Konversationsliste (fuer social.tsx / Chat-Uebersicht)
 * - Nachrichten pro Konversation (fuer chat/[id].jsx)
 * - Aktive Konversation (Header-Infos im Chat-Detail)
 * - Realtime-Subscriptions (werden hier zentral verwaltet)
 *
 * Vorteile gegenueber dem alten Pattern (useState pro Screen):
 * - Konversationsliste bleibt erhalten beim Wechsel zwischen Tabs
 * - Nachrichten werden pro Chat gecacht (schneller Zurueck-Button)
 * - Realtime-Subscriptions werden zentral verwaltet
 * - Kein doppeltes Laden beim Navigieren
 *
 * Verwendung:
 *   const conversations = useChatStore((s) => s.conversations);
 *   const messages = useChatStore((s) => s.getMessages(conversationId));
 *   const { loadConversations, sendMessage } = useChatStore();
 * ============================================================
 */

import { create } from 'zustand';
import {
  getConversations as fetchConversations,
  getConversationById as fetchConversationById,
  getMessages as fetchMessages,
  sendMessage as apiSendMessage,
  sendMediaMessage as apiSendMediaMessage,
  subscribeToMessages,
  unsubscribeFromMessages,
  subscribeToChatList,
  markConversationAsRead as apiMarkAsRead,
} from '../services/chatService';
import { supabase } from '../lib/supabase';

// ============================
// Typen
// ============================

/** Einzelne Nachricht (aus der messages-Tabelle) */
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  created_at: string;
  profiles?: any;
  [key: string]: any;
}

/** Konversation mit Teilnehmern und letzter Nachricht */
interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  displayName?: string;
  displayAvatar?: string | null;
  lastMessage?: any;
  unreadCount?: number;
  conversation_participants?: any[];
  [key: string]: any;
}

interface ChatState {
  // --- State ---

  /** Liste aller Konversationen (fuer die Chat-Uebersicht) */
  conversations: Conversation[];
  /** Ladezustand der Konversationsliste */
  conversationsLoading: boolean;

  /** Nachrichten, gecacht pro Konversation: { [conversationId]: Message[] } */
  messagesByConversation: Record<string, Message[]>;
  /** Ladezustand pro Konversation: { [conversationId]: boolean } */
  messagesLoading: Record<string, boolean>;

  /** Aktive Konversation (die gerade im Chat-Detail angezeigt wird) */
  activeConversation: Conversation | null;

  // --- Realtime-Referenzen (intern, nicht fuer UI) ---
  _chatListChannel: any | null;
  _messageChannels: Record<string, any>;

  // --- Actions: Konversationen ---

  /** Laedt alle Konversationen des Users und aktualisiert den Store */
  loadConversations: (userId: string) => Promise<void>;

  /** Startet das Realtime-Abo fuer die Chat-Liste */
  subscribeChatList: (userId: string) => void;

  /** Beendet das Realtime-Abo fuer die Chat-Liste */
  unsubscribeChatList: () => void;

  // --- Actions: Nachrichten ---

  /** Laedt Nachrichten fuer eine Konversation und speichert sie im Cache */
  loadMessages: (conversationId: string, limit?: number) => Promise<void>;

  /** Laedt die Konversations-Details (Header-Infos) und setzt activeConversation */
  loadConversationDetails: (conversationId: string, userId: string) => Promise<void>;

  /** Sendet eine Textnachricht und fuegt sie optimistisch hinzu */
  sendTextMessage: (conversationId: string, userId: string, content: string) => Promise<void>;

  /**
   * Sendet eine Medien-Nachricht (Bild, Sprache, Datei) und fuegt sie optimistisch hinzu.
   * optional: caption (z. B. Dateiname bei message_type file), waveformData nur bei voice.
   */
  sendMediaMessage: (
    conversationId: string,
    userId: string,
    mediaUrl: string,
    messageType: 'image' | 'voice' | 'file',
    extra?: { caption?: string | null; waveformData?: number[] | null } | null,
  ) => Promise<Message | null>;

  /** Markiert eine Konversation als gelesen */
  markAsRead: (conversationId: string, userId: string) => Promise<void>;

  /** Startet das Realtime-Abo fuer Nachrichten einer Konversation */
  subscribeMessages: (conversationId: string, userId: string) => void;

  /** Beendet das Realtime-Abo fuer Nachrichten einer Konversation */
  unsubscribeMessages: (conversationId: string) => void;

  /** Fuegt eine Nachricht zum lokalen Cache hinzu (fuer optimistic UI) */
  addMessage: (conversationId: string, message: Message) => void;

  /** Setzt den aktiven Chat zurueck (beim Verlassen des Chat-Screens) */
  clearActiveConversation: () => void;
}

// ============================
// Store erstellen
// ============================
const useChatStore = create<ChatState>((set, get) => ({
  // Initialer State
  conversations: [],
  conversationsLoading: false,
  messagesByConversation: {},
  messagesLoading: {},
  activeConversation: null,
  _chatListChannel: null,
  _messageChannels: {},

  // ============================
  // KONVERSATIONEN
  // ============================

  loadConversations: async (userId) => {
    set({ conversationsLoading: true });
    try {
      const data = await fetchConversations(userId);
      set({ conversations: data || [] });
    } catch (err) {
      console.error('[CHAT STORE] Fehler beim Laden der Konversationen:', err);
    } finally {
      set({ conversationsLoading: false });
    }
  },

  subscribeChatList: (userId) => {
    const { _chatListChannel, loadConversations } = get();

    // Altes Abo beenden, falls vorhanden
    if (_chatListChannel) {
      supabase.removeChannel(_chatListChannel);
    }

    // Neues Realtime-Abo: Bei jeder Aenderung an der messages-Tabelle
    // wird die Konversationsliste neu geladen
    const channel = subscribeToChatList(() => {
      loadConversations(userId);
    });

    set({ _chatListChannel: channel });
  },

  unsubscribeChatList: () => {
    const { _chatListChannel } = get();
    if (_chatListChannel) {
      supabase.removeChannel(_chatListChannel);
      set({ _chatListChannel: null });
    }
  },

  // ============================
  // NACHRICHTEN
  // ============================

  loadMessages: async (conversationId, limit = 50) => {
    // Ladezustand fuer diese Konversation setzen
    set((state) => ({
      messagesLoading: { ...state.messagesLoading, [conversationId]: true },
    }));

    try {
      const msgs = await fetchMessages(conversationId, limit, 0);
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: msgs || [],
        },
      }));
    } catch (err) {
      console.error('[CHAT STORE] Fehler beim Laden der Nachrichten:', err);
    } finally {
      set((state) => ({
        messagesLoading: { ...state.messagesLoading, [conversationId]: false },
      }));
    }
  },

  loadConversationDetails: async (conversationId, userId) => {
    try {
      // chatService gibt untypisierte Objekte zurueck – als any casten
      const conv: any = await fetchConversationById(conversationId);
      if (!conv) return;

      // Bei Einzelchats: Anzeigename und Avatar des Chat-Partners ermitteln
      if (conv.type === 'direct') {
        const other = conv.conversation_participants?.find(
          (p: any) => p.user_id !== userId,
        );
        conv.displayName = other?.profiles?.username || 'Unbekannt';
        conv.displayAvatar = other?.profiles?.avatar_url || null;
      } else {
        // Gruppenchats: Name und Avatar der Gruppe verwenden
        conv.displayName = conv.name || 'Gruppe';
        conv.displayAvatar = conv.avatar_url || null;
      }

      set({ activeConversation: conv as Conversation });
    } catch (err) {
      console.error('[CHAT STORE] Fehler beim Laden der Konversation:', err);
    }
  },

  sendTextMessage: async (conversationId, userId, content) => {
    try {
      const msg: any = await apiSendMessage(conversationId, userId, content);

      // Nachricht optimistisch zum Cache hinzufuegen
      get().addMessage(conversationId, { ...msg, profiles: { id: userId } });
    } catch (err) {
      console.error('[CHAT STORE] Fehler beim Senden der Nachricht:', err);
      throw err; // An die UI weiterleiten fuer Error-Handling
    }
  },

  sendMediaMessage: async (conversationId, userId, mediaUrl, messageType, extra = null) => {
    try {
      const caption = extra?.caption ?? null;
      const waveformData = extra?.waveformData ?? null;

      const msg: any = await apiSendMediaMessage(
        conversationId,
        userId,
        mediaUrl,
        messageType,
        caption,
        waveformData,
      );

      // Nachricht optimistisch zum Cache hinzufuegen
      get().addMessage(conversationId, { ...msg, profiles: { id: userId } });
      return msg;
    } catch (err) {
      console.error('[CHAT STORE] Fehler beim Senden der Medien-Nachricht:', err);
      throw err;
    }
  },

  markAsRead: async (conversationId, userId) => {
    try {
      await apiMarkAsRead(conversationId, userId);
    } catch (err) {
      console.error('[CHAT STORE] Fehler beim Markieren als gelesen:', err);
    }
  },

  subscribeMessages: (conversationId, userId) => {
    const { _messageChannels } = get();

    // Altes Abo fuer diese Konversation beenden, falls vorhanden
    if (_messageChannels[conversationId]) {
      unsubscribeFromMessages(_messageChannels[conversationId]);
    }

    // Neues Realtime-Abo: Bei neuen Nachrichten in dieser Konversation
    const channel = subscribeToMessages(conversationId, (newMsg: Message) => {
      // Nachricht zum Cache hinzufuegen (Duplikate werden in addMessage verhindert)
      get().addMessage(conversationId, newMsg);

      // Falls die Nachricht von einem anderen User kommt: als gelesen markieren
      if (newMsg.sender_id !== userId) {
        get().markAsRead(conversationId, userId);
      }
    });

    set((state) => ({
      _messageChannels: { ...state._messageChannels, [conversationId]: channel },
    }));
  },

  unsubscribeMessages: (conversationId) => {
    const { _messageChannels } = get();
    const channel = _messageChannels[conversationId];
    if (channel) {
      unsubscribeFromMessages(channel);
      // Channel-Referenz entfernen
      const updated = { ...get()._messageChannels };
      delete updated[conversationId];
      set({ _messageChannels: updated });
    }
  },

  addMessage: (conversationId, message) => {
    set((state) => {
      const existing = state.messagesByConversation[conversationId] || [];

      // Duplikat-Check: Nachricht nur hinzufuegen wenn sie noch nicht existiert
      if (existing.some((m) => m.id === message.id)) return state;

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          // Neue Nachricht vorne einfuegen (neueste zuerst, FlatList ist inverted)
          [conversationId]: [message, ...existing],
        },
      };
    });
  },

  clearActiveConversation: () => {
    set({ activeConversation: null });
  },
}));

export default useChatStore;
