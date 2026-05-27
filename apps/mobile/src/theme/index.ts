export const Colors = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#F59E0B',
  secondaryLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FFF7ED',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  success: '#10B981',

  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',

  dark: {
    background: '#111827',
    surface: '#1F2937',
    surfaceVariant: '#374151',
    border: '#374151',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
  },

  sim: '#8B5CF6',
  simLight: '#EDE9FE',
  topup: '#3B82F6',
  topupLight: '#DBEAFE',
  grocery: '#10B981',
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 48,
};

export const BorderRadius = {
  sm: 6, md: 10, lg: 14, xl: 18, '2xl': 24, full: 9999,
};

export const FontSize = {
  xs: 11, sm: 12, base: 14, md: 15, lg: 16, xl: 18, '2xl': 20, '3xl': 24, '4xl': 28, '5xl': 32,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
