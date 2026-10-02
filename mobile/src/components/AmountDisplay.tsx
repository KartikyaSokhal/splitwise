import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING } from "../constants/theme.ts";

export type AmountDisplayProps = {
  value: string;
  showCursor?: boolean;
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  value,
  showCursor = true,
}) => {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!showCursor) return;
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 600);
    return () => clearInterval(interval);
  }, [showCursor]);

  const displayValue = value === "" ? "0" : value;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Amount entered: ${displayValue} rupees`}
    >
      <Text style={styles.currencySymbol}>₹</Text>
      <Text style={styles.amountText}>{displayValue}</Text>
      {showCursor ? (
        <View
          style={[
            styles.cursor,
            { opacity: cursorVisible ? 1 : 0 },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  amountText: {
    fontSize: 42,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  cursor: {
    width: 3,
    height: 40,
    backgroundColor: COLORS.primary,
    marginLeft: 4,
    borderRadius: 2,
  },
});
