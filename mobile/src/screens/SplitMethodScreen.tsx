import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { ScreenHeader } from "../components/ScreenHeader.tsx";
import { StepIndicator } from "../components/StepIndicator.tsx";
import { SplitOptionCard } from "../components/SplitOptionCard.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";
import { formatMinorAsInr } from "../utils/money.ts";

export const SplitMethodScreen: React.FC = () => {
  const {
    totalMinor,
    people,
    splitMethod,
    setSplitMethod,
    calculatedShares,
    navigate,
    goBack,
  } = useBill();

  const formattedTotal = totalMinor !== null ? formatMinorAsInr(totalMinor) : "0.00";

  // Per person calculation for equal option preview
  const equalPerPerson =
    calculatedShares.length > 0 && splitMethod === "equal"
      ? calculatedShares[0].formattedShare
      : totalMinor !== null && people.length > 0
        ? formatMinorAsInr(Math.floor(totalMinor / people.length))
        : "0.00";

  const handleContinue = () => {
    if (splitMethod === "equal") {
      navigate("REVIEW");
    } else {
      navigate("CUSTOM_SPLIT");
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="How should we split it?"
        subtitle={`Choose how the ₹${formattedTotal} is divided.`}
        onBack={goBack}
        rightElement={<StepIndicator currentStep={3} totalSteps={3} />}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Equal Option */}
        <SplitOptionCard
          selected={splitMethod === "equal"}
          onSelect={() => setSplitMethod("equal")}
          title="Equal"
          subtitle="Everyone pays the same amount"
          icon="👥"
          badgeIcon="🧮"
          badgeText={`₹${equalPerPerson} / person (${people.length} people)`}
          accessibilityLabel="Equal split: everyone pays the same amount"
        />

        {/* Custom Option */}
        <SplitOptionCard
          selected={splitMethod === "custom"}
          onSelect={() => setSplitMethod("custom")}
          title="Custom"
          subtitle="Choose exactly how much each person pays"
          icon="🎛"
          badgeIcon="✏️"
          badgeText="Set individual amounts manually"
          accessibilityLabel="Custom split: set individual amounts"
        />

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <View style={styles.avatarRow}>
              {people.slice(0, 3).map((p, idx) => (
                <View
                  key={p.id}
                  style={[
                    styles.stackedAvatar,
                    { zIndex: 10 - idx, marginLeft: idx > 0 ? -10 : 0 },
                  ]}
                >
                  <Text style={styles.stackedAvatarText}>
                    {p.isYou ? "You" : p.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.participantsText}>
              {people.length} participants split
            </Text>
          </View>

          <View style={styles.summaryRight}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{formattedTotal}</Text>
          </View>
        </View>

        {/* Social Proof Hint */}
        <View style={styles.hintRow}>
          <Text style={styles.hintEmoji}>⚡</Text>
          <Text style={styles.hintText}>
            Equal divides the total. Custom lets you set exact amounts.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          accessibilityLabel="Continue to next step"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stackedAvatarText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.primary,
  },
  participantsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  totalValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
  },
  hintEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  hintText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
});
