import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { formatMinorAsInr } from "../utils/money.ts";

export type ReconciliationBannerProps = {
  totalMinor: number;
  allocatedMinor: number;
  remainingMinor: number;
  isReconciled: boolean;
  hasInvalidFormat?: boolean;
};

export const ReconciliationBanner: React.FC<ReconciliationBannerProps> = ({
  totalMinor,
  allocatedMinor,
  remainingMinor,
  isReconciled,
  hasInvalidFormat = false,
}) => {
  if (hasInvalidFormat) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.left}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Invalid amount format</Text>
        </View>
        <Text style={styles.ratioText}>
          ₹{formatMinorAsInr(Math.max(0, allocatedMinor))} / ₹{formatMinorAsInr(totalMinor)}
        </Text>
      </View>
    );
  }

  if (isReconciled) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.left}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.successText}>Total matches</Text>
        </View>
        <Text style={styles.successRatioText}>
          ₹{formatMinorAsInr(totalMinor)} / ₹{formatMinorAsInr(totalMinor)}
        </Text>
      </View>
    );
  }

  // Under-allocated: positive remainingMinor => "₹X remaining"
  // Over-allocated: negative remainingMinor => "₹X over"
  const isOver = remainingMinor < 0;
  const diffAbsMinor = Math.abs(remainingMinor);
  const diffFormatted = formatMinorAsInr(diffAbsMinor);
  const statusMessage = isOver ? `₹${diffFormatted} over` : `₹${diffFormatted} remaining`;

  return (
    <View
      style={[
        styles.container,
        isOver ? styles.errorContainer : styles.warningContainer,
      ]}
      accessible={true}
      accessibilityRole="alert"
    >
      <View style={styles.left}>
        <Text style={isOver ? styles.errorIcon : styles.warningIcon}>
          {isOver ? "⚠️" : "⏳"}
        </Text>
        <Text style={isOver ? styles.errorText : styles.warningText}>
          {statusMessage}
        </Text>
      </View>
      <Text style={styles.ratioText}>
        ₹{formatMinorAsInr(Math.max(0, allocatedMinor))} / ₹{formatMinorAsInr(totalMinor)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  successContainer: {
    backgroundColor: COLORS.successLight,
    borderColor: "#86EFAC",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  checkIcon: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  successText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.successText,
    fontWeight: "700",
  },
  successRatioText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.successText,
    fontWeight: "700",
  },
  warningContainer: {
    backgroundColor: COLORS.warningLight,
    borderColor: "#FDE68A",
  },
  warningIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  warningText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.warningText,
    fontWeight: "700",
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderColor: "#FECACA",
  },
  errorIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.errorText,
    fontWeight: "700",
  },
  ratioText: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});
