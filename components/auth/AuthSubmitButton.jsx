import { View, Text, Pressable, ActivityIndicator } from 'react-native';

export default function AuthSubmitButton({ title, onPress, disabled, loading }) {
    return (
        <Pressable 
            onPress={onPress} 
            disabled={disabled} 
            className={`py-4 rounded-xl mb-5 bg-brand ${disabled ? 'opacity-50' : ''}`}>
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