import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  COLORS,
  PURPOSE_CONFIG,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { currency, Notice } from "../components/CloudUI.tsx";
import { purposeLabel } from "../cloud/groupSetup.ts";
import { useBill } from "../state/BillContext.tsx";
import { useAuth } from "../auth/AuthContext.tsx";
import { useCloud } from "../cloud/CloudContext.tsx";
import { useResource } from "../cloud/hooks.ts";
import type { CloudRepository } from "../cloud/repository.ts";
import type { Group } from "../cloud/contracts.ts";

interface DashboardGroup {
  group: Group;
  balanceMinor: number | null;
}

function DashboardGroupCard({
  item,
  onPress,
}: {
  item: DashboardGroup;
  onPress: () => void;
}) {
  const { group, balanceMinor } = item;
  const purposeMeta =
    PURPOSE_CONFIG[group.purpose as keyof typeof PURPOSE_CONFIG] ??
    PURPOSE_CONFIG.general;

  let balanceBadge = null;
  let balanceAccessibility = "Balance unavailable";

  if (balanceMinor === null) {
    balanceBadge = (
      <View style={styles.groupBalancePending}>
        <Text style={styles.groupBalancePendingText}>Balance unavailable</Text>
      </View>
    );
  } else if (balanceMinor > 0) {
    balanceAccessibility = `You're owed ${currency(balanceMinor)}`;
    balanceBadge = (
      <View style={styles.groupBalanceBadgePositive}>
        <View style={styles.groupBalanceTagPositive}>
          <Text style={styles.groupBalanceTagTextPositive}>+ Owed</Text>
        </View>
        <Text style={styles.groupBalanceTextPositive}>
          You're owed {currency(balanceMinor)}
        </Text>
      </View>
    );
  } else if (balanceMinor < 0) {
    balanceAccessibility = `You owe ${currency(balanceMinor)}`;
    balanceBadge = (
      <View style={styles.groupBalanceBadgeNegative}>
        <View style={styles.groupBalanceTagNegative}>
          <Text style={styles.groupBalanceTagTextNegative}>- Owe</Text>
        </View>
        <Text style={styles.groupBalanceTextNegative}>
          You owe {currency(balanceMinor)}
        </Text>
      </View>
    );
  } else {
    balanceAccessibility = "All settled";
    balanceBadge = (
      <View style={styles.groupBalanceBadgeSettled}>
        <View style={styles.groupBalanceTagSettled}>
          <Text style={styles.groupBalanceTagTextSettled}>✓ Settled</Text>
        </View>
        <Text style={styles.groupBalanceTextSettled}>All settled</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.name}, ${purposeLabel(group.purpose)}, ${balanceAccessibility}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.groupPreviewCard,
        group.archived && styles.groupPreviewArchived,
        pressed && styles.groupPreviewPressed,
      ]}
    >
      <View style={styles.groupPreviewContent}>
        <View
          style={[
            styles.groupPurposeIconBox,
            { backgroundColor: purposeMeta.bg },
          ]}
        >
          <Text
            style={[styles.groupPurposeIconText, { color: purposeMeta.color }]}
          >
            {purposeMeta.icon}
          </Text>
        </View>

        <View style={styles.groupPreviewDetails}>
          <View style={styles.groupTagRow}>
            <View
              style={[
                styles.groupPurposePill,
                { backgroundColor: purposeMeta.bg },
              ]}
            >
              <Text
                style={[
                  styles.groupPurposePillText,
                  { color: purposeMeta.color },
                ]}
              >
                {purposeLabel(group.purpose)}
              </Text>
            </View>
            {group.destination ? (
              <View style={styles.groupDestinationPill}>
                <Text style={styles.groupDestinationPillText} numberOfLines={1}>
                  📍 {group.destination}
                </Text>
              </View>
            ) : null}
            {group.archived ? (
              <View style={styles.groupArchivedPill}>
                <Text style={styles.groupArchivedPillText}>Archived</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.groupNameText} numberOfLines={1}>
            {group.name}
          </Text>

          <View style={styles.groupBalanceRow}>{balanceBadge}</View>
        </View>

        <View style={styles.groupChevronBox}>
          <Text style={styles.groupChevronText}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

function AuthenticatedHomeContent({
  repository,
}: {
  repository: CloudRepository | null;
}) {
  const { navigate, openCloudGroup, openCloudCreate } = useBill();

  const loadDashboard = useCallback(async (): Promise<DashboardGroup[]> => {
    if (!repository) return [];
    const page = await repository.groups(null);
    const results = await Promise.all(
      page.items.map(async (g) => {
        try {
          const snap = await repository.group(g.id);
          const me = snap.people.find(
            (p) => p.user_id === repository.userId && p.active,
          );
          const balanceMinor = me
            ? (snap.balances.find((b) => b.personId === me.id)?.balanceMinor ??
              null)
            : null;
          return { group: g, balanceMinor };
        } catch {
          return { group: g, balanceMinor: null };
        }
      }),
    );
    return results;
  }, [repository]);

  const dashboard = useResource(loadDashboard);
  const groups = dashboard.data ?? [];

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
          <Text style={styles.accountText}>Account</Text>
        </Pressable>
      </View>

      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingTitle}>Welcome back 👋</Text>
        <Text style={styles.greetingSubtitle}>
          Track shared expenses and settle balances down to the paisa.
        </Text>
      </View>

      {/* Prominent Quick Split Action */}
      <View style={styles.quickCardCompact}>
        <View style={styles.quickCompactHeader}>
          <View style={styles.quickEyebrowRow}>
            <View style={styles.lightningBadge}>
              <Text style={styles.lightningText}>⚡ QUICK SPLIT</Text>
            </View>
            <Text style={styles.quickOfflineText}>100% OFFLINE</Text>
          </View>
          <Text style={styles.quickTitleCompact}>
            Need to split an everyday bill?
          </Text>
          <Text style={styles.quickBodyCompact}>
            Instant calculation down to the single paisa. Works offline without
            saving to a group.
          </Text>
        </View>

        <PrimaryButton
          title="Start Quick Split"
          onPress={() => navigate("ENTER_TOTAL")}
          accessibilityLabel="Quick Split, no account needed"
          iconRight="→"
        />
      </View>

      {/* Groups Section */}
      <View style={styles.groupsSection}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Your groups</Text>
            <Text style={styles.sectionSubtitle}>
              {dashboard.loading
                ? "Loading active ledgers..."
                : groups.length === 1
                  ? "1 shared ledger"
                  : `${groups.length} shared ledgers`}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a group"
            onPress={() => openCloudCreate()}
            style={({ pressed }) => [
              styles.newGroupButton,
              pressed && styles.newGroupButtonPressed,
            ]}
          >
            <Text style={styles.newGroupButtonIcon}>+</Text>
            <Text style={styles.newGroupButtonText}>New Group</Text>
          </Pressable>
        </View>

        <Notice message={dashboard.error} retry={dashboard.reload} />

        {dashboard.loading && groups.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.electricMint} />
            <Text style={styles.loadingText}>
              Loading your groups and balances...
            </Text>
          </View>
        ) : groups.length === 0 && !dashboard.error ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBadge}>
              <Text style={styles.emptyIconText}>📂</Text>
            </View>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyDescription}>
              Create a shared ledger for a trip, flatmates, or friends to track
              expenses together.
            </Text>
            <PrimaryButton
              title="Create a group"
              accessibilityLabel="Create a group"
              onPress={() => openCloudCreate()}
              iconRight="+"
            />
          </View>
        ) : (
          <View style={styles.groupsList}>
            {groups.map((item) => (
              <DashboardGroupCard
                key={item.group.id}
                item={item}
                onPress={() => openCloudGroup(item.group.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.dashboardFooterActions}>
          <SecondaryButton
            title="Manage all groups"
            onPress={() => navigate("GROUPS")}
            accessibilityLabel="Groups"
            iconLeft="📂"
            style={styles.footerActionButton}
          />
          <SecondaryButton
            title="Recent activity & history"
            onPress={() => navigate("HISTORY")}
            accessibilityLabel="Recent activity & history"
            iconLeft="⏱"
            style={styles.footerActionButton}
          />
        </View>
      </View>

      {/* Trust & Invariant Footer */}
      <View style={styles.footerNote}>
        <Text style={styles.footerIcon}>🔒</Text>
        <Text style={styles.caption}>
          Exact integer paise • Strict money conservation • Never processes
          bank transfers
        </Text>
      </View>
    </ScrollView>
  );
}

function GuestHomeContent() {
  const { navigate } = useBill();

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
          <Text style={styles.accountText}>Sign In</Text>
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
              <View
                style={[
                  styles.motifAvatar,
                  { backgroundColor: COLORS.electricMint },
                ]}
              >
                <Text
                  style={[
                    styles.motifAvatarText,
                    { color: COLORS.electricMintDark },
                  ]}
                >
                  Y
                </Text>
              </View>
              <Text style={styles.motifShareAmount}>₹400</Text>
            </View>
            <View style={styles.motifShareChip}>
              <View
                style={[
                  styles.motifAvatar,
                  { backgroundColor: COLORS.freshGreen },
                ]}
              >
                <Text
                  style={[
                    styles.motifAvatarText,
                    { color: COLORS.deepForest },
                  ]}
                >
                  P
                </Text>
              </View>
              <Text style={styles.motifShareAmount}>₹400</Text>
            </View>
            <View style={styles.motifShareChip}>
              <View
                style={[
                  styles.motifAvatar,
                  { backgroundColor: COLORS.warmIvory },
                ]}
              >
                <Text
                  style={[styles.motifAvatarText, { color: COLORS.textDark }]}
                >
                  V
                </Text>
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
          Sign in with Google to organize trips, roommates, couples, or team
          expenses into shared ledgers.
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
          Exact integer paise • Strict money conservation • Never processes bank
          transfers
        </Text>
      </View>
    </ScrollView>
  );
}

export const HomeScreen: React.FC = () => {
  const { user, configured, restored } = useAuth();
  const repository = useCloud();
  const { navigate } = useBill();

  // Prevent flash of guest landing page while cold-start session is restoring
  if (configured && restored === false) {
    return (
      <View style={styles.restoringContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoGlyph}>✦</Text>
        </View>
        <Text style={styles.brand}>DueShare</Text>
        <ActivityIndicator
          size="small"
          color={COLORS.electricMint}
          style={{ marginTop: SPACING.md }}
        />
        <Text style={styles.caption}>
          Checking saved groups. Quick Split works offline.
        </Text>
        <PrimaryButton
          title="Quick Split"
          accessibilityLabel="Quick Split while account restores"
          onPress={() => navigate("ENTER_TOTAL")}
        />
      </View>
    );
  }

  if (user) {
    return <AuthenticatedHomeContent repository={repository} />;
  }

  return <GuestHomeContent />;
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
  restoringContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
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
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.subtle,
  },
  logoGlyph: {
    color: COLORS.electricMint,
    fontSize: 18,
    fontWeight: "900",
  },
  brand: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "900",
    color: COLORS.textPrimary,
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
  greetingSection: {
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  greetingTitle: {
    ...TYPOGRAPHY.hero,
    fontSize: 26,
    lineHeight: 32,
    color: COLORS.textPrimary,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  hero: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
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
    backgroundColor: COLORS.electricMint,
  },
  pillBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
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
    backgroundColor: COLORS.midnightCard,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    gap: SPACING.lg,
    ...SHADOWS.card,
  },
  quickCardCompact: {
    padding: SPACING.lg,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.midnightCard,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  quickCompactHeader: {
    gap: SPACING.xs,
  },
  quickEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  quickOfflineText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  quickTitleCompact: {
    ...TYPOGRAPHY.section,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  quickBodyCompact: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  quickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  quickEyebrow: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
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
    alignSelf: "flex-start",
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
    backgroundColor: COLORS.midnight,
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
    backgroundColor: COLORS.surfaceMuted,
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
    color: COLORS.electricMint,
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
  groupsSection: {
    gap: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    ...TYPOGRAPHY.section,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  newGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    ...SHADOWS.subtle,
  },
  newGroupButtonPressed: {
    backgroundColor: COLORS.deepForestLight,
    transform: [{ scale: 0.96 }],
  },
  newGroupButtonIcon: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.electricMint,
  },
  newGroupButtonText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.electricMint,
  },
  loadingBox: {
    padding: SPACING.xl,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  emptyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: {
    fontSize: 24,
  },
  emptyTitle: {
    ...TYPOGRAPHY.section,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  emptyDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  groupsList: {
    gap: SPACING.sm,
  },
  groupPreviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  groupPreviewArchived: {
    opacity: 0.7,
    backgroundColor: COLORS.surfaceMuted,
  },
  groupPreviewPressed: {
    transform: [{ scale: 0.985 }],
    borderColor: COLORS.primaryLight,
  },
  groupPreviewContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  groupPurposeIconBox: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  groupPurposeIconText: {
    fontSize: 22,
  },
  groupPreviewDetails: {
    flex: 1,
    gap: 4,
  },
  groupTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flexWrap: "wrap",
  },
  groupPurposePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  groupPurposePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  groupDestinationPill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  groupDestinationPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.freshGreen,
  },
  groupArchivedPill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  groupArchivedPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  groupNameText: {
    ...TYPOGRAPHY.section,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  groupBalanceRow: {
    marginTop: 2,
  },
  groupBalanceBadgePositive: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  groupBalanceTagPositive: {
    backgroundColor: COLORS.electricMint,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  groupBalanceTagTextPositive: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.deepForest,
  },
  groupBalanceTextPositive: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 12,
  },
  groupBalanceBadgeNegative: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  groupBalanceTagNegative: {
    backgroundColor: COLORS.warningBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  groupBalanceTagTextNegative: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.warningText,
  },
  groupBalanceTextNegative: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.warningText,
    fontSize: 12,
  },
  groupBalanceBadgeSettled: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  groupBalanceTagSettled: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  groupBalanceTagTextSettled: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  groupBalanceTextSettled: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  groupBalancePending: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  groupBalancePendingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  groupChevronBox: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  groupChevronText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "600",
    lineHeight: 20,
  },
  dashboardFooterActions: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  footerActionButton: {
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
