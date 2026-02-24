/**
 * =============================================================
 * Storage Service – Medien-Upload fuer Chat und Stories
 * =============================================================
 *
 * Verwaltet alle Datei-Uploads zu Supabase Storage:
 * - Chat-Bilder und Sprachnachrichten → Bucket 'chat-media'
 * - Story-Bilder und -Videos → Bucket 'stories'
 *
 * Dateien werden in Unterordnern nach User-ID organisiert,
 * damit die RLS-Policies (Loeschrechte) korrekt greifen.
 *
 * WICHTIG (React Native): Blob-Uploads zu Supabase liefern oft 0 Bytes,
 * da Blob/FormData in RN nicht korrekt serialisiert werden.
 * Sprachnachrichten nutzen daher expo-file-system + base64 → ArrayBuffer.
 * =============================================================
 */

import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

// Bucket-Namen als Konstanten (falls sie sich aendern)
const CHAT_MEDIA_BUCKET = 'chat-media';
const STORIES_BUCKET = 'stories';

/**
 * Laedt ein Bild in den Chat-Media Bucket hoch.
 *
 * Der Dateipfad wird so strukturiert:
 * chat-media/{conversationId}/{uniqueFileName}
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} uri – Der lokale Dateipfad (z.B. von expo-image-picker)
 * @param {string} mimeType – Der MIME-Typ (z.B. 'image/jpeg')
 * @returns {string} – Die oeffentliche URL des hochgeladenen Bildes
 */
export async function uploadChatImage(conversationId, uri, mimeType = 'image/jpeg') {
  // Eindeutigen Dateinamen generieren (Timestamp + Zufallsstring)
  const fileExtension = mimeType.split('/')[1] || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const filePath = `${conversationId}/${fileName}`;

  // Datei mit expo-file-system als Base64 lesen (Blob-Upload liefert in RN oft 0 Bytes)
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);

  // ArrayBuffer zu Supabase hochladen – funktioniert zuverlaessig in React Native
  const { data, error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Fehler beim Hochladen des Chat-Bildes:', error);
    throw error;
  }

  // Oeffentliche URL der hochgeladenen Datei zurueckgeben
  const { data: urlData } = supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Laedt eine Sprachnachricht in den Chat-Media Bucket hoch.
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} uri – Der lokale Dateipfad der Aufnahme
 * @param {string} mimeType – Der MIME-Typ (Standard: 'audio/m4a' fuer expo-audio HIGH_QUALITY)
 * @returns {string} – Die oeffentliche URL der Sprachnachricht
 */
export async function uploadVoiceMessage(conversationId, uri, mimeType = 'audio/m4a') {
  const fileExtension = mimeType.split('/')[1] || 'm4a';
  const fileName = `voice_${Date.now()}.${fileExtension}`;
  const filePath = `${conversationId}/${fileName}`;

  // Datei mit expo-file-system als Base64 lesen (Blob-Upload liefert in RN oft 0 Bytes)
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);

  // ArrayBuffer zu Supabase hochladen – funktioniert zuverlaessig in React Native
  const { data, error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error || !data) {
    console.error('Fehler beim Hochladen der Sprachnachricht:', error);
    throw error;
  }

  // Oeffentliche URL zurueckgeben
  const { data: urlData } = supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Laedt ein Story-Medium (Bild oder Video) hoch.
 *
 * Der Dateipfad wird so strukturiert:
 * stories/{userId}/{uniqueFileName}
 *
 * @param {string} userId – Die UUID des Story-Erstellers
 * @param {string} uri – Der lokale Dateipfad
 * @param {string} mimeType – Der MIME-Typ (z.B. 'image/jpeg' oder 'video/mp4')
 * @returns {string} – Die oeffentliche URL des Story-Mediums
 */
export async function uploadStoryMedia(userId, uri, mimeType = 'image/jpeg') {
  const fileExtension = mimeType.split('/')[1] || 'jpg';
  const fileName = `story_${Date.now()}.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;

  // Datei als Blob lesen
  const response = await fetch(uri);
  const blob = await response.blob();

  // Upload zu Supabase Storage
  const { data, error } = await supabase.storage
    .from(STORIES_BUCKET)
    .upload(filePath, blob, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Fehler beim Hochladen des Story-Mediums:', error);
    throw error;
  }

  // Oeffentliche URL zurueckgeben
  const { data: urlData } = supabase.storage
    .from(STORIES_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Loescht eine Datei aus einem Storage Bucket.
 *
 * @param {string} bucket – Der Bucket-Name ('chat-media' oder 'stories')
 * @param {string} filePath – Der Dateipfad innerhalb des Buckets
 */
export async function deleteFile(bucket, filePath) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Fehler beim Loeschen der Datei:', error);
    throw error;
  }
}
