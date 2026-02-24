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
import { View, Text, Pressable, Modal, Animated, Dimensions, StyleSheet } from 'react-native';
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
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT, 0],
                }),
              }],
            },
          ]}
        >
          {/* Tippen innerhalb des Sheets soll nicht schliessen */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header: X-Button + Titel */}
            <View style={styles.sheetHeader}>
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <XMarkIcon size={24} strokeWidth={2} color={theme.colors.neutral.gray[700]} />
              </Pressable>
              <Text style={styles.sheetTitle}>Inhalt teilen</Text>
              {/* Platzhalter fuer symmetrisches Layout */}
              <View style={styles.closeBtn} />
            </View>

            {/* Optionsliste */}
            {filteredOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={styles.optionRow}
                onPress={() => handleSelect(opt.key)}
              >
                {/* Rundes Icon-Container */}
                <View style={styles.optionIcon}>
                  {opt.icon}
                </View>
                {/* Label + Untertitel */}
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  {opt.subtitle && (
                    <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
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

// ============================
// Styles
// ============================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[100],
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.neutral.gray[900],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[50],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.neutral.gray[900],
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    color: theme.colors.neutral.gray[500],
    marginTop: 2,
  },
});
