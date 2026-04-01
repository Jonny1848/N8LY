/**
 * Eigene Story erstellen – Bild aus Galerie, Upload in stories-Bucket, Eintrag in DB.
 */
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../constants/theme';
import useAuthStore from '../../stores/useAuthStore';
import { uploadStoryMedia } from '../../services/storageService';
import { createStory } from '../../services/storyService';

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    if (!userId || uploading) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Fotos', 'Bitte erlaube Zugriff auf die Galerie.', [{ text: 'OK' }]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploading(true);
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const publicUrl = await uploadStoryMedia(userId, asset.uri, mime);
      await createStory(userId, publicUrl, 'image', null);
      router.back();
    } catch (e) {
      console.error('[STORY CREATE]', e);
      Alert.alert('Story', 'Die Story konnte nicht erstellt werden.', [{ text: 'OK' }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-1"
          accessibilityRole="button"
          accessibilityLabel="Zurueck"
        >
          <ChevronLeftIcon size={26} color={theme.colors.neutral.gray[800]} />
        </Pressable>
        <Text
          className="flex-1 text-center text-lg text-gray-900 -mr-9"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          Story erstellen
        </Text>
      </View>

      <View className="flex-1 px-6 justify-center items-center">
        <Text
          className="text-center text-gray-600 mb-8"
          style={{ fontFamily: 'Manrope_400Regular' }}
        >
          Waehle ein Bild aus deiner Galerie. Es ist 24 Stunden fuer deine Freunde sichtbar.
        </Text>
        <Pressable
          onPress={pickAndUpload}
          disabled={uploading}
          className="rounded-xl py-4 px-10"
          style={{ backgroundColor: theme.colors.primary.main }}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
              Bild auswaehlen
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
