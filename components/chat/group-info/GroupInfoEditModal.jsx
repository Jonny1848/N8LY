/**
 * Modal: Gruppenname und Gruppenbild aendern — Upload ueber chat-media wie bei Chat-Bildern.
 */
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
import { Image } from 'expo-image';
import { XMarkIcon, PhotoIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { useEffect, useMemo } from 'react';

export default function GroupInfoEditModal({
  visible,
  onClose,
  initialName,
  initialAvatarUrl,
  localPreviewUri,
  onChangeName,
  onPickImage,
  onSave,
  saving,
  name,
}) {
  const showAvatar = localPreviewUri || (initialAvatarUrl && String(initialAvatarUrl).trim());

  // Vergleich mit Server-Stand: Name geaendert und/oder neues lokales Bild gewaehlt
  const initialNorm = useMemo(
    () => String(initialName ?? '').trim(),
    [initialName],
  );
  const draftNorm = String(name ?? '').trim();
  const hasChanges =
    draftNorm !== initialNorm || Boolean(localPreviewUri);
  /** Gradient bleibt „aktiv“ auch waehrend Speichern, damit kein Farbsprung entsteht */
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

  // Parent erwartet kein Argument (siehe handleSaveEdit in group-info/[id])
  const handleConfirm = () => {
    if (!hasChanges || saving || !draftNorm) return;
    onSave();
  };


  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconBtn} accessibilityLabel="Schließen">
            <XMarkIcon size={26} color={theme.colors.neutral.gray[700]} />
          </Pressable>
          <Text style={styles.headerTitle}>Gruppe bearbeiten</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.label}>Gruppenname</Text>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Name der Gruppe"
            placeholderTextColor={theme.colors.neutral.gray[400]}
            style={styles.input}
            maxLength={80}
          />

          <Text style={[styles.label, { marginTop: 24 }]}>Gruppenbild</Text>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.imageCard, pressed && { opacity: 0.9 }]}
          >
            {showAvatar ? (
              <Image
                source={{ uri: localPreviewUri || initialAvatarUrl }}
                style={styles.preview}
                contentFit="cover"
              />
            ) : (
              <View style={styles.previewPh}>
                <PhotoIcon size={40} color={theme.colors.neutral.gray[400]} />
                <Text style={styles.previewHint}>Tippen zum Auswählen</Text>
              </View>
            )}
          </Pressable>

          {/* Speichern: wie GroupInfoDescriptionModal — zwei LinearGradients (inaktiv/aktiv) */}
          <Pressable
            onPress={handleConfirm}
            disabled={!draftNorm || !hasChanges || saving}
            style={({ pressed }) => [
              styles.confirmPressWrap,
              pressed && draftNorm && hasChanges && !saving && { opacity: 0.92 },
            ]}
          >
            <Animated.View style={[styles.confirmBtnOuter, confirmBtnScaleStyle]}>
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
                <Animated.Text style={[styles.confirmLabel, confirmLabelStyle]}>
                  Speichern
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
    paddingVertical: 12,
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
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 13,
    color: theme.colors.neutral.gray[500],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[200],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.neutral.gray[900],
    backgroundColor: theme.colors.neutral.gray[50],
  },
  imageCard: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: theme.colors.neutral.gray[100],
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  previewPh: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewHint: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 12,
    color: theme.colors.neutral.gray[500],
  },
  confirmPressWrap: {
    marginTop: 32,
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
