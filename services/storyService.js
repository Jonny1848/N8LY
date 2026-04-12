/**
 * =============================================================
 * Story Service – Alle Supabase-Queries fuer Stories
 * =============================================================
 *
 * Verwaltet:
 * - Stories laden (aktive, nicht abgelaufene)
 * - Stories erstellen und loeschen
 * - Story-Views tracken (wer hat was gesehen)
 * - Stories nach User gruppieren (fuer den Story-Ring)
 * =============================================================
 */

import { supabase } from '../lib/supabase';

/**
 * Laedt alle aktiven Stories (noch nicht abgelaufen).
 *
 * Gibt Stories gruppiert nach User Zurück, damit der Story-Ring
 * korrekt angezeigt werden kann (ein Ring pro User, mehrere Stories dahinter).
 *
 * @param {string} currentUserId – Die UUID des eingeloggten Users
 * @returns {Array} – Stories gruppiert nach User: [{ user, stories[], hasUnviewed }]
 */
export async function getActiveStories(currentUserId) {
  // Schritt 1: Alle aktiven Stories laden (expires_at in der Zukunft)
  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      id,
      user_id,
      media_url,
      media_type,
      caption,
      expires_at,
      created_at,
      profiles:user_id (
        id,
        username,
        avatar_url
      )
    `)
    .gt('expires_at', new Date().toISOString()) // Nur nicht abgelaufene Stories
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Fehler beim Laden der Stories:', error);
    return [];
  }

  if (!stories || stories.length === 0) return [];

  // Schritt 2: Alle Story-Views des aktuellen Users laden
  // (um zu wissen, welche Stories schon gesehen wurden)
  const storyIds = stories.map((s) => s.id);
  const { data: views } = await supabase
    .from('story_views')
    .select('story_id')
    .eq('viewer_id', currentUserId)
    .in('story_id', storyIds);

  // Set fuer schnelle Lookup: "Wurde diese Story schon gesehen?"
  const viewedStoryIds = new Set(views?.map((v) => v.story_id) || []);

  // Schritt 3: Stories nach User gruppieren
  const userStoriesMap = {};

  /** PostgREST kann `profiles` als Objekt oder (selten) als Array liefern — vereinheitlichen. */
  const normalizeProfile = (profiles) => {
    if (!profiles) return null;
    if (Array.isArray(profiles)) return profiles[0] ?? null;
    return profiles;
  };

  /** Profil aus mehreren Slides mergen: erster Eintrag hatte evtl. null-Join, spaetere Zeilen volles Profil. */
  const mergeProfile = (existing, incoming) => {
    const a = normalizeProfile(existing);
    const b = normalizeProfile(incoming);
    if (!b) return a;
    if (!a) return b;
    return {
      ...a,
      ...b,
      username: b.username || a.username,
      avatar_url: b.avatar_url || a.avatar_url,
    };
  };

  stories.forEach((story) => {
    const userId = story.user_id;

    if (!userStoriesMap[userId]) {
      userStoriesMap[userId] = {
        user: normalizeProfile(story.profiles),
        stories: [],
        hasUnviewed: false, // Gibt es ungesehene Stories von diesem User?
        isOwn: userId === currentUserId, // Ist es die eigene Story?
      };
    } else {
      userStoriesMap[userId].user = mergeProfile(userStoriesMap[userId].user, story.profiles);
    }

    // Story mit "viewed"-Flag hinzufuegen
    const isViewed = viewedStoryIds.has(story.id);
    userStoriesMap[userId].stories.push({
      ...story,
      isViewed,
    });

    // Wenn mindestens eine Story ungesehen ist, Ring als "ungesehen" markieren
    if (!isViewed) {
      userStoriesMap[userId].hasUnviewed = true;
    }
  });

  // Schritt 4: Als Array Zurückgeben, eigene Story zuerst, dann ungesehene zuerst
  return Object.values(userStoriesMap).sort((a, b) => {
    // Eigene Stories immer ganz vorne
    if (a.isOwn) return -1;
    if (b.isOwn) return 1;
    // Dann ungesehene Stories vor gesehenen
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return 0;
  });
}

/**
 * Erstellt eine neue Story.
 *
 * Die Media-URL muss vorher ueber den storageService hochgeladen worden sein.
 *
 * @param {string} userId – Die UUID des Story-Erstellers
 * @param {string} mediaUrl – Die URL des Mediums aus Supabase Storage
 * @param {'image'|'video'} mediaType – Der Typ des Mediums
 * @param {string|null} caption – Optionaler Text-Overlay
 * @returns {Object} – Die erstellte Story
 */
export async function createStory(userId, mediaUrl, mediaType, caption = null) {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      media_url: mediaUrl,
      media_type: mediaType,
      caption,
      // expires_at wird automatisch auf now() + 24h gesetzt (DB-Default)
    })
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Erstellen der Story:', error);
    throw error;
  }

  return data;
}

/**
 * Loescht eine eigene Story.
 *
 * @param {string} storyId – Die UUID der Story
 */
export async function deleteStory(storyId) {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId);

  if (error) {
    console.error('Fehler beim Loeschen der Story:', error);
    throw error;
  }
}

/**
 * Markiert eine Story als "gesehen" durch den aktuellen User.
 *
 * Wird automatisch aufgerufen, wenn der User eine Story anschaut.
 * Durch das UNIQUE-Constraint in der DB wird kein Duplikat erstellt,
 * falls der User die Story schon gesehen hat.
 *
 * @param {string} storyId – Die UUID der Story
 * @param {string} viewerId – Die UUID des Betrachters
 */
export async function markStoryAsViewed(storyId, viewerId) {
  const { error } = await supabase
    .from('story_views')
    .upsert(
      {
        story_id: storyId,
        viewer_id: viewerId,
      },
      {
        // Bei Duplikat (gleiche story_id + viewer_id) nichts tun
        onConflict: 'story_id, viewer_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error('Fehler beim Markieren der Story als gesehen:', error);
  }
}

/**
 * Laedt die Viewer-Liste fuer eine eigene Story.
 *
 * Zeigt an, wer die Story gesehen hat und wann.
 *
 * @param {string} storyId – Die UUID der Story
 * @returns {Array} – Liste der Viewer mit Profil und Zeitstempel
 */
export async function getStoryViewers(storyId) {
  const { data, error } = await supabase
    .from('story_views')
    .select(`
      id,
      viewed_at,
      profiles:viewer_id (
        id,
        username,
        avatar_url
      )
    `)
    .eq('story_id', storyId)
    .order('viewed_at', { ascending: false });

  if (error) {
    console.error('Fehler beim Laden der Story-Viewer:', error);
    return [];
  }

  return data || [];
}
