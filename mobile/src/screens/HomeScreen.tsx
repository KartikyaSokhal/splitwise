import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";
import { useAuth } from "../auth/AuthContext.tsx";

export const HomeScreen: React.FC = () => {
  const { navigate } = useBill();
  const { user } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoGlyph}>✦</Text>
          </View>
          <Text accessibilityRole="header" style={styles.brand}>
            DueShare
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          onPress={() => navigate("ACCOUNT")}
          style={({ pressed }) => [
            styles.accountChip,
            pressed && styles.accountChipPressed,
          ]}
        >
          <Text style={styles.accountIcon}>👤</Text>
          <Text style={styles.accountText}>{user ? "Account" : "Sign In"}</Text>
        </Pressable>
      </View>

      {/* Editorial Hero */}
      <View style={styles.hero}>
        <View style={styles.pillBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.pillBadgeText}>EXACT INR BILL SPLITTING</Text>
        </View>
        <Text style={styles.title}>
          Every rupee exact.{"\n"}Every friend settled.
        </Text>
        <Text style={styles.body}>
          Guest-first bill splitting with zero friction. We calculate down to
          the single paisa so nobody overpays.
        </Text>
      </View>

      {/* Quick Split Spotlight Card */}
      <View style={styles.quickCard}>
        <View style={styles.quickHeader}>
          <View>
            <Text style={styles.quickEyebrow}>INSTANT GUEST SPLIT</Text>
            <Text style={styles.quickTitle}>Just this bill?</Text>
          </View>
          <View style={styles.lightningBadge}>
            <Text style={styles.lightningText}>⚡ 30 SEC</Text>
          </View>
        </View>

        {/* Tactile Division Diagram Motif */}
        <View style={styles.motifContainer}>
          <View style={styles.motifTotalBadge}>
            <Text style={styles.motifTotalLabel}>Bill Total</Text>
            <Text style={styles.motifTotalValue}>₹1,200.00</Text>
          </View>
          <View style={styles.motifArrow}>
            <Text style={styles.motifArrowText}>↓</Text>
          </View>
          <View style={styles.motifSharesRow}>
            <View style={styles.motifShareChip}>
              <View style={[styles.motifAvatar, { backgroundColor: "#EEF2FF" }]}>
                <Text style={[styles.motifAvatarText, { color: "#4338CA" }]}>Y</Text>
              </View>
              <Text style={styles.motifShareAmount}>₹400</Text>
            </View>
            <View style={styles.motifShareChip}>
              <View style={[styles.motifAvatar, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[styles.motifAvatarText, { color: "#065F46" }]}>P</Text>
              </View>
              <Text style={styles.motifShareAmount}>₹400</Text>
            </View>
            <View style={styles.motifShareChip}>
              <View style={[styles.motifAvatar, { backgroundColor: "#FFF1F2" }]}>
                <Text style={[styles.motifAvatarText, { color: "#9F1239" }]}>V</Text>
              </View>
              <Text style={styles.motifShareAmount}>₹400</Text>
            </View>
          </View>
        </View>

        <Text style={styles.quickDescription}>
          Runs 100% on your device. No sign-up, no camera, no cloud required.
        </Text>

        <PrimaryButton
          title="Start Quick Split"
          onPress={() => navigate("ENTER_TOTAL")}
          accessibilityLabel="Quick Split, no account needed"
          iconRight="→"
        />
      </View>

      {/* Cloud Groups & History Card */}
      <View style={styles.savedCard}>
        <View style={styles.savedHeader}>
          <Text style={styles.savedEyebrow}>SHARED EXPENSE LEDGERS</Text>
          <Text style={styles.savedTitle}>Keep sharing costs</Text>
        </View>
        <Text style={styles.savedDescription}>
          {user
            ? "Your shared groups, multi-payer expenses, and balances are ready."
            : "Sign in with Google to organize trips, roommates, couples, or team expenses into shared ledgers."}
        </Text>

        <View style={styles.savedActions}>
          <SecondaryButton
            title="Groups"
            onPress={() => navigate("GROUPS")}
            accessibilityLabel="Groups"
            iconLeft="📂"
            style={styles.savedButton}
          />
          <SecondaryButton
            title="Recent activity & history"
            onPress={() => navigate("HISTORY")}
            accessibilityLabel="Recent activity & history"
            iconLeft="⏱"
            style={styles.savedButton}
          />
        </View>
      </View>

      {/* Trust & Invariant Footer */}
      <View style={styles.footerNote}>
        <Text style={styles.footerIcon}>🔒</Text>
        <Text style={styles.caption}>
          Exact integer paise • Strict money conservation • Never processes bank transfers
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: SPACING.xl,
    gap: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.subtle,
  },
  logoGlyph: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  brand: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "900",
    color: COLORS.midnight,
    letterSpacing: -0.8,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.subtle,
  },
  accountChipPressed: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.borderStrong,
    transform: [{ scale: 0.96 }],
  },
  accountIcon: {
    fontSize: 14,
  },
  accountText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textPrimary,
  },
  hero: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: SPACING.xs,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  pillBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryDark,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    ...TYPOGRAPHY.hero,
    color: COLORS.textPrimary,
    fontWeight: "900",
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  quickCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: "#C7D2FE", // Soft indigo border
    gap: SPACING.lg,
    ...SHADOWS.card,
  },
  quickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  quickEyebrow: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  quickTitle: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 22,
    marginTop: 2,
  },
  lightningBadge: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  lightningText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.warningText,
    fontSize: 10,
  },
  motifContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: 6,
  },
  motifTotalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  motifTotalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  motifTotalValue: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryDark,
    fontVariant: ["tabular-nums"],
  },
  motifArrow: {
    height: 14,
    justifyContent: "center",
  },
  motifArrowText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "800",
  },
  motifSharesRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  motifShareChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  motifAvatar: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  motifAvatarText: {
    fontSize: 10,
    fontWeight: "800",
  },
  motifShareAmount: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textPrimary,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  quickDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  savedCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  savedHeader: {
    gap: 2,
  },
  savedEyebrow: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  savedTitle: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 20,
  },
  savedDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  savedActions: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  savedButton: {
    width: "100%",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SPACING.md,
  },
  footerIcon: {
    fontSize: 12,
  },
  caption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: "center",
    fontSize: 11,
  },
});

