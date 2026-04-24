/**
 * ============================================================
 * useAuthStore – Globaler Auth-State mit Zustand
 * ============================================================
 *
 * Zentraler Store fuer Authentifizierung und User-Daten.
 * Ersetzt das bisherige Pattern, bei dem jeder Screen einzeln
 * supabase.auth.getSession() aufruft.
 *
 * Verwendung in Komponenten:
 *   const userId = useAuthStore((s) => s.userId);
 *   const session = useAuthStore((s) => s.session);
 *
 * Initialisierung:
 *   Wird in _layout.tsx einmalig via initializeAuth() gestartet.
 *   Setzt den Auth-Listener auf, der bei Login/Logout/Token-Refresh
 *   automatisch den Store aktualisiert.
 * ============================================================
 */

import { create } from 'zustand';
import { supabase, fetchProfileWithToken } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// ============================
// Typen fuer den Auth-Store
// ============================
interface AuthProfile {
  onboarding_completed?: boolean;
  username?: string;
  avatar_url?: string | null;
  [key: string]: any; // Weitere Profilfelder flexibel erlauben
}

interface AuthState {
  // --- State ---
  session: Session | null;       // Aktuelle Supabase-Session (null = nicht eingeloggt)
  userId: string | null;         // Abkuerzung fuer session?.user?.id
  profile: AuthProfile | null;   // Profil-Daten aus der profiles-Tabelle
  initialized: boolean;          // true sobald der erste Auth-Check abgeschlossen ist

  // --- Actions ---
  setSession: (session: Session | null) => void;
  setProfile: (profile: AuthProfile | null) => void;
  fetchProfile: (session?: Session | null) => Promise<AuthProfile | null>;
  clearAuth: () => void;
}

// ============================
// Store erstellen
// ============================
const useAuthStore = create<AuthState>((set, get) => ({
  // Initialer State – alles leer bis der Auth-Check laeuft
  session: null,
  userId: null,
  profile: null,
  initialized: false,

  /**
   * Session setzen (nach Login, Token-Refresh etc.)
   * Leitet die userId automatisch aus der Session ab.
   */
  setSession: (session) => {
    set({
      session,
      userId: session?.user?.id ?? null,
      initialized: true,
    });
  },

  /**
   * Profil-Daten im Store aktualisieren.
   * Wird nach fetchProfile() oder nach Profil-Updates aufgerufen.
   */
  setProfile: (profile) => {
    set({ profile });
  },

  /**
   * Profil aus der Supabase-Datenbank laden.
   *
   * Bei OAuth (SIGNED_IN) wird fetchProfileWithToken() verwendet,
   * da der Supabase-Client den JWT manchmal nicht mit der ersten
   * Anfrage nach setSession sendet.
   *
   * @param sessionOverride – Optionale Session (fuer OAuth-Flow)
   * @returns Das geladene Profil oder null
   */
  fetchProfile: async (sessionOverride) => {
    const session = sessionOverride ?? get().session;
    const uid = session?.user?.id;
    if (!uid) return null;

    try {
      let profile: AuthProfile | null = null;

      // Bei OAuth: Token direkt verwenden (umgeht RLS-Timing-Problem)
      if (sessionOverride?.access_token) {
        profile = await fetchProfileWithToken(session!.access_token, uid);
      } else {
        // Standard: Ueber den Supabase-Client abfragen
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (error) {
          console.error('[AUTH STORE] Profil-Abfrage Fehler:', error);
        }
        profile = data ?? null;
      }

      // Profil im Store speichern
      set({ profile });
      return profile;
    } catch (err) {
      console.error('[AUTH STORE] fetchProfile Fehler:', err);
      return null;
    }
  },

  /**
   * Auth-State komplett Zurücksetzen (bei Logout).
   */
  clearAuth: () => {
    set({
      session: null,
      userId: null,
      profile: null,
      initialized: false,
    });
  },
}));

export default useAuthStore;
