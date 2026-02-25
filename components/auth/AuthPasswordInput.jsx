import { View, Text, TextInput } from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';
import { theme } from '../../constants/theme';
import { TouchableOpacity } from 'react-native';

export default function AuthPasswordInput({ password, setPassword, passwordValid, submitted, showPassword, setShowPassword }) {
    return (
        <View className="mb-3">
        <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-4 min-h-14 bg-white">
          <TextInput
            className="flex-1 text-base text-black py-0"
            placeholder="Passwort"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
            {showPassword ? (
              <EyeSlashIcon size={20} color={theme.colors.neutral.gray[500]} />
            ) : (
              <EyeIcon size={20} color={theme.colors.neutral.gray[500]} />
            )}
          </TouchableOpacity>
        </View>
        {submitted && !passwordValid && (
          <Text className="text-red-500 text-sm mt-1 ml-1">
            Passwort muss mindestens 6 Zeichen lang sein.
          </Text>
        )}
      </View>
    );
}