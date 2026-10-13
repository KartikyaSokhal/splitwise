import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

export type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
};

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
    >
      <View style={styles.barsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepBar,
              i + 1 <= currentStep ? styles.stepBarActive : null,
            ]}
          />
        ))}
      </View>
      <Text style={styles.text}>
        {currentStep}/{totalSteps}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: SPACING.sm,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  stepBar: {
    width: 10,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
  },
  stepBarActive: {
    backgroundColor: COLORS.electricMint,
    width: 14,
  },
  text: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 11,
  },
});

