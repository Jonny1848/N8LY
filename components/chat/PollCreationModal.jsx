/**
 * PollCreationModal – Erstellt eine neue Umfrage fuer den Chat
 *
 * Design orientiert sich am Screenshot-Vorschlag:
 * - Frage (Pflichtfeld) als grosses Texteingabefeld
 * - Optionen-Liste: bis zu 10 Optionen, mindestens 2 (mit Loeschen)
 * - "Weitere Option hinzufuegen"-Button
 * - Einstellungen: Mehrere Optionen erlauben / Anonyme Abstimmung
 * - Senden-Button (primares Blau aus Theme)
 *
 * Farbliche Akzente aus constants/theme.js (primary.main #0066FF, accent.main #8B5CF6)
 *
 * Props:
 *  - visible:    boolean
 *  - onClose:    () => void
 *  - onSend:     (pollData) => void  — pollData: { question, options, allow_multiple, is_anonymous }
 *  - loading:    boolean  — Lade-Indikator waehrend des Sendens
 */
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XMarkIcon, PlusIcon, Bars3Icon } from 'react-native-heroicons/outline';
import { XCircleIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

// Hilfs-ID fuer neue Optionen (lokal, keine UUID noetig)
let _optionCounter = 0;
const newOptionId = () => `opt_${++_optionCounter}_${Date.now()}`;

/** Initialer Optionen-State: zwei leere Felder */
const DEFAULT_OPTIONS = () => [
  { id: newOptionId(), text: '' },
  { id: newOptionId(), text: '' },
];

const MAX_OPTIONS = 10;
const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 80;

export default function PollCreationModal({ visible, onClose, onSend, loading = false }) {
  const insets = useSafeAreaInsets();

  // ============================
  // Form-State
  // ============================
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Refs fuer Fokus-Sprung von Option zu Option
  const optionRefs = useRef({});

  // ============================
  // Optionen verwalten
  // ============================

  /** Aendert den Text einer bestehenden Option */
  const handleOptionChange = useCallback((id, text) => {
    setOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  }, []);

  /** Fuegt eine neue leere Option ans Ende (max. 10) */
  const handleAddOption = useCallback(() => {
    if (options.length >= MAX_OPTIONS) return;
    const newId = newOptionId();
    setOptions((prev) => [...prev, { id: newId, text: '' }]);
    // Fokus auf das neue Eingabefeld setzen (kurze Verzoegerung fuer Render)
    setTimeout(() => optionRefs.current[newId]?.focus(), 100);
  }, [options.length]);

  /** Loescht eine Option (mindestens 2 muessen bestehen bleiben) */
  const handleRemoveOption = useCallback((id) => {
    setOptions((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((opt) => opt.id !== id);
    });
  }, []);

  // ============================
  // Validierung & Absenden
  // ============================

  /** Prueft ob alle Pflichtfelder ausgefuellt sind */
  const isValid =
    question.trim().length > 0 &&
    options.filter((o) => o.text.trim().length > 0).length >= 2;

  // ============================
  // Button-Animation (Reanimated + LinearGradient-Crossfade)
  // Gleiches Muster wie new-chat-details.jsx und GroupInfoEditModal:
  // Shared Value 0 (inaktiv/grau) → 1 (aktiv/blau), Dauer 260ms
  // ============================
  const sendActive = useSharedValue(0);
  const sendLooksActive = isValid && !loading;

  useEffect(() => {
    sendActive.value = withTiming(sendLooksActive ? 1 : 0, { duration: 260 });
  }, [sendLooksActive]);

  /** Leichtes Einfedern: scale 0.94 (inaktiv) → 1.0 (aktiv) */
  const sendBtnScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendActive.value * 0.06 + 0.94 }],
  }));

  /** Inaktiver Gradient (grau) blendet aus */
  const sendInactiveGradOpacity = useAnimatedStyle(() => ({
    opacity: 1 - sendActive.value,
  }));

  /** Aktiver Gradient (blau) blendet ein */
  const sendActiveGradOpacity = useAnimatedStyle(() => ({
    opacity: sendActive.value,
  }));

  /** Label-Farbe: grau → weiss */
  const sendLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      sendActive.value,
      [0, 1],
      [theme.colors.neutral.gray[500], '#ffffff'],
    ),
  }));

  const handleSend = useCallback(() => {
    if (!isValid || loading) return;

    // Leere Optionen herausfiltern, IDs beibehalten
    const filledOptions = options
      .filter((o) => o.text.trim().length > 0)
      .map((o) => ({ id: o.id, text: o.text.trim() }));

    onSend({
      question: question.trim(),
      options: filledOptions,
      allow_multiple: allowMultiple,
      is_anonymous: isAnonymous,
    });
  }, [isValid, loading, options, question, allowMultiple, isAnonymous, onSend]);

  /** Modal schliessen und State zuruecksetzen */
  const handleClose = useCallback(() => {
    if (loading) return;
    onClose();
    // State wird nach kurzer Verzoegerung zurueckgesetzt (kein Flackern beim Schliessen)
    setTimeout(() => {
      setQuestion('');
      setOptions(DEFAULT_OPTIONS());
      setAllowMultiple(false);
      setIsAnonymous(false);
    }, 300);
  }, [loading, onClose]);

  // ============================
  // RENDER
  // ============================
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          className="flex-1 bg-white"
          style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0 }}
        >
          {/* ── Header ── */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:opacity-70"
              accessibilityLabel="Schliessen"
            >
              <XMarkIcon size={20} color={theme.colors.neutral.gray[600]} strokeWidth={2} />
            </Pressable>

            <Text
              className="text-[17px] text-gray-900"
              style={{ fontFamily: 'Manrope_700Bold' }}
            >
              Umfrage erstellen
            </Text>

            {/* Rechts: Platzhalter fuer symmetrisches Layout */}
            <View className="w-9" />
          </View>

          {/* ── Formular ── */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Frage */}
            <Text
              className="text-sm text-gray-500 mb-2"
              style={{ fontFamily: 'Manrope_500Medium' }}
            >
              Frage <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder=""
              placeholderTextColor={theme.colors.neutral.gray[400]}
              maxLength={MAX_QUESTION_LENGTH}
              multiline
              returnKeyType="next"
              style={{
                fontFamily: 'Manrope_500Medium',
                fontSize: 15,
                color: theme.colors.neutral.gray[900],
                backgroundColor: theme.colors.neutral.gray[50],
                borderWidth: 1.5,
                borderColor: theme.colors.neutral.gray[200],
                borderRadius: 14,
                padding: 14,
                minHeight: 56,
                textAlignVertical: 'top',
              }}
            />
            <Text
              className="text-xs text-gray-400 mt-1 text-right"
              style={{ fontFamily: 'Manrope_400Regular' }}
            >
              {question.length}/{MAX_QUESTION_LENGTH}
            </Text>

            {/* Optionen */}
            <Text
              className="text-sm text-gray-500 mt-5 mb-3"
              style={{ fontFamily: 'Manrope_500Medium' }}
            >
              Antwortoptionen
            </Text>

            {options.map((opt, index) => (
              <View
                key={opt.id}
                className="flex-row items-center mb-3 gap-3"
              >
                {/* Drag-Handle (visuell, kein echtes Drag-Reorder) */}
                <Bars3Icon
                  size={18}
                  color={theme.colors.neutral.gray[400]}
                  strokeWidth={1.8}
                />

                {/* Eingabefeld */}
                <TextInput
                  ref={(ref) => { optionRefs.current[opt.id] = ref; }}
                  value={opt.text}
                  onChangeText={(t) => handleOptionChange(opt.id, t)}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor={theme.colors.neutral.gray[400]}
                  maxLength={MAX_OPTION_LENGTH}
                  returnKeyType="next"
                  onSubmitEditing={index === options.length - 1 ? handleAddOption : undefined}
                  style={{
                    flex: 1,
                    fontFamily: 'Manrope_500Medium',
                    fontSize: 15,
                    color: theme.colors.neutral.gray[900],
                    backgroundColor: theme.colors.neutral.gray[50],
                    borderWidth: 1.5,
                    borderColor: theme.colors.neutral.gray[200],
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                  }}
                />

                {/* Loeschen-Button (nur wenn mehr als 2 Optionen vorhanden) */}
                <Pressable
                  onPress={() => handleRemoveOption(opt.id)}
                  hitSlop={8}
                  disabled={options.length <= 2}
                  className="active:opacity-60"
                >
                  <XCircleIcon
                    size={22}
                    color={
                      options.length <= 2
                        ? theme.colors.neutral.gray[300]
                        : theme.colors.neutral.gray[400]
                    }
                  />
                </Pressable>
              </View>
            ))}

            {/* Weitere Option hinzufuegen */}
            {options.length < MAX_OPTIONS && (
              <Pressable
                onPress={handleAddOption}
                className="flex-row items-center justify-center gap-2 rounded-2xl py-4 mt-1 active:opacity-70"
                style={{ backgroundColor: theme.colors.neutral.gray[100] }}
              >
                <PlusIcon size={18} color={theme.colors.neutral.gray[500]} strokeWidth={2.5} />
                <Text
                  className="text-sm text-gray-500"
                  style={{ fontFamily: 'Manrope_600SemiBold' }}
                >
                  Weitere Option hinzufuegen
                </Text>
              </Pressable>
            )}

            {/* Einstellungen */}
            <Text
              className="text-sm text-gray-500 mt-7 mb-3"
              style={{ fontFamily: 'Manrope_500Medium' }}
            >
              Einstellungen
            </Text>

            {/* Mehrere Optionen erlauben */}
            <SettingsRow
              label="Mehrere Antworten erlauben"
              value={allowMultiple}
              onChange={setAllowMultiple}
            />

            {/* Anonyme Abstimmung */}
            <SettingsRow
              label="Anonyme Abstimmung"
              subtitle="Andere sehen nicht, wer was gewaehlt hat"
              value={isAnonymous}
              onChange={setIsAnonymous}
              isLast
            />
          </ScrollView>

          {/* ── Senden-Button (Reanimated + LinearGradient-Crossfade wie new-chat-details) ── */}
          <View
            className="px-5 pt-3 border-t border-gray-100"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            <Pressable onPress={handleSend} disabled={!isValid || loading}>
              <Animated.View
                className="rounded-2xl overflow-hidden py-4 items-center justify-center"
                style={[{ minHeight: 54 }, sendBtnScaleStyle]}
              >
                {/* Inaktiver Hintergrund: grauer Gradient */}
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, sendInactiveGradOpacity]}
                >
                  <LinearGradient
                    colors={[theme.colors.neutral.gray[300], theme.colors.neutral.gray[200]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>

                {/* Aktiver Hintergrund: blauer Gradient (primary.main → primary.main2) */}
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, sendActiveGradOpacity]}
                >
                  <LinearGradient
                    colors={[theme.colors.primary.main, theme.colors.primary.main2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>

                {/* Inhalt: Ladeindikator oder Label */}
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Animated.Text
                    style={[
                      { fontFamily: 'Manrope_700Bold', fontSize: 16 },
                      sendLabelStyle,
                    ]}
                  >
                    Umfrage senden
                  </Animated.Text>
                )}
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================
// Hilfeskomponenten
// ============================

/**
 * Einstellungszeile mit Label, optionalem Untertitel und Toggle.
 * Die letzte Zeile bekommt keinen unteren Trennstrich.
 */
function SettingsRow({ label, subtitle, value, onChange, isLast = false }) {
  return (
    <View
      className={`flex-row items-center justify-between py-4 px-4 rounded-2xl bg-gray-50 mb-2 ${!isLast ? '' : ''}`}
      style={{
        borderWidth: 1,
        borderColor: value ? `${theme.colors.primary.main}33` : theme.colors.neutral.gray[200],
        backgroundColor: value ? `${theme.colors.primary.main}08` : theme.colors.neutral.gray[50],
      }}
    >
      <View className="flex-1 pr-4">
        <Text
          className="text-[15px] text-gray-800"
          style={{ fontFamily: 'Manrope_500Medium' }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            className="text-xs text-gray-400 mt-0.5"
            style={{ fontFamily: 'Manrope_400Regular' }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: theme.colors.neutral.gray[200],
          true: theme.colors.primary.main,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.colors.neutral.gray[200]}
      />
    </View>
  );
}
