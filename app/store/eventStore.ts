import { create } from 'zustand';

type EventStore = {
    events: any[]; // TODO: Create file for event type
    selectedEvent: any;
    loadingEvents: boolean;

    setEvents: (events: any[]) => Promise<void>;

    setSelectedEvent: (event: any) => Promise<void>;

    setLoadingEvents: (loading: boolean) => void;
}

export const useEventStore = create<EventStore>((set) => ({
    events: [],
    selectedEvent: null,
    loadingEvents: false,


    setEvents: async (events) => set({ events: events }),
    setSelectedEvent: async (event) => set({ selectedEvent: event }),
    setLoadingEvents: (loading) => set({ loadingEvents: loading }),
}));