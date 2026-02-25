import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import ProgressBar from '../../components/ProgressBar';
import { useUserStore } from '../store/userStore';

// Verfügbare Musikgenres mit Icons
const MUSIC_GENRES = [
  { id: 'techno', name: 'Techno', emoji: '🎧' },
  { id: 'house', name: 'House', emoji: '🏠' },
  { id: 'hiphop', name: 'Hip-Hop', emoji: '🎤' },
  { id: 'rnb', name: 'R&B', emoji: '🎵' },
  { id: 'pop', name: 'Pop', emoji: '🎶' },
  { id: 'rock', name: 'Rock', emoji: '🎸' },
  { id: 'indie', name: 'Indie', emoji: '🎹' },
  { id: 'edm', name: 'EDM', emoji: '💥' },
  { id: 'trap', name: 'Trap', emoji: '🔥' },
  { id: 'dnb', name: 'Drum & Bass', emoji: '⚡' },
  { id: 'trance', name: 'Trance', emoji: '🌌' },
  { id: 'reggaeton', name: 'Reggaeton', emoji: '🌴' },
  { id: 'afrobeats', name: 'Afrobeats', emoji: '🌍' },
  { id: 'schlager', name: 'Schlager', emoji: '🍺' },
  { id: 'latin', name: 'Latin', emoji: '💃' },
  { id: 'jazz', name: 'Jazz', emoji: '🎺' },
];

export default function MusicGenres() {
  const router = useRouter();
  const { profileData, updateProfileData } = useUserStore();
  const [selectedGenres, setSelectedGenres] = useState(profileData.musicGenres || []);

  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre.name)
        ? prev.filter(name => name !== genre.name)
        : [...prev, genre.name]
    );
  };

  const handleNext = () => {
    if (selectedGenres.length > 0) {
      updateProfileData({ musicGenres: selectedGenres });
      router.push('/onboarding/preferences');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View className="px-6 pt-12 pb-6">
        <Pressable 
          onPress={() => router.back()} 
          className="mb-6"
          style={styles.backButton}
        >
          <ChevronLeftIcon size={28} color={theme.colors.neutral.gray[900]} />
        </Pressable>

        {/* Progress */}
        <ProgressBar currentStep={7} totalSteps={10} />

        {/* Title */}
        <Text className="text-4xl font-bold mb-3" style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}>
          Deine Musik
        </Text>
        
        <Text className="text-lg mb-6" style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_400Regular' }}>
          Welche Musikrichtungen liebst du?
        </Text>

        {selectedGenres.length > 0 && (
          <View style={styles.selectedBadge}>
            <Text className="text-sm font-semibold" style={{ color: theme.colors.primary.main }}>
              ✓ {selectedGenres.length} {selectedGenres.length === 1 ? 'Genre' : 'Genres'} ausgewählt
            </Text>
          </View>
        )}
      </View>

      {/* Genres Grid - Two Columns */}
      <ScrollView 
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {MUSIC_GENRES.map((genre) => {
            const isSelected = selectedGenres.includes(genre.name);
            return (
              <Pressable
                key={genre.id}
                onPress={() => toggleGenre(genre)}
                style={[
                  styles.genreChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary.main2 : '#fff',
                    borderColor: isSelected ? theme.colors.primary.main : '#e5e7eb',
                  }
                ]}
              >
                <Text className="text-lg mr-2">{genre.emoji}</Text>
                <Text
                  className="font-medium"
                  style={{
                    color: isSelected ? '#fff' : theme.colors.neutral.gray[700],
                    fontSize: 15,
                    fontFamily: 'Manrope_500Medium',
                  }}
                >
                  {genre.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Round Continue Button - Bottom Right */}
      {selectedGenres.length >= 1 && (
        <View style={styles.buttonContainerFixed}>
          <Pressable onPress={handleNext}>
            <LinearGradient
              colors={[theme.colors.primary.main, theme.colors.primary.main2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roundButton}
            >
              <ArrowRightIcon size={28} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  selectedBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 120,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 12,
    width: '48%',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonContainerFixed: {
    position: 'absolute',
    bottom: 50,
    right: 30,
  },
  roundButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
