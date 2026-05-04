// Light + dark palettes — HeroUI-inspired vibe: vivid primary, soft
// pastel accents, gentle shadows. Applied at boot via Object.assign on
// the exported `colors` / `shadow` objects so every StyleSheet.create
// snapshots the right values once the navigator remounts.

export type Palette = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  // Subtle gradient end stop, used by the primary CTA / hero card.
  primaryGradient: string;
  accent: string;
  accentSoft: string;
  gold: string;

  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  success: string;
  successSoft: string;
  successText: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  info: string;

  overlay: string;

  // Pure white that stays white in any mode (used on top of brand-colored
  // buttons, e.g. the primary CTA label).
  onPrimary: string;
};

export type ShadowPalette = {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  floating: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

// HeroUI default brand blue (#006FEE) gives the app a more energetic,
// approachable feel than the previous navy. The gradient stop pulls
// slightly toward purple — a tiny touch that lifts hero CTAs.
export const lightPalette: Palette = {
  primary: '#006FEE',
  primaryDark: '#005BC4',
  primarySoft: '#E6F1FE',
  primaryGradient: '#3094FF',
  accent: '#11181C',
  accentSoft: '#F4F4F5',
  gold: '#F5A524',

  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  border: '#E4E4E7',

  textPrimary: '#11181C',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  textDisabled: '#D4D4D8',

  success: '#17C964',
  successSoft: 'rgba(23, 201, 100, 0.14)',
  successText: '#0E793C',
  danger: '#F31260',
  dangerSoft: 'rgba(243, 18, 96, 0.10)',
  warning: '#F5A524',
  warningSoft: 'rgba(245, 165, 36, 0.14)',
  warningText: '#A05E03',
  info: '#7828C8',

  overlay: 'rgba(17, 24, 28, 0.45)',

  onPrimary: '#FFFFFF',
};

export const darkPalette: Palette = {
  primary: '#338EF7',
  primaryDark: '#006FEE',
  primarySoft: 'rgba(51, 142, 247, 0.20)',
  primaryGradient: '#5DA8FF',
  accent: '#ECEDEE',
  accentSoft: '#27272A',
  gold: '#F5A524',

  // Slightly off-black so cards have something to lift away from.
  background: '#0B0B0F',
  surface: '#18181B',
  surfaceMuted: '#27272A',
  border: '#3F3F46',

  textPrimary: '#ECEDEE',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textDisabled: '#52525B',

  success: '#1FCD68',
  successSoft: 'rgba(31, 205, 104, 0.20)',
  successText: '#1FCD68',
  danger: '#F54180',
  dangerSoft: 'rgba(245, 65, 128, 0.20)',
  warning: '#F7B750',
  warningSoft: 'rgba(247, 183, 80, 0.20)',
  warningText: '#F7B750',
  info: '#9353D3',

  overlay: 'rgba(0, 0, 0, 0.65)',

  onPrimary: '#FFFFFF',
};

// Soft, blueish shadow in light mode — much calmer than a hard black,
// gives the HeroUI floaty look. Dark mode keeps shadows off (cards
// already have enough contrast against the near-black background).
export const lightShadow: ShadowPalette = {
  card: {
    shadowColor: '#0F1F44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0F1F44',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const darkShadow: ShadowPalette = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};
