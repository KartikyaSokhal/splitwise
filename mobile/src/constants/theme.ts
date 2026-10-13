export const COLORS = {
  primary: "#4F46E5",
  primaryDark: "#3730A3",
  primaryLight: "#EEF2FF",
  primarySubtle: "#F5F7FF",
  primaryVivid: "#6366F1",
  background: "#F8FAFC",
  backgroundWarm: "#FBFBFD",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  surfaceRaised: "#FFFFFF",
  midnight: "#0B0F19",
  midnightCard: "#111827",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textTertiary: "#94A3B8",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  borderStrong: "#CBD5E1",
  borderFocus: "#4F46E5",
  success: "#10B981",
  successLight: "#ECFDF5",
  successText: "#047857",
  successBorder: "#A7F3D0",
  error: "#F43F5E",
  errorLight: "#FFF1F2",
  errorText: "#BE123C",
  errorBorder: "#FECDD3",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  warningText: "#B45309",
  warningBorder: "#FDE68A",
  accentIndigo: "#4F46E5",
  accentEmerald: "#10B981",
  accentRose: "#F43F5E",
  accentAmber: "#F59E0B",
  accentSky: "#0EA5E9",
  accentViolet: "#8B5CF6",
  accentTeal: "#14B8A6",
  accentFuchsia: "#D946EF",
} as const;

export const AVATAR_PALETTES = [
  { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" }, // Indigo
  { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" }, // Emerald
  { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3" }, // Rose
  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // Amber
  { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // Sky
  { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" }, // Violet
  { bg: "#F0FDFA", text: "#115E59", border: "#99F6E4" }, // Teal
  { bg: "#FAE8FF", text: "#86198F", border: "#F5D0FE" }, // Fuchsia
] as const;

export const PURPOSE_CONFIG = {
  general: { icon: "✦", label: "General", bg: "#EEF2FF", color: "#4338CA", badge: "Group" },
  trip: { icon: "✈", label: "Trip", bg: "#E0F2FE", color: "#0369A1", badge: "Getaway" },
  family: { icon: "♥", label: "Family", bg: "#FFF1F2", color: "#BE123C", badge: "Home" },
  home: { icon: "⌂", label: "Roommates", bg: "#ECFDF5", color: "#047857", badge: "Household" },
  car_pool: { icon: "⚡", label: "Car Pool", bg: "#EDE9FE", color: "#6D28D9", badge: "Commute" },
  couple: { icon: "✿", label: "Couple", bg: "#FCE7F3", color: "#BE185D", badge: "Shared" },
  office: { icon: "◈", label: "Office / Team", bg: "#F1F5F9", color: "#334155", badge: "Work" },
  college: { icon: "★", label: "College", bg: "#FEF3C7", color: "#B45309", badge: "Campus" },
  event: { icon: "✶", label: "Event", bg: "#FAE8FF", color: "#A21CAF", badge: "Party" },
  other: { icon: "●", label: "Other", bg: "#F8FAFC", color: "#475569", badge: "Custom" },
} as const;

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  card: 20,
  full: 9999,
} as const;

export const SHADOWS = {
  subtle: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  keypad: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const TYPOGRAPHY = {
  hero: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
  },
  screenTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
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
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 0.4,
  },
  numericHero: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "800" as const,
    letterSpacing: -1,
  },
} as const;
