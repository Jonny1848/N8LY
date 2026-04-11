import "../global.css";

/**
 * Root Layout – Auth-Routing & Control Flow
 *
 * CONTROL FLOW:
 * 1) BOOTSTRAP (App-Start/Reload):
 *    getSession() → bei Session: handleAuthenticated(session) → Profil via Supabase Client → /tabs oder /onboarding
 *    ohne Session: /login
 *
 * 2) E-Mail-Login (login.jsx):
 *    signInWithPassword() → onAuthStateChange(SIGNED_IN) → handleAuthenticated(session, 'SIGNED_IN')
 *    → Profil via fetchProfileWithToken → Navigation
 *
 * 3) Google OAuth – zwei Einstiegspunkte:
 *    A) login.jsx: WebBrowser öffnet, User kehrt zurück → setSession() → fetchProfileWithToken() → setOauthRedirectTo → <Redirect>
 *    B) auth/callback: Deep-Link n8tly://auth/callback → setSession() → fetchProfileWithToken() → router.replace()
 *    Zusätzlich: onAuthStateChange(SIGNED_IN) → handleAuthenticated(session, 'SIGNED_IN') → fetchProfileWithToken() → safeReplace()
 *
 * WICHTIG (OAuth): Der Supabase-Client sendet den JWT manchmal nicht mit der ersten Anfrage nach setSession.
 * Daher nutzen wir fetchProfileWithToken(access_token) für direkte REST-API-Abfragen – umgeht RLS/auth.uid()-Probleme.
 */
// app/_layout.jsx
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Slot, useRouter, usePathname, Stack } from 'expo-router';
import { GluestackUIProvider } from '../components/ui/gluestack-ui-provider';
import { supabase } from '../lib/supabase';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native'
import { IntroProvider, useIntro } from '../components/IntroContext';
import { OnboardingProvider } from '../components/OnboardingContext';
import { useFonts } from 'expo-font';
import { storyEditorFontAssets } from '../lib/storyEditorFontAssets';
// Zustand: Globaler Auth-Store (ersetzt lokale getSession()-Aufrufe)
import useAuthStore from '../stores/useAuthStore';

function RootLayoutContent() {
  // Manrope + Story-Editor-Google-Fonts (siehe lib/storyEditorFontAssets)
  const [fontsLoaded, fontError] = useFonts(storyEditorFontAssets);

  const router = useRouter();
  const pathname = usePathname();
  const { introCompleted } = useIntro();
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Debug: Check if fonts are loaded
  useEffect(() => {
    console.log('[FONTS] Fonts loaded:', fontsLoaded);
    if (fontError) {
      console.error('[FONTS] Font loading error:', fontError);
    }
  }, [fontsLoaded, fontError]);

  // Zustand-Store: Auth-Actions und State
  const { setSession, fetchProfile, clearAuth } = useAuthStore();

  // Verhindert Doppelnavigation & parallele handleAuthenticated-Laeufe
  const navigatingRef = useRef<string | null>(null);
  const handlingAuthRef = useRef(false);
  const bootstrappedRef = useRef(false);

  // State-basierter Redirect: laeuft im React-Lifecycle (wichtig fuer OAuth)
  useEffect(() => {
    if (!pendingRedirect || pathname === pendingRedirect) return;
    console.log('[NAV] Executing pending redirect to:', pendingRedirect);
    router.replace(pendingRedirect);
    setPendingRedirect(null);
    setTimeout(() => (navigatingRef.current = null), 100);
  }, [pendingRedirect, pathname]);

  // ============================
  // Auth-Bootstrap & Listener – befuellt den globalen Auth-Store
  // ============================
  useEffect(() => {
    // Warte bis Intro abgeschlossen ist und Fonts geladen (oder Font-Fehler aufgetreten)
    if (!introCompleted || (!fontsLoaded && !fontError)) {
      console.log('[AUTH] Waiting for intro or fonts...', { introCompleted, fontsLoaded, fontError });
      return;
    }

    if (fontError) {
      console.warn('[AUTH] Font loading failed, but proceeding with auth bootstrap');
    }

    let unsub = () => {};

    (async () => {
      // 1) BOOTSTRAP: Aktuelle Session pruefen und im Store speichern
      const { data: { session } } = await supabase.auth.getSession();
      // Session im Zustand-Store setzen (macht userId global verfuegbar)
      setSession(session);

      if (session) {
        console.log('Aktuelle Session:' + session?.user?.email);
        await handleAuthenticated(session);
      } else {
        safeReplace('/login');
      }
      bootstrappedRef.current = true;

      // 2) EVENTS: Auth-Aenderungen behandeln und Store aktualisieren
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH] Event:', event, 'Pathname:', pathname);
        if (!bootstrappedRef.current) return;

        // Store bei jedem Auth-Event aktualisieren
        setSession(session);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) await handleAuthenticated(session, event);
        } else if (event === 'SIGNED_OUT') {
          console.log('[AUTH] SIGNED_OUT detected, navigating to login');
          // Auth-Store zurücksetzen
          clearAuth();
          navigatingRef.current = null;
          setPendingRedirect('/login');
        }
      });
      unsub = () => data?.subscription?.unsubscribe?.();
    })();

    return () => unsub();
  }, [introCompleted, fontsLoaded, fontError]);

  /** Sichere Navigation ohne Doppelaufrufe */
  function safeReplace(target: string) {
    console.log('[NAV] safeReplace called:', { target, current: navigatingRef.current, pathname });
    if (navigatingRef.current === target || pathname === target) {
      console.log('[NAV] Navigation blocked - already navigating or already at target');
      return;
    }
    navigatingRef.current = target;
    setPendingRedirect(target);
  }

  /**
   * Nach erfolgreicher Authentifizierung: Profil laden und navigieren.
   * Speichert das Profil im Zustand-Store, sodass alle Screens darauf zugreifen koennen.
   */
  async function handleAuthenticated(session: any, event?: string) {
    if (handlingAuthRef.current) return;
    handlingAuthRef.current = true;
    try {
      const uid = session?.user?.id;
      if (!uid) {
        safeReplace('/onboarding');
        return;
      }
      console.log('[AUTH] PreSupabase Auth Check');

      // Profil laden und im Store speichern.
      // Bei OAuth (SIGNED_IN) wird die Session uebergeben fuer Token-basierte Abfrage
      const profile = await fetchProfile(
        event === 'SIGNED_IN' ? session : undefined
      );
      console.log('[AUTH] Profil geladen:', { profile });
      console.log('[AUTH] : Post Supabase Auth Check');

      const onboardingComplete = profile?.onboarding_completed === true;
      if (onboardingComplete) {
        safeReplace('/tabs');
      } else {
        safeReplace('/onboarding');
      }
    } catch (err) {
      console.error('[AUTH] handleAuthenticated error:', err);
      safeReplace('/onboarding');
    } finally {
      handlingAuthRef.current = false;
    }
  }

  return (
    <GluestackUIProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          // 🔹 Übergang auswählen:
          animation: 'slide_from_right',
          // Alternativen:
          // 'default' | 'simple_push' | 'fade' | 'fade_from_bottom' | 'slide_from_bottom'
        }}
      >
       
        <Stack.Screen name="tabs" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="signup" options={{ animation: 'fade' }} />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="new-chat" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="new-group" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="new-group-details" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="chat/stories/create" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="chat/stories/[userId]" options={{ animation: 'fade' }} />
      </Stack>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <IntroProvider>
      <OnboardingProvider>
        <RootLayoutContent />
      </OnboardingProvider>
    </IntroProvider>
  );
}



