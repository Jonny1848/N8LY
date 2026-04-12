/**
 * MessageInput – Bottom Input Bar
 *
 * Normal: + | Input | Mic | Send
 * Mic-Tap: Mic morpht smooth zur Aufnahme-Pill (Pause + Waveform + X).
 * Stop/X: Pill collapse → Preview mit Waveform + Play/Pause + Send.
 * Send: Preview fadet raus, Normal kommt zurueck.
 */
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Platform, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect, useRef, Fragment, forwardRef, useImperativeHandle, useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { MicrophoneIcon } from 'react-native-heroicons/solid';
import { XMarkIcon as XMarkOutline } from 'react-native-heroicons/outline';

import { theme } from '../../constants/theme';
import { TrashIcon, PlusIcon } from 'react-native-heroicons/outline';
import {
  PaperAirplaneIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
} from 'react-native-heroicons/solid';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const SCREEN_W = Dimensions.get('window').width;
const REC_PILL_W = SCREEN_W - 32;
const MIC_BTN_SIZE = 40;
const REC_PILL_H = 52;

const REC_EXPAND_MS = 420;
const REC_COLLAPSE_MS = 340;
const REC_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

/** Dauer fuer Crossfade zwischen Modi (Recording ↔ Preview ↔ Normal) */
const MODE_FADE_MS = 280;

const MessageInput = forwardRef(function MessageInput(
  { onSendText, onSendVoice, onOpenShareSheet, onSendImage, onSendFile, onSendContact },
  ref
) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [recording, setRecording] = useState(false);
  /** true solange die Recording-Pill sichtbar ist (inkl. Collapse-Animation) */
  const [recBarVisible, setRecBarVisible] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [waveformSamples, setWaveformSamples] = useState([]);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  /** Preview-Sichtbarkeit — steuert den Fade-Uebergang */
  const [showPreview, setShowPreview] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingContact, setUploadingContact] = useState(false);

  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  };
  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder, 16);

  const previewPlayer = useAudioPlayer(recordedUri, 16);
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const hasContent = inputText.trim().length > 0;
  const sendLooksActive = hasContent || sending;

  // ── Send button animation (normal mode) ──
  const sendActive = useSharedValue(0);
  useEffect(() => {
    sendActive.value = withTiming(sendLooksActive ? 1 : 0, { duration: 260 });
  }, [sendLooksActive]);

  const sendBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendActive.value * 0.06 + 0.94 }],
    backgroundColor: interpolateColor(
      sendActive.value,
      [0, 1],
      [theme.colors.neutral.gray[300], "#74C365"],
    ),
  }));

  // ── Recording-Bar expand/collapse ──
  const recExpand = useSharedValue(0);

  const recPillStyle = useAnimatedStyle(() => {
    const w = interpolate(recExpand.value, [0, 1], [MIC_BTN_SIZE, REC_PILL_W]);
    const h = interpolate(recExpand.value, [0, 1], [MIC_BTN_SIZE, REC_PILL_H]);
    const r = interpolate(recExpand.value, [0, 1], [MIC_BTN_SIZE / 2, REC_PILL_H / 2]);
    return { width: w, height: h, borderRadius: r };
  });

  const micIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(recExpand.value, [0, 0.25], [1, 0], 'clamp'),
    transform: [{ scale: interpolate(recExpand.value, [0, 0.3], [1, 0.5], 'clamp') }],
  }));

  const recControlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(recExpand.value, [0.5, 0.85], [0, 1], 'clamp'),
  }));

  // Metering waehrend Aufnahme sammeln
  useEffect(() => {
    if (!recording || !recorderState.isRecording) return;
    const raw = recorderState.metering;
    const normalized = raw == null ? 0.3 : Math.max(0.15, Math.min(1, (raw + 60) / 60));
    setWaveformSamples((prev) => [...prev, normalized]);
  }, [recording, recorderState.isRecording, recorderState.metering, recorderState.durationMillis]);

  const formatRecordingTime = (millis) => {
    const totalSec = Math.floor((millis || 0) / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Handlers ──

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    try { await onSendText(text); }
    catch (err) { console.error('Fehler beim Senden:', err); setInputText(text); }
    finally { setSending(false); }
  };

  /** Collapse-Animation: erst nach Abschluss Layout freigeben */
  const collapseRecPill = useCallback((opts = {}) => {
    const { goToPreview = false } = opts;
    recExpand.value = withTiming(0, { duration: REC_COLLAPSE_MS, easing: REC_EASING }, (finished) => {
      if (finished) {
        runOnJS(setRecBarVisible)(false);
        if (goToPreview) runOnJS(setShowPreview)(true);
      }
    });
  }, [recExpand]);

  const handleMicPress = useCallback(async () => {
    try {
      const permStatus = await AudioModule.requestRecordingPermissionsAsync();
      if (!permStatus.granted) { console.warn('[VOICE] Mikrofon-Berechtigung verweigert'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync(recordingOptions);
      audioRecorder.record();
      setRecording(true);
      setRecBarVisible(true);
      setShowPreview(false);
      setRecordedUri(null);
      setWaveformSamples([]);
      recExpand.value = withTiming(1, { duration: REC_EXPAND_MS, easing: REC_EASING });
    } catch (err) {
      console.error('[VOICE] Fehler beim Starten der Aufnahme:', err);
      try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch {}
    }
  }, [audioRecorder, recExpand]);

  const handleStartRecording = handleMicPress;

  /** Stop: Aufnahme beenden → Pill collapse → Preview einblenden */
  const handleStopRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
      setRecording(false);
      setRecordedUri(audioRecorder.uri);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch (err) {
      console.error('[VOICE] Fehler beim Stoppen:', err);
      setRecording(false);
      try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch {}
    }
    collapseRecPill({ goToPreview: true });
  }, [audioRecorder, collapseRecPill]);

  /** X in Recording-Pill: verwerfen + collapse zurueck zum Normalzustand */
  const handleRecDismiss = useCallback(async () => {
    if (recording) {
      try { await audioRecorder.stop(); } catch {}
      try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch {}
    }
    setRecording(false);
    setRecordedUri(null);
    setWaveformSamples([]);
    collapseRecPill();
  }, [recording, audioRecorder, collapseRecPill]);

  /** Preview verwerfen: sanfter Fade-Out */
  const handleDiscardRecording = useCallback(async () => {
    if (previewStatus.playing) previewPlayer.pause();
    setShowPreview(false);
    setRecordedUri(null);
    setWaveformSamples([]);
    setRecording(false);
  }, [previewStatus, previewPlayer]);

  /** Sprachnachricht senden: sanfter Fade-Out der Preview */
  const handleSendVoice = async () => {
    const uri = recordedUri || audioRecorder.uri;
    if (!uri || uploadingVoice) return;
    setUploadingVoice(true);
    try {
      await onSendVoice(uri, waveformSamples);
      setShowPreview(false);
      setRecordedUri(null);
      setWaveformSamples([]);
      setRecording(false);
    } catch (err) { console.error('[VOICE] Fehler beim Senden:', err); }
    finally { setUploadingVoice(false); }
  };

  const handleTakePhoto = async () => {
    if (!onSendImage || uploadingImage) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Kamera-Zugriff', 'Wir benoetigen Zugriff auf deine Kamera.', [{ text: 'OK' }]); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) { setUploadingImage(true); await onSendImage(result.assets[0].uri); }
    } catch (err) { console.error('[CAMERA] Fehler:', err); }
    finally { setUploadingImage(false); }
  };

  const handlePickFromGallery = async () => {
    if (!onSendImage || uploadingImage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Fotozugriff', 'Wir benoetigen Zugriff auf deine Fotos.', [{ text: 'OK' }]); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) { setUploadingImage(true); await onSendImage(result.assets[0].uri); }
    } catch (err) { console.error('[MEDIEN] Fehler:', err); }
    finally { setUploadingImage(false); }
  };

  const handlePickDocument = async () => {
    if (!onSendFile || uploadingFile) return;
    let getDocumentAsync;
    try { const mod = require('expo-document-picker'); getDocumentAsync = mod.getDocumentAsync ?? mod.default?.getDocumentAsync; } catch {}
    if (typeof getDocumentAsync !== 'function') {
      Alert.alert('Nicht verfuegbar', 'Dokumenten-Picker fehlt im Build.', [{ text: 'OK' }]);
      return;
    }
    try {
      const result = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploadingFile(true);
      await onSendFile(asset.uri, { name: asset.name, mimeType: asset.mimeType });
    } catch (err) {
      console.error('[DOKUMENTE] Fehler:', err);
      Alert.alert('Datei', 'Die Datei konnte nicht gesendet werden.', [{ text: 'OK' }]);
    } finally { setUploadingFile(false); }
  };

  const handlePickContacts = async () => {
    if (!onSendContact || uploadingContact) return;
    const pickPhoneFromContact = (c) => { const nums = c?.phoneNumbers; if (!nums?.length) return null; const p = nums.find((n) => n.isPrimary) ?? nums[0]; return p?.number?.trim() || p?.digits || null; };
    const displayNameFromContact = (c) => { if (c.name?.trim()) return c.name.trim(); return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Kontakt'; };
    let Contacts;
    try { Contacts = require('expo-contacts'); } catch { Contacts = null; }
    if (!Contacts?.presentContactPickerAsync) { Alert.alert('Nicht verfuegbar', 'Kontakte fehlen im Build.', [{ text: 'OK' }]); return; }
    try {
      if (Platform.OS === 'android') { const { status } = await Contacts.requestPermissionsAsync(); if (status !== 'granted') { Alert.alert('Kontakt-Zugriff', 'Zugriff auf Kontakte noetig.', [{ text: 'OK' }]); return; } }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const phone = pickPhoneFromContact(contact);
      if (!phone) { Alert.alert('Keine Telefonnummer', 'Dieser Kontakt hat keine Nummer.', [{ text: 'OK' }]); return; }
      setUploadingContact(true);
      await onSendContact({ displayName: displayNameFromContact(contact), phone });
    } catch (err) {
      console.error('[KONTAKTE] Fehler:', err);
      Alert.alert('Kontakt', 'Kontakt konnte nicht gesendet werden.', [{ text: 'OK' }]);
    } finally { setUploadingContact(false); }
  };

  useImperativeHandle(ref, () => ({
    openCamera: handleTakePhoto,
    openMediaLibrary: handlePickFromGallery,
    startVoiceRecording: handleStartRecording,
    openDocumentPicker: handlePickDocument,
    openContactsPicker: handlePickContacts,
  }));

  const togglePreviewPlayback = () => {
    if (previewStatus.playing) { previewPlayer.pause(); }
    else {
      if (previewStatus.currentTime >= previewStatus.duration && previewStatus.duration > 0) previewPlayer.seekTo(0);
      previewPlayer.play();
    }
  };

  // ── Shared Send-Button (normal mode) ──
  const renderSendButton = ({ onPress, disabled, isLoading }) => (
    <Pressable onPress={onPress} disabled={disabled} className="shrink-0">
      <Animated.View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={sendBtnAnimStyle}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <PaperAirplaneIcon size={20} strokeWidth={2.5} color="#FFFFFF" />
        )}
      </Animated.View>
    </Pressable>
  );

  // ── Waveform: Recording-Pill (live) ──
  const renderRecordingWaveform = () => {
    const maxBars = 28;
    const samples = waveformSamples.slice(-maxBars);
    return (
      <View className="flex-1 flex-row items-center justify-center gap-[3px] mx-2">
        {samples.map((v, i) => (
          <View
            key={i}
            style={{
              width: 2.5,
              height: Math.max(4, v * 20),
              borderRadius: 1.5,
              backgroundColor: 'rgba(255,255,255,0.85)',
            }}
          />
        ))}
      </View>
    );
  };

  // ── Waveform: Preview (statisch, mit Fortschrittsanzeige) ──
  const renderPreviewWaveform = () => {
    const maxBars = 36;
    const samples = waveformSamples.length > 0 ? waveformSamples : [];
    if (samples.length === 0) return <View className="flex-1" />;

    // Samples auf maxBars normalisieren (Downsampling oder Padding)
    let displaySamples;
    if (samples.length >= maxBars) {
      const step = samples.length / maxBars;
      displaySamples = Array.from({ length: maxBars }, (_, i) => {
        const idx = Math.floor(i * step);
        return samples[Math.min(idx, samples.length - 1)];
      });
    } else {
      displaySamples = [...samples];
      while (displaySamples.length < maxBars) displaySamples.push(0.15);
    }

    // Fortschritt berechnen: welcher Anteil der Bars ist „abgespielt"
    const progress = previewStatus.duration > 0
      ? previewStatus.currentTime / previewStatus.duration
      : 0;
    const activeBars = Math.floor(progress * displaySamples.length);

    return (
      <View className="flex-1 flex-row items-center justify-center gap-[2.5px]">
        {displaySamples.map((v, i) => {
          const isActive = i <= activeBars;
          return (
            <View
              key={i}
              style={{
                width: 3,
                height: Math.max(4, v * 24),
                borderRadius: 1.5,
                backgroundColor: isActive
                  ? theme.colors.primary.main3
                  : theme.colors.neutral.gray[300],
              }}
            />
          );
        })}
      </View>
    );
  };

  // Bestimme welcher Modus aktiv ist
  const isNormal = !recBarVisible && !showPreview;

  // ============================
  // RENDER
  // ============================
  return (
    <Fragment>
    <View className="bg-white border-t border-gray-200 px-4 pt-5 pb-4">
      <View className="flex-row items-center gap-3 min-h-[56px]">

      {/* ── PREVIEW-MODUS: Waveform + Play/Pause + Send ── */}
      {showPreview && (
        <Animated.View
          entering={FadeIn.duration(MODE_FADE_MS)}
          exiting={FadeOut.duration(MODE_FADE_MS)}
          className="flex-1 flex-row items-center gap-3"
        >
          {/* Verwerfen */}
          <Pressable
            className="w-10 h-10 items-center justify-center rounded-full"
            style={{ backgroundColor: '#FEE2E2' }}
            onPress={handleDiscardRecording}
          >
            <TrashIcon size={20} strokeWidth={2} color="#EF4444" />
          </Pressable>

          {/* Player-Pill mit Waveform */}
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3 py-3">
            {/* Play/Pause in Lila */}
            <Pressable
              onPress={togglePreviewPlayback}
              className="w-8 h-8 rounded-full items-center justify-center mr-2.5"
              style={{ backgroundColor: theme.colors.primary.main }}
            >
              {previewStatus.playing ? (
                <PauseIcon size={14} color="#FFFFFF" />
              ) : (
                <PlayIcon size={14} color="#FFFFFF" />
              )}
            </Pressable>

            {/* Waveform statt Fortschrittsbalken */}
            {renderPreviewWaveform()}

            <Text
              className="text-xs text-gray-500 ml-2.5 min-w-[32px] text-right"
              style={{ fontFamily: 'Manrope_600SemiBold' }}
            >
              {formatRecordingTime(
                previewStatus.playing || previewStatus.currentTime > 0
                  ? previewStatus.currentTime * 1000
                  : (previewStatus.duration || 0) * 1000
              )}
            </Text>
          </View>

          {/* Send — immer aktiv */}
          <Pressable onPress={handleSendVoice} disabled={uploadingVoice} className="shrink-0">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "#74C365" }}
            >
              {uploadingVoice ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <PaperAirplaneIcon size={20} strokeWidth={2.5} color="#FFFFFF" />
              )}
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* ── NORMALER MODUS + RECORDING-MODUS ── */}
      {!showPreview && (
        <Animated.View
          entering={FadeIn.duration(MODE_FADE_MS)}
          exiting={FadeOut.duration(MODE_FADE_MS)}
          className="flex-1 flex-row items-center gap-3"
        >
          {/* Plus-Button */}
          {!recBarVisible && (
            <Pressable
              className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center shrink-0"
              onPress={onOpenShareSheet}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <ActivityIndicator size="small" color={theme.colors.neutral.gray[800]} />
              ) : (
                <PlusIcon size={22} strokeWidth={2.5} color={theme.colors.neutral.gray[800]} />
              )}
            </Pressable>
          )}

          {/* Textfeld */}
          {!recBarVisible && (
            <TextInput
              className="flex-1 bg-gray-50 border-2 border-gray-300 rounded-full px-4 py-3 text-base text-gray-900 max-h-[100px]"
              placeholder="Nachricht eingeben..."
              placeholderTextColor={theme.colors.neutral.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              style={{ fontFamily: 'Manrope_400Regular' }}
            />
          )}

          {/* ── Mic / Recording-Pill ── */}
          <Animated.View
            style={[
              s.recPillWrap,
              recPillStyle,
              recBarVisible && { flex: 1 },
            ]}
          >
            <View style={[StyleSheet.absoluteFillObject, { borderRadius: 999, backgroundColor: theme.colors.primary.main }]} />

            {/* Mic-Icon (collapsed) */}
            <Animated.View style={[s.micIconWrap, micIconStyle]} pointerEvents={recBarVisible ? 'none' : 'auto'}>
              <Pressable onPress={handleMicPress} hitSlop={8}>
                <MicrophoneIcon size={22} color="#FFFFFF" />
              </Pressable>
            </Animated.View>

            {/* Recording-Controls (expanded) */}
            <Animated.View style={[s.recControlsWrap, recControlsStyle]} pointerEvents={recBarVisible ? 'auto' : 'none'}>
              <Pressable onPress={handleStopRecording} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                <PauseIcon size={18} color="#FFFFFF" />
              </Pressable>

              {renderRecordingWaveform()}

              <Pressable onPress={handleRecDismiss} className="w-9 h-9 rounded-full bg-white items-center justify-center">
                <XMarkOutline size={18} strokeWidth={2.5} color={theme.colors.primary.main2} />
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Send (normal mode) */}
          {!recBarVisible && renderSendButton({ onPress: handleSend, disabled: !hasContent || sending, isLoading: sending })}
        </Animated.View>
      )}

      </View>
    </View>
    </Fragment>
  );
});

const s = StyleSheet.create({
  recPillWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  micIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recControlsWrap: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
});

export default MessageInput;
