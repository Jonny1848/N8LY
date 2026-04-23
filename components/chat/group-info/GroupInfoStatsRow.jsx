/**
 * Zeile „Medien“: links Icon + Titel, rechts Anzahl + Chevron in einer Zeile.
 * Layout wie GroupInfoDescriptionCard: innere View fuer Flex-Row (Pressable allein misst sich oft schmal).
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PhotoIcon, ChevronRightIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

export default function GroupInfoStatsRow({ mediaCount, onPress }) {
  return (
    <View style={styles.outer}>
      {/*
        Gleiche Hülle wie GroupInfoDescriptionCard: outer = seitlicher Einzug, section = weisse Kachel
        mit exakt demselben borderRadius.md (Kanten wirken identisch zu „Gruppenbeschreibung“).
      */}
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
                Medien
              </Text>
            </View>
            <View style={styles.rightCluster}>
              <Text style={styles.value}>{mediaCount}</Text>
              <View style={styles.chevronWrap}>
                <ChevronRightIcon size={22} color={theme.colors.neutral.gray[400]} />
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Wie GroupInfoDescriptionCard `outer`: gray[50] hinter Seiten und Ecken der weissen Kachel.
   * Fehlt das, ist der Screen-Bereich weiss = weiss auf weiss: Ecken wirken weder abgerundet
   * noch sichtbar „eingerückt“.
   */
  outer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  /** 1:1 mit GroupInfoDescriptionCard `section` (borderRadius, Schatten, overflow). */
  section: {
    alignSelf: 'stretch',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  /**
   * borderRadius + overflow wie die Kachel, damit der Press-Overlay (gray[50]) an den Ecken clippt.
   */
  pressableFill: {
    width: '100%',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
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
