import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Diese Seite ist fuer zukuenftige Features reserviert.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 30,
    color: theme.colors.neutral.gray[900],
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.neutral.gray[500],
  },
});
