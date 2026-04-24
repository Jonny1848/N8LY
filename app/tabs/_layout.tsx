import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeTabs, Icon, Label, Badge, VectorIcon } from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';
import { useEffect, useMemo, useState } from 'react';
import { theme } from '../../constants/theme';
import useChatStore from '../../stores/useChatStore';

/**
 * NativeTabs registriert nur direkte <NativeTabs.Trigger>-Kinder (strict type check).
 * Ein Wrapper wie function SocialTabTrigger() würde den Social-Tab komplett auslassen.
 */
export default function TabLayout() {
  const totalUnread = useChatStore((s) =>
    s.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  );

  // Events-Tab: SF Symbols "1.calendar" … "31.calendar" / ".fill" für den aktuellen Kalendertag
  const [dayOfMonth, setDayOfMonth] = useState(() => new Date().getDate());
  useEffect(() => {
    const syncDay = () => {
      const next = new Date().getDate();
      setDayOfMonth((prev) => (prev !== next ? next : prev));
    };
    syncDay();
    // Nach Tageswechsel ohne App-Neustart aktualisieren (z. B. App bleibt über Mitternacht offen)
    const id = setInterval(syncDay, 60_000);
    return () => clearInterval(id);
  }, []);

  const eventsTabSf = useMemo(() => {
    const d = String(dayOfMonth);
    return {
      default: `${d}.calendar` as SFSymbol,
      selected: `${d}.square.fill` as SFSymbol,
    };
  }, [dayOfMonth]);

  return (
    <NativeTabs
      // Aktiver Tab: Markenblau; inaktiv: dezentes Grau (NativeTabs tint + iconColor)
      tintColor={theme.colors.primary.main}
      iconColor={{
        default: theme.colors.neutral.gray[500],
        selected: theme.colors.primary.main,
      }}
      labelStyle={{
        default: { color: theme.colors.neutral.gray[600] },
        selected: { color: theme.colors.primary.main},
      }}
    >
      <NativeTabs.Trigger name="home">
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          androidSrc={{
            default: <VectorIcon family={MaterialCommunityIcons} name="home-outline" />,
            selected: <VectorIcon family={MaterialCommunityIcons} name="home" />,
          }}
        />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="events">
        <Icon
          sf={eventsTabSf}
          androidSrc={{
            default: <VectorIcon family={MaterialCommunityIcons} name="calendar-outline" />,
            selected: <VectorIcon family={MaterialCommunityIcons} name="calendar" />,
          }}
        />
        <Label>Events</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="social">
        <Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          androidSrc={{
            default: <VectorIcon family={MaterialCommunityIcons} name="message-outline" />,
            selected: <VectorIcon family={MaterialCommunityIcons} name="message" />,
          }}
        />
        <Label>Nachrichten</Label>
        {totalUnread > 0 ? (
          <Badge>{totalUnread > 99 ? '99+' : String(totalUnread)}</Badge>
        ) : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="discover">
        <Icon
          sf={{ default: 'globe', selected: 'globe.fill' }}
          androidSrc={{
            default: <VectorIcon family={MaterialCommunityIcons} name="map-outline" />,
            selected: <VectorIcon family={MaterialCommunityIcons} name="map" />,
          }}
        />
        <Label>Discover</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          androidSrc={{
            default: <VectorIcon family={MaterialCommunityIcons} name="account-outline" />,
            selected: <VectorIcon family={MaterialCommunityIcons} name="account" />,
          }}
        />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
