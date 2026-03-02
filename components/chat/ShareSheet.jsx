/**
 * ShareSheet – "Inhalt teilen" Bottom Sheet (Slide-up Modal)
 *
 * Zeigt eine Liste von Optionen zum Teilen von Inhalten im Chat:
 * Dokumente, Umfrage (nur Gruppen), Medien, Kontakt, Standort.
 * Kamera ist NICHT enthalten – dafuer gibt es einen separaten Button in der Input Bar.
 *
 * Props:
 *  - visible: Boolean – ob das Sheet sichtbar ist
 *  - onClose: Callback zum Schliessen
 *  - conversationType: 'direct' | 'group' – steuert ob "Umfrage" angezeigt wird
 *  - onSelect: Callback mit dem Key der gewaehlten Option (z.B. 'documents', 'media')
 */
import { View, Text, Pressable, Modal, Animated, Dimensions } from 'react-native';
import { useRef, useEffect } from 'react';
import { theme } from '../../constants/theme';
import {
  XMarkIcon,
  DocumentIcon,
  ChartBarIcon,
  PhotoIcon,
  MapPinIcon,
  CameraIcon,
  MicrophoneIcon,
} from 'react-native-heroicons/outline';
import { UserGroupIcon } from 'react-native-heroicons/solid';

// Bildschirmhoehe fuer die Slide-Animation
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Share-Optionen mit Icon, Label und optionalem Gruppen-Flag
const SHARE_OPTIONS = [
  {
    key: 'camera',
    icon: <CameraIcon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />,
    label: 'Kamera',
    subtitle: 'Foto aufnehmen',
  },
  {
    key: 'voice',
    icon: <MicrophoneIcon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />,
    label: 'Sprachnachricht',
    subtitle: 'Audio aufnehmen',
  },
  {
    key: 'documents',
    icon: <DocumentIcon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />,
    label: 'Dokumente',
    subtitle: 'Dateien teilen',
  },
  {
    key: 'poll',
    icon: <ChartBarIcon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />,
    label: 'Umfrage erstellen',
    subtitle: 'Frage an die Gruppe stellen',
    groupOnly: true,
  },
  {
    key: 'media',
    icon: <PhotoIcon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />,
    label: 'Medien',
    subtitle: 'Fotos und Videos teilen',
  },
  {
    key: 'contact',
    icon: <UserGroupIcon size={24} color={theme.colors.neutral.gray[700]} />,
    label: 'Kontakt',
    subtitle: 'Kontakte teilen',
  },
  {
    key: 'location',
    icon: <MapPinIcon size={24} strokeWidth={1.8} color={theme.colors.neutral.gray[700]} />,
    label: 'Standort',
    subtitle: 'Standort teilen',
  },
];

export default function ShareSheet({ visible, onClose, conversationType, onSelect }) {
  // Slide-up Animation (0 = versteckt, 1 = sichtbar)
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animation starten wenn visible sich aendert
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  /** Sheet nach unten ausblenden und dann Modal schliessen */
  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  /** Option auswaehlen, Sheet schliessen, Callback aufrufen */
  const handleSelect = (key) => {
    handleClose();
    if (onSelect) onSelect(key);
  };

  // Optionen filtern: "Umfrage" nur bei Gruppenchats
  const filteredOptions = SHARE_OPTIONS.filter((opt) => {
    if (opt.groupOnly && conversationType !== 'group') return false;
    return true;
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Halbtransparenter Hintergrund – Tippen schliesst das Sheet */}
      <Pressable
        className="flex-1 justify-end bg-black/35"
        onPress={handleClose}
      >
        <Animated.View
          className="bg-white rounded-t-3xl pb-10 max-h-[80%]"
          style={{
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT, 0],
                }),
              },
            ],
          }}
        >
          {/* Tippen innerhalb des Sheets soll nicht schliessen */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header: X-Button + Titel */}
            <View className="flex-row items-center justify-between px-4 pt-5 pb-4 border-b border-gray-100">
              <Pressable className="w-10 h-10 items-center justify-center" onPress={handleClose}>
                <XMarkIcon size={24} strokeWidth={2} color={theme.colors.neutral.gray[700]} />
              </Pressable>
              <Text
                className="text-lg text-gray-900"
                style={{ fontFamily: 'Manrope_700Bold' }}
              >
                Inhalt teilen
              </Text>
              {/* Platzhalter fuer symmetrisches Layout */}
              <View className="w-10 h-10 items-center justify-center" />
            </View>

            {/* Optionsliste */}
            {filteredOptions.map((opt) => (
              <Pressable
                key={opt.key}
                className="flex-row items-center px-5 py-4 border-b border-gray-50"
                onPress={() => handleSelect(opt.key)}
              >
                {/* Rundes Icon-Container */}
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-4">
                  {opt.icon}
                </View>
                {/* Label + Untertitel */}
                <View className="flex-1">
                  <Text
                    className="text-base text-gray-900"
                    style={{ fontFamily: 'Manrope_700Bold' }}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text
                      className="text-[13px] text-gray-500 mt-0.5"
                      style={{ fontFamily: 'Manrope_400Regular' }}
                    >
                      {opt.subtitle}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
