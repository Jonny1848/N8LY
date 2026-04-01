/**
 * Story-Editor: Foto mit Text, Sticker, Stift (Flatten per view-shot) oder Video mit Caption.
 *
 * Phase C (spaeter): Video mit eingebrannten Overlays erfordert zusaetzliche Pipeline
 * (z. B. serverseitig FFmpeg oder JSON-Overlay + angepasster Viewer) – siehe Plan.
 */
import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useVideoPlayer, VideoView } from 'expo-video';
import StoryEditorCanvas from '../../../components/stories/StoryEditorCanvas';
import StoryTextOverlay from '../../../components/stories/StoryTextOverlay';
import StoryStickerLayer, { STORY_STICKER_EMOJIS } from '../../../components/stories/StoryStickerLayer';
import StoryDrawLayer from '../../../components/stories/StoryDrawLayer';
import StoryToolbar from '../../../components/stories/StoryToolbar';
import { useStoryDraftStore } from '../../../stores/useStoryDraftStore';

const { width: SCREEN_W } = Dimensions.get('window');

function cloneState(s) {
  return {
    texts: s.texts.map((t) => ({ ...t })),
    stickers: s.stickers.map((x) => ({ ...x })),
    paths: s.paths.map((p) => ({ ...p })),
  };
}

/** Eigenes Modul noetig: useVideoPlayer muss unbedingt bedingungslos pro Mount aufgerufen werden. */
function StoryVideoPreview({ uri, width, height }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="cover"
      nativeControls
    />
  );
}

export default function StoryEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams().clipId;
  const clipId = Array.isArray(rawId) ? rawId[0] : rawId;

  const updateClip = useStoryDraftStore((s) => s.updateClip);
  // Selector: Clip aus Liste, damit TextInput/Caption bei updateClip neu rendert
  const clip = useStoryDraftStore((s) => s.clips.find((c) => c.id === clipId));

  const shotRef = useRef(null);
  const [mode, setMode] = useState('none');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [texts, setTexts] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [paths, setPaths] = useState([]);
  const [history, setHistory] = useState([]);
  const [textModal, setTextModal] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);

  const previewW = SCREEN_W;
  const previewH = Math.min(previewW * (16 / 9), Dimensions.get('window').height - insets.top - insets.bottom - 220);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-19), cloneState({ texts, stickers, paths })]);
  }, [texts, stickers, paths]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setTexts(prev.texts);
      setStickers(prev.stickers);
      setPaths(prev.paths);
      return h.slice(0, -1);
    });
  }, []);

  const onAddStroke = useCallback(
    (stroke) => {
      pushHistory();
      setPaths((p) => [...p, stroke]);
    },
    [pushHistory]
  );

  const changeTextItem = (id, patch) => {
    setTexts((items) => items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const changeStickerItem = (id, patch) => {
    setStickers((items) => items.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addStickerEmoji = (emoji) => {
    pushHistory();
    const id = `st_${Date.now()}`;
    setStickers((s) => [
      ...s,
      { id, emoji, x: previewW / 2 - 24, y: previewH / 2 - 24 },
    ]);
    setMode('none');
  };

  const openTextModal = () => {
    setDraftText('');
    setTextModal(true);
  };

  const confirmText = () => {
    const t = draftText.trim();
    if (!t) {
      setTextModal(false);
      return;
    }
    pushHistory();
    const id = `tx_${Date.now()}`;
    setTexts((items) => [
      ...items,
      { id, text: t, x: Math.max(16, previewW / 2 - 80), y: previewH / 2, color: strokeColor },
    ]);
    setTextModal(false);
    setMode('none');
  };

  /** Flatten Foto und Metadaten in den Draft schreiben, dann Review */
  const proceedPhoto = async () => {
    if (!clip || !shotRef.current) return;
    try {
      setSaving(true);
      const uri = await captureRef(shotRef, {
        format: 'jpg',
        quality: 0.88,
        result: 'tmpfile',
      });
      updateClip(clip.id, { exportUri: uri, mimeType: 'image/jpeg' });
      router.push('/stories/create/review');
    } catch (e) {
      console.error('[STORY EDITOR] capture', e);
      Alert.alert('Editor', 'Bild konnte nicht exportiert werden.', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const proceedVideo = () => {
    router.push('/stories/create/review');
  };

  if (!clip) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Clip nicht gefunden.</Text>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnTxt}>Zurueck</Text>
        </Pressable>
      </View>
    );
  }

  if (clip.kind === 'video') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerLink}>Zurueck</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Video</Text>
          <View style={{ width: 56 }} />
        </View>
        <View style={{ width: previewW, height: previewH, alignSelf: 'center' }}>
          <StoryVideoPreview uri={clip.localUri} width={previewW} height={previewH} />
        </View>
        <View style={styles.pad}>
          <Text style={styles.label}>Caption (optional)</Text>
          <TextInput
            value={clip.caption || ''}
            onChangeText={(t) => updateClip(clip.id, { caption: t || null })}
            placeholder="Text zur Story…"
            placeholderTextColor="#888"
            style={styles.input}
            multiline
          />
          <Text style={styles.hintPhaseC}>
            Hinweis Phase C: Zeichnung/Sticker auf Video sind hier noch nicht ins Material
            eingebrannt; dafuer waere FFmpeg oder ein Overlay-JSON im Viewer noetig.
          </Text>
          <Pressable onPress={proceedVideo} style={styles.primary}>
            <Text style={styles.primaryTxt}>Weiter</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerLink}>Zurueck</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Bearbeiten</Text>
        <View style={{ width: 56 }} />
      </View>

      <StoryEditorCanvas width={previewW} height={previewH} shotRef={shotRef} imageUri={clip.localUri}>
        <StoryTextOverlay
          items={texts}
          onItemChange={(id, patch) => changeTextItem(id, patch)}
          canvasW={previewW}
          canvasH={previewH}
        />
        <StoryStickerLayer
          stickers={stickers}
          onStickerChange={(id, patch) => changeStickerItem(id, patch)}
          canvasW={previewW}
          canvasH={previewH}
        />
        <StoryDrawLayer
          width={previewW}
          height={previewH}
          paths={paths}
          onAddStroke={onAddStroke}
          active={mode === 'draw'}
          strokeColor={strokeColor}
          strokeWidth={4}
        />
      </StoryEditorCanvas>

      {mode === 'sticker' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stickerStrip}>
          {STORY_STICKER_EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => addStickerEmoji(e)} style={styles.stickerPick}>
              <Text style={styles.stickerPickTxt}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <StoryToolbar
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          if (m === 'text') openTextModal();
        }}
        strokeColor={strokeColor}
        onColorChange={setStrokeColor}
        onUndo={undo}
        canUndo={history.length > 0}
      />

      <Pressable onPress={proceedPhoto} disabled={saving} style={styles.primary}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryTxt}>Weiter</Text>
        )}
      </Pressable>

      <Modal visible={textModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Text</Text>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Schreib etwas…"
              placeholderTextColor="#888"
              style={styles.modalInput}
              multiline
              autoFocus
            />
            <View style={styles.modalRow}>
              <Pressable onPress={() => setTextModal(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnTxt}>Abbrechen</Text>
              </Pressable>
              <Pressable onPress={confirmText} style={[styles.modalBtn, styles.modalBtnPrimary]}>
                <Text style={[styles.modalBtnTxt, { color: '#fff' }]}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  muted: { color: '#888', fontFamily: 'Manrope_400Regular' },
  btn: { marginTop: 16, padding: 12 },
  btnTxt: { color: '#6ea8ff', fontFamily: 'Manrope_600SemiBold' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLink: { color: '#7eb6ff', fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerTitle: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  pad: { padding: 16 },
  label: { color: '#ccc', marginBottom: 6, fontFamily: 'Manrope_500Medium' },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    minHeight: 72,
    fontFamily: 'Manrope_400Regular',
  },
  hintPhaseC: {
    marginTop: 10,
    color: '#777',
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  primary: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#5b8cff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  stickerStrip: { maxHeight: 56, marginVertical: 6, paddingHorizontal: 8 },
  stickerPick: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  stickerPickTxt: { fontSize: 28 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#222',
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 18, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    minHeight: 88,
    fontFamily: 'Manrope_400Regular',
  },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalBtnPrimary: { backgroundColor: '#5b8cff', borderRadius: 10 },
  modalBtnTxt: { color: '#7eb6ff', fontFamily: 'Manrope_600SemiBold' },
});
