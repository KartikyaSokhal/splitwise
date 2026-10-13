export const COLORS = {
  // Signature Palette from creative brief
  midnight: "#090D0B",          // Main app background
  midnightCard: "#131A16",      // Dark charcoal-forest card
  midnightElevated: "#18221D",  // Elevated surface
  deepForest: "#123D2B",        // Rich botanical dark forest
  deepForestLight: "#1B523B",   // Mid forest
  electricMint: "#B9F6C8",      // Primary brand accent & tactile focal point
  electricMintDark: "#123D2B",  // High-contrast dark text on electric mint
  electricMintSubtle: "#DDFCE5",// Pale mint wash
  freshGreen: "#75D99A",        // Vibrant secondary green
  warmIvory: "#F7F3E8",         // Premium warm light surface
  warmIvoryMuted: "#ECE6D5",    // Muted warm ivory
  softSage: "#EAF2E7",          // Soft tinted neutral card surface
  softSageBorder: "#CBDBC8",    // Border for soft sage

  // Aliases for component consistency
  primary: "#B9F6C8",
  primaryDark: "#123D2B",
  primaryLight: "#EAF2E7",
  primarySubtle: "#F7F3E8",
  primaryVivid: "#75D99A",
  background: "#090D0B",
  backgroundWarm: "#123D2B",
  surface: "#131A16",
  surfaceMuted: "#1A241F",
  surfaceRaised: "#1F2C25",
  surfaceLight: "#F7F3E8",
  surfaceSage: "#EAF2E7",

  // Text hierarchy
  textPrimary: "#F7F3E8",       // Crisp ivory on dark background
  textDark: "#090D0B",          // Midnight text on light/mint surfaces
  textSecondary: "#A3B899",     // Soft sage secondary text
  textMuted: "#7A8F70",         // Subtle botanical muted text
  textTertiary: "#5A6E52",      // Faint label text

  // Borders
  border: "#1E2B23",
  borderSubtle: "#16201A",
  borderStrong: "#2A3B31",
  borderLight: "#E0DBC8",
  borderFocus: "#B9F6C8",

  // Semantics
  success: "#75D99A",
  successLight: "#163826",
  successText: "#B9F6C8",
  successBorder: "#285C40",

  error: "#FF6B6B",
  errorLight: "#331618",
  errorText: "#FF9E9E",
  errorBorder: "#5A2629",

  warning: "#FFB84D",
  warningLight: "#332612",
  warningText: "#FFD18A",
  warningBorder: "#5A4420",

  accentIndigo: "#B9F6C8",
  accentEmerald: "#75D99A",
  accentRose: "#FF6B6B",
  accentAmber: "#FFB84D",
  accentSky: "#7AE5F5",
  accentViolet: "#CDB4DB",
  accentTeal: "#52B788",
  accentFuchsia: "#F72585",
} as const;

export const AVATAR_PALETTES = [
  { bg: "#B9F6C8", text: "#123D2B", border: "#75D99A" }, // Electric Mint
  { bg: "#F7F3E8", text: "#123D2B", border: "#E0DBC8" }, // Warm Ivory
  { bg: "#75D99A", text: "#090D0B", border: "#B9F6C8" }, // Fresh Green
  { bg: "#EAF2E7", text: "#123D2B", border: "#CBDBC8" }, // Soft Sage
  { bg: "#FEF3C7", text: "#78350F", border: "#FDE68A" }, // Amber
  { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // Rose
  { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // Sky
  { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" }, // Lavender
] as const;

export const PURPOSE_CONFIG = {
  general: { icon: "✦", label: "General", bg: "#1C2621", color: "#F7F3E8", badge: "Group" },
  trip: { icon: "✈", label: "Trip", bg: "#1B523B", color: "#B9F6C8", badge: "Getaway" },
  family: { icon: "♥", label: "Family", bg: "#2E1E24", color: "#FF85A1", badge: "Home" },
  home: { icon: "⌂", label: "Roommates", bg: "#1E3B2E", color: "#75D99A", badge: "Household" },
  car_pool: { icon: "⚡", label: "Car Pool", bg: "#2D2619", color: "#FFD166", badge: "Commute" },
  couple: { icon: "✿", label: "Couple", bg: "#2E1C27", color: "#F4978E", badge: "Shared" },
  office: { icon: "◈", label: "Office / Team", bg: "#1D282E", color: "#90E0EF", badge: "Work" },
  college: { icon: "★", label: "College", bg: "#28291B", color: "#E9D8A6", badge: "Campus" },
  event: { icon: "✶", label: "Event", bg: "#281D2E", color: "#DDA15E", badge: "Party" },
  other: { icon: "●", label: "Other", bg: "#1F2C25", color: "#A3B899", badge: "Custom" },
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
  card: 22,
  pill: 9999,
  full: 9999,
} as const;

export const SHADOWS = {
  subtle: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  raised: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  keypad: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

// Platform-independent font selection for web / native / test runner
const isWeb = typeof window !== "undefined" && typeof document !== "undefined";

export const FONTS = {
  heading: isWeb
    ? "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    : "System",
  body: isWeb
    ? "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    : "System",
};

export const TYPOGRAPHY = {
  hero: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
    fontFamily: FONTS.heading,
  },
  screenTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
    fontFamily: FONTS.heading,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
    fontFamily: FONTS.heading,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
    fontFamily: FONTS.body,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
    fontFamily: FONTS.body,
  },
  secondary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: FONTS.body,
  },
  secondaryMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    fontFamily: FONTS.body,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    fontFamily: FONTS.body,
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 0.4,
    fontFamily: FONTS.body,
  },
  numericHero: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "800" as const,
    letterSpacing: -1,
    fontFamily: FONTS.heading,
  },
} as const;
