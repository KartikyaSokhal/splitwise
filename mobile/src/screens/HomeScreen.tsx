import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";

export const HomeScreen: React.FC = () => {
  const { navigate } = useBill();

  const handleStart = () => {
    navigate("ENTER_TOTAL");
  };

  return (
    <View style={styles.container}>
      {/* Top Brand Bar */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <View style={styles.logoPillLeft} />
            <View style={styles.logoPillRight} />
          </View>
          <Text style={styles.brandTitle}>Split</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v1.0</Text>
        </View>
      </View>

      {/* Main Hero Content */}
      <View style={styles.content}>
        <Text style={styles.heroTitle}>
          Split a bill.{"\n"}In seconds.
        </Text>
        <Text style={styles.subtitle}>
          Add the total, add your friends, and share the result.
        </Text>

        {/* Feature Pills */}
        <View style={styles.pillsRow}>
          <View style={styles.featurePill}>
            <Text style={styles.pillEmoji}>⚡</Text>
            <Text style={styles.pillText}>20-second split</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.pillEmoji}>🔒</Text>
            <Text style={styles.pillText}>Offline ready</Text>
          </View>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Split a bill"
          onPress={handleStart}
          style={styles.primaryBtn}
          accessibilityLabel="Start splitting a bill"
        />

        <SecondaryButton
          title="Scan receipt"
          badge="Soon"
          iconLeft="📷"
          onPress={() => {}}
          disabled={true}
          style={styles.secondaryBtn}
          accessibilityLabel="Scan receipt coming soon"
        />

        <Text style={styles.caption}>
          No login required · Free forever
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginRight: SPACING.md,
  },
  logoPillLeft: {
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  logoPillRight: {
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    opacity: 0.85,
  },
  brandTitle: {
    ...TYPOGRAPHY.screenTitle,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  versionBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  versionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: SPACING.xxxl,
  },
  heroTitle: {
    ...TYPOGRAPHY.hero,
    fontSize: 38,
    lineHeight: 46,
    color: COLORS.textPrimary,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: SPACING.md,
    maxWidth: "90%",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.xxl,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  pillEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  pillText: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.primaryDark,
    fontWeight: "600",
    fontSize: 13,
  },
  footer: {
    gap: SPACING.md,
    alignItems: "stretch",
    paddingBottom: SPACING.sm,
  },
  primaryBtn: {
    width: "100%",
  },
  secondaryBtn: {
    width: "100%",
  },
  caption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
});
