import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

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
                unstable_pressDelay={0}
                style={({ pressed }) => [
                  styles.key,
                  isDel && styles.delKey,
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
                      isDot && styles.dotKeyText,
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
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  key: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.warmIvory,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.keypad,
  },
  delKey: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
  },
  keyPressed: {
    backgroundColor: COLORS.electricMint,
    transform: [{ scale: 0.96 }],
  },
  keyDisabled: {
    opacity: 0.25,
  },
  keyText: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textDark,
    fontFamily: TYPOGRAPHY.hero.fontFamily,
    fontVariant: ["tabular-nums"],
  },
  dotKeyText: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 28,
    color: COLORS.textDark,
  },
  keyTextDisabled: {
    color: COLORS.textMuted,
  },
  delIcon: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});

