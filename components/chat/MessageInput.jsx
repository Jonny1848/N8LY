/**
 * MessageInput – Bottom Input Bar (Layout wie Referenz-Screenshot)
 *
 * Normal-Modus: + | Input | Send (drei Elemente)
 * Plus oeffnet ShareSheet mit Kamera, Sprachnachricht, Medien etc.
 *
 * Recording/Preview-Modus: Sprachnachricht-Aufnahme (unveraendert)
 */
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, Fragment, forwardRef, useImperativeHandle } from 'react';
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
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';

/**
 * MessageInput – Layout wie Referenz-Screenshot: + | Input | Send
 * Kamera und Sprachnachricht ueber ShareSheet (Plus-Button)
 */
const MessageInput = forwardRef(function MessageInput(
  { onSendText, onSendVoice, onOpenShareSheet, onSendImage },
  ref
) {
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

  // Kamera: Ladezustand waehrend Upload
  const [uploadingImage, setUploadingImage] = useState(false);

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

  // ============================
  // Kamera: Foto aufnehmen und ueber Parent-Callback senden
  // ============================
  const handleTakePhoto = async () => {
    if (!onSendImage || uploadingImage) return;

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Kamera-Zugriff',
          'Wir benoetigen Zugriff auf deine Kamera, um Fotos aufzunehmen.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        await onSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[CAMERA] Fehler beim Aufnehmen/Senden:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // ============================
  // Medien: Bild aus Galerie waehlen und ueber Parent-Callback senden
  // ============================
  const handlePickFromGallery = async () => {
    if (!onSendImage || uploadingImage) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Fotozugriff',
          'Wir benoetigen Zugriff auf deine Fotos, um Bilder zu teilen.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        await onSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[MEDIEN] Fehler beim Auswaehlen/Senden:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Imperative Handle: Kamera, Medien, Voice von ShareSheet ausloesen
  useImperativeHandle(ref, () => ({
    openCamera: handleTakePhoto,
    openMediaLibrary: handlePickFromGallery,
    startVoiceRecording: handleStartRecording,
  }));

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
  // RENDER – Drei Modi (ohne Schatten, duenne Trennlinie oben wie Screenshot)
  // ============================
  return (
    <Fragment>
    {/* Wrapper: duenne Linie oben trennt Input vom Chat, mehr Platz nach oben, clean */}
    <View className="bg-white border-t border-gray-200 px-4 pt-5 pb-4">
      <View className="flex-row items-center gap-3 min-h-[56px]">
      {recording ? (
        /* ========== RECORDING-MODUS ========== */
        <>
          <Pressable className="w-10 h-10 items-center justify-center" onPress={handleDiscardRecording}>
            <TrashIcon size={24} strokeWidth={2} color="#EF4444" />
          </Pressable>
          <View className="flex-1 flex-row items-center justify-center mx-2">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
            <Text className="text-lg font-bold text-gray-900 mr-2" style={{ fontFamily: 'Manrope_700Bold' }}>
              {formatRecordingTime(recorderState.durationMillis)}
            </Text>
            <Text className="text-sm text-gray-500" style={{ fontFamily: 'Manrope_400Regular' }}>Aufnahme...</Text>
          </View>
          <Pressable
            className="w-10 h-10 rounded-full bg-red-500 items-center justify-center"
            onPress={handleStopRecording}
          >
            <StopIcon size={18} color="#FFFFFF" />
          </Pressable>
        </>
      ) : recordedUri ? (
        /* ========== PREVIEW-MODUS ========== */
        <>
          <Pressable className="w-10 h-10 items-center justify-center" onPress={handleDiscardRecording}>
            <TrashIcon size={24} strokeWidth={2} color="#EF4444" />
          </Pressable>
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-3xl px-3 py-2.5 mx-2">
            <Pressable onPress={togglePreviewPlayback} className="w-8 h-8 rounded-full bg-white items-center justify-center mr-2.5">
              {previewStatus.playing ? (
                <PauseIcon size={16} color="#0066FF" />
              ) : (
                <PlayIcon size={16} color="#0066FF" />
              )}
            </Pressable>
            <View className="flex-1 h-1 rounded bg-gray-200 overflow-hidden">
              <View
                className="h-full rounded bg-n8tly-blue"
                style={{ width: `${previewStatus.duration > 0 ? (previewStatus.currentTime / previewStatus.duration) * 100 : 0}%` }}
              />
            </View>
            <Text className="text-xs font-semibold text-gray-600 ml-2.5 min-w-[32px]" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              {formatRecordingTime(
                previewStatus.playing || previewStatus.currentTime > 0
                  ? previewStatus.currentTime * 1000
                  : (previewStatus.duration || 0) * 1000
              )}
            </Text>
          </View>
          <Pressable
            className="w-10 h-10 rounded-full bg-n8tly-blue items-center justify-center"
            onPress={handleSendVoice}
            disabled={uploadingVoice}
          >
            {uploadingVoice ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <PaperAirplaneIcon size={20} strokeWidth={2.5} color="#FFFFFF" />
            )}
          </Pressable>
        </>
      ) : (
        /* ========== NORMALER MODUS – Screenshot: + | Input (weiss, duenne Border) | Send ========== */
        <>
          {/* Plus-Button: hellgrau, circular */}
          <Pressable
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center shrink-0"
            onPress={onOpenShareSheet}
          >
            <PlusIcon size={22} strokeWidth={2.5} color={theme.colors.neutral.gray[800]} />
          </Pressable>

          {/* Eingabefeld: weiss, staerkere Umrandung, pill-foermig */}
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

          {/* Sende-Button: dunkelgrau, circular */}
          <Pressable
            className={`w-10 h-10 rounded-full items-center justify-center shrink-0 ${
              hasContent ? 'bg-gray-800' : 'bg-gray-300'
            }`}
            onPress={handleSend}
            disabled={!hasContent || sending}
          >
            <PaperAirplaneIcon size={20} strokeWidth={2.5} color="#FFFFFF" />
          </Pressable>
        </>
      )}
      </View>
    </View>
    </Fragment>
  );
});

export default MessageInput;
