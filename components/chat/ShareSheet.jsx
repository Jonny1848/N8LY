/**
 * ShareSheet – „Inhalt teilen“ nach Figma-Make-Design ([Enhance-chat-UI-design](https://www.figma.com/make/pRXy4mkNb4ninERj9afr9E/Enhance-chat-UI-design)):
 * abgerundetes Oberteil (32px), farbige Icon-Kacheln pro Option, Karten-Zeilen mit Abstand statt durchgehende Trennlinien,
 * dezenter Chevron. Weiterhin Gluestack Actionsheet und gleiche Public API (visible, onClose, conversationType, onSelect).
 */
import { View, Text, Pressable } from 'react-native';
import { theme } from '../../constants/theme';
import {
  XMarkIcon,
  DocumentIcon,
  ChartBarIcon,
  PhotoIcon,
  MapPinIcon,
  CameraIcon,
  MicrophoneIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';

import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetScrollView,
} from '../../components/ui/actionsheet';

// Farben orientieren am Make-Export (Tailwind blue/purple/amber/pink/emerald/red);
const SHARE_OPTIONS = [
  {
    key: 'camera',
    Icon: CameraIcon,
    label: 'Kamera',
    subtitle: 'Foto aufnehmen',
    iconBgClass: 'bg-blue-50',
    iconColor: '#2563EB',
  },
  {
    key: 'voice',
    Icon: MicrophoneIcon,
    label: 'Sprachnachricht',
    subtitle: 'Audio aufnehmen',
    iconBgClass: 'bg-purple-50',
    iconColor: '#9333EA',
  },
  {
    key: 'documents',
    Icon: DocumentIcon,
    label: 'Dokumente',
    subtitle: 'Dateien teilen',
    iconBgClass: 'bg-amber-50',
    iconColor: '#D97706',
  },
  {
    key: 'media',
    Icon: PhotoIcon,
    label: 'Medien',
    subtitle: 'Fotos und Videos teilen',
    iconBgClass: 'bg-pink-50',
    iconColor: '#DB2777',
  },
  {
    key: 'contact',
    Icon: UserGroupIcon,
    label: 'Kontakt',
    subtitle: 'Kontakte teilen',
    iconBgClass: 'bg-emerald-50',
    iconColor: '#059669',
    iconSolid: true,
  }
  /*
  {
    key: 'location',
    Icon: MapPinIcon,
    label: 'Standort',
    subtitle: 'Standort teilen',
    iconBgClass: 'bg-red-50',
    iconColor: '#DC2626',
  },*/
];

export default function ShareSheet({ visible, onClose, conversationType, onSelect }) {
  /** Option waehlen: Sheet schliessen, dann Callback an Eltern. */
  const handleSelect = (key) => {
    onClose();
    if (onSelect) onSelect(key);
  };

  const filteredOptions = SHARE_OPTIONS.filter((opt) => {
    if (opt.groupOnly && conversationType !== 'group') return false;
    return true;
  });

  return (
    <Actionsheet isOpen={visible} onClose={onClose}>
      {/* Eigener Backdrop transparent: der BlurView im Chat-Screen uebernimmt die Abdunklung */}
      <ActionsheetBackdrop className="bg-transparent" />
      {/* Sheet: starker Schatten + Rundung erzeugt klare Abhebung vom Blur-Hintergrund (Referenz-Design) */}
      <ActionsheetContent
        className="w-full max-h-[85%] items-stretch bg-white px-0 pt-0 border-0 rounded-t-[32px]"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 24,
        }}
      >
        <ActionsheetDragIndicatorWrapper>
          {/* Drag-Indicator in Primaerfarbe (blau) wie im Referenz-Design */}
          <ActionsheetDragIndicator className="w-10 h-1 rounded-full" style={{ backgroundColor: "black" }} />
        </ActionsheetDragIndicatorWrapper>

        {/* Header: Schliessen absolut links, Titel zentriert, Unterstrich slate-100 */}
        <View className="relative border-b border-slate-100 pb-4 pt-2 px-4">
          
          <Text
            className="text-center text-lg text-slate-900 pt-0.5"
            style={{ fontFamily: 'Manrope_600SemiBold' }}
          >
            Inhalt teilen
          </Text>
        </View>

        <ActionsheetScrollView
          className="max-h-[60vh] w-full px-4 py-6 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-2">
            {filteredOptions.map((opt) => {
              const IconComp = opt.Icon;
              return (
                <ActionsheetItem
                  key={opt.key}
                  onPress={() => handleSelect(opt.key)}
                  className="min-h-0 flex-row items-center gap-4 rounded-2xl border-0 bg-transparent px-4 py-4 active:bg-slate-50"
                >
                  <View className={`p-3 rounded-2xl ${opt.iconBgClass} items-center justify-center`}>
                    {opt.iconSolid ? (
                      <IconComp size={24} color={opt.iconColor} />
                    ) : (
                      <IconComp size={24} strokeWidth={1.8} color={opt.iconColor} />
                    )}
                  </View>
                  <View className="flex-1">
                    <ActionsheetItemText
                      bold
                      size="md"
                      className="text-slate-900"
                      style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15 }}
                    >
                      {opt.label}
                    </ActionsheetItemText>
                    {opt.subtitle ? (
                      <Text
                        className="text-sm text-slate-500 mt-0.5"
                        style={{ fontFamily: 'Manrope_400Regular' }}
                      >
                        {opt.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </ActionsheetItem>
              );
            })}
          </View>
        </ActionsheetScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
