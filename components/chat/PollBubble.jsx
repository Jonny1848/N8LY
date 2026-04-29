/**
 * PollBubble – Interaktive Umfragen-Karte im Chat
 *
 * Design nach Screenshot-Vorlage:
 * - Weisse Karte (unabhaengig vom Absender)
 * - Fragetext (gross, fett)
 * - Gesamtstimmen + Abstimm-Hinweis
 * - Optionen mit Fortschrittsbalken, gestapelten Avataren + Prozentzahl
 *   - Eigene gewaehlte Option: Blauer Akzent (primary.main)
 *   - Fuehrende Option (nicht eigene): Lila Akzent (accent.main)
 *   - Andere: Grau
 * - Vor der Abstimmung: Prozentzahlen versteckt ("Abstimmen um Ergebnisse zu sehen")
 * - Ergebnis: Live-Realtime via Supabase
 *
 * Props:
 *  - message:  Nachrichten-Objekt (message_type === 'poll', content === JSON-String)
 *  - userId:   UUID des aktuellen Users
 *  - isOwn:    ob die Nachricht vom aktuellen User stammt
 */
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';
import {
  getPollVotes,
  castVote,
  deleteVote,
  subscribeToPollVotes,
  unsubscribeFromPollVotes,
} from '../../services/pollService';
import useAuthStore from '../../stores/useAuthStore';

// ============================
// Farb-Konstanten aus Theme
// ============================
const COLOR_OWN   = theme.colors.primary.main;    // #0066FF – eigene Wahl
const COLOR_LEAD  = theme.colors.accent.main;     // #8B5CF6 – fuehrende Option (nicht eigene)
const COLOR_GRAY  = theme.colors.neutral.gray[100]; // #F3F4F6 – sonstige Optionen

const BG_OWN   = `${COLOR_OWN}18`;   // ~10% Opazitaet
const BG_LEAD  = `${COLOR_LEAD}18`;
const BG_GRAY  = COLOR_GRAY;

// Maximale Anzahl sichtbarer Avatare pro Option
const MAX_AVATARS = 3;
// Groesse des Avatar-Chips (etwas groesser fuer bessere Erkennbarkeit)
const AVATAR_SIZE = 28;
// Horizontaler Versatz: staerkere Ueberlappung wegen groesserer Chips
const AVATAR_OFFSET = -10;

export default function PollBubble({ message, userId, isOwn }) {
  // Eigenes Profil fuer den optimistischen Avatar beim ersten Vote
  const ownProfile = useAuthStore((s) => s.profile);

  // ============================
  // Poll-Daten aus message.content parsen
  // ============================
  const pollData = parsePollContent(message.content);

  // ============================
  // State
  // ============================
  const [votes, setVotes] = useState([]);       // Alle Stimmen mit Profilen
  const [loading, setLoading] = useState(true); // Nur beim initialen Laden

  // Referenz fuer Realtime-Channel (Cleanup beim Unmount)
  const channelRef = useRef(null);

  // ============================
  // Stimmen laden (und bei Realtime-Events neu laden)
  // ============================
  const loadVotes = useCallback(async () => {
    try {
      const data = await getPollVotes(message.id);
      setVotes(data);
    } catch (err) {
      console.error('[PollBubble] Fehler beim Laden der Stimmen:', err);
    } finally {
      setLoading(false);
    }
  }, [message.id]);

  useEffect(() => {
    loadVotes();
    // Realtime-Abo: bei Stimmaenderungen anderer User neu laden
    channelRef.current = subscribeToPollVotes(message.id, loadVotes);
    return () => {
      unsubscribeFromPollVotes(channelRef.current);
    };
  }, [message.id, loadVotes]);

  // ============================
  // Abstimmen
  // ============================

  const userVote = votes.find((v) => v.user_id === userId) ?? null;
  const hasVoted = !!userVote;

  const handleVote = useCallback(
    async (optionId) => {
      if (!pollData) return;

      const current = userVote?.option_ids ?? [];
      let newOptionIds;

      if (pollData.allow_multiple) {
        // Multiple-Choice: Option toggeln; leeres Array = Stimme zurueckziehen
        newOptionIds = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      } else {
        // Single-Choice: gleiche Option nochmals tippen = Stimme zurueckziehen
        newOptionIds = current[0] === optionId ? [] : [optionId];
      }

      // ── Optimistisches UI: lokal sofort aendern, kein Ladeindikator ──
      // Snapshot fuer Rollback bei API-Fehler
      const prevVotes = votes;
      // ownProfile liefert Profildaten auch beim allerersten Vote (wenn userVote noch null ist)
      const profileForOptimistic = userVote?.profiles ?? ownProfile ?? null;
      setVotes(applyOptimisticVote(votes, userId, newOptionIds, userVote, profileForOptimistic));

      try {
        if (newOptionIds.length === 0) {
          // Alle Optionen abgewaehlt: Stimme loeschen
          await deleteVote(message.id, userId);
        } else {
          await castVote(message.id, userId, newOptionIds);
        }
        // Realtime sorgt fuer den finalen Sync; kein manuelles loadVotes noetig
      } catch (err) {
        console.error('[PollBubble] Fehler bei der Stimmabgabe:', err);
        // Rollback auf vorherigen Zustand
        setVotes(prevVotes);
      }
    },
    [pollData, userVote, votes, message.id, userId],
  );

  // ============================
  // Berechnungen
  // ============================
  if (!pollData) {
    // Defektes Poll-JSON – Fehlerfall
    return (
      <View className="rounded-2xl p-4 bg-gray-100">
        <Text className="text-sm text-gray-400" style={{ fontFamily: 'Manrope_400Regular' }}>
          Umfrage konnte nicht geladen werden.
        </Text>
      </View>
    );
  }

  const totalVotes = votes.length;

  // Pro Option: Stimmenanzahl, Prozent, Waehlende (fuer Avatare)
  const optionStats = pollData.options.map((opt) => {
    const voterRows = votes.filter((v) => v.option_ids?.includes(opt.id));
    const count      = voterRows.length;
    const pct        = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const profiles   = voterRows.map((v) => v.profiles).filter(Boolean);
    return { ...opt, count, pct, profiles };
  });

  // Fuehrende Option (hoechste Stimmzahl, mind. 1 Stimme)
  const leadCount = Math.max(...optionStats.map((o) => o.count), 0);

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: theme.colors.neutral.gray[200],
        // Dezenter Schatten fuer Karten-Look
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* ── Kopfbereich: Frage + Stimmzahl ── */}
      <View className="px-4 pt-4 pb-3">
        <Text
          className="text-[15px] leading-[22px] text-gray-900 mb-1"
          style={{ fontFamily: 'Manrope_700Bold' }}
        >
          {pollData.question}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.neutral.gray[400]} />
        ) : (
          <Text
            className="text-xs text-gray-400"
            style={{ fontFamily: 'Manrope_400Regular' }}
          >
            {totalVotes === 0
              ? 'Noch keine Stimmen'
              : `${totalVotes} ${totalVotes === 1 ? 'Stimme' : 'Stimmen'}`}
            {!hasVoted && totalVotes > 0 ? ' • Abstimmen um Ergebnisse zu sehen' : ''}
            {pollData.is_anonymous ? ' • Anonym' : ''}
          </Text>
        )}
      </View>

      {/* ── Optionen ── */}
      <View className="px-3 pb-3 gap-2">
        {optionStats.map((opt) => {
          const isSelected = userVote?.option_ids?.includes(opt.id) ?? false;
          const isLeading  = opt.count === leadCount && opt.count > 0 && !isSelected;
          const showResults = hasVoted;

          // Farbe je nach Status
          const barColor = isSelected ? COLOR_OWN : isLeading ? COLOR_LEAD : theme.colors.neutral.gray[300];
          const bgColor  = isSelected ? BG_OWN : isLeading ? BG_LEAD : BG_GRAY;
          const textColor = isSelected
            ? COLOR_OWN
            : isLeading
              ? COLOR_LEAD
              : theme.colors.neutral.gray[800];

          return (
            <Pressable
              key={opt.id}
              onPress={() => handleVote(opt.id)}
              disabled={loading}
              className="rounded-2xl overflow-hidden active:opacity-75"
              style={{ backgroundColor: bgColor }}
              accessibilityRole="button"
              accessibilityLabel={`Option: ${opt.text}`}
            >
              {/* Fortschritts-Balken als absolutePositioned Hintergrund */}
              {showResults && opt.pct > 0 && (
                <View
                  style={{
                    position:        'absolute',
                    top:             0,
                    left:            0,
                    bottom:          0,
                    width:           `${opt.pct}%`,
                    backgroundColor: barColor,
                    opacity:         0.18,
                    borderRadius:    14,
                  }}
                />
              )}

              {/* Inhalt der Option */}
              <View className="flex-row items-center px-3 py-3 gap-2">
                {/* Checkmark fuer eigene gewaehlte Option */}
                <View className="w-5 items-center justify-center">
                  {isSelected ? (
                    <CheckIcon size={14} color={COLOR_OWN} />
                  ) : null}
                </View>

                {/* Optionstext */}
                <Text
                  className="flex-1 text-[14px]"
                  style={{ fontFamily: 'Manrope_600SemiBold', color: textColor }}
                  numberOfLines={2}
                >
                  {opt.text}
                </Text>

                {/* Rechte Seite: Gestapelte Avatare + Prozent */}
                <View className="flex-row items-center gap-2">
                  {/* Gestapelte Avatare (nur nach der Abstimmung sichtbar) */}
                  {showResults && opt.profiles.length > 0 && (
                    <StackedAvatars profiles={opt.profiles} />
                  )}

                  {/* Prozentzahl (nur nach der Abstimmung) */}
                  {showResults ? (
                    <Text
                      className="text-[13px] w-9 text-right"
                      style={{
                        fontFamily: 'Manrope_700Bold',
                        color: textColor,
                      }}
                    >
                      {opt.pct}%
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Fusszeile ── */}
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{ borderTopWidth: 1, borderTopColor: theme.colors.neutral.gray[100] }}
      >
        <Text
          className="text-xs text-gray-400"
          style={{ fontFamily: 'Manrope_400Regular' }}
        >
          {pollData.allow_multiple ? 'Mehrere Antworten möglich' : 'Eine Antwort'}
        </Text>
        {pollData.is_anonymous && (
          <Text
            className="text-xs"
            style={{ fontFamily: 'Manrope_500Medium', color: theme.colors.accent.main }}
          >
            Anonym
          </Text>
        )}
      </View>
    </View>
  );
}

// ============================
// Gestapelte Avatare
// ============================

/**
 * Zeigt bis zu MAX_AVATARS Avatare uebereinander gestapelt.
 * Ueberzaehlige werden als "+N"-Text angezeigt.
 * Weisser Ring-Border zwischen den Bildern erzeugt Tiefenwirkung.
 */
function StackedAvatars({ profiles }) {
  const visible = profiles.slice(0, MAX_AVATARS);
  const overflow = profiles.length - MAX_AVATARS;

  // Gesamtbreite: (Anzahl * Groesse) + (Anzahl-1) * Offset
  const totalWidth =
    visible.length * AVATAR_SIZE + Math.max(0, visible.length - 1) * AVATAR_OFFSET;

  return (
    <View style={{ width: totalWidth, height: AVATAR_SIZE }}>
      {visible.map((profile, idx) => (
        <View
          key={profile?.id ?? idx}
          style={{
            position: 'absolute',
            left:     idx * (AVATAR_SIZE + AVATAR_OFFSET),
            width:    AVATAR_SIZE,
            height:   AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
            overflow: 'hidden',
            backgroundColor: theme.colors.neutral.gray[200],
            zIndex: visible.length - idx,
          }}
        >
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              cachePolicy="disk"
              contentFit="cover"
            />
          ) : (
            // Initials-Fallback
            <View
              style={{
                flex: 1,
                backgroundColor: stringToColor(profile?.username ?? ''),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: 'Manrope_700Bold',
                  color: '#FFFFFF',
                }}
              >
                {(profile?.username ?? '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* "+N"-Overflow Badge */}
      {overflow > 0 && (
        <View
          style={{
            position: 'absolute',
            left:     MAX_AVATARS * (AVATAR_SIZE + AVATAR_OFFSET),
            width:    AVATAR_SIZE,
            height:   AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
            backgroundColor: theme.colors.neutral.gray[200],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 7, fontFamily: 'Manrope_700Bold', color: theme.colors.neutral.gray[500] }}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================
// Hilfs-Funktionen
// ============================

/**
 * Wendet eine optimistische Stimmaenderung auf das lokale votes-Array an.
 * Wird vor dem API-Call aufgerufen, um sofortiges UI-Feedback zu erzeugen.
 *
 * @param {Array}    votes        – Aktueller votes-State
 * @param {string}   userId       – UUID des abstimmenden Users
 * @param {string[]} newOptionIds – Neue Auswahl (leer = Stimme zurueckziehen)
 * @param {Object}   userVote     – Vorherige Stimme des Users (oder null beim ersten Vote)
 * @param {Object}   profile      – Profil-Objekt des Users fuer Avatar-Anzeige
 * @returns {Array}  Neues votes-Array
 */
function applyOptimisticVote(votes, userId, newOptionIds, userVote, profile) {
  // Bestehende Stimme des Users entfernen
  const without = votes.filter((v) => v.user_id !== userId);
  // Leere Auswahl = Stimme zurueckziehen → nur ohne-Array zurueckgeben
  if (newOptionIds.length === 0) return without;
  // Neue optimistische Stimme einfuegen
  // profile stellt sicher, dass der Avatar auch beim ersten Vote sofort sichtbar ist
  return [
    ...without,
    {
      id:         userVote?.id ?? `temp_${userId}`,
      user_id:    userId,
      option_ids: newOptionIds,
      created_at: userVote?.created_at ?? new Date().toISOString(),
      profiles:   profile,
    },
  ];
}

/**
 * Parsed den JSON-Content einer Poll-Nachricht.
 * Gibt null zurueck wenn der Content kein gueltiges Poll-JSON ist.
 *
 * @param {string|null} content – messages.content Wert
 * @returns {Object|null}
 */
function parsePollContent(content) {
  if (!content) return null;
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    // Minimalvalidierung: Frage und Optionen muessen vorhanden sein
    if (!data?.question || !Array.isArray(data?.options)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Generiert eine konsistente Farbe aus einem String (fuer Initialen-Avatare).
 * Basiert auf einem einfachen Hashwert des Strings.
 *
 * @param {string} str – z. B. ein Username
 * @returns {string} – Hex-Farbe
 */
const AVATAR_COLORS = [
  '#0066FF', '#8B5CF6', '#059669', '#D97706', '#DC2626',
  '#0284C7', '#7C3AED', '#065F46', '#92400E', '#991B1B',
];
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
