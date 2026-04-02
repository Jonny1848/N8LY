/**
 * Vollbild-Kamera fuer Story-Capture: Foto, Video (recordAsync/stopRecording),
 * Front/Rueck, Blitz, Galerie mit letztem Medien-Vorschaubild, Lang-Druck = Video.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { ArrowPathRoundedSquareIcon } from 'react-native-heroicons/outline';

// Max. Video-Laenge in Millisekunden (60s – typisch fuer Stories)
const MAX_VIDEO_MS = 60000;
/** Ab dieser Dauer zaehlt der Shutter als „Gedrueckthalten“ und startet Video-Aufnahme */
const LONG_PRESS_MS = 450;

/**
 * @param {{ onCaptured: (payload: { uri: string, kind: 'photo'|'video', mimeType: string }) => void, onOpenGallery: () => void, onClose: () => void }} props
 */
export default function StoryCamera({ onCaptured, onOpenGallery, onClose }) {
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  /** 'picture' | 'video' (TAB) – Kurz-Tap im Video-Tab toggelt; Lang-Druck immer Video bis Loslassen */
  const [mode, setMode] = useState('picture');
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Promise von recordAsync – wird mit stopRecording beendet */
  const recordingPromiseRef = useRef(null);
  const [recording, setRecording] = useState(false);

  /** Letztes Foto aus der Mediathek fuer die Galerie-Kachel (nur Anzeige) */
  const [galleryThumbUri, setGalleryThumbUri] = useState(null);

  /** Shutter: Lang-Druck / Loslassen (Foto-Modus + gemeinsames Video-Halten) */
  const pressStartRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const holdRecordRef = useRef(false);
  /** Nach Video per Loslassen: einen folgenden onPress im Video-Tab unterdruecken */
  const suppressNextVideoPressRef = useRef(false);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  /**
   * Fuer reine Fotos: nur Kamera.
   * Fuer Video (egal welcher TAB oder Lang-Druck): immer Mikrofon mit anfragen.
   */
  const ensurePhotoPermissions = useCallback(async () => {
    if (!camPerm?.granted) {
      const r = await requestCamPerm();
      if (!r.granted) {
        Alert.alert('Kamera', 'Bitte erlaube Kamerazugriff für Stories.', [{ text: 'OK' }]);
        return false;
      }
    }
    return true;
  }, [camPerm?.granted, requestCamPerm]);

  const ensureVideoPermissions = useCallback(async () => {
    const camOk = await ensurePhotoPermissions();
    if (!camOk) return false;
    if (!micPerm?.granted) {
      const r = await requestMicPerm();
      if (!r.granted) {
        Alert.alert('Mikrofon', 'Für Video-Stories wird das Mikrofon benötigt.', [{ text: 'OK' }]);
        return false;
      }
    }
    return true;
  }, [ensurePhotoPermissions, micPerm?.granted, requestMicPerm]);

  /** Neuestes Bild aus der Bibliothek laden (Sortierung: creationTime absteigend) */
  const loadLatestGalleryThumbnail = useCallback(async () => {
    try {
      const perm = await MediaLibrary.getPermissionsAsync();
      let status = perm.status;
      if (status !== 'granted') {
        const req = await MediaLibrary.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        setGalleryThumbUri(null);
        return;
      }
      const page = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      const asset = page.assets[0];
      if (!asset?.uri) {
        setGalleryThumbUri(null);
        return;
      }
      // Auf iOS liefert getAssetInfoAsync oft eine ladefreundlichere file://-URI
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      setGalleryThumbUri(info.localUri || asset.uri);
    } catch (e) {
      console.warn('[StoryCamera] Galerie-Vorschau', e);
      setGalleryThumbUri(null);
    }
  }, []);

  useEffect(() => {
    loadLatestGalleryThumbnail();
  }, [loadLatestGalleryThumbnail]);

  // Bei Rueckkehr zur Kamera Vorschau aktualisieren (neues Foto in der Bibliothek)
  useFocusEffect(
    useCallback(() => {
      loadLatestGalleryThumbnail();
    }, [loadLatestGalleryThumbnail])
  );

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const cycleFlash = () => {
    setFlash((f) => (f === 'off' ? 'on' : 'off'));
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || busy || recording) return;
    const ok = await ensurePhotoPermissions();
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
    if (!cameraRef.current || !cameraReady || busy || recordingPromiseRef.current) return;
    const ok = await ensureVideoPermissions();
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
      recordingPromiseRef.current = null;
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
      recordingPromiseRef.current = null;
    }
  };

  const onShutterPressIn = () => {
    if (recording) return;
    pressStartRef.current = Date.now();
    longPressTimerRef.current = setTimeout(() => {
      holdRecordRef.current = true;
      startVideo();
    }, LONG_PRESS_MS);
  };

  const onShutterPressOut = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;

    if (holdRecordRef.current) {
      stopVideo();
      holdRecordRef.current = false;
      suppressNextVideoPressRef.current = true;
      return;
    }

    const elapsed = Date.now() - pressStartRef.current;
    if (mode === 'picture' && elapsed < LONG_PRESS_MS && !recordingPromiseRef.current) {
      takePhoto();
    }
  };

  const onShutterPress = () => {
    if (mode !== 'video') return;
    if (suppressNextVideoPressRef.current) {
      suppressNextVideoPressRef.current = false;
      return;
    }
    if (recording) {
      stopVideo();
    } else {
      startVideo();
    }
  };

  // Vorschau auf Video umschalten sobald aufgenommen wird (auch im Foto-Tab per Lang-Druck)
  const cameraPreviewMode = mode === 'video' || recording ? 'video' : 'picture';

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
        mode={cameraPreviewMode}
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

      {/* Unten: Galerie-Vorschau + Shutter (Lang-Druck = Video) */}
      <View style={styles.bottomBar}>
        <Pressable onPress={onOpenGallery} style={styles.galleryThumb}>
          {galleryThumbUri ? (
            <Image
              source={{ uri: galleryThumbUri }}
              style={styles.galleryImage}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={styles.galleryLabel}>Galerie</Text>
          )}
        </Pressable>

        <Pressable
          onPressIn={onShutterPressIn}
          onPressOut={onShutterPressOut}
          onPress={onShutterPress}
          disabled={!cameraReady}
          style={[styles.shutter, recording && styles.shutterRecording]}
        >
          <View style={[styles.shutterInner, recording && styles.shutterInnerSquare]} />
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
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
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
