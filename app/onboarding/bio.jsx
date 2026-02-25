import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import ProgressBar from '../../components/ProgressBar';
import { useUserStore } from '../store/userStore';

export default function Bio() {
  const router = useRouter();
  const { profileData, updateProfileData } = useUserStore();
  const [bio, setBio] = useState(profileData.bio || '');

  const handleNext = () => {
    updateProfileData({ bio });
    router.push('/onboarding/complete');
  };

  const maxLength = 100;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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
        <ProgressBar currentStep={9} totalSteps={10} />

        {/* Title */}
        <Text className="text-4xl font-bold mb-3" style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}>
          Über dich
        </Text>
        
        <Text className="text-lg mb-8" style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_400Regular' }}>
          Erzähl anderen ein bisschen über dich! Was macht dich aus?
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-6">
        {/* Bio Input Card */}
        <View style={styles.bioCard}>
          <TextInput
            placeholder="z.B. Techno-Enthusiast aus Berlin. Liebe Warehouse Partys und Festival-Season! 🎧✨"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={6}
            maxLength={maxLength}
            textAlignVertical="top"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            style={styles.bioInput}
          />
        </View>

        {/* Character Counter */}
        <View className="flex-row justify-between items-center mt-3 mb-6">
          <Text className="text-sm" style={{ color: theme.colors.neutral.gray[500] }}>
            {bio.length}/{maxLength} Zeichen
          </Text>
          <Text
            className="text-sm font-semibold"
            style={{
              color: bio.length > 0 ? theme.colors.primary.main : theme.colors.neutral.gray[400]
            }}
          >
            {bio.length > 0 ? '✓ Optional' : 'Optional'}
          </Text>
        </View>
      </View>
      {/* Round Continue Button - Bottom Right */}
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
    </KeyboardAvoidingView>
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
  bioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bioInput: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
  },
  tipsBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
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
