import { create } from 'zustand';

type GeneralStore = {
    introCompleted: boolean;
    setIntroCompleted: (completed: boolean) => void;

    searchQuery: string;
    setSearchQuery: (query: string) => void;
    
    userLocation: { latitude: number; longitude: number } | null;
    setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
}

export const useGeneralStore = create<GeneralStore>((set) => ({
    introCompleted: false,
    setIntroCompleted: (completed) => set({ introCompleted: completed }),
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    userLocation: null,
    setUserLocation: (location) => set({ userLocation: location }),
}));