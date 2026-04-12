/**
 * OAuth Callback Screen – Deep-Link N8LY://auth/callback
 *
 * Wird gemountet, wenn App per Deep-Link geöffnet wird (z.B. nach Google OAuth).
 * Linking.getInitialURL() liefert die URL mit #access_token=... & #refresh_token=...
 * → setSession() → fetchProfileWithToken() → router.replace(/tabs oder /onboarding)
 */
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, InteractionManager } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { theme } from '../../constants/theme';
import { supabase, fetchProfileWithToken } from '../../lib/supabase';

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const parseTokensFromUrl = (urlString) => {
      try {
        const url = new URL(urlString);
        const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : null;
        const getParam = (name) => hashParams?.get(name) ?? url.searchParams.get(name);
        return {
          access_token: getParam('access_token'),
          refresh_token: getParam('refresh_token'),
        };
      } catch (e) {
        console.error('[AUTH] Failed to parse URL:', e);
        return { access_token: null, refresh_token: null };
      }
    };

    const handleUrl = async (urlString) => {
      if (!urlString) return null;
      const { access_token, refresh_token } = parseTokensFromUrl(urlString);
      if (access_token && refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          console.error('[AUTH] Callback setSession error:', sessionError);
          if (mounted) setError(sessionError.message);
          return false;
        }
        // Profil mit access_token abfragen (umgeht Session-Propagation nach OAuth)
        const uid = sessionData?.session?.user?.id;
        const accessToken = sessionData?.session?.access_token;
        const profile = accessToken
          ? await fetchProfileWithToken(accessToken, uid)
          : (await supabase.from('profiles').select('onboarding_completed').eq('id', uid).maybeSingle()).data;
        const target = profile?.onboarding_completed ? '/tabs' : '/onboarding';
        if (mounted) {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
              if (mounted) {
                console.log('[AUTH] Callback: Executing redirect to', target);
                router.replace(target);
              }
            }, 150);
          });
        }
        return true;
      }
      return null;
    };

    (async () => {
      console.log('[AUTH] OAuth Callback Screen mounted');
      const url = await Linking.getInitialURL();
      const sessionSet = await handleUrl(url);

      if (sessionSet && mounted) {
        // handleUrl hat bereits router.replace(target) ausgeführt – nichts mehr tun
        return;
      }
      if (sessionSet === false && mounted) {
        router.replace('/login');
        return;
      }
      // No URL or no tokens - redirect to login after short delay
      if (mounted) {
        setTimeout(() => {
          if (mounted) {
            console.log('[AUTH] No tokens in callback, redirecting to login');
            router.replace('/login');
          }
        }, 1500);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.neutral.white,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary.main} />
      <Text
        style={{
          marginTop: 16,
          color: error ? theme.colors.error : theme.colors.neutral.gray[700],
          fontSize: 16,
          fontFamily: 'Manrope_400Regular',
        }}
      >
        {error ? error : 'Anmeldung wird verarbeitet...'}
      </Text>
    </View>
  );
}
