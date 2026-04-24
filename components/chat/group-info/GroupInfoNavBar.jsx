/**
 * Gruppeninfo: oberer Balken mit Zurück, Titel und „Bearbeiten“.
 * Styling an den Chat-Header und theme.js angelehnt.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeftIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

export default function GroupInfoNavBar({ onBack, onEdit, title = 'Gruppeninfo' }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Zurück"
      >
        <ChevronLeftIcon size={28} color={theme.colors.neutral.gray[900]} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={onEdit}
        style={styles.editWrap}
        accessibilityRole="button"
        accessibilityLabel="Gruppe bearbeiten"
      >
        <Text style={styles.editLabel}>Bearbeiten</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral.gray[200],
    backgroundColor: theme.colors.neutral.white,
  },
  iconBtn: {
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
  editWrap: {
    minWidth: 88,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  editLabel: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 16,
    color: theme.colors.primary.main,
  },
});
