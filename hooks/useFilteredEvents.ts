// app/hooks/useFilteredEvents.ts
import { useMemo } from 'react';
import { useEventStore } from '@/app/store/eventStore';
import { useFilterStore } from '@/app/store/filterStore';

export function useFilteredEvents() {
    const { events } = useEventStore();
    const { selectedEventTypes, selectedMusicGenres } = useFilterStore();

    const filteredEvents = useMemo(() => {
        if (!events) return [];

        return events.filter((event) => {
            const matchesEventType =
                selectedEventTypes.length === 0 ||
                selectedEventTypes.includes(event.event_type);

            const safeEventGenres = Array.isArray(event.music_genres) ? event.music_genres : [];

            const matchesMusicGenre =
                selectedMusicGenres.length === 0 ||
                // Checks if at least ONE of the event's genres exists in the selected filters
                safeEventGenres.some((genre: string) => selectedMusicGenres.includes(genre.toLowerCase()));

            return matchesEventType && matchesMusicGenre;
        });
    }, [events, selectedEventTypes, selectedMusicGenres]);

    return filteredEvents;
}