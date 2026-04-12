/**
 * useOAuthHandlers – Wiederverwendbarer Hook fuer Google- und Apple-OAuth
 *
 * Kapselt die komplette OAuth-Logik (signInWithGoogle, signInWithApple),
 * damit Login und Signup nicht dupliziert werden.
 *
 * Unterschiede Login vs. Signup:
 *  - Login: Bestehender User wird immer eingeloggt, Redirect nach Profil.
 *  - Signup: Wenn User bereits existiert (> 10s alt) → SignOut + Alert + Redirect zu Login.
 *
 * @param {Object} options
 * @param {Function} options.setErrorMsg - Callback für Fehlermeldungen (z.B. aus useState)
 * @param {'login'|'signup'} options.mode - 'login' = Login-Flow, 'signup' = Registrier-Flow
 * @param {Object} options.router - Router von useRouter() (für Redirect bei Signup)
 */
import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase, fetchProfileWithToken } from '../../lib/supabase';

// WICHTIG: Ermoeglicht dem Browser, die Auth-Session abzuschliessen
WebBrowser.maybeCompleteAuthSession();

export function useOAuthHandlers({ setErrorMsg, mode, router }) {
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [oauthRedirectTo, setOauthRedirectTo] = useState(null);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Apple Sign-In Verfuegbarkeit pruefen (nur iOS)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  /**
   * Hilfsfunktion: Nach OAuth-Erfolg Profil laden und Ziel-Route bestimmen.
   * Login: Immer /tabs oder /onboarding.
   * Signup: Wenn User existiert → Alert + Redirect zu Login.
   */
  const handleOAuthSuccess = async (session, credential = null) => {
    const uid = session?.user?.id;
    const accessToken = session?.access_token;

    // Signup: Pruefen ob User bereits existiert (neu erstellt = < 10 Sekunden)
    if (mode === 'signup') {
      const userCreatedAt = new Date(session.user.created_at);
      const ageInSeconds = (Date.now() - userCreatedAt.getTime()) / 1000;

      if (ageInSeconds > 10) {
        // User existiert bereits – Registrierung abbrechen
        await supabase.auth.signOut();
        setOauthProcessing(false);
        Alert.alert(
          'Account existiert bereits',
          'Dieser Account existiert bereits. Du wirst zum Login weitergeleitet.',
          [{ text: 'OK', onPress: () => router?.replace('/login') }]
        );
        return;
      }
    }

    // Full Name in User-Metadaten speichern (falls vorhanden, v.a. bei Apple)
    if (credential?.fullName) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ');
      if (fullName) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: credential.fullName.givenName,
            family_name: credential.fullName.familyName,
          },
        });
      }
    }

    // Profil laden und Ziel-Route bestimmen
    const profile = accessToken
      ? await fetchProfileWithToken(accessToken, uid)
      : (await supabase.from('profiles').select('onboarding_completed').eq('id', uid).maybeSingle()).data;

    const target = profile?.onboarding_completed ? '/tabs' : '/onboarding';
    setOauthRedirectTo(target);
  };

  /**
   * Google OAuth – WebBrowser oeffnet sich, Redirect-URL enthaelt Tokens.
   */
  const signInWithGoogle = async () => {
    try {
      setErrorMsg?.('');

      const redirectUri = makeRedirectUri({
        scheme: 'n8tly',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMsg?.('Google-Anmeldung fehlgeschlagen: ' + error.message);
        return;
      }

      if (!data?.url) {
        setErrorMsg?.('OAuth-URL konnte nicht erstellt werden');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        showInRecents: true,
      });

      if (result.type === 'success' && result.url) {
        setOauthProcessing(true);

        const url = new URL(result.url);
        const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : null;
        const getParam = (name) => hashParams?.get(name) ?? url.searchParams.get(name);
        const access_token = getParam('access_token');
        const refresh_token = getParam('refresh_token');

        if (access_token && refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            setOauthProcessing(false);
            setErrorMsg?.('Fehler beim Setzen der Session');
          } else {
            await handleOAuthSuccess(sessionData?.session);
          }
        } else {
          setOauthProcessing(false);
          setErrorMsg?.('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
        }
      } else if (result.type === 'cancel') {
        setErrorMsg?.('Google-Anmeldung abgebrochen');
      } else if (result.type === 'dismiss' || result.type === 'locked') {
        setErrorMsg?.('Browser wurde geschlossen');
      }
    } catch (err) {
      setOauthProcessing(false);
      setErrorMsg?.('Ein unerwarteter Fehler ist aufgetreten: ' + (err.message || err));
    }
  };

  /**
   * Apple OAuth – native iOS-Dialog (nur auf iOS verfuegbar).
   */
  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      setErrorMsg?.('');
      setOauthProcessing(true);

      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        setOauthProcessing(false);
        setErrorMsg?.('Apple-Anmeldung fehlgeschlagen');
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        setOauthProcessing(false);
        setErrorMsg?.('Apple-Anmeldung fehlgeschlagen: ' + error.message);
        return;
      }

      await handleOAuthSuccess(data.session, credential);
    } catch (err) {
      setOauthProcessing(false);
      if (err.code === 'ERR_REQUEST_CANCELED') {
        setErrorMsg?.('Apple-Anmeldung abgebrochen');
      } else {
        setErrorMsg?.('Ein unerwarteter Fehler: ' + (err.message || err));
      }
    }
  };

  return {
    signInWithGoogle,
    signInWithApple,
    oauthProcessing,
    oauthRedirectTo,
    appleAuthAvailable,
  };
}
