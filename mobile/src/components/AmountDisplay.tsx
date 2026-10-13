import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

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
    }, 550);
    return () => clearInterval(interval);
  }, [showCursor]);

  const displayValue = value === "" ? "0" : value;

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Amount entered: ${displayValue} rupees`}
    >
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <Text
          style={[
            styles.amountText,
            value === "" && styles.amountTextPlaceholder,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        >
          {displayValue}
        </Text>
        {showCursor ? (
          <View
            style={[
              styles.cursor,
              { opacity: cursorVisible ? 1 : 0 },
            ]}
          />
        ) : null}
      </View>
      <Text style={styles.amountCaption}>
        {value === "" ? "Enter exact bill total" : "Exact total in Indian Rupees"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.card,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: {
    fontSize: 34,
    fontWeight: "700",
    color: COLORS.primaryDark,
    marginRight: 6,
    lineHeight: 48,
  },
  amountText: {
    fontSize: 48,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  amountTextPlaceholder: {
    color: COLORS.textTertiary,
  },
  cursor: {
    width: 3.5,
    height: 44,
    backgroundColor: COLORS.primary,
    marginLeft: 6,
    borderRadius: 2,
  },
  amountCaption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.2,
  },
});

