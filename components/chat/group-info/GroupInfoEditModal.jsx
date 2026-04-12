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
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { XMarkIcon, PhotoIcon } from 'react-native-heroicons/solid';
import { theme } from '../../../constants/theme';

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

          <Pressable
            onPress={onSave}
            disabled={saving || !String(name || '').trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              (!String(name || '').trim() || saving) && styles.saveBtnDisabled,
              pressed && String(name || '').trim() && !saving && { opacity: 0.92 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveLabel}>Speichern</Text>
            )}
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
  saveBtn: {
    marginTop: 32,
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveLabel: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
