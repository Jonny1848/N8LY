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
 * damit die RLS-Policies (Löschrechte) korrekt greifen.
 *
 * WICHTIG (React Native): Blob-Uploads zu Supabase liefern oft 0 Bytes,
 * da Blob/FormData in RN nicht korrekt serialisiert werden.
 * Wir lesen lokale URIs daher als ArrayBuffer ueber expo-file-system v19+ (`File`, nicht mehr
 * `readAsStringAsync`/`EncodingType` auf dem Default-Export).
 * =============================================================
 */

import { File } from 'expo-file-system';
import { supabase } from '../lib/supabase';

/**
 * Lokale file://-URI zu ArrayBuffer (zuverlaessig fuer Supabase `.upload` in RN).
 * @param {string} uri
 * @returns {Promise<ArrayBuffer>}
 */
async function readLocalUriAsArrayBuffer(uri) {
  const file = new File(uri);
  return file.arrayBuffer();
}

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

  const arrayBuffer = await readLocalUriAsArrayBuffer(uri);

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

  // Oeffentliche URL der hochgeladenen Datei Zurückgeben
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

  const arrayBuffer = await readLocalUriAsArrayBuffer(uri);

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

  // Öffentliche URL Zurückgeben
  const { data: urlData } = supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Laedt eine beliebige Datei (Dokument) in den Chat-Media Bucket hoch.
 *
 * Gleiche Strategie wie bei Bild/Sprache: Base64 ueber expo-file-system, damit
 * der Upload in React Native zuverlaessig ist (kein leerer Blob).
 *
 * @param {string} conversationId – Die UUID der Konversation
 * @param {string} uri – Lokaler Dateipfad (z. B. aus expo-document-picker)
 * @param {string} mimeType – MIME-Typ (Fallback: application/octet-stream)
 * @param {string} [originalName=''] – Originaldateiname fuer die Dateiendung im Storage-Pfad
 * @returns {string} – Oeffentliche URL der Datei
 */
export async function uploadChatFile(
  conversationId,
  uri,
  mimeType = 'application/octet-stream',
  originalName = '',
) {
  // Endung aus Originalnamen ableiten, sonst aus MIME (z. B. pdf), sonst generisch
  let ext = 'bin';
  if (originalName && originalName.includes('.')) {
    const raw = originalName.split('.').pop() || '';
    ext = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase() || 'bin';
  } else if (mimeType?.includes('/')) {
    ext = mimeType.split('/')[1]?.split('+')[0] || 'bin';
    ext = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase() || 'bin';
  }

  const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `${conversationId}/${fileName}`;

  const arrayBuffer = await readLocalUriAsArrayBuffer(uri);

  const contentType = mimeType || 'application/octet-stream';

  const { data, error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error || !data) {
    console.error('Fehler beim Hochladen der Chat-Datei:', error);
    throw error;
  }

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

  const arrayBuffer = await readLocalUriAsArrayBuffer(uri);

  const { data, error } = await supabase.storage
    .from(STORIES_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Fehler beim Hochladen des Story-Mediums:', error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(STORIES_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Löscht eine Datei aus einem Storage Bucket.
 *
 * @param {string} bucket – Der Bucket-Name ('chat-media' oder 'stories')
 * @param {string} filePath – Der Dateipfad innerhalb des Buckets
 */
export async function deleteFile(bucket, filePath) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Fehler beim Löschen der Datei:', error);
    throw error;
  }
}
