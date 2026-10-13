import React from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme.ts";
import { ScreenHeader } from "../components/ScreenHeader.tsx";
import { StepIndicator } from "../components/StepIndicator.tsx";
import { AmountDisplay } from "../components/AmountDisplay.tsx";
import { NumericKeypad } from "../components/NumericKeypad.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { ErrorMessage } from "../components/ErrorMessage.tsx";
import { OrganicSeam } from "../components/OrganicSeam.tsx";
import { useBill } from "../state/BillContext.tsx";

export const EnterTotalScreen: React.FC = () => {
  const {
    totalInput,
    totalMinor,
    totalError,
    appendKeypad,
    backspaceKeypad,
    navigate,
    goBack,
  } = useBill();

  const handleContinue = () => {
    if (totalMinor !== null && totalMinor > 0) {
      navigate("PEOPLE");
    }
  };

  const isContinueDisabled = totalMinor === null || totalMinor <= 0;

  return (
    <View style={styles.container}>
      {/* Top Deep Forest Hero Section (echoing Reference Screen 2) */}
      <View style={styles.heroSection}>
        <ScreenHeader
          title="How much?"
          subtitle="Enter the total bill amount"
          onBack={goBack}
          rightElement={<StepIndicator currentStep={1} totalSteps={3} />}
        />

        <View style={styles.amountSection}>
          <AmountDisplay value={totalInput} borderless={true} />
          {totalError && totalInput.length > 0 ? (
            <View style={styles.errorWrapper}>
              <ErrorMessage message={totalError} />
            </View>
          ) : null}
        </View>
      </View>

      {/* Undulating Organic Seam transitioning from Deep Forest to Midnight */}
      <OrganicSeam
        fromColor={COLORS.deepForest}
        toColor={COLORS.midnight}
        height={46}
        hasCutouts={true}
      />

      {/* Lower Midnight Keypad & Action Section */}
      <View style={styles.bottomSection}>
        <View style={styles.keypadSection}>
          <NumericKeypad
            onDigitPress={appendKeypad}
            onBackspacePress={backspaceKeypad}
          />
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            disabled={isContinueDisabled}
            accessibilityLabel="Continue to people selection"
          />
        </View>
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
    backgroundColor: COLORS.midnight,
    justifyContent: "space-between",
  },
  heroSection: {
    backgroundColor: COLORS.deepForest,
    paddingBottom: SPACING.md,
  },
  amountSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  errorWrapper: {
    width: "100%",
    marginTop: SPACING.sm,
  },
  bottomSection: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.midnight,
  },
  keypadSection: {
    width: "100%",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
  },
});

