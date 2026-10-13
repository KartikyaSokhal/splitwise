import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { formatMinorAsInr } from "../utils/money.ts";
import {
  SafeAnimated,
  SafeEasing,
  USE_NATIVE_DRIVER,
  useReducedMotion,
  hasNativeAnimated,
} from "../utils/motion.ts";

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
  const reduceMotion = useReducedMotion();
  const isOver = remainingMinor < 0;
  const statusKey = hasInvalidFormat
    ? "invalid"
    : isReconciled
      ? "reconciled"
      : isOver
        ? "over"
        : "remaining";
  const prevStatusRef = useRef(statusKey);
  const fadeAnim = useRef(new SafeAnimated.Value(1)).current;

  useEffect(() => {
    if (prevStatusRef.current !== statusKey) {
      prevStatusRef.current = statusKey;
      if (!reduceMotion && hasNativeAnimated) {
        fadeAnim.setValue(0.75);
        SafeAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          easing: SafeEasing.out(SafeEasing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start();
      }
    }
  }, [statusKey, reduceMotion, fadeAnim]);

  if (hasInvalidFormat) {
    return (
      <SafeAnimated.View
        style={[
          styles.container,
          styles.errorContainer,
          { opacity: fadeAnim },
        ]}
      >
        <View style={styles.left}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Invalid amount format</Text>
        </View>
        <Text style={styles.ratioText}>
          ₹{formatMinorAsInr(Math.max(0, allocatedMinor))} / ₹{formatMinorAsInr(totalMinor)}
        </Text>
      </SafeAnimated.View>
    );
  }

  if (isReconciled) {
    return (
      <SafeAnimated.View
        style={[
          styles.container,
          styles.successContainer,
          { opacity: fadeAnim },
        ]}
      >
        <View style={styles.left}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.successText}>Total matches</Text>
        </View>
        <View style={styles.ratioBadgeSuccess}>
          <Text style={styles.successRatioText}>
            ₹{formatMinorAsInr(totalMinor)} / ₹{formatMinorAsInr(totalMinor)}
          </Text>
        </View>
      </SafeAnimated.View>
    );
  }

  // Under-allocated: positive remainingMinor => "₹X remaining"
  // Over-allocated: negative remainingMinor => "₹X over"
  const diffAbsMinor = Math.abs(remainingMinor);
  const diffFormatted = formatMinorAsInr(diffAbsMinor);
  const statusMessage = isOver ? `₹${diffFormatted} over` : `₹${diffFormatted} remaining`;

  return (
    <SafeAnimated.View
      style={[
        styles.container,
        isOver ? styles.errorContainer : styles.warningContainer,
        { opacity: fadeAnim },
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
      <View style={isOver ? styles.ratioBadgeError : styles.ratioBadgeWarning}>
        <Text style={isOver ? styles.ratioTextError : styles.ratioTextWarning}>
          ₹{formatMinorAsInr(Math.max(0, allocatedMinor))} / ₹{formatMinorAsInr(totalMinor)}
        </Text>
      </View>
    </SafeAnimated.View>
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
    borderWidth: 1.5,
    ...SHADOWS.subtle,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  successContainer: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successBorder,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.freshGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  checkIcon: {
    color: COLORS.midnight,
    fontSize: 13,
    fontWeight: "900",
  },
  successText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.successText,
    fontWeight: "800",
  },
  ratioBadgeSuccess: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  successRatioText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontVariant: ["tabular-nums"],
  },
  warningContainer: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warningBorder,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  warningText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.warningText,
    fontWeight: "800",
  },
  ratioBadgeWarning: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  ratioTextWarning: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.warningText,
    fontVariant: ["tabular-nums"],
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.errorText,
    fontWeight: "800",
  },
  ratioBadgeError: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  ratioTextError: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.errorText,
    fontVariant: ["tabular-nums"],
  },
  ratioText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    fontVariant: ["tabular-nums"],
  },
});

