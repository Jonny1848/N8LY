import type { Event } from '@/components/EventCard';
import type { ProfileData } from '@/app/store/userStore';
import { getEventRuntimeState, isEventLiveNow, isEventUpcoming } from '@/lib/eventState';
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

export type DiscoverQuickFilter = 'all' | 'now' | 'nearby' | 'weekend';

export type DiscoverShowcaseLayout = 'hero' | 'poster' | 'wide' | 'compact' | 'spotlight';

export type DiscoverShowcaseSection = {
  key: string;
  type: 'quickFilters' | 'hero' | 'rail' | 'categoryGrid';
  title: string;
  subtitle?: string;
  events: Event[];
  layout: DiscoverShowcaseLayout;
};

export type DiscoverShowcaseInput = {
  pool: Event[];
  profileData?: ProfileData;
  userLocation?: { latitude: number; longitude: number } | null;
  activeQuickFilter?: DiscoverQuickFilter;
  now?: Date;
};

const RAIL_LIMIT = 16;
const HERO_LIMIT = 6;
const SECTION_LIMIT = 12;
const SHOWCASE_NEARBY_RADIUS_KM = 10;

/** Feste Seed-Zeichenkette — deterministische Mischung, aber nicht nutzerabhängig. */
const SHUFFLE_SEED = 'discover-catalog-v1';

/** Deterministische Mischung für die erste Rail. */
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

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function titleize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function eventCoordinates(event: Event): { latitude: number; longitude: number } | null {
  const withLocation = event as Event & {
    location_lat?: number | null;
    location_lng?: number | null;
  };
  if (typeof withLocation.location_lat !== 'number') return null;
  if (typeof withLocation.location_lng !== 'number') return null;
  return {
    latitude: withLocation.location_lat,
    longitude: withLocation.location_lng,
  };
}

function distanceInKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isThisWeekend(event: Event, now: Date): boolean {
  const time = new Date(event.date).getTime();
  if (Number.isNaN(time)) return false;

  const eventDate = new Date(time);
  const day = eventDate.getDay();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);

  const monday = new Date(friday);
  monday.setDate(friday.getDate() + 3);

  return eventDate >= friday && eventDate < monday && (day === 5 || day === 6 || day === 0);
}

function filterPool({
  pool,
  activeQuickFilter = 'all',
  userLocation,
  now = new Date(),
}: DiscoverShowcaseInput): Event[] {
  return pool.filter((event) => {
    if (activeQuickFilter === 'now') return isEventLiveNow(event, now);
    if (activeQuickFilter === 'weekend') return isThisWeekend(event, now);
    if (activeQuickFilter === 'nearby' && userLocation) {
      const coords = eventCoordinates(event);
      return coords ? distanceInKm(userLocation, coords) <= SHOWCASE_NEARBY_RADIUS_KM : true;
    }

    return true;
  });
}

function scoreEvent(
  event: Event,
  {
    profileData,
    userLocation,
    now = new Date(),
  }: Pick<DiscoverShowcaseInput, 'profileData' | 'userLocation' | 'now'>
): number {
  const preferredGenres = new Set((profileData?.musicGenres ?? []).map(normalize));
  const preferredTypes = new Set(
    [...(profileData?.partyPreferences ?? []), ...(profileData?.partyTypes ?? [])].map(normalize)
  );
  const favoriteCity = normalize(profileData?.favoriteCity);
  const startTime = new Date(event.date).getTime();
  const hoursUntil = Number.isNaN(startTime)
    ? 999
    : (startTime - now.getTime()) / (60 * 60 * 1000);

  let score = 0;

  if (isEventLiveNow(event, now)) score += 80;
  if (isEventUpcoming(event, now) && hoursUntil <= 48) score += 34;
  if (event.is_boosted) score += 16;
  score += Math.min(event.interested_count ?? 0, 250) / 10;

  if ((event.music_genres ?? []).some((genre) => preferredGenres.has(normalize(genre)))) {
    score += 35;
  }
  if (preferredTypes.has(normalize(event.event_type))) score += 28;
  if (favoriteCity && normalize(event.city) === favoriteCity) score += 20;

  if (userLocation) {
    const coords = eventCoordinates(event);
    if (coords) {
      const distance = distanceInKm(userLocation, coords);
      score += Math.max(0, 30 - distance * 2);
    }
  }

  if (getEventRuntimeState(event, now) === 'inactive') score -= 80;
  if (hoursUntil > 0) score += Math.max(0, 18 - hoursUntil / 12);

  return score;
}

function sortPersonalized(events: Event[], input: DiscoverShowcaseInput): Event[] {
  return [...events].sort((a, b) => scoreEvent(b, input) - scoreEvent(a, input));
}

function buildTopGenreSections(events: Event[], input: DiscoverShowcaseInput): DiscoverShowcaseSection[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const genre of event.music_genres ?? []) {
      const key = normalize(genre);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => {
      const eventsForGenre = takeUnique(
        sortPersonalized(
          events.filter((event) =>
            (event.music_genres ?? []).some((item) => normalize(item) === genre)
          ),
          input
        ),
        SECTION_LIMIT
      );
      return {
        key: `genre-${genre}`,
        type: 'rail' as const,
        title: titleize(genre),
        events: eventsForGenre,
        layout: 'poster' as const,
      };
    })
    .filter((section) => section.events.length > 0);
}

function buildTopCategorySections(
  events: Event[],
  input: DiscoverShowcaseInput
): DiscoverShowcaseSection[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = normalize(event.event_type);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([eventType]) => {
      const eventsForType = takeUnique(
        sortPersonalized(
          events.filter((event) => normalize(event.event_type) === eventType),
          input
        ),
        8
      );
      return {
        key: `category-${eventType}`,
        type: 'categoryGrid' as const,
        title: titleize(eventType),
        events: eventsForType,
        layout: 'compact' as const,
      };
    })
    .filter((section) => section.events.length > 0);
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
      title: 'Hervorgehoben',
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

export function buildDiscoverShowcaseSections(
  input: DiscoverShowcaseInput
): DiscoverShowcaseSection[] {
  const now = input.now ?? new Date();
  const filteredPool = filterPool({ ...input, now });
  const sections: DiscoverShowcaseSection[] = [
    {
      key: 'quick-filters',
      type: 'quickFilters',
      title: 'Filter',
      events: [],
      layout: 'compact',
    },
  ];

  if (filteredPool.length === 0) return sections;

  const personalized = sortPersonalized(filteredPool, { ...input, now });
  const liveNow = takeUnique(
    personalized.filter((event) => isEventLiveNow(event, now)),
    HERO_LIMIT
  );
  const upcoming = takeUnique(
    personalized.filter((event) => isEventUpcoming(event, now)),
    SECTION_LIMIT
  );
  const byInterest = takeUnique(
    [...filteredPool].sort((a, b) => (b.interested_count ?? 0) - (a.interested_count ?? 0)),
    SECTION_LIMIT
  );
  const hiddenGems = takeUnique(
    personalized.filter((event) => !event.is_boosted && (event.interested_count ?? 0) < 40),
    SECTION_LIMIT
  );
  const boosted = takeUnique(
    personalized.filter((event) => event.is_boosted),
    SECTION_LIMIT
  );

  sections.push({
    key: liveNow.length > 0 ? 'live-now-hero' : 'recommended-hero',
    type: 'hero',
    title: liveNow.length > 0 ? 'Jetzt live' : 'Für dich',
    events: liveNow.length > 0 ? liveNow : takeUnique(personalized, HERO_LIMIT),
    layout: 'hero',
  });

  if (boosted.length > 0) {
    sections.push({
      key: 'spotlight',
      type: 'rail',
      title: 'Empfohlen',
      events: boosted,
      layout: 'spotlight',
    });
  }

  if (liveNow.length > 0) {
    sections.push({
      key: 'happening-now',
      type: 'rail',
      title: 'Läuft gerade',
      events: takeUnique(liveNow, SECTION_LIMIT),
      layout: 'wide',
    });
  }

  sections.push({
    key: 'trending-near-you',
    type: 'rail',
    title: 'Beliebt in der Nähe',
    events: byInterest,
    layout: 'wide',
  });

  sections.push(...buildTopGenreSections(filteredPool, { ...input, now }));
  sections.push(...buildTopCategorySections(filteredPool, { ...input, now }));

  if (upcoming.length > 0) {
    sections.push({
      key: 'not-popping-yet',
      type: 'rail',
      title: 'Demnächst',
      events: upcoming,
      layout: 'poster',
    });
  }

  if (hiddenGems.length > 0) {
    sections.push({
      key: 'hidden-gems',
      type: 'rail',
      title: 'Weitere Events',
      events: hiddenGems,
      layout: 'compact',
    });
  }

  return sections.filter((section) => section.type === 'quickFilters' || section.events.length > 0);
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
