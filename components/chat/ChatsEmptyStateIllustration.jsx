/**
 * Illustration fuer den leeren Chat-Tab: grosser hellgrauer Kreis, stilisierte
 * Nachrichtenliste mit hervorgehobener Zeile, Plus-Badge und Cursor — angelehnt an
 * uebliche „No messages“-Empty-States (Mobile-Apps).
 */
import React from 'react';
import { View, Text } from 'react-native';
import { CursorArrowRaysIcon } from 'react-native-heroicons/outline';
import { PlusIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';

/** Dunkles Slate wie im Referenz-Screenshot (hervorgehobene Chat-Zeile) */
const HIGHLIGHT_ROW = '#3D4F5C';
/** Avatar-Kreis auf der hervorgehobenen Zeile */
const AVATAR_SOFT_BLUE = '#7CB8FF';

export default function ChatsEmptyStateIllustration() {
  return (
    <View
      className="items-center justify-center"
      style={{ width: 260, height: 240 }}
      pointerEvents="none"
    >
      {/* Grosser Kreis-Hintergrund */}
      <View
        className="absolute rounded-full"
        style={{
          width: 220,
          height: 220,
          backgroundColor: theme.colors.neutral.gray[100],
        }}
      />

      {/* Kleine Deko-Punkte / Kreuze (dezent, wie im Referenz-UI) */}
      <Text
        className="absolute text-[11px] font-light"
        style={{ top: 28, right: 36, color: theme.colors.primary.main, opacity: 0.35 }}
      >
        ×
      </Text>
      <View
        className="absolute h-1.5 w-1.5 rounded-full"
        style={{ top: 52, left: 44, backgroundColor: theme.colors.neutral.gray[300], opacity: 0.7 }}
      />
      <View
        className="absolute h-2 w-2 rounded-full"
        style={{ bottom: 56, right: 40, backgroundColor: theme.colors.primary.main, opacity: 0.2 }}
      />
      <Text
        className="absolute text-[10px]"
        style={{ bottom: 44, left: 32, color: theme.colors.neutral.gray[400], opacity: 0.6 }}
      >
        ×
      </Text>

      {/* Runder Plus-Button oben links am Motiv */}
      <View
        className="absolute left-[18px] top-[36px] h-9 w-9 items-center justify-center rounded-full bg-white"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <PlusIcon size={18} color={theme.colors.primary.main} />
      </View>

      {/* Stilisierte Nachrichtenliste (Mitte im Kreis) + Cursor relativ zur Karte positioniert */}
      <View className="z-10 mt-2 items-center">
        <View style={{ position: 'relative' }}>
          <View
            className="overflow-hidden rounded-2xl border bg-white px-2.5 py-2.5"
            style={{
              width: 152,
              borderColor: theme.colors.neutral.gray[200],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            {/* Hervorgehobene Zeile: Avatar + Text-Balken */}
            <View
              className="mb-2 flex-row items-center rounded-lg px-1.5 py-2"
              style={{ backgroundColor: HIGHLIGHT_ROW }}
            >
              <View
                className="mr-2 h-7 w-7 rounded-full"
                style={{ backgroundColor: AVATAR_SOFT_BLUE }}
              />
              <View className="h-2 flex-1 rounded-md bg-white opacity-95" />
            </View>
            {/* Weitere Platzhalter-Zeilen */}
            <View
              className="mb-2 h-7 w-full rounded-md"
              style={{ backgroundColor: theme.colors.neutral.gray[200], opacity: 0.85 }}
            />
            <View
              className="h-7 w-full rounded-md"
              style={{ backgroundColor: theme.colors.neutral.gray[200], opacity: 0.55 }}
            />
          </View>

          {/* Cursor zeigt auf die erste (hervorgehobene) Zeile */}
          <View
            className="absolute"
            style={{ right: -8, bottom: -6, transform: [{ rotate: '-10deg' }] }}
          >
            <CursorArrowRaysIcon size={26} color={theme.colors.neutral.gray[500]} />
          </View>
        </View>
      </View>
    </View>
  );
}
