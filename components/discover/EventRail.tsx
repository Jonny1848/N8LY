import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Event } from '@/components/EventCard';
import { theme } from '@/constants/theme';
import EventRailCard from './EventRailCard';

type EventRailProps = {
  railKey: string;
  title: string;
  subtitle?: string;
  events: Event[];
  onEventPress: (event: Event) => void;
};

/**
 * Eine Sektion: Titelzeile + horizontale Liste (Rail).
 */
export default function EventRail({
  railKey,
  title,
  subtitle,
  events,
  onEventPress,
}: EventRailProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <FlatList
        horizontal
        data={events}
        keyExtractor={(item) => `${railKey}-${item.id}`}
        renderItem={({ item }) => (
          <EventRailCard event={item} onPress={onEventPress} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 20,
    color: theme.colors.neutral.gray[900],
  },
  subtitle: {
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
  },
  listContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
});
