import { STORY_REACTION_PRESETS } from './constants';

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

/** Reaktionszahlen: unter 10 mit fuehrender Null, sonst wie formatStoryCount */
export function formatReactionCount(n) {
  const num = Math.max(0, Number(n) || 0);
  if (num >= 1000) return formatStoryCount(num);
  if (num < 10) return String(num).padStart(2, '0');
  if (num < 100) return String(num);
  return formatStoryCount(num);
}

/** Sichtbare Presets nach absteigender Zaehlung */
export function getVisibleReactionPresets(reactions) {
  if (!reactions) return [];
  return STORY_REACTION_PRESETS.filter((p) => (reactions[p.key] ?? 0) > 0).sort(
    (a, b) => (reactions[b.key] ?? 0) - (reactions[a.key] ?? 0)
  );
}
