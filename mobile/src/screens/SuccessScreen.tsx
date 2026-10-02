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

export const SuccessScreen: React.FC = () => {
  const { startNewSplit, resetBill } = useBill();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        <Text style={styles.title}>Split shared</Text>
        <Text style={styles.subtitle}>Your bill split is ready.</Text>
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Split another bill"
          onPress={startNewSplit}
          accessibilityLabel="Split another bill"
        />

        <SecondaryButton
          title="Back to home"
          onPress={resetBill}
          style={styles.homeBtn}
          accessibilityLabel="Back to home"
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.huge,
    paddingBottom: SPACING.xl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successLight,
    borderWidth: 2,
    borderColor: "#86EFAC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },
  checkIcon: {
    fontSize: 38,
    color: COLORS.success,
    fontWeight: "800",
  },
  title: {
    ...TYPOGRAPHY.screenTitle,
    fontSize: 28,
    color: COLORS.textPrimary,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  footer: {
    gap: SPACING.md,
    alignItems: "stretch",
  },
  homeBtn: {
    borderWidth: 0,
    backgroundColor: "transparent",
    height: 48,
  },
});
