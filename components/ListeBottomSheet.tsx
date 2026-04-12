import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import HomeEventsList from '@/components/home/HomeEventsList';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ListeBottomSheetRef = {
  /** Gleiche Schließ-Animation wie Backdrop/X (handleClose). */
  dismiss: () => void;
};

type ListeBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Wie `FilterBottomSheet`: Modal, Backdrop, Spring rein / Timing raus, gleiche Sheet-Styles.
 * Inhalt: Event-Liste (`HomeEventsList` im eingebetteten Modus).
 */
export const ListeBottomSheet = forwardRef<ListeBottomSheetRef, ListeBottomSheetProps>(
  function ListeBottomSheet({ visible, onClose }, ref) {
    const [isListClosing, setIsListClosing] = useState(false);

    const translateY = useSharedValue(SCREEN_HEIGHT);

    useEffect(() => {
      if (visible && !isListClosing) {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        });
      }
    }, [visible, isListClosing, translateY]);

    const handleClose = useCallback(() => {
      setIsListClosing(true);
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 300,
      });

      setTimeout(() => {
        setIsListClosing(false);
        onClose();
      }, 320);
    }, [onClose, translateY]);

    useImperativeHandle(
      ref,
      () => ({
        dismiss: handleClose,
      }),
      [handleClose]
    );

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    if (!visible) return null;

    return (
      <Modal
        transparent
        visible={visible}
        onRequestClose={handleClose}
        animationType="none"
      >
        {/* Backdrop — wie FilterBottomSheet */}
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <View style={{ flex: 1 }} />
        </Pressable>

        {/* Bottom Sheet */}
        <Animated.View style={[styles.bottomSheet, animatedStyle]}>
          {/* Header — gleiches Layout wie FilterBottomSheet */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
            <Text style={styles.title}>Events</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Listeninhalt — nimmt restliche Sheet-Höhe (FlatList scrollt) */}
          <View style={styles.listBody}>
            <HomeEventsList embedded />
          </View>
        </Animated.View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  // Übernommen aus FilterBottomSheet (backdrop + bottomSheet + header)
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    height: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[100],
  },
  closeButton: {
    paddingVertical: 4,
    width: 60,
  },
  closeText: {
    fontSize: 16,
    color: theme.colors.neutral.gray[700],
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.neutral.gray[900],
  },
  listBody: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'white',
  },
});
