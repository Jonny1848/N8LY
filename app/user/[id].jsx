/**
 * Platzhalter-Profil — Navigation aus Gruppeninfo; Inhalt folgt spaeter.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';

export default function UserProfilePlaceholderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <ChevronLeftIcon size={28} color={theme.colors.neutral.gray[900]} />
        </Pressable>
        <Text style={styles.title}>Profil</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.hint}>Profil-Ansicht</Text>
        {/* Platzhalter: User-ID zur Orientierung fuer Entwicklung */}
        <Text style={styles.mono} selectable>
          {id}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 17,
    color: theme.colors.neutral.gray[900],
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hint: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 16,
    color: theme.colors.neutral.gray[600],
    marginBottom: 12,
  },
  mono: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.neutral.gray[400],
  },
});
