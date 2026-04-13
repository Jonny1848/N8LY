import type { Event } from '@/components/EventCard';
import { supabase } from '@/lib/supabase';

/**
 * Discover-Screen: zentrale Heuristiken für die „Streaming“-Rails.
 *
 * Aktuell **ohne Nutzerbezug** (kein Profil): eine Abfrage über alle Events,
 * Rails werden clientseitig gebildet — Roadmap siehe `docs/discover-mvp-heuristics.md`.
 */

export type DiscoverRail = {
  key: string;
  title: string;
  subtitle?: string;
  events: Event[];
};

const RAIL_LIMIT = 16;

/** Feste Seed-Zeichenkette — deterministische Mischung, aber nicht nutzerabhängig. */
const SHUFFLE_SEED = 'discover-catalog-v1';

/** Deterministische Mischung für die erste Rail („Für dich“). */
function seededShuffle<T>(items: T[], seedStr: string): T[] {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (Math.imul(1103515245, h) + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function takeUnique(events: Event[], limit: number): Event[] {
  const seen = new Set<string>();
  const out: Event[] = [];
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/** Häufigstes Musik-Genre im Pool (für eine Genre-Schiene). */
function topGenreFromPool(events: Event[]): string | null {
  const counts = new Map<string, number>();
  for (const e of events) {
    for (const g of e.music_genres ?? []) {
      const k = g.trim();
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [g, c] of counts) {
    if (c > max) {
      max = c;
      best = g;
    }
  }
  return best;
}

/**
 * Baut die Rails aus dem gesamten Event-Pool — rein allgemein, ohne Profil oder Auth.
 * Funktioniert auch, wenn in der DB nur vergangene Termine liegen.
 */
export function buildDiscoverRails(pool: Event[]): DiscoverRail[] {
  if (pool.length === 0) return [];

  const byDateDesc = [...pool].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const byInterest = [...pool].sort(
    (a, b) => (b.interested_count ?? 0) - (a.interested_count ?? 0)
  );

  const forYou = takeUnique(seededShuffle(pool, SHUFFLE_SEED), RAIL_LIMIT);
  const newest = takeUnique(byDateDesc, RAIL_LIMIT);
  const trending = takeUnique(byInterest, RAIL_LIMIT);
  const boosted = takeUnique(
    pool.filter((e) => e.is_boosted),
    RAIL_LIMIT
  );

  const rails: DiscoverRail[] = [];

  rails.push({
    key: 'for-you',
    title: 'Für dich',
    subtitle: 'Bunte Mischung aus dem Katalog',
    events: forYou,
  });

  rails.push({
    key: 'newest',
    title: 'Neueste zuerst',
    subtitle: 'Sortiert nach Event-Datum (neueste oben)',
    events: newest,
  });

  rails.push({
    key: 'trending',
    title: 'Beliebt bei uns',
    subtitle: 'Sortiert nach Interesse (interested_count)',
    events: trending,
  });

  if (boosted.length > 0) {
    rails.push({
      key: 'spotlight',
      title: 'Spotlight',
      subtitle: 'Hervorgehobene Events',
      events: boosted,
    });
  }

  const genre = topGenreFromPool(pool);
  if (genre) {
    const genreEvents = takeUnique(
      pool.filter((e) =>
        (e.music_genres ?? []).some((g) => g.toLowerCase() === genre.toLowerCase())
      ),
      RAIL_LIMIT
    );
    if (genreEvents.length > 0) {
      rails.push({
        key: `genre-${genre}`,
        title: `${genre} & mehr`,
        subtitle: 'Events mit diesem Genre',
        events: genreEvents,
      });
    }
  }

  return rails.filter((r) => r.events.length > 0);
}

/**
 * Lädt alle Events (kein Datumsfilter), damit auch vergangene Termine aus der DB sichtbar sind.
 */
export async function fetchDiscoverEventPool(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[discover] fetchDiscoverEventPool', error.message);
    return [];
  }
  return (data ?? []) as Event[];
}
