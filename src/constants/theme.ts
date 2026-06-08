export const COLORS = {
  background: '#0A0A0F',
  surface: '#12121E',
  surfaceElevated: '#1C1C2C',
  border: '#2A2A3D',

  primary: '#00D4AA',
  primaryDim: 'rgba(0,212,170,0.12)',
  primaryBright: '#00FFCC',

  blue: '#4D9FFF',
  blueDim: 'rgba(77,159,255,0.12)',

  streak: '#FF7A35',
  streakDim: 'rgba(255,122,53,0.15)',

  achievement: '#9B6DFF',
  achievementDim: 'rgba(155,109,255,0.12)',

  record: '#FF4D6A',
  recordDim: 'rgba(255,77,106,0.12)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  textTertiary: '#4A4A60',

  white: '#FFFFFF',
  black: '#000000',

  confetti: ['#00D4AA', '#4D9FFF', '#FF7A35', '#9B6DFF', '#FF4D6A', '#FFD700', '#00FFCC'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONT = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    hero: 40,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const SHADOW = {
  primary: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
};
