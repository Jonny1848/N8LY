/**
 * Zustand-Store fuer den Story-Erstellungsflow.
 * Haelt alle Clips (Foto/Video), bis der User auf „Story teilen“ tippt.
 */
import { create } from 'zustand';

/** @typedef {{ id: string, localUri: string, kind: 'photo'|'video', mimeType: string, caption: string|null, exportUri: string|null }} StoryDraftClip */

function newClipId() {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useStoryDraftStore = create((set, get) => ({
  /** @type {StoryDraftClip[]} */
  clips: [],

  /** Neuen Clip anhaengen und dessen id zurueckgeben (Navigation zum Editor). */
  addClip: (partial) => {
    const id = newClipId();
    const clip = {
      id,
      localUri: partial.localUri,
      kind: partial.kind,
      mimeType: partial.mimeType || (partial.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      caption: partial.caption ?? null,
      exportUri: null,
    };
    set((s) => ({ clips: [...s.clips, clip] }));
    return id;
  },

  /** Nach Flatten oder Caption-Aenderung einen Clip patchen. */
  updateClip: (id, patch) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
    })),

  /** Nach erfolgreichem Posten oder beim Abbruch. */
  clearDraft: () => set({ clips: [] }),

  getClipById: (id) => get().clips.find((c) => c.id === id),
}));
