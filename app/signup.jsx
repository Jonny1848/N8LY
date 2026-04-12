import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from "react-native";
import { useState } from "react";
import { useRouter, Redirect } from 'expo-router';
import { supabase } from "../lib/supabase";
import { useOAuthHandlers } from "./hooks/useOAuthHandlers";
import { theme } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { EyeIcon, EyeSlashIcon } from "react-native-heroicons/outline";
import AuthErrorBanner from "../components/auth/AuthErrorBanner";
import AuthSubmitButton from "../components/auth/AuthSubmitButton";
import AuthEmailInput from "../components/auth/AuthEmailInput";
import AuthPasswordInput from "../components/auth/AuthPasswordInput";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signup");
  const router = useRouter();

  // OAuth-Logik zentral im Hook (Google + Apple)
  const {
    signInWithGoogle,
    signInWithApple,
    oauthProcessing,
    oauthRedirectTo,
    appleAuthAvailable,
  } = useOAuthHandlers({ setErrorMsg, mode: 'signup', router });

  // Deklarativer Redirect nach OAuth
  if (oauthRedirectTo) {
    return <Redirect href={oauthRedirectTo} />;
  }

  // OAuth-Overlay: Signup-Form verstecken, bis Weiterleitung
  if (oauthProcessing) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text className="mt-4 text-gray-600 text-base">Registrierung wird verarbeitet...</Text>
      </View>
    );
  }

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = password.length >= 6;
  const passwordMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSignUp = async () => {
    setSubmitted(true);
    setErrorMsg("");

    if (!emailValid) {
      setErrorMsg("Bitte gebe eine gültige Email ein.");
      return;
    }

    if (!passwordValid) {
      setErrorMsg("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (!passwordMatch) {
      setErrorMsg("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    console.log('[SIGNUP] Starte Registrierung für:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error('=== REGISTRIERUNGS-FEHLER ===');
      console.error('Error Message:', error.message);
      console.error('Error Status:', error.status);
      console.error('Error Code:', error.code);
      console.error('Komplettes Error-Objekt:', JSON.stringify(error, null, 2));
      console.error('===========================');

      let userMessage = error.message;
      if (error.message.includes('Database error')) {
        userMessage = 'Datenbankfehler bei der Registrierung. Bitte versuche es erneut oder kontaktiere den Support.';
      }

      setErrorMsg(userMessage);
      return;
    }

    // Erfolgreiche Registrierung
    console.log('[SIGNUP] Registrierung erfolgreich!');
    console.log('[SIGNUP] User ID:', data?.user?.id);
    console.log('[SIGNUP] Email:', data?.user?.email);

    Alert.alert('Registrierung erfolgreich! Du kannst dich jetzt anmelden.');
    router.replace('/login');
  };

  // Nonce-Generator für Apple Sign-In
  const generateNonce = async () => {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );
    return { rawNonce, hashedNonce };
  };

  const signInWithGoogle = async () => {
    try {
      console.log("[SIGNUP] Google Sign-In initiated");
      setErrorMsg("");
      const redirectUri = makeRedirectUri({ scheme: "N8LY", path: "auth/callback" });
      console.log("[SIGNUP] Redirect URI:", redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) {
        console.error("[SIGNUP] OAuth initiation error:", error);
        setErrorMsg("Google-Anmeldung fehlgeschlagen: " + error.message);
        return;
      }

      const authUrl = data?.url;
      if (!authUrl) {
        setErrorMsg("Keine Auth-URL erhalten");
        return;
      }

      console.log("[SIGNUP] Opening browser with URL:", authUrl);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      console.log("[SIGNUP] Browser result:", result);

      if (result.type !== "success" || !result.url) {
        console.log("[SIGNUP] OAuth cancelled or failed");
        return;
      }

      setOauthProcessing(true);

      const url = new URL(result.url);
      // Supabase OAuth returns tokens in the hash fragment (#), not query params (?)
      const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : null;
      const getParam = (name) => hashParams?.get(name) ?? url.searchParams.get(name);
      const accessToken = getParam('access_token');
      const refreshToken = getParam('refresh_token');

      console.log('[SIGNUP] Parsed tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });

      if (!accessToken || !refreshToken) {
        setOauthProcessing(false);
        setErrorMsg("Keine Tokens erhalten");
        console.error('[SIGNUP] No tokens in URL:', result.url);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError || !sessionData?.session) {
        setOauthProcessing(false);
        setErrorMsg("Session konnte nicht gesetzt werden");
        return;
      }

      const session = sessionData.session;
      const uid = session.user.id;

      // PRÜFUNG: Ist der User neu? (Registrierung) oder besteht bereits ein Account? (Login)
      const userCreatedAt = new Date(session.user.created_at);
      const now = new Date();
      const ageInSeconds = (now - userCreatedAt) / 1000;

      if (ageInSeconds > 10) {
        // User existiert bereits - Registrierung abbrechen
        console.log('[SIGNUP] User already exists, created at:', session.user.created_at);
        await supabase.auth.signOut();
        setOauthProcessing(false);
        Alert.alert(
          'Account existiert bereits',
          'Dieser Account existiert bereits. Du wirst zum Login weitergeleitet.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
        return;
      }

      // Neuer User - weiter zum Onboarding
      console.log('[SIGNUP] New user created:', uid);
      const profile = await fetchProfileWithToken(session.access_token, uid);
      console.log('[SIGNUP] Profile:', profile);

      const onboardingComplete = profile?.onboarding_completed === true;
      if (onboardingComplete) {
        setOauthRedirectTo('/tabs');
      } else {
        setOauthRedirectTo('/onboarding');
      }
    } catch (err) {
      console.error("[SIGNUP] Google Sign-In error:", err);
      setOauthProcessing(false);
      setErrorMsg("Ein Fehler ist aufgetreten: " + err.message);
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      console.log("[SIGNUP] Apple Sign-In initiated");
      setErrorMsg("");
      setOauthProcessing(true);

      const { rawNonce, hashedNonce } = await generateNonce();

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

      const session = data.session;
      const uid = session.user.id;

      // PRÜFUNG: Ist der User neu? (Registrierung) oder besteht bereits ein Account? (Login)
      const userCreatedAt = new Date(session.user.created_at);
      const now = new Date();
      const ageInSeconds = (now - userCreatedAt) / 1000;

      if (ageInSeconds > 10) {
        // User existiert bereits - Registrierung abbrechen
        console.log('[SIGNUP] User already exists, created at:', session.user.created_at);
        await supabase.auth.signOut();
        setOauthProcessing(false);
        Alert.alert(
          'Account existiert bereits',
          'Dieser Account existiert bereits. Du wirst zum Login weitergeleitet.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
        return;
      }

      // Neuer User - fullName speichern (falls vorhanden)
      if (credential.fullName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        if (fullName) {
          await supabase.auth.updateUser({
            data: { full_name: fullName }
          });
        }
      }

      console.log('[SIGNUP] New user created:', uid);
      const profile = await fetchProfileWithToken(session.access_token, uid);
      console.log('[SIGNUP] Profile:', profile);

      const onboardingComplete = profile?.onboarding_completed === true;
      if (onboardingComplete) {
        setOauthRedirectTo('/tabs');
      } else {
        setOauthRedirectTo('/onboarding');
      }
    } catch (err) {
      console.error("[SIGNUP] Apple Sign-In error:", err);
      setOauthProcessing(false);
      if (err.code === 'ERR_REQUEST_CANCELED') {
        console.log('[SIGNUP] User cancelled Apple Sign-In');
      } else {
        setErrorMsg("Ein Fehler ist aufgetreten: " + err.message);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="flex-1 px-6 pt-6">
          {/* Logo */}
          <View className="items-center mb-8">
            <Image 
              source={require("../assets/N8LY9.png")} 
              className="w-32 h-32"
              resizeMode="contain"
            />
          </View>

          {/* Welcome Text */}
          <View className="mb-6 items-center justify-center">
            <Text className="text-3xl font-bold text-black mb-2 text-center">
              Konto erstellen
            </Text>
            <Text className="text-base text-gray-500 text-center">
              Erstelle dein Konto und leg los
            </Text>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-5">
            <Pressable
              onPress={() => router.replace("/login")}
              className={`flex-1 py-3 rounded-lg ${activeTab === "signin" ? "bg-white" : ""}`}
            >
              <Text className={`text-center font-semibold ${activeTab === "signin" ? "text-black" : "text-gray-500"}`}>
                Anmelden
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("signup")}
              className={`flex-1 py-3 rounded-lg ${activeTab === "signup" ? "bg-white" : ""}`}
            >
              <Text className={`text-center font-semibold ${activeTab === "signup" ? "text-black" : "text-gray-500"}`}>
                Registrieren
              </Text>
            </Pressable>
          </View>

          {/* Email Input */}
          <AuthEmailInput email={email} setEmail={setEmail} emailValid={emailValid} submitted={submitted} />

          {/* Password Input */}
          <AuthPasswordInput password={password} setPassword={setPassword} passwordValid={passwordValid} submitted={submitted} showPassword={showPassword} setShowPassword={setShowPassword} />
          

          {/* Confirm Password Input */}
          <View className="mb-4">
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-4 min-h-14 bg-white">
              <TextInput
                className="flex-1 text-base text-black py-0"
                placeholder="Passwort bestätigen"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                {showConfirmPassword ? (
                  <EyeSlashIcon size={20} color={theme.colors.neutral.gray[500]} />
                ) : (
                  <EyeIcon size={20} color={theme.colors.neutral.gray[500]} />
                )}
              </TouchableOpacity>
            </View>
            {submitted && !passwordMatch && (
              <Text className="text-red-500 text-sm mt-1 ml-1">
                Passwörter stimmen nicht überein.
              </Text>
            )}
          </View>

          {/* Error Message */}
          <AuthErrorBanner message={errorMsg} className="mb-3" />

          
          {/* Continue Button */}
          <AuthSubmitButton title="Loslegen" onPress={handleSignUp} disabled={loading} loading={loading} />


          {/* Or Continue With */}
          <View className="flex-row items-center mb-5">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-4 text-gray-500 text-sm">Oder weiter mit</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Social Login Buttons */}
          <View className="flex-row justify-center gap-12 mb-6">
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
