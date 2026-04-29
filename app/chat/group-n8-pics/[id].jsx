/**
 * N8-Pics (USP) — eigene Seite zur Gruppe, getrennt von der reinen Mediengalerie.
 *
 * Placeholder bis das Produktkonzept eingebaut wird. Route: /chat/group-n8-pics/[id]
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { PhotoIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

export default function GroupN8PicsScreen() {
  const router = useRouter();
  const rawId = useLocalSearchParams().id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  // key auf Root: bei Wechsel der Konversation neu montieren (spaeter USP-Daten)
  return (
    <View style={styles.container} key={conversationId ?? 'none'}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
          >
            <ChevronLeftIcon size={22} color={theme.colors.neutral.gray[800]} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.navTitle}>N8-Pics</Text>
          <View style={styles.navRight} />
        </View>

        <View style={styles.center}>
          <PhotoIcon size={56} color={theme.colors.primary.main} />
          <Text style={styles.headline}>Hier wird euer USP Platz finden.</Text>
          <Text style={styles.sub}>
            Gemeinsames Gruppenerlebnis rund um Fotos — getrennt von der normalen Mediengalerie.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    width: 44,
  },
  navTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 17,
    color: theme.colors.neutral.gray[900],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headline: {
    marginTop: 24,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 18,
    color: theme.colors.neutral.gray[900],
    textAlign: 'center',
  },
  sub: {
    marginTop: 12,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.neutral.gray[500],
    textAlign: 'center',
  },
});
