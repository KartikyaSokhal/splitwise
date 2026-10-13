import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
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
      <Avatar name={name} size={44} highlight={isYou} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {isYou ? (
            <View style={styles.youBadge}>
              <Text style={styles.youText}>YOU</Text>
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
          <Text style={styles.removeIcon}>✕</Text>
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
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "700",
    maxWidth: "75%",
    fontSize: 16,
  },
  youBadge: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  youText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  removeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeButtonPressed: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder,
    transform: [{ scale: 0.92 }],
  },
  removeIcon: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
});

