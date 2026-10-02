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
      <ScreenHeader
        title="How much?"
        subtitle="Enter the total bill amount"
        onBack={goBack}
        rightElement={<StepIndicator currentStep={1} totalSteps={3} />}
      />

      <View style={styles.amountSection}>
        <AmountDisplay value={totalInput} />
        {totalError && totalInput.length > 0 ? (
          <View style={styles.errorWrapper}>
            <ErrorMessage message={totalError} />
          </View>
        ) : null}
      </View>

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
    paddingBottom: SPACING.lg,
  },
  amountSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  errorWrapper: {
    width: "100%",
    marginTop: SPACING.sm,
  },
  keypadSection: {
    width: "100%",
    paddingBottom: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
  },
});
