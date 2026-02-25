import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import ProgressBar from '../../components/ProgressBar';
import { useUserStore } from '../store/userStore';

export default function Age() {
  const router = useRouter();
  const { profileData, updateProfileData } = useUserStore();
  const [age, setAge] = useState(profileData.age || '');
  const [error, setError] = useState('');

  const validateAge = (text) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    setAge(numericText);
    setError('');
    
    if (numericText) {
      const numAge = parseInt(numericText);
      if (numAge < 16) {
        setError('Mindestalter: 16 Jahre');
      } else if (numAge > 99) {
        setError('Bitte gültiges Alter eingeben');
      }
    }
  };

  const handleNext = () => {
    const numAge = parseInt(age);
    if (numAge >= 16 && numAge <= 99) {
      updateProfileData({ age });
      router.push('/onboarding/privacy');
    }
  };

  const isValid = age && parseInt(age) >= 16 && parseInt(age) <= 99;

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
        <ProgressBar currentStep={2} totalSteps={10} />

        {/* Title */}
        <Text className="text-4xl font-bold mb-3" style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}>
          Wie alt bist du?
        </Text>
        
        <Text className="text-lg mb-8" style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_400Regular' }}>
          Dein Alter hilft uns, dir passende Events zu zeigen.
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-6">
        {/* Simple Input Box - Figma Style */}
        <View style={styles.inputBox}>
          <TextInput
            value={age}
            onChangeText={validateAge}
            placeholder="Alter"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={handleNext}
            style={styles.input}
          />
        </View>

        {/* Helper Text */}
        <Text className="text-sm mt-4" style={{ color: theme.colors.neutral.gray[500], fontFamily: 'Manrope_400Regular' }}>
          Dies dient zur Personalisierung deines Erlebnisses und wird nicht in deinem Profil sichtbar sein.
        </Text>
      </View>

      {/* Round Continue Button - Bottom Right */}
      {isValid && (
        <View style={styles.buttonContainer}>
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
  inputBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  input: {
    fontSize: 18,
    color: '#111827',
    fontFamily: 'Manrope_400Regular',
  },
  buttonContainer: {
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
