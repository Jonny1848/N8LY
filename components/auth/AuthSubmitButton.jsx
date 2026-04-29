import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { theme } from '../../constants/theme';

/**
 * Primaer-CTA; Hintergrund per theme als Fallback, falls NativeWind `bg-brand` nicht auflöst.
 */
export default function AuthSubmitButton({ title, onPress, disabled, loading }) {
    return (
        <Pressable 
            onPress={onPress} 
            disabled={disabled} 
            style={{ backgroundColor: theme.colors.primary.main }}
            className={`py-4 rounded-xl mb-5 ${disabled ? 'opacity-50' : ''}`}>
           {loading ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white font-semibold text-center ml-2">
                  Wird geladen...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-center text-base">
                {title}
              </Text>
            )}
        </Pressable>
    );
}