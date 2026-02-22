// N8TLY App Theme
// Minimalistisches, erwachsenes Design mit dezenten Akzenten

export const theme = {
  // Hauptfarben - Neutrale Palette mit dezenten Logo-Akzenten
  colors: {
    // Primäre Farben: Grautöne für professionelles Erscheinungsbild
    primary: {
      main: '#0066FF',      // Electric Blue - Hauptfarbe (N8LY Logo Color)
      light: '#374151',     // Mittleres Grau
      lighter: '#6B7280',   // Helles Grau
      dark: '#111827',      // Sehr dunkles Grau
      bg: '#F9FAFB',        // Sehr heller Hintergrund
      main2: '#191970' ,     // Midnight Blue
      main3: "#1E90FF"      // Dodger Blue
    },
    // Sekundäre Farben: Hellere Grautöne
    secondary: {
      main: '#6B7280',      // Mittleres Grau
      light: '#9CA3AF',     // Helles Grau
      lighter: '#D1D5DB',   // Sehr helles Grau
      dark: '#4B5563',      // Dunkles Grau
      bg: '#FFFFFF',        // Weißer Hintergrund
    },
    // Akzent: Dezentes Lila aus dem Logo (sparsam verwenden!)
    accent: {
      main: '#8B5CF6',      // Lila - Logo-Akzent
      light: '#A78BFA',     // Helles Lila
      lighter: '#C4B5FD',   // Sehr helles Lila
      dark: '#7C3AED',      // Dunkles Lila
      bg: '#FAF5FF',        // Sehr dezenter Lila-Hintergrund
    },
    // Neutrale Basis
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
      }
    },
    // System-Farben (minimalistisch)
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0284C7',
  },

  // Gradients - Sehr dezent
  gradients: {
    primary: 'from-gray-50 to-white',
    secondary: 'from-white to-gray-50',
    accent: 'from-purple-50/30 to-white',
    subtle: 'from-gray-100 to-white',
  },

  // Typografie
  typography: {
    fontFamily: {
      regular: 'Manrope_400Regular',
      medium: 'Manrope_500Medium',
      semibold: 'Manrope_600SemiBold',
      bold: 'Manrope_700Bold',
    },
    fontSizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
  },

  // Border Radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Shadows (für React Native elevation)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },

  // Component Styles - Minimalistisch
  components: {
    button: {
      primary: {
        bg: '#1F2937',          // Dunkles Grau statt bunt
        text: '#FFFFFF',
        hover: '#111827',
      },
      secondary: {
        bg: '#FFFFFF',          // Weiß mit Border
        text: '#1F2937',
        hover: '#F9FAFB',
        border: '#E5E7EB',
      },
      accent: {
        bg: '#8B5CF6',          // Lila-Akzent nur bei Bedarf
        text: '#FFFFFF',
        hover: '#7C3AED',
      },
      outline: {
        bg: 'transparent',
        border: '#D1D5DB',      // Neutrales Grau
        text: '#374151',
      },
    },
    input: {
      border: '#E5E7EB',        // Hellgrau
      focusBorder: '#8B5CF6',   // Lila-Akzent bei Fokus
      bg: '#FFFFFF',
      text: '#111827',
      placeholder: '#9CA3AF',
    },
    card: {
      bg: '#FFFFFF',
      border: '#F3F4F6',        // Sehr helle Border
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,    // Sehr dezenter Schatten
        shadowRadius: 3,
        elevation: 1,
      },
    },
  },
};

// Helper functions
export const getColor = (path) => {
  const keys = path.split('.');
  let value = theme.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

export const getGradient = (type = 'primary') => {
  return theme.gradients[type] || theme.gradients.primary;
};