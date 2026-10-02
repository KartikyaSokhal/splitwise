import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { Avatar } from "./Avatar.tsx";

export type PersonRowProps = {
  name: string;
  isYou?: boolean;
  subtitle?: string;
  onRemove?: () => void;
  canRemove?: boolean;
};

export const PersonRow: React.FC<PersonRowProps> = ({
  name,
  isYou = false,
  subtitle = "Equal split",
  onRemove,
  canRemove = true,
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
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {onRemove && canRemove ? (
        <Pressable
          onPress={onRemove}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name}`}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removeButtonPressed,
          ]}
        >
          <Text style={styles.removeIcon}>×</Text>
        </Pressable>
      ) : null}
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
    justifyContent: "center",
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
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
  },
  removeButtonPressed: {
    backgroundColor: COLORS.borderSubtle,
  },
  removeIcon: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: "400",
    lineHeight: 24,
  },
});
