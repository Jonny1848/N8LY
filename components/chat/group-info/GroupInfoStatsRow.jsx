/**
 * Zeile „Medien, Links, Doks“: links Icon + Titel, rechts Anzahl + Chevron in einer Zeile.
 * Layout wie GroupInfoDescriptionCard: innere View fuer Flex-Row (Pressable allein misst sich oft schmal).
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PhotoIcon, ChevronRightIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

const PRIMARY = theme.colors.primary.main;

export default function GroupInfoStatsRow({ mediaCount, onPress }) {
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pressableFill, pressed && { backgroundColor: theme.colors.neutral.gray[50] }]}
        accessibilityRole="button"
      >
        {/* Explizite Row-View: verhindert, dass Pressable die Kinder vertikal stapelt */}
        <View style={styles.row}>
          <View style={styles.leftCluster}>
            <PhotoIcon size={22} color="black" />
            <Text style={styles.label} numberOfLines={1}>
              Medien, Links, Doks
            </Text>
          </View>
          <View style={styles.rightCluster}>
            <Text style={styles.value}>{mediaCount}</Text>
            <View style={styles.chevronWrap}>
              <ChevronRightIcon size={22} color= {theme.colors.neutral.gray[400]} />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  /** Volle Kachelbreite — sonst schrumpft Pressable und die Row bricht um */
  pressableFill: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: 12,
  },
  label: {
    flex: 1,
    marginLeft: 12,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 16,
    color: theme.colors.neutral.gray[900],
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
  },
  chevronWrap: {
    marginLeft: 8,
  },
  value: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 15,
    color: theme.colors.neutral.gray[500],
  },
});
