import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ExclamationCircleIcon } from 'react-native-heroicons/solid';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useUserStore } from '../store/userStore';


export default function Complete() {
  const router = useRouter();
  const { profileData, resetProfileData } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect (() => {
    console.log('partyPreferences →', profileData.partyPreferences);
  })

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Aktuellen User holen
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Kein User gefunden');
      }

      // Avatar hochladen falls vorhanden
      let avatarUrl = null;
      if (profileData.avatarUri) {
        try {
          const fileName = `${user.id}_${Date.now()}.jpg`;
          const response = await fetch(profileData.avatarUri);
          const blob = await response.blob();
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          
          avatarUrl = publicUrl;
        } catch (uploadError) {
          console.error('Avatar Upload Fehler:', uploadError);
          // Weiter ohne Avatar
        }
      }

      // Profil in Datenbank erstellen/updaten
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: profileData.username,
          age: parseInt(profileData.age),
          is_public: profileData.isPublic,
          favorite_city: profileData.favoriteCity,
          location_enabled: profileData.locationEnabled,
          avatar_url: avatarUrl,
          music_genres: profileData.musicGenres,
          party_preferences: profileData.partyPreferences,
          bio: profileData.bio,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Reset context und navigiere zu Home
      resetProfileData();
      router.replace('/tabs');
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten');
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 120, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Titel */}
        <Text 
          className="text-4xl font-bold text-center mb-3"
          style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}
        >
          Fast geschafft!
        </Text>
        
        <Text 
          className="text-lg text-center mb-10"
          style={{ 
            color: theme.colors.neutral.gray[600], 
            fontFamily: 'Manrope_400Regular',
            lineHeight: 24 
          }}
        >
          Dein N8LY-Profil ist bereit.
        </Text>

        {/* Zusammenfassung Card */}
        <View 
          className="bg-white rounded-2xl p-6 mb-6"
          style={styles.summaryCard}
        >
          <Text 
            className="text-xl font-bold mb-5"
            style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}
          >
            Dein Profil im Überblick
          </Text>
          
          <View 
            className="flex-row justify-between items-center py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.neutral.gray[100] }}
          >
            <Text 
              className="text-base"
              style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_500Medium' }}
            >
              Benutzername
            </Text>
            <Text 
              className="text-base font-semibold flex-1 text-right ml-4"
              style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_600SemiBold' }}
            >
              @{profileData.username}
            </Text>
          </View>
          
          <View 
            className="flex-row justify-between items-center py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.neutral.gray[100] }}
          >
            <Text 
              className="text-base"
              style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_500Medium' }}
            >
              Alter
            </Text>
            <Text 
              className="text-base font-semibold flex-1 text-right ml-4"
              style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_600SemiBold' }}
            >
              {profileData.age} Jahre
            </Text>
          </View>
          
          <View 
            className="flex-row justify-between items-center py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.neutral.gray[100] }}
          >
            <Text 
              className="text-base"
              style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_500Medium' }}
            >
              Stadt
            </Text>
            <Text 
              className="text-base font-semibold flex-1 text-right ml-4"
              style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_600SemiBold' }}
            >
              {profileData.favoriteCity}
            </Text>
          </View>
          
          <View 
            className="flex-row justify-between items-center py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.neutral.gray[100] }}
          >
            <Text 
              className="text-base"
              style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_500Medium' }}
            >
              Musikgenres
            </Text>
            <Text 
              className="text-base font-semibold flex-1 text-right ml-4"
              style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_600SemiBold' }}
            >
              {profileData.musicGenres.slice(0, 3).join(', ')}
            </Text>
          </View>
          
          <View 
            className="flex-row justify-between items-center py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.neutral.gray[100] }}
          >
            <Text 
              className="text-base"
              style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_500Medium' }}
            >
              Party-Typen
            </Text>
            <Text 
              className="text-base font-semibold flex-1 text-right ml-4"
              style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_600SemiBold' }}
            >
              {profileData.partyPreferences.slice(0, 3).join(', ')}
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View 
            className="flex-row items-center rounded-xl p-4 mb-6"
            style={{ backgroundColor: theme.colors.error + '15' }}
          >
            <ExclamationCircleIcon size={20} color={theme.colors.error} />
            <Text 
              className="flex-1 text-sm ml-3"
              style={{ color: theme.colors.error, fontFamily: 'Manrope_500Medium' }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Complete Button */}
        <View className="mt-2">
          <Pressable
            onPress={handleComplete}
            disabled={loading}
            className="mb-4"
          >
            <LinearGradient
              colors={loading 
                ? [theme.colors.neutral.gray[400], theme.colors.neutral.gray[400]]
                : [theme.colors.primary.main, theme.colors.primary.main2]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text 
                    className="text-lg font-bold text-white ml-3"
                    style={{ fontFamily: 'Manrope_700Bold' }}
                  >
                    Profil wird erstellt...
                  </Text>
                </View>
              ) : (
                <Text 
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: 'Manrope_700Bold' }}
                >
                  Profil vervollständigen 🚀
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            disabled={loading}
            className="items-center py-4"
          >
            <Text 
              className="text-base font-semibold"
              style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_600SemiBold' }}
            >
              Zurück zum Bearbeiten
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.neutral.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
