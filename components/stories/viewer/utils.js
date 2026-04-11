import { STORY_REACTION_RAIL_MAX_VISIBLE } from './constants';

/**
 * Keys aus buildDefaultReactions sind kurze Strings; in der Leiste brauchen wir das Darstellungs-Emoji.
 * Reaktionen aus dem Picker nutzen das Emoji selbst als Key — dann faellt emoji = key zurueck.
 */
export const LEGACY_REACTION_KEY_TO_EMOJI = {
  heart: '❤️',
  heartEyes: '😍',
  joy: '😂',
  wow: '😮',
  hushed: '😯',
};

/**
 * Default-Zaehler pro Autor-Bundle (lokal bis Supabase).
 * Bit-Mask aus seed: nicht jedes Emoji hat sofort count > 0.
 */
export function buildDefaultReactions(seed) {
  const h = seed >>> 0;
  return {
    heart: 50 + (seed % 70),
    heartEyes: h & 1 ? 20 + (seed % 35) : 0,
    joy: h & 2 ? 8 + (seed % 25) : 0,
    wow: h & 4 ? 12 + (seed % 20) : 0,
    hushed: h & 8 ? 10 + (seed % 18) : 0,
  };
}

/** Stabiler Demo-Seed aus Strings (z. B. authorNorm + Story-IDs) */
export function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Kompakte Zaehleranzeige (127k, 1.7M) */
export function formatStoryCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) {
    const v = num / 1_000_000;
    const s = v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
    return `${s}M`;
  }
  if (num >= 1000) {
    const v = num / 1000;
    const s = v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
    return `${s}k`;
  }
  return String(num);
}

/** Reaktionszahlen: normale Darstellung 1, 2, …; ab 1k kompaktes k/M wie formatStoryCount */
export function formatReactionCount(n) {
  const num = Math.max(0, Number(n) || 0);
  if (num >= 1000) return formatStoryCount(num);
  return String(num);
}

/**
 * Reaktionen mit Zaehler > 0, nach Haeufigkeit absteigend — hoechstens STORY_REACTION_RAIL_MAX_VISIBLE.
 * userPickedKey (optional, nie "heart"): eigene Emoji-Wahl bleibt sichtbar, auch wenn sie nicht zu Top-N zaehlt.
 * Keys: Legacy (heart, …) oder Emoji-Strings; Rueckgabe { key, emoji, label } fuer StoryReactionScrim.
 */
export function getVisibleReactionPresets(reactions, userPickedKey = null) {
  if (!reactions) return [];
  const sorted = Object.entries(reactions)
    .filter(([, n]) => (Number(n) || 0) > 0)
    .map(([key]) => {
      const emoji = LEGACY_REACTION_KEY_TO_EMOJI[key] ?? key;
      return { key, emoji, label: emoji };
    })
    .sort((a, b) => (reactions[b.key] ?? 0) - (reactions[a.key] ?? 0));

  const max = STORY_REACTION_RAIL_MAX_VISIBLE;
  let visible = sorted.slice(0, max);
  if (userPickedKey && userPickedKey !== 'heart' && !visible.some((e) => e.key === userPickedKey)) {
    const emoji = LEGACY_REACTION_KEY_TO_EMOJI[userPickedKey] ?? userPickedKey;
    const userEntry = { key: userPickedKey, emoji, label: emoji };
    const rest = sorted.filter((e) => e.key !== userPickedKey).slice(0, max - 1);
    visible = [...rest, userEntry].sort(
      (a, b) => (reactions[b.key] ?? 0) - (reactions[a.key] ?? 0)
    );
  }
  return visible;
}
