import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { ScreenHeader } from "../components/ScreenHeader.tsx";
import { CustomAmountRow } from "../components/CustomAmountRow.tsx";
import { ReconciliationBanner } from "../components/ReconciliationBanner.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";
import { formatMinorAsInr, parseInrToMinor } from "../utils/money.ts";

export const CustomSplitScreen: React.FC = () => {
  const {
    totalMinor,
    people,
    customShares,
    setCustomShare,
    commitCustomShare,
    unpinCustomShare,
    pinnedParticipantIds,
    resetToEqual,
    customReconciliation,
    customHasInvalidFormat,
    isCustomReconciled,
    navigate,
    goBack,
  } = useBill();

  const formattedTotal = totalMinor !== null ? formatMinorAsInr(totalMinor) : "0.00";
  const allocatedMinor = customReconciliation?.allocatedMinor ?? 0;
  const remainingMinor = customReconciliation?.remainingMinor ?? (totalMinor ?? 0);

  const handleContinue = () => {
    if (isCustomReconciled) {
      navigate("REVIEW");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScreenHeader
        title="Set each amount"
        subtitle="Adjust what each person owes."
        onBack={goBack}
        tag="Custom Split"
        rightElement={
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              Bill Total: ₹{formattedTotal}
            </Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total People</Text>
            <Text style={styles.statValue}>{people.length} Members 👥</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Split Method</Text>
            <Text style={[styles.statValue, styles.statValueAccent]}>
              Exact ₹
            </Text>
          </View>
        </View>

        {/* Action Bar with Reset */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToEqual}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Reset to equal split"
          >
            <Text style={styles.resetButtonText}>↺ Reset to Equal</Text>
          </TouchableOpacity>
        </View>

        {/* People Custom Amount List */}
        {people.map((person) => {
          const val = customShares[person.id] ?? "";
          const isPinned = Boolean(pinnedParticipantIds[person.id]);
          let percent = 0;
          if (totalMinor !== null && totalMinor > 0 && val.trim() !== "") {
            try {
              const minor = parseInrToMinor(val.trim());
              percent = (minor / totalMinor) * 100;
            } catch {
              percent = 0;
            }
          }

          return (
            <CustomAmountRow
              key={person.id}
              name={person.name}
              isYou={person.isYou}
              value={val}
              onChangeValue={(newVal) => setCustomShare(person.id, newVal)}
              onCommitValue={(text) => commitCustomShare(person.id, text)}
              isPinned={isPinned}
              onTogglePin={() => {
                if (isPinned) {
                  unpinCustomShare(person.id);
                } else {
                  commitCustomShare(person.id);
                }
              }}
              percentOfTotal={percent}
            />
          );
        })}

        <Text style={styles.hintText}>
          👆 Tap amount to edit & pin • Tap 🔒 to unpin
        </Text>
      </ScrollView>

      {/* Bottom Sticky Reconciliation & CTA */}
      <View style={styles.footer}>
        <ReconciliationBanner
          totalMinor={totalMinor ?? 0}
          allocatedMinor={allocatedMinor}
          remainingMinor={remainingMinor}
          isReconciled={isCustomReconciled}
          hasInvalidFormat={customHasInvalidFormat}
        />

        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!isCustomReconciled}
          accessibilityLabel="Continue to review"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  totalBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  totalBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  actionsBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: SPACING.md,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: "700",
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  statValueAccent: {
    color: COLORS.primary,
  },
  hintText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
});
