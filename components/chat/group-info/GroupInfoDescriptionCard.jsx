/**
 * Gruppenbeschreibung in einer Kachel wie „Medien, Links, Doks“:
 * Text links (mehrzeilig), Stift rechts — nur der Stift oeffnet die Bearbeitung.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PencilSquareIcon } from 'react-native-heroicons/solid';
import Animated, { FadeIn } from 'react-native-reanimated';
import { theme } from '../../../constants/theme';

const PRIMARY = theme.colors.primary.main;

export default function GroupInfoDescriptionCard({ description, onPressEdit }) {
  const trimmed = description && String(description).trim() ? String(description).trim() : '';

  return (
    <Animated.View entering={FadeIn.delay(80)} style={styles.outer}>
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.textCol}>
            {trimmed ? (
              <Text style={styles.body} numberOfLines={4} ellipsizeMode="tail">
                {trimmed}
              </Text>
            ) : (
              <Text style={styles.hint}>Gruppenbeschreibung hinzufügen</Text>
            )}
          </View>
          <Pressable
            onPress={onPressEdit}
            hitSlop={12}
            style={({ pressed }) => [styles.pencilBtn, pressed && { opacity: 0.65 }]}
            accessibilityRole="button"
            accessibilityLabel="Gruppenbeschreibung bearbeiten"
          >
            <PencilSquareIcon size={22} color="black" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  /** Gleiche Kachel wie GroupInfoStatsRow (weiss, Radius, Schatten) */
  section: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  hint: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 15,
    color: PRIMARY,
  },
  body: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 15,
    color: theme.colors.neutral.gray[800],
    lineHeight: 22,
  },
  pencilBtn: {
    flexShrink: 0,
  },
});
