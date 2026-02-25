import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XMarkIcon, CalendarIcon, MusicalNoteIcon, MapPinIcon } from 'react-native-heroicons/solid';
import { theme } from '../constants/theme';

interface FilterDrawerProps {
  onClose: () => void;
}

export function FilterDrawer({ onClose }: FilterDrawerProps) {
  const [selectedRadius, setSelectedRadius] = React.useState('5');
  const [selectedGenres, setSelectedGenres] = React.useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = React.useState<string[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string>('');

  const radiusOptions = ['5 km', '10 km', '20 km', '50 km'];
  const genres = ['Techno', 'House', 'Hip-Hop', 'Electronic', 'Trance', 'R&B'];
  const eventTypes = ['Club', 'Rooftop', 'Festival', 'Bar', 'Open Air', 'Concert'];
  const dateOptions = ['Heute', 'Morgen', 'Wochenende', 'Diese Woche'];

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleEventType = (type: string) => {
    setSelectedEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleReset = () => {
    setSelectedRadius('5');
    setSelectedGenres([]);
    setSelectedEventTypes([]);
    setSelectedDate('');
  };

  const handleApply = () => {
    // Hier könnten Sie die Filter-Logik implementieren
    console.log('Filter angewendet:', {
      radius: selectedRadius,
      genres: selectedGenres,
      eventTypes: selectedEventTypes,
      date: selectedDate,
    });
    onClose();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filter</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={theme.colors.neutral.gray[700]} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Musik Genre Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MusicalNoteIcon size={20} color={theme.colors.primary.main} />
              <Text style={styles.sectionTitle}>Musik</Text>
            </View>
            <View style={styles.optionsGrid}>
              {genres.map((genre) => (
                <Pressable
                  key={genre}
                  onPress={() => toggleGenre(genre)}
                  style={[
                    styles.chip,
                    selectedGenres.includes(genre) && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedGenres.includes(genre) && styles.chipTextSelected,
                    ]}
                  >
                    {genre}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Event-Art Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPinIcon size={20} color={theme.colors.primary.main} />
              <Text style={styles.sectionTitle}>Event-Art</Text>
            </View>
            <View style={styles.optionsGrid}>
              {eventTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => toggleEventType(type)}
                  style={[
                    styles.chip,
                    selectedEventTypes.includes(type) && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedEventTypes.includes(type) && styles.chipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Datum Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarIcon size={20} color={theme.colors.primary.main} />
              <Text style={styles.sectionTitle}>Wann?</Text>
            </View>
            <View style={styles.optionsGrid}>
              {dateOptions.map((date) => (
                <Pressable
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.chip,
                    selectedDate === date && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedDate === date && styles.chipTextSelected,
                    ]}
                  >
                    {date}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer - Reset & Apply */}
        <View style={styles.footer}>
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Zurücksetzen</Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={[styles.applyButton, { backgroundColor: theme.colors.primary.main }]}
          >
            <Text style={styles.applyButtonText}>Anwenden</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.neutral.gray[900],
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral.gray[900],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral.gray[100],
  },
  chipSelected: {
    backgroundColor: theme.colors.primary.main,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral.gray[700],
  },
  chipTextSelected: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.gray[200],
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray[200],
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral.gray[700],
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});