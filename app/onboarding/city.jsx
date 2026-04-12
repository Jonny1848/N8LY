import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, MagnifyingGlassIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import ProgressBar from '../../components/ProgressBar';
import { useUserStore } from '../store/userStore';

// Liste deutscher Städte für die Auswahl
const GERMAN_CITIES = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart',
  'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
  'Hannover', 'Nürnberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
  'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
  'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Kiel', 'Chemnitz',
  'Aachen', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Lübeck',
  'Mainz', 'Erfurt', 'Rostock', 'Kassel', 'Hagen', 'Potsdam', 'Saarbrücken',
  'Hamm', 'Ludwigshafen', 'Oldenburg', 'Leverkusen', 'Osnabrück',
  'Heidelberg', 'Darmstadt', 'Regensburg', 'Würzburg', 'Ingolstadt',
  'Ulm', 'Heilbronn', 'Pforzheim', 'Göttingen', 'Offenbach', 'Recklinghausen'
];

export default function City() {
  const router = useRouter();
  const { profileData, updateProfileData } = useUserStore();
  const [selectedCity, setSelectedCity] = useState(profileData.favoriteCity || '');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = GERMAN_CITIES.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    if (selectedCity) {
      updateProfileData({ favoriteCity: selectedCity });
      router.push('/onboarding/location');
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
        <ProgressBar currentStep={4} totalSteps={10} />

        {/* Title */}
        <Text className="text-4xl font-bold mb-3" style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}>
          Deine Stadt
        </Text>
        
        <Text className="text-lg mb-6" style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_400Regular' }}>
          In welcher Stadt feierst du am liebsten?
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MagnifyingGlassIcon size={20} color={theme.colors.neutral.gray[400]} />
          <TextInput
            placeholder="Stadt suchen..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.neutral.gray[400]}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Cities Grid */}
      <ScrollView 
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap mb-32">
          {filteredCities.map((city) => (
            <Pressable
              key={city}
              onPress={() => setSelectedCity(city)}
              style={[
                styles.cityChip,
                {
                  backgroundColor: selectedCity === city ? theme.colors.primary.main : '#fff',
                  borderColor: selectedCity === city ? theme.colors.primary.main : '#e5e7eb',
                }
              ]}
            >
              <Text
                className="font-medium"
                style={{
                  color: selectedCity === city ? '#fff' : theme.colors.neutral.gray[700],
                  fontSize: 15,
                  fontFamily: 'Manrope_500Medium',
                }}
              >
                {city}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Round Continue Button - Bottom Right */}
      {selectedCity && (
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Manrope_400Regular',
  },
  cityChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    margin: 4,
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
