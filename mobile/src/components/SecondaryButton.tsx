import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

export type SecondaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  iconLeft?: string;
  badge?: string;
  accessibilityLabel?: string;
};

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  iconLeft,
  badge,
  accessibilityLabel,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {iconLeft ? <Text style={styles.iconLeft}>{iconLeft}</Text> : null}
      <Text style={[styles.text, disabled && styles.textDisabled]}>
        {title}
      </Text>
      {badge ? (
        <Text style={styles.badge}>{badge}</Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  pressed: {
    backgroundColor: COLORS.borderSubtle,
  },
  disabled: {
    opacity: 0.6,
  },
  iconLeft: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  text: {
    flexShrink: 1,
    textAlign: "center",
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 16,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
  badge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.sm,
    fontWeight: "600",
    overflow: "hidden",
  },
});
