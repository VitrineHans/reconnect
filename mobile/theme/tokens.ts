/**
 * Reconnect Design System — "Sunny Connection"
 *
 * Aesthetic: bright, playful, warm — like a fun game you play with people you love.
 * Light backgrounds, punchy coral/yellow/mint accents. Rounded and friendly.
 * Think Duolingo energy: joyful, addictive, never serious.
 *
 * Fonts: Nunito (rounded, bubbly, friendly) + Nunito Sans (body)
 *   npx expo install @expo-google-fonts/nunito expo-font
 */

// ─── Colours ─────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds — bright and airy
  bg:       '#FFF8F0',  // warm cream white
  surface:  '#FFFFFF',  // pure white cards
  surface2: '#FFF3E8',  // very light peach for inputs
  surface3: '#FFE8D6',  // slightly deeper peach

  // Borders
  stroke:       '#FFD4B8',  // soft peach border
  strokeStrong: '#FFBFA0',  // more visible peach

  // Brand — punchy and playful
  primary: '#FF6B4A',  // coral-red — the main action color
  coral:   '#FF6B4A',  // alias
  yellow:  '#FFD447',  // sunshine yellow — streaks, achievement
  mint:    '#4ECBA0',  // fresh mint green — success, confirmed
  sky:     '#4AA8FF',  // sky blue — secondary accent
  lilac:   '#B388FF',  // soft purple — reveal moments

  // Feedback
  sage:        '#4ECBA0',
  destructive: '#FF4E6A',

  // Text — dark on light backgrounds
  text:          '#1A1A2E',  // near-black with slight blue tint
  textSecondary: '#6B6B8A',  // muted purple-gray
  textMuted:     '#B0B0C8',  // very muted, placeholders

  // Convenience aliases
  accent:  '#FFD447',
  ember:   '#FF6B4A',  // kept for backward compat
  flame:   '#FF4E6A',
  gold:    '#FFD447',

  // State-specific
  stateRevealReady: '#B388FF',  // lilac for reveal — magical
  stateYourTurn:    '#FF6B4A',  // coral for urgency
  stateWaiting:     '#E8E8F0',  // light gray for waiting
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  /**
   * Nunito — rounded, bubbly, warm. Perfect for a game about connection.
   * Very different from Inter/Roboto — feels handcrafted and friendly.
   *
   * Install: npx expo install @expo-google-fonts/nunito expo-font
   */
  families: {
    display:      'Nunito_800ExtraBold',
    displayItal:  'Nunito_800ExtraBold_Italic',
    body:         'Nunito_400Regular',
    bodyMedium:   'Nunito_600SemiBold',
    bodySemiBold: 'Nunito_700Bold',
    bodyBold:     'Nunito_800ExtraBold',
  },

  sizes: {
    xs:    11,
    sm:    13,
    base:  15,
    md:    17,
    lg:    20,
    xl:    24,
    '2xl': 30,
    '3xl': 38,
    '4xl': 48,
  },

  lineHeights: {
    tight:   1.15,
    snug:    1.3,
    normal:  1.5,
    relaxed: 1.7,
  },

  letterSpacing: {
    tighter: -0.5,
    tight:   -0.2,
    normal:  0,
    wide:    0.4,
    wider:   1.0,
    widest:  2.0,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  sm:    10,
  md:    16,
  lg:    20,
  xl:    28,
  '2xl': 36,
  full:  9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  soft: {
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  emberGlow: {
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: '#FFD447',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  flameGlow: {
    shadowColor: '#FF4E6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 8,
  },
  lilacGlow: {
    shadowColor: '#B388FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
