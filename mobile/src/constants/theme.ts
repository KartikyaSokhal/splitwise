export const COLORS = {
  primary: "#4F46E5",
  primaryDark: "#3730A3",
  primaryLight: "#EEF2FF",
  primarySubtle: "#F5F7FF",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#64748B",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  borderFocus: "#4F46E5",
  success: "#16A34A",
  successLight: "#DCFCE7",
  successText: "#15803D",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  errorText: "#B91C1C",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  warningText: "#B45309",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const TYPOGRAPHY = {
  hero: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "700" as const,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
  },
  secondary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  secondaryMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
} as const;
