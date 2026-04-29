/**
 * Vier Quick-Actions: Audio, Video, N8-Pics, Suche.
 * Alle Kacheln einheitlich: weiss mit Schatten, Primary-Farbe für Icons (wie WhatsApp/Streifen).
 *
 * Hinweis: N8-Pics ist nicht mehr visuell hervorgehoben — eigene USP-Seite kommt beim Antippen
 * (/chat/group-n8-pics/[id]), die Mediengalerie bleibt über die Medien-Zeile verlinkt.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PhoneIcon, VideoCameraIcon, MagnifyingGlassIcon, PhotoIcon } from 'react-native-heroicons/solid';
import Animated, { FadeIn } from 'react-native-reanimated';
import { theme } from '../../../constants/theme';

const PRIMARY = theme.colors.primary.main;

/** Icon + Beschriftung als eine zentrierte Gruppe (Icon in fester Box, optisch mittig) */
function TileContent({ icon: Icon, label }) {
  return (
    <View style={styles.innerGroup}>
      <View style={styles.iconWrap}>
        <Icon size={26} color={PRIMARY} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ActionTile({ icon: Icon, label, onPress }) {
  return (
    <View style={styles.tileShell}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.tilePressFill, pressed && { opacity: 0.88 }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <TileContent icon={Icon} label={label} />
      </Pressable>
    </View>
  );
}

export default function GroupInfoQuickActions({
  onAudio,
  onVideo,
  onN8Pics,
  onSearch,
}) {
  return (
    <Animated.View entering={FadeIn.duration(420)} style={styles.row}>
      <ActionTile icon={PhoneIcon} label="Audio" onPress={onAudio} />
      <ActionTile icon={VideoCameraIcon} label="Video" onPress={onVideo} />
      <ActionTile icon={PhotoIcon} label="N8-Pics" onPress={onN8Pics} />
      <ActionTile icon={MagnifyingGlassIcon} label="Suche" onPress={onSearch} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    paddingHorizontal: 6,
    paddingBottom: 16,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  tileShell: {
    flex: 1,
    minHeight: 88,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  /**
   * flex-start + grosses paddingTop: Icon+Text weiter unten in der Kachel (alle 4 gleich).
   */
  tilePressFill: {
    flex: 1,
    minHeight: 88,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  innerGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 12 }],
  },
  tileLabel: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 11,
    color: theme.colors.neutral.gray[700],
  },
});
