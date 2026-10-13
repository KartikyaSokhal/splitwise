import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
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

        <Text style={styles.title}>Split ready</Text>
        <Text style={styles.subtitle}>Check your chosen app to confirm delivery.</Text>
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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
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
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successLight,
    borderWidth: 2,
    borderColor: COLORS.successBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  checkIcon: {
    fontSize: 42,
    color: COLORS.success,
    fontWeight: "900",
  },
  title: {
    ...TYPOGRAPHY.hero,
    fontSize: 32,
    color: COLORS.textPrimary,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    fontSize: 16,
    maxWidth: 320,
  },
  footer: {
    gap: SPACING.sm,
    alignItems: "stretch",
  },
  homeBtn: {
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 48,
    shadowOpacity: 0,
    elevation: 0,
  },
});

