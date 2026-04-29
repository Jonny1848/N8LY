import { create } from 'zustand';

type FilterStore = {
    filterVisible: boolean;
    selectedEventTypes: string[];
    selectedMusicGenres: string[];
    isFilterClosing: boolean;
    selectedRadius: number;
    selectedDate: string;

    setFilterVisible: (visible: boolean) => void;
    setSelectedEventTypes: (types: string[]) => void;
    setSelectedMusicGenres: (genres: string[]) => void;
    setIsFilterClosing: (closing: boolean) => void;
    setSelectedRadius: (radius: number) => void;
    setSelectedDate: (date: string) => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
    filterVisible: false,
    selectedEventTypes: [],
    selectedMusicGenres: [],
    isFilterClosing: false,
    selectedRadius: 10,
    selectedDate: '',

    setFilterVisible: (visible) => set({ filterVisible: visible }),
    setSelectedEventTypes: (types) => set({ selectedEventTypes: types }),
    setSelectedMusicGenres: (genres) => set({ selectedMusicGenres: genres }),
    setIsFilterClosing: (closing) => set({ isFilterClosing: closing }),
    setSelectedRadius: (radius) => set({ selectedRadius: radius }),
    setSelectedDate: (date) => set({ selectedDate: date }),
}));