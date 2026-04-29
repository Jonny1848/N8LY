/**
 * ============================================================
 * Poll Service – Supabase-Zugriffe fuer Chat-Umfragen
 * ============================================================
 *
 * Kapselt alle Datenbankzugriffe fuer Polls:
 * - Poll-Nachricht senden (message_type = 'poll', Daten als JSON in content)
 * - Stimmen laden (mit Profil-Daten der Waehlenden fuer Avatar-Anzeige)
 * - Eigene Stimme abgeben oder aendern (Upsert)
 * - Realtime-Subscription fuer Live-Ergebnisse
 *
 * Datenformat in messages.content (JSON):
 * {
 *   question:       string,
 *   options:        Array<{ id: string, text: string }>,
 *   allow_multiple: boolean,   // Mehrere Optionen waehlen?
 *   is_anonymous:   boolean,   // Stimmabgabe anonym?
 * }
 * ============================================================
 */

import { supabase } from '../lib/supabase';

// ========================
// POLL ERSTELLEN
// ========================

/**
 * Sendet eine neue Umfrage als Nachricht in eine Konversation.
 * Die Umfrage-Daten werden als JSON-String in messages.content gespeichert,
 * message_type ist 'poll'.
 *
 * @param {string}  conversationId – Ziel-Konversation
 * @param {string}  senderId       – UUID des Erstellers
 * @param {Object}  pollData       – { question, options, allow_multiple, is_anonymous }
 * @returns {Object} – Die erstellte Nachrichtenzeile
 */
export async function sendPoll(conversationId, senderId, pollData) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id:       senderId,
      content:         JSON.stringify(pollData),
      message_type:    'poll',
    })
    .select()
    .single();

  if (error) {
    console.error('[pollService] sendPoll:', error);
    throw error;
  }
  return data;
}

// ========================
// STIMMEN LADEN
// ========================

/**
 * Laedt alle Stimmen einer Umfrage inklusive Profil-Daten der Waehlenden.
 * Wird von PollBubble beim Mounten und nach jeder Realtime-Aenderung aufgerufen.
 *
 * @param {string} messageId – Die UUID der Poll-Nachricht
 * @returns {Array<{ id, user_id, option_ids, created_at, profiles: { id, username, avatar_url } }>}
 */
export async function getPollVotes(messageId) {
  const { data, error } = await supabase
    .from('poll_votes')
    .select(`
      id,
      user_id,
      option_ids,
      created_at,
      profiles:user_id (
        id,
        username,
        avatar_url
      )
    `)
    .eq('message_id', messageId);

  if (error) {
    console.error('[pollService] getPollVotes:', error);
    return [];
  }
  return data || [];
}

// ========================
// ABSTIMMEN
// ========================

/**
 * Zieht die Stimme eines Users fuer eine Umfrage vollstaendig zurueck.
 * Wird aufgerufen wenn der User seine letzte/einzige Auswahl wieder abwaehlt.
 *
 * @param {string} messageId – UUID der Poll-Nachricht
 * @param {string} userId    – UUID des Users
 */
export async function deleteVote(messageId, userId) {
  const { error } = await supabase
    .from('poll_votes')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) {
    console.error('[pollService] deleteVote:', error);
    throw error;
  }
}

/**
 * Gibt eine Stimme ab oder aktualisiert sie (Upsert).
 * Bei Single-Choice: optionIds hat genau ein Element.
 * Bei Multiple-Choice: optionIds kann mehrere Elemente enthalten.
 *
 * Der UNIQUE-Constraint (message_id, user_id) stellt sicher,
 * dass pro User und Umfrage nur eine Zeile existiert.
 *
 * @param {string}   messageId – UUID der Poll-Nachricht
 * @param {string}   userId    – UUID des abstimmenden Users
 * @param {string[]} optionIds – Ausgewaehlte Option-IDs
 * @returns {Object} – Die gespeicherte Stimme
 */
export async function castVote(messageId, userId, optionIds) {
  const { data, error } = await supabase
    .from('poll_votes')
    .upsert(
      {
        message_id: messageId,
        user_id:    userId,
        option_ids: optionIds,
      },
      { onConflict: 'message_id,user_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('[pollService] castVote:', error);
    throw error;
  }
  return data;
}

// ========================
// REALTIME
// ========================

/**
 * Abonniert alle Aenderungen an den Stimmen einer Umfrage (INSERT + UPDATE).
 * Gibt ein Channel-Objekt zurueck, das beim Unmount abbestellt werden muss
 * (via unsubscribeFromPollVotes).
 *
 * @param {string}   messageId – UUID der Poll-Nachricht
 * @param {Function} onUpdate  – Wird bei jeder Aenderung aufgerufen (kein Payload, Re-Fetch)
 * @returns {Object} – Supabase Channel
 */
export function subscribeToPollVotes(messageId, onUpdate) {
  const channel = supabase
    .channel(`poll-votes:${messageId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'poll_votes',
        filter: `message_id=eq.${messageId}`,
      },
      () => onUpdate(),
    )
    .subscribe();

  return channel;
}

/**
 * Beendet das Realtime-Abonnement fuer eine Umfrage.
 * Muss beim Unmount der PollBubble aufgerufen werden.
 *
 * @param {Object} channel – Das Channel-Objekt aus subscribeToPollVotes()
 */
export async function unsubscribeFromPollVotes(channel) {
  if (channel) {
    await supabase.removeChannel(channel);
  }
}
