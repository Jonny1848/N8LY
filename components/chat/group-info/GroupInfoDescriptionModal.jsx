/**
 * Modal: Gruppenbeschreibung bearbeiten.
 * Bestaetigen-Button: gleiches Muster wie new-chat-details „Erstellen“ —
 * Reanimated Animated.View + Crossfade zweier LinearGradients + Skalierung.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { XMarkIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

/** Sinnvolle Obergrenze fuer die Beschreibung */
const MAX_LEN = 500;

export default function GroupInfoDescriptionModal({
  visible,
  onClose,
  initialDescription,
  onSave,
  saving,
}) {
  const [draft, setDraft] = useState('');

  // Beim Oeffnen: Entwurf aus DB/Props uebernehmen
  useEffect(() => {
    if (visible) {
      setDraft(initialDescription != null ? String(initialDescription) : '');
    }
  }, [visible, initialDescription]);

  const initialNorm = useMemo(
    () => String(initialDescription ?? '').trim(),
    [initialDescription],
  );
  const draftNorm = draft.trim();
  const hasChanges = draftNorm !== initialNorm;
  /** Wie MessageInput Send: aktiv auch waehrend Speichern, sonst Gradient springt zurück */
  const confirmLooksActive = hasChanges || saving;

  const confirmActive = useSharedValue(0);
  useEffect(() => {
    confirmActive.value = withTiming(confirmLooksActive ? 1 : 0, { duration: 260 });
  }, [confirmLooksActive, confirmActive]);

  const confirmBtnScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmActive.value * 0.06 + 0.94 }],
  }));

  const confirmInactiveGradOpacity = useAnimatedStyle(() => ({
    opacity: 1 - confirmActive.value,
  }));

  const confirmActiveGradOpacity = useAnimatedStyle(() => ({
    opacity: confirmActive.value,
  }));

  const confirmLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      confirmActive.value,
      [0, 1],
      [theme.colors.neutral.gray[500], '#ffffff'],
    ),
  }));

  const handleConfirm = () => {
    if (!hasChanges || saving) return;
    onSave(draftNorm === '' ? null : draftNorm);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconBtn} accessibilityLabel="Schließen">
            <XMarkIcon size={26} color={theme.colors.neutral.gray[700]} />
          </Pressable>
          <Text style={styles.headerTitle}>Gruppenbeschreibung</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.label}>Text</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Beschreibe die Gruppe für neue Mitglieder …"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            style={styles.textArea}
            multiline
            maxLength={MAX_LEN}
            textAlign="center"
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {draft.length}/{MAX_LEN}
          </Text>

          {/* Bestätigen: Animated.View + zwei LinearGradients (inaktiv / aktiv) */}
          <Pressable
            onPress={handleConfirm}
            disabled={!hasChanges || saving}
            style={styles.confirmPressWrap}
          >
            <Animated.View
              style={[styles.confirmBtnOuter, confirmBtnScaleStyle]}
            >
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, confirmInactiveGradOpacity]}
              >
                <LinearGradient
                  colors={[theme.colors.neutral.gray[300], theme.colors.neutral.gray[200]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, confirmActiveGradOpacity]}
              >
                <LinearGradient
                  colors={[theme.colors.primary.main, theme.colors.primary.main2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Animated.Text
                  style={[
                    styles.confirmLabel,
                    confirmLabelStyle,
                  ]}
                >
                  Bestätigen
                </Animated.Text>
              )}
            </Animated.View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 17,
    color: theme.colors.neutral.gray[900],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 44,
  },
  label: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  textArea: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[200],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 22,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.neutral.gray[900],
    backgroundColor: theme.colors.neutral.gray[50],
  },
  counter: {
    alignSelf: 'center',
    marginTop: 10,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.neutral.gray[400],
  },
  confirmPressWrap: {
    marginTop: 36,
    alignItems: 'center',
  },
  confirmBtnOuter: {
    borderRadius: 9999,
    overflow: 'hidden',
    paddingHorizontal: 40,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 16,
  },
});
