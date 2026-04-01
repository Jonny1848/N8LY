/**
 * Vollbild-Kamera fuer Story-Capture: Foto, Video (recordAsync/stopRecording),
 * Front/Rueck, Blitz, Galerie-Shortcut ueber Callback.
 */
import { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { ArrowPathRoundedSquareIcon } from 'react-native-heroicons/outline';

// Max. Video-Laenge in Millisekunden (60s – typisch fuer Stories)
const MAX_VIDEO_MS = 60000;

/**
 * @param {{ onCaptured: (payload: { uri: string, kind: 'photo'|'video', mimeType: string }) => void, onOpenGallery: () => void, onClose: () => void }} props
 */
export default function StoryCamera({ onCaptured, onOpenGallery, onClose }) {
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  /** 'picture' | 'video' */
  const [mode, setMode] = useState('picture');
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Promise von recordAsync – wird mit stopRecording beendet */
  const recordingPromiseRef = useRef(null);
  const [recording, setRecording] = useState(false);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const ensurePermissions = useCallback(async () => {
    if (!camPerm?.granted) {
      const r = await requestCamPerm();
      if (!r.granted) {
        Alert.alert('Kamera', 'Bitte erlaube Kamerazugriff fuer Stories.', [{ text: 'OK' }]);
        return false;
      }
    }
    if (mode === 'video' && !micPerm?.granted) {
      const r = await requestMicPerm();
      if (!r.granted) {
        Alert.alert('Mikrofon', 'Fuer Video-Stories wird das Mikrofon benoetigt.', [{ text: 'OK' }]);
        return false;
      }
    }
    return true;
  }, [camPerm?.granted, micPerm?.granted, mode, requestCamPerm, requestMicPerm]);

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const cycleFlash = () => {
    setFlash((f) => (f === 'off' ? 'on' : 'off'));
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || busy) return;
    const ok = await ensurePermissions();
    if (!ok) return;
    try {
      setBusy(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        onCaptured({ uri: photo.uri, kind: 'photo', mimeType: 'image/jpeg' });
      }
    } catch (e) {
      console.error('[StoryCamera] Foto', e);
      Alert.alert('Kamera', 'Foto konnte nicht aufgenommen werden.', [{ text: 'OK' }]);
    } finally {
      setBusy(false);
    }
  };

  const startVideo = async () => {
    if (!cameraRef.current || !cameraReady || busy) return;
    const ok = await ensurePermissions();
    if (!ok) return;
    try {
      setBusy(true);
      setRecording(true);
      // recordAsync startet die Aufnahme; Promise erfuellt sich nach stopRecording()
      const p = cameraRef.current.recordAsync({ maxDuration: Math.floor(MAX_VIDEO_MS / 1000) });
      recordingPromiseRef.current = p;
    } catch (e) {
      console.error('[StoryCamera] Video start', e);
      setBusy(false);
      setRecording(false);
      Alert.alert('Kamera', 'Video konnte nicht gestartet werden.', [{ text: 'OK' }]);
    }
  };

  const stopVideo = async () => {
    try {
      if (cameraRef.current && recordingPromiseRef.current) {
        cameraRef.current.stopRecording();
        const result = await recordingPromiseRef.current;
        recordingPromiseRef.current = null;
        setRecording(false);
        if (result?.uri) {
          onCaptured({ uri: result.uri, kind: 'video', mimeType: 'video/mp4' });
        }
      }
    } catch (e) {
      console.error('[StoryCamera] Video stop', e);
      Alert.alert('Kamera', 'Video konnte nicht gespeichert werden.', [{ text: 'OK' }]);
    } finally {
      setBusy(false);
      setRecording(false);
    }
  };

  const onShutterPress = () => {
    if (mode === 'picture') {
      takePhoto();
    } else if (recording) {
      stopVideo();
    } else {
      startVideo();
    }
  };

  if (!camPerm) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!camPerm.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Kamerazugriff wird benoetigt.</Text>
        <Pressable onPress={requestCamPerm} style={styles.btnLight}>
          <Text style={styles.btnLightText}>Erlauben</Text>
        </Pressable>
        <Pressable onPress={onClose} style={[styles.btnLight, { marginTop: 12 }]}>
          <Text style={styles.btnLightText}>Schliessen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode={mode === 'video' ? 'video' : 'picture'}
        onCameraReady={() => setCameraReady(true)}
        mirror={facing === 'front'}
      />

      {/* Obere Leiste */}
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.topBtn}>
          <Text style={styles.topBtnText}>✕</Text>
        </Pressable>
        <View style={styles.topRight}>
          <Pressable onPress={cycleFlash} style={styles.topBtn}>
            <Text style={styles.topBtnText}>{flash === 'on' ? '⚡' : '⚡̸'}</Text>
          </Pressable>
          <Pressable onPress={toggleFacing} style={styles.topBtn}>
            <ArrowPathRoundedSquareIcon size={26} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Modus Foto / Video */}
      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode('picture')}>
          <Text style={[styles.modeText, mode === 'picture' && styles.modeTextActive]}>FOTO</Text>
        </Pressable>
        <Pressable onPress={() => setMode('video')}>
          <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>VIDEO</Text>
        </Pressable>
      </View>

      {/* Unten: Galerie + Shutter */}
      <View style={styles.bottomBar}>
        <Pressable onPress={onOpenGallery} style={styles.galleryThumb}>
          <Text style={styles.galleryLabel}>Galerie</Text>
        </Pressable>

        <Pressable
          onPress={onShutterPress}
          disabled={!cameraReady}
          style={[styles.shutter, mode === 'video' && recording && styles.shutterRecording]}
        >
          <View style={[styles.shutterInner, mode === 'video' && recording && styles.shutterInnerSquare]} />
        </Pressable>

        <View style={{ width: 64 }} />
      </View>

      {busy && !recording ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : null}
    </View>
   
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hint: { color: '#fff', marginBottom: 16, fontFamily: 'Manrope_400Regular' },
  btnLight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  btnLightText: { color: '#fff', fontFamily: 'Manrope_600SemiBold' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  topRight: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  topBtn: { padding: 8 },
  topBtnText: { color: '#fff', fontSize: 22, fontFamily: 'Manrope_600SemiBold' },
  modeRow: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    zIndex: 2,
  },
  modeText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  modeTextActive: { color: '#fff' },
  bottomBar: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  galleryThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryLabel: { color: '#fff', fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRecording: { borderColor: '#ff4444' },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  shutterInnerSquare: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ff4444',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
