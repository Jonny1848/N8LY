import { View, Text, TextInput } from 'react-native';
import { EnvelopeIcon } from 'react-native-heroicons/outline';
import { CheckIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';

export default function AuthEmailInput({ email, setEmail, emailValid, submitted }) {
    return (
        <View className="mb-3">
        <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-4 min-h-14 bg-white">
          <EnvelopeIcon size={20} color={theme.colors.neutral.gray[500]} />
          <TextInput
            className="flex-1 ml-3 text-base text-black py-0"
            placeholder="E-Mail Adresse"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailValid && email.length > 0 && (
            <CheckIcon size={20} color={theme.colors.success} />
          )}
        </View>
        {submitted && !emailValid && (
          <Text className="text-red-500 text-sm mt-1 ml-1">
            Bitte gebe eine gültige Email ein.
          </Text>
        )}
      </View>
    );
}