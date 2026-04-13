import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Event } from '@/components/EventCard';
import {
  buildDiscoverRails,
  fetchDiscoverEventPool,
  type DiscoverRail,
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
