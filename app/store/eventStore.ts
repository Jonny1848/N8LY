import { create } from 'zustand';
import type { Event } from '@/components/EventCard';
import {
    type DiscoverQuickFilter,
    fetchDiscoverEventPool,
} from '@/lib/discoverData';

type EventStore = {
    events: any[]; // TODO: Create file for event type
    selectedEvent: any;
    loadingEvents: boolean;
    filterVisible: boolean;

    setEvents: (events: any[]) => Promise<void>;

    setSelectedEvent: (event: any) => Promise<void>;

    setLoadingEvents: (loading: boolean) => void;

    setFilterVisible: (visible: boolean) => void;
}

type DiscoverShowcaseSlice = {
    discoverPool: Event[];
    discoverLoading: boolean;
    discoverRefreshing: boolean;
    discoverError: string | null;
    activeQuickFilter: DiscoverQuickFilter;
    setActiveQuickFilter: (filter: DiscoverQuickFilter) => void;
    loadDiscoverShowcase: (isPullRefresh?: boolean) => Promise<void>;
}

type EventStoreState = EventStore & DiscoverShowcaseSlice;

export const useEventStore = create<EventStoreState>((set) => ({
    events: [],
    selectedEvent: null, 
    loadingEvents: false,
    filterVisible: false,

    setEvents: async (events) => set({ events: events }),
    setSelectedEvent: async (event) => set({ selectedEvent: event }),
    setLoadingEvents: (loading) => set({ loadingEvents: loading }),
    setFilterVisible: (visible) => set({ filterVisible: visible }),

    discoverPool: [],
    discoverLoading: true,
    discoverRefreshing: false,
    discoverError: null,
    activeQuickFilter: 'all',
    setActiveQuickFilter: (filter) => set({ activeQuickFilter: filter }),
    loadDiscoverShowcase: async (isPullRefresh = false) => {
        if (isPullRefresh) set({ discoverRefreshing: true, discoverError: null });
        else set({ discoverLoading: true, discoverError: null });

        try {
            const events = await fetchDiscoverEventPool();
            set({ discoverPool: events });
        } catch (error) {
            set({
                discoverError: error instanceof Error ? error.message : 'Unbekannter Fehler',
            });
        } finally {
            set({ discoverLoading: false, discoverRefreshing: false });
        }
    },
}));