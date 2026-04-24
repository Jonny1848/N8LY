/**
 * AuthErrorBanner – Wiederverwendbare Fehlermeldung fuer Login/Signup
 *
 * Zeigt eine rote Fehlermeldung in einem dezenten Container an.
 * Wird nur gerendert, wenn message nicht leer ist.
 *
 * Props:
 *  - message: string – Die anzuzeigende Fehlermeldung (leer = nichts anzeigen)
 *  - className: string (optional) – Zusaetzliche Tailwind-Klassen (z.B. mb-4, mb-3)
 */
import { View, Text } from 'react-native';

export default function AuthErrorBanner({ message, className = 'mb-4' }) {
  if (!message) return null;

  return (
    <View className={`p-3 bg-red-50 rounded-xl border border-red-200 ${className}`}>
      <Text className="text-sm text-red-600 font-normal">{message}</Text>
    </View>
  );
}
