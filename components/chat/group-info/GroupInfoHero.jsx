/**
 * Grosses Gruppenbild, Gruppenname und Unterzeile (Gruppe · N Mitglieder).
 * Reanimated: dezentes Fade-In beim Erscheinen.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { UserGroupIcon } from 'react-native-heroicons/solid';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../../constants/theme';

export default function GroupInfoHero({
  groupName,
  memberCount,
  avatarUrl,
}) {
  const uri = avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : null;

  return (
    <Animated.View entering={FadeInDown.duration(380).springify()} style={styles.wrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          {/* Placeholder-Icon in Markenfarbe */}
          <UserGroupIcon size={56} color={theme.colors.primary.main} />
        </View>
      )}
      <Text style={styles.name} numberOfLines={3}>
        {groupName || 'Gruppe'}
      </Text>
      <Text style={styles.subline}>
        Gruppe ·{' '}
        <Text style={styles.sublineAccent}>{memberCount}</Text> Mitglieder
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.neutral.gray[100],
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.neutral.gray[900],
  },
  subline: {
    marginTop: 6,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.neutral.gray[500],
  },
  sublineAccent: {
    color: theme.colors.primary.main,
    fontFamily: theme.typography.fontFamily.semibold,
  },
});
