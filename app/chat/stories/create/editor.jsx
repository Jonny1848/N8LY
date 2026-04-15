/**
 * Story-Editor: Foto mit Text, Sticker, Stift (Flatten per view-shot) oder Video mit Caption.
 * Layout orientiert an Instagram: X oben links, hohe 9:16-Karte, Werkzeuge rechts vertikal.
 *
 * Phase C (spaeter): Video mit eingebrannten Overlays erfordert zusaetzliche Pipeline
 * (z. B. serverseitig FFmpeg oder JSON-Overlay + angepasster Viewer) – siehe Plan.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { XMarkIcon, ArrowRightIcon } from 'react-native-heroicons/outline';
import { EmojiPickerModal, emojiData } from '@hiraku-ai/react-native-emoji-picker';
import { theme } from '../../../../constants/theme';
import StoryEditorCanvas from '../../../../components/stories/StoryEditorCanvas';
import StoryTextOverlay from '../../../../components/stories/StoryTextOverlay';
import StoryStickerLayer from '../../../../components/stories/StoryStickerLayer';
import StoryDrawLayer from '../../../../components/stories/StoryDrawLayer';
import StoryEditorSidebar from '../../../../components/stories/StoryEditorSidebar';
import StoryEditorStyleBar from '../../../../components/stories/StoryEditorStyleBar';
import { useStoryDraftStore } from '../../../../stores/useStoryDraftStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Abgerundete Ecken der Story-Karte (gleicher Wert wie StoryEditorCanvas) */
const STORY_CARD_RADIUS = 18;
/** Seitenabstand der Preview */
const PREVIEW_SIDE_MARGIN = 8;
/** Platz für unteren „Weiter“-Bereich (kleiner als zuvor = höhere Karte) */
const BOTTOM_ACTION_RESERVE = 76;

function cloneState(s) {
  return {
    texts: s.texts.map((t) => ({ ...t })),
    stickers: s.stickers.map((x) => ({ ...x })),
    paths: s.paths.map((p) => ({ ...p })),
    imageEffect: s.imageEffect ?? 'none',
  };
}

/** Eigenes Modul nötig: useVideoPlayer muss unbedingt bedingungslos pro Mount aufgerufen werden. */
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
  const clip = useStoryDraftStore((s) => s.clips.find((c) => c.id === clipId));

  const shotRef = useRef(null);
  const [mode, setMode] = useState('none');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [texts, setTexts] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [paths, setPaths] = useState([]);
  const [history, setHistory] = useState([]);
  /** Farb-Overlay vor dem Flatten (IG-Filter-light) */
  const [imageEffect, setImageEffect] = useState('none');
  /** Auswahl fuer Style-Leiste: Text, Sticker oder Effekt-Palette */
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [effectsTrayOpen, setEffectsTrayOpen] = useState(false);
  const [textModal, setTextModal] = useState(false);
  /** null = neuer Text; sonst ID des bearbeiteten Blocks (Instagram: Tap öffnet direkt Eingabe) */
  const [editingTextId, setEditingTextId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);

  const previewW = SCREEN_W - PREVIEW_SIDE_MARGIN * 2;
  // Maximale Höhe: 9:16; wenig Reserve oben (X liegt wie bei IG über der Ecke) → wirkt weiter oben
  const previewH = Math.min(
    previewW * (16 / 9),
    SCREEN_H - insets.top - insets.bottom - BOTTOM_ACTION_RESERVE - 4
  );

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-19), cloneState({ texts, stickers, paths, imageEffect })]);
  }, [texts, stickers, paths, imageEffect]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setTexts(prev.texts);
      setStickers(prev.stickers);
      setPaths(prev.paths);
      setImageEffect(prev.imageEffect ?? 'none');
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
      { id, emoji, x: previewW / 2 - 24, y: previewH / 2 - 24, scale: 1 },
    ]);
    setMode('none');
    setSelectedStickerId(id);
    setSelectedTextId(null);
    setEffectsTrayOpen(false);
  };

  /** Text-Overlay schliessen (ohne Speichern der laufenden Eingabe — Canvas bleibt unveraendert) */
  const dismissTextEditor = () => {
    Keyboard.dismiss();
    setTextModal(false);
    setEditingTextId(null);
    setMode('none');
  };

  /** Aa: neuer Text, leeres Feld, Tastatur sofort (Instagram-Flow) */
  const handleOpenText = () => {
    setMode('text');
    setEffectsTrayOpen(false);
    setSelectedStickerId(null);
    setEditingTextId(null);
    setDraftText('');
    setTextModal(true);
  };

  const confirmText = () => {
    const t = draftText.trim();
    Keyboard.dismiss();

    if (editingTextId) {
      pushHistory();
      if (!t) {
        setTexts((items) => items.filter((x) => x.id !== editingTextId));
        setSelectedTextId(null);
      } else {
        changeTextItem(editingTextId, { text: t });
        setSelectedTextId(editingTextId);
      }
      setTextModal(false);
      setEditingTextId(null);
      setMode('none');
      return;
    }

    if (!t) {
      setTextModal(false);
      setEditingTextId(null);
      setMode('none');
      return;
    }
    pushHistory();
    const id = `tx_${Date.now()}`;
    setTexts((items) => [
      ...items,
      {
        id,
        text: t,
        x: Math.max(16, previewW / 2 - 100),
        y: previewH / 2,
        color: strokeColor,
        fontSize: 24,
        fontKey: 'inter700',
        textAlign: 'center',
        pillColor: null,
      },
    ]);
    setTextModal(false);
    setEditingTextId(null);
    setMode('none');
    setSelectedTextId(id);
    setSelectedStickerId(null);
  };

  const clearOverlaySelection = () => {
    setSelectedTextId(null);
    setSelectedStickerId(null);
    setEffectsTrayOpen(false);
  };

  /** Leerer Bildbereich: Auswahl schliessen (nicht beim Zeichnen stören) */
  const onCanvasBackdropPress = () => {
    if (mode === 'draw') return;
    clearOverlaySelection();
  };

  const toggleEffectsTray = () => {
    setEffectsTrayOpen((open) => {
      const next = !open;
      if (next) {
        setSelectedTextId(null);
        setSelectedStickerId(null);
      }
      return next;
    });
  };

  /** Tap auf Text: gleich Eingabemaske + Tastatur wie bei Instagram (nicht nur Style-Leiste) */
  const onSelectText = (id) => {
    const item = texts.find((x) => x.id === id);
    if (!item) return;
    setSelectedTextId(id);
    setSelectedStickerId(null);
    setEffectsTrayOpen(false);
    setEditingTextId(id);
    setDraftText(item.text);
    setMode('text');
    setTextModal(true);
  };

  const onSelectSticker = (id) => {
    setSelectedStickerId(id);
    setSelectedTextId(null);
    setEffectsTrayOpen(false);
  };

  const selectedText = texts.find((t) => t.id === selectedTextId);
  const selectedSticker = stickers.find((s) => s.id === selectedStickerId);

  /** Ein Push pro Slider-Geste: erster onValueChange sichert den Zustand vor dem Ziehen */
  const fontSizeSlideRef = useRef(false);
  const stickerScaleSlideRef = useRef(false);
  useEffect(() => {
    fontSizeSlideRef.current = false;
  }, [selectedTextId]);
  useEffect(() => {
    stickerScaleSlideRef.current = false;
  }, [selectedStickerId]);

  const patchSelectedText = (patch) => {
    if (!selectedTextId) return;
    changeTextItem(selectedTextId, patch);
  };

  /** Waehrend Texteingabe keine Style-Leiste — Fokus wie bei IG aufs Tippen */
  const styleBarVisible =
    !textModal && (effectsTrayOpen || selectedTextId != null || selectedStickerId != null);
  const styleBarVariant = effectsTrayOpen
    ? 'effects'
    : selectedStickerId
      ? 'sticker'
      : selectedTextId
        ? 'text'
        : 'effects';

  /** Gestrichelte Sticker-Umrandung nur mit Sticker-Style-Leiste (nicht bei Effekt-Palette / nur markiert) */
  const showStickerEditChrome = styleBarVisible && styleBarVariant === 'sticker';

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
      router.push('/chat/stories/create/review');
    } catch (e) {
      console.error('[STORY EDITOR] capture', e);
      Alert.alert('Editor', 'Bild konnte nicht exportiert werden.', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const proceedVideo = () => {
    router.push('/chat/stories/create/review');
  };

  if (!clip) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Clip nicht gefunden.</Text>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnTxt}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  if (clip.kind === 'video') {
    return (
      <View style={[styles.root, { paddingTop: 0 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeFabWrap, { top: insets.top + 6, left: 14 }]}
          accessibilityRole="button"
          accessibilityLabel="Schliessen"
        >
          <View style={styles.closeFabCircle}>
            <XMarkIcon size={20} color="#fff" />
          </View>
        </Pressable>

        <View style={[styles.mainStage, { paddingTop: insets.top + 4 }]}>
          <View
            style={[
              styles.videoCard,
              {
                width: previewW,
                height: previewH,
                borderRadius: STORY_CARD_RADIUS,
              },
            ]}
          >
            <StoryVideoPreview uri={clip.localUri} width={previewW} height={previewH} />
          </View>
        </View>

       

        <View
          style={[
            styles.storyNextFabHost,
            { bottom: Math.max(insets.bottom, 20) + 8, right: 20 },
          ]}
        >
          <Pressable onPress={proceedVideo} accessibilityRole="button" accessibilityLabel="Weiter">
            <LinearGradient
              colors={[theme.colors.primary.main, theme.colors.primary.main2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roundGradientButton}
            >
              <ArrowRightIcon size={28} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: 0 }]}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeFabWrap, { top: insets.top + 6, left: 14 }]}
        accessibilityRole="button"
        accessibilityLabel="Schliessen"
      >
        <View style={styles.closeFabCircle}>
          <XMarkIcon size={20} color="#fff" />
        </View>
      </Pressable>

      <View style={[styles.mainStage, { paddingTop: insets.top + 4 }]}>
        <StoryEditorCanvas
          width={previewW}
          height={previewH}
          shotRef={shotRef}
          imageUri={clip.localUri}
          borderRadius={STORY_CARD_RADIUS}
          effectId={imageEffect}
          onBackdropPress={onCanvasBackdropPress}
        >
          <StoryTextOverlay
            items={texts}
            onItemChange={(id, patch) => changeTextItem(id, patch)}
            onSelect={onSelectText}
            canvasW={previewW}
            canvasH={previewH}
            editingTextId={editingTextId}
            textModalOpen={textModal}
          />
          <StoryStickerLayer
            stickers={stickers}
            onStickerChange={(id, patch) => changeStickerItem(id, patch)}
            selectedId={selectedStickerId}
            onSelect={onSelectSticker}
            canvasW={previewW}
            canvasH={previewH}
            showEditChrome={showStickerEditChrome}
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
      </View>

      {/* Rechte Leiste, vertikal zentriert im Bereich unter der Statusleiste */}
      <View
        pointerEvents="box-none"
        style={[
          styles.sideRail,
          {
            top: insets.top + 48,
            bottom: BOTTOM_ACTION_RESERVE + insets.bottom,
          },
        ]}
      >
        <StoryEditorSidebar
          mode={mode}
          onModeChange={setMode}
          onOpenText={handleOpenText}
          onDismissTextEditor={dismissTextEditor}
          strokeColor={strokeColor}
          onColorChange={setStrokeColor}
          onUndo={undo}
          canUndo={history.length > 0}
          onOpenEffects={toggleEffectsTray}
          effectsActive={effectsTrayOpen}
        />
      </View>

      {/* Vollstaendiger Emoji-Katalog sobald Sticker-Modus aktiv (Smiley in Sidebar) */}
      <EmojiPickerModal
        visible={mode === 'sticker'}
        onClose={() => setMode('none')}
        onEmojiSelect={(emoji) => addStickerEmoji(emoji)}
        emojis={emojiData}
        darkMode
        modalTitle="Emoji waehlen"
        searchPlaceholder="Emoji suchen…"
        modalHeightPercentage={72}
      />

      <StoryEditorStyleBar
        visible={styleBarVisible}
        variant={styleBarVariant}
        textSelectionKey={selectedTextId}
        liftAboveFooterPx={Math.max(insets.bottom, 20) + 76}
        fontKey={selectedText?.fontKey ?? 'inter700'}
        onFontKeyChange={(key) => {
          pushHistory();
          patchSelectedText({ fontKey: key });
        }}
        fontSize={selectedText?.fontSize ?? 24}
        onFontSizeChange={(n) => {
          if (!fontSizeSlideRef.current) {
            pushHistory();
            fontSizeSlideRef.current = true;
          }
          patchSelectedText({ fontSize: n });
        }}
        onFontSizeCommit={() => {
          fontSizeSlideRef.current = false;
        }}
        textColor={selectedText?.color ?? '#ffffff'}
        onTextColorChange={(c) => {
          pushHistory();
          patchSelectedText({ color: c });
        }}
        textAlign={selectedText?.textAlign ?? 'left'}
        onTextAlignChange={(a) => {
          pushHistory();
          patchSelectedText({ textAlign: a });
        }}
        stickerScale={selectedSticker?.scale ?? 1}
        onStickerScaleChange={(n) => {
          if (!selectedStickerId) return;
          if (!stickerScaleSlideRef.current) {
            pushHistory();
            stickerScaleSlideRef.current = true;
          }
          changeStickerItem(selectedStickerId, { scale: n });
        }}
        onStickerScaleCommit={() => {
          stickerScaleSlideRef.current = false;
        }}
        effectId={imageEffect}
        onEffectChange={(id) => {
          pushHistory();
          setImageEffect(id);
        }}
      />

      <View
        style={[
          styles.storyNextFabHost,
          { bottom: Math.max(insets.bottom, 20) + 8, right: 20 },
        ]}
      >
        <Pressable
          onPress={proceedPhoto}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Weiter zur Story"
        >
          <LinearGradient
            colors={[theme.colors.primary.main, theme.colors.primary.main2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.roundGradientButton}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ArrowRightIcon size={28} color="#fff" />
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <Modal
        visible={textModal}
        transparent
        animationType="fade"
        onRequestClose={dismissTextEditor}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.textEditKb}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.textEditOverlay, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.textEditHeader}>
              <Pressable
                onPress={dismissTextEditor}
                accessibilityRole="button"
                accessibilityLabel="Abbrechen"
                hitSlop={12}
              >
                <Text style={styles.textEditCancel}>Abbrechen</Text>
              </Pressable>
              <Pressable onPress={confirmText} accessibilityRole="button" accessibilityLabel="Fertig" hitSlop={12}>
                <Text style={styles.textEditDone}>Fertig</Text>
              </Pressable>
            </View>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Dein Text"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.textEditInput}
              multiline
              autoFocus
              textAlignVertical="top"
              textAlign={
                editingTextId
                  ? texts.find((x) => x.id === editingTextId)?.textAlign ?? 'center'
                  : 'center'
              }
              keyboardAppearance="dark"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  muted: { color: '#888', fontFamily: 'Manrope_400Regular' },
  btn: { marginTop: 16, padding: 12 },
  btnTxt: { color: '#6ea8ff', fontFamily: 'Manrope_600SemiBold' },
  /** Pressable ohne eigenen Kreis – der sichtbare Kreis sitzt im Kind-View (zuverlaessiger auf iOS) */
  closeFabWrap: {
    position: 'absolute',
    zIndex: 20,
  },
  /** Halbtransparenter Kreis um das X wie bei Instagram */
  closeFabCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  /** Vorschau oben ausrichten (nicht vertikal zentrieren) – wirkt naeher an der Statusleiste */
  mainStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  /** Rechte Werkzeugleiste vertikal zwischen Statusleiste und unterem FAB zentriert */
  sideRail: {
    position: 'absolute',
    right: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    width: 48,
  },
  videoCard: {
    overflow: 'hidden',
    backgroundColor: '#111',
  },
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
  /** Wie Onboarding age.jsx: runder Gradient-„Weiter“-Button unten rechts */
  storyNextFabHost: {
    position: 'absolute',
    zIndex: 25,
  },
  roundGradientButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  /** Vollbild-Texteditor angelehnt an Instagram Story */
  textEditKb: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  textEditOverlay: {
    flex: 1,
    paddingHorizontal: 20,
  },
  textEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textEditCancel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    fontFamily: 'Manrope_500Medium',
  },
  textEditDone: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
  },
  textEditInput: {
    flex: 1,
    fontSize: 28,
    lineHeight: 36,
    color: '#fff',
    fontFamily: 'Manrope_600SemiBold',
    paddingVertical: 12,
  },
});
