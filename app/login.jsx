/**
 * Login Screen – E-Mail/Passwort, Google OAuth, Apple (nativ iOS)
 *
 * Google OAuth: signInWithOAuth → WebBrowser → setSession → fetchProfileWithToken → Redirect
 * Apple (iOS): expo-apple-authentication → signInWithIdToken → fetchProfileWithToken → Redirect
 */
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Platform } from "react-native";
import { useState } from "react";
import { useRouter, Redirect } from 'expo-router';
import { supabase } from "../lib/supabase";
import { useOAuthHandlers } from "./hooks/useOAuthHandlers";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthErrorBanner from "../components/auth/AuthErrorBanner";
import AuthSubmitButton from "../components/auth/AuthSubmitButton";
import AuthEmailInput from "../components/auth/AuthEmailInput";
import AuthPasswordInput from "../components/auth/AuthPasswordInput";
import { theme } from "../constants/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const router = useRouter();

  // OAuth-Logik zentral im Hook (Google + Apple)
  const {
    signInWithGoogle,
    signInWithApple,
    oauthProcessing,
    oauthRedirectTo,
    appleAuthAvailable,
  } = useOAuthHandlers({ setErrorMsg, mode: 'login', router });

  // Deklarativer Redirect nach OAuth
  if (oauthRedirectTo) {
    return <Redirect href={oauthRedirectTo} />;
  }

  // OAuth-Overlay: Login-Form verstecken, bis Weiterleitung – verhindert kurzes Aufblitzen des Login-Screens
  if (oauthProcessing) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text className="mt-4 text-gray-700 text-base">Anmeldung wird verarbeitet...</Text>
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
          <View className="mb-8 items-center justify-center">
            <Text className="text-3xl font-bold text-black mb-2 text-center">
              Willkommen zurück
            </Text>
            <Text className="text-base text-gray-500 text-center">
              Schön, dich wiederzusehen
            </Text>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
            <Pressable
              onPress={() => setActiveTab("signin")}
              className={`flex-1 py-3 rounded-lg ${activeTab === "signin" ? "bg-white" : ""}`}
            >
              <Text className={`text-center font-semibold ${activeTab === "signin" ? "text-black" : "text-gray-500"}`}>
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
          <AuthEmailInput email={email} setEmail={setEmail} emailValid={emailValid} submitted={submitted} />

          {/* Password Input */}
          <AuthPasswordInput password={password} setPassword={setPassword} passwordValid={passwordValid} submitted={submitted} showPassword={showPassword} setShowPassword={setShowPassword} />

          {/* Error Message */}
          <AuthErrorBanner message={errorMsg} className="mb-4" />

          {/* Continue Button */}
          <AuthSubmitButton title="Anmelden" onPress={handleSubmit} disabled={loading} loading={loading} />

          {/* Or Continue With */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-4 text-gray-500 text-sm">Oder weiter mit</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Social Login Buttons */}
          <View className="flex-row justify-center gap-12 mb-8">
            {/* Google */}
            <TouchableOpacity
              onPress={signInWithGoogle}
              className="w-14 h-14 rounded-full bg-white border border-gray-200 items-center justify-center"
            >
              <Image source={require("../assets/google.png")} className="w-6 h-6" />
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

          {/* Bottom Spacer */}
          <View className="mt-auto" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
