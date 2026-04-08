import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Unterer Scrim: relativ hoch + NUR Alpha-Verlauf (kein BlurView).
 * Rueckexport der Bildschirmmasse fuer Tap-Zonen und Vollbild-Layout.
 */
export const STORY_VIEWER_SCREEN_W = SCREEN_W;
export const STORY_VIEWER_SCREEN_H = SCREEN_H;

export const REACTION_SCRIM_HEIGHT = Math.min(420, Math.round(SCREEN_H * 0.52));

/** Reaktions-Pills sitzen dicht ueber der Safe-Area */
export const REACTION_BOTTOM_PAD = 6;

/** Geschaetzte Hoehe einer Emoji-Zeile inkl. Touch — fuer Abstand der rechten Spalte */
export const REACTION_ROW_PILL_HEIGHT = 46;

/** Rechte Spalte optisch weiter nach oben */
export const SIDE_RAIL_EXTRA_LIFT = 100;

export const REACTION_TO_SIDE_RAIL_GAP = 14;

/** Einheitliches Press-Feedback (Reanimated) fuer Story-UI */
export const STORY_PRESS_SPRING_CONFIG = { damping: 18, stiffness: 410, mass: 0.42 };
export const STORY_PRESS_IN_SCALE = 0.93;
export const STORY_PRESS_IN_MS = 95;
export const STORY_PRESS_IN_OPACITY = 0.88;

/** Folgen-Pill: Blauton wie Verified-Badge */
export const STORY_FOLLOW_BLUE = '#3897F0';

/** Typografie laut Projekt-Skill: Arial fuer Overlay-Texte */
export const storyViewerFontArial = {
  fontFamily: Platform.select({ ios: 'Arial', android: 'sans-serif', default: 'Arial' }),
};

/** Festes Emoji-Set fuer Reaktionsleiste und Picker */
export const STORY_REACTION_PRESETS = [
  { key: 'heart', emoji: '❤️', label: 'Herz' },
  { key: 'heartEyes', emoji: '😍', label: 'Herzaugen' },
  { key: 'joy', emoji: '😂', label: 'Freude' },
  { key: 'wow', emoji: '😮', label: 'Ueberrascht' },
  { key: 'hushed', emoji: '😯', label: 'Verwundert' },
];

export const STORY_SPEAKER_GLASS_SIZE = 40;

/** Linker Tap-Streifen = vorherige Story (IG-Stil) */
export const STORY_TAP_LEFT_ZONE_RATIO = 0.35;

export const STORY_SWIPE_DISMISS_DISTANCE = 72;
export const STORY_SWIPE_DISMISS_VELOCITY = 620;
