/**
 * Login Screen – E-Mail/Passwort, Google OAuth, Apple (nativ iOS)
 *
 * Google OAuth: signInWithOAuth → WebBrowser → setSession → fetchProfileWithToken → Redirect
 * Apple (iOS): expo-apple-authentication → signInWithIdToken → fetchProfileWithToken → Redirect
 */
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, Redirect } from 'expo-router';
import { supabase, fetchProfileWithToken } from "../lib/supabase";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { theme } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { EnvelopeIcon } from "react-native-heroicons/outline";
import { EyeIcon, EyeSlashIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";

// WICHTIG: Dies erlaubt dem Browser, die Auth-Session abzuschließen
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [oauthRedirectTo, setOauthRedirectTo] = useState(null);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const router = useRouter();

  // Apple Sign-In Verfügbarkeit prüfen (nur iOS)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  // Deklarativer Redirect nach OAuth - läuft im Render-Zyklus, zuverlässiger als router.replace
  if (oauthRedirectTo) {
    return <Redirect href={oauthRedirectTo} />;
  }

  // OAuth-Overlay: Login-Form verstecken, bis Weiterleitung – verhindert kurzes Aufblitzen des Login-Screens
  if (oauthProcessing) {
    return (
      <View style={styles.oauthOverlay}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={styles.oauthOverlayText}>Anmeldung wird verarbeitet...</Text>
      </View>
    );
  }

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = password.length >= 6;

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg("");
    console.log('[LOGIN] Starting login...', { emailValid, passwordValid });

    if (emailValid && passwordValid) {
      setSubmitted(true);
      console.log('[LOGIN] Credentials valid, calling Supabase...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      setSubmitted(false);

      if (error) {
        console.error('[LOGIN] Error:', error);
        setLoading(false);

        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Falsche E-Mail oder Passwort.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMsg('Bitte bestätige zuerst deine E-Mail-Adresse.');
        } else {
          setErrorMsg('Anmeldung fehlgeschlagen.');
        }
        return;
      }

      // Erfolgreicher Login
      console.log('[LOGIN] Login successful, session:', data.session?.user?.email);
      setLoading(false);

      // Navigation wird durch _layout.tsx Auth-Listener gehandhabt
      console.log('[LOGIN] Waiting for auth state change handler...');
    } else {
      setLoading(false);
      setSubmitted(true);
    }
  };

  const handleRegistration = () => {
    router.push("signup");
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      console.log("[AUTH] Apple Sign-In initiated");
      setErrorMsg("");
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
        setErrorMsg('Apple-Anmeldung fehlgeschlagen');
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        setOauthProcessing(false);
        setErrorMsg('Apple-Anmeldung fehlgeschlagen: ' + error.message);
        return;
      }

      // Full Name nur beim ersten Login – in User-Metadaten speichern
      if (credential.fullName) {
        const fullName = [
          credential.fullName.givenName,
          credential.fullName.familyName,
        ].filter(Boolean).join(' ');
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: credential.fullName.givenName,
            family_name: credential.fullName.familyName,
          },
        });
      }

      // Profil prüfen und weiterleiten (analog zu Google)
      const uid = data.session?.user?.id;
      const accessToken = data.session?.access_token;
      const profile = accessToken
        ? await fetchProfileWithToken(accessToken, uid)
        : (await supabase.from('profiles').select('onboarding_completed').eq('id', uid).maybeSingle()).data;
      const target = profile?.onboarding_completed ? '/tabs' : '/onboarding';
      setOauthRedirectTo(target);
    } catch (err) {
      setOauthProcessing(false);
      if (err.code === 'ERR_REQUEST_CANCELED') {
        setErrorMsg('Apple-Anmeldung abgebrochen');
      } else {
        setErrorMsg('Ein unerwarteter Fehler: ' + (err.message || err));
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("[AUTH] Google Sign-In initiated");
      setErrorMsg("");

      const redirectUri = makeRedirectUri({
        scheme: 'N8LY',
        path: 'auth/callback'
      });

      console.log("[AUTH] Redirect URI:", redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error("[AUTH] Google Sign-In Error:", error.message);
        setErrorMsg('Google-Anmeldung fehlgeschlagen: ' + error.message);
        return;
      }

      if (!data?.url) {
        console.error("[AUTH] No OAuth URL received");
        setErrorMsg('OAuth-URL konnte nicht erstellt werden');
        return;
      }

      console.log("[AUTH] Opening OAuth URL:", data.url);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
        {
          showInRecents: true,
        }
      );

      console.log("[AUTH] Browser result:", JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.url) {
        console.log("[AUTH] OAuth successful, URL:", result.url);
        setOauthProcessing(true); // Sofort Overlay – Login-Screen nicht mehr sichtbar

        const url = new URL(result.url);
        // Supabase OAuth returns tokens in the hash fragment (#), not query params (?)
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
            console.error("[AUTH] Session Error:", sessionError);
            setOauthProcessing(false);
            setErrorMsg('Fehler beim Setzen der Session');
          } else {
            // Google OAuth: Profil mit access_token direkt abfragen (siehe fetchProfileWithToken)
            const uid = sessionData?.session?.user?.id;
            const accessToken = sessionData?.session?.access_token;
            const profile = accessToken
              ? await fetchProfileWithToken(accessToken, uid)
              : (await supabase.from('profiles').select('onboarding_completed').eq('id', uid).maybeSingle()).data;
            const target = profile?.onboarding_completed ? '/tabs' : '/onboarding';
            setOauthRedirectTo(target);
          }
        } else {
          console.error("[AUTH] No tokens in redirect URL");
          setOauthProcessing(false);
          setErrorMsg('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
        }
      } else if (result.type === 'cancel') {
        console.log("[AUTH] User cancelled");
        setErrorMsg('Google-Anmeldung abgebrochen');
      } else if (result.type === 'dismiss' || result.type === 'locked') {
        console.log("[AUTH] Browser dismissed or locked");
        setErrorMsg('Browser wurde geschlossen');
      }
    } catch (err) {
      console.error("[AUTH] Google Sign-In Exception:", err);
      setOauthProcessing(false);
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten: ' + (err.message || err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-1 px-6 pt-8">
          {/* Logo */}
          <View className="items-center mb-12">
            <Image 
              source={require("../assets/N8LY9.png")} 
              className="w-32 h-32"  // Bigger logo
              resizeMode="contain"
            />
          </View>

          {/* Welcome Text */}
          <View className="mb-8 items-center justify-center" style={{ alignItems: 'center' }}>
            <Text className="text-3xl font-bold text-black mb-2" style={{ textAlign: 'center', fontFamily: 'Manrope_700Bold' }}>
              Willkommen zurück
            </Text>
            <Text className="text-base text-gray-500" style={{ textAlign: 'center', fontFamily: 'Manrope_400Regular' }}>
              Schön, dich wiederzusehen
            </Text>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
            <Pressable
              onPress={() => setActiveTab("signin")}
              className={`flex-1 py-3 rounded-lg ${activeTab === "signin" ? "bg-white" : ""}`}
            >
              <Text className={`text-center font-semibold ${activeTab === "signin" ? "text-black" : "text-gray-500"}`} style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Anmelden
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/signup")}
              className={`flex-1 py-3 rounded-lg ${activeTab === "signup" ? "bg-white" : ""}`}
            >
              <Text className={`text-center font-semibold ${activeTab === "signup" ? "text-black" : "text-gray-500"}`}>
                Registrieren
              </Text>
            </Pressable>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-white" style={{ height: 56 }}>
              <EnvelopeIcon size={20} color={theme.colors.neutral.gray[500]} />
              <TextInput
                className="flex-1 ml-3 text-base text-black"
                placeholder="E-Mail Adresse"
                placeholderTextColor={theme.colors.neutral.gray[400]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ height: 56, textAlignVertical: 'center' }}
              />
              {emailValid && email.length > 0 && (
                <CheckIcon size={20} color={theme.colors.success} />
              )}
            </View>
            {submitted && !emailValid && (
              <Text className="text-red-500 text-sm mt-1 ml-1" style={{}}>
                Bitte gebe eine gültige Email ein.
              </Text>
            )}
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-white" style={{ height: 56 }}>
              <TextInput
                className="flex-1 text-base text-black"
                placeholder="Passwort"
                placeholderTextColor={theme.colors.neutral.gray[400]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={{ height: 56, textAlignVertical: 'center' }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                {showPassword ? (
                  <EyeSlashIcon size={20} color={theme.colors.neutral.gray[500]} />
                ) : (
                  <EyeIcon size={20} color={theme.colors.neutral.gray[500]} />
                )}
              </TouchableOpacity>
            </View>
            {submitted && !passwordValid && (
              <Text className="text-red-500 text-sm mt-1 ml-1" style={{ fontFamily: 'Manrope_400Regular' }}>
                Passwort muss mindestens 6 Zeichen lang sein.
              </Text>
            )}
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
              <Text className="text-red-600 text-sm" style={{ fontFamily: 'Manrope_400Regular' }}>{errorMsg}</Text>
            </View>
          )}

          {/* Continue Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className={`py-4 rounded-xl mb-6 ${loading ? "opacity-50" : ""}`}
            style={{ backgroundColor: theme.colors.primary.main }}
          >
            {loading ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white font-semibold text-center ml-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                  Wird geladen...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-center text-base" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Weiter
              </Text>
            )}
          </Pressable>

          {/* Or Continue With */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-4 text-gray-500 text-sm" style={{ fontFamily: 'Manrope_400Regular' }}>Oder weiter mit</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Social Login Buttons */}
          <View className="flex-row justify-center gap-12 mb-8">
            {/* Google */}
            <TouchableOpacity
              onPress={signInWithGoogle}
              className="w-14 h-14 rounded-full bg-white border border-gray-200 items-center justify-center"
            >
              <Image source={require("../assets/3d_icon_google.png")} className="w-20 h-20" resizeMode="contain" />
            </TouchableOpacity>

            {/* Apple (nur iOS, nativer Flow) */}
            {Platform.OS === 'ios' && appleAuthAvailable && (
              <TouchableOpacity
                onPress={signInWithApple}
                className="w-14 h-14 rounded-full bg-black items-center justify-center"
              >
                <Image source={require("../assets/appleLogoWhite.png")} className="w-6 h-6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Text */}
          <View className="mt-auto">
            <Text className="text-gray-500 text-sm leading-5" style={{}}>
              
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  oauthOverlay: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oauthOverlayText: {
    marginTop: 16,
    color: theme.colors.neutral.gray[700],
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
  },
});
