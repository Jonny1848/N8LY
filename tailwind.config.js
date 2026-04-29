/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind-v4-Preset (Interop, className-Unterstuetzung)
  presets: [require("nativewind/preset")],
  content: [
    './global.css',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './node_modules/@gluestack-ui/themed/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // N8LY Brand Blue (Chat-Bubbles, Buttons) — `brand` fuer z. B. AuthSubmitButton (bg-brand)
        brand: '#0066FF',
        'N8LY-blue': '#0066FF',
        // App-Farbpalette, gespiegelt aus constants/theme.js
        primary: {
          DEFAULT: '#0066FF',
          main: '#0066FF',
          light: '#374151',
          lighter: '#6B7280',
          dark: '#111827',
          bg: '#F9FAFB',
          main2: '#191970',
          main3: '#1E90FF',
        },
        secondary: {
          DEFAULT: '#6B7280',
          main: '#6B7280',
          light: '#9CA3AF',
          lighter: '#D1D5DB',
          dark: '#4B5563',
          bg: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          main: '#8B5CF6',
          light: '#A78BFA',
          lighter: '#C4B5FD',
          dark: '#7C3AED',
          bg: '#FAF5FF',
        },
        neutral: {
          white: '#FFFFFF',
          black: '#000000',
          offWhite: '#FAFAFA',
          offBlack: '#0F172A',
          gray: {
            0: '#000000',
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
        },
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#0284C7',
      },
    },
  },
  plugins: [],
};

