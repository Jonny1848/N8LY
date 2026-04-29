/**
 * =============================================================
 * Gallery Service – Bildergalerie/Collage pro Chat (USP!)
 * =============================================================
 *
 * Verwaltet die Chat-Gallery – das Alleinstellungsmerkmal von N8LY.
 * Jeder Chat hat eine eigene Medien-Galerie, in der alle geteilten
 * Bilder als Collage/Grid angezeigt werden koennen.
 *
 * Funktionen:
 * - Galerie-Eintraege laden (pro Chat)
 * - Automatisch Eintraege erstellen wenn Bilder gesendet werden
 * - Eintraege löschen
 * =============================================================
 */

import { supabase } from '../lib/supabase';

/**
 * Laedt alle Medien einer Chat-Galerie.
 *
 * Gibt alle geteilten Bilder eines Chats Zurück, sortiert nach
 * Upload-Zeitpunkt (neueste zuerst). Inkludiert den Uploader.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {number} limit – Maximale Anzahl der Ergebnisse (Standard: 50)
 * @param {number} offset – Ab welchem Eintrag geladen werden soll (Pagination)
 * @returns {Array} – Liste der Galerie-Eintraege mit Uploader-Profil
 */
export async function getGalleryItems(conversationId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('chat_gallery')
    .select(`
      id,
      conversation_id,
      message_id,
      media_url,
      uploaded_by,
      created_at,
      profiles:uploaded_by (
        id,
        username,
        avatar_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Fehler beim Laden der Galerie:', error);
    return [];
  }

  return data || [];
}

/**
 * Zaehlt die Gesamtanzahl der Medien in einer Chat-Galerie.
 *
 * Wird z.B. fuer einen Badge am Gallery-Button verwendet.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @returns {number} – Anzahl der Galerie-Eintraege
 */
export async function getGalleryCount(conversationId) {
  const { count, error } = await supabase
    .from('chat_gallery')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  if (error) {
    console.error('Fehler beim Zaehlen der Galerie-Eintraege:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Fuegt ein Medium zur Chat-Galerie hinzu.
 *
 * Wird automatisch aufgerufen, wenn ein Bild im Chat gesendet wird.
 * Erstellt einen Eintrag in der chat_gallery Tabelle mit Referenz
 * zur Original-Nachricht.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} messageId – Die UUID der zugehoerigen Nachricht
 * @param {string} mediaUrl – Die URL des Mediums
 * @param {string} uploadedBy – Die UUID des Uploaders
 * @returns {Object} – Der erstellte Galerie-Eintrag
 */
export async function addToGallery(conversationId, messageId, mediaUrl, uploadedBy) {
  const { data, error } = await supabase
    .from('chat_gallery')
    .insert({
      conversation_id: conversationId,
      message_id: messageId,
      media_url: mediaUrl,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Hinzufuegen zur Galerie:', error);
    throw error;
  }

  return data;
}

/**
 * Entfernt ein Medium aus der Chat-Galerie.
 *
 * Löscht nur den Galerie-Eintrag, nicht die Original-Nachricht
 * oder die Datei in Supabase Storage.
 *
 * @param {string} galleryItemId – Die UUID des Galerie-Eintrags
 */
export async function removeFromGallery(galleryItemId) {
  const { error } = await supabase
    .from('chat_gallery')
    .delete()
    .eq('id', galleryItemId);

  if (error) {
    console.error('Fehler beim Entfernen aus der Galerie:', error);
    throw error;
  }
}
