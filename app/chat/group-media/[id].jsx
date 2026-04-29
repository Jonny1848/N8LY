/**
 * Gemeinsame Medien – Bildgalerie einer Gruppe
 *
 * Zeigt alle Bilder, die in der Konversation geteilt wurden, als 3-spaltiges Grid.
 * Antippen öffnet eine Vollbild-Vorschau (ImagePreviewModal).
 *
 * Route: /chat/group-media/[id]  (id = conversation_id)
 */
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { theme } from '../../../constants/theme';
import { getConversationImages } from '../../../services/chatService';
import ImagePreviewModal from '../../../components/chat/ImagePreviewModal';

// Anzahl Spalten im Grid
const NUM_COLS = 3;
// Abstand zwischen den Kacheln
const GAP = 2;

export default function GroupMediaScreen() {
  const router = useRouter();
  const rawId = useLocalSearchParams().id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { width: screenWidth } = useWindowDimensions();
  // Kachelgrösse: gleiche Breite und Höhe (quadratisch)
  const tileSize = (screenWidth - GAP * (NUM_COLS - 1)) / NUM_COLS;

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUri, setPreviewUri] = useState(null);

  // Alle Bilder der Konversation laden
  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await getConversationImages(conversationId);
      setImages(data);
    } catch (err) {
      console.error('[GroupMedia] load:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Render einer Bildkachel ──
  const renderItem = useCallback(
    ({ item, index }) => {
      // Rechter Abstand: kein Gap nach der letzten Spalte
      const isLastInRow = (index + 1) % NUM_COLS === 0;
      return (
        <Pressable
          onPress={() => setPreviewUri(item.media_url)}
          style={[
            styles.tile,
            {
              width: tileSize,
              height: tileSize,
              marginRight: isLastInRow ? 0 : GAP,
              marginBottom: GAP,
            },
          ]}
          accessibilityRole="imagebutton"
          accessibilityLabel="Bild in Vollbild anzeigen"
        >
          <Image
            source={{ uri: item.media_url }}
            style={{ width: tileSize, height: tileSize }}
            cachePolicy="disk"
            contentFit="cover"
          />
        </Pressable>
      );
    },
    [tileSize],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── NavBar ── */}
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
          >
            <ChevronLeftIcon size={22} color={theme.colors.neutral.gray[800]} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.navTitle}>Gemeinsame Medien</Text>
          {/* Platzhalter für symmetrisches Layout */}
          <View style={styles.backBtn} />
        </View>

        {/* ── Inhalt ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        ) : images.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🖼️</Text>
            <Text style={styles.emptyTitle}>Noch keine Medien</Text>
            <Text style={styles.emptySubtitle}>
              Geteilte Bilder erscheinen hier.
            </Text>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={NUM_COLS}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Vollbild-Vorschau */}
      <ImagePreviewModal
        visible={!!previewUri}
        imageUri={previewUri}
        onClose={() => setPreviewUri(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 17,
    color: theme.colors.neutral.gray[900],
  },
  grid: {
    padding: GAP,
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.gray[100],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.semibold,
    fontSize: 17,
    color: theme.colors.neutral.gray[700],
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.neutral.gray[500],
    textAlign: 'center',
  },
});
