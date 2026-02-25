import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import ProgressBar from '../../components/ProgressBar';
import { useUserStore } from '../store/userStore';

export default function Username() {
  const router = useRouter();
  const { profileData, updateProfileData } = useUserStore();
  const [username, setUsername] = useState(profileData.username || '');
  const [error, setError] = useState('');

  const validateUsername = (text) => {
    setUsername(text);
    setError('');
    
    if (text.length > 0) {
      if (text.length < 3) {
        setError('Mindestens 3 Zeichen');
      } else if (text.length > 20) {
        setError('Maximal 20 Zeichen');
      } else if (!/^[a-zA-Z0-9_]+$/.test(text)) {
        setError('Nur Buchstaben, Zahlen und _');
      }
    }
  };

  const handleNext = () => {
    if (username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username)) {
      updateProfileData({ username });
      router.push('/onboarding/age');
    }
  };

  const isValid = username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);

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
        <ProgressBar currentStep={1} totalSteps={10} />

        {/* Title */}
        <Text className="text-4xl font-bold mb-3" style={{ color: theme.colors.neutral.gray[900], fontFamily: 'Manrope_700Bold' }}>
          Dein Username
        </Text>
        
        <Text className="text-lg mb-8" style={{ color: theme.colors.neutral.gray[600], fontFamily: 'Manrope_400Regular' }}>
          Wähle einen coolen Benutzernamen, unter dem dich andere finden können.
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 items-center" style={{ marginTop: 60 }}>
        {/* Username Input - Large @ style */}
        <View className="flex-row items-center">
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            value={username}
            onChangeText={validateUsername}
            placeholder="username"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={handleNext}
            style={styles.usernameInput}
            autoFocus={true}
          />
        </View>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}
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
  atSymbol: {
    fontSize: 48,
    color: theme.colors.neutral.gray[900],
    fontFamily: 'Manrope_700Bold',
  },
  usernameInput: {
    fontSize: 48,
    color: theme.colors.neutral.gray[900],
    fontFamily: 'Manrope_700Bold',
    paddingVertical: 0,
    marginLeft: 4,
    minWidth: 200,
    textAlign: 'left',
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    fontFamily: 'Manrope_400Regular',
    marginTop: 16,
    textAlign: 'center',
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
