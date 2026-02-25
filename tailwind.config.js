/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './node_modules/@gluestack-ui/themed/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // N8TLY Brand (Electric Blue)
        brand: '#0066FF',
        // Minimalistische Farbpalette
        primary: {
          DEFAULT: '#1F2937',
          light: '#374151',
          lighter: '#6B7280',
          dark: '#111827',
          bg: '#F9FAFB',
        },
        secondary: {
          DEFAULT: '#6B7280',
          light: '#9CA3AF',
          lighter: '#D1D5DB',
          dark: '#4B5563',
          bg: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#8B5CF6',
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
        },
      },
    },
  },
  plugins: [],
};

