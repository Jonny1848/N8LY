/**
 * =============================================================
 * Chat Service – Alle Supabase-Queries fuer das Chat-System
 * =============================================================
 *
 * Dieser Service kapselt saemtliche Datenbankzugriffe fuer:
 * - Konversationen (laden, erstellen, aktualisieren)
 * - Teilnehmer (hinzufuegen, entfernen, Rollen)
 * - Nachrichten (senden, laden, Realtime-Abonnements)
 * - Unread-Count (ungelesene Nachrichten zaehlen)
 *
 * Die UI-Komponenten rufen nur Funktionen aus diesem Service auf
 * und muessen keine Supabase-Queries selbst schreiben.
 * =============================================================
 */

import { supabase } from '../lib/supabase';

// ========================
// KONVERSATIONEN
// ========================

/**
 * Laedt alle Konversationen eines Users mit der letzten Nachricht.
 *
 * Gibt fuer jeden Chat Zurück:
 * - Konversations-Details (Name, Typ, Avatar)
 * - Alle Teilnehmer mit Profil-Daten
 * - Die letzte Nachricht (fuer die Chat-Liste Vorschau)
 * - Den Unread-Count (Anzahl ungelesener Nachrichten)
 *
 * @param {string} userId – Die UUID des eingeloggten Users
 * @returns {Array} – Sortierte Liste der Konversationen (neueste zuerst)
 */
export async function getConversations(userId) {
  // Schritt 1: Alle Konversations-IDs holen, in denen der User Teilnehmer ist
  const { data: participations, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  if (partError) {
    console.error('Fehler beim Laden der Teilnahmen:', partError);
    return [];
  }

  // Falls der User in keinem Chat ist, leeres Array Zurückgeben
  if (!participations || participations.length === 0) return [];

  // Map fuer schnellen Zugriff auf last_read_at pro Konversation
  const lastReadMap = {};
  const conversationIds = participations.map((p) => {
    lastReadMap[p.conversation_id] = p.last_read_at;
    return p.conversation_id;
  });

  // Schritt 2: Konversationen mit Teilnehmern und deren Profilen laden
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select(`
      id,
      type,
      name,
      avatar_url,
      created_by,
      created_at,
      conversation_participants (
        user_id,
        role,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      )
    `)
    .in('id', conversationIds);

  if (convError) {
    console.error('Fehler beim Laden der Konversationen:', convError);
    return [];
  }

  // Schritt 3: Fuer jede Konversation die letzte Nachricht und den Unread-Count laden
  const enrichedConversations = await Promise.all(
    conversations.map(async (conv) => {
      // Letzte Nachricht holen (fuer Vorschau in der Chat-Liste)
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('id, content, message_type, sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastMessage = lastMessages?.[0] || null;

      // Unread-Count: Nachrichten zaehlen, die nach last_read_at gesendet wurden
      const lastReadAt = lastReadMap[conv.id];
      let unreadCount = 0;

      if (lastReadAt) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .gt('created_at', lastReadAt)
          .neq('sender_id', userId); // Eigene Nachrichten nicht als ungelesen zaehlen

        unreadCount = count || 0;
      }

      // Bei Einzelchats: Den Namen und Avatar des Chat-Partners ermitteln
      // (Bei Gruppenchats: Gruppenname + avatar_url aus conversations)
      let displayName = conv.name;
      let displayAvatar =
        conv.avatar_url != null && String(conv.avatar_url).trim() !== ''
          ? String(conv.avatar_url).trim()
          : null;

      if (conv.type === 'direct') {
        // Den anderen Teilnehmer finden (nicht den eingeloggten User)
        const otherParticipant = conv.conversation_participants.find(
          (p) => p.user_id !== userId
        );
        if (otherParticipant?.profiles) {
          displayName = otherParticipant.profiles.username;
          const pUrl = otherParticipant.profiles.avatar_url;
          displayAvatar =
            pUrl != null && String(pUrl).trim() !== '' ? String(pUrl).trim() : null;
        }
      }

      return {
        ...conv,
        displayName,
        displayAvatar,
        lastMessage,
        unreadCount,
        lastReadAt: lastReadMap[conv.id],
      };
    })
  );

  // Schritt 4: Nach letzter Nachricht sortieren (neueste Chats oben)
  return enrichedConversations.sort((a, b) => {
    const timeA = a.lastMessage?.created_at || a.created_at;
    const timeB = b.lastMessage?.created_at || b.created_at;
    return new Date(timeB) - new Date(timeA);
  });
}

/**
 * Laedt eine einzelne Konversation anhand der ID.
 * Wird z.B. im Chat-Detail-Screen verwendet.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @returns {Object|null} – Die Konversation mit Teilnehmern oder null
 */
export async function getConversationById(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      type,
      name,
      avatar_url,
      description,
      created_by,
      created_at,
      updated_at,
      conversation_participants (
        user_id,
        role,
        profiles:user_id (
          id,
          username,
          avatar_url,
          bio
        )
      )
    `)
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Fehler beim Laden der Konversation:', error);
    return null;
  }

  return data;
}

/**
 * Aktualisiert Metadaten einer Gruppenkonversation (Name, Gruppenbild).
 * Nur fuer type = 'group'. RLS: typischerweise nur Ersteller/Admins — Fehler werden durchgereicht.
 *
 * @param {string} conversationId
 * @param {{ name?: string|null, avatar_url?: string|null, description?: string|null }} updates
 * @returns {Object|null} – Aktualisierte Zeile oder null
 */
export async function updateGroupConversation(conversationId, updates = {}) {
  const payload = {};
  if (updates.name !== undefined) {
    payload.name = updates.name === null ? null : String(updates.name).trim();
  }
  if (updates.avatar_url !== undefined) {
    payload.avatar_url =
      updates.avatar_url === null || String(updates.avatar_url).trim() === ''
        ? null
        : String(updates.avatar_url).trim();
  }
  if (updates.description !== undefined) {
    payload.description =
      updates.description === null || String(updates.description).trim() === ''
        ? null
        : String(updates.description).trim();
  }
  if (Object.keys(payload).length === 0) return null;

  const { data, error } = await supabase
    .from('conversations')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('type', 'group')
    .select()
    .single();

  if (error) {
    console.error('[chatService] updateGroupConversation:', error);
    throw error;
  }

  return data;
}

/**
 * Zaehlt Medien-/Datei-Nachrichten in der Gruppe (WhatsApp: „Medien“ — hier Medien + Dateien).
 *
 * @param {string} conversationId
 * @returns {Promise<number>}
 */
export async function countGroupSharedMediaMessages(conversationId) {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .in('message_type', ['image', 'voice', 'file']);

  if (error) {
    console.error('[chatService] countGroupSharedMediaMessages:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Erstellt einen neuen Einzelchat zwischen zwei Usern.
 *
 * Prueft zuerst, ob bereits ein Einzelchat zwischen den beiden existiert.
 * Falls ja, wird der bestehende Chat Zurückgegeben (kein Duplikat).
 *
 * @param {string} currentUserId – Die UUID des eingeloggten Users
 * @param {string} otherUserId – Die UUID des Chat-Partners
 * @returns {Object} – Die neue oder bestehende Konversation
 */
export async function createDirectConversation(currentUserId, otherUserId) {
  // Schritt 1: Pruefen ob bereits ein Einzelchat existiert
  const existing = await findExistingDirectChat(currentUserId, otherUserId);
  if (existing) return existing;

  // Schritt 2: Neue Konversation erstellen
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'direct',
      created_by: currentUserId,
    })
    .select()
    .single();

  if (convError) {
    console.error('Fehler beim Erstellen der Konversation:', convError);
    throw convError;
  }

  // Schritt 3: Beide User als Teilnehmer hinzufuegen
  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversation.id, user_id: currentUserId, role: 'member' },
      { conversation_id: conversation.id, user_id: otherUserId, role: 'member' },
    ]);

  if (partError) {
    console.error('Fehler beim Hinzufuegen der Teilnehmer:', partError);
    throw partError;
  }

  return conversation;
}

/**
 * Erstellt einen neuen Gruppenchat.
 *
 * Der Ersteller wird automatisch als Admin hinzugefuegt,
 * alle anderen Teilnehmer als Member.
 *
 * @param {string} currentUserId – Die UUID des Erstellers (wird Admin)
 * @param {string} groupName – Der Name der Gruppe
 * @param {string[]} memberIds – UUIDs der weiteren Teilnehmer
 * @param {string|null} avatarUrl – Optionales Gruppenbild
 * @returns {Object} – Die neue Gruppen-Konversation
 */
export async function createGroupConversation(currentUserId, groupName, memberIds, avatarUrl = null) {
  // Schritt 1: Gruppen-Konversation erstellen
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'group',
      name: groupName,
      avatar_url: avatarUrl,
      created_by: currentUserId,
    })
    .select()
    .single();

  if (convError) {
    console.error('Fehler beim Erstellen der Gruppe:', convError);
    throw convError;
  }

  // Schritt 2: Ersteller als Admin + alle anderen als Member hinzufuegen
  const participants = [
    { conversation_id: conversation.id, user_id: currentUserId, role: 'admin' },
    ...memberIds.map((id) => ({
      conversation_id: conversation.id,
      user_id: id,
      role: 'member',
    })),
  ];

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partError) {
    console.error('Fehler beim Hinzufuegen der Gruppen-Teilnehmer:', partError);
    throw partError;
  }

  return conversation;
}

/**
 * Hilfsfunktion: Sucht nach einem bestehenden Einzelchat zwischen zwei Usern.
 *
 * Verhindert Duplikate – wenn User A und User B schon einen Chat haben,
 * soll kein zweiter erstellt werden.
 *
 * @param {string} userId1 – UUID des ersten Users
 * @param {string} userId2 – UUID des zweiten Users
 * @returns {Object|null} – Die bestehende Konversation oder null
 */
async function findExistingDirectChat(userId1, userId2) {
  // Alle Einzelchats von User 1 laden
  const { data: user1Chats } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId1);

  if (!user1Chats || user1Chats.length === 0) return null;

  const chatIds = user1Chats.map((c) => c.conversation_id);

  // Pruefen ob User 2 auch in einem dieser Chats ist UND es ein Einzelchat ist
  const { data: sharedChats } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      conversations:conversation_id (
        id,
        type
      )
    `)
    .eq('user_id', userId2)
    .in('conversation_id', chatIds);

  // Nur Einzelchats beruecksichtigen (keine Gruppenchats)
  const directChat = sharedChats?.find(
    (c) => c.conversations?.type === 'direct'
  );

  return directChat?.conversations || null;
}

// ========================
// NACHRICHTEN
// ========================

/**
 * Laedt Nachrichten einer Konversation mit Pagination.
 *
 * Gibt Nachrichten sortiert nach Erstellungszeit Zurück (neueste zuerst),
 * zusammen mit dem Profil des Absenders.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {number} limit – Anzahl der Nachrichten pro Seite (Standard: 50)
 * @param {number} offset – Ab welcher Nachricht geladen werden soll (fuer Pagination)
 * @returns {Array} – Liste der Nachrichten mit Absender-Profil
 */
export async function getMessages(conversationId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      message_type,
      media_url,
      waveform_data,
      created_at,
      profiles:sender_id (
        id,
        username,
        avatar_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Fehler beim Laden der Nachrichten:', error);
    return [];
  }

  return data || [];
}

/**
 * Sendet eine Text-Nachricht in eine Konversation.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} senderId – Die UUID des Absenders
 * @param {string} content – Der Textinhalt der Nachricht
 * @returns {Object} – Die gesendete Nachricht
 */
export async function sendMessage(conversationId, senderId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      message_type: 'text',
    })
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    throw error;
  }

  return data;
}

/**
 * Sendet eine Medien-Nachricht (Bild oder Sprachnachricht) in eine Konversation.
 *
 * Die Datei muss vorher ueber den storageService hochgeladen werden.
 * Diese Funktion speichert nur die Message mit der Media-URL.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} senderId – Die UUID des Absenders
 * @param {string} mediaUrl – Die URL des Mediums aus Supabase Storage
 * @param {'image'|'voice'|'file'} messageType – Typ des Mediums (file: z. B. Dokument aus dem Share-Sheet)
 * @param {string|null} caption – Optionaler Text (Bildunterschrift oder Dateiname bei file)
 * @param {number[]|null} waveformData – Optional: Amplitude-Werte (0-1) fuer Waveform bei Sprachnachrichten
 * @returns {Object} – Die gesendete Nachricht
 */
export async function sendMediaMessage(
  conversationId,
  senderId,
  mediaUrl,
  messageType,
  caption = null,
  waveformData = null
) {
  const insertData = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: caption,
    message_type: messageType,
    media_url: mediaUrl,
  };

  // Waveform-Daten nur bei Sprachnachrichten speichern
  if (messageType === 'voice' && waveformData && Array.isArray(waveformData) && waveformData.length > 0) {
    insertData.waveform_data = waveformData;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Senden der Medien-Nachricht:', error);
    throw error;
  }

  return data;
}

// ========================
// REALTIME SUBSCRIPTIONS
// ========================

/**
 * Abonniert neue Nachrichten in einer Konversation (Realtime).
 *
 * Wird aufgerufen, wenn der User einen Chat oeffnet.
 * Bei jeder neuen Nachricht wird der Callback ausgefuehrt.
 *
 * WICHTIG: Das Zurückgegebene Channel-Objekt muss beim Verlassen
 * des Screens ueber unsubscribeFromMessages() abgemeldet werden,
 * um Memory-Leaks zu vermeiden!
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {Function} onNewMessage – Callback-Funktion, die bei neuer Nachricht aufgerufen wird
 * @returns {Object} – Das Supabase Channel-Objekt (fuer spaeteres Unsubscribe)
 */
export function subscribeToMessages(conversationId, onNewMessage) {
  // Einen eindeutigen Channel-Namen erstellen
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT', // Nur auf neue Nachrichten reagieren
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Die neue Nachricht kommt als payload.new
        // Wir laden zusaetzlich das Absender-Profil nach
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();

        // Nachricht mit Profil-Daten an den Callback uebergeben
        onNewMessage({
          ...payload.new,
          profiles: profile,
        });
      }
    )
    .subscribe();

  return channel;
}

/**
 * Meldet ein Realtime-Abonnement ab.
 *
 * Muss beim Verlassen des Chat-Screens aufgerufen werden!
 * Sonst bleibt die WebSocket-Verbindung offen (Memory-Leak).
 *
 * @param {Object} channel – Das Channel-Objekt aus subscribeToMessages()
 */
export async function unsubscribeFromMessages(channel) {
  if (channel) {
    await supabase.removeChannel(channel);
  }
}

/**
 * Abonniert Aenderungen an der Chat-Liste (fuer den Social-Tab).
 *
 * Wird benachrichtigt wenn:
 * - Neue Nachrichten in irgendeinem Chat gesendet werden
 * - Der User zu einem neuen Chat hinzugefuegt wird
 *
 * @param {Function} onUpdate – Callback, der bei jeder Aenderung die Chat-Liste neu laedt
 * @returns {Object} – Das Supabase Channel-Objekt (fuer spaeteres Unsubscribe)
 */
export function subscribeToChatList(onUpdate) {
  const channel = supabase
    .channel('chat-list-updates')
    // Auf neue Nachrichten in allen Chats hoeren
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      () => onUpdate()
    )
    // Auf neue Teilnahmen hoeren (wenn User zu Chat hinzugefuegt wird)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
      },
      () => onUpdate()
    )
    .subscribe();

  return channel;
}

// ========================
// LESE-STATUS (READ RECEIPTS)
// ========================

/**
 * Aktualisiert den Lese-Status des Users in einer Konversation.
 *
 * Wird aufgerufen, wenn der User einen Chat oeffnet oder
 * neue Nachrichten liest. Setzt last_read_at auf den aktuellen Zeitpunkt.
 * Dadurch wird der Unread-Count auf 0 gesetzt.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} userId – Die UUID des eingeloggten Users
 */
export async function markConversationAsRead(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Fehler beim Aktualisieren des Lese-Status:', error);
  }
}

// ========================
// TEILNEHMER-VERWALTUNG
// ========================

/**
 * Fuegt einen User zu einem Gruppenchat hinzu.
 *
 * @param {string} conversationId – Die UUID der Gruppe
 * @param {string} userId – Die UUID des neuen Teilnehmers
 * @param {'member'|'admin'} role – Die Rolle des neuen Teilnehmers
 */
export async function addParticipant(conversationId, userId, role = 'member') {
  const { error } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
    });

  if (error) {
    console.error('Fehler beim Hinzufuegen des Teilnehmers:', error);
    throw error;
  }
}

/**
 * Entfernt einen User aus einem Gruppenchat.
 *
 * @param {string} conversationId – Die UUID der Gruppe
 * @param {string} userId – Die UUID des zu entfernenden Teilnehmers
 */
export async function removeParticipant(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Fehler beim Entfernen des Teilnehmers:', error);
    throw error;
  }
}

// ========================
// USER-SUCHE & KONTAKTE (Konversationen + follows)
// ========================

/**
 * Durchsucht Profile nach Username.
 *
 * Wird verwendet, um neue Chat-Partner zu finden.
 * Sucht mit ILIKE (case-insensitive) nach Teiluebereinstimmungen.
 *
 * @param {string} query – Der Suchbegriff (mindestens 2 Zeichen)
 * @param {string} currentUserId – Die UUID des eingeloggten Users (wird ausgeschlossen)
 * @param {number} limit – Maximale Anzahl der Ergebnisse
 * @returns {Array} – Liste der gefundenen Profile
 */
export async function searchUsers(query, currentUserId, limit = 20) {
  // Mindestens 2 Zeichen fuer die Suche verlangen
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId) // Eigenes Profil nicht anzeigen
    .limit(limit);

  if (error) {
    console.error('Fehler bei der User-Suche:', error);
    return [];
  }

  return data || [];
}

/**
 * Profile aus Konversationen: alle anderen Teilnehmer geteilter Chats.
 * Kann leer sein, wenn noch keine conversation_participants existieren.
 *
 * @param {string} currentUserId
 * @returns {Promise<Array<{ id: string, username: string, avatar_url: string|null }>>}
 */
async function getContactsFromConversations(currentUserId) {
  const { data: myChats, error: chatErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId);

  if (chatErr || !myChats?.length) return [];

  const chatIds = myChats.map((c) => c.conversation_id);

  const { data: others, error: othersErr } = await supabase
    .from('conversation_participants')
    .select('user_id, profiles:user_id ( id, username, avatar_url )')
    .in('conversation_id', chatIds)
    .neq('user_id', currentUserId);

  if (othersErr || !others?.length) return [];

  const seen = new Set();
  const unique = [];
  for (const row of others) {
    const profile = row.profiles;
    if (profile && !seen.has(profile.id)) {
      seen.add(profile.id);
      unique.push({ id: profile.id, username: profile.username, avatar_url: profile.avatar_url });
    }
  }
  return unique;
}

/**
 * Profile ueber Follow-Graph: User, denen man folgt, oder die einem folgen
 * (Tabelle `follows`: follower_id -> following_id).
 *
 * @param {string} currentUserId
 * @returns {Promise<Array<{ id: string, username: string, avatar_url: string|null }>>}
 */
export async function getFollowRelatedProfiles(currentUserId) {
  if (!currentUserId) return [];

  const [{ data: outgoing, error: outErr }, { data: incoming, error: inErr }] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
    supabase.from('follows').select('follower_id').eq('following_id', currentUserId),
  ]);

  if (outErr) console.error('[chatService] follows outgoing:', outErr);
  if (inErr) console.error('[chatService] follows incoming:', inErr);

  const idSet = new Set();
  for (const row of outgoing || []) {
    if (row.following_id) idSet.add(row.following_id);
  }
  for (const row of incoming || []) {
    if (row.follower_id) idSet.add(row.follower_id);
  }
  idSet.delete(currentUserId);

  if (idSet.size === 0) return [];

  const ids = [...idSet];
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);

  if (profErr) {
    console.error('[chatService] getFollowRelatedProfiles profiles:', profErr);
    return [];
  }

  return profiles || [];
}

/**
 * Vereinigt Kontakte aus Konversationen und Follow-Beziehungen (ohne Duplikate).
 * Sortiert alphabetisch nach Username.
 *
 * @param {string} currentUserId – UUID des eingeloggten Users
 * @returns {Array} – Liste { id, username, avatar_url }
 */
export async function getKnownContacts(currentUserId) {
  if (!currentUserId) return [];

  const [fromChats, fromFollows] = await Promise.all([
    getContactsFromConversations(currentUserId),
    getFollowRelatedProfiles(currentUserId),
  ]);

  const byId = new Map();
  for (const p of [...fromChats, ...fromFollows]) {
    if (p?.id && !byId.has(p.id)) {
      byId.set(p.id, { id: p.id, username: p.username, avatar_url: p.avatar_url });
    }
  }

  const merged = [...byId.values()];
  merged.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  return merged;
}


/// ========== GRUPPENCHATS ==========

export async function makeAdmin(conversationId, userId) {
  console.log('[makeAdmin] conversationId:', conversationId, 'userId:', userId);

  /*
   * .select() ist wichtig: Supabase (PostgREST) gibt bei RLS-Blockierung
   * standardmässig keinen Fehler zurück, sondern leere Daten.
   * Nur durch .select() können wir prüfen, ob wirklich eine Zeile geändert wurde.
   */
  const { data, error } = await supabase
    .from('conversation_participants')
    .update({ role: 'admin' })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .select();

  console.log('[makeAdmin] result — data:', data, 'error:', error);

  if (error) {
    console.error('[makeAdmin] Supabase error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    const msg = 'Rolle konnte nicht gesetzt werden — möglicherweise fehlende Berechtigung (RLS).';
    console.error('[makeAdmin]', msg);
    throw new Error(msg);
  }
}

export async function removeAdmin(conversationId, userId) {
  console.log('[removeAdmin] conversationId:', conversationId, 'userId:', userId);

  const { data, error } = await supabase
    .from('conversation_participants')
    .update({ role: 'member' })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .select();

  console.log('[removeAdmin] result — data:', data, 'error:', error);

  if (error) {
    console.error('[removeAdmin] Supabase error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    const msg = 'Adminrechte konnten nicht entzogen werden — möglicherweise fehlende Berechtigung (RLS).';
    console.error('[removeAdmin]', msg);
    throw new Error(msg);
  }
}