/**
 * MemberActionSheet – WhatsApp-inspiriertes Bottom-Sheet für Gruppenadmin-Aktionen.
 * Öffnet sich beim Antippen eines Mitglieds in der Gruppeninfo.
 *
 * Layout: Avatar + Name + Bio → 3 Schnellaktionen → Info/Admin-Karte → Entfernen-Karte.
 * Admin-Aktionen ("Zu Gruppenadmin ernennen" / "Aus Gruppe entfernen") nur für Admins,
 * nie für den eigenen Account.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  ChatBubbleLeftIcon,
  PhoneIcon,
  VideoCameraIcon,
  ShieldExclamationIcon, 
  ShieldCheckIcon,
  MinusCircleIcon,
  UserIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { InformationCircleIcon, } from 'react-native-heroicons/solid';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '../../ui/actionsheet';
import { theme } from '../../../constants/theme';

export default function MemberActionSheet({
  visible,
  onClose,
  member,
  isCurrentUserAdmin,
  isSelf,
  onNavigateToProfile,
  onMessage,
  onMakeAdmin,
  onRemoveAdmin,
  onRemoveMember,
}) {
  if (!member) return null;

  const prof = member.profiles || {};
  const uri = prof.avatar_url && String(prof.avatar_url).trim() ? String(prof.avatar_url).trim() : null;
  const name = prof.username || 'Mitglied';
  const bio = prof.bio && String(prof.bio).trim() ? String(prof.bio).trim() : null;
  const isMemberAdmin = member.role === 'admin';

  return (
    <Actionsheet isOpen={visible} onClose={onClose}>
      {/* Transparenter Backdrop: BlurView im GroupInfoScreen übernimmt die Abdunklung */}
      <ActionsheetBackdrop className="bg-transparent" />

      {/* items-stretch stellt sicher dass alle Kinder die volle Breite bekommen */}
      <ActionsheetContent
        className="w-full bg-white px-0 pt-0 border-0 rounded-t-[32px] items-stretch"
        style={styles.shadow}
      >
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator className="w-10 h-1 rounded-full bg-slate-300" />
        </ActionsheetDragIndicatorWrapper>

        {/* ── X-Button oben rechts ── */}
        <Pressable
          onPress={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 items-center justify-center z-10"
          accessibilityRole="button"
          accessibilityLabel="Schließen"
          hitSlop={8}
        >
          <XMarkIcon size={20} color={theme.colors.neutral.gray[500]} />
        </Pressable>

        {/* ── Avatar + Name + Bio ── */}
        <View className="items-center pt-4 pb-6 px-6">
          {/* Avatar */}
          <View className="w-20 h-20 rounded-full overflow-hidden mb-3 bg-slate-100">
            {uri ? (
              /* expo-image ignoriert NativeWind className für Dimensionen → style erzwingen */
              <Image
                source={{ uri }}
                style={{ width: 80, height: 80 }}
                contentFit="cover"
              />
            ) : (
              <View className="w-20 h-20 items-center justify-center">
                <UserIcon size={34} color={theme.colors.neutral.gray[400]} />
              </View>
            )}
          </View>
          {/* Name */}
          <Text
            className="text-slate-900 text-[19px] text-center mb-1"
            style={{ fontFamily: theme.typography.fontFamily.bold }}
          >
            {name}
          </Text>
          {/* Bio / Subtitle */}
          {bio ? (
            <Text
              className="text-slate-500 text-sm text-center"
              style={{ fontFamily: theme.typography.fontFamily.regular }}
              numberOfLines={1}
            >
              {bio}
            </Text>
          ) : null}
        </View>

        {/* ── Schnellaktionen: Nachricht / Audio / Video ──
            w-1/3 auf jedem Button = exakt 1/3 Breite, Labels können nie zusammenkleben. */}
        <View className="flex-row border-b border-slate-100 pb-6 mb-4">
          <QuickBtn
            Icon={ChatBubbleLeftIcon}
            label="Nachricht"
            onPress={() => { onClose(); onMessage?.(); }}
          />
          <QuickBtn
            Icon={PhoneIcon}
            label="Audio"
            onPress={() => onClose()}
          />
          <QuickBtn
            Icon={VideoCameraIcon}
            label="Video"
            onPress={() => onClose()}
          />
        </View>

        {/* ── Info + optionale Admin-Aktion (eine gemeinsame Karte) ── */}
        <View className="mx-4 mb-3 rounded-xl overflow-hidden border border-slate-200 bg-white">
          <ActionRow
            Icon={InformationCircleIcon}
            label="Info"
            iconColor={theme.colors.neutral.gray[600]}
            onPress={() => { onClose(); onNavigateToProfile?.(); }}
          />

          {isCurrentUserAdmin && !isSelf ? (
            <>
              {/* Trennlinie eingerückt (nach Icon-Block) */}
              <View className="h-px bg-slate-200 ml-14" />
              <ActionRow
                Icon={isMemberAdmin ? ShieldExclamationIcon : ShieldCheckIcon}
                label={isMemberAdmin ? 'Adminrechte entziehen' : 'Zu Gruppenadmin ernennen'}
                iconColor={theme.colors.primary.main}
                onPress={() => {
                  onClose();
                  isMemberAdmin ? onRemoveAdmin?.() : onMakeAdmin?.();
                }}
              />
            </>
          ) : null}
        </View>

        {/* ── Aus Gruppe entfernen – eigene rote Karte, nur für Admins ── */}
        {isCurrentUserAdmin && !isSelf ? (
          <View className="mx-4 mb-3 rounded-xl overflow-hidden border border-slate-200 bg-white">
            <ActionRow
              Icon={MinusCircleIcon}
              label="Aus Gruppe entfernen"
              iconColor={theme.colors.error}
              labelColor={theme.colors.error}
              onPress={() => { onClose(); onRemoveMember?.(); }}
            />
          </View>
        ) : null}

        {/* Sicherheitsabstand unten */}
        <View className="h-6" />
      </ActionsheetContent>
    </Actionsheet>
  );
}

/** Schnellaktions-Button: Icon-Kreis + Label, nimmt exakt 1/3 der Zeile ein */
function QuickBtn({ Icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-1/3 items-center pt-2"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <>
          <View
            className="w-14 h-14 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: pressed ? '#E5E7EB' : '#F3F4F6' }}
          >
            <Icon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />
          </View>
          <Text
            className="text-slate-700 text-[13px] text-center"
            style={{ fontFamily: theme.typography.fontFamily.medium }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Aktionszeile: Icon links + Label rechts als flex-row */
function ActionRow({ Icon, label, iconColor, labelColor, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <View
          className="flex-row items-center px-4 py-4"
          style={{ backgroundColor: pressed ? '#F9FAFB' : 'transparent' }}
        >
          {/* Icon-Box mit fester Breite verhindert Verschieben des Texts */}
          <View className="w-7 h-7 items-center justify-center mr-4">
            <Icon size={22} strokeWidth={1.8} color={iconColor ?? theme.colors.neutral.gray[600]} />
          </View>
          {/* flex-1 damit langer Text umbricht statt die Karte zu sprengen */}
          <Text
            className="flex-1 text-[15px]"
            style={{
              fontFamily: theme.typography.fontFamily.medium,
              color: labelColor ?? theme.colors.neutral.gray[800],
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
});
