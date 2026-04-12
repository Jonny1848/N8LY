import { create } from 'zustand';

export interface ProfileData {
  username: string;
  age: string;
  isPublic: boolean;
  favoriteCity: string;
  locationEnabled: boolean;
  avatarUri: string | null;
  musicGenres: string[];
  partyPreferences: string[];
  bio: string;
  partyTypes: string[];
}

const emptyProfileData: ProfileData = {
  username: '',
  age: '',
  isPublic: true,
  favoriteCity: '',
  locationEnabled: false,
  avatarUri: null,
  musicGenres: [],
  partyPreferences: [],
  bio: '',
  partyTypes: [],
};

type UserStore = {
    profileData: ProfileData;
    updateProfileData: (updates: Partial<ProfileData>) => void;
    resetProfileData: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
    profileData: emptyProfileData,
    updateProfileData: (updates) => set((state) => ({
        profileData: { ...state.profileData, ...updates }
    })),
    resetProfileData: () => set({ profileData: emptyProfileData }),
}));