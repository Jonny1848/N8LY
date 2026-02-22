/**
 * MessageInput – Bottom Input Bar mit drei Modi
 *
 * Drei Zustaende:
 *  1. Normal: Attachment, Textfeld + Emoji, Kamera, Mikrofon / Send
 *  2. Recording: Verwerfen, Timer mit Puls, Stopp
 *  3. Preview: Verwerfen, Play/Pause + Fortschrittsbalken, Senden
 *
 * Kapselt alle Audio-Recording-Hooks (useAudioRecorder, useAudioPlayer)
 * intern – der Eltern-Screen muss sich nicht um Aufnahme-Details kuemmern.
 *
 * Props:
 *  - onSendText(text): Callback wenn eine Text-Nachricht gesendet werden soll
 *  - onSendVoice(localUri, waveformData): Callback wenn eine Sprachnachricht gesendet werden soll
 *                            (Upload + DB-Eintrag macht der Parent/Store)
 *  - onOpenShareSheet: Callback fuer den PaperClip-Button
 */
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect, Fragment } from 'react';
import { theme } from '../../constants/theme';
import {
  PaperClipIcon,
  CameraIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';
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
} from 'expo-audio';
import EmojiPickerModal, { emojiData } from '@hiraku-ai/react-native-emoji-picker';

export default function MessageInput({ onSendText, onSendVoice, onOpenShareSheet }) {
  // ============================
  // Lokaler UI-State
  // ============================
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Sprachnachrichten: Aufnahme-States (waveformSamples wird in Schritt 4 befuellt)
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [waveformSamples, setWaveformSamples] = useState([]);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Emoji-Picker: Sichtbarkeit des Modals
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  // expo-audio: Recorder mit Metering fuer Waveform (Lautstaerke pro Zeitscheibe)
  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  };
  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder, 16);

  // Audio-Player fuer die Vorschau der eigenen Aufnahme (vor dem Senden)
  const previewPlayer = useAudioPlayer(recordedUri, 16);
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  // Sende-Button nur anzeigen wenn Text vorhanden ist
  const hasContent = inputText.trim().length > 0;

  // Metering waehrend der Aufnahme sammeln (fuer Waveform-Anzeige)
  // recorderState.metering: dB-Wert (-160 bis 0), wird alle 200ms aktualisiert
  useEffect(() => {
    if (!recording || !recorderState.isRecording) return;
    const raw = recorderState.metering;
    // dB zu 0-1 normalisieren (-60 dB = leise, 0 dB = laut)
    const normalized =
      raw == null ? 0.3 : Math.max(0.15, Math.min(1, (raw + 60) / 60));
    setWaveformSamples((prev) => [...prev, normalized]);
  }, [recording, recorderState.isRecording, recorderState.metering, recorderState.durationMillis]);

 
  // Hilfsfunktion: Dauer in mm:ss formatieren
  const formatRecordingTime = (millis) => {
    const totalSec = Math.floor((millis || 0) / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ============================
  // Text-Nachricht senden
  // ============================
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    try {
      await onSendText(text);
    } catch (err) {
      console.error('Fehler beim Senden:', err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // ============================
  // Sprachnachricht: Aufnahme starten
  // ============================
  const handleStartRecording = async () => {
    try {
      const permStatus = await AudioModule.requestRecordingPermissionsAsync();
      if (!permStatus.granted) {
        console.warn('[VOICE] Mikrofon-Berechtigung verweigert');
        return;
      }
      await audioRecorder.prepareToRecordAsync(recordingOptions);
      audioRecorder.record();
      setRecording(true);
      setRecordedUri(null);
      setWaveformSamples([]); // Reset fuer neue Aufnahme
    } catch (err) {
      console.error('[VOICE] Fehler beim Starten der Aufnahme:', err);
    }
  };

  // ============================
  // Sprachnachricht: Aufnahme stoppen → wechselt in Preview
  // ============================
  const handleStopRecording = async () => {
    try {
      await audioRecorder.stop();
      setRecording(false);
      setRecordedUri(audioRecorder.uri);
    } catch (err) {
      console.error('[VOICE] Fehler beim Stoppen der Aufnahme:', err);
      setRecording(false);
    }
  };

  // ============================
  // Sprachnachricht: Aufnahme verwerfen
  // ============================
  const handleDiscardRecording = () => {
    setRecording(false);
    setRecordedUri(null);
    setWaveformSamples([]);
    if (previewStatus.playing) {
      previewPlayer.pause();
    }
  };

  // ============================
  // Sprachnachricht: Hochladen und Senden (ueber Parent-Callback)
  // ============================
  const handleSendVoice = async () => {
    const uri = recordedUri || audioRecorder.uri;
    if (!uri || uploadingVoice) return;

    setUploadingVoice(true);
    try {
      await onSendVoice(uri, waveformSamples);
      setRecordedUri(null);
      setWaveformSamples([]);
      setRecording(false);
    } catch (err) {
      console.error('[VOICE] Fehler beim Senden der Sprachnachricht:', err);
    } finally {
      setUploadingVoice(false);
    }
  };

  /** Preview-Wiedergabe umschalten (Play/Pause) */
  const togglePreviewPlayback = () => {
    if (previewStatus.playing) {
      previewPlayer.pause();
    } else {
      if (previewStatus.currentTime >= previewStatus.duration && previewStatus.duration > 0) {
        previewPlayer.seekTo(0);
      }
      previewPlayer.play();
    }
  };

  // ============================
  // RENDER – Drei Modi
  // ============================
  return (
    <Fragment>
    <View style={styles.inputBar}>
      {recording ? (
        /* ========== RECORDING-MODUS ========== */
        <View style={styles.inputRow}>
          {/* Verwerfen-Button */}
          <Pressable style={styles.inputAction} onPress={handleDiscardRecording}>
            <TrashIcon size={24} strokeWidth={2} color="#EF4444" />
          </Pressable>

          {/* Timer-Anzeige mit rotem Puls-Punkt */}
          <View style={recStyles.timerContainer}>
            <View style={recStyles.pulseCircle} />
            <Text style={recStyles.timerText}>
              {formatRecordingTime(recorderState.durationMillis)}
            </Text>
            <Text style={recStyles.timerLabel}>Aufnahme...</Text>
          </View>

          {/* Stopp-Button */}
          <Pressable
            style={[styles.sendBtn, { backgroundColor: '#EF4444' }]}
            onPress={handleStopRecording}
          >
            <StopIcon size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : recordedUri ? (
        /* ========== PREVIEW-MODUS ========== */
        <View style={styles.inputRow}>
          {/* Verwerfen */}
          <Pressable style={styles.inputAction} onPress={handleDiscardRecording}>
            <TrashIcon size={24} strokeWidth={2} color="#EF4444" />
          </Pressable>

          {/* Play/Pause + Fortschrittsbalken */}
          <View style={recStyles.previewContainer}>
            <Pressable onPress={togglePreviewPlayback} style={recStyles.previewPlayBtn}>
              {previewStatus.playing ? (
                <PauseIcon size={16} color={theme.colors.primary.main} />
              ) : (
                <PlayIcon size={16} color={theme.colors.primary.main} />
              )}
            </Pressable>
            <View style={recStyles.previewTrack}>
              <View style={[recStyles.previewTrackFill, {
                width: `${previewStatus.duration > 0 ? (previewStatus.currentTime / previewStatus.duration) * 100 : 0}%`,
              }]} />
            </View>
            <Text style={recStyles.previewDuration}>
              {formatRecordingTime(
                previewStatus.playing || previewStatus.currentTime > 0
                  ? previewStatus.currentTime * 1000
                  : (previewStatus.duration || 0) * 1000
              )}
            </Text>
          </View>

          {/* Sende-Button */}
          <Pressable
            style={[styles.sendBtn, { backgroundColor: theme.colors.primary.main }]}
            onPress={handleSendVoice}
            disabled={uploadingVoice}
          >
            {uploadingVoice ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <PaperAirplaneIcon size={20} strokeWidth={2.5} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      ) : (
        /* ========== NORMALER MODUS ========== */
        <View style={styles.inputRow}>
          {/* Attachment-Button – oeffnet "Inhalt teilen" */}
          <Pressable style={styles.inputAction} onPress={onOpenShareSheet}>
            <PaperClipIcon size={26} strokeWidth={2} color={theme.colors.neutral.gray[600]} />
          </Pressable>

          {/* Eingabefeld + Emoji */}
          <View style={styles.inputFieldContainer}>
            <TextInput
              style={styles.inputField}
              placeholder="Nachricht schreiben..."
              placeholderTextColor={theme.colors.neutral.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={styles.emojiBtn}
              onPress={() => setEmojiPickerVisible(true)}
            >
              <FaceSmileIcon size={26} strokeWidth={2} color={theme.colors.neutral.gray[500]} />
            </Pressable>
          </View>

          {/* Kamera-Button: nur wenn kein Text */}
          {!hasContent && (
            <Pressable style={styles.inputAction}>
              <CameraIcon size={26} strokeWidth={2} color={theme.colors.neutral.gray[600]} />
            </Pressable>
          )}

          {/* Mikrofon-Button: nur wenn kein Text */}
          {!hasContent && (
            <Pressable style={styles.inputAction} onPress={handleStartRecording}>
              <MicrophoneIcon size={26} strokeWidth={2} color={theme.colors.neutral.gray[600]} />
            </Pressable>
          )}

          {/* Sende-Button: nur wenn Text vorhanden */}
          {hasContent && (
            <Pressable
              style={[styles.sendBtn, { backgroundColor: theme.colors.primary.main }]}
              onPress={handleSend}
              disabled={sending}
            >
              <PaperAirplaneIcon size={20} strokeWidth={2.5} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      )}
    </View>

    {/* Emoji-Picker Modal – oeffnet sich beim Tippen auf das Smiley-Icon */}
    <EmojiPickerModal
      visible={emojiPickerVisible}
      onClose={() => setEmojiPickerVisible(false)}
      onEmojiSelect={(emoji) => setInputText((prev) => prev + emoji)}
      emojis={emojiData}
      searchPlaceholder="Emoji suchen..."
    />
    </Fragment>
  );
}

// ============================
// Styles: Input Bar (allgemein)
// ============================
const styles = StyleSheet.create({
  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFieldContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.neutral.gray[100],
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
    minHeight: 42,
    maxHeight: 120,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.neutral.gray[900],
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 0,
    maxHeight: 100,
  },
  emojiBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================
// Styles: Aufnahme-Modus und Preview-Modus
// ============================
const recStyles = StyleSheet.create({
  timerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  pulseCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  timerText: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.neutral.gray[900],
    marginRight: 8,
  },
  timerLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    color: theme.colors.neutral.gray[500],
  },
  previewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.gray[100],
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
  },
  previewPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  previewTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neutral.gray[200],
    overflow: 'hidden',
  },
  previewTrackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.primary.main,
  },
  previewDuration: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.neutral.gray[600],
    marginLeft: 10,
    minWidth: 32,
  },
});
