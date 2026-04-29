import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEventStore } from '@/app/store/eventStore';
import { useGeneralStore } from '@/app/store/generalStore';
import { useUserStore } from '@/app/store/userStore';
import type { Event } from '@/components/EventCard';
import useAuthStore from '@/stores/useAuthStore';
import {
  buildDiscoverShowcaseSections,
  buildDiscoverRails,
  fetchDiscoverEventPool,
  type DiscoverQuickFilter,
  type DiscoverRail,
  type DiscoverShowcaseSection,
} from '@/lib/discoverData';

type UseDiscoverRailsResult = {
  rails: DiscoverRail[];
  /** Erstes Laden (Vollbild-Spinner) */
  loading: boolean;
  /** Pull-to-Refresh ohne leeren Screen */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type UseDiscoverShowcaseResult = {
  sections: DiscoverShowcaseSection[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  activeQuickFilter: DiscoverQuickFilter;
  setActiveQuickFilter: (filter: DiscoverQuickFilter) => void;
  refresh: () => Promise<void>;
};

/**
 * Lädt den kompletten Event-Pool und baut die Rails (ohne Nutzer-/Profil-Logik).
 */
export function useDiscoverRails(): UseDiscoverRailsResult {
  const [pool, setPool] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const events = await fetchDiscoverEventPool();
      setPool(events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const rails = useMemo(() => buildDiscoverRails(pool), [pool]);

  const refresh = useCallback(() => load(true), [load]);

  return { rails, loading, refreshing, error, refresh };
}

/**
 * Zustand-backed showcase data: raw pool and UI controls live in store,
 * while personalized sections are memoized from focused store selectors.
 */
export function useDiscoverShowcase(): UseDiscoverShowcaseResult {
  const pool = useEventStore((state) => state.discoverPool);
  const loading = useEventStore((state) => state.discoverLoading);
  const refreshing = useEventStore((state) => state.discoverRefreshing);
  const error = useEventStore((state) => state.discoverError);
  const activeQuickFilter = useEventStore((state) => state.activeQuickFilter);
  const setActiveQuickFilter = useEventStore(
    (state) => state.setActiveQuickFilter
  );
  const load = useEventStore((state) => state.loadDiscoverShowcase);

  const onboardingProfileData = useUserStore((state) => state.profileData);
  const authProfile = useAuthStore((state) => state.profile);
  const userLocation = useGeneralStore((state) => state.userLocation);

  useEffect(() => {
    if (pool.length === 0) void load(false);
  }, [load, pool.length]);

  const profileData = useMemo(
    () => ({
      ...onboardingProfileData,
      username: authProfile?.username ?? onboardingProfileData.username,
      favoriteCity: authProfile?.favorite_city ?? onboardingProfileData.favoriteCity,
      locationEnabled: authProfile?.location_enabled ?? onboardingProfileData.locationEnabled,
      musicGenres: authProfile?.music_genres ?? onboardingProfileData.musicGenres,
      partyPreferences:
        authProfile?.party_preferences ?? onboardingProfileData.partyPreferences,
    }),
    [authProfile, onboardingProfileData]
  );

  const sections = useMemo(
    () =>
      buildDiscoverShowcaseSections({
        pool,
        profileData,
        userLocation,
        activeQuickFilter,
      }),
    [activeQuickFilter, pool, profileData, userLocation]
  );

  const refresh = useCallback(() => load(true), [load]);

  return {
    sections,
    loading,
    refreshing,
    error,
    activeQuickFilter,
    setActiveQuickFilter,
    refresh,
  };
}
