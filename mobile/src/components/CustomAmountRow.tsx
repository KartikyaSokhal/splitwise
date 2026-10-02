import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { Avatar } from "./Avatar.tsx";

export type CustomAmountRowProps = {
  name: string;
  isYou?: boolean;
  value: string;
  onChangeValue: (val: string) => void;
  percentOfTotal?: number;
};

export const CustomAmountRow: React.FC<CustomAmountRowProps> = ({
  name,
  isYou = false,
  value,
  onChangeValue,
  percentOfTotal,
}) => {
  return (
    <View style={styles.card}>
      <Avatar name={name} size={42} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {isYou ? (
            <View style={styles.youBadge}>
              <Text style={styles.youText}>You</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.percentText}>
          {percentOfTotal !== undefined && !Number.isNaN(percentOfTotal)
            ? `${Math.round(percentOfTotal)}% of total`
            : "—"}
        </Text>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.currencyPrefix}>₹</Text>
        <TextInput
          value={value}
          onChangeText={onChangeValue}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.textMuted}
          accessible={true}
          accessibilityLabel={`Amount for ${name}`}
          style={styles.input}
          maxLength={9}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "600",
    maxWidth: "80%",
  },
  youBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  youText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 11,
  },
  percentText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    paddingHorizontal: SPACING.md,
    minWidth: 110,
    height: 44,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginRight: 4,
  },
  input: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "right",
    padding: 0,
  },
});
