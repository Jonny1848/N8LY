/**
 * Vier Quick-Actions: Audio, Video, N8-Pics, Suche.
 * Icon + Text als Spalte, horizontal zentriert; vertikal mit paddingTop nach unten versetzt.
 * N8-Pics: LinearGradient accent.main → primary.main3.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PhoneIcon, VideoCameraIcon, MagnifyingGlassIcon, PhotoIcon } from 'react-native-heroicons/solid';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { theme } from '../../../constants/theme';

const PRIMARY = theme.colors.primary.main;

/** Icon + Beschriftung als eine zentrierte Gruppe (Icon in fester Box, optisch mittig) */
function TileContent({ icon: Icon, label, emph = false }) {
  return (
    <View style={styles.innerGroup}>
      <View style={styles.iconWrap}>
        <Icon size={26} color={emph ? '#FFFFFF' : PRIMARY} />
      </View>
      <Text style={emph ? styles.tileEmphLabel : styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ActionTile({ icon: Icon, label, onPress, emphasized = false }) {
  if (emphasized) {
    return (
      <View style={[styles.tileShell, styles.tileShellEmph]}>
        <LinearGradient
          colors={[theme.colors.accent.main, theme.colors.primary.main3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.tilePressFill, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <TileContent icon={Icon} label={label} emph />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.tileShell}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.tilePressFill, pressed && { opacity: 0.88 }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <TileContent icon={Icon} label={label} emph={false} />
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
      <ActionTile icon={PhotoIcon} label="N8-Pics" onPress={onN8Pics} emphasized />
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
  tileShellEmph: {
    backgroundColor: 'transparent',
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
  /**
   * Nur so breit wie Inhalt (max. Kachelbreite), horizontal zentriert.
   */
  innerGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  /**
   * Gleiche Box fuer alle Icons.
   * translateY: nur die Glyphe nach unten; Layout (Textposition, marginTop am Label) bleibt.
   */
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 12 }],
  },
  /** Abstand Icon → Label: groesser = Text sitzt weiter unten in der Kachel */
  tileLabel: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 11,
    color: theme.colors.neutral.gray[700],
  },
  tileEmphLabel: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
