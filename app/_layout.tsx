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
import { supabase, fetchProfileWithToken } from '../lib/supabase';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native'
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useGeneralStore } from './store/generalStore';

function RootLayoutContent() {
  // Load Manrope fonts
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  // Zustand Store
  const { introCompleted } = useGeneralStore();

  const router = useRouter();
  const pathname = usePathname();
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Debug: Check if fonts are loaded
  useEffect(() => {
    console.log('[FONTS] Fonts loaded:', fontsLoaded);
    if (fontError) {
      console.error('[FONTS] Font loading error:', fontError);
    }
  }, [fontsLoaded, fontError]);

  // verhindert Doppelnavigation & parallele handleAuthenticated-Läufe
  const navigatingRef = useRef<string | null>(null);
  const handlingAuthRef = useRef(false);
  const bootstrappedRef = useRef(false);

  // State-based redirect: runs in React lifecycle, works after OAuth WebBrowser returns
  useEffect(() => {
    if (!pendingRedirect || pathname === pendingRedirect) return;
    console.log('[NAV] Executing pending redirect to:', pendingRedirect);
    router.replace(pendingRedirect);
    setPendingRedirect(null);
    setTimeout(() => (navigatingRef.current = null), 100);
  }, [pendingRedirect, pathname]);

  useEffect(() => {
    // Warte bis Intro abgeschlossen ist und Fonts geladen (oder Font-Fehler aufgetreten)
    // Wenn Font-Loading fehlschlägt, sollte Auth-Bootstrap trotzdem laufen
    if (!introCompleted || (!fontsLoaded && !fontError)) {
      console.log('[AUTH] Waiting for intro or fonts...', { introCompleted, fontsLoaded, fontError });
      return;
    }

    // Warnung ausgeben, wenn Fonts fehlgeschlagen sind, aber trotzdem fortfahren
    if (fontError) {
      console.warn('[AUTH] Font loading failed, but proceeding with auth bootstrap');
    }

    let unsub = () => {};

    (async () => {
      // 1) BOOTSTRAP: aktuelle Session prüfen und DIREKT routen
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("Aktuelle Session:" + session?.user?.email);
        await handleAuthenticated(session);
      } else {
        safeReplace('/login');
      }
      bootstrappedRef.current = true;

      // 2) EVENTS: zukünftige Änderungen behandeln (ohne Doppelaufrufe)
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH] Event:', event, 'Pathname:', pathname);
        if (!bootstrappedRef.current) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) await handleAuthenticated(session, event);
        } else if (event === 'SIGNED_OUT') {
          console.log('[AUTH] SIGNED_OUT detected, navigating to login');
          navigatingRef.current = null;
          setPendingRedirect('/login');
        }
      });
      unsub = () => data?.subscription?.unsubscribe?.();
    })();

    return () => unsub();
  }, [introCompleted, fontsLoaded, fontError]);

  function safeReplace(target: string) {
    console.log('[NAV] safeReplace called:', { target, current: navigatingRef.current, pathname });
    if (navigatingRef.current === target || pathname === target) {
      console.log('[NAV] Navigation blocked - already navigating or already at target');
      return;
    }
    navigatingRef.current = target;
    // Use state to trigger redirect - ensures it runs in React lifecycle (fixes OAuth redirect)
    setPendingRedirect(target);
  }

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

      // OAuth (SIGNED_IN): fetchProfileWithToken – Supabase Client sendet JWT oft nicht mit erster Anfrage
      let profile: { onboarding_completed?: boolean } | null;
      if (event === 'SIGNED_IN' && session?.access_token) {
        profile = await fetchProfileWithToken(session.access_token, uid);
        console.log('[AUTH] Profil-Abfrage (OAuth mit Token):', profile);
      } else {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', uid)
          .maybeSingle();
        profile = data ?? null;
        console.log('[AUTH] Profil-Abfrage (Supabase Client):', { profile, profileError });
      }
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
      </Stack>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <RootLayoutContent />
  );
}



