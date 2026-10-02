import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING } from "../constants/theme.ts";

export type NumericKeypadProps = {
  onDigitPress: (digit: string) => void;
  onBackspacePress: () => void;
  disableDecimal?: boolean;
};

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "DEL"],
];

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigitPress,
  onBackspacePress,
  disableDecimal = false,
}) => {
  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key) => {
            const isDel = key === "DEL";
            const isDot = key === ".";
            const isDisabled = isDot && disableDecimal;

            const handlePress = () => {
              if (isDel) {
                onBackspacePress();
              } else {
                onDigitPress(key);
              }
            };

            return (
              <Pressable
                key={key}
                onPress={handlePress}
                disabled={isDisabled}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  isDel ? "Backspace" : isDot ? "Decimal point" : `Digit ${key}`
                }
                style={({ pressed }) => [
                  styles.key,
                  isDisabled && styles.keyDisabled,
                  pressed && !isDisabled && styles.keyPressed,
                ]}
              >
                {isDel ? (
                  <Text style={styles.delIcon}>⌫</Text>
                ) : (
                  <Text
                    style={[
                      styles.keyText,
                      isDisabled && styles.keyTextDisabled,
                    ]}
                  >
                    {key}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  key: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  keyPressed: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  keyDisabled: {
    opacity: 0.3,
  },
  keyText: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  keyTextDisabled: {
    color: COLORS.textMuted,
  },
  delIcon: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});
