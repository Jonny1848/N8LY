/**
 * Mitgliederzeile (WhatsApp-Layout): eine horizontale Zeile — Avatar links,
 * Name/Bio in der Mitte (eine Zeile jeweils, …), „Admin“ + Chevron rechts.
 *
 * Wichtig: Inneres `View` mit flexDirection row + `flexBasis: 0` auf der Textspalte,
 * sonst bricht RN die Zeile u.U. „untereinander“ statt nebeneinander (Ellipsis-Bug).
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRightIcon, UserIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

/** Chevron wie WhatsApp-Referenz: dezentes Grau, nicht Primary */
const CHEVRON = theme.colors.neutral.gray[400];

export default function GroupInfoMemberRow({
  username,
  bio,
  avatarUrl,
  isAdmin,
  onPress,
}) {
  const uri = avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : null;
  const bioText = bio && String(bio).trim() ? String(bio).trim() : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressOuter, pressed && styles.pressOuterPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Profil von ${username}`}
    >
      {/*
        Explizites inneres View: manche RN-Versionen layouten Pressable-Kinder ohne
        volle Breite falsch — so ist die Zeile garantiert eine Row wie im Referenz-Screenshot.
      */}
      <View style={styles.row} pointerEvents="box-none">
        <View style={styles.avatarWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <UserIcon size={22} color={theme.colors.neutral.gray[400]} />
            </View>
          )}
        </View>

        <View style={styles.textCol}>
          <Text
            style={styles.name}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {username || 'Mitglied'}
          </Text>
          {bioText ? (
            <Text
              style={styles.bio}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {bioText}
            </Text>
          ) : (
            <Text style={styles.bioEmpty} numberOfLines={1}>
              
            </Text>
          )}
        </View>

        <View style={styles.trailing}>
          {isAdmin ? (
            <Text style={styles.admin} numberOfLines={1}>
              Admin
            </Text>
          ) : null}
          <ChevronRightIcon size={20} color={CHEVRON} />
        </View>
      </View>
    </Pressable>
  );
}

const AVATAR = 44;
const ROW_PAD_H = 14;
const AVATAR_GAP = 12;
/** Trennlinie beginnt bei Text (wie WhatsApp): Padding + Avatar + Abstand */
export const GROUP_MEMBER_ROW_TEXT_INSET = ROW_PAD_H + AVATAR + AVATAR_GAP;

const styles = StyleSheet.create({
  pressOuter: {
    alignSelf: 'stretch',
    width: '100%',
  },
  pressOuterPressed: {
    backgroundColor: theme.colors.neutral.gray[50],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: ROW_PAD_H,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    marginRight: AVATAR_GAP,
    flexShrink: 0,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: theme.colors.neutral.gray[100],
  },
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 16,
    color: theme.colors.neutral.gray[900],
  },
  bio: {
    marginTop: 2,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
    lineHeight: 18,
  },
  bioEmpty: {
    marginTop: 2,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.neutral.gray[400],
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 8,
  },
  admin: {
    marginRight: 6,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
  },
});
