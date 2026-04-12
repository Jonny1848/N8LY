/**
 * Schrift-Presets fuer den Story-Editor.
 * Google Fonts via @expo-google-fonts (muss im Root-Layout geladen sein);
 * zusaetzlich System-Serife/Mono/Arial und Manrope aus dem App-Bootstrap.
 */
import { Platform } from 'react-native';

/** @typedef {{ id: string, label: string, fontFamily: string }} StoryFontPreset */

/** @type {StoryFontPreset[]} */
export const STORY_TEXT_FONT_PRESETS = [
  { id: 'inter700', label: 'Modern', fontFamily: 'Inter_700Bold' },
  { id: 'manropeBold', label: 'Strong', fontFamily: 'Manrope_700Bold' },
  { id: 'dancing700', label: 'Signature', fontFamily: 'DancingScript_700Bold' },
  { id: 'merriweather700', label: 'Classic', fontFamily: 'Merriweather_700Bold' },
  { id: 'playfair700', label: 'Editorial', fontFamily: 'PlayfairDisplay_700Bold' },
  { id: 'oswald700', label: 'Condensed', fontFamily: 'Oswald_700Bold' },
  { id: 'bebas400', label: 'Poster', fontFamily: 'BebasNeue_400Regular' },
  { id: 'pacifico400', label: 'Pacifico', fontFamily: 'Pacifico_400Regular' },
  { id: 'poppins700', label: 'Rounded', fontFamily: 'Poppins_700Bold' },
  { id: 'montserrat700', label: 'Geo', fontFamily: 'Montserrat_700Bold' },
  { id: 'spaceGrotesk700', label: 'Tech', fontFamily: 'SpaceGrotesk_700Bold' },
  { id: 'roboto700', label: 'Roboto', fontFamily: 'Roboto_700Bold' },
  { id: 'lato700', label: 'Lato', fontFamily: 'Lato_700Bold' },
  { id: 'permanent400', label: 'Marker', fontFamily: 'PermanentMarker_400Regular' },
  { id: 'manropeSemi', label: 'Soft', fontFamily: 'Manrope_600SemiBold' },
  { id: 'manropeReg', label: 'Clean', fontFamily: 'Manrope_400Regular' },
  {
    id: 'serif',
    label: 'Serif OS',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  {
    id: 'mono',
    label: 'Mono',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  {
    id: 'arial',
    label: 'Arial',
    fontFamily: Platform.select({ ios: 'Arial', android: 'sans-serif', default: 'Arial' }),
  },
];

/**
 * @param {string} fontKey
 * @returns {string}
 */
export function storyFontFamilyForKey(fontKey) {
  const preset = STORY_TEXT_FONT_PRESETS.find((p) => p.id === fontKey);
  // Fallback: Modern (Inter) nach Laden des Root-Layouts
  return preset?.fontFamily ?? 'Inter_700Bold';
}
