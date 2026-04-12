import { create } from 'zustand';

type EventStore = {
    events: any[]; // TODO: Create file for event type
    currentEvent: any;
    loadingEvents: boolean;
    filterVisible: boolean;

    setEvents: (events: any[]) => Promise<void>;

    setCurrentEvent: (event: any) => Promise<void>;

    setLoadingEvents: (loading: boolean) => void;

    setFilterVisible: (visible: boolean) => void;
}

export const useEventStore = create<EventStore>((set) => ({
    events: [],
    currentEvent: null, 
    loadingEvents: false,
    filterVisible: false,

    setEvents: async (events) => set({ events: events }),
    setCurrentEvent: async (event) => set({ currentEvent: event }),
    setLoadingEvents: (loading) => set({ loadingEvents: loading }),
    setFilterVisible: (visible) => set({ filterVisible: visible }),
}));